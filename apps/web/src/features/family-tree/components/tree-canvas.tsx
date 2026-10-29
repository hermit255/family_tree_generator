"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { NODE_HEIGHT, NODE_WIDTH, type LayoutNode, type TreeLayout } from "../layout";

// ピンチ操作中もタッチイベントを受け取る
Konva.hitOnDragEnabled = true;

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const WHEEL_FACTOR = 1.1;
const RECENTER_DURATION = 0.25;

/** canvas は CSS 変数を参照できないため色を固定値で持つ */
const COLORS = {
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

type Point = { x: number; y: number };

/** ステージの平行移動量と拡大率(ノード座標 → 画面座標の変換) */
export type Viewport = { x: number; y: number; scale: number };

type Props = {
  layout: TreeLayout;
  centerId: string;
  width: number;
  height: number;
  /** 中心ノードを寄せる領域の高さ(下部シートで隠れる分を除く)。省略時は height */
  focusHeight?: number;
  onSelect: (id: string) => void;
  onViewportChange?: (viewport: Viewport) => void;
};

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** point を固定したまま拡大縮小する */
const zoomAt = (stage: Konva.Stage, point: Point, nextScale: number) => {
  const oldScale = stage.scaleX();
  const scale = clamp(nextScale);
  const origin = { x: (point.x - stage.x()) / oldScale, y: (point.y - stage.y()) / oldScale };
  stage.scale({ x: scale, y: scale });
  stage.position({ x: point.x - origin.x * scale, y: point.y - origin.y * scale });
};

const PersonNode = ({ node, onSelect }: { node: LayoutNode; onSelect: (id: string) => void }) => {
  const color = node.sex === "M" || node.sex === "F" ? COLORS.sex[node.sex] : COLORS.sex.other;
  const select = () => onSelect(node.id);
  const setCursor = (event: KonvaEventObject<MouseEvent>, cursor: string) => {
    const container = event.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };
  return (
    <Group
      x={node.x}
      y={node.y}
      onClick={select}
      onTap={select}
      onMouseEnter={(e) => setCursor(e, "pointer")}
      onMouseLeave={(e) => setCursor(e, "")}
    >
      <Rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        cornerRadius={6}
        fill={color.fill}
        stroke={node.isCenter ? COLORS.center : color.stroke}
        strokeWidth={node.isCenter ? 4 : 2}
      />
      <Text
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        padding={8}
        text={node.label}
        fontSize={14}
        fontStyle={node.isCenter ? "bold" : "normal"}
        fill={COLORS.text}
        align="center"
        verticalAlign="middle"
        wrap="none"
        ellipsis
      />
    </Group>
  );
};

export default function TreeCanvas({
  layout,
  centerId,
  width,
  height,
  focusHeight = height,
  onSelect,
  onViewportChange,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const pinch = useRef<{ distance: number; center: Point } | null>(null);
  const notifyRef = useRef(onViewportChange);
  useLayoutEffect(() => {
    notifyRef.current = onViewportChange;
  }, [onViewportChange]);

  const notify = () => {
    const stage = stageRef.current;
    if (stage) notifyRef.current?.({ x: stage.x(), y: stage.y(), scale: stage.scaleX() });
  };

  // 中心ノードを表示領域の中央へ移動する
  useEffect(() => {
    const stage = stageRef.current;
    const center = layout.nodes.find((n) => n.isCenter);
    if (!stage || !center) return;
    const scale = stage.scaleX();
    stage.to({
      x: width / 2 - (center.x + NODE_WIDTH / 2) * scale,
      y: focusHeight / 2 - (center.y + NODE_HEIGHT / 2) * scale,
      duration: RECENTER_DURATION,
      onUpdate: notify,
      onFinish: notify,
    });
  }, [layout, centerId, width, focusHeight]);

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    const factor = event.evt.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
    zoomAt(stage, pointer, stage.scaleX() * factor);
    notify();
  };

  const handleTouchMove = (event: KonvaEventObject<TouchEvent>) => {
    const [first, second] = event.evt.touches;
    const stage = stageRef.current;
    if (!first || !second || !stage) return;
    event.evt.preventDefault();
    if (stage.isDragging()) stage.stopDrag();

    const rect = stage.container().getBoundingClientRect();
    const a = { x: first.clientX - rect.left, y: first.clientY - rect.top };
    const b = { x: second.clientX - rect.left, y: second.clientY - rect.top };
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const previous = pinch.current;
    pinch.current = { distance, center };
    if (!previous) return;

    zoomAt(stage, center, stage.scaleX() * (distance / previous.distance));
    stage.position({ x: stage.x() + center.x - previous.center.x, y: stage.y() + center.y - previous.center.y });
    notify();
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      draggable
      dragDistance={4}
      onWheel={handleWheel}
      onDragMove={notify}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        pinch.current = null;
      }}
      style={{ background: COLORS.background, touchAction: "none" }}
    >
      <Layer>
        {layout.descents.map((line, index) => (
          <Line key={`d${index}`} points={line.points} stroke={COLORS.line} strokeWidth={1.5} />
        ))}
        {/* 二重線: 太い線の上に背景色の細い線を重ねる */}
        {layout.marriages.map((line, index) => (
          <Group key={`m${index}`}>
            <Line points={line.points} stroke={COLORS.line} strokeWidth={6} lineJoin="miter" />
            <Line points={line.points} stroke={COLORS.background} strokeWidth={2} lineJoin="miter" />
          </Group>
        ))}
        {layout.nodes.map((node, index) => (
          // 同一人物が複数位置に現れる(近親婚等)場合があるため index を含める
          <PersonNode key={`${node.id}-${index}`} node={node} onSelect={onSelect} />
        ))}
      </Layer>
    </Stage>
  );
}
