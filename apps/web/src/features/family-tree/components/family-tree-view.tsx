"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { computeLayout } from "../layout";
import { useFamilyTreeStore } from "../store";
import { useElementSize } from "../use-element-size";

// Konva はブラウザの canvas を前提とするため SSR しない
const TreeCanvas = dynamic(() => import("./tree-canvas"), { ssr: false });

export function FamilyTreeView() {
  const hydrated = useFamilyTreeStore((s) => s.hydrated);
  const tree = useFamilyTreeStore((s) => s.tree);
  const centerId = useFamilyTreeStore((s) => s.centerId);
  const hydrate = useFamilyTreeStore((s) => s.hydrate);
  const setCenter = useFamilyTreeStore((s) => s.setCenter);

  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const layout = useMemo(() => (tree && centerId ? computeLayout(tree, centerId) : null), [tree, centerId]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" data-testid="family-tree">
      {hydrated && (!layout || layout.nodes.length === 0) && (
        <p className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          家系図のデータがありません
        </p>
      )}
      {size && layout && centerId && layout.nodes.length > 0 && (
        <TreeCanvas
          layout={layout}
          centerId={centerId}
          width={size.width}
          height={size.height}
          onSelect={setCenter}
        />
      )}
    </div>
  );
}
