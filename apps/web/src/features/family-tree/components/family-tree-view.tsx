"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeLayout } from "../layout";
import { useFamilyTreeStore } from "../store";
import { useElementSize } from "../use-element-size";
import type { AddMode } from "./add-person-dialog";
import { NodeMenu } from "./node-menu";
import type { Viewport } from "./tree-canvas";

// Konva はブラウザの canvas を前提とするため SSR しない
const TreeCanvas = dynamic(() => import("./tree-canvas"), { ssr: false });

type Props = {
  /** 中心ノードを寄せる領域の高さの割合(下部シート表示中は上半分に寄せる) */
  focusRatio: number;
  onAdd: (mode: AddMode) => void;
};

export function FamilyTreeView({ focusRatio, onAdd }: Props) {
  const hydrated = useFamilyTreeStore((s) => s.hydrated);
  const tree = useFamilyTreeStore((s) => s.tree);
  const centerId = useFamilyTreeStore((s) => s.centerId);
  const detailOpen = useFamilyTreeStore((s) => s.detailOpen);
  const select = useFamilyTreeStore((s) => s.select);

  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const [viewport, setViewport] = useState<Viewport | null>(null);

  const layout = useMemo(() => (tree && centerId ? computeLayout(tree, centerId) : null), [tree, centerId]);
  const center = layout?.nodes.find((n) => n.isCenter);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" data-testid="family-tree">
      {hydrated && tree?.individuals.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">家系図のデータがありません</p>
          <Button onClick={() => onAdd({ kind: "first" })}>最初の人物を追加</Button>
        </div>
      )}
      {size && layout && centerId && center && (
        <TreeCanvas
          layout={layout}
          centerId={centerId}
          width={size.width}
          height={size.height}
          focusHeight={size.height * focusRatio}
          onSelect={select}
          onViewportChange={setViewport}
        />
      )}
      {detailOpen && center && viewport && <NodeMenu node={center} viewport={viewport} onAdd={onAdd} />}
    </div>
  );
}
