import { importGedcom } from "@kakeizu/gedcom";
import { describe, expect, it } from "vitest";
import { computeLayout, displayName, GAP_X, NODE_HEIGHT, NODE_WIDTH, STACK_GAP, type TreeLayout } from "./layout";

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

// 父方祖父母 PGF/PGM、母方祖父母 MGF/MGM、父 F・母 M、兄 B・中心 C・妹 S
// C は先妻 W1(子 K1)、後妻 W2(子 K2)と再婚。K1 は妻 KW を持ち孫 G1
// 範囲外: 叔父 U、いとこ Q、W1 の親 WP、S の夫 SH、G1 の妻 GW、曾孫 GG
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
  describe("表示範囲(直系+兄弟+配偶者、上下2世代)", () => {
    const layout = computeLayout(BIG, "C");

    it("範囲内の人物のみを世代付きで配置する", () => {
      expect(Object.fromEntries(layout.nodes.map((n) => [n.id, n.generation]))).toEqual({
        PGF: -2,
        PGM: -2,
        MGF: -2,
        MGM: -2,
        F: -1,
        M: -1,
        B: 0,
        C: 0,
        S: 0,
        W1: 0,
        W2: 0,
        K1: 1,
        KW: 1,
        K2: 1,
        G1: 2,
      });
    });

    it("中心ノードのみ isCenter", () => {
      expect(layout.nodes.filter((n) => n.isCenter).map((n) => n.id)).toEqual(["C"]);
    });

    it("同じ行のノードは重ならない", () => {
      expectNoOverlap(layout);
    });

    it("世代ごとに行が揃い、世代が下るほど下に配置される", () => {
      const rowY = (generation: number) => [
        ...new Set(layout.nodes.filter((n) => n.generation === generation && !["W2"].includes(n.id)).map((n) => n.y)),
      ];
      const rows = [-2, -1, 0, 1, 2].map(rowY);
      expect(rows.every((ys) => ys.length === 1)).toBe(true);
      const tops = rows.map((ys) => ys[0]!);
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    });

    it("夫婦は夫が右・妻が左", () => {
      for (const [husband, wife] of [
        ["PGF", "PGM"],
        ["MGF", "MGM"],
        ["F", "M"],
        ["C", "W1"],
        ["K1", "KW"],
      ]) {
        expect(nodeOf(layout, husband!).x).toBeGreaterThan(nodeOf(layout, wife!).x);
      }
    });

    it("祖父母は父方が父の上、母方が母の上に寄り、互いに重ならない", () => {
      const maternalRight = nodeOf(layout, "MGF").x + NODE_WIDTH;
      expect(maternalRight + GAP_X).toBeLessThanOrEqual(nodeOf(layout, "PGM").x);
      expect(nodeOf(layout, "MGM").x).toBeLessThan(nodeOf(layout, "M").x + NODE_WIDTH);
      expect(nodeOf(layout, "PGF").x + NODE_WIDTH).toBeGreaterThan(nodeOf(layout, "F").x);
    });

    it("兄弟姉妹は親の家族の子の並び順に横に並ぶ", () => {
      const xs = ["B", "C", "S"].map((id) => nodeOf(layout, id).x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    });

    it("再婚の配偶者は本人の横に上下に連ね、子の行は揃える", () => {
      const c = nodeOf(layout, "C");
      const w1 = nodeOf(layout, "W1");
      const w2 = nodeOf(layout, "W2");
      expect(w1.x).toBe(w2.x);
      expect(w1.x).toBeLessThan(c.x);
      expect([w1.y, w2.y]).toEqual([c.y, c.y + NODE_HEIGHT + STACK_GAP]);
      expect(nodeOf(layout, "K1").y).toBe(nodeOf(layout, "K2").y);
      expect(nodeOf(layout, "K1").y).toBeGreaterThan(w2.y + NODE_HEIGHT);
    });

    it("婚姻線は本人と各配偶者を結ぶ", () => {
      const c = nodeOf(layout, "C");
      const w2 = nodeOf(layout, "W2");
      expect(layout.marriages).toContainEqual({
        points: [c.x, c.y + NODE_HEIGHT / 2, c.x - 8, c.y + NODE_HEIGHT / 2, c.x - 8, w2.y + NODE_HEIGHT / 2, w2.x + NODE_WIDTH, w2.y + NODE_HEIGHT / 2],
      });
      expect(layout.marriages).toHaveLength(6);
    });

    it("親子線が各世代の子に届く", () => {
      for (const id of ["F", "M", "B", "C", "S", "K1", "K2", "G1"]) {
        expectDescentTo(layout, id);
      }
    });
  });

  it("中心が存在しなければ空", () => {
    expect(computeLayout(BIG, "X")).toEqual({ nodes: [], marriages: [], descents: [] });
  });

  it("1人だけなら中心ノードのみ", () => {
    const layout = computeLayout(treeOf(...indi("I1", "U")), "I1");
    expect(layout.nodes).toEqual([
      { id: "I1", x: 0, y: expect.any(Number), label: "I1", sex: "U", generation: 0, isCenter: true },
    ]);
    expect(layout.marriages).toEqual([]);
    expect(layout.descents).toEqual([]);
  });

  it("女性の中心は配偶者を右に置く", () => {
    const layout = computeLayout(treeOf(...indi("A", "M", "FAMS:F1"), ...indi("B", "F", "FAMS:F1"), ...fam("F1", "A", "B")), "B");
    expect(nodeOf(layout, "A").x).toBeGreaterThan(nodeOf(layout, "B").x);
  });

  it("相手のいない家族の子は本人の下端から線を引く", () => {
    const layout = computeLayout(treeOf(...indi("A", "F", "FAMS:F1"), ...indi("K", "M", "FAMC:F1"), ...fam("F1", undefined, "A", ["K"])), "A");
    const a = nodeOf(layout, "A");
    expect(layout.descents[0]!.points.slice(0, 2)).toEqual([a.x + NODE_WIDTH / 2, a.y + NODE_HEIGHT]);
    expectDescentTo(layout, "K");
  });

  it("片親の親は1ノードで、その下端から線を引く", () => {
    const layout = computeLayout(treeOf(...indi("P", "M", "FAMS:F1"), ...indi("C", "U", "FAMC:F1"), ...fam("F1", "P", undefined, ["C"])), "C");
    expect(layout.nodes.map((n) => n.id)).toEqual(["C", "P"]);
    expectDescentTo(layout, "C");
  });

  it("親のいない親の家族は兄弟のみ並べ、線を引かない", () => {
    const layout = computeLayout(treeOf(...indi("A", "M", "FAMC:F1"), ...indi("B", "F", "FAMC:F1"), ...fam("F1", undefined, undefined, ["A", "B"])), "B");
    expect(layout.nodes.map((n) => n.id)).toEqual(["A", "B"]);
    expect(layout.descents).toEqual([]);
  });

  it("祖父母が片側のみ・片親のみでも配置する", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("GF", "M", "FAMS:FG"),
        ...indi("F", "M", "FAMC:FG", "FAMS:FC"),
        ...indi("M", "F", "FAMS:FC"),
        ...indi("C", "U", "FAMC:FC"),
        ...fam("FG", "GF", undefined, ["F"]),
        ...fam("FC", "F", "M", ["C"]),
      ),
      "C",
    );
    expect(nodeOf(layout, "GF").generation).toBe(-2);
    expectDescentTo(layout, "F");
    expectNoOverlap(layout);
  });

  it("祖父母の家族に祖父母がいなければ祖父母の行は空", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("F", "M", "FAMC:FG", "FAMS:FC"),
        ...indi("C", "U", "FAMC:FC"),
        ...fam("FG", undefined, undefined, ["F"]),
        ...fam("FC", "F", undefined, ["C"]),
      ),
      "C",
    );
    expect(layout.nodes.map((n) => n.id)).toEqual(["C", "F"]);
  });

  it("祖父母が両側とも片親なら重ならず押し広げない", () => {
    const layout = computeLayout(
      treeOf(
        ...indi("PG", "M", "FAMS:FP"),
        ...indi("MG", "F", "FAMS:FM"),
        ...indi("F", "M", "FAMC:FP", "FAMS:FC"),
        ...indi("M", "F", "FAMC:FM", "FAMS:FC"),
        ...indi("C", "U", "FAMC:FC"),
        ...fam("FP", "PG", undefined, ["F"]),
        ...fam("FM", undefined, "MG", ["M"]),
        ...fam("FC", "F", "M", ["C"]),
      ),
      "C",
    );
    expect(nodeOf(layout, "PG").x).toBe(nodeOf(layout, "F").x);
    expect(nodeOf(layout, "MG").x).toBe(nodeOf(layout, "M").x);
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
