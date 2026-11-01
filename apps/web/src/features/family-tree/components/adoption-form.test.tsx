import { pedigreeOf } from "@kakeizu/gedcom";
import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyTreeStore } from "../store";
import { AddPersonDialog } from "./add-person-dialog";
import { family, person, setupStore } from "./test-utils";

// 妻の両親 I1・I2 の家族 F1 に妻 I3。I3 と夫 I4 の家族 F2
const MUKO = [
  "0 @I1@ INDI",
  "1 NAME 清 /佐藤/",
  "1 SEX M",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 NAME ハル /佐藤/",
  "1 SEX F",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 NAME 和子 /佐藤/",
  "1 SEX F",
  "1 FAMC @F1@",
  "1 FAMS @F2@",
  "0 @I4@ INDI",
  "1 NAME 茂 /山田/",
  "1 SEX M",
  "1 FAMS @F2@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 CHIL @I3@",
  "0 @F2@ FAM",
  "1 HUSB @I4@",
  "1 WIFE @I3@",
];

const open = (childId: string) => {
  const onClose = vi.fn();
  render(<AddPersonDialog mode={{ kind: "adoption", childId }} onClose={onClose} />);
  return onClose;
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("養子縁組", () => {
  it("既存の家族の養子にする(婿養子)。人物の入力欄は出さない", () => {
    setupStore(...MUKO);
    const success = vi.spyOn(toast, "success");
    const onClose = open("I4");
    expect(screen.getByRole("heading", { name: "養子縁組" })).toBeVisible();
    expect(screen.getByText("山田 茂 の養親")).toBeVisible();
    // 本人が配偶者として属する F2 は候補にしない
    expect(screen.queryByRole("radio", { name: "山田 茂・佐藤 和子 の養子にする" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "佐藤 清・佐藤 ハル の養子にする" }));
    expect(screen.queryByLabelText("姓")).toBeNull();
    expect(screen.getByRole("radio", { name: "普通養子" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "縁組する" }));
    expect(family("F1")!.children.map((c) => c.id)).toEqual(["I3", "I4"]);
    expect(pedigreeOf(person("I4")!, "F1")).toBe("adopted");
    expect(success).toHaveBeenCalledWith("佐藤 清・佐藤 ハル の養子にしました");
    expect(onClose).toHaveBeenCalled();
  });

  it("新しい人物を養親として追加する。性別は男女から必須で、性別で養父・養母を決める", () => {
    setupStore(...MUKO);
    const onClose = open("I4");
    expect(screen.getByRole("radio", { name: "新しい人物を養親として追加" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "特別養子" }));
    fireEvent.change(screen.getByLabelText("名"), { target: { value: "トメ" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("性別を選択してください")).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "女性" }));
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(family("F3")).toMatchObject({ wife: { id: "I5" }, children: [{ id: "I4" }] });
    expect(pedigreeOf(person("I4")!, "F3")).toBe("special");
    expect(onClose).toHaveBeenCalled();
  });

  it("養親の枠が空いた縁組の家族があれば、続柄の決まった養親を追加できる(種類は家族に従う)", () => {
    setupStore(
      "0 @I1@ INDI",
      "1 FAMC @F1@",
      "2 PEDI ADOPTED",
      "0 @I2@ INDI",
      "1 NAME 清 /佐藤/",
      "1 SEX M",
      "1 FAMS @F1@",
      "0 @F1@ FAM",
      "1 HUSB @I2@",
      "1 CHIL @I1@",
    );
    open("I1");
    fireEvent.click(screen.getByRole("radio", { name: "佐藤 清 の養母を追加" }));
    expect(screen.queryByText("縁組の種類")).toBeNull();
    expect(screen.getByRole("radio", { name: "女性" })).toBeChecked();
    fireEvent.change(screen.getByLabelText("名"), { target: { value: "ハル" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(family("F1")).toMatchObject({ husband: { id: "I2" }, wife: { id: "I3" } });
    expect(person("I1")!.familiesAsChild.map((l) => l.id)).toEqual(["F1"]);
  });

  it("操作エラーはトーストで表示し、ダイアログを閉じない", () => {
    setupStore(...MUKO);
    const error = vi.spyOn(toast, "error");
    useFamilyTreeStore.setState({ adoptInto: () => ({ ok: false, error: "縁組できません" }) });
    const onClose = open("I4");
    fireEvent.click(screen.getByRole("radio", { name: "佐藤 清・佐藤 ハル の養子にする" }));
    fireEvent.click(screen.getByRole("button", { name: "縁組する" }));
    expect(error).toHaveBeenCalledWith("縁組できません");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("キャンセルで閉じる(既存の家族を選んだ場合)", () => {
    setupStore(...MUKO);
    const onClose = open("I4");
    fireEvent.click(screen.getByRole("radio", { name: "佐藤 清・佐藤 ハル の養子にする" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onClose).toHaveBeenCalled();
  });
});
