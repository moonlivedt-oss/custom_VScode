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
    // Визуальные сравнения: допуск на сглаживание и отключённые анимации, иначе снимок ловит
    // промежуточный кадр перехода и тест мигает без причины. Порог 0.01 (~1% пикселей) закрывает
    // кросс-машинную разницу растеризации: эталоны снимаются на реальном GPU, а CI-джоб идёт на
    // windows-latest с софтверным SwiftShader — градиенты, canvas и масштабирование картинок он
    // сглаживает иначе, давая стабильные ~0.25% отличий на полноэкранных заливках. Реальную
    // регрессию вида (съехавшее стекло, перекрытый оверлей) это ловит: там разница на порядки выше.
    expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" }
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
