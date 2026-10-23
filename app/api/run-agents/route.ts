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
