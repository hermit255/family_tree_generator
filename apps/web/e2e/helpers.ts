import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Download, type Page } from "@playwright/test";

/** アプリの DESKTOP_QUERY (min-width: 768px) に合わせる */
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

export const fixture = (name: string) => path.join(__dirname, "fixtures", name);

/** トップページを開き、家系図の描画を待つ(各テストは新しいコンテキストのため同梱サンプルから始まる) */
export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();
}

/** canvas に描かれた人物の一覧(スクリーンリーダー・キーボード向け) */
export const personList = (page: Page) => page.getByRole("navigation", { name: "表示中の人物" });

export const personButton = (page: Page, name: string) => personList(page).getByRole("button", { name, exact: true });

/** キーボード操作で人物を選ぶ(一覧は画面上非表示のためクリックではなく Enter で選ぶ) */
export async function selectPerson(page: Page, name: string) {
  await personButton(page, name).press("Enter");
  await expect(personButton(page, name)).toHaveAttribute("aria-current", "true");
}

export const detailPanel = (page: Page) => page.getByRole("region", { name: "人物の詳細" });

export async function closeDetail(page: Page) {
  // デスクトップはパネル内の×、スマホは下部シートの閉じるボタン
  await page.getByRole("button", { name: isMobile(page) ? "閉じる" : "詳細を閉じる", exact: true }).click();
  await expect(detailPanel(page)).toBeHidden();
}

export const nodeMenu = (page: Page) => page.getByRole("navigation", { name: "人物の追加" });

/** 追加ダイアログに入力して追加する。choice は続柄・配偶者などの選択肢 */
export async function fillAddDialog(page: Page, input: { surname: string; givenName: string; choice?: string }) {
  const dialog = page.getByRole("dialog");
  if (input.choice) await dialog.getByRole("radio", { name: input.choice }).click();
  await dialog.getByLabel("姓").fill(input.surname);
  await dialog.getByLabel("名").fill(input.givenName);
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText(`${input.surname} ${input.givenName} を追加しました`)).toBeVisible();
}

/** ヘッダーのメニュー項目を開く(スマホはメニューに集約されている) */
async function openHeaderMenu(page: Page, desktopTrigger: string) {
  await page.getByRole("button", { name: isMobile(page) ? "メニュー" : desktopTrigger }).click();
}

export const exportItem = async (page: Page, label: string) => {
  await openHeaderMenu(page, "エクスポート");
  return page.getByRole("menuitem", { name: label });
};

/** ヘッダーからエクスポートし、ダウンロードしたファイルの名前と中身を返す */
export async function exportAs(page: Page, label: string): Promise<{ name: string; body: Buffer }> {
  const item = await exportItem(page, label);
  const [download] = await Promise.all([page.waitForEvent("download"), item.click()]);
  return { name: download.suggestedFilename(), body: await readDownload(download) };
}

const readDownload = async (download: Download) => readFile((await download.path())!);

/** ダウンロードしたファイルなど、ディスク上に無いファイルの中身 */
export type FilePayload = { name: string; mimeType: string; buffer: Buffer };

/** ヘッダーのインポートからファイル(fixtures のファイル名、またはファイルの中身)を選ぶ(この後に置き換えの確認ダイアログが開く) */
export async function chooseImportFile(page: Page, file: string | FilePayload) {
  const chooser = page.waitForEvent("filechooser");
  if (isMobile(page)) {
    await openHeaderMenu(page, "インポート");
    await page.getByRole("menuitem", { name: "インポート" }).click();
  } else {
    await page.getByRole("button", { name: "インポート" }).click();
  }
  await (await chooser).setFiles(typeof file === "string" ? fixture(file) : file);
}

/** ヘッダーの新規作成を押す(この後に確認ダイアログが開く) */
export async function chooseNew(page: Page) {
  if (isMobile(page)) {
    await openHeaderMenu(page, "新規作成");
    await page.getByRole("menuitem", { name: "新規作成" }).click();
  } else {
    await page.getByRole("button", { name: "新規作成" }).click();
  }
}
