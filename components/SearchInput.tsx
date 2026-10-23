import { Button } from "./ui/button";
import { Input } from "./ui/input";

type SearchInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onRun: () => void;
  isLoading: boolean;
};

const SearchInput = ({ input, onInputChange, onRun, isLoading }: SearchInputProps) => {
  return (
    <div className="space-y-3 p-5">
      <p className="font-display text-base text-foreground">What are you looking for?</p>
      <Input
        placeholder="iPhone 18 128GB, Sony WH-1000XM6 headphones…"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        disabled={isLoading}
        className="text-base"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading && input.trim()) onRun();
        }}
      />

      <Button onClick={onRun} disabled={isLoading || !input.trim()} className="w-full">
        {isLoading ? "Checking the stores…" : "Find the cheapest price"}
      </Button>
    </div>
  );
};

export default SearchInput;
