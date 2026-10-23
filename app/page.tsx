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
    <main className="min-h-screen bg-background px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Cheapest Find
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Agents check real stores and hand you a priced ticket for the lowest one
          </p>
        </div>

        <div className="rounded-sm bg-card ring-1 ring-foreground/10">
          <SearchInput
            input={input}
            onInputChange={setInput}
            onRun={handleRun}
            isLoading={isLoading || result?.status === "running"}
          />

          <hr className="ticket-tear" />

          <SearchHistory
            items={history || []}
            selectedRunId={runId}
            onSelect={setRunId}
            onDelete={(deleteRunId) => deleteRun.mutate(deleteRunId)}
          />
        </div>

        {result && (
          <div className="mt-8 space-y-6">
            {result.status === "failed" && (
              <p className="text-sm text-destructive">
                {result.error || "The run failed unexpectedly."}
              </p>
            )}

            {state?.finalAnswer && <FinalAnswerCard finalAnswer={state.finalAnswer} />}

            <JobStatus
              status={result.status}
              productQuery={state?.productQuery}
              candidates={state?.candidates?.length}
              listings={state?.listings?.length}
              comparisons={state?.comparisons?.length}
              ranked={state?.ranked?.length}
              approved={state?.approved}
            />

            <div className="rounded-sm bg-card p-5 ring-1 ring-foreground/10">
              <CandidatesCard candidates={state?.candidates || []} />
              <hr className="ticket-tear my-4" />
              <ListingsCard listings={state?.listings || []} />
              <hr className="ticket-tear my-4" />
              <RankedCard ranked={state?.ranked || []} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
