import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { extractPriceFromText } from "../priceExtractor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const readWebpageTool = createTool({
  name: "read_webpage",
  description:
    "Fetch a single candidate shopping page and try to extract its price. " +
    "Call once per candidate URL. Pass url 'none' if there are no candidates to read.",
  parameters: z.object({
    url: z.string().describe("The candidate page URL, or 'none' if there are no candidates"),
    title: z.string().describe("The page title from the search result"),
    site: z.string().describe("The site/seller name (e.g. domain name)"),
  }),
  handler: async (input, { network, step }) => {
    if (input.url === "none") {
      network.state.data.listings = network.state.data.listings || [];
      return { success: true, found: false };
    }

    // Inngest requires step IDs to be unique within a single function run —
    // read_webpage is called once per candidate, so every step inside this
    // handler needs a per-call suffix. Without this, calls 2+ collide with
    // call 1's step IDs and Inngest replays call 1's cached result instead
    // of actually running the step again (silently discarding every
    // candidate after the first).
    const stepId = createHash("md5").update(input.url).digest("hex").slice(0, 10);

    // Hard cost cap: defense in depth in case the model over-calls this tool
    // (or the page-reader agent gets re-invoked unexpectedly) beyond the top-8
    // candidates the design spec allows (matches Search's own 8-result cap).
    // The cap is normally enforced by the
    // agent's system prompt alone, which isn't durable — so also enforce it
    // here with a MongoDB-backed counter keyed by runId, mirroring the
    // poster-attempt guard in lessons/multi-agent-system/lib/tools/imageGenerator.ts.
    const runId = network?.state.data.runId;
    const pageReaderCalls = await step?.run(`count-page-reader-call-${stepId}`, async () => {
      if (!runId) return 1;
      const { getDB } = await import("../db");
      const db = await getDB();
      const result = await db.collection("results").findOneAndUpdate(
        { runId },
        { $inc: { pageReaderCalls: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      return result?.pageReaderCalls ?? 1;
    });

    if (runId && pageReaderCalls && pageReaderCalls > 8) {
      return { success: true, found: false, skipped: true };
    }

    const scrapedText = await step?.run(`serper_scrape_call-${stepId}`, async () => {
      try {
        const res = await fetch("https://scrape.serper.dev", {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.SERPER_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: input.url }),
        });

        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        return (data.text as string | undefined) ?? null;
      } catch {
        return null;
      }
    });

    // Model-based extraction: a plain regex can't tell whether a matched price
    // actually belongs to the product being searched for (e.g. a generic
    // "Buy iPhone" catalog page can yield a price for a completely different
    // model). The model reads the scraped text and judges both relevance and
    // price. This call is made directly via the OpenAI SDK (like
    // generatePosterTool in the sibling project), NOT through the AgentKit
    // network — so the (potentially large) scraped text never enters the
    // shared history that gets replayed into later agents' prompts.
    const extraction = await step?.run(`extract_price_with_model-${stepId}`, async () => {
      if (!scrapedText) {
        return {
          matches: false,
          price: null as number | null,
          currency: null as string | null,
          extractionFailed: false,
        };
      }
      try {
        const productQuery = network?.state.data.productQuery ?? input.title;
        const completion = await openai.chat.completions.create({
          model: "gpt-5",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You extract a product price from scraped webpage text. Respond with ONLY a JSON object: {"matches": boolean, "price": number|null, "currency": "USD"|"EUR"|"GBP"|null}. ' +
                '"matches" is true if the page text clearly refers to the exact product being searched for (not a different model/configuration, not a generic catalog or shop-all page for unrelated products, not an accessory or unrelated item). ' +
                "This includes price-comparison or aggregator pages (e.g. a page listing this exact product's price across several stores or regions) — in that case set matches true and pick the single LOWEST real consumer retail price shown for this exact product. " +
                "Do NOT match wholesale/bulk-order price ranges (e.g. per-unit prices that depend on minimum order quantity) — those are not real consumer prices. " +
                "If matches is false, or no clear single retail price for that specific product is present, set price and currency to null.",
            },
            {
              role: "user",
              content: `Product being searched for: "${productQuery}"\nPage title: "${input.title}"\nPage text:\n${scrapedText.slice(0, 6000)}`,
            },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        return {
          matches: !!parsed.matches,
          price: typeof parsed.price === "number" ? parsed.price : null,
          currency: typeof parsed.currency === "string" ? parsed.currency : null,
          extractionFailed: false,
        };
      } catch {
        return {
          matches: false,
          price: null as number | null,
          currency: null as string | null,
          extractionFailed: true,
        };
      }
    });

    const extracted =
      extraction?.matches && extraction.price !== null && extraction.currency
        ? { price: extraction.price, currency: extraction.currency }
        : extraction?.extractionFailed && scrapedText
          ? extractPriceFromText(scrapedText)
          : null;

    const existing = network?.state.data.listings || [];

    if (extracted) {
      const listing = {
        site: input.site,
        title: input.title,
        price: extracted.price,
        currency: extracted.currency,
        url: input.url,
      };
      network.state.data.listings = [...existing, listing];
    } else {
      network.state.data.listings = existing;
    }

    await step?.run(`save_to_db-${stepId}`, async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.listings": network.state.data.listings,
              "progress.pageReader": "in_progress",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, found: !!extracted, price: extracted?.price };
  },
});
