import Konva from "konva";
import { computeLayout } from "../layout";
import {
  ADOPTION_LEGEND,
  COLORS,
  descentShape,
  hasAdoption,
  layoutBounds,
  marriageShapes,
  personShapes,
} from "../tree-shapes";
import type { ExportTarget } from "./target";

/** 家系図の周囲の余白 */
const PADDING = 24;
/** 印刷・拡大に耐えるよう画面の座標系の2倍で描く */
const PIXEL_RATIO = 2;
/** 家系図の下に添える凡例の高さ */
const LEGEND_HEIGHT = 24;
const LEGEND_SAMPLE_WIDTH = 32;

/** 出力画像。width/height は画面の座標系での大きさ(canvas の画素数は PIXEL_RATIO 倍) */
export type TreeImage = { canvas: HTMLCanvasElement; width: number; height: number };

/**
 * 家系図全体を、画面のパン・ズームと無関係に描いた canvas を返す。
 * 画像では選択中の人物を強調しない
 */
export const renderTreeImage = (target: ExportTarget): TreeImage => {
  const layout = computeLayout(target.tree, undefined);
  const bounds = layoutBounds(layout);
  const legend = hasAdoption(layout);
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2 + (legend ? LEGEND_HEIGHT : 0));

  const stage = new Konva.Stage({ container: document.createElement("div"), width, height });
  try {
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ width, height, fill: COLORS.background }));
    const content = new Konva.Group({ x: PADDING - bounds.x, y: PADDING - bounds.y });
    layer.add(content);
    for (const line of layout.descents) content.add(new Konva.Line(descentShape(line)));
    for (const line of layout.marriages) {
      for (const config of marriageShapes(line)) content.add(new Konva.Line(config));
    }
    for (const node of layout.nodes) {
      const shapes = personShapes(node, false);
      const group = new Konva.Group({ x: node.x, y: node.y });
      group.add(new Konva.Rect(shapes.rect), new Konva.Text(shapes.text));
      content.add(group);
    }
    if (legend) {
      // 家系図の左下に、破線の見本と説明を置く
      const y = PADDING + bounds.height + LEGEND_HEIGHT / 2;
      layer.add(
        new Konva.Line(descentShape({ points: [PADDING, y, PADDING + LEGEND_SAMPLE_WIDTH, y], adopted: true })),
        new Konva.Text({
          x: PADDING + LEGEND_SAMPLE_WIDTH + 8,
          y: y - 7,
          text: ADOPTION_LEGEND,
          fontSize: 14,
          fill: COLORS.text,
        }),
      );
    }
    return { canvas: stage.toCanvas({ pixelRatio: PIXEL_RATIO }), width, height };
  } finally {
    stage.destroy();
  }
};

export const imageToPngBlob = ({ canvas }: TreeImage): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG の生成に失敗しました"))), "image/png"),
  );
