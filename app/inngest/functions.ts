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
