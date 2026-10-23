import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

type FinalAnswer = {
  siteName: string | null;
  price: number | null;
  currency: string | null;
  url: string | null;
  summary: string;
};

type FinalAnswerCardProps = {
  finalAnswer: FinalAnswer;
};

const FinalAnswerCard = ({ finalAnswer }: FinalAnswerCardProps) => {
  const found = finalAnswer.price !== null && finalAnswer.url !== null;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="py-6">
        {found ? (
          <div className="flex flex-col items-center text-center gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Cheapest price found
            </span>
            <span className="text-4xl font-bold">
              {finalAnswer.currency} {finalAnswer.price!.toFixed(2)}
            </span>
            <span className="text-lg font-medium">{finalAnswer.siteName}</span>
            <p className="text-sm text-muted-foreground max-w-prose">{finalAnswer.summary}</p>
            <a href={finalAnswer.url!} target="_blank" rel="noreferrer" className="mt-2">
              <Button size="lg">Buy now →</Button>
            </a>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <span className="text-lg font-medium">No price found</span>
            <p className="text-sm text-muted-foreground max-w-prose mx-auto">
              {finalAnswer.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalAnswerCard;
