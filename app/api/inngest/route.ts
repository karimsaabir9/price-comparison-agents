import { serve } from "inngest/next";
import { inngest } from "../../inngest/client";
import { priceComparisonWorkflow } from "@/app/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [priceComparisonWorkflow],
});
