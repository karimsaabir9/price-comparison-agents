import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { extractPriceFromText } from "../priceExtractor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Video/social platforms are never a place to buy anything — a price
// mentioned in a video title or caption ("totally worth $69") is not a
// real, current, buyable price. Block these before spending a scrape or a
// model call on them, rather than relying solely on the model's judgment.
const NON_RETAIL_HOSTS = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "vimeo.com",
  "pinterest.com",
];

const isNonRetailHost = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return NON_RETAIL_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

async function readOneCandidate(
  candidate: { url: string; title: string; site: string },
  productQuery: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any,
) {
  const stepId = createHash("md5").update(candidate.url).digest("hex").slice(0, 10);

  if (isNonRetailHost(candidate.url)) {
    return null;
  }

  const scrapedText = await step?.run(`serper_scrape_call-${stepId}`, async () => {
    try {
      const res = await fetch("https://scrape.serper.dev", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: candidate.url }),
      });

      if (!res.ok) return null;
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
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You extract a product price from scraped webpage text. Respond with ONLY a JSON object: {"matches": boolean, "price": number|null, "currency": "USD"|"EUR"|"GBP"|null}. ' +
              '"matches" is true if the page is somewhere a shopper could actually buy or price-compare the exact product being searched for (not a different model/configuration, not a generic catalog or shop-all page for unrelated products, not an accessory or unrelated item). ' +
              "This includes price-comparison or aggregator pages (e.g. a page listing this exact product's price across several stores or regions) — in that case set matches true and pick the single LOWEST real consumer retail price shown for this exact product. " +
              "ALWAYS set matches to false for video platforms (YouTube, TikTok, Vimeo), social media (Facebook, Instagram, X/Twitter, Reddit), forums, or blog/review/news articles — even if a price is mentioned in their text or title, a number quoted in a video description or post is not a real, current, buyable price, no matter how specific it looks. Only match actual store/retailer pages or genuine price-comparison/aggregator sites. " +
              "Do NOT match wholesale/bulk-order price ranges (e.g. per-unit prices that depend on minimum order quantity) — those are not real consumer prices. " +
              "If matches is false, or no clear single retail price for that specific product is present, set price and currency to null.",
          },
          {
            role: "user",
            content: `Product being searched for: "${productQuery}"\nSite: "${candidate.site}"\nPage title: "${candidate.title}"\nPage text:\n${scrapedText.slice(0, 6000)}`,
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

  console.log(
    `🔎 [PageReader] ${candidate.site} | scraped: ${scrapedText ? scrapedText.length + " chars" : "FAILED"} | matches: ${extraction?.matches} | price: ${extraction?.price} ${extraction?.currency ?? ""} | extractionFailed: ${extraction?.extractionFailed} | final: ${extracted ? `${extracted.price} ${extracted.currency}` : "none"}`,
  );

  if (!extracted) return null;

  return {
    site: candidate.site,
    title: candidate.title,
    price: extracted.price,
    currency: extracted.currency,
    url: candidate.url,
  };
}

export const readWebpagesTool = createTool({
  name: "read_webpages",
  description:
    "Fetch every candidate shopping page in one call and try to extract each one's price. " +
    "Pass an empty candidates array if there are none to read.",
  parameters: z.object({
    candidates: z
      .array(
        z.object({
          url: z.string().describe("The candidate page URL"),
          title: z.string().describe("The page title from the search result"),
          site: z.string().describe("The site/seller name (e.g. domain name)"),
        }),
      )
      .describe("Every candidate page to check, up to 8"),
  }),
  // AgentKit assigns a durable Inngest step ID derived from the agent's
  // name when it runs an agent inside a network. Re-invoking the same
  // agent multiple times in one network run (as an earlier version of this
  // tool did, once per candidate) made every invocation after the first
  // collide on that same step ID — harmless on a long-lived local dev
  // process, but fatal on Vercel: each serverless replay re-ran the same
  // few candidates in a loop and never finished. Processing the whole
  // candidate list in a single tool call (one agent invocation, one step
  // ID) avoids the collision; the per-candidate scrape/extract calls below
  // still get their own unique step IDs via the URL hash.
  handler: async (input, { network, step }) => {
    const productQuery = network?.state.data.productQuery ?? "";
    const candidates = input.candidates.slice(0, 8);

    const listings: { site: string; title: string; price: number; currency: string; url: string }[] = [];
    for (const candidate of candidates) {
      const listing = await readOneCandidate(candidate, productQuery, step);
      if (listing) listings.push(listing);
    }

    network.state.data.listings = listings;

    await step?.run("save_page_reader_results", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.listings": listings,
              "progress.pageReader": "completed",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, found: listings.length };
  },
});
