import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { matches } from "./search";

describe("toCsv", () => {
  it("joins rows with CRLF", () => expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2"));
  it("quotes commas, quotes and newlines", () => expect(toCsv([["x, y", 'say "hi"', "a\nb"]])).toBe('"x, y","say ""hi""","a\nb"'));
  it("writes null as empty", () => expect(toCsv([[null, undefined, 0]])).toBe(",,0"));
});
describe("matches", () => {
  it("is true for an empty query", () => expect(matches("", "anything")).toBe(true));
  it("needs every word, any order, any case", () => { expect(matches("shiva web", "Shiva Shakthi", "Website")).toBe(true); expect(matches("shiva app", "Shiva Shakthi", "Website")).toBe(false); });
  it("ignores missing fields", () => expect(matches("a", null, undefined, "A")).toBe(true));
});
