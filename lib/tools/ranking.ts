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
