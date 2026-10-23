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
