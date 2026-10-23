import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type JobStatusProps = {
  status: "running" | "success" | "failed";
  productQuery?: string;
  candidates?: number;
  listings?: number;
  comparisons?: number;
  ranked?: number;
  approved?: boolean;
};

const statusBadge: Record<JobStatusProps["status"], string> = {
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<JobStatusProps["status"], string> = {
  running: "🔄 Running",
  success: "✅ Complete",
  failed: "❌ Failed",
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
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
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Status</CardTitle>
          <span className={`text-sm font-medium px-3 py-1 rounded ${statusBadge[status]}`}>
            {statusLabel[status]}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm">
          <Row label="Query Parsed:" value={productQuery || "—"} />
          <Row label="Candidates Found:" value={candidates ?? "—"} />
          <Row label="Pages Read:" value={listings ?? "—"} />
          <Row label="Compared:" value={comparisons ?? "—"} />
          <Row label="Ranked:" value={ranked ?? "—"} />
          {approved !== undefined && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-medium">Approved:</span>
                <span
                  className={approved ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
                >
                  {approved ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobStatus;
