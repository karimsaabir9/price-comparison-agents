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
