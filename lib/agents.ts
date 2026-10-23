import { createAgent, openai } from "@inngest/agent-kit";
import { saveQueryTool } from "./tools/query";
import { searchShopsTool } from "./tools/search";
import { readWebpagesTool } from "./tools/webpage";
import { saveComparisonTool } from "./tools/comparison";
import { saveRankingTool } from "./tools/ranking";
import { approveResultTool } from "./tools/moderation";

// Agent 1: Query Parser
export const queryParserAgent = createAgent({
  name: "query-parser",
  description: "Turns a raw user request into a clean, search-ready product query",
  system: `
    You are a shopping assistant. The user wants to find the cheapest price
    for a product. Read their raw request and produce a short, clean
    product name suitable for a Google shopping search.

    Preserve every word that distinguishes this exact product from a
    similar one in the same lineup — variant/edition names (e.g. "Air",
    "Pro", "Max", "Mini", "Plus"), colors, and sizes the user actually
    typed. Never drop a variant name, and never invent a spec (storage,
    RAM, color) the user did not mention.

    Drop only filler words ("I want", "please", "looking for"). Keep it
    under 8 words. MUST use the save_query tool with your cleaned query.
  `,
  tools: [saveQueryTool],
  tool_choice: "save_query",
  model: openai({ model: "gpt-5" }),
});

// Agent 2: Search Agent
export const searchAgent = createAgent({
  name: "search-agent",
  description: "Searches the web for places to buy the product",
  system: ({ network }) => {
    const productQuery = network?.state.data.productQuery || "";
    return `
      You are a shopping search agent. Find places to buy: "${productQuery}"
      Call search_shops ONCE with a query combining the product name and
      the words "buy price".
      MUST use the search_shops tool.
    `;
  },
  tools: [searchShopsTool],
  tool_choice: "search_shops",
  model: openai({ model: "gpt-5" }),
});

// Agent 3: Page Reader
export const pageReaderAgent = createAgent({
  name: "page-reader",
  description: "Opens each candidate shopping page and extracts its price",
  system: ({ network }) => {
    const candidates = (network?.state.data.candidates || []).slice(0, 8);

    return `
      You are a price-extraction agent. Call read_webpages ONCE with the
      full list of candidate pages below as the "candidates" array (keep
      each one's url, title, and site — use the domain name from the url as
      the site). The tool reads every page and extracts prices itself; you
      only need to pass the list through.

      ${JSON.stringify(candidates, null, 2)}
    `;
  },
  tools: [readWebpagesTool],
  tool_choice: "read_webpages",
  model: openai({ model: "gpt-5" }),
});

// Agent 4: Comparator
export const comparatorAgent = createAgent({
  name: "comparator",
  description: "Cleans up the extracted listings for ranking",
  system: ({ network }) => {
    const listings = network?.state.data.listings || [];
    return `
      You are a comparison agent. Review these extracted listings:
      ${JSON.stringify(listings, null, 2)}

      Keep only listings that have a real numeric price and a plausible
      currency. Remove obvious duplicates (same site + same price).
      MUST use the save_comparison tool with the cleaned list, even if
      it ends up empty.
    `;
  },
  tools: [saveComparisonTool],
  tool_choice: "save_comparison",
  model: openai({ model: "gpt-5" }),
});

// Agent 5: Ranker
export const rankerAgent = createAgent({
  name: "ranker",
  description: "Sorts comparisons from cheapest to most expensive",
  system: ({ network }) => {
    const comparisons = network?.state.data.comparisons || [];
    return `
      You are a ranking agent. Sort these listings ascending by price
      (cheapest first):
      ${JSON.stringify(comparisons, null, 2)}

      MUST use the save_ranking tool with the sorted list, even if it ends
      up empty.
    `;
  },
  tools: [saveRankingTool],
  tool_choice: "save_ranking",
  model: openai({ model: "gpt-5" }),
});

// Agent 6: Moderator
export const moderatorAgent = createAgent({
  name: "moderator",
  description: "Verifies the cheapest listing is plausible and approves the final answer",
  system: ({ network }) => {
    const ranked = network?.state.data.ranked || [];
    const attempts = network?.state.data.moderatorAttempts || 0;

    if (ranked.length === 0) {
      return `
        No priced listings were found for this product. Call
        approve_result with rankIndex 0, plausible false, and a summary
        explaining that no price could be found — suggest the user try a
        more specific product name.
      `;
    }

    const index = Math.min(attempts, ranked.length - 1);
    const candidate = ranked[index];

    return `
      You are a moderator. Here is the ranked list (cheapest first):
      ${JSON.stringify(ranked, null, 2)}

      Evaluate the candidate at index ${index}:
      ${JSON.stringify(candidate, null, 2)}

      Is this a plausible real offer for the product (sensible price, URL
      looks like a real retailer/product page, not a forum, news, or
      review link)? Call approve_result with rankIndex ${index}, your
      plausible true/false judgment, and a one-to-two sentence summary for
      the user.
    `;
  },
  tools: [approveResultTool],
  tool_choice: "approve_result",
  model: openai({ model: "gpt-5" }),
});
