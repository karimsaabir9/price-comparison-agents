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
