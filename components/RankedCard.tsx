import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Listing = { site: string; title: string; price: number; currency: string; url: string };

type RankedCardProps = {
  ranked: Listing[];
};

const RankedCard = ({ ranked }: RankedCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranked (cheapest first)</CardTitle>
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing ranked yet</p>
        ) : (
          <ol className="space-y-2 max-h-80 overflow-auto">
            {ranked.map((l, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {l.site}
                </span>
                <span className="font-medium whitespace-nowrap">
                  {l.currency} {l.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default RankedCard;
