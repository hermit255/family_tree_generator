import { describe, expect, it } from "vitest";
import { avatarOf, exportGedcom } from "../model";
import { removeAvatar, setAvatar } from "./avatar";
import { deleteIndividual } from "./remove";
import { treeOf } from "./test-helpers";
import { getIndividual } from "./tree";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const WEBP = "data:image/webp;base64,UklGRg==";

const objects = (tree: ReturnType<typeof treeOf>) => tree.extraRecords.map((r) => r.xref);

describe("setAvatar", () => {
  it("写真の無い人物に OBJE レコードを追加し、先頭から参照する", () => {
    const tree = setAvatar(treeOf("0 @I1@ INDI", "1 NOTE メモ"), "I1", WEBP);
    expect(avatarOf(tree, "I1")).toEqual({ objectId: "O1", dataUri: WEBP });
    expect(getIndividual(tree, "I1").extras.map((n) => n.tag)).toEqual(["OBJE", "NOTE"]);
    expect(exportGedcom(tree)).toContain(["0 @O1@ OBJE", `1 FILE ${WEBP}`, "2 FORM image/webp"].join("\n"));
  });

  it("既存の写真は同じ位置で差し替え、使われなくなった OBJE を削除する", () => {
    const base = treeOf("0 @I1@ INDI", "1 NOTE メモ", "1 OBJE @O1@", "0 @O1@ OBJE", `1 FILE ${PNG}`, "2 FORM image/png");
    const tree = setAvatar(base, "I1", WEBP);
    expect(avatarOf(tree, "I1")).toEqual({ objectId: "O2", dataUri: WEBP });
    expect(getIndividual(tree, "I1").extras.map((n) => n.pointer ?? n.tag)).toEqual(["NOTE", "O2"]);
    expect(objects(tree)).toEqual(["O2"]);
  });

  it("他の人物も参照している写真は残す", () => {
    const base = treeOf("0 @I1@ INDI", "1 OBJE @O1@", "0 @I2@ INDI", "1 OBJE @O1@", "0 @O1@ OBJE", `1 FILE ${PNG}`);
    const tree = setAvatar(base, "I1", WEBP);
    expect(objects(tree)).toEqual(["O1", "O2"]);
    expect(avatarOf(tree, "I2")?.objectId).toBe("O1");
  });

  it("data URI 画像以外はエラー", () => {
    const base = treeOf("0 @I1@ INDI");
    expect(() => setAvatar(base, "I1", "https://example.com/a.png")).toThrow(/形式が不正/);
    expect(() => setAvatar(base, "I1", "data:text/plain;base64,YQ==")).toThrow(/形式が不正/);
  });

  it("存在しない人物はエラー", () => {
    expect(() => setAvatar(treeOf("0 @I1@ INDI"), "I9", WEBP)).toThrow(/存在しません/);
  });
});

describe("removeAvatar", () => {
  it("写真の参照と OBJE レコードを削除する。外部URLの OBJE は残す", () => {
    const base = treeOf(
      "0 @I1@ INDI",
      "1 OBJE @O1@",
      "1 OBJE @O2@",
      "0 @O1@ OBJE",
      "1 FILE https://example.com/a.jpg",
      "0 @O2@ OBJE",
      `1 FILE ${PNG}`,
    );
    const tree = removeAvatar(base, "I1");
    expect(avatarOf(tree, "I1")).toBeUndefined();
    expect(getIndividual(tree, "I1").extras.map((n) => n.pointer)).toEqual(["O1"]);
    expect(objects(tree)).toEqual(["O1"]);
  });

  it("写真が無ければそのまま返す", () => {
    const base = treeOf("0 @I1@ INDI");
    expect(removeAvatar(base, "I1")).toBe(base);
  });
});

describe("deleteIndividual と写真", () => {
  const base = treeOf(
    "0 @I1@ INDI",
    "1 FAMS @F1@",
    "0 @I2@ INDI",
    "1 FAMS @F1@",
    "1 OBJE @O1@",
    "1 OBJE @O2@",
    "1 OBJE",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "0 @O1@ OBJE",
    `1 FILE ${PNG}`,
    "0 @O2@ OBJE",
    "1 FILE https://example.com/a.jpg",
  );

  it("削除した人物だけが参照していた写真の OBJE を削除し、それ以外の OBJE は残す", () => {
    expect(objects(deleteIndividual(base, "I2"))).toEqual(["O2"]);
  });

  it("他から参照されている写真は残す", () => {
    const shared = { ...base, extraRecords: [...base.extraRecords, { tag: "NOTE", xref: "N1", children: [{ tag: "OBJE", pointer: "O1", children: [] }] }] };
    expect(objects(deleteIndividual(shared, "I2"))).toEqual(["O1", "O2", "N1"]);
  });
});
