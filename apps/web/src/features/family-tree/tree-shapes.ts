import type { LineConfig } from "konva/lib/shapes/Line";
import type { RectConfig } from "konva/lib/shapes/Rect";
import type { TextConfig } from "konva/lib/shapes/Text";
import { NODE_HEIGHT, NODE_WIDTH, type LayoutLine, type LayoutNode, type TreeLayout } from "./layout";

/** 画面表示と画像出力で同じ見た目にするため、図形の設定をここに集約する。canvas は CSS 変数を参照できないため色を固定値で持つ */
export const COLORS = {
  background: "#ffffff",
  line: "#374151",
  text: "#111827",
  center: "#f59e0b",
  sex: {
    M: { stroke: "#3b82f6", fill: "#eff6ff" },
    F: { stroke: "#ef4444", fill: "#fef2f2" },
    other: { stroke: "#9ca3af", fill: "#f9fafb" },
  },
} as const;

const MARRIAGE_WIDTH = 6;

/** 個人ノードの枠と文字(座標はノード左上を原点とする)。highlightCenter が false なら中心人物も通常の見た目にする */
export const personShapes = (node: LayoutNode, highlightCenter: boolean): { rect: RectConfig; text: TextConfig } => {
  const color = node.sex === "M" || node.sex === "F" ? COLORS.sex[node.sex] : COLORS.sex.other;
  const emphasized = highlightCenter && node.isCenter;
  return {
    rect: {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      cornerRadius: 6,
      fill: color.fill,
      stroke: emphasized ? COLORS.center : color.stroke,
      strokeWidth: emphasized ? 4 : 2,
    },
    text: {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      padding: 8,
      text: node.label,
      fontSize: 14,
      fontStyle: emphasized ? "bold" : "normal",
      fill: COLORS.text,
      align: "center",
      verticalAlign: "middle",
      wrap: "none",
      ellipsis: true,
    },
  };
};

/** 養親子(普通養子)の線の破線パターン */
export const ADOPTION_DASH = [6, 4];
/** 凡例の文言。養親子の線がある場合に、画面と画像に添える */
export const ADOPTION_LEGEND = "破線: 養子(養親子)";

/** 親子線。養親子は破線 */
export const descentShape = (line: LayoutLine): LineConfig => ({
  points: line.points,
  stroke: COLORS.line,
  strokeWidth: 1.5,
  ...(line.adopted ? { dash: ADOPTION_DASH } : {}),
});

/** 凡例を添えるか(養親子の線があるか) */
export const hasAdoption = (layout: TreeLayout): boolean => layout.descents.some((line) => line.adopted);

/** 二重線: 太い線の上に背景色の細い線を重ねる */
export const marriageShapes = (line: LayoutLine): [LineConfig, LineConfig] => [
  { points: line.points, stroke: COLORS.line, strokeWidth: MARRIAGE_WIDTH, lineJoin: "miter" },
  { points: line.points, stroke: COLORS.background, strokeWidth: 2, lineJoin: "miter" },
];

export type Bounds = { x: number; y: number; width: number; height: number };

/** 家系図全体(ノードと線)を囲む矩形。線は太さの半分だけ外側に広げる */
export const layoutBounds = (layout: TreeLayout): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (x1: number, y1: number, x2: number, y2: number) => {
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  };
  for (const node of layout.nodes) include(node.x, node.y, node.x + NODE_WIDTH, node.y + NODE_HEIGHT);
  for (const line of [...layout.marriages, ...layout.descents]) {
    for (let i = 0; i < line.points.length; i += 2) {
      const [x, y] = [line.points[i]!, line.points[i + 1]!];
      const half = MARRIAGE_WIDTH / 2;
      include(x - half, y - half, x + half, y + half);
    }
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};
