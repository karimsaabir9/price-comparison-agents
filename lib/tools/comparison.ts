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
