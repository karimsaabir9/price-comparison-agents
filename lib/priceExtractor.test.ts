import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPriceFromText } from "./priceExtractor";

test("extracts a USD price with dollar sign and comma", () => {
  const result = extractPriceFromText("Now only $1,299.99 — free shipping");
  assert.deepEqual(result, { price: 1299.99, currency: "USD" });
});

test("extracts a USD price written as USD 899", () => {
  const result = extractPriceFromText("Price: USD 899 in stock");
  assert.deepEqual(result, { price: 899, currency: "USD" });
});

test("extracts a EUR price with euro sign", () => {
  const result = extractPriceFromText("Nur €749.00 heute bestellen");
  assert.deepEqual(result, { price: 749, currency: "EUR" });
});

test("extracts a GBP price with pound sign", () => {
  const result = extractPriceFromText("Our price: £899.99");
  assert.deepEqual(result, { price: 899.99, currency: "GBP" });
});

test("returns null when no price pattern is found", () => {
  const result = extractPriceFromText("Out of stock. Check back later.");
  assert.equal(result, null);
});

test("returns null for a malformed currency match", () => {
  const result = extractPriceFromText("$ (price unavailable)");
  assert.equal(result, null);
});
