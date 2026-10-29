import { beforeEach, describe, expect, it, vi } from "vitest";
import { imageToPdfBlob, placeOnA4 } from "./pdf";

const jsPDF = vi.hoisted(() => vi.fn());
vi.mock("jspdf", () => ({ jsPDF }));

/** 96dpi で mm に換算した長さ */
const mm = (px: number) => (px * 25.4) / 96;

describe("placeOnA4", () => {
  it("余白内に収まる画像は等倍でページ中央に置く", () => {
    expect(placeOnA4(400, 300)).toEqual({
      orientation: "landscape",
      x: (297 - mm(400)) / 2,
      y: (210 - mm(300)) / 2,
      width: mm(400),
      height: mm(300),
    });
  });

  it("縦長・正方形は縦向き", () => {
    expect(placeOnA4(300, 400).orientation).toBe("portrait");
    expect(placeOnA4(300, 300).orientation).toBe("portrait");
  });

  it("横に収まらない画像は余白内の幅まで縮小する", () => {
    const placement = placeOnA4(4000, 1000);
    expect(placement.width).toBeCloseTo(297 - 20);
    expect(placement.height).toBeCloseTo((277 * 1000) / 4000);
    expect(placement.x).toBeCloseTo(10);
  });

  it("縦に収まらない画像は余白内の高さまで縮小する", () => {
    const placement = placeOnA4(1000, 4000);
    expect(placement.height).toBeCloseTo(297 - 20);
    expect(placement.y).toBeCloseTo(10);
  });
});

describe("imageToPdfBlob", () => {
  const doc = { addImage: vi.fn(), output: vi.fn(() => new Blob(["%PDF"])) };
  beforeEach(() => {
    jsPDF.mockReset().mockImplementation(function () {
      return doc;
    });
  });

  it("A4 の PDF に canvas を配置位置に合わせて埋め込む", async () => {
    const canvas = document.createElement("canvas");
    const blob = await imageToPdfBlob({ canvas, width: 4000, height: 1000 });
    const placement = placeOnA4(4000, 1000);
    expect(jsPDF).toHaveBeenCalledWith({ orientation: "landscape", unit: "mm", format: "a4" });
    expect(doc.addImage).toHaveBeenCalledWith(
      canvas,
      "PNG",
      placement.x,
      placement.y,
      placement.width,
      placement.height,
      undefined,
      "FAST",
    );
    expect(doc.output).toHaveBeenCalledWith("blob");
    expect(await blob.text()).toBe("%PDF");
  });
});
