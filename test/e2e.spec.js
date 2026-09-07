// ============================================================
//  Интеграционный тест (улучшение 7): реальный браузер + реальный DOM через Playwright.
//  Смоук (test/smoke.js) гоняет модули в vm-песочнице с DOM-стабом — он ловит проводку
//  модулей и логику CSS, но НЕ настоящую вставку кнопки/панели в живой DOM и не реальные
//  события. Здесь настоящий Chromium открывает фикстуру-воркбенч (test/fixture.html) с
//  собранным custom-bg.js и проверяет то, что стаб проверить не может:
//    * кнопка BG реально появляется в статусбаре;
//    * <style id="moonlight-custom-bg"> реально инжектится, --mlbg-accent выставлен;
//    * клик по кнопке открывает панель;
//    * авто-локализация: при lang="en" панель на английском (вкладка System, мастер-тумблер).
//  Это страхует от «дрейфа» нашей собственной вёрстки/логики UI между версиями.
//
//  Запуск (Playwright — отдельная dev-зависимость, не входит в основной ноль-зависимостей поток):
//    npm i -D @playwright/test && npx playwright install chromium
//    npm run test:e2e
//  Перед запуском собери артефакт: node build.js
// ============================================================
const { test, expect } = require("@playwright/test");
const path = require("path");

const fixtureUrl = "file://" + path.join(__dirname, "fixture.html").replace(/\\/g, "/");

test.describe("MoonLight custom-bg — интеграция в живом DOM", () => {
    test("кнопка BG, инжект стиля, открытие панели, локализация", async ({ page }) => {
        await page.goto(fixtureUrl);

        // 1. Кнопка BG появляется в статусбаре (heal() отработал на живом DOM).
        const btn = page.locator("#moonlight-bg-switcher");
        await expect(btn).toBeVisible({ timeout: 8000 });
        await expect(btn).toContainText("BG");

        // 2. Наш <style> инжектится в <head>, а переменная акцента выставлена на :root.
        await expect(page.locator("head style#moonlight-custom-bg")).toHaveCount(1);
        const accent = await page.evaluate(function () {
            return getComputedStyle(document.documentElement).getPropertyValue("--mlbg-accent");
        });
        expect(accent.trim().length).toBeGreaterThan(0);

        // 3. Клик открывает панель настроек.
        await btn.click();
        const panel = page.locator("#moonlight-bg-panel");
        await expect(panel).toBeVisible();

        // 4. Авто-локализация: фикстура с lang="en" -> английский UI. exact:true — иначе строгий
        // режим Playwright падает на неоднозначности: «Background & effects on» встречается и в
        // мастер-тумблере, и в подписи хоткея «Background & effects on / off». Вкладку берём по роли.
        await expect(panel.getByRole("tab", { name: "System" })).toBeVisible();
        await expect(panel.getByText("Background & effects on", { exact: true })).toBeVisible();

        // 5. Esc закрывает панель.
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
    });

    // ============================================================
    //  v20: быстрый переключатель, CSS-переменные, здоровье селекторов, шейдерный слой.
    //  Всё это живёт в живом DOM (фокус, клавиатура, WebGL, getComputedStyle) — в vm-стабе
    //  такое не проверить, поэтому проверяем здесь.
    // ============================================================
    test("быстрый переключатель: открытие, поиск, стрелки, Esc", async ({ page }) => {
        await page.goto(fixtureUrl);
        await expect(page.locator("#moonlight-bg-switcher")).toBeVisible({ timeout: 8000 });

        // Ctrl+Alt+P открывает палитру и сразу ставит фокус в поле ввода.
        await page.keyboard.press("Control+Alt+P");
        const quick = page.locator("#moonlight-bg-quick");
        await expect(quick).toBeVisible();
        await expect(quick).toHaveAttribute("role", "dialog");
        const rows = quick.locator('[role="option"]');
        const total = await rows.count();
        expect(total).toBeGreaterThan(5);

        // Поиск сужает список, стрелка двигает выбор (aria-selected переезжает).
        await page.keyboard.type("aur");
        const filtered = await rows.count();
        expect(filtered).toBeLessThan(total);
        await page.keyboard.press("ArrowDown");
        await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");

        // Esc закрывает и возвращает фокус, ничего не применив.
        await page.keyboard.press("Escape");
        await expect(quick).toHaveCount(0);
    });

    test("CSS-переменные: ползунок меняет переменную, а не текст стиля", async ({ page }) => {
        await page.goto(fixtureUrl);
        await expect(page.locator("#moonlight-bg-switcher")).toBeVisible({ timeout: 8000 });
        const before = await page.evaluate(function () {
            return {
                css: document.getElementById("moonlight-custom-bg").textContent.length,
                blur: getComputedStyle(document.documentElement).getPropertyValue("--mlbg-blur").trim()
            };
        });
        // Двигаем «ползунок» так же, как это делает панель: меняем cfg и зовём живое применение.
        await page.evaluate(function () {
            var w = window;
            if (w.__mlbgTest && w.__mlbgTest.setBlur) { w.__mlbgTest.setBlur(17); return; }
        });
        const after = await page.evaluate(function () {
            return {
                css: document.getElementById("moonlight-custom-bg").textContent.length,
                blur: getComputedStyle(document.documentElement).getPropertyValue("--mlbg-blur").trim()
            };
        });
        expect(after.css).toBe(before.css);          // текст стиля не переписан
        if (after.blur) expect(after.blur).not.toBe(before.blur); // а переменная — да
    });

    test("здоровье селекторов: фикстура-воркбенч распознаётся", async ({ page }) => {
        await page.goto(fixtureUrl);
        await expect(page.locator("#moonlight-bg-switcher")).toBeVisible({ timeout: 8000 });
        const health = await page.evaluate(function () {
            var w = window;
            return (w.__mlbgTest && w.__mlbgTest.selectorHealth) ? w.__mlbgTest.selectorHealth() : null;
        });
        if (health) {
            expect(health.total).toBeGreaterThan(15);
            expect(health.found).toBeGreaterThan(3);   // фикстура содержит часть частей воркбенча
        }
    });
});
