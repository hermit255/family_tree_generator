import { expect, test } from "@playwright/test";
import {
  chooseImportFile,
  chooseNew,
  detailPanel,
  exportAs,
  exportItem,
  openApp,
  personButton,
  personList,
} from "./helpers";

const FILE_NAME = /^kakeizu-\d{8}\.(ged|png|pdf)$/;

test.describe("新規作成", () => {
  test("確認後に名前未設定の1人だけになり、再読み込み後も残る", async ({ page }) => {
    await openApp(page);
    await chooseNew(page);
    await page.getByRole("alertdialog").getByRole("button", { name: "作成する" }).click();
    await expect(personList(page).getByRole("button")).toHaveText(["名前未設定"]);
    await expect(personButton(page, "名前未設定")).toHaveAttribute("aria-current", "true");

    await page.reload();
    await expect(personList(page).getByRole("button")).toHaveText(["名前未設定"]);
  });

  test("キャンセルすると現在のデータを維持する", async ({ page }) => {
    await openApp(page);
    await chooseNew(page);
    await page.getByRole("alertdialog").getByRole("button", { name: "キャンセル" }).click();
    await expect(personButton(page, "山田 健一")).toBeVisible();
  });
});

test.describe("インポート", () => {
  test("確認後に置き換え、片方向リンクの補完を一覧表示する", async ({ page }) => {
    await openApp(page);
    await chooseImportFile(page, "one-way-link.ged");
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("one-way-link.ged を読み込みますか？");
    await confirm.getByRole("button", { name: "読み込む" }).click();

    const warnings = page.getByRole("dialog", { name: "読み込みました" });
    await expect(warnings.getByRole("listitem")).toHaveCount(1);
    await warnings.getByRole("button", { name: "閉じる" }).first().click();
    await expect(personList(page).getByRole("button")).toHaveText(["鈴木 二郎", "鈴木 一郎"]);
    await expect(personButton(page, "鈴木 一郎")).toHaveAttribute("aria-current", "true");
  });

  test("キャンセルすると現在のデータを維持する", async ({ page }) => {
    await openApp(page);
    await chooseImportFile(page, "one-way-link.ged");
    await page.getByRole("alertdialog").getByRole("button", { name: "キャンセル" }).click();
    await expect(personButton(page, "山田 健一")).toBeVisible();
  });

  test("読み込めないファイルはエラーを表示し、現在のデータを維持する", async ({ page }) => {
    await openApp(page);
    await chooseImportFile(page, "unsupported-version.ged");
    await page.getByRole("alertdialog").getByRole("button", { name: "読み込む" }).click();
    await expect(page.getByText(/読み込みに失敗しました/)).toBeVisible();
    await expect(personButton(page, "山田 健一")).toBeVisible();
  });

  test("人物が0人のデータでは最初の人物を追加でき、画像は出力できない", async ({ page }) => {
    await openApp(page);
    await chooseImportFile(page, "empty.ged");
    await page.getByRole("alertdialog").getByRole("button", { name: "読み込む" }).click();
    await expect(page.getByText("家系図のデータがありません")).toBeVisible();

    await expect(await exportItem(page, "画像 (.png)")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("menuitem", { name: "PDF (.pdf)" })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "最初の人物を追加" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("姓").fill("佐々木");
    await dialog.getByRole("button", { name: "追加" }).click();
    await expect(personButton(page, "佐々木")).toHaveAttribute("aria-current", "true");
    await expect(detailPanel(page)).toBeHidden();
  });
});

test.describe("エクスポート", () => {
  test(".ged は編集後の現在のデータを出力する", async ({ page }) => {
    await openApp(page);
    await chooseImportFile(page, "one-way-link.ged");
    await page.getByRole("alertdialog").getByRole("button", { name: "読み込む" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).first().click();

    const file = await exportAs(page, "GEDCOM (.ged)");
    expect(file.name).toMatch(FILE_NAME);
    const text = file.body.toString("utf8");
    expect(text).toMatch(/^0 HEAD\n1 GEDC\n2 VERS 7\.0\n/);
    // 補完した双方向リンクが出力される
    expect(text).toContain("1 FAMC @F1@");
    expect(text).toContain("1 CHIL @I1@");
  });

  test("PNG は家系図全体の画像を出力する", async ({ page }) => {
    await openApp(page);
    const file = await exportAs(page, "画像 (.png)");
    expect(file.name).toMatch(FILE_NAME);
    expect(file.body.subarray(1, 4).toString("latin1")).toBe("PNG");
    // 画面の大きさに依存せず、同梱サンプルの家系図全体を2倍の解像度で描く
    expect({ width: file.body.readUInt32BE(16), height: file.body.readUInt32BE(20) }).toEqual({
      width: 1688,
      height: 1152,
    });
  });

  test("PDF は A4 1ページで出力する", async ({ page }) => {
    await openApp(page);
    const file = await exportAs(page, "PDF (.pdf)");
    expect(file.name).toMatch(FILE_NAME);
    const pdf = file.body.toString("latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
    // 同梱サンプルは横長のため A4 横向き(842 x 595 pt)
    expect(pdf).toMatch(/\/MediaBox \[0 0 841\.\d+ 595\.\d+\]/);
  });
});
