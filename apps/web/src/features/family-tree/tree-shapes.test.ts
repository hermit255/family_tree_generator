import { describe, expect, it } from "vitest";
import { NODE_HEIGHT, NODE_WIDTH, type LayoutNode } from "./layout";
import {
  ADOPTION_DASH,
  COLORS,
  descentShape,
  hasAdoption,
  layoutBounds,
  marriageShapes,
  personShapes,
  squareCrop,
} from "./tree-shapes";

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

describe("写真", () => {
  it("写真のある人物は左端に円形の写真を置き、文字を右へずらす", () => {
    const { text, avatar } = personShapes(node({ sex: "F", avatar: "data:image/png;base64,AA==" }), true);
    expect(avatar).toMatchObject({ x: 6, y: 6, width: 36, height: 36, cornerRadius: 18, stroke: COLORS.sex.F.stroke });
    expect(text).toMatchObject({ x: 42, width: NODE_WIDTH - 42 });
  });

  it("写真の無い人物は写真を置かず、文字はノードの幅いっぱい", () => {
    const { text, avatar } = personShapes(node(), true);
    expect(avatar).toBeUndefined();
    expect(text).toMatchObject({ x: 0, width: NODE_WIDTH });
  });

  it("squareCrop は中央の正方形を切り抜く", () => {
    expect(squareCrop(300, 200)).toEqual({ x: 50, y: 0, width: 200, height: 200 });
    expect(squareCrop(100, 160)).toEqual({ x: 0, y: 30, width: 100, height: 100 });
  });
});

describe("線", () => {
  it("婚姻線は太い線の上に背景色の細い線を重ねた二重線", () => {
    const [outer, inner] = marriageShapes({ points: [0, 0, 10, 0] });
    expect(outer).toMatchObject({ points: [0, 0, 10, 0], stroke: COLORS.line });
    expect(inner).toMatchObject({ points: [0, 0, 10, 0], stroke: COLORS.background });
    expect(outer.strokeWidth!).toBeGreaterThan(inner.strokeWidth!);
  });

  it("親子線は1本の実線", () => {
    const shape = descentShape({ points: [0, 0, 0, 10] });
    expect(shape).toMatchObject({ points: [0, 0, 0, 10], stroke: COLORS.line });
    expect(shape.dash).toBeUndefined();
  });

  it("養親子の親子線は破線", () => {
    expect(descentShape({ points: [0, 0, 0, 10], adopted: true })).toMatchObject({ dash: ADOPTION_DASH });
  });
});

describe("hasAdoption", () => {
  it("養親子の線があれば true", () => {
    const layout = { nodes: [], marriages: [], descents: [{ points: [] }, { points: [], adopted: true }] };
    expect(hasAdoption(layout)).toBe(true);
    expect(hasAdoption({ ...layout, descents: [{ points: [], adopted: false }] })).toBe(false);
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
