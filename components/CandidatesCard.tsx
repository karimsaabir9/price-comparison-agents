import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Candidate = { title: string; url: string; snippet?: string };

type CandidatesCardProps = {
  candidates: Candidate[];
};

const CandidatesCard = ({ candidates }: CandidatesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidates ({candidates.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates yet</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-auto">
            {candidates.map((c, i) => (
              <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium">{c.title}</p>
                {c.snippet && (
                  <p className="text-xs text-muted-foreground mt-1">{c.snippet}</p>
                )}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  {c.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidatesCard;
