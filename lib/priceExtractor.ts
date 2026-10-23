export type ExtractedPrice = { price: number; currency: string };

const CURRENCY_PATTERNS: Array<{ regex: RegExp; currency: string }> = [
  { regex: /\$\s?([\d,]+(?:\.\d{2})?)/, currency: "USD" },
  { regex: /USD\s?([\d,]+(?:\.\d{2})?)/i, currency: "USD" },
  { regex: /€\s?([\d,]+(?:\.\d{2})?)/, currency: "EUR" },
  { regex: /£\s?([\d,]+(?:\.\d{2})?)/, currency: "GBP" },
];

export function extractPriceFromText(text: string): ExtractedPrice | null {
  for (const { regex, currency } of CURRENCY_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      if (!Number.isNaN(price) && price > 0) {
        return { price, currency };
      }
    }
  }
  return null;
}
