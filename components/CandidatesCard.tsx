type Candidate = { title: string; url: string; snippet?: string };

type CandidatesCardProps = {
  candidates: Candidate[];
};

const CandidatesCard = ({ candidates }: CandidatesCardProps) => {
  return (
    <div>
      <p className="font-display text-sm text-foreground">Candidates ({candidates.length})</p>
      {candidates.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No candidates yet</p>
      ) : (
        <div className="mt-2 max-h-56 space-y-2.5 overflow-auto pr-1">
          {candidates.map((c, i) => (
            <div key={i}>
              <p className="truncate text-sm text-foreground">{c.title}</p>
              {c.snippet && (
                <p className="truncate text-xs text-muted-foreground">{c.snippet}</p>
              )}
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-primary hover:underline"
              >
                {c.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidatesCard;
