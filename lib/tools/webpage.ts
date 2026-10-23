import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { extractPriceFromText } from "../priceExtractor";

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

    // Hard cost cap: defense in depth in case the model over-calls this tool
    // (or the page-reader agent gets re-invoked unexpectedly) beyond the top-5
    // candidates the design spec allows. The cap is normally enforced by the
    // agent's system prompt alone, which isn't durable — so also enforce it
    // here with a MongoDB-backed counter keyed by runId, mirroring the
    // poster-attempt guard in lessons/multi-agent-system/lib/tools/imageGenerator.ts.
    const runId = network?.state.data.runId;
    const pageReaderCalls = await step?.run("count-page-reader-call", async () => {
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

    if (runId && pageReaderCalls && pageReaderCalls > 5) {
      return { success: true, found: false, skipped: true };
    }

    const scrapedText = await step?.run("serper_scrape_call", async () => {
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
      } catch (error) {
        return null;
      }
    });

    const extracted = scrapedText ? extractPriceFromText(scrapedText) : null;

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

    await step?.run("save_to_db", async () => {
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
