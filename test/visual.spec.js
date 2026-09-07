// ============================================================
//  Визуальные регрессии.
//
//  Смоук проверяет ТЕКСТ собранного CSS: есть ли нужная строка, попал ли акцент. Но «стекло
//  съехало», «оверлей перекрыл код», «чип набора стал прозрачным» — это состояния, при которых
//  все строки на месте, а выглядит неправильно. Здесь снимок фикстуры сравнивается с эталоном,
//  и такие правки становятся видимыми.
//
//  Эталоны лежат рядом (test/visual.spec.js-snapshots/) и привязаны к платформе: Playwright
//  сам добавляет к имени суффикс вида -chromium-win32. Поэтому джоб в CI работает на той же
//  ОС, что и эталоны, а допуск maxDiffPixelRatio закрывает мелкую разницу сглаживания шрифтов.
//
//  Обновить эталоны после осознанной правки вида:  npm run test:visual:update
// ============================================================
const { test, expect } = require("@playwright/test");
const path = require("path");

const fixtureUrl = "file://" + path.join(__dirname, "fixture.html").replace(/\\/g, "/");

// Каждый снимок — это набор + состояние панели. Берём по одному представителю каждого типа
// источника фона: у них принципиально разный путь отрисовки (картинка, вырез мастер-кадра,
// CSS-градиент, процедурная текстура на canvas).
const CASES = [
    { name: "set-photo", mode: "0", note: "фото-набор: три отдельные картинки зон" },
    { name: "set-master", mode: "25", note: "мастер-кадр: все зоны — вырезы одного файла" },
    { name: "set-gradient", mode: "12", note: "генеративный набор: CSS-градиент без ассетов" },
    { name: "set-procedural", mode: "18", note: "процедурная текстура: canvas -> data-URL" },
];

async function openFixture(page, seed) {
    await page.addInitScript((s) => {
        try { localStorage.setItem("moonlight-bg-onboarded", "1"); } catch (e) {}
        window.__MLBG_SEED__ = s;
    }, seed);
    await page.goto(fixtureUrl);
    await expect(page.locator("#moonlight-bg-switcher")).toBeVisible({ timeout: 8000 });
    // Дать пробам картинок и первому циклу самолечения отработать: иначе снимок поймает
    // промежуточное состояние (мини-превью вместо полной картинки).
    await page.waitForTimeout(1200);
}

test.describe("Визуальные регрессии", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
    });

    for (const c of CASES) {
        test("фон: " + c.name, async ({ page }) => {
            await openFixture(page, { lang: "ru", enabled: true, perfGuard: false, mode: c.mode });
            await expect(page).toHaveScreenshot(c.name + ".png", { fullPage: false });
        });
    }

    test("панель: вкладка «Набор»", async ({ page }) => {
        await openFixture(page, { lang: "ru", enabled: true, perfGuard: false, mode: "0", ui: { tab: 0 } });
        await page.locator("#moonlight-bg-switcher").click();
        const panel = page.locator("#moonlight-bg-panel");
        await expect(panel).toBeVisible();
        await page.waitForTimeout(600); // миниатюры чипов приходят из проб картинок
        await expect(panel).toHaveScreenshot("panel-sets.png");
    });

    test("панель: вкладка «Вид» с эффектами", async ({ page }) => {
        await openFixture(page, { lang: "ru", enabled: true, perfGuard: false, mode: "0", ui: { tab: 1 } });
        await page.locator("#moonlight-bg-switcher").click();
        const panel = page.locator("#moonlight-bg-panel");
        await expect(panel).toBeVisible();
        await page.waitForTimeout(400);
        await expect(panel).toHaveScreenshot("panel-view.png");
    });

    test("быстрый переключатель", async ({ page }) => {
        await openFixture(page, { lang: "ru", enabled: true, perfGuard: false, mode: "0" });
        await page.keyboard.press("Control+Alt+P");
        const quick = page.locator("#moonlight-bg-quick");
        await expect(quick).toBeVisible();
        await page.waitForTimeout(300);
        await expect(quick).toHaveScreenshot("quick-switcher.png");
    });

    test("мастер-выключатель: без фона и эффектов", async ({ page }) => {
        await openFixture(page, { lang: "ru", enabled: false, mode: "0" });
        await expect(page).toHaveScreenshot("disabled.png");
    });
});
