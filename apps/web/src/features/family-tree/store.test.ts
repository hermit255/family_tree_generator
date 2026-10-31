import { exportGedcom, importGedcom } from "@kakeizu/gedcom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_GEDCOM } from "./sample";
import { STORAGE_KEY } from "./storage";
import { initialState, useFamilyTreeStore } from "./store";

const gedcom = (...body: string[]) => ["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR", ""].join("\n");

const store = () => useFamilyTreeStore.getState();
const stored = () => {
  const text = localStorage.getItem(STORAGE_KEY);
  return text === null ? null : importGedcom(text).tree;
};

const COUPLE = gedcom(
  "0 @I1@ INDI",
  "1 NAME 太郎 /山田/",
  "1 SEX M",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 SEX F",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
);

beforeEach(() => {
  localStorage.clear();
  useFamilyTreeStore.setState(initialState);
});

describe("hydrate", () => {
  it("保存データから復元し、起点ノードを中心にする", () => {
    localStorage.setItem(STORAGE_KEY, gedcom("0 @X1@ INDI", "0 @X2@ INDI"));
    store().hydrate();
    expect(store()).toMatchObject({ hydrated: true, centerId: "X1" });
    expect(store().tree?.individuals.map((i) => i.id)).toEqual(["X1", "X2"]);
  });

  it.each([
    ["保存データが無い", null],
    ["保存データが壊れている", "broken"],
  ])("%s場合は同梱サンプルを読み込み、保存する", (_, value) => {
    if (value !== null) localStorage.setItem(STORAGE_KEY, value);
    store().hydrate();
    const sample = importGedcom(SAMPLE_GEDCOM).tree;
    expect(store()).toMatchObject({ hydrated: true, tree: sample, centerId: "I1" });
    expect(stored()).toEqual(sample);
  });

  it("localStorage が使えない場合も同梱サンプルを読み込む", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    store().hydrate();
    expect(store().tree).toEqual(importGedcom(SAMPLE_GEDCOM).tree);
    spy.mockRestore();
  });

  it("同梱サンプルは警告なしで読み込める", () => {
    expect(importGedcom(SAMPLE_GEDCOM).warnings).toEqual([]);
  });
});

describe("importText", () => {
  it("取り込んだデータを反映・保存し、警告を保持し、詳細パネルを閉じる", () => {
    useFamilyTreeStore.setState({ detailOpen: true });
    const result = store().importText(gedcom("0 @I1@ INDI", "1 FAMC @F1@", "0 @F1@ FAM"));
    expect(result).toEqual({ ok: true, value: undefined });
    expect(store()).toMatchObject({ centerId: "I1", warnings: ["F1 に子 I1 を補完しました"], detailOpen: false });
    expect(stored()).toEqual(store().tree);
  });

  it.each([
    ["構文エラー", "0 HEAD\nbroken", /2行目/],
    ["インポートエラー", "0 HEAD\n0 TRLR\n", /GEDCOM 7.x/],
  ])("%s はメッセージを返し、状態を変えない", (_, text, message) => {
    store().importText(COUPLE);
    const before = store().tree;
    const result = store().importText(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(message);
    expect(store().tree).toBe(before);
  });
});

describe("reset", () => {
  it("名前未設定の起点ノード1人だけにして保存し、警告・詳細パネルをクリアする", () => {
    store().importText(gedcom("0 @X1@ INDI", "1 FAMC @F1@", "0 @F1@ FAM"));
    store().select("X1");
    store().reset();
    expect(store()).toMatchObject({ centerId: "I1", warnings: [], detailOpen: false });
    expect(store().tree?.individuals).toEqual([
      { id: "I1", givenName: "", surname: "", nameExtras: [], familiesAsSpouse: [], familiesAsChild: [], extras: [] },
    ]);
    expect(store().tree?.families).toEqual([]);
    expect(stored()).toEqual(store().tree);
  });
});

describe("追加・更新・削除", () => {
  beforeEach(() => {
    store().importText(COUPLE);
  });

  it("addSpouse / addChild / addParent は追加した人物の ID を返し、保存する", () => {
    expect(store().addChild("I1", "F1", { givenName: "一郎" })).toEqual({ ok: true, value: "I3" });
    expect(store().addSpouse("I3", { givenName: "春子" })).toEqual({ ok: true, value: "I4" });
    expect(store().addParent("I1", "father", { givenName: "太助" })).toEqual({ ok: true, value: "I5" });
    expect(stored()?.individuals.map((i) => i.id)).toEqual(["I1", "I2", "I3", "I4", "I5"]);
    expect(importGedcom(exportGedcom(store().tree!)).warnings).toEqual([]);
  });

  it("update は保存データにも反映する", () => {
    expect(store().update("I2", { givenName: "花子", surname: "山田", sex: "F" }).ok).toBe(true);
    expect(stored()?.individuals[1]).toMatchObject({ givenName: "花子", surname: "山田" });
  });

  it("操作エラーはメッセージを返す", () => {
    expect(store().addSpouse("I1", { givenName: "" })).toEqual({ ok: false, error: "姓または名を入力してください" });
    expect(store().update("I9", { givenName: "a" })).toEqual({ ok: false, error: "人物 I9 が存在しません" });
    expect(store().remove("I1")).toEqual({ ok: false, error: "起点ノードは削除できません" });
  });

  it("select で中心にして詳細パネルを開き、closeDetail で閉じる", () => {
    store().select("I2");
    expect(store()).toMatchObject({ centerId: "I2", detailOpen: true });
    store().closeDetail();
    expect(store()).toMatchObject({ centerId: "I2", detailOpen: false });
  });

  it("deselect で選択を解除し、詳細パネルを閉じる", () => {
    store().select("I2");
    store().deselect();
    expect(store()).toMatchObject({ centerId: undefined, detailOpen: false });
  });

  it("中心以外の人物を削除しても中心・詳細パネルは変わらない", () => {
    store().addChild("I1", "F1", { givenName: "一郎" });
    store().select("I2");
    expect(store().remove("I3").ok).toBe(true);
    expect(store()).toMatchObject({ centerId: "I2", detailOpen: true });
    expect(stored()?.individuals.map((i) => i.id)).toEqual(["I1", "I2"]);
  });

  it("中心の人物を削除すると起点ノードに戻り、詳細パネルを閉じる", () => {
    store().select("I2");
    store().remove("I2");
    expect(store()).toMatchObject({ centerId: "I1", detailOpen: false });
  });

  it("想定外のエラーは再送出する", () => {
    useFamilyTreeStore.setState({ tree: { ...store().tree!, individuals: null as never } });
    expect(() => store().update("I1", { givenName: "a" })).toThrow(TypeError);
  });
});

describe("データが空の状態", () => {
  it("addFirst で最初の人物 I1 を追加し、中心にする", () => {
    store().importText(gedcom());
    expect(store().addFirst({ surname: "山田" })).toEqual({ ok: true, value: "I1" });
    expect(store().centerId).toBe("I1");
    expect(stored()?.individuals.map((i) => i.id)).toEqual(["I1"]);
  });

  it("addFirst の入力エラーは中心を変えない", () => {
    expect(store().addFirst({})).toMatchObject({ ok: false });
    expect(store().centerId).toBeUndefined();
  });

  it("tree が null のままの更新・削除はエラーを返す", () => {
    expect(store().update("I1", { givenName: "a" })).toEqual({ ok: false, error: "人物 I1 が存在しません" });
    expect(store().remove("I1")).toEqual({ ok: false, error: "人物 I1 が存在しません" });
  });
});

describe("保存", () => {
  it("localStorage への保存に失敗しても操作は継続できる", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(store().importText(COUPLE).ok).toBe(true);
    expect(store().tree?.individuals).toHaveLength(2);
    spy.mockRestore();
  });
});
