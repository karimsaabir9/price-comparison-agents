# Price Comparison Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 6-agent Next.js + Inngest AgentKit app that, given a product name, finds the cheapest place to buy it online and presents it with a working link.

**Architecture:** A deterministic (non-LLM) router reads `network.state.data` to decide which of 6 agents runs next: Query Parser → Search Agent → Page Reader → Comparator → Ranker → Moderator. Each agent's tool writes its real output to `network.state.data` and MongoDB but returns only a short confirmation to the caller, so large content (scraped page text) never enters the shared history AgentKit replays into every later agent's prompt.

**Tech Stack:** Next.js 16 (App Router) + TypeScript, `@inngest/agent-kit`, `inngest`, MongoDB driver, TanStack Query, shadcn/ui (`base-nova` style), Serper (`/search` + `/scrape`), OpenAI `gpt-5`.

## Global Constraints

- Repo: `E:\Dugsiiye Mentorship Batch 3\Ai-foundations-for-developers\Exercise\price-comparison-agents` — already a standalone git repo (`git init` done), separate from the parent `Exercise` repo and from `multi-agent-system`.
- **Commits stay local** — do not add a remote or push unless the user explicitly asks.
- **Never add a `Co-Authored-By: Claude` trailer or "Generated with Claude Code" line to any commit message** (standing user preference).
- Credentials (`OPENAI_API_KEY`, `SERPER_API_KEY`, `MONGODB_URI`) are fresh — not reused from `multi-agent-system`. They live in `.env.local`, which is gitignored and never committed.
- Model: `openai({ model: "gpt-5" })` for every agent (user chose the full model over the cost-optimized `gpt-5-mini` setup used in the sibling project).
- Cost caps: Search Agent requests at most 8 results; Page Reader processes at most the top 5 candidates.
- `tsc --noEmit` and `eslint` must be clean before every commit.
- UI should read as a polished product, not a debug dashboard: use the shadcn semantic tokens (`text-muted-foreground`, `bg-primary`, etc.) consistently, not hardcoded `gray-100`/`gray-700` utility classes.

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`
- Create: `app/providers.tsx`
- Create: `.env.local` (not committed — template only)
- Create: `README.md`

**Interfaces:**
- Produces: a working `npm run dev` app, the `cn` helper from the `cn` package (used by every shadcn primitive added later), and `Providers` wrapping the app in a `QueryClientProvider`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "price-comparison-agents",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "node --import tsx --test lib/**/*.test.ts"
  },
  "dependencies": {
    "@base-ui/react": "^1.8.0",
    "@inngest/agent-kit": "^0.13.2",
    "@tanstack/react-query": "^5.103.1",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.3.0",
    "inngest": "^4.18.1",
    "lucide-react": "^1.46.0",
    "mongodb": "^7.6.0",
    "next": "16.3.4",
    "openai": "^7.17.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "shadcn": "^4.21.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.4",
    "tailwindcss": "^4",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

- [ ] **Step 4: Create `eslint.config.mjs`**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 6: Create `components.json`** (shadcn config — must exist before `shadcn add` works)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

- [ ] **Step 7: Create `.gitignore`**

```
# dependencies
/node_modules
/.pnp
.pnp.*

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files — never commit real credentials
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: Create `app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 9: Create `app/providers.tsx`**

```tsx
"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 10: Create `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Price Comparison Agents",
  description: "Multi-agent system that finds the cheapest place to buy a product",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 11: Create a placeholder `app/page.tsx`** (replaced fully in Task 13)

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold">Price Comparison Agents</h1>
    </main>
  );
}
```

- [ ] **Step 12: Create `.env.local`** (template — fill in real values yourself, this file is gitignored)

```
OPENAI_API_KEY=
SERPER_API_KEY=
MONGODB_URI=
MONGODB_DB=price_comparison_db
```

- [ ] **Step 13: Create `README.md`**

```markdown
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
```

- [ ] **Step 14: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 15: Add shadcn UI primitives**

Run: `npx shadcn@latest add card button input --yes`
Expected: creates `components/ui/card.tsx`, `components/ui/button.tsx`,
`components/ui/input.tsx`, and `lib/utils.ts`.

- [ ] **Step 16: Verify the scaffold**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npx eslint .`
Expected: no errors.

Run: `npm run dev` (in background, then check it started)
Expected: log line containing `Ready in` with no port-in-use conflicts.
Stop the dev server after confirming it starts.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with shadcn UI primitives"
```

---

### Task 2: MongoDB connection helper

**Files:**
- Create: `lib/db.ts`

**Interfaces:**
- Produces: `getDB(): Promise<Db>`, `connectMongoDB(): Promise<Db>`,
  `closeMongoDB(): Promise<void>` — every later tool imports `getDB` from
  `../db` (relative to `lib/tools/`) or `@/lib/db` (from `app/`).

- [ ] **Step 1: Create `lib/db.ts`**

```ts
import { MongoClient, Db } from "mongodb";

let mongoClient: MongoClient;
let db: Db;

export async function connectMongoDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "price_comparison_db";

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db(dbName);
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

export async function getDB() {
  if (!db) {
    await connectMongoDB();
  }
  return db;
}

export async function closeMongoDB() {
  if (mongoClient) {
    await mongoClient.close();
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "Add MongoDB connection helper"
```

---

### Task 3: Price extraction logic + Page Reader tool (TDD)

**Files:**
- Create: `lib/priceExtractor.ts`
- Create: `lib/priceExtractor.test.ts`
- Create: `lib/tools/webpage.ts`

**Interfaces:**
- Produces: `extractPriceFromText(text: string): { price: number; currency: string } | null`
  (pure function, used only inside `read_webpage`'s handler).
- Produces: `readWebpageTool` (AgentKit tool named `read_webpage`), consumed
  by `pageReaderAgent` in Task 9.
- Consumes: `getDB` from `../db` (Task 2).

This is the one piece of genuinely pure, testable logic in the project — a
regex-based price extractor run against scraped page text. Everything else
(tools with side effects, agents, UI) is verified by `tsc`/`eslint`/manual
run, matching how `multi-agent-system` is verified (it has no automated test
suite).

- [ ] **Step 1: Write the failing tests**

Create `lib/priceExtractor.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPriceFromText } from "./priceExtractor";

test("extracts a USD price with dollar sign and comma", () => {
  const result = extractPriceFromText("Now only $1,299.99 — free shipping");
  assert.deepEqual(result, { price: 1299.99, currency: "USD" });
});

test("extracts a USD price written as USD 899", () => {
  const result = extractPriceFromText("Price: USD 899 in stock");
  assert.deepEqual(result, { price: 899, currency: "USD" });
});

test("extracts a EUR price with euro sign", () => {
  const result = extractPriceFromText("Nur €749.00 heute bestellen");
  assert.deepEqual(result, { price: 749, currency: "EUR" });
});

test("extracts a GBP price with pound sign", () => {
  const result = extractPriceFromText("Our price: £899.99");
  assert.deepEqual(result, { price: 899.99, currency: "GBP" });
});

test("returns null when no price pattern is found", () => {
  const result = extractPriceFromText("Out of stock. Check back later.");
  assert.equal(result, null);
});

test("returns null for a malformed currency match", () => {
  const result = extractPriceFromText("$ (price unavailable)");
  assert.equal(result, null);
});
```

- [ ] **Step 2: Create an empty `lib/priceExtractor.ts` stub and run the tests to verify they fail**

```ts
export type ExtractedPrice = { price: number; currency: string };

export function extractPriceFromText(_text: string): ExtractedPrice | null {
  throw new Error("not implemented");
}
```

Run: `npm test`
Expected: all 6 tests FAIL (throwing "not implemented").

- [ ] **Step 3: Implement `extractPriceFromText`**

Replace `lib/priceExtractor.ts` with:

```ts
export type ExtractedPrice = { price: number; currency: string };

const CURRENCY_PATTERNS: Array<{ regex: RegExp; currency: string }> = [
  { regex: /\$\s?([\d,]+(?:\.\d{2})?)/, currency: "USD" },
  { regex: /USD\s?([\d,]+(?:\.\d{2})?)/i, currency: "USD" },
  { regex: /€\s?([\d,]+(?:\.\d{2})?)/, currency: "EUR" },
  { regex: /£\s?([\d,]+(?:\.\d{2})?)/, currency: "GBP" },
];

export function extractPriceFromText(text: string): ExtractedPrice | null {
  for (const { regex, currency } of CURRENCY_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      if (!Number.isNaN(price) && price > 0) {
        return { price, currency };
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all 6 tests PASS.

- [ ] **Step 5: Create `lib/tools/webpage.ts`**

```ts
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

    const scrapedText = await step?.run("serper_scrape_call", async () => {
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
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npm test`
Expected: all 6 tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/priceExtractor.ts lib/priceExtractor.test.ts lib/tools/webpage.ts package.json
git commit -m "Add price extractor (TDD) and read_webpage tool"
```

---

### Task 4: Search tool

**Files:**
- Create: `lib/tools/search.ts`

**Interfaces:**
- Produces: `searchShopsTool` (tool named `search_shops`), consumed by
  `searchAgent` in Task 9.
- Consumes: `getDB` from `../db` (Task 2).

- [ ] **Step 1: Create `lib/tools/search.ts`**

```ts
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

type Candidate = { title: string; url: string; snippet?: string };
type SerperOrganicItem = { title: string; link: string; snippet?: string };

export const searchShopsTool = createTool({
  name: "search_shops",
  description:
    "Search the web for places to buy a product, to find candidate shopping pages.",
  parameters: z.object({
    query: z
      .string()
      .describe("Product name/spec plus 'buy price', e.g. 'iPhone 18 128GB buy price'"),
  }),
  handler: async (input, { network, step }) => {
    const response = await step?.run("serper_search_call", async () => {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: input.query, num: 8 }),
      });

      if (!res.ok) {
        throw new Error(`Serper API returned status ${res.status}`);
      }

      return res.json();
    });

    // Serper's own field is called `link`; we normalize it to `url` here so
    // every stage of the pipeline (candidates, listings, comparisons,
    // ranked) uses the same field name.
    const organic: SerperOrganicItem[] = response?.organic ?? [];
    const candidates: Candidate[] = organic.slice(0, 8).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    }));

    network.state.data.candidates = candidates;

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.candidates": candidates,
              "progress.search": "completed",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, count: candidates.length };
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/tools/search.ts
git commit -m "Add search_shops tool"
```

---

### Task 5: Query, Comparison, Ranking, Moderation tools

**Files:**
- Create: `lib/tools/query.ts`
- Create: `lib/tools/comparison.ts`
- Create: `lib/tools/ranking.ts`
- Create: `lib/tools/moderation.ts`

**Interfaces:**
- Produces: `saveQueryTool` (`save_query`), `saveComparisonTool`
  (`save_comparison`), `saveRankingTool` (`save_ranking`),
  `approveResultTool` (`approve_result`) — each consumed by its matching
  agent in Task 9.
- Consumes: `getDB` from `../db` (Task 2).

- [ ] **Step 1: Create `lib/tools/query.ts`**

```ts
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const saveQueryTool = createTool({
  name: "save_query",
  description: "Save the cleaned, search-ready product query",
  parameters: z.object({
    productQuery: z
      .string()
      .describe("A clean product name + key specs, suitable for a shopping search"),
  }),
  handler: async (input, { network, step }) => {
    network.state.data.productQuery = input.productQuery;

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.productQuery": input.productQuery,
              "progress.queryParser": "completed",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true };
  },
});
```

- [ ] **Step 2: Create `lib/tools/comparison.ts`**

```ts
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

const listingSchema = z.object({
  site: z.string(),
  title: z.string(),
  price: z.number(),
  currency: z.string(),
  url: z.string(),
});

export const saveComparisonTool = createTool({
  name: "save_comparison",
  description: "Save the cleaned, priced listings ready for ranking",
  parameters: z.object({
    comparisons: z.array(listingSchema),
  }),
  handler: async (input, { network, step }) => {
    network.state.data.comparisons = input.comparisons;

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.comparisons": input.comparisons,
              "progress.comparator": "completed",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, count: input.comparisons.length };
  },
});
```

- [ ] **Step 3: Create `lib/tools/ranking.ts`**

```ts
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

const listingSchema = z.object({
  site: z.string(),
  title: z.string(),
  price: z.number(),
  currency: z.string(),
  url: z.string(),
});

export const saveRankingTool = createTool({
  name: "save_ranking",
  description: "Save the comparisons sorted ascending by price (cheapest first)",
  parameters: z.object({
    ranked: z.array(listingSchema),
  }),
  handler: async (input, { network, step }) => {
    network.state.data.ranked = input.ranked;

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.ranked": input.ranked,
              "progress.ranker": "completed",
              updatedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, count: input.ranked.length };
  },
});
```

- [ ] **Step 4: Create `lib/tools/moderation.ts`**

```ts
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const approveResultTool = createTool({
  name: "approve_result",
  description:
    "Judge one ranked listing's plausibility and, once approved, set it as the final answer",
  parameters: z.object({
    rankIndex: z.number().describe("Index into the ranked array being judged"),
    plausible: z
      .boolean()
      .describe("Whether this listing looks like a real retailer offer for the product"),
    summary: z.string().describe("One or two sentence summary of the final answer for the user"),
  }),
  handler: async (input, { network, step }) => {
    const ranked = network?.state.data.ranked || [];
    const attempts = (network?.state.data.moderatorAttempts || 0) + 1;
    network.state.data.moderatorAttempts = attempts;

    const chosen = ranked[input.rankIndex] ?? ranked[0];
    const noListings = ranked.length === 0;
    const outOfAttempts = attempts >= 2;
    const approveNow = !noListings && (input.plausible || outOfAttempts);

    if (approveNow && chosen) {
      network.state.data.finalAnswer = {
        siteName: chosen.site,
        price: chosen.price,
        currency: chosen.currency,
        url: chosen.url,
        summary: input.summary,
      };
      network.state.data.approved = true;
    } else if (noListings) {
      network.state.data.finalAnswer = {
        siteName: null,
        price: null,
        currency: null,
        url: null,
        summary: input.summary,
      };
      network.state.data.approved = false;
    } else {
      // leave approved as undefined so the router sends the network back
      // to the moderator for another pass at the next-cheapest candidate
      delete network.state.data.approved;
    }

    await step?.run("save_to_db", async () => {
      const { getDB } = await import("../db");
      const db = await getDB();
      const runId = network.state.data.runId;
      if (runId && network.state.data.approved !== undefined) {
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              "state.finalAnswer": network.state.data.finalAnswer,
              "state.approved": network.state.data.approved,
              "progress.moderator": "completed",
              status: "success",
              updatedAt: new Date(),
              completedAt: new Date(),
            },
          },
        );
      }
    });

    return { success: true, approved: network.state.data.approved === true };
  },
});
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add lib/tools/query.ts lib/tools/comparison.ts lib/tools/ranking.ts lib/tools/moderation.ts
git commit -m "Add query, comparison, ranking, and moderation tools"
```

---

### Task 6: Agent definitions

**Files:**
- Create: `lib/agents.ts`

**Interfaces:**
- Consumes: all 6 tools from Tasks 3–5 (`readWebpageTool`,
  `searchShopsTool`, `saveQueryTool`, `saveComparisonTool`,
  `saveRankingTool`, `approveResultTool`).
- Produces: `queryParserAgent`, `searchAgent`, `pageReaderAgent`,
  `comparatorAgent`, `rankerAgent`, `moderatorAgent` — consumed by
  `lib/network.ts` in Task 7.

- [ ] **Step 1: Create `lib/agents.ts`**

```ts
import { createAgent, openai } from "@inngest/agent-kit";
import { saveQueryTool } from "./tools/query";
import { searchShopsTool } from "./tools/search";
import { readWebpageTool } from "./tools/webpage";
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
    product name plus key specs suitable for a Google shopping search
    (e.g. "iPhone 18 128GB", "Sony WH-1000XM6 headphones").
    Drop filler words. Keep it under 8 words.
    MUST use the save_query tool with your cleaned query.
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
    const candidates = (network?.state.data.candidates || []).slice(0, 5);

    if (candidates.length === 0) {
      return `
        There are no candidate pages to read. Call read_webpage ONCE with
        url "none", title "none", site "none" to record that there is
        nothing to read.
      `;
    }

    return `
      You are a price-extraction agent. For EACH of these candidate pages,
      call read_webpage ONCE per candidate with its url, title, and site
      (use the domain name from the url as the site):

      ${JSON.stringify(candidates, null, 2)}

      Call read_webpage exactly ${candidates.length} times, once per
      candidate above. Do not skip any candidate.
    `;
  },
  tools: [readWebpageTool],
  tool_choice: "read_webpage",
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/agents.ts
git commit -m "Add the 6 agent definitions"
```

---

### Task 7: Deterministic router (network)

**Files:**
- Create: `lib/network.ts`

**Interfaces:**
- Consumes: all 6 agents from Task 6.
- Produces: `priceComparisonNetwork` — consumed by
  `app/inngest/functions.ts` in Task 8.

- [ ] **Step 1: Create `lib/network.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/network.ts
git commit -m "Add deterministic router wiring the 6-agent network"
```

---

### Task 8: Inngest client, function, and serve route

**Files:**
- Create: `app/inngest/client.ts`
- Create: `app/inngest/functions.ts`
- Create: `app/api/inngest/route.ts`

**Interfaces:**
- Consumes: `priceComparisonNetwork` from Task 7, `getDB` from Task 2.
- Produces: `inngest` client (id `price-comparison-agents`),
  `priceComparisonWorkflow` function (triggered by event
  `"price-comparison.agents/run"`) — consumed by `app/api/run-agents/route.ts`
  in Task 9.

- [ ] **Step 1: Create `app/inngest/client.ts`**

```ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "price-comparison-agents",
});
```

- [ ] **Step 2: Create `app/inngest/functions.ts`**

```ts
import { inngest } from "./client";
import { priceComparisonNetwork } from "@/lib/network";
import { getDB } from "@/lib/db";

export const priceComparisonWorkflow = inngest.createFunction(
  { id: "price-comparison-workflow", triggers: [{ event: "price-comparison.agents/run" }] },
  async ({ event }) => {
    const input = event.data.input;
    const runId = event.data.runId;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🤖 [Inngest] Starting price comparison agents");
    console.log("   Input:", input);
    console.log("   RunId:", runId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      const result = await priceComparisonNetwork.run(input, {
        state: {
          data: { runId },
        },
      });

      return {
        status: "success",
        result: result.state.data,
      };
    } catch (error) {
      console.log("❌ [Inngest] Error running agents", error);

      try {
        const db = await getDB();
        await db.collection("results").updateOne(
          { runId, status: "running" },
          {
            $set: {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
              failedAt: new Date(),
            },
          },
        );
      } catch (dbError) {
        console.error("Failed to save error:", dbError);
      }
      throw error;
    }
  },
);
```

- [ ] **Step 3: Create `app/api/inngest/route.ts`**

```ts
import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { priceComparisonWorkflow } from "@/app/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [priceComparisonWorkflow],
});
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add app/inngest/client.ts app/inngest/functions.ts app/api/inngest/route.ts
git commit -m "Wire the network into an Inngest function and serve route"
```

---

### Task 9: run-agents and results API routes

**Files:**
- Create: `app/api/run-agents/route.ts`
- Create: `app/api/results/route.ts`
- Create: `app/api/results/[runId]/route.ts`

**Interfaces:**
- Consumes: `inngest` client (Task 8), `getDB` (Task 2).
- Produces: `POST /api/run-agents` (`{ input }` -> `{ runId, status }`),
  `GET /api/results` (history list), `GET /api/results/:runId` (single
  run), `DELETE /api/results/:runId` — all consumed by `app/page.tsx` in
  Task 13.

- [ ] **Step 1: Create `app/api/run-agents/route.ts`**

```ts
import { inngest } from "@/app/inngest/client";
import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log("📝 [API] Generated runId:", runId);

    try {
      const db = await getDB();
      const insertResult = await db.collection("results").insertOne({
        runId,
        input,
        status: "running",
        progress: {},
        state: {},
        createdAt: new Date(),
      });
      console.log("✅ [API] Initial DB record created:", insertResult.insertedId);
    } catch (dbError) {
      console.error("❌ [API] MongoDB error:", dbError);
      throw dbError;
    }

    await inngest.send({
      name: "price-comparison.agents/run",
      data: { input, runId },
    });

    return NextResponse.json({
      status: "running",
      runId,
      message: "Agents running in background",
      input,
    });
  } catch (error) {
    console.error("Error running inngest:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/results/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDB();
    const results = await db
      .collection("results")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json(
      results.map((result) => ({
        runId: result.runId,
        input: result.input,
        status: result.status,
        createdAt: result.createdAt,
      })),
    );
  } catch (error) {
    console.error("Error fetching results history:", error);
    return NextResponse.json(
      { error: "Failed to fetch results history" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Create `app/api/results/[runId]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    const db = await getDB();
    const result = await db.collection("results").findOne({ runId });

    if (!result) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      runId: result.runId,
      input: result.input,
      status: result.status,
      progress: result.progress || {},
      state: result.state || {},
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      completedAt: result.completedAt,
      error: result.error,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    const db = await getDB();
    const result = await db.collection("results").deleteOne({ runId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting result:", error);
    return NextResponse.json({ error: "Failed to delete result" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/run-agents/route.ts app/api/results/route.ts "app/api/results/[runId]/route.ts"
git commit -m "Add run-agents and results API routes"
```

---

### Task 10: SearchInput and SearchHistory components

**Files:**
- Create: `components/SearchInput.tsx`
- Create: `components/SearchHistory.tsx`

**Interfaces:**
- Consumes: `Card`/`CardHeader`/`CardTitle`/`CardContent` and
  `Button`/`Input` from `components/ui/*` (Task 1).
- Produces: `SearchInput` (props: `input`, `onInputChange`, `onRun`,
  `isLoading`), `SearchHistory` (props: `items`, `selectedRunId`,
  `onSelect`, `onDelete`) — both consumed by `app/page.tsx` in Task 13.

- [ ] **Step 1: Create `components/SearchInput.tsx`**

```tsx
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

type SearchInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onRun: () => void;
  isLoading: boolean;
};

const SearchInput = ({ input, onInputChange, onRun, isLoading }: SearchInputProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>What product are you looking for?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="E.g., iPhone 18 128GB, Sony WH-1000XM6 headphones..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          className="text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading && input.trim()) onRun();
          }}
        />

        <Button onClick={onRun} disabled={isLoading || !input.trim()} className="w-full">
          {isLoading ? "Finding the best price…" : "Find cheapest price"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SearchInput;
```

- [ ] **Step 2: Create `components/SearchHistory.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type HistoryItem = {
  runId: string;
  input: string;
  status: "running" | "success" | "failed";
  createdAt: string;
};

type SearchHistoryProps = {
  items: HistoryItem[];
  selectedRunId?: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
};

const statusStyles: Record<HistoryItem["status"], string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const SearchHistory = ({ items, selectedRunId, onSelect, onDelete }: SearchHistoryProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Search History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-72 overflow-auto">
          {items.map((item) => (
            <div
              key={item.runId}
              className={`w-full flex items-center justify-between border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors ${
                selectedRunId === item.runId ? "border-ring bg-muted/50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.runId)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium truncate">{item.input}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
              <span
                className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-3 ${statusStyles[item.status]}`}
              >
                {item.status}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this search from history?")) {
                    onDelete(item.runId);
                  }
                }}
                aria-label="Delete"
                className="ml-2 text-muted-foreground hover:text-destructive flex-shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchHistory;
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add components/SearchInput.tsx components/SearchHistory.tsx
git commit -m "Add SearchInput and SearchHistory components"
```

---

### Task 11: JobStatus, CandidatesCard, ListingsCard, RankedCard

**Files:**
- Create: `components/JobStatus.tsx`
- Create: `components/CandidatesCard.tsx`
- Create: `components/ListingsCard.tsx`
- Create: `components/RankedCard.tsx`

**Interfaces:**
- Consumes: `Card`/`CardHeader`/`CardTitle`/`CardContent` from
  `components/ui/*`.
- Produces: `JobStatus` (props: `status`, `productQuery`, `candidates`,
  `listings`, `comparisons`, `ranked`, `approved`), `CandidatesCard`
  (props: `candidates`), `ListingsCard` (props: `listings`), `RankedCard`
  (props: `ranked`) — all consumed by `app/page.tsx` in Task 13.

- [ ] **Step 1: Create `components/JobStatus.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type JobStatusProps = {
  status: "running" | "success" | "failed";
  productQuery?: string;
  candidates?: number;
  listings?: number;
  comparisons?: number;
  ranked?: number;
  approved?: boolean;
};

const statusBadge: Record<JobStatusProps["status"], string> = {
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<JobStatusProps["status"], string> = {
  running: "🔄 Running",
  success: "✅ Complete",
  failed: "❌ Failed",
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const JobStatus = ({
  status,
  productQuery,
  candidates,
  listings,
  comparisons,
  ranked,
  approved,
}: JobStatusProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Status</CardTitle>
          <span className={`text-sm font-medium px-3 py-1 rounded ${statusBadge[status]}`}>
            {statusLabel[status]}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm">
          <Row label="Query Parsed:" value={productQuery || "—"} />
          <Row label="Candidates Found:" value={candidates ?? "—"} />
          <Row label="Pages Read:" value={listings ?? "—"} />
          <Row label="Compared:" value={comparisons ?? "—"} />
          <Row label="Ranked:" value={ranked ?? "—"} />
          {approved !== undefined && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-medium">Approved:</span>
                <span
                  className={approved ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
                >
                  {approved ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobStatus;
```

- [ ] **Step 2: Create `components/CandidatesCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Candidate = { title: string; url: string; snippet?: string };

type CandidatesCardProps = {
  candidates: Candidate[];
};

const CandidatesCard = ({ candidates }: CandidatesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidates ({candidates.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates yet</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-auto">
            {candidates.map((c, i) => (
              <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium">{c.title}</p>
                {c.snippet && (
                  <p className="text-xs text-muted-foreground mt-1">{c.snippet}</p>
                )}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  {c.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidatesCard;
```

- [ ] **Step 3: Create `components/ListingsCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Listing = { site: string; title: string; price: number; currency: string; url: string };

type ListingsCardProps = {
  listings: Listing[];
};

const ListingsCard = ({ listings }: ListingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prices Found ({listings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prices extracted yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {listings.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{l.site}</span>
                <span className="font-medium whitespace-nowrap">
                  {l.currency} {l.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ListingsCard;
```

- [ ] **Step 4: Create `components/RankedCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Listing = { site: string; title: string; price: number; currency: string; url: string };

type RankedCardProps = {
  ranked: Listing[];
};

const RankedCard = ({ ranked }: RankedCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranked (cheapest first)</CardTitle>
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing ranked yet</p>
        ) : (
          <ol className="space-y-2 max-h-80 overflow-auto">
            {ranked.map((l, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {l.site}
                </span>
                <span className="font-medium whitespace-nowrap">
                  {l.currency} {l.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default RankedCard;
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add components/JobStatus.tsx components/CandidatesCard.tsx components/ListingsCard.tsx components/RankedCard.tsx
git commit -m "Add JobStatus, Candidates, Listings, and Ranked cards"
```

---

### Task 12: FinalAnswerCard (hero result)

**Files:**
- Create: `components/FinalAnswerCard.tsx`

**Interfaces:**
- Consumes: `Card`/`CardContent` and `Button` from `components/ui/*`.
- Produces: `FinalAnswerCard` (props: `finalAnswer`) — consumed by
  `app/page.tsx` in Task 13.

This is the visually dominant card the design calls for: large price,
clear site name, a prominent "Buy now" link button. It intentionally looks
different from the other (data-table-style) cards.

- [ ] **Step 1: Create `components/FinalAnswerCard.tsx`**

```tsx
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

type FinalAnswer = {
  siteName: string | null;
  price: number | null;
  currency: string | null;
  url: string | null;
  summary: string;
};

type FinalAnswerCardProps = {
  finalAnswer: FinalAnswer;
};

const FinalAnswerCard = ({ finalAnswer }: FinalAnswerCardProps) => {
  const found = finalAnswer.price !== null && finalAnswer.url !== null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="py-6">
        {found ? (
          <div className="flex flex-col items-center text-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Cheapest price found
            </span>
            <span className="text-4xl font-bold">
              {finalAnswer.currency} {finalAnswer.price!.toFixed(2)}
            </span>
            <span className="text-lg font-medium">{finalAnswer.siteName}</span>
            <p className="text-sm text-muted-foreground max-w-prose">{finalAnswer.summary}</p>
            <a href={finalAnswer.url!} target="_blank" rel="noreferrer" className="mt-2">
              <Button size="lg">Buy now →</Button>
            </a>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <span className="text-lg font-medium">No price found</span>
            <p className="text-sm text-muted-foreground max-w-prose mx-auto">
              {finalAnswer.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalAnswerCard;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add components/FinalAnswerCard.tsx
git commit -m "Add FinalAnswerCard hero result component"
```

---

### Task 13: Wire up the main page

**Files:**
- Modify: `app/page.tsx` (replace the Task 1 placeholder)

**Interfaces:**
- Consumes: `SearchInput`, `SearchHistory`, `JobStatus`, `CandidatesCard`,
  `ListingsCard`, `RankedCard`, `FinalAnswerCard` (Tasks 10–12), and the
  API routes from Task 9.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SearchInput from "@/components/SearchInput";
import SearchHistory from "@/components/SearchHistory";
import JobStatus from "@/components/JobStatus";
import CandidatesCard from "@/components/CandidatesCard";
import ListingsCard from "@/components/ListingsCard";
import RankedCard from "@/components/RankedCard";
import FinalAnswerCard from "@/components/FinalAnswerCard";

export default function Home() {
  const [input, setInput] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useQuery({
    queryKey: ["results", runId],
    queryFn: async () => {
      const response = await fetch(`/api/results/${runId}`);
      return response.json();
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "success" || data?.status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const response = await fetch("/api/results");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const deleteRun = useMutation({
    mutationFn: async (deleteRunId: string) => {
      await fetch(`/api/results/${deleteRunId}`, { method: "DELETE" });
    },
    onSuccess: (_data, deleteRunId) => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      if (runId === deleteRunId) {
        setRunId(null);
      }
    },
  });

  const handleRun = async () => {
    if (!input.trim()) {
      alert("Please enter a product name");
      return;
    }
    try {
      const res = await fetch("/api/run-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json();
      setRunId(data.runId);
    } catch (error) {
      console.error("Error running agents:", error);
      alert("Failed to run agents. Please try again.");
    }
  };

  const state = result?.state || null;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 border-b border-border pb-4">
          <h1 className="text-3xl font-bold">Price Comparison Agents</h1>
          <p className="text-muted-foreground mt-1">
            Multi-agent system that finds the cheapest place to buy a product
          </p>
        </div>

        <SearchInput
          input={input}
          onInputChange={setInput}
          onRun={handleRun}
          isLoading={isLoading}
        />

        <SearchHistory
          items={history || []}
          selectedRunId={runId}
          onSelect={setRunId}
          onDelete={(deleteRunId) => deleteRun.mutate(deleteRunId)}
        />

        {result && (
          <>
            <JobStatus
              status={result.status}
              productQuery={state?.productQuery}
              candidates={state?.candidates?.length}
              listings={state?.listings?.length}
              comparisons={state?.comparisons?.length}
              ranked={state?.ranked?.length}
              approved={state?.approved}
            />

            {state?.finalAnswer && (
              <div className="mb-6">
                <FinalAnswerCard finalAnswer={state.finalAnswer} />
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <CandidatesCard candidates={state?.candidates || []} />
              <ListingsCard listings={state?.listings || []} />
              <RankedCard ranked={state?.ranked || []} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npx eslint .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Wire up the main page with all result cards"
```

---

### Task 14: Final end-to-end verification

**Files:** none created — verification only.

- [ ] **Step 1: Full typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npx eslint .`
Expected: no errors.

Run: `npm test`
Expected: all 6 price-extractor tests pass.

- [ ] **Step 2: Dev server smoke test (no credentials needed)**

Run: `npm run dev` (in background)
Expected: starts without error, `http://localhost:3000` responds with the
search page shown (even with empty/placeholder `.env.local` values, the
page itself renders — MongoDB/OpenAI calls only happen once a search is
run).
Stop the dev server after confirming.

- [ ] **Step 3: Real end-to-end run (requires the user to have filled in `.env.local`)**

This step needs real `OPENAI_API_KEY`, `SERPER_API_KEY`, and
`MONGODB_URI` values in `.env.local`, and costs real API credit — **do
not run this step without the user's explicit go-ahead**, matching the
cost-conscious testing approach used throughout `multi-agent-system`.

When ready:
1. `npm run dev` (terminal 1)
2. `npx inngest-cli@latest dev` (terminal 2)
3. Open `http://localhost:3000`, search for a real product (e.g. "iPhone
   18 128GB")
4. Confirm the Job Status reaches "✅ Complete" and the Final Answer card
   shows a site, price, and working link.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Complete price comparison agents MVP"
```
