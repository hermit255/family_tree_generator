import { importGedcom } from "@kakeizu/gedcom";
import { describe, expect, it } from "vitest";
import { computeLayout, displayName, GAP_X, NODE_HEIGHT, NODE_WIDTH, type TreeLayout } from "./layout";

const treeOf = (...body: string[]) =>
  importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR"].join("\n")).tree;

/** "I1 M FAMS:F1 FAMC:F2" 形式で人物を、"F1 HUSB:I1 WIFE:I2 CHIL:I3,I4" 形式で家族を定義する */
const indi = (id: string, sex: string, ...links: string[]) => [
  `0 @${id}@ INDI`,
  `1 NAME ${id}`,
  `1 SEX ${sex}`,
  ...links.map((l) => {
    const [tag, ref] = l.split(":");
    return `1 ${tag} @${ref}@`;
  }),
];
const fam = (id: string, husband?: string, wife?: string, children: string[] = []) => [
  `0 @${id}@ FAM`,
  ...(husband ? [`1 HUSB @${husband}@`] : []),
  ...(wife ? [`1 WIFE @${wife}@`] : []),
  ...children.map((c) => `1 CHIL @${c}@`),
];

const nodeOf = (layout: TreeLayout, id: string) => {
  const node = layout.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`${id} が配置されていません`);
  return node;
};

/** 同じ行(y 範囲が重なる)ノード同士が横に重ならないこと */
const expectNoOverlap = (layout: TreeLayout) => {
  for (const a of layout.nodes) {
    for (const b of layout.nodes) {
      if (a === b) continue;
      const sameRow = a.y < b.y + NODE_HEIGHT && b.y < a.y + NODE_HEIGHT;
      const overlapX = a.x < b.x + NODE_WIDTH && b.x < a.x + NODE_WIDTH;
      expect(sameRow && overlapX, `${a.id} と ${b.id} が重なっています`).toBe(false);
    }
  }
};

/** 線分の端点が node の上端中央に届いていること */
const expectDescentTo = (layout: TreeLayout, id: string) => {
  const node = nodeOf(layout, id);
  const x = node.x + NODE_WIDTH / 2;
  expect(
    layout.descents.some(({ points }) => points.at(-2) === x && points.at(-1) === node.y),
    `${id} への親子線がありません`,
  ).toBe(true);
};

/** 子の上端に届く親子線の、親側の起点(子への縦線 → バス → 親からの縦線をたどる) */
const descentOriginTo = (layout: TreeLayout, id: string) => {
  const node = nodeOf(layout, id);
  const x = node.x + NODE_WIDTH / 2;
  const isVertical = (p: number[]) => p[0] === p[2];
  const drop = layout.descents.find(({ points: p }) => isVertical(p) && p[0] === x && p[3] === node.y);
  const busY = drop?.points[1];
  const bus = layout.descents.find(({ points: p }) => p[1] === busY && p[3] === busY && p[0]! <= x && x <= p[2]!);
  const rise = layout.descents.find(
    ({ points: p }) => isVertical(p) && p[3] === busY && p[1]! < busY! && bus!.points[0]! <= p[0]! && p[0]! <= bus!.points[2]!,
  );
  return rise && { x: rise.points[0]!, y: rise.points[1]! };
};

const ids = (layout: TreeLayout) => layout.nodes.map((n) => n.id).sort();

// 父方祖父母 PGF/PGM、母方祖父母 MGF/MGM、父 F・母 M、兄 B・中心 C・妹 S
// C は先妻 W1(子 K1)、後妻 W2(子 K2)と再婚。K1 は妻 KW を持ち孫 G1、G1 は妻 GW と曾孫 GG
// 叔父 U・いとこ Q、W1 の父 WP、S の夫 SH
const BIG = treeOf(
  ...indi("PGF", "M", "FAMS:FP"),
  ...indi("PGM", "F", "FAMS:FP"),
  ...indi("MGF", "M", "FAMS:FM"),
  ...indi("MGM", "F", "FAMS:FM"),
  ...indi("F", "M", "FAMC:FP", "FAMS:FC"),
  ...indi("U", "M", "FAMC:FP", "FAMS:FU"),
  ...indi("Q", "F", "FAMC:FU"),
  ...indi("M", "F", "FAMC:FM", "FAMS:FC"),
  ...indi("B", "M", "FAMC:FC"),
  ...indi("C", "M", "FAMC:FC", "FAMS:F1", "FAMS:F2"),
  ...indi("S", "F", "FAMC:FC", "FAMS:FS"),
  ...indi("SH", "M", "FAMS:FS"),
  ...indi("WP", "M", "FAMS:FW"),
  ...indi("W1", "F", "FAMC:FW", "FAMS:F1"),
  ...indi("W2", "F", "FAMS:F2"),
  ...indi("K1", "M", "FAMC:F1", "FAMS:FK"),
  ...indi("KW", "F", "FAMS:FK"),
  ...indi("K2", "F", "FAMC:F2"),
  ...indi("G1", "M", "FAMC:FK", "FAMS:FG"),
  ...indi("GW", "F", "FAMS:FG"),
  ...indi("GG", "U", "FAMC:FG"),
  ...fam("FP", "PGF", "PGM", ["F", "U"]),
  ...fam("FM", "MGF", "MGM", ["M"]),
  ...fam("FU", "U", undefined, ["Q"]),
  ...fam("FC", "F", "M", ["B", "C", "S"]),
  ...fam("FS", "SH", "S"),
  ...fam("FW", "WP", undefined, ["W1"]),
  ...fam("F1", "C", "W1", ["K1"]),
  ...fam("F2", "C", "W2", ["K2"]),
  ...fam("FK", "K1", "KW", ["G1"]),
  ...fam("FG", "G1", "GW", ["GG"]),
);

describe("computeLayout", () => {
  describe("家系図全体", () => {
    const layout = computeLayout(BIG, "C");

    it("全員を1回ずつ配置する", () => {
      expect(ids(layout)).toEqual(BIG.individuals.map((i) => i.id).sort());
    });

    it("中心ノードのみ isCenter で、配置は中心に依存しない", () => {
      expect(layout.nodes.filter((n) => n.isCenter).map((n) => n.id)).toEqual(["C"]);
      const other = computeLayout(BIG, "GG");
      const position = ({ id, x, y }: TreeLayout["nodes"][number]) => ({ id, x, y });
      expect(other.nodes.map(position)).toEqual(layout.nodes.map(position));
      expect(other.marriages).toEqual(layout.marriages);
      expect(other.descents).toEqual(layout.descents);
    });

    it("同じ行のノードは重ならない", () => {
      expectNoOverlap(layout);
    });

    it("世代ごとに行が揃い、子は親の1つ下の行に置く", () => {
      for (const node of layout.nodes) {
        expect(node.y).toBe(nodeOf(layout, "C").y + (node.generation - nodeOf(layout, "C").generation) * (NODE_HEIGHT + 72));
      }
      for (const family of BIG.families) {
        for (const child of family.children) {
          for (const parent of [family.husband, family.wife].flatMap((l) => l ?? [])) {
            expect(nodeOf(layout, child.id).generation).toBe(nodeOf(layout, parent.id).generation + 1);
          }
        }
      }
    });

    it("夫婦は夫が右・妻が左", () => {
      for (const family of BIG.families) {
        if (family.husband && family.wife) {
          expect(nodeOf(layout, family.husband.id).x).toBeGreaterThan(nodeOf(layout, family.wife.id).x);
        }
      }
    });

    it("兄弟姉妹は親の家族の子の並び順に横に並ぶ", () => {
      const xs = ["B", "C", "S"].map((id) => nodeOf(layout, id).x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    });

    it("再婚の配偶者は本人の横に婚姻順に並べ、子は各婚姻の下に並べる", () => {
      const [c, w1, w2] = ["C", "W1", "W2"].map((id) => nodeOf(layout, id)) as [typeof layout.nodes[0], typeof layout.nodes[0], typeof layout.nodes[0]];
      expect([w2.y, w1.y]).toEqual([c.y, c.y]);
      expect(w1.x).toBe(c.x - NODE_WIDTH - 40);
      expect(w2.x).toBe(w1.x - NODE_WIDTH - 40);
      expect(nodeOf(layout, "K2").x).toBeLessThan(nodeOf(layout, "K1").x);
      expect(nodeOf(layout, "K1").y).toBe(nodeOf(layout, "K2").y);
    });

    it("1人目の婚姻線は隣同士を結び、2人目以降は間の配偶者を上からまたぐ", () => {
      const c = nodeOf(layout, "C");
      const w1 = nodeOf(layout, "W1");
      const w2 = nodeOf(layout, "W2");
      const lineY = c.y + NODE_HEIGHT / 2;
      expect(layout.marriages).toContainEqual({ points: [w1.x + NODE_WIDTH, lineY, c.x, lineY] });
      const startX = c.x + 16;
      const riseY = c.y - 14;
      expect(layout.marriages).toContainEqual({ points: [startX, c.y, startX, riseY, w2.x + NODE_WIDTH / 2, riseY, w2.x + NODE_WIDTH / 2, c.y] });
      expect(layout.marriages).toHaveLength(BIG.families.filter((f) => f.husband && f.wife).length);
    });

    it("子への線は各婚姻線から引く", () => {
      const c = nodeOf(layout, "C");
      const w1 = nodeOf(layout, "W1");
      const w2 = nodeOf(layout, "W2");
      expect(descentOriginTo(layout, "K1")).toEqual({ x: (w1.x + NODE_WIDTH + c.x) / 2, y: c.y + NODE_HEIGHT / 2 });
      expect(descentOriginTo(layout, "K2")).toEqual({ x: (w2.x + NODE_WIDTH + w1.x) / 2, y: c.y - 14 });
    });

    it("親子線が全ての子に届く", () => {
      for (const family of BIG.families) {
        for (const child of family.children) expectDescentTo(layout, child.id);
      }
    });

    it("配偶者の親は別に配置し、配偶者へ線を引く", () => {
      const wp = nodeOf(layout, "WP");
      expect(wp.generation).toBe(nodeOf(layout, "W1").generation - 1);
      expect(descentOriginTo(layout, "W1")).toEqual({ x: wp.x + NODE_WIDTH / 2, y: wp.y + NODE_HEIGHT });
    });
  });

  it("中心が存在しなければ空", () => {
    expect(computeLayout(BIG, "X")).toEqual({ nodes: [], marriages: [], descents: [] });
  });

  it("1人だけならそのノードのみ", () => {
    const layout = computeLayout(treeOf(...indi("I1", "U")), "I1");
    expect(layout.nodes).toEqual([{ id: "I1", x: 0, y: 0, label: "I1", sex: "U", generation: 0, isCenter: true }]);
    expect(layout.marriages).toEqual([]);
    expect(layout.descents).toEqual([]);
  });

  it("女性の再婚は配偶者を右に並べ、子も右に向かって婚姻順に並べる", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("A", "F", "FAMS:F1", "FAMS:F2"),
        ...indi("H1", "M", "FAMS:F1"),
        ...indi("H2", "M", "FAMS:F2"),
        ...indi("K1", "U", "FAMC:F1"),
        ...indi("K2", "U", "FAMC:F2"),
        ...fam("F1", "H1", "A", ["K1"]),
        ...fam("F2", "H2", "A", ["K2"]),
      ),
      "A",
    );
    const xs = ["A", "H1", "H2"].map((id) => nodeOf(layout, id).x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(nodeOf(layout, "K1").x).toBeLessThan(nodeOf(layout, "K2").x);
    expectNoOverlap(layout);
  });

  it("相手のいない家族の子は本人の下端から線を引き、配偶者と反対側に並べる", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("A", "M", "FAMS:F1", "FAMS:F2"),
        ...indi("W", "F", "FAMS:F1"),
        ...indi("K1", "U", "FAMC:F1"),
        ...indi("K2", "U", "FAMC:F2"),
        ...fam("F1", "A", "W", ["K1"]),
        ...fam("F2", "A", undefined, ["K2"]),
      ),
      "A",
    );
    const a = nodeOf(layout, "A");
    expect(descentOriginTo(layout, "K2")).toEqual({ x: a.x + NODE_WIDTH / 2, y: a.y + NODE_HEIGHT });
    expect(nodeOf(layout, "K2").x).toBeGreaterThan(nodeOf(layout, "K1").x);
  });

  it("片親の親は1ノードで、その下端から線を引く", () => {
    const layout = computeLayout(treeOf(...indi("P", "M", "FAMS:F1"), ...indi("C", "U", "FAMC:F1"), ...fam("F1", "P", undefined, ["C"])), "C");
    expect(ids(layout)).toEqual(["C", "P"]);
    expectDescentTo(layout, "C");
  });

  it("親のいない親の家族は兄弟を横に並べ、線を引かない", () => {
    const layout = computeLayout(treeOf(...indi("A", "M", "FAMC:F1"), ...indi("B", "F", "FAMC:F1"), ...fam("F1", undefined, undefined, ["A", "B"])), "B");
    expect(layout.nodes.map((n) => n.id)).toEqual(["A", "B"]);
    expect(nodeOf(layout, "A").y).toBe(nodeOf(layout, "B").y);
    expect(layout.descents).toEqual([]);
  });

  it("つながりの無い人物は右に並べる", () => {
    const layout = computeLayout(
      treeOf(...indi("A", "M", "FAMS:F1"), ...indi("B", "F", "FAMS:F1"), ...fam("F1", "A", "B"), ...indi("Z", "U")),
      "Z",
    );
    expect(nodeOf(layout, "Z").x).toBe(nodeOf(layout, "A").x + NODE_WIDTH + GAP_X);
  });

  it("配偶者の別の配偶者は、その配偶者の横に置いて婚姻線で結ぶ", () => {
    // A の妻 W は前夫 X との間に子 K がいる
    const layout = computeLayout(
      treeOf(
        ...indi("A", "M", "FAMS:F1"),
        ...indi("W", "F", "FAMS:F1", "FAMS:F2"),
        ...indi("X", "M", "FAMS:F2"),
        ...indi("K", "U", "FAMC:F2"),
        ...fam("F1", "A", "W"),
        ...fam("F2", "X", "W", ["K"]),
      ),
      "A",
    );
    expectNoOverlap(layout);
    const w = nodeOf(layout, "W");
    const x = nodeOf(layout, "X");
    expect(x.y).toBe(w.y);
    expect(layout.marriages).toHaveLength(2);
    const [left, right] = [w, x].sort((a, b) => a.x - b.x) as [typeof w, typeof w];
    expect(layout.marriages).toContainEqual({ points: [left.x + NODE_WIDTH, w.y + NODE_HEIGHT / 2, right.x, w.y + NODE_HEIGHT / 2] });
    expectDescentTo(layout, "K");
  });

  it("配偶者として並べた人の、相手のいない家族の子は兄弟を並べて親から線を引く", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("A", "M", "FAMS:F1"),
        ...indi("W", "F", "FAMS:F1", "FAMS:F2"),
        ...indi("K1", "U", "FAMC:F2"),
        ...indi("K2", "U", "FAMC:F2"),
        ...fam("F1", "A", "W"),
        ...fam("F2", undefined, "W", ["K1", "K2"]),
      ),
      "A",
    );
    const w = nodeOf(layout, "W");
    for (const id of ["K1", "K2"]) {
      expect(descentOriginTo(layout, id)).toEqual({ x: w.x + NODE_WIDTH / 2, y: w.y + NODE_HEIGHT });
      expect(nodeOf(layout, id).generation).toBe(w.generation + 1);
    }
    expect(nodeOf(layout, "K2").x).toBe(nodeOf(layout, "K1").x + NODE_WIDTH + GAP_X);
  });

  it("夫の別の妻は、夫の左に置いて婚姻線で結ぶ", () => {
    // A の夫 H は前妻 X との間に子 K がいる
    const layout = computeLayout(
      treeOf(
        ...indi("A", "F", "FAMS:F1"),
        ...indi("H", "M", "FAMS:F1", "FAMS:F2"),
        ...indi("X", "F", "FAMS:F2"),
        ...indi("K", "U", "FAMC:F2"),
        ...fam("F1", "H", "A"),
        ...fam("F2", "H", "X", ["K"]),
      ),
      "A",
    );
    expectNoOverlap(layout);
    expect(nodeOf(layout, "X").x).toBeLessThan(nodeOf(layout, "H").x);
    expect(layout.marriages).toHaveLength(2);
    expectDescentTo(layout, "K");
  });

  it("いとこ婚は同じブロック内の相手と婚姻線で結ぶ", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("GF", "M", "FAMS:FG"),
        ...indi("P1", "M", "FAMC:FG", "FAMS:F1"),
        ...indi("P2", "F", "FAMC:FG", "FAMS:F2"),
        ...indi("H", "M", "FAMC:F1", "FAMS:F3"),
        ...indi("W", "F", "FAMC:F2", "FAMS:F3"),
        ...indi("K", "U", "FAMC:F3"),
        ...fam("FG", "GF", undefined, ["P1", "P2"]),
        ...fam("F1", "P1", undefined, ["H"]),
        ...fam("F2", undefined, "P2", ["W"]),
        ...fam("F3", "H", "W", ["K"]),
      ),
      "GF",
    );
    expect(ids(layout)).toEqual(["GF", "H", "K", "P1", "P2", "W"]);
    expectNoOverlap(layout);
    expect(layout.marriages).toHaveLength(1);
    for (const id of ["P1", "P2", "H", "W", "K"]) expectDescentTo(layout, id);
  });

  it("兄弟が別の家族の子として配置済みなら、その兄弟は並べ直さない", () => {
    // K2 は A・W の子でもある
    const layout = computeLayout(
      treeOf(
        ...indi("A", "M", "FAMS:F1"),
        ...indi("W", "F", "FAMS:F1", "FAMS:F2"),
        ...indi("K1", "U", "FAMC:F2"),
        ...indi("K2", "U", "FAMC:F1", "FAMC:F2"),
        ...fam("F1", "A", "W", ["K2"]),
        ...fam("F2", undefined, "W", ["K1", "K2"]),
      ),
      "A",
    );
    expect(ids(layout)).toEqual(["A", "K1", "K2", "W"]);
    expectNoOverlap(layout);
    expectDescentTo(layout, "K1");
    expectDescentTo(layout, "K2");
  });

  it("兄弟の両方と結婚した人物は、後の婚姻を婚姻線で結ぶ", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("R", "M", "FAMS:FR"),
        ...indi("C1", "M", "FAMC:FR", "FAMS:F1"),
        ...indi("C2", "M", "FAMC:FR", "FAMS:F2"),
        ...indi("S", "F", "FAMS:F1", "FAMS:F2"),
        ...fam("FR", "R", undefined, ["C1", "C2"]),
        ...fam("F1", "C1", "S"),
        ...fam("F2", "C2", "S"),
      ),
      "R",
    );
    expect(ids(layout)).toEqual(["C1", "C2", "R", "S"]);
    expectNoOverlap(layout);
    expect(layout.marriages).toHaveLength(2);
  });

  it("同じ家族への重複したリンクは1回だけ扱う", () => {
    const tree = treeOf(...indi("A", "M", "FAMS:F1"), ...indi("B", "F", "FAMS:F1"), ...fam("F1", "A", "B"));
    tree.individuals[0]!.familiesAsSpouse.push({ id: "F1", extras: [] });
    const layout = computeLayout(tree, "A");
    expect(ids(layout)).toEqual(["A", "B"]);
    expect(layout.marriages).toHaveLength(1);
  });

  it("別々の人の配偶者同士の子は、両親の間から線を引き両親を婚姻線で結ぶ", () => {
    // H は P の妻の兄弟… ではなく、H・W ともに別の人物の配偶者として並び、H と W の間に子 K がいる
    const layout = computeLayout(
      treeOf(
        ...indi("P", "F", "FAMS:F1"),
        ...indi("H", "M", "FAMS:F1", "FAMS:F3"),
        ...indi("Q", "M", "FAMS:F2"),
        ...indi("W", "F", "FAMS:F2", "FAMS:F3"),
        ...indi("K", "U", "FAMC:F3"),
        ...fam("F1", "H", "P"),
        ...fam("F2", "Q", "W"),
        ...fam("F3", "H", "W", ["K"]),
      ),
      "P",
    );
    expectNoOverlap(layout);
    expectDescentTo(layout, "K");
    expect(layout.marriages).toHaveLength(3);
  });

  it("循環した親子関係でも全員を配置する", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("A", "M", "FAMC:F2", "FAMS:F1"),
        ...indi("B", "M", "FAMC:F1", "FAMS:F2"),
        ...fam("F1", "A", undefined, ["B"]),
        ...fam("F2", "B", undefined, ["A"]),
      ),
      "A",
    );
    expect(ids(layout)).toEqual(["A", "B"]);
  });

  it("自分自身との婚姻は線を引かない", () => {
    const tree = treeOf(...indi("A", "M", "FAMS:F1"), ...fam("F1", "A"));
    tree.families[0]!.wife = { id: "A", extras: [] };
    const layout = computeLayout(tree, "A");
    expect(ids(layout)).toEqual(["A"]);
    expect(layout.marriages).toEqual([]);
  });

  it("参照先が欠けたリンクは無視する", () => {
    const tree = treeOf(...indi("A", "M"));
    tree.individuals[0]!.familiesAsSpouse.push({ id: "F9", extras: [] });
    tree.families.push({ id: "F8", husband: { id: "A", extras: [] }, children: [{ id: "X9", extras: [] }], extras: [] });
    tree.individuals[0]!.familiesAsSpouse.push({ id: "F8", extras: [] });
    expect(computeLayout(tree, "A").nodes.map((n) => n.id)).toEqual(["A"]);
  });
});

describe("displayName", () => {
  it.each([
    [{ surname: "山田", givenName: "太郎" }, "山田 太郎"],
    [{ surname: "", givenName: "太郎" }, "太郎"],
    [{ surname: "", givenName: "" }, "名前未設定"],
  ])("%o → %s", (name, expected) => {
    expect(displayName({ ...treeOf(...indi("A", "U")).individuals[0]!, ...name })).toBe(expected);
  });
});

it("配偶者が1人なら子への線は婚姻線の中点から真下に下りる", () => {
  const layout = computeLayout(
    treeOf(...indi("A", "M", "FAMS:F1"), ...indi("B", "F", "FAMS:F1"), ...indi("K", "U", "FAMC:F1"), ...fam("F1", "A", "B", ["K"])),
    "A",
  );
  const a = nodeOf(layout, "A");
  const k = nodeOf(layout, "K");
  const middle = (nodeOf(layout, "B").x + NODE_WIDTH + a.x) / 2;
  expect(layout.descents[0]!.points[0]).toBe(middle);
  expect(k.x + NODE_WIDTH / 2).toBe(middle);
});
