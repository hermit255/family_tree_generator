import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddPersonDialog, type AddMode } from "./add-person-dialog";
import { family, person, setupStore } from "./test-utils";

const open = (mode: AddMode) => {
  const onClose = vi.fn();
  render(<AddPersonDialog mode={mode} onClose={onClose} />);
  return onClose;
};

const fillAndSubmit = (surname: string) => {
  fireEvent.change(screen.getByLabelText("姓"), { target: { value: surname } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AddPersonDialog", () => {
  it("最初の人物を追加して閉じる", () => {
    setupStore();
    const onClose = open({ kind: "first" });
    expect(screen.getByRole("heading", { name: "最初の人物を追加" })).toBeVisible();
    fillAndSubmit("山田");
    expect(person("I1")).toMatchObject({ surname: "山田" });
    expect(onClose).toHaveBeenCalled();
  });

  it("配偶者を追加する(姓は継承しない)", () => {
    setupStore("0 @I1@ INDI", "1 NAME 太郎 /山田/", "1 SEX M");
    open({ kind: "spouse", personId: "I1" });
    expect(screen.getByText("山田 太郎 の配偶者(新しい家族として追加します)")).toBeVisible();
    expect(screen.getByLabelText("姓")).toHaveValue("");
    fillAndSubmit("佐藤");
    expect(family("F1")).toMatchObject({ husband: { id: "I1" }, wife: { id: "I2" } });
  });

  describe("親を追加", () => {
    it("父母とも追加できる場合は続柄を選び、性別の初期値は続柄に合わせる", () => {
      setupStore("0 @I1@ INDI");
      open({ kind: "parent", childId: "I1" });
      expect(screen.getByRole("heading", { name: "親を追加" })).toBeVisible();
      expect(screen.getByRole("radio", { name: "男性" })).toBeChecked();
      fireEvent.click(screen.getByRole("radio", { name: "母" }));
      expect(screen.getByRole("radio", { name: "女性" })).toBeChecked();
      fillAndSubmit("佐藤");
      expect(person("I2")).toMatchObject({ sex: "F" });
      expect(family("F1")).toMatchObject({ wife: { id: "I2" }, children: [{ id: "I1" }] });
    });

    it("片方のみ追加できる場合は続柄を選ばせない", () => {
      setupStore("0 @I1@ INDI", "1 FAMC @F1@", "0 @I2@ INDI", "1 FAMS @F1@", "0 @F1@ FAM", "1 HUSB @I2@", "1 CHIL @I1@");
      open({ kind: "parent", childId: "I1" });
      expect(screen.getByRole("heading", { name: "母を追加" })).toBeVisible();
      expect(screen.queryByText("続柄")).toBeNull();
      fillAndSubmit("佐藤");
      expect(family("F1")).toMatchObject({ husband: { id: "I2" }, wife: { id: "I3" } });
    });

    it("性別は初期値から変更でき、姓は選択中の人物から継承する", () => {
      setupStore("0 @I1@ INDI", "1 NAME 太郎 /山田/");
      open({ kind: "parent", childId: "I1" });
      expect(screen.getByLabelText("姓")).toHaveValue("山田");
      fireEvent.change(screen.getByLabelText("名"), { target: { value: "一郎" } });
      fireEvent.click(screen.getByRole("radio", { name: "不明" }));
      fireEvent.click(screen.getByRole("button", { name: "追加" }));
      expect(person("I2")).toMatchObject({ surname: "山田", givenName: "一郎", sex: "U" });
      expect(family("F1")).toMatchObject({ husband: { id: "I2" } });
    });
  });

  describe("子を追加", () => {
    const remarried = [
      "0 @I1@ INDI",
      "1 SEX M",
      "1 FAMS @F1@",
      "1 FAMS @F2@",
      "0 @I2@ INDI",
      "1 NAME 花子 /佐藤/",
      "1 FAMS @F1@",
      "0 @I3@ INDI",
      "1 NAME 春子 /鈴木/",
      "1 FAMS @F2@",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I2@",
      "0 @F2@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I3@",
    ];

    it("配偶者が2人以上なら選択肢を表示し、選んだ家族に追加する", () => {
      setupStore(...remarried);
      open({ kind: "child", parentId: "I1" });
      expect(screen.getByRole("radio", { name: "佐藤 花子" })).toBeChecked();
      fireEvent.click(screen.getByRole("radio", { name: "鈴木 春子" }));
      fillAndSubmit("山田");
      expect(family("F2")!.children.map((c) => c.id)).toEqual(["I4"]);
    });

    it("配偶者なしを選ぶと新しい家族に追加する", () => {
      setupStore(...remarried);
      open({ kind: "child", parentId: "I1" });
      fireEvent.click(screen.getByRole("radio", { name: "配偶者なし" }));
      fillAndSubmit("山田");
      expect(family("F3")).toMatchObject({ husband: { id: "I1" }, children: [{ id: "I4" }] });
    });

    it("姓は選択中の人物から継承し、性別の初期値は不明", () => {
      setupStore("0 @I1@ INDI", "1 NAME 太郎 /山田/");
      open({ kind: "child", parentId: "I1" });
      expect(screen.getByLabelText("姓")).toHaveValue("山田");
      expect(screen.getByRole("radio", { name: "不明" })).toBeChecked();
    });

    it("配偶者が1人なら選択肢を出さずその家族に追加する", () => {
      setupStore(
        "0 @I1@ INDI",
        "1 FAMS @F1@",
        "0 @I2@ INDI",
        "1 FAMS @F1@",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
      );
      open({ kind: "child", parentId: "I1" });
      expect(screen.queryByText("どの配偶者との子か")).toBeNull();
      fillAndSubmit("山田");
      expect(family("F1")!.children.map((c) => c.id)).toEqual(["I3"]);
    });
  });

  it("操作エラーはトーストで表示し、ダイアログを閉じない", () => {
    setupStore("0 @I1@ INDI");
    const error = vi.spyOn(toast, "error");
    const onClose = open({ kind: "child", parentId: "I9" });
    fillAndSubmit("山田");
    expect(error).toHaveBeenCalledWith("人物 I9 が存在しません");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape キーで閉じる", () => {
    setupStore("0 @I1@ INDI");
    const onClose = open({ kind: "spouse", personId: "I1" });
    fireEvent.keyDown(screen.getByLabelText("姓"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("キャンセルで閉じる", () => {
    setupStore("0 @I1@ INDI");
    const onClose = open({ kind: "spouse", personId: "I1" });
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("mode が null なら表示しない", () => {
    setupStore("0 @I1@ INDI");
    render(<AddPersonDialog mode={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
