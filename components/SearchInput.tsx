import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

type SearchInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onRun: () => void;
  isLoading: boolean;
};

const SearchInput = ({ input, onInputChange, onRun, isLoading }: SearchInputProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>What product are you looking for?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="E.g., iPhone 18 128GB, Sony WH-1000XM6 headphones..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          className="text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading && input.trim()) onRun();
          }}
        />

        <Button onClick={onRun} disabled={isLoading || !input.trim()} className="w-full">
          {isLoading ? "Finding the best price…" : "Find cheapest price"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SearchInput;
