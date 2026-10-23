type JobStatusProps = {
  status: "running" | "success" | "failed";
  productQuery?: string;
  candidates?: number;
  listings?: number;
  comparisons?: number;
  ranked?: number;
  approved?: boolean;
};

const statusDot: Record<JobStatusProps["status"], string> = {
  running: "bg-accent",
  success: "bg-primary",
  failed: "bg-destructive",
};

const statusLabel: Record<JobStatusProps["status"], string> = {
  running: "Running",
  success: "Complete",
  failed: "Failed",
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="receipt-line text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="receipt-leader" />
    <span className="font-ticket text-foreground">{value}</span>
  </div>
);

const JobStatus = ({
  status,
  productQuery,
  candidates,
  listings,
  comparisons,
  ranked,
  approved,
}: JobStatusProps) => {
  return (
    <div className="rounded-sm bg-card p-5 ring-1 ring-foreground/10">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden="true" />
        <p className="text-sm text-foreground">{statusLabel[status]}</p>
      </div>

      <div className="space-y-1.5">
        <Row label="Query" value={productQuery || "—"} />
        <Row label="Candidates found" value={candidates ?? "—"} />
        <Row label="Pages read" value={listings ?? "—"} />
        <Row label="Compared" value={comparisons ?? "—"} />
        <Row label="Ranked" value={ranked ?? "—"} />
        {approved !== undefined && (
          <div className="receipt-line pt-1.5 text-sm">
            <span className="text-muted-foreground">Approved</span>
            <span className="receipt-leader" />
            <span
              className={`font-ticket ${approved ? "text-primary" : "text-destructive"}`}
            >
              {approved ? "Yes" : "No"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobStatus;
