import {
  addChild,
  addFirstIndividual,
  addParent,
  addSpouse,
  deleteIndividual,
  findRootId,
  GedcomImportError,
  GedcomSyntaxError,
  importGedcom,
  TreeOperationError,
  updateIndividual,
  type AddResult,
  type FamilyTree,
  type ParentRole,
  type PersonInput,
} from "@kakeizu/gedcom";
import { create } from "zustand";
import { loadStoredTree, saveTree } from "./storage";

export type ActionResult<T = void> = { ok: true; value: T } | { ok: false; error: string };

type FamilyTreeState = {
  /** localStorage からの復元が完了したか */
  hydrated: boolean;
  tree: FamilyTree | null;
  /** 表示の中心とする人物 */
  centerId: string | undefined;
  /** 直近のインポートで発生した警告 */
  warnings: string[];
};

type FamilyTreeActions = {
  /** localStorage から復元する。保存データが無い場合は tree が null のまま */
  hydrate: () => void;
  importText: (text: string) => ActionResult;
  setCenter: (id: string) => void;
  addFirst: (input: PersonInput) => ActionResult<string>;
  addSpouse: (personId: string, input: PersonInput) => ActionResult<string>;
  addChild: (parentId: string, familyId: string | undefined, input: PersonInput) => ActionResult<string>;
  addParent: (childId: string, role: ParentRole, input: PersonInput) => ActionResult<string>;
  update: (id: string, input: PersonInput) => ActionResult;
  remove: (id: string) => ActionResult;
};

const EMPTY_TREE: FamilyTree = { header: { extras: [] }, submitters: [], individuals: [], families: [], extraRecords: [] };

/** 想定済みのエラーを画面表示用のメッセージに変換する。想定外のエラーは再送出する */
const attempt = <T>(run: () => T): ActionResult<T> => {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    if (
      error instanceof TreeOperationError ||
      error instanceof GedcomImportError ||
      error instanceof GedcomSyntaxError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
};

export const initialState: FamilyTreeState = { hydrated: false, tree: null, centerId: undefined, warnings: [] };

export const useFamilyTreeStore = create<FamilyTreeState & FamilyTreeActions>()((set, get) => {
  /** 追加系の操作を実行し、結果の tree を反映する */
  const applyAdd = (run: (tree: FamilyTree) => AddResult): ActionResult<string> =>
    attempt(() => {
      const { tree, individualId } = run(get().tree ?? EMPTY_TREE);
      set({ tree });
      return individualId;
    });

  return {
    ...initialState,

    hydrate: () => {
      const tree = loadStoredTree();
      set({ hydrated: true, tree, centerId: tree ? findRootId(tree) : undefined });
    },

    importText: (text) =>
      attempt(() => {
        const { tree, warnings } = importGedcom(text);
        set({ tree, warnings, centerId: findRootId(tree) });
      }),

    setCenter: (centerId) => set({ centerId }),

    addFirst: (input) => {
      const result = applyAdd((tree) => addFirstIndividual(tree, input));
      if (result.ok) set({ centerId: result.value });
      return result;
    },
    addSpouse: (personId, input) => applyAdd((tree) => addSpouse(tree, personId, input)),
    addChild: (parentId, familyId, input) => applyAdd((tree) => addChild(tree, parentId, familyId, input)),
    addParent: (childId, role, input) => applyAdd((tree) => addParent(tree, childId, role, input)),

    update: (id, input) =>
      attempt(() => {
        set({ tree: updateIndividual(get().tree ?? EMPTY_TREE, id, input) });
      }),

    remove: (id) =>
      attempt(() => {
        const tree = deleteIndividual(get().tree ?? EMPTY_TREE, id);
        const { centerId } = get();
        // 中心の人物を削除した場合は起点ノードに戻す
        set({ tree, centerId: centerId === id ? findRootId(tree) : centerId });
      }),
  };
});

// tree が変わるたびに localStorage へ保存する
useFamilyTreeStore.subscribe((state, prev) => {
  if (state.tree && state.tree !== prev.tree) saveTree(state.tree);
});
