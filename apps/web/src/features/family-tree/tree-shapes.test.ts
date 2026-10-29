import { describe, expect, it } from "vitest";
import { NODE_HEIGHT, NODE_WIDTH, type LayoutNode } from "./layout";
import { COLORS, descentShape, layoutBounds, marriageShapes, personShapes } from "./tree-shapes";

const node = (overrides: Partial<LayoutNode> = {}): LayoutNode => ({
  id: "I1",
  x: 0,
  y: 0,
  label: "山田 太郎",
  generation: 0,
  isCenter: false,
  ...overrides,
});

describe("personShapes", () => {
  it.each([
    ["M", COLORS.sex.M],
    ["F", COLORS.sex.F],
    ["X", COLORS.sex.other],
    ["U", COLORS.sex.other],
    [undefined, COLORS.sex.other],
  ] as const)("性別 %s の枠と背景の色", (sex, color) => {
    const { rect } = personShapes(node({ sex }), true);
    expect(rect).toMatchObject({ stroke: color.stroke, fill: color.fill, strokeWidth: 2 });
  });

  it("強調ありなら中心人物の枠と文字を強調する", () => {
    const { rect, text } = personShapes(node({ sex: "M", isCenter: true }), true);
    expect(rect).toMatchObject({ stroke: COLORS.center, strokeWidth: 4 });
    expect(text).toMatchObject({ fontStyle: "bold", text: "山田 太郎" });
  });

  it("強調なしなら中心人物も通常の見た目で描く", () => {
    const { rect, text } = personShapes(node({ sex: "M", isCenter: true }), false);
    expect(rect).toMatchObject({ stroke: COLORS.sex.M.stroke, strokeWidth: 2 });
    expect(text.fontStyle).toBe("normal");
  });
});

describe("線", () => {
  it("婚姻線は太い線の上に背景色の細い線を重ねた二重線", () => {
    const [outer, inner] = marriageShapes({ points: [0, 0, 10, 0] });
    expect(outer).toMatchObject({ points: [0, 0, 10, 0], stroke: COLORS.line });
    expect(inner).toMatchObject({ points: [0, 0, 10, 0], stroke: COLORS.background });
    expect(outer.strokeWidth!).toBeGreaterThan(inner.strokeWidth!);
  });

  it("親子線は1本の線", () => {
    expect(descentShape({ points: [0, 0, 0, 10] })).toMatchObject({ points: [0, 0, 0, 10], stroke: COLORS.line });
  });
});

describe("layoutBounds", () => {
  it("要素が無ければ大きさ0", () => {
    expect(layoutBounds({ nodes: [], marriages: [], descents: [] })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("ノードと線をすべて囲み、線は太さの半分だけ広げる", () => {
    const bounds = layoutBounds({
      nodes: [node({ x: 100, y: 50 }), node({ x: -200, y: 200 })],
      marriages: [{ points: [-300, 74, -200, 74] }],
      descents: [{ points: [50, 0, 50, 50] }],
    });
    expect(bounds).toEqual({ x: -303, y: -3, width: 100 + NODE_WIDTH + 303, height: 200 + NODE_HEIGHT + 3 });
  });
});
