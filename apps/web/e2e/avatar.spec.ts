import { expect, test, type Page } from "@playwright/test";
import { chooseImportFile, detailPanel, exportAs, fixture, openApp, selectPerson } from "./helpers";

const photo = (page: Page, name: string) => detailPanel(page).getByRole("img", { name: `${name} の写真` });

async function setPhoto(page: Page, file: string) {
  const chooser = page.waitForEvent("filechooser");
  await detailPanel(page).getByRole("button", { name: /^写真を(設定|変更)$/ }).click();
  await (await chooser).setFiles(fixture(file));
}

test.describe("写真", () => {
  test("写真を縮小して設定し、再読み込み後も残る。確認の上で削除する", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 恵子");
    await setPhoto(page, "photo.png");
    await expect(page.getByText("写真を設定しました")).toBeVisible();

    const src = await photo(page, "山田 恵子").getAttribute("src");
    // 600x400 の PNG を 192px 四方の WebP に縮小して保存する
    expect(src).toMatch(/^data:image\/webp;base64,/);
    expect(src!.length).toBeLessThan(20_000);
    const size = await photo(page, "山田 恵子").evaluate((img: HTMLImageElement) => {
      return img.decode().then(() => [img.naturalWidth, img.naturalHeight]);
    });
    expect(size).toEqual([192, 192]);

    await page.reload();
    await selectPerson(page, "山田 恵子");
    await expect(photo(page, "山田 恵子")).toHaveAttribute("src", src!);

    await detailPanel(page).getByRole("button", { name: "写真を削除" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();
    await expect(page.getByText("写真を削除しました")).toBeVisible();
    await expect(detailPanel(page).getByRole("img", { name: "写真なし" })).toBeVisible();
  });

  test("画像以外のファイルはエラーを表示する", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 恵子");
    await setPhoto(page, "empty.ged");
    await expect(page.getByText("画像ファイルを選択してください")).toBeVisible();
    await expect(detailPanel(page).getByRole("img", { name: "写真なし" })).toBeVisible();
  });

  test(".ged に写真を含めて出力し、読み込むと写真を復元する。PNG にも写真を描く", async ({ page }) => {
    await openApp(page);
    const before = await exportAs(page, "画像 (.png)");
    await selectPerson(page, "山田 恵子");
    await setPhoto(page, "photo.png");
    await expect(photo(page, "山田 恵子")).toBeVisible();
    const src = await photo(page, "山田 恵子").getAttribute("src");

    const ged = await exportAs(page, "GEDCOM (.ged)");
    const text = ged.body.toString("utf8");
    expect(text).toContain("1 OBJE @O1@");
    expect(text).toContain(`0 @O1@ OBJE\n1 FILE ${src}\n2 FORM image/webp\n`);

    // 画像の大きさは変わらず、写真の分だけ内容が変わる
    const after = await exportAs(page, "画像 (.png)");
    expect(after.body.readUInt32BE(16)).toBe(before.body.readUInt32BE(16));
    expect(after.body.equals(before.body)).toBe(false);

    // 写真を削除してから、出力した .ged を読み込み直す
    await detailPanel(page).getByRole("button", { name: "写真を削除" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();
    await expect(detailPanel(page).getByRole("img", { name: "写真なし" })).toBeVisible();

    await chooseImportFile(page, { name: ged.name, mimeType: "text/plain", buffer: ged.body });
    await page.getByRole("alertdialog").getByRole("button", { name: "読み込む" }).click();
    await selectPerson(page, "山田 恵子");
    await expect(photo(page, "山田 恵子")).toHaveAttribute("src", src!);
  });
});
