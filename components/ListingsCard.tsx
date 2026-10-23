import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Listing = { site: string; title: string; price: number; currency: string; url: string };

type ListingsCardProps = {
  listings: Listing[];
};

const ListingsCard = ({ listings }: ListingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prices Found ({listings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prices extracted yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {listings.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{l.site}</span>
                <span className="font-medium whitespace-nowrap">
                  {l.currency} {l.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ListingsCard;
