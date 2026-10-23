# Price Comparison Agents

A 6-agent multi-agent system that finds the cheapest place to buy a product online.

## Pipeline

Query Parser -> Search Agent -> Page Reader -> Comparator -> Ranker -> Moderator

See `docs/superpowers/specs/2026-10-23-price-comparison-agents-design.md` for
the full design.

## Setup

1. `npm install`
2. Fill in `.env.local` with `OPENAI_API_KEY`, `SERPER_API_KEY`, `MONGODB_URI`
3. `npm run dev` (in one terminal)
4. `npx inngest-cli@latest dev` (in another terminal)
5. Open http://localhost:3000
