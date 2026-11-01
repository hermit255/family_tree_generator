"use client";

import { availableParentRoles } from "@kakeizu/gedcom";
import { Button } from "@/components/ui/button";
import { NODE_WIDTH, type LayoutNode } from "../layout";
import { useFamilyTreeStore } from "../store";
import type { AddMode } from "./add-person-dialog";
import type { Viewport } from "./tree-canvas";

const MENU_GAP = 8;

/** 中心ノードの右側に重ねて表示する追加メニュー */
export function NodeMenu({
  node,
  viewport,
  onAdd,
}: {
  node: LayoutNode;
  viewport: Viewport;
  onAdd: (mode: AddMode) => void;
}) {
  const tree = useFamilyTreeStore((s) => s.tree);
  if (!tree) return null;
  const canAddParent = availableParentRoles(tree, node.id).length > 0;

  return (
    <nav
      aria-label="人物の追加"
      className="absolute flex flex-col gap-1"
      style={{
        left: viewport.x + (node.x + NODE_WIDTH) * viewport.scale + MENU_GAP,
        top: viewport.y + node.y * viewport.scale,
      }}
    >
      {canAddParent && (
        <Button size="sm" variant="outline" onClick={() => onAdd({ kind: "parent", childId: node.id })}>
          親を追加
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => onAdd({ kind: "spouse", personId: node.id })}>
        配偶者を追加
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd({ kind: "child", parentId: node.id })}>
        子を追加
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAdd({ kind: "adoption", childId: node.id })}>
        養子縁組
      </Button>
    </nav>
  );
}
