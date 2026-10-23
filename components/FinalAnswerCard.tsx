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

  if (!found) {
    return (
      <div className="rounded-sm bg-card p-5 text-center ring-1 ring-foreground/10">
        <p className="font-display text-lg text-foreground">No price found</p>
        <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
          {finalAnswer.summary}
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-sm animate-[tag-settle_0.5s_ease-out]">
      <div
        className="relative bg-accent/12 py-7 pr-7 pl-10 text-center ring-2 ring-accent"
        style={{
          clipPath: "polygon(0 50%, 10% 0, 100% 0, 100% 100%, 10% 100%)",
        }}
      >
        <span
          className="absolute top-1/2 left-[5%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background ring-1 ring-accent"
          aria-hidden="true"
        />

        <p className="text-[11px] text-muted-foreground">Cheapest price found</p>
        <p className="font-ticket mt-1 text-4xl font-semibold text-foreground">
          {finalAnswer.currency} {finalAnswer.price!.toFixed(2)}
        </p>
        <p className="font-display mt-1 text-base text-foreground">{finalAnswer.siteName}</p>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          {finalAnswer.summary}
        </p>
        <a href={finalAnswer.url!} target="_blank" rel="noreferrer" className="mt-4 inline-block">
          <Button size="lg">Buy now</Button>
        </a>
      </div>
    </div>
  );
};

export default FinalAnswerCard;
