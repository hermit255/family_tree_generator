import { expect, test } from "@playwright/test";
import { closeDetail, detailPanel, nodeMenu, openApp, personButton, personList, selectPerson } from "./helpers";

test.describe("家系図の表示", () => {
  test("初回は同梱サンプルを起点ノードを中心に表示する", async ({ page }) => {
    await openApp(page);
    await expect(personButton(page, "山田 健一")).toHaveAttribute("aria-current", "true");
    // 家系図全体を表示する
    await expect(personList(page).getByRole("button")).toHaveCount(14);
    await expect(detailPanel(page)).toBeHidden();
    await expect(nodeMenu(page)).toBeHidden();
    // 中心へ移動するアニメーションの完了も toHaveScreenshot が待つ
    await expect(page.locator("canvas").first()).toHaveScreenshot("initial.png");
  });

  test("ノードのクリックで詳細パネルとメニューを開き、閉じられる", async ({ page, isMobile }) => {
    await openApp(page);
    const canvas = page.locator("canvas").first();
    // 起点ノードは canvas の中央に移動する。移動が終わるまで待ってから中央を押す
    await expect(canvas).toHaveScreenshot("initial.png");
    await (isMobile ? canvas.tap() : canvas.click());

    await expect(detailPanel(page).getByRole("heading", { name: "山田 健一" })).toBeVisible();
    await expect(detailPanel(page)).toContainText("男性");
    await expect(nodeMenu(page).getByRole("button")).toHaveText(["配偶者を追加", "子を追加", "養子縁組"]);

    await closeDetail(page);
    await expect(nodeMenu(page)).toBeHidden();
  });

  test("ノードの無い場所のクリックで選択を解除する", async ({ page, isMobile }) => {
    await openApp(page);
    await selectPerson(page, "山田 陽向");
    await expect(detailPanel(page)).toBeVisible();

    // 左上の隅はノード・線の無い場所
    const canvas = page.locator("canvas").first();
    const corner = { position: { x: 4, y: 4 } };
    await (isMobile ? canvas.tap(corner) : canvas.click(corner));
    await expect(detailPanel(page)).toBeHidden();
    await expect(nodeMenu(page)).toBeHidden();
    await expect(personList(page).locator("[aria-current]")).toHaveCount(0);
    await expect(personList(page).getByRole("button")).toHaveCount(14);
  });

  test("人物を選んでも表示範囲は変わらず、選んだ人物が中心になる", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 陽向");
    await expect(detailPanel(page).getByRole("heading", { name: "山田 陽向" })).toBeVisible();
    await expect(personButton(page, "山田 陽向")).toHaveAttribute("aria-current", "true");
    await expect(personList(page).getByRole("button")).toHaveCount(14);
  });
});
