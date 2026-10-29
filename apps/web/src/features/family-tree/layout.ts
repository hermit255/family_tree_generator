import type { Family, FamilyTree, Individual, Sex } from "@kakeizu/gedcom";

export const NODE_WIDTH = 132;
export const NODE_HEIGHT = 48;
/** 横に並ぶノード間の間隔 */
export const GAP_X = 24;
/** 再婚時に上下に連ねる配偶者間の間隔 */
export const STACK_GAP = 16;
/** 世代の行間(親子線のバスを通す領域) */
export const GENERATION_GAP = 72;
/** 夫婦間の間隔。配偶者が1人増えるごとに STEP ずつ広げ、各婚姻の子への線を分ける */
const MARRIAGE_GAP_BASE = 40;
const MARRIAGE_GAP_STEP = 18;
/** 婚姻線の縦部分を本人の端からどれだけ離すか */
const CONNECTOR_OFFSET = 8;
/** 同じ人物の複数の婚姻の子への横線(バス)をずらす量 */
const BUS_STEP = 8;

/** 中心からの世代差。祖父母 -2 〜 孫 +2 */
type Generation = -2 | -1 | 0 | 1 | 2;
const GENERATIONS: Generation[] = [-2, -1, 0, 1, 2];

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  sex?: Sex;
  generation: Generation;
  isCenter: boolean;
};

/** Konva の Line に渡す [x1, y1, x2, y2, ...] */
export type LayoutLine = { points: number[] };

export type TreeLayout = {
  nodes: LayoutNode[];
  /** 婚姻線(二重線で描画する) */
  marriages: LayoutLine[];
  /** 親子線 */
  descents: LayoutLine[];
};

type Point = { x: number; y: number };

export const displayName = (individual: Individual): string =>
  [individual.surname, individual.givenName].filter(Boolean).join(" ") || "名前未設定";

const marriageGap = (spouseCount: number): number => MARRIAGE_GAP_BASE + MARRIAGE_GAP_STEP * (spouseCount - 1);

const coupleWidth = (spouseCount: number): number =>
  spouseCount === 0 ? NODE_WIDTH : NODE_WIDTH * 2 + marriageGap(spouseCount);

/** レイアウト計算中の参照・出力をまとめたもの */
class LayoutBuilder {
  readonly nodes: LayoutNode[] = [];
  readonly marriages: LayoutLine[] = [];
  readonly descents: LayoutLine[] = [];
  private readonly individuals: Map<string, Individual>;
  private readonly families: Map<string, Family>;
  private readonly rowTops = new Map<Generation, number>();

  constructor(
    tree: FamilyTree,
    private readonly centerId: string,
  ) {
    this.individuals = new Map(tree.individuals.map((i) => [i.id, i]));
    this.families = new Map(tree.families.map((f) => [f.id, f]));
  }

  result(): TreeLayout {
    return { nodes: this.nodes, marriages: this.marriages, descents: this.descents };
  }

  individual(id: string | undefined): Individual | undefined {
    return id === undefined ? undefined : this.individuals.get(id);
  }

  parentFamily(individual: Individual | undefined): Family | undefined {
    const famc = individual?.familiesAsChild[0];
    return famc && this.families.get(famc.id);
  }

  /** 配偶者として属する家族と、その家族での相手(表示対象外なら undefined) */
  marriagesOf(individual: Individual): { family: Family; partner?: Individual }[] {
    return individual.familiesAsSpouse.flatMap((link) => {
      const family = this.families.get(link.id);
      if (!family) return [];
      const partnerId = family.husband?.id === individual.id ? family.wife?.id : family.husband?.id;
      return [{ family, partner: this.individual(partnerId) }];
    });
  }

  childrenOf(family: Family): Individual[] {
    return family.children.flatMap((link) => this.individual(link.id) ?? []);
  }

  /** 世代ごとの行の上端を決める。再婚で配偶者を連ねる行はその分高くする */
  computeRows(stackByGeneration: Map<Generation, number>): void {
    let top = 0;
    for (const generation of GENERATIONS) {
      this.rowTops.set(generation, top);
      const stack = stackByGeneration.get(generation) ?? 1;
      top += stack * NODE_HEIGHT + (stack - 1) * STACK_GAP + GENERATION_GAP;
    }
  }

  rowTop(generation: Generation): number {
    return this.rowTops.get(generation)!;
  }

  addNode(individual: Individual, x: number, y: number, generation: Generation): LayoutNode {
    const node: LayoutNode = {
      id: individual.id,
      x,
      y,
      label: displayName(individual),
      sex: individual.sex,
      generation,
      isCenter: individual.id === this.centerId,
    };
    this.nodes.push(node);
    return node;
  }

  /** 親(anchor)から子の上端へ、行間のバスを経由する直角の線を引く */
  addDescent(anchor: Point, children: LayoutNode[], busOffset = 0): void {
    if (children.length === 0) return;
    const busY = children[0]!.y - GENERATION_GAP / 2 + busOffset;
    const xs = children.map(centerX);
    const left = Math.min(anchor.x, ...xs);
    const right = Math.max(anchor.x, ...xs);
    this.descents.push({ points: [anchor.x, anchor.y, anchor.x, busY] });
    this.descents.push({ points: [left, busY, right, busY] });
    for (const x of xs) {
      this.descents.push({ points: [x, busY, x, children[0]!.y] });
    }
  }

  /**
   * 夫婦(または片親)を配置し、子への線の起点を返す。夫婦とも不在なら undefined。
   * 祖父母・父母の行で使う(相手は1人のみ)。妻が左・夫が右
   */
  placeCouple(
    family: Family,
    centerXOfBlock: number,
    generation: Generation,
  ): { nodes: LayoutNode[]; anchor: Point } | undefined {
    const husband = this.individual(family.husband?.id);
    const wife = this.individual(family.wife?.id);
    const y = this.rowTop(generation);
    if (husband && wife) {
      const left = centerXOfBlock - coupleWidth(1) / 2;
      const wifeNode = this.addNode(wife, left, y, generation);
      const husbandNode = this.addNode(husband, left + NODE_WIDTH + marriageGap(1), y, generation);
      const lineY = y + NODE_HEIGHT / 2;
      this.marriages.push({ points: [wifeNode.x + NODE_WIDTH, lineY, husbandNode.x, lineY] });
      return { nodes: [wifeNode, husbandNode], anchor: { x: centerXOfBlock, y: lineY } };
    }
    const single = husband ?? wife;
    if (!single) return undefined;
    const node = this.addNode(single, centerXOfBlock - NODE_WIDTH / 2, y, generation);
    return { nodes: [node], anchor: { x: centerXOfBlock, y: y + NODE_HEIGHT } };
  }

  /** 子孫側(中心・子・孫)で配偶者を表示するか */
  static showsSpouses(generation: Generation): boolean {
    return generation < 2;
  }

  /** 子孫側の人物を起点としたサブツリーの幅 */
  measure(individual: Individual, generation: Generation): number {
    if (!LayoutBuilder.showsSpouses(generation)) return NODE_WIDTH;
    const marriages = this.marriagesOf(individual);
    const spouseCount = marriages.filter((m) => m.partner).length;
    const children = marriages.flatMap((m) => this.childrenOf(m.family));
    const childrenWidth = children.reduce(
      (sum, child, index) => sum + this.measure(child, (generation + 1) as Generation) + (index > 0 ? GAP_X : 0),
      0,
    );
    return Math.max(coupleWidth(spouseCount), childrenWidth);
  }

  /** 子孫側の人物・配偶者・子孫を left から配置し、本人のノードを返す */
  placeDescendants(individual: Individual, generation: Generation, left: number): LayoutNode {
    const width = this.measure(individual, generation);
    const y = this.rowTop(generation);
    if (!LayoutBuilder.showsSpouses(generation)) {
      return this.addNode(individual, left, y, generation);
    }

    const marriages = this.marriagesOf(individual);
    const partners = marriages.filter((m) => m.partner);
    const blockWidth = coupleWidth(partners.length);
    const blockLeft = left + (width - blockWidth) / 2;
    // 本人が HUSB なら配偶者は左、それ以外は右(夫が右・妻が左)
    const spousesOnLeft = partners.length > 0 && marriages[0]!.family.husband?.id === individual.id;
    const gap = marriageGap(partners.length);
    const personX = spousesOnLeft ? blockLeft + NODE_WIDTH + gap : blockLeft;
    const spouseX = spousesOnLeft ? blockLeft : blockLeft + NODE_WIDTH + gap;
    const person = this.addNode(individual, personX, y, generation);

    // 配偶者側への向き(+1: 右, -1: 左)と、縦の婚姻線の x
    const direction = spousesOnLeft ? -1 : 1;
    const personEdge = spousesOnLeft ? personX : personX + NODE_WIDTH;
    const spouseEdge = spousesOnLeft ? spouseX + NODE_WIDTH : spouseX;
    const connectorX = personEdge + direction * CONNECTOR_OFFSET;
    const personLineY = y + NODE_HEIGHT / 2;

    const anchors = new Map<Family, Point>();
    partners.forEach(({ family, partner }, index) => {
      const spouseY = y + index * (NODE_HEIGHT + STACK_GAP);
      this.addNode(partner!, spouseX, spouseY, generation);
      const lineY = spouseY + NODE_HEIGHT / 2;
      this.marriages.push({
        points: [personEdge, personLineY, connectorX, personLineY, connectorX, lineY, spouseEdge, lineY],
      });
      // 子への線の起点は夫婦間の中点を基準に婚姻ごとに振り分ける(1人なら中点)
      const spread = (index - (partners.length - 1) / 2) * MARRIAGE_GAP_STEP;
      anchors.set(family, { x: personEdge + direction * (gap / 2 + spread), y: lineY });
    });

    const childGeneration = (generation + 1) as Generation;
    const children = marriages.flatMap((m) => this.childrenOf(m.family));
    const childrenWidth = children.reduce(
      (sum, child, index) => sum + this.measure(child, childGeneration) + (index > 0 ? GAP_X : 0),
      0,
    );
    let childLeft = left + (width - childrenWidth) / 2;
    marriages.forEach(({ family }, index) => {
      const childNodes = this.childrenOf(family).map((child) => {
        const node = this.placeDescendants(child, childGeneration, childLeft);
        childLeft += this.measure(child, childGeneration) + GAP_X;
        return node;
      });
      // 相手のいない家族は本人の下端から線を引く
      const anchor = anchors.get(family) ?? { x: centerX(person), y: y + NODE_HEIGHT };
      this.addDescent(anchor, childNodes, index * BUS_STEP);
    });
    return person;
  }
}

const centerX = (node: LayoutNode): number => node.x + NODE_WIDTH / 2;

/** 子孫側の行で、再婚により上下に連ねる配偶者の最大数 */
const maxSpouses = (builder: LayoutBuilder, individuals: Individual[]): number =>
  Math.max(1, ...individuals.map((i) => builder.marriagesOf(i).filter((m) => m.partner).length));

/**
 * 中心人物から上下2世代の家系図レイアウトを計算する。
 * 座標は中心人物の位置に依存しない任意の原点(描画側で中心ノードを画面中央に寄せる)
 */
export const computeLayout = (tree: FamilyTree, centerId: string): TreeLayout => {
  const builder = new LayoutBuilder(tree, centerId);
  const center = builder.individual(centerId);
  if (!center) return { nodes: [], marriages: [], descents: [] };

  const parents = builder.parentFamily(center);
  const children = builder.marriagesOf(center).flatMap((m) => builder.childrenOf(m.family));
  builder.computeRows(
    new Map([
      [0, maxSpouses(builder, [center])],
      [1, maxSpouses(builder, children)],
    ]),
  );

  // 中心の世代: 兄弟姉妹(親の家族の子の並び順)の中に中心のサブツリーを置く
  const siblings = parents ? builder.childrenOf(parents) : [center];
  let left = 0;
  const generationZero = siblings.map((sibling) => {
    if (sibling.id === centerId) {
      const node = builder.placeDescendants(sibling, 0, left);
      left += builder.measure(sibling, 0) + GAP_X;
      return node;
    }
    const node = builder.addNode(sibling, left, builder.rowTop(0), 0);
    left += NODE_WIDTH + GAP_X;
    return node;
  });
  if (!parents) return builder.result();

  // 父母: 兄弟姉妹の並びの中央に置く
  const siblingCenters = generationZero.map(centerX);
  const parentsCenter = (Math.min(...siblingCenters) + Math.max(...siblingCenters)) / 2;
  const parentRow = builder.placeCouple(parents, parentsCenter, -1);
  if (!parentRow) return builder.result();
  builder.addDescent(parentRow.anchor, generationZero);

  // 祖父母: 母方は母の上、父方は父の上に置き、重なる場合は左右に押し広げる
  const sides = [builder.individual(parents.wife?.id), builder.individual(parents.husband?.id)].flatMap((parent) => {
    const family = builder.parentFamily(parent);
    const node = parentRow.nodes.find((n) => n.id === parent?.id);
    return family && node ? [{ family, node, center: centerX(node) }] : [];
  });
  if (sides.length === 2) {
    const [maternal, paternal] = sides as [(typeof sides)[0], (typeof sides)[0]];
    const width = (side: typeof maternal) =>
      side.family.husband && side.family.wife ? coupleWidth(1) : NODE_WIDTH;
    const overlap = maternal.center + width(maternal) / 2 + GAP_X - (paternal.center - width(paternal) / 2);
    if (overlap > 0) {
      maternal.center -= overlap / 2;
      paternal.center += overlap / 2;
    }
  }
  for (const side of sides) {
    const grandparents = builder.placeCouple(side.family, side.center, -2);
    if (grandparents) builder.addDescent(grandparents.anchor, [side.node]);
  }

  return builder.result();
};
