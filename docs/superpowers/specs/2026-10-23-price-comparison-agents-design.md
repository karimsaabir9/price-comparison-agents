# Price Comparison Agents — Design

## Purpose

A multi-agent system that, given a product name (e.g. "iPhone 18"), finds and
compares prices across the web and tells the user the cheapest site to buy
it from, with a working link. Built as a sibling exercise to
`lessons/multi-agent-system`, reusing its proven architecture and the
lessons learned from debugging it (deterministic routing, tool-result size
discipline, cost caps).

## Architecture

- [Next.js](https://nextjs.org) (App Router) + TypeScript, same conventions
  as `multi-agent-system`.
- [Inngest](https://www.inngest.com/) + [AgentKit](https://agentkit.inngest.com/)
  for durable, step-based multi-agent orchestration.
- A **deterministic function router** (a plain function reading
  `network.state.data`, not an LLM-based router) decides which agent runs
  next. This is a direct carry-over from `multi-agent-system`, where an
  LLM-based router proved unreliable and a deterministic one fixed it.
- [MongoDB](https://www.mongodb.com/) for run state and search history,
  same `results` collection pattern (`runId`-keyed documents with
  `status`/`progress`/`state`).
- [Serper](https://serper.dev/) for two purposes:
  - `/search` — Google search, to find candidate shopping pages.
  - `/scrape` (Serper's Scrape API) — fetch a URL and get back clean,
    readable page text instead of raw HTML. This removes the need for a
    headless browser or an HTML-parsing library.
- OpenAI `gpt-5` for all agents (the user explicitly chose the stronger
  model over the cost-optimized `gpt-5-mini` + low-reasoning-effort setup
  used in `multi-agent-system`, since extracting a price correctly from
  arbitrary page text benefits from a stronger model).

### Critical lesson carried over from `multi-agent-system`

AgentKit folds every tool call's **return value** into a shared history
that gets replayed into every subsequent agent's prompt. In the news-agent
project, returning a full base64 poster image from a tool caused
`context_length_exceeded` once a real image was generated. The same risk
exists here: scraped page text or a list of listings could be large.

**Rule for this project: tool handlers write their real output to
`network.state.data` (and Mongo) but return only a short confirmation
object to the caller** (e.g. `{ success: true, count: 5 }`), never the raw
scraped text or the full listings array. Agents read the data they need
from `network.state.data` via their system-prompt function, exactly like
`sentimentAnalyzerAgent` in `multi-agent-system` reads
`network.state.data.articles`.

## Agents (6)

Run in this fixed order, each gated by the router on the previous agent's
output existing in state:

1. **Query Parser** (`query-parser`)
   - Tool: `save_query`
   - Input: the user's raw search text.
   - Output: `state.data.productQuery` — a cleaned product name/spec string
     suitable for a shopping search (e.g. "iPhone 18 128GB").

2. **Search Agent** (`search-agent`)
   - Tool: `search_shops` → Serper `/search` with the parsed query +
     "buy price" appended.
   - Output: `state.data.candidates[]` — `{ title, link, snippet }`, capped
     at **8** results (cost cap).

3. **Page Reader** (`page-reader`)
   - Tool: `read_webpage` → Serper `/scrape` for a given URL, then the
     model extracts `{ price, currency, siteName }` from the returned text.
   - Called once per candidate, capped at the **top 5** candidates (cost
     cap — this is the most expensive stage since it's N calls).
   - Output: `state.data.listings[]` — `{ site, title, price, currency,
     url }`. Candidates where no price could be found are simply skipped,
     not treated as an error.

4. **Comparator** (`comparator`)
   - Tool: `save_comparison`
   - Normalizes currency where possible (flag non-USD listings rather than
     attempting conversion — no FX rate source in scope), drops
     listings with no price.
   - Output: `state.data.comparisons[]` — cleaned subset of `listings`.

5. **Ranker** (`ranker`)
   - Tool: `save_ranking`
   - Output: `state.data.ranked[]` — `comparisons` sorted ascending by
     price.

6. **Moderator / Presenter** (`moderator`)
   - Tool: `approve_result`
   - Sanity-checks the top (cheapest) result: does the URL look like a
     real retailer page (not a forum/review/news link that slipped through
     search), is the price plausible for the product (not an obvious
     outlier suggesting a wrong product match)?
   - Output: `state.data.finalAnswer` — `{ siteName, price, currency, url,
     summary }` plus `state.data.approved` (boolean).
   - The retry-with-next-cheapest logic happens **inside the
     `approve_result` tool handler itself**, not via the router (the
     router only re-invokes Moderator while `approved === undefined`, and
     `approved` is set on the first invocation). The handler checks
     `ranked[0]`; if implausible, it checks `ranked[1]`; after 2 checks it
     approves the best candidate seen so far and notes the caveat in
     `summary` — same bounded-attempts discipline as the poster
     generator's `posterAttempts` cap in `multi-agent-system`.

## Data flow

```
input (product name)
  -> Query Parser   -> state.productQuery
  -> Search Agent    -> state.candidates   (<=8)
  -> Page Reader      -> state.listings     (<=5, price-only items)
  -> Comparator       -> state.comparisons  (priced, deduped)
  -> Ranker           -> state.ranked       (sorted cheapest-first)
  -> Moderator         -> state.finalAnswer, state.approved
  -> done
```

Router (`lib/network.ts`), same shape as `multi-agent-system`:

```ts
router: ({ network }) => {
  const s = network?.state.data;
  if (!s?.productQuery) return queryParserAgent;
  if (!s?.candidates?.length) return searchAgent;
  if (!s?.listings?.length) return pageReaderAgent;
  if (!s?.comparisons?.length) return comparatorAgent;
  if (!s?.ranked?.length) return rankerAgent;
  if (s?.approved === undefined) return moderatorAgent;
  return undefined;
}
```

## UI

Mirrors `multi-agent-system`'s page structure:

- **Search box**: "What product are you looking for?" (free text) + Run
  button.
- **Search History**: MongoDB-backed list of past runs (product name,
  status, delete button), identical pattern to `SearchHistory.tsx`.
- **Job Status**: step checklist (Query Parsed / Candidates Found /
  Pages Read / Compared / Ranked / Complete).
- **Result cards**:
  - Candidates found (raw search results, collapsible)
  - Listings read (price per site, as they're extracted)
  - Ranked list (full ordered table, cheapest first)
  - **Final Answer** card — visually distinct (highlighted), showing the
    cheapest site's name, price, and a working link to buy.

Design should read as a clean, senior-quality product UI — not a raw
debug dashboard: clear typography hierarchy, the Final Answer card
visually dominant, loading states per step, empty/error states handled
(e.g. "No listings found with a price — try a more specific product
name").

## Error handling & cost caps

- Search Agent: max 8 results requested from Serper.
- Page Reader: processes at most the top 5 candidates; a page that fails
  to fetch or yields no extractable price is skipped (not a hard error —
  the run continues with however many listings were found).
- If **zero** listings have a price after Page Reader, Comparator sets
  `state.comparisons = []` and Moderator sets `approved = false` with a
  `summary` explaining no price was found, rather than crashing.
- Moderator's reject-and-retry is capped at 2 attempts total (same
  defense-in-depth pattern as the poster generator's `posterAttempts`
  cap), after which it approves the best available candidate with a
  caveat in the summary rather than looping.

## Credentials & repo setup

- Standalone git repository at
  `Exercise/price-comparison-agents` (separate from the `Exercise` parent
  repo and from `multi-agent-system`), **local commits only** — no push to
  a remote unless explicitly requested later.
- `.env.local` (gitignored) holds fresh credentials the user will provide
  during setup: `OPENAI_API_KEY`, `SERPER_API_KEY`, `MONGODB_URI`. None of
  these are reused from `multi-agent-system`.
- `.gitignore` copied/adapted from `multi-agent-system` (covers `.env*`,
  `.vercel`, `node_modules`, build artifacts).

## Testing

- `tsc --noEmit` and `eslint` clean before any commit (matching the
  verification discipline used throughout `multi-agent-system`).
- Manual end-to-end test with a real product query once credentials are in
  place and the user has confirmed they're ready to spend API credit —
  mirrors the cost-conscious testing approach used throughout this
  project's sibling.
