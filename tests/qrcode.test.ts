import { describe, expect, it } from "vitest";
import { generateQRCodeSVG } from "../src/lib/qrcode";

describe("generateQRCodeSVG", () => {
  it("generates a valid SVG string for a route URL", () => {
    const url = "https://pujo.guide/?route=bagbazar,ahiritola,college-street";
    const svg = generateQRCodeSVG(url);

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("<path d=");
    expect(svg.length).toBeGreaterThan(100);
  });
});
