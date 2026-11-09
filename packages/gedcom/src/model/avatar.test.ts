import { describe, expect, it } from "vitest";
import { treeOf } from "../operations/test-helpers";
import { avatarOf, avatarsOf, embeddedImageOf } from "./avatar";
import { exportGedcom } from "./export";
import { importGedcom } from "./import";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("embeddedImageOf", () => {
  it("OBJE の最初の FILE が data URI 画像なら値を返す", () => {
    expect(embeddedImageOf({ tag: "OBJE", children: [{ tag: "FILE", value: PNG, children: [] }] })).toBe(PNG);
  });

  it("OBJE 以外・FILE なし・外部URL・画像以外の data URI は undefined", () => {
    expect(embeddedImageOf({ tag: "NOTE", children: [{ tag: "FILE", value: PNG, children: [] }] })).toBeUndefined();
    expect(embeddedImageOf({ tag: "OBJE", children: [] })).toBeUndefined();
    const file = (value: string) => ({ tag: "OBJE", children: [{ tag: "FILE", value, children: [] }] });
    expect(embeddedImageOf(file("https://example.com/a.png"))).toBeUndefined();
    expect(embeddedImageOf(file("data:text/plain;base64,YQ=="))).toBeUndefined();
  });
});

describe("avatarOf / avatarsOf", () => {
  const tree = treeOf(
    "0 @I1@ INDI",
    "1 OBJE @O1@",
    "1 OBJE @O2@",
    "0 @I2@ INDI",
    "1 OBJE @O9@",
    "1 NOTE メモ",
    "0 @I3@ INDI",
    "1 OBJE",
    "0 OBJE",
    `1 FILE ${PNG}`,
    "0 @O1@ OBJE",
    "1 FILE https://example.com/a.jpg",
    "2 FORM image/jpeg",
    "0 @O2@ OBJE",
    `1 FILE ${PNG}`,
    "2 FORM image/png",
  );

  it("参照する OBJE のうち最初の data URI 画像をアバターとする", () => {
    expect(avatarOf(tree, "I1")).toEqual({ objectId: "O2", dataUri: PNG });
  });

  it("参照先が無い・画像が無い・ポインタの無い OBJE だけの人物、存在しない人物は undefined", () => {
    expect(avatarOf(tree, "I2")).toBeUndefined();
    expect(avatarOf(tree, "I3")).toBeUndefined();
    expect(avatarOf(tree, "I99")).toBeUndefined();
  });

  it("アバターのある人物だけを返す", () => {
    expect([...avatarsOf(tree).keys()]).toEqual(["I1"]);
  });

  it("エクスポート・再インポートで保持される", () => {
    expect(avatarOf(importGedcom(exportGedcom(tree)).tree, "I1")).toEqual({ objectId: "O2", dataUri: PNG });
  });
});
