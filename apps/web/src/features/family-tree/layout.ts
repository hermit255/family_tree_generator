import { findRootId, type Family, type FamilyTree, type Individual, type Sex } from "@kakeizu/gedcom";

export const NODE_WIDTH = 132;
export const NODE_HEIGHT = 48;
/** 横に並ぶノード間の間隔 */
export const GAP_X = 24;
/** 世代の行間(親子線のバスを通す領域) */
export const GENERATION_GAP = 72;
/** 夫婦間・再婚で横に並べる配偶者間の間隔(各婚姻の子への線を通す) */
export const MARRIAGE_GAP = 40;
/** 2人目以降の配偶者への婚姻線を、ノードの上端からどれだけ上に通すか */
const REMARRIAGE_RISE = 14;
/** 2人目以降の婚姻線同士の間隔 */
const REMARRIAGE_STEP = 12;
/** 2人目の婚姻線の起点を本人の端からどれだけ内側にするか */
const REMARRIAGE_INSET = 16;
/** 同じ人物の複数の婚姻の子への横線(バス)をずらす量 */
const BUS_STEP = 8;
/** 世代1つ分の高さ */
const ROW_HEIGHT = NODE_HEIGHT + GENERATION_GAP;

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  sex?: Sex;
  /** 世代(行)。値が小さいほど上の世代。原点は任意 */
  generation: number;
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

const centerX = (node: LayoutNode): number => node.x + NODE_WIDTH / 2;

/** 本人と横に並べる配偶者 spouseCount 人の幅 */
const coupleWidth = (spouseCount: number): number => NODE_WIDTH * (spouseCount + 1) + MARRIAGE_GAP * spouseCount;

const rowWidth = (widths: number[]): number =>
  widths.reduce((sum, width, index) => sum + width + (index > 0 ? GAP_X : 0), 0);

const rowTop = (generation: number): number => generation * ROW_HEIGHT;

type Marriage = {
  family: Family;
  /** 本人の横に並べる相手 */
  partner?: Individual;
  /** 別の位置に配置する相手 */
  linkedPartner?: Individual;
  children: Unit[];
  /** 別の位置に配置する子 */
  linkedChildren: Individual[];
};

/** 子孫ツリーの単位(本人・横に並べる配偶者・その下の子孫) */
type Unit = {
  person: Individual;
  generation: number;
  /** 配偶者を並べる向き(+1: 右, -1: 左)。夫が右・妻が左になるよう、本人が夫なら左 */
  side: 1 | -1;
  marriages: Marriage[];
  /** サブツリーの幅 */
  width: number;
};

/** 端点が別のブロックにある線。全体の配置後に引く */
type Link =
  | { kind: "descent"; anchor: Point; childId: string }
  | { kind: "marriage"; personId: string; partnerId: string; personIsHusband: boolean };

/** 子を並べる順(左→右)。配偶者の並びに合わせ、相手を横に置かない家族は配偶者と反対側に置く */
const childOrder = (unit: Unit): Marriage[] => {
  const withPartner = unit.marriages.filter((m) => m.partner);
  const others = unit.marriages.filter((m) => !m.partner);
  return unit.side < 0 ? [...withPartner.reverse(), ...others] : [...others, ...withPartner];
};

/** 1つの子孫ツリーを局所座標で配置したもの。全体へは平行移動して重ねる */
class Block {
  readonly nodes: LayoutNode[] = [];
  readonly marriages: LayoutLine[] = [];
  readonly descents: LayoutLine[] = [];
  readonly links: Link[] = [];

  constructor(private readonly centerId: string) {}

  addNode(individual: Individual, x: number, y: number, generation: number): LayoutNode {
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

  /** 本人・配偶者・子孫を left から配置し、本人のノードを返す */
  placeUnit(unit: Unit, left: number): LayoutNode {
    const y = rowTop(unit.generation);
    const partners = unit.marriages.filter((m) => m.partner);
    const step = NODE_WIDTH + MARRIAGE_GAP;
    const blockLeft = left + (unit.width - coupleWidth(partners.length)) / 2;
    const personX = unit.side < 0 ? blockLeft + partners.length * step : blockLeft;
    const person = this.addNode(unit.person, personX, y, unit.generation);
    const lineY = y + NODE_HEIGHT / 2;

    // 子への線の起点。各婚姻の相手と、その1つ内側のノードとの間
    const anchors = new Map<Marriage, Point>();
    partners.forEach((marriage, index) => {
      const spouseX = personX + unit.side * (index + 1) * step;
      this.addNode(marriage.partner!, spouseX, y, unit.generation);
      const gapX = (personX + unit.side * index * step + spouseX + NODE_WIDTH) / 2;
      if (index === 0) {
        this.marriages.push({ points: [Math.min(personX, spouseX) + NODE_WIDTH, lineY, Math.max(personX, spouseX), lineY] });
        anchors.set(marriage, { x: gapX, y: lineY });
        return;
      }
      // 2人目以降は間の配偶者を上からまたいで結ぶ。後の婚姻ほど本人側の起点を内側・高くし、線を交差させない
      const riseY = y - REMARRIAGE_RISE - (index - 1) * REMARRIAGE_STEP;
      const startX = centerX(person) + unit.side * (NODE_WIDTH / 2 - REMARRIAGE_INSET - (index - 1) * REMARRIAGE_STEP);
      const endX = spouseX + NODE_WIDTH / 2;
      this.marriages.push({ points: [startX, y, startX, riseY, endX, riseY, endX, y] });
      anchors.set(marriage, { x: gapX, y: riseY });
    });

    const order = childOrder(unit);
    const childrenWidth = rowWidth(order.flatMap((m) => m.children.map((c) => c.width)));
    let childLeft = left + (unit.width - childrenWidth) / 2;
    order.forEach((marriage, index) => {
      // 相手を横に置かない家族は本人の下端から線を引く
      const anchor = anchors.get(marriage) ?? { x: centerX(person), y: y + NODE_HEIGHT };
      const childNodes = marriage.children.map((child) => {
        const node = this.placeUnit(child, childLeft);
        childLeft += child.width + GAP_X;
        return node;
      });
      addDescent(this.descents, anchor, childNodes, index * BUS_STEP);
      for (const child of marriage.linkedChildren) {
        this.links.push({ kind: "descent", anchor, childId: child.id });
      }
      const { linkedPartner, family } = marriage;
      if (linkedPartner && linkedPartner.id !== unit.person.id) {
        this.links.push({
          kind: "marriage",
          personId: unit.person.id,
          partnerId: linkedPartner.id,
          personIsHusband: family.husband?.id === unit.person.id,
        });
      }
    });
    return person;
  }

  shift(dx: number): void {
    for (const node of this.nodes) node.x += dx;
    for (const line of [...this.marriages, ...this.descents]) {
      line.points = line.points.map((value, index) => (index % 2 === 0 ? value + dx : value));
    }
    for (const link of this.links) {
      if (link.kind === "descent") link.anchor.x += dx;
    }
  }
}

/** 親(anchor)から子の上端へ、行間のバスを経由する直角の線を引く */
const addDescent = (descents: LayoutLine[], anchor: Point, children: LayoutNode[], busOffset: number): void => {
  if (children.length === 0) return;
  const busY = children[0]!.y - GENERATION_GAP / 2 + busOffset;
  const xs = children.map(centerX);
  const left = Math.min(anchor.x, ...xs);
  const right = Math.max(anchor.x, ...xs);
  descents.push({ points: [anchor.x, anchor.y, anchor.x, busY] });
  descents.push({ points: [left, busY, right, busY] });
  for (const x of xs) {
    descents.push({ points: [x, busY, x, children[0]!.y] });
  }
};

/** レイアウト計算中の参照・出力をまとめたもの */
class LayoutBuilder {
  readonly nodes: LayoutNode[] = [];
  readonly marriages: LayoutLine[] = [];
  readonly descents: LayoutLine[] = [];
  private readonly individuals: Map<string, Individual>;
  private readonly families: Map<string, Family>;
  private readonly generations = new Map<string, number>();
  /** 配置先のブロックが決まった人物 */
  private readonly claimed = new Set<string>();
  /** 婚姻線・子への線を引く担当が決まった家族 */
  private readonly visitedFamilies = new Set<string>();
  /** 配置済みの人物のノード */
  private readonly positions = new Map<string, LayoutNode>();
  /** 行(y)ごとの配置済みノードの横の範囲 */
  private readonly occupied = new Map<number, [number, number][]>();
  private readonly links: Link[] = [];

  constructor(
    private readonly tree: FamilyTree,
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

  private familiesOf(links: { id: string }[]): Family[] {
    return links.flatMap((link) => this.families.get(link.id) ?? []);
  }

  private parentsOf(family: Family): Individual[] {
    return [family.husband, family.wife].flatMap((link) => this.individual(link?.id) ?? []);
  }

  private childrenOf(family: Family): Individual[] {
    return family.children.flatMap((link) => this.individual(link.id) ?? []);
  }

  private hasParents(individual: Individual): boolean {
    return this.familiesOf(individual.familiesAsChild).some((f) => this.parentsOf(f).length > 0);
  }

  /** 起点ノードから父(いなければ母)をたどった最上位の祖先。家系図の主軸とする */
  private topAncestor(start: Individual): Individual {
    const seen = new Set<string>();
    let current = start;
    while (!seen.has(current.id)) {
      seen.add(current.id);
      const family = this.familiesOf(current.familiesAsChild).find((f) => this.parentsOf(f).length > 0);
      if (!family) break;
      current = this.parentsOf(family).at(0)!;
    }
    return current;
  }

  /** つながりをたどり、親 -1・子 +1・配偶者と兄弟姉妹は同じ世代とする(矛盾する場合は先に決まった値) */
  private computeGenerations(order: Individual[]): void {
    for (const start of order) {
      if (this.generations.has(start.id)) continue;
      this.generations.set(start.id, 0);
      const queue = [start];
      for (let i = 0; i < queue.length; i++) {
        const person = queue[i]!;
        const generation = this.generations.get(person.id)!;
        const visit = (individuals: Individual[], value: number) => {
          for (const individual of individuals) {
            if (this.generations.has(individual.id)) continue;
            this.generations.set(individual.id, value);
            queue.push(individual);
          }
        };
        for (const family of this.familiesOf(person.familiesAsChild)) {
          visit(this.parentsOf(family), generation - 1);
          visit(this.childrenOf(family), generation);
        }
        for (const family of this.familiesOf(person.familiesAsSpouse)) {
          visit(this.parentsOf(family), generation);
          visit(this.childrenOf(family), generation + 1);
        }
      }
    }
  }

  /** 本人を起点に、まだ配置先の決まっていない配偶者・子孫をたどって子孫ツリーを組む */
  private buildUnit(person: Individual, generation: number): Unit {
    this.claimed.add(person.id);
    const first = this.familiesOf(person.familiesAsSpouse)[0];
    const families = this.familiesOf(person.familiesAsSpouse).filter((family) => {
      if (this.visitedFamilies.has(family.id)) return false;
      this.visitedFamilies.add(family.id);
      return true;
    });
    const marriages = families.map((family): Marriage => {
      const partner = this.individual(family.husband?.id === person.id ? family.wife?.id : family.husband?.id);
      if (partner && !this.claimed.has(partner.id)) {
        this.claimed.add(partner.id);
        return { family, partner, children: [], linkedChildren: [] };
      }
      return { family, linkedPartner: partner, children: [], linkedChildren: [] };
    });
    // 配偶者を確定してから子をたどる(子孫側で配偶者を重複して配置しない)
    for (const marriage of marriages) {
      for (const child of this.childrenOf(marriage.family)) {
        if (this.claimed.has(child.id)) marriage.linkedChildren.push(child);
        else marriage.children.push(this.buildUnit(child, generation + 1));
      }
    }
    const unit: Unit = { person, generation, side: first?.husband?.id === person.id ? -1 : 1, marriages, width: 0 };
    const spouseCount = marriages.filter((m) => m.partner).length;
    const childrenWidth = rowWidth(childOrder(unit).flatMap((m) => m.children.map((c) => c.width)));
    unit.width = Math.max(coupleWidth(spouseCount), childrenWidth);
    return unit;
  }

  /** root を起点とするブロックを組み、既存のノードと重ならない位置に置く */
  addBlock(root: Individual): void {
    const block = new Block(this.centerId);
    const generation = this.generations.get(root.id)!;
    // 親が配置済みで親の家族が未処理の場合(配偶者として並べた人の別の家族の子など)は、その家族の子を並べて親から線を引く
    const parents = this.placedParentsOf(root);
    const members = parents ? this.childrenOf(parents.family) : [root];
    let left = 0;
    const memberNodes = members.flatMap((member) => {
      if (this.claimed.has(member.id)) return [];
      const unit = this.buildUnit(member, generation);
      const node = block.placeUnit(unit, left);
      left += unit.width + GAP_X;
      return [node];
    });

    const centers = memberNodes.map(centerX);
    const desired = parents
      ? parents.anchor.x - (Math.min(...centers) + Math.max(...centers)) / 2
      : (this.linkedShift(block) ??
        // つながりの無いブロックは右端に並べる
        (this.nodes.length === 0 ? 0 : this.rightEdge() + GAP_X - Math.min(...block.nodes.map((n) => n.x))));

    block.shift(this.fittingShift(block, desired));
    for (const node of block.nodes) {
      this.nodes.push(node);
      this.positions.set(node.id, node);
      const intervals = this.occupied.get(node.y) ?? [];
      intervals.push([node.x, node.x + NODE_WIDTH]);
      this.occupied.set(node.y, intervals);
    }
    this.marriages.push(...block.marriages);
    this.descents.push(...block.descents);
    this.links.push(...block.links);
    if (parents) {
      addDescent(this.descents, parents.anchor, memberNodes, -BUS_STEP);
      if (parents.marriage) this.links.push(parents.marriage);
    }
  }

  /** 配置済みのノードとつながる線のうち最初のものが、なるべく短くなる平行移動量 */
  private linkedShift(block: Block): number | undefined {
    for (const link of block.links) {
      if (link.kind === "descent") {
        const child = this.positions.get(link.childId);
        if (child) return centerX(child) - link.anchor.x;
        continue;
      }
      const partner = this.positions.get(link.partnerId);
      if (!partner) continue;
      const person = block.nodes.find((n) => n.id === link.personId)!;
      const side = link.personIsHusband ? 1 : -1;
      return partner.x + side * (NODE_WIDTH + MARRIAGE_GAP) - person.x;
    }
    return undefined;
  }

  /** 親が配置済みの最初の親の家族と、子への線の起点。両親とも同じ行にいれば婚姻線も引く */
  private placedParentsOf(root: Individual): { family: Family; anchor: Point; marriage?: Link } | undefined {
    for (const family of this.familiesOf(root.familiesAsChild)) {
      const husband = this.positions.get(family.husband?.id ?? "");
      const wife = this.positions.get(family.wife?.id ?? "");
      if (!husband && !wife) continue;
      this.visitedFamilies.add(family.id);
      if (husband && wife && husband.y === wife.y) {
        return {
          family,
          anchor: { x: (centerX(husband) + centerX(wife)) / 2, y: husband.y + NODE_HEIGHT / 2 },
          marriage: { kind: "marriage", personId: husband.id, partnerId: wife.id, personIsHusband: true },
        };
      }
      const parent = (husband ?? wife)!;
      return { family, anchor: { x: centerX(parent), y: parent.y + NODE_HEIGHT } };
    }
    return undefined;
  }

  private rightEdge(): number {
    return Math.max(...this.nodes.map((n) => n.x + NODE_WIDTH));
  }

  /** desired に最も近く、各行で既存のノードと GAP_X 以上離れる平行移動量 */
  private fittingShift(block: Block, desired: number): number {
    const rows = new Map<number, [number, number]>();
    for (const node of block.nodes) {
      const [left, right] = rows.get(node.y) ?? [Infinity, -Infinity];
      rows.set(node.y, [Math.min(left, node.x), Math.max(right, node.x + NODE_WIDTH)]);
    }
    const EPSILON = 1e-6;
    const fits = (dx: number) =>
      [...rows].every(([y, [left, right]]) =>
        (this.occupied.get(y) ?? []).every(
          ([l, r]) => left + dx >= r + GAP_X - EPSILON || right + dx + GAP_X <= l + EPSILON,
        ),
      );
    const candidates = [desired];
    for (const [y, [left, right]] of rows) {
      for (const [l, r] of this.occupied.get(y) ?? []) candidates.push(l - GAP_X - right, r + GAP_X - left);
    }
    return candidates
      .filter(fits)
      .reduce((best, dx) => (Math.abs(dx - desired) < Math.abs(best - desired) ? dx : best));
  }

  /** ブロックをまたぐ線を引く(全員の配置後) */
  resolveLinks(): void {
    for (const link of this.links) {
      if (link.kind === "descent") {
        addDescent(this.descents, link.anchor, [this.positions.get(link.childId)!], -BUS_STEP);
        continue;
      }
      const [left, right] = [this.positions.get(link.personId)!, this.positions.get(link.partnerId)!].sort(
        (a, b) => a.x - b.x,
      ) as [LayoutNode, LayoutNode];
      this.marriages.push({
        points: [left.x + NODE_WIDTH, left.y + NODE_HEIGHT / 2, right.x, right.y + NODE_HEIGHT / 2],
      });
    }
  }

  build(): void {
    const start = this.individual(findRootId(this.tree))!;
    const main = this.topAncestor(start);
    // 親のいない人物を上の世代から起点にし、残った人物(親の家族が未処理の子)を最後に置く
    this.computeGenerations([main, ...this.tree.individuals]);
    const rest = this.tree.individuals
      .map((individual, index) => ({ individual, index, hasParents: this.hasParents(individual) }))
      .sort(
      (a, b) =>
        Number(a.hasParents) - Number(b.hasParents) ||
        this.generations.get(a.individual.id)! - this.generations.get(b.individual.id)! ||
        a.index - b.index,
    );
    for (const root of [main, ...rest.map((r) => r.individual)]) {
      if (!this.claimed.has(root.id)) this.addBlock(root);
    }
    this.resolveLinks();
  }
}

/**
 * 家系図全体のレイアウトを計算する。配置は中心人物に依存せず、centerId は強調表示の対象にのみ使う。
 * 座標は任意の原点(描画側で中心ノードを画面中央に寄せる)
 */
export const computeLayout = (tree: FamilyTree, centerId: string): TreeLayout => {
  if (!tree.individuals.some((i) => i.id === centerId)) return { nodes: [], marriages: [], descents: [] };
  const builder = new LayoutBuilder(tree, centerId);
  builder.build();
  return builder.result();
};
