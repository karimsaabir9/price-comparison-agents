type Listing = { site: string; title: string; price: number; currency: string; url: string };

type RankedCardProps = {
  ranked: Listing[];
};

const RankedCard = ({ ranked }: RankedCardProps) => {
  return (
    <div>
      <p className="font-display text-sm text-foreground">Ranked, cheapest first</p>
      {ranked.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing ranked yet</p>
      ) : (
        <ol className="mt-2 max-h-56 space-y-1.5 overflow-auto pr-1">
          {ranked.map((l, i) => (
            <li key={i} className="receipt-line text-sm">
              <span className="font-ticket text-muted-foreground">{i + 1}</span>
              <span className="truncate text-foreground">{l.site}</span>
              <span className="receipt-leader" />
              <span className="font-ticket whitespace-nowrap text-foreground">
                {l.currency} {l.price.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default RankedCard;
