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
