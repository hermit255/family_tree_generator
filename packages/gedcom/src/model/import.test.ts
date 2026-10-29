import { describe, expect, it } from "vitest";
import { importGedcom } from "./import";
import { GedcomImportError } from "./types";

const gedcom = (...body: string[]) => ["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR", ""].join("\n");

describe("importGedcom", () => {
  it("許可要素を家系図モデルに変換する", () => {
    const { tree, warnings } = importGedcom(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SUBM @U1@",
        "0 @U1@ SUBM",
        "1 NAME 提出者",
        "0 @I1@ INDI",
        "1 NAME 太郎 /山田/",
        "2 GIVN 太郎",
        "2 SURN 山田",
        "1 SEX M",
        "1 FAMS @F1@",
        "0 @I2@ INDI",
        "1 NAME 花子 /山田/",
        "1 SEX F",
        "1 FAMS @F1@",
        "0 @I3@ INDI",
        "1 FAMC @F1@",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 CHIL @I3@",
        "0 TRLR",
      ].join("\n"),
    );
    expect(warnings).toEqual([]);
    expect(tree).toEqual({
      header: { submitter: { id: "U1", extras: [] }, extras: [] },
      submitters: [{ id: "U1", name: "提出者", extras: [] }],
      individuals: [
        {
          id: "I1",
          givenName: "太郎",
          surname: "山田",
          nameExtras: [],
          sex: "M",
          familiesAsSpouse: [{ id: "F1", extras: [] }],
          familiesAsChild: [],
          extras: [],
        },
        {
          id: "I2",
          givenName: "花子",
          surname: "山田",
          nameExtras: [],
          sex: "F",
          familiesAsSpouse: [{ id: "F1", extras: [] }],
          familiesAsChild: [],
          extras: [],
        },
        {
          id: "I3",
          givenName: "",
          surname: "",
          nameExtras: [],
          familiesAsSpouse: [],
          familiesAsChild: [{ id: "F1", extras: [] }],
          extras: [],
        },
      ],
      families: [
        {
          id: "F1",
          husband: { id: "I1", extras: [] },
          wife: { id: "I2", extras: [] },
          children: [{ id: "I3", extras: [] }],
          extras: [],
        },
      ],
      extraRecords: [],
    });
  });

  describe("許可外要素の保持", () => {
    it("各レコードの未対応の下位構造を extras に保持する", () => {
      const { tree } = importGedcom(
        [
          "0 HEAD",
          "1 GEDC",
          "2 VERS 7.0",
          "1 SOUR app",
          "0 @U1@ SUBM",
          "1 NAME a",
          "1 NAME b",
          "0 @I1@ INDI",
          "1 NAME 太郎",
          "1 NAME 別名",
          "1 SEX M",
          "1 SEX F",
          "1 BIRT",
          "0 @F1@ FAM",
          "1 MARR",
          "0 TRLR",
        ].join("\n"),
      );
      expect(tree.header.extras.map((n) => n.tag)).toEqual(["SOUR"]);
      expect(tree.submitters[0]!.extras).toEqual([{ tag: "NAME", value: "b", children: [] }]);
      expect(tree.individuals[0]!.extras.map((n) => `${n.tag} ${n.value ?? ""}`)).toEqual([
        "NAME 別名",
        "SEX F",
        "BIRT ",
      ]);
      expect(tree.families[0]!.extras.map((n) => n.tag)).toEqual(["MARR"]);
    });

    it("未対応のレコードを extraRecords に保持する", () => {
      const { tree } = importGedcom(gedcom("0 @N1@ SNOTE メモ"));
      expect(tree.extraRecords).toEqual([{ tag: "SNOTE", xref: "N1", value: "メモ", children: [] }]);
    });

    it("リンク下位の構造を Link.extras に保持する", () => {
      const { tree } = importGedcom(gedcom("0 @I1@ INDI", "1 FAMC @F1@", "2 PEDI BIRTH", "0 @F1@ FAM", "1 CHIL @I1@"));
      expect(tree.individuals[0]!.familiesAsChild[0]!.extras).toEqual([{ tag: "PEDI", value: "BIRTH", children: [] }]);
    });

    it("SUBM 名が無ければ空文字", () => {
      expect(importGedcom(gedcom("0 @U1@ SUBM")).tree.submitters[0]!.name).toBe("");
      expect(importGedcom(gedcom("0 @U1@ SUBM", "1 NAME")).tree.submitters[0]!.name).toBe("");
    });

    it("xref の無い未対応レコードも保持する", () => {
      expect(importGedcom(gedcom("0 _EXT 値")).tree.extraRecords).toEqual([{ tag: "_EXT", value: "値", children: [] }]);
    });
  });

  describe("@VOID@", () => {
    it("リンク無しとして扱う", () => {
      const { tree } = importGedcom(
        gedcom("0 @F1@ FAM", "1 HUSB @VOID@", "1 CHIL @VOID@", "0 @I1@ INDI", "1 FAMS @VOID@"),
      );
      expect(tree.families[0]!.husband).toBeUndefined();
      expect(tree.families[0]!.children).toEqual([]);
      expect(tree.individuals[0]!.familiesAsSpouse).toEqual([]);
    });

    it("HEAD.SUBM が @VOID@ なら提出者なし", () => {
      expect(importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", "1 SUBM @VOID@", "0 TRLR"].join("\n")).tree.header.submitter).toBeUndefined();
    });
  });

  describe("片方向リンクの補完", () => {
    it("INDI.FAMS のみ → 性別に応じて HUSB/WIFE を補完", () => {
      const { tree, warnings } = importGedcom(
        gedcom("0 @I1@ INDI", "1 SEX M", "1 FAMS @F1@", "0 @I2@ INDI", "1 SEX F", "1 FAMS @F1@", "0 @F1@ FAM"),
      );
      expect(tree.families[0]).toMatchObject({ husband: { id: "I1" }, wife: { id: "I2" } });
      expect(warnings).toEqual(["F1 に配偶者 I1 を補完しました", "F1 に配偶者 I2 を補完しました"]);
    });

    it("性別不明なら空いている枠(HUSB → WIFE の順)に補完", () => {
      const { tree } = importGedcom(
        gedcom("0 @I1@ INDI", "1 FAMS @F1@", "0 @I2@ INDI", "1 SEX U", "1 FAMS @F1@", "0 @F1@ FAM"),
      );
      expect(tree.families[0]).toMatchObject({ husband: { id: "I1" }, wife: { id: "I2" } });
    });

    it("補完先の枠が埋まっていればエラー", () => {
      expect(() =>
        importGedcom(gedcom("0 @I1@ INDI", "1 SEX M", "1 FAMS @F1@", "0 @I2@ INDI", "0 @F1@ FAM", "1 HUSB @I2@")),
      ).toThrow(/I1 を F1 の配偶者として補完できません/);
    });

    it("INDI.FAMC のみ → CHIL を補完", () => {
      const { tree, warnings } = importGedcom(gedcom("0 @I1@ INDI", "1 FAMC @F1@", "0 @F1@ FAM"));
      expect(tree.families[0]!.children).toEqual([{ id: "I1", extras: [] }]);
      expect(warnings).toEqual(["F1 に子 I1 を補完しました"]);
    });

    it("FAM.HUSB/WIFE のみ → FAMS を補完", () => {
      const { tree, warnings } = importGedcom(
        gedcom("0 @I1@ INDI", "0 @I2@ INDI", "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@"),
      );
      expect(tree.individuals.map((i) => i.familiesAsSpouse)).toEqual([
        [{ id: "F1", extras: [] }],
        [{ id: "F1", extras: [] }],
      ]);
      expect(warnings).toEqual(["I1 に FAMS F1 を補完しました", "I2 に FAMS F1 を補完しました"]);
    });

    it("FAM.CHIL のみ → FAMC を補完", () => {
      const { tree, warnings } = importGedcom(gedcom("0 @I1@ INDI", "0 @F1@ FAM", "1 CHIL @I1@"));
      expect(tree.individuals[0]!.familiesAsChild).toEqual([{ id: "F1", extras: [] }]);
      expect(warnings).toEqual(["I1 に FAMC F1 を補完しました"]);
    });
  });

  describe("エラー", () => {
    it.each([
      ["HEAD が無い", "0 TRLR\n", /先頭に HEAD/],
      ["空ファイル", "", /先頭に HEAD/],
      ["TRLR が無い", "0 HEAD\n1 GEDC\n2 VERS 7.0\n", /末尾に TRLR/],
      ["HEAD のみ", "0 HEAD\n", /末尾に TRLR/],
      ["途中に HEAD", gedcom("0 HEAD"), /HEAD が先頭・末尾以外/],
      ["途中に TRLR", gedcom("0 TRLR"), /TRLR が先頭・末尾以外/],
      ["GEDC が無い", "0 HEAD\n0 TRLR\n", /VERS: なし/],
      ["7.x 以外", "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR\n", /VERS: 5.5.1/],
      ["xref の無い INDI", gedcom("0 INDI"), /INDI レコードに xref/],
      ["xref の重複", gedcom("0 @I1@ INDI", "0 @I1@ INDI"), /@I1@ が重複/],
      ["ポインタの無いリンク", gedcom("0 @I1@ INDI", "1 FAMS F1"), /I1 の FAMS にポインタ/],
      ["不正な SEX", gedcom("0 @I1@ INDI", "1 SEX male"), /I1 の SEX が不正/],
      ["値の無い SEX", gedcom("0 @I1@ INDI", "1 SEX"), /I1 の SEX が不正です: \(なし\)/],
      ["HUSB の重複", gedcom("0 @F1@ FAM", "1 HUSB @VOID@", "1 HUSB @VOID@"), /F1 に HUSB が複数/],
      ["存在しない参照", gedcom("0 @I1@ INDI", "1 FAMS @F9@"), /I1 が存在しない @F9@/],
      ["参照先の種別違い", gedcom("0 @I1@ INDI", "0 @F1@ FAM", "1 CHIL @F1@"), /F1 の参照先 @F1@ は INDI ではありません/],
      ["HEAD.SUBM の参照先が無い", "0 HEAD\n1 GEDC\n2 VERS 7.0\n1 SUBM @U1@\n0 TRLR\n", /HEAD が存在しない @U1@/],
    ])("%s", (_, source, message) => {
      const run = () => importGedcom(source);
      expect(run).toThrow(GedcomImportError);
      expect(run).toThrow(message);
    });

    it("構文エラーは GedcomSyntaxError のまま投げる", () => {
      expect(() => importGedcom("0 HEAD\nbroken")).toThrow(/2行目/);
    });
  });
});
