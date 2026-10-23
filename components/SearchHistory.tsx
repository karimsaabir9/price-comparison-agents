type HistoryItem = {
  runId: string;
  input: string;
  status: "running" | "success" | "failed";
  createdAt: string;
};

type SearchHistoryProps = {
  items: HistoryItem[];
  selectedRunId?: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
};

const statusDot: Record<HistoryItem["status"], string> = {
  success: "bg-primary",
  failed: "bg-destructive",
  running: "bg-accent",
};

const SearchHistory = ({ items, selectedRunId, onSelect, onDelete }: SearchHistoryProps) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="p-5 pt-4">
      <p className="mb-3 text-xs text-muted-foreground">Recent searches</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.runId}
            className={`ticket-stub flex items-center gap-3 pl-3 py-2 transition-colors ${
              selectedRunId === item.runId ? "bg-muted/60" : "hover:bg-muted/30"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[item.status]}`}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => onSelect(item.runId)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm text-foreground">{item.input}</p>
              <p className="font-ticket text-[11px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this search from history?")) {
                  onDelete(item.runId);
                }
              }}
              aria-label="Delete"
              className="shrink-0 px-1 text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
