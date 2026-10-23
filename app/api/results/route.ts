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
