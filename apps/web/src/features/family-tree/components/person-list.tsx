"use client";

import type { LayoutNode } from "../layout";

/**
 * canvas に描いた人物をスクリーンリーダー・キーボードから選べるようにする一覧(画面上は非表示)。
 * 同じ人物が複数位置に現れる場合は1つにまとめ、上の世代から左→右の順に並べる
 */
export function PersonList({ nodes, onSelect }: { nodes: LayoutNode[]; onSelect: (id: string) => void }) {
  const people = [...new Map(nodes.map((node) => [node.id, node])).values()].sort((a, b) => a.y - b.y || a.x - b.x);
  return (
    <nav aria-label="表示中の人物" className="sr-only">
      <ul>
        {people.map((node) => (
          <li key={node.id}>
            <button type="button" aria-current={node.isCenter || undefined} onClick={() => onSelect(node.id)}>
              {node.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
