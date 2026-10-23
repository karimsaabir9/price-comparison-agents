type Listing = { site: string; title: string; price: number; currency: string; url: string };

type ListingsCardProps = {
  listings: Listing[];
};

const ListingsCard = ({ listings }: ListingsCardProps) => {
  return (
    <div>
      <p className="font-display text-sm text-foreground">Prices found ({listings.length})</p>
      {listings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No prices extracted yet</p>
      ) : (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-auto pr-1">
          {listings.map((l, i) => (
            <div key={i} className="receipt-line text-sm">
              <span className="truncate text-foreground">{l.site}</span>
              <span className="receipt-leader" />
              <span className="font-ticket whitespace-nowrap text-foreground">
                {l.currency} {l.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingsCard;
