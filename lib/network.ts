import { createNetwork } from "@inngest/agent-kit";
import {
  comparatorAgent,
  moderatorAgent,
  pageReaderAgent,
  queryParserAgent,
  rankerAgent,
  searchAgent,
} from "./agents";

// Deterministic (non-LLM) router: a direct read of what's missing from
// state. An LLM-based router proved unreliable in the sibling project
// (multi-agent-system) — it didn't always echo an agent's exact name
// back, stalling the network in a retry loop that burned API cost
// without making progress. This router is 100% predictable and free.
//
// Fields are checked with `=== undefined` rather than `.length` where an
// empty array is a legitimate terminal result (e.g. zero listings found),
// so the network doesn't loop forever trying to produce a non-empty array
// that will never exist.
export const priceComparisonNetwork = createNetwork({
  name: "price_comparison_workflow",
  description: "Multi-agent system that finds the cheapest place to buy a product",
  agents: [
    queryParserAgent,
    searchAgent,
    pageReaderAgent,
    comparatorAgent,
    rankerAgent,
    moderatorAgent,
  ],
  router: ({ network }) => {
    const state = network?.state.data;

    if (!state?.productQuery) return queryParserAgent;
    if (state?.candidates === undefined) return searchAgent;
    if (state?.listings === undefined) return pageReaderAgent;
    if (state?.comparisons === undefined) return comparatorAgent;
    if (state?.ranked === undefined) return rankerAgent;
    if (state?.approved === undefined) return moderatorAgent;

    return undefined; // done
  },
  maxIter: 20,
});
