// ============================================================
//  Генератор скриншотов панели для README (docs/screenshots/menu-<lang>-<tab>.png).
//  Снимает панель «Фон и дизайн» по всем пяти вкладкам в двух языках из тестовой фикстуры
//  (test/fixture.html + собранный custom-bg.js) через Playwright. Язык и набор задаются
//  «сидом» (window.__MLBG_SEED__) до загрузки скрипта (см. seedConfig в src/core/config.js).
//
//  Фикстуру отдаём через ЛОКАЛЬНЫЙ http-сервер (не file://): иначе браузер блокирует загрузку
//  миниатюр фото-наборов в чипах, и плитки 0–11 выходят пустыми. По http картинки грузятся.
//
//  Требуется Playwright (dev-зависимость):
//    npm i -D @playwright/test && npx playwright install chromium
//    node scripts/screenshots.js        (или: npm run screenshots — сам собирает custom-bg.js)
// ============================================================
"use strict";
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "screenshots");
const TABS = ["sets", "view", "terminal", "system", "data"]; // вкладки по индексам 0..4
// Язык + набор для акцента: RU — набор 4 (Хрустальное озеро, голубой), EN — набор 0 (Алые кроны, розовый).
const LANGS = [
    { code: "ru", mode: "4" },
    { code: "en", mode: "0" }
];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Минимальный статический сервер по корню репозитория (только чтение файлов внутри ROOT).
function startServer() {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            let p = decodeURIComponent((req.url || "/").split("?")[0]);
            if (p === "/") p = "/test/fixture.html";
            const full = path.resolve(ROOT, "." + (p.startsWith("/") ? p : "/" + p));
            if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(full, (err, buf) => {
                if (err) { res.writeHead(404); res.end(); return; }
                res.writeHead(200, { "Content-Type": TYPES[path.extname(full).toLowerCase()] || "application/octet-stream" });
                res.end(buf);
            });
        });
        srv.listen(0, "127.0.0.1", () => resolve({ srv, port: srv.address().port }));
    });
}

(async () => {
    if (!fs.existsSync(path.join(ROOT, "custom-bg.js"))) {
        console.error("Нет custom-bg.js — сначала собери: node build.js");
        process.exit(1);
    }
    fs.mkdirSync(OUT, { recursive: true });
    const { srv, port } = await startServer();
    const base = "http://127.0.0.1:" + port + "/test/fixture.html";
    const browser = await chromium.launch();
    try {
        for (const L of LANGS) {
            // Свежий контекст на язык: сид применяется до загрузки, retina-масштаб для чётких PNG.
            const ctx = await browser.newContext({ deviceScaleFactor: 2 });
            await ctx.addInitScript((seed) => { try { window.__MLBG_SEED__ = seed; } catch (e) {} },
                { lang: L.code, mode: L.mode, enabled: true });
            const page = await ctx.newPage();
            await page.goto(base, { waitUntil: "networkidle" });
            const btn = page.locator("#moonlight-bg-switcher");
            await btn.waitFor({ state: "visible", timeout: 8000 });
            await btn.click();
            const panel = page.locator("#moonlight-bg-panel");
            await panel.waitFor({ state: "visible" });
            const tabs = panel.getByRole("tab");
            for (let i = 0; i < TABS.length; i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(400); // дать раскрыться секциям и подгрузиться миниатюрам
                const file = path.join(OUT, "menu-" + L.code + "-" + TABS[i] + ".png");
                await panel.screenshot({ path: file });
                console.log("saved", path.relative(ROOT, file));
            }
            await ctx.close();
        }
        console.log("\nГотово: 10 скриншотов в docs/screenshots/.");
    } finally {
        await browser.close();
        srv.close();
    }
})().catch((e) => { console.error(e); process.exit(1); });
