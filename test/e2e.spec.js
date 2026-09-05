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

        // 4. Авто-локализация: фикстура с lang="en" -> английский UI.
        await expect(panel.getByText("System", { exact: false })).toBeVisible();
        await expect(panel.getByText("Background & effects on", { exact: false })).toBeVisible();

        // 5. Esc закрывает панель.
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
    });
});
