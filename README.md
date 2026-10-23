# Cheapest Find

A 6-agent multi-agent system that finds the cheapest place to buy a product
online — orchestrated by [Inngest AgentKit](https://agentkit.inngest.com/)
and run as durable, resumable [Inngest](https://www.inngest.com/) functions.

**Live demo:** https://price-comparison-agents.vercel.app

## How it works

A deterministic router (a plain function, not an LLM call) inspects the
current run state and routes work through six specialist agents in a fixed
pipeline, stopping once the moderator has approved a result:

1. **Query Parser** — turns the raw user request into a clean, search-ready
   product query, preserving every distinguishing detail (variant names like
   "Air" or "Pro", colors, sizes) instead of inventing or dropping specs.
2. **Search Agent** — searches the web via [Serper](https://serper.dev/) for
   up to 8 candidate pages that might sell the product.
3. **Page Reader** — scrapes each candidate page's text (Serper's Scrape
   API) and asks the model to judge, per page: does this page actually refer
   to the exact product, and if so, what's its real retail price? Video and
   social platforms (YouTube, TikTok, Facebook, etc.) are hard-blocked
   before any scrape or model call, since a price mentioned in a video
   caption is never a real, buyable price. Price-comparison/aggregator pages
   are accepted, picking the lowest real price shown. All candidates are
   processed in a single tool call (one agent turn, one durable step),
   avoiding a step-ID collision that otherwise breaks under serverless
   replay.
4. **Comparator** — keeps only listings with a real numeric price and a
   plausible currency, dropping duplicates.
5. **Ranker** — sorts the surviving listings cheapest-first. Currencies are
   not converted, only flagged, since there's no FX rate source in scope.
6. **Moderator** — sanity-checks the top candidate (does the price and URL
   look like a real, current offer for this product?). If implausible, it
   retries against the next-cheapest candidate (up to 2 attempts) before
   approving the best available option with a caveat.

Each step's progress is persisted to MongoDB (`results` collection, keyed by
`runId`) so the frontend can poll for live status and browse or delete past
runs.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Inngest](https://www.inngest.com/) + [AgentKit](https://agentkit.inngest.com/) for durable multi-agent orchestration
- [OpenAI](https://platform.openai.com/) `gpt-5` for every agent and for the page-reader's price-extraction judgment
- [Serper](https://serper.dev/) for web search and page scraping
- [MongoDB](https://www.mongodb.com/) (Atlas in production) for run state and search history
- [TanStack Query](https://tanstack.com/query) for client-side data fetching/polling/mutations
- Tailwind CSS + shadcn-style UI components
- Deployed on [Vercel](https://vercel.com)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root with:

```bash
OPENAI_API_KEY=your_openai_api_key
SERPER_API_KEY=your_serper_api_key
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=price_comparison_db
INNGEST_DEV=1
```

`INNGEST_DEV=1` is for local development only — remove it in production so
Inngest functions run against Inngest Cloud (via `INNGEST_EVENT_KEY` /
`INNGEST_SIGNING_KEY`) instead of the local dev server.

### 3. Run the dev server

```bash
npm run dev
```

This starts Next.js on [http://localhost:3000](http://localhost:3000) and
serves the Inngest function at `/api/inngest`.

### 4. Run the Inngest Dev Server

In a separate terminal:

```bash
npx inngest-cli@latest dev
```

Open [http://localhost:8288](http://localhost:8288) to watch and debug
workflow runs (per-step traces, retries, and payloads).

## Deployment

The app is deployed on Vercel with:

- **MongoDB Atlas** for durable run state (a local `mongodb://localhost`
  URI won't work in production — Vercel's servers can't reach it).
- **Inngest Cloud**, with `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` set
  as environment variables and the deployed `/api/inngest` endpoint
  registered as a synced app in the [Inngest dashboard](https://app.inngest.com)
  (Apps → Sync new app).
- `OPENAI_API_KEY` and `SERPER_API_KEY` set as encrypted environment
  variables on both the Production and Preview environments.

After deploying, confirm the app shows up under Inngest's Apps page with
"1 function found" — without this sync step, events are sent but nothing
ever processes them.

## Project structure

```
app/
  page.tsx                  # Search UI, live job status, history, result cards
  api/
    inngest/route.ts        # Inngest serve handler
    run-agents/route.ts     # Kicks off a workflow run (creates the Mongo doc, sends the event)
    results/route.ts        # Lists recent runs (search history)
    results/[runId]/route.ts# GET a single run's status/state, DELETE to remove it from history
  inngest/
    client.ts                # Inngest client
    functions.ts              # The price-comparison-workflow function
lib/
  agents.ts                 # The 6 specialist agent definitions
  network.ts                # Deterministic router + network wiring
  db.ts                     # MongoDB connection helper
  priceExtractor.ts          # Regex fallback for price extraction
  tools/                     # Tools the agents call (search, page reading, save, approve)
components/                  # SearchInput, SearchHistory, JobStatus, and result cards
```

## Usage

Type a product name (e.g. "Sony WH-1000XM5 headphones") and run the agents.
The UI polls for status every 2 seconds while a run is in progress, and
shows a search history you can click back into to revisit any past run's
results, or delete (✕ button, with a confirmation prompt) runs you no
longer need.

## Learn more

- [Inngest AgentKit docs](https://agentkit.inngest.com/)
- [Next.js documentation](https://nextjs.org/docs)
