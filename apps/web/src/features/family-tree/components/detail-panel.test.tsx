import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyTreeStore } from "../store";
import { DetailPanel } from "./detail-panel";
import { person, setupStore, store } from "./test-utils";

// I1(起点)═I2、子 I3
const FAMILY = [
  "0 @I1@ INDI",
  "1 NAME 太郎 /山田/",
  "1 SEX M",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 NAME 花子 /山田/",
  "1 SEX F",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 NAME 一郎 /山田/",
  "1 FAMC @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 CHIL @I3@",
];

const showPanel = (centerId: string, showClose = false) => {
  useFamilyTreeStore.setState({ centerId, detailOpen: true });
  return render(<DetailPanel showClose={showClose} />);
};

beforeEach(() => {
  vi.restoreAllMocks();
  setupStore(...FAMILY);
});

describe("DetailPanel", () => {
  it("中心人物の情報を閲覧モードで表示する", () => {
    showPanel("I1");
    expect(screen.getByRole("heading", { name: "山田 太郎" })).toBeVisible();
    expect(screen.getByText("男性")).toBeVisible();
    expect(screen.getByText("I1")).toBeVisible();
    expect(screen.queryByLabelText("姓")).toBeNull();
  });

  it("未入力の項目は - で表示する", () => {
    setupStore("0 @I1@ INDI", "1 NAME 太郎", "0 @I2@ INDI", "1 NAME /山田/");
    showPanel("I1");
    expect(screen.getAllByText("-")).toHaveLength(2); // 姓・性別
    useFamilyTreeStore.setState({ centerId: "I2" });
    expect(screen.getAllByText("-")).toHaveLength(2); // 名・性別
  });

  it("編集して保存すると閲覧モードに戻る", () => {
    const success = vi.spyOn(toast, "success");
    showPanel("I2");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByLabelText("名"), { target: { value: "春子" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(person("I2")).toMatchObject({ givenName: "春子" });
    expect(success).toHaveBeenCalledWith("保存しました");
    expect(screen.getByRole("heading", { name: "山田 春子" })).toBeVisible();
    expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
  });

  it("キャンセルで変更せず閲覧モードに戻る", () => {
    showPanel("I2");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByLabelText("名"), { target: { value: "春子" } });
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(person("I2")).toMatchObject({ givenName: "花子" });
    expect(screen.getByRole("button", { name: "編集" })).toBeVisible();
  });

  it("保存時の操作エラーはトーストで表示し、編集を続ける", () => {
    const error = vi.spyOn(toast, "error");
    useFamilyTreeStore.setState({ update: () => ({ ok: false, error: "保存できません" }) });
    showPanel("I2");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(error).toHaveBeenCalledWith("保存できません");
    expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
  });

  it("起点ノードは削除できず理由を表示する", () => {
    showPanel("I1");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
    expect(screen.getByText("起点ノードは削除できません")).toBeVisible();
  });

  it("確認ダイアログを経て削除する", () => {
    const success = vi.spyOn(toast, "success");
    showPanel("I3");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByRole("alertdialog", { name: "山田 一郎 を削除しますか？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(person("I3")).toBeUndefined();
    expect(success).toHaveBeenCalledWith("山田 一郎 を削除しました");
    expect(store()).toMatchObject({ centerId: "I1", detailOpen: false });
  });

  it("削除時の操作エラーはトーストで表示する", () => {
    const error = vi.spyOn(toast, "error");
    useFamilyTreeStore.setState({ remove: () => ({ ok: false, error: "削除できません" }) });
    showPanel("I3");
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(error).toHaveBeenCalledWith("削除できません");
    expect(person("I3")).toBeDefined();
  });

  it("閉じるボタンで詳細パネルを閉じる", () => {
    showPanel("I1", true);
    fireEvent.click(screen.getByRole("button", { name: "詳細を閉じる" }));
    expect(store().detailOpen).toBe(false);
  });

  it("中心人物が存在しなければ何も表示しない", () => {
    const { container } = showPanel("I9");
    expect(container).toBeEmptyDOMElement();
  });
});
