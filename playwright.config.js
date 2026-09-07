// Конфиг Playwright для интеграционного теста (улучшение 7). Минимальный: один проект
// (Chromium, headless), только test/e2e.spec.js. Playwright — отдельная dev-зависимость,
// в основной ноль-зависимостей поток (build + smoke) не входит; см. шапку test/e2e.spec.js.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./test",
    testMatch: /(e2e|visual)\.spec\.js$/,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "list" : "line",
    // Визуальные сравнения: небольшой допуск на сглаживание шрифтов и отключённые анимации,
    // иначе снимок ловит промежуточный кадр перехода и тест мигает без причины.
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled", caret: "hide" }
    },
    use: {
        headless: true,
        // file:// фикстура не требует сервера; трассы/скрины только при падении.
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } }
    ]
});
