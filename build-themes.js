#!/usr/bin/env node
// ============================================================
//  Генератор устанавливаемых VS Code-тем из встроенных наборов MoonLight.
//
//  Зачем: сам фон (custom-bg.js) рисуется через be5invis.vscode-custom-css и недоступен там,
//  где патчить редактор нельзя (vscode.dev, часть удалёнок, политики). Цветовая ЧАСТЬ вида
//  (палитра интерфейса + подсветка синтаксиса) переносима как обычная тема VS Code. Этот скрипт
//  прогоняет тот же buildColorTheme(idx), что и панель («Экспорт темы»), но в Node-песочнице,
//  и для КАЖДОГО встроенного набора кладёт готовый color-theme.json в extension/themes/, а затем
//  прописывает их в extension/package.json -> contributes.themes. После установки расширения
//  темы «MoonLight <набор>» появляются в стандартном выборе тем и находятся поиском.
//
//  Запуск:  node build-themes.js
//  Источник правды палитры — src/** (тот же код, что и в собранном custom-bg.js), поэтому
//  темы не расходятся с «Экспортом темы» в панели.
// ============================================================
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const FILES = require(path.join(ROOT, "build.js")).FILES;
const THEMES_DIR = path.join(ROOT, "extension", "themes");
const EXT_PKG = path.join(ROOT, "extension", "package.json");

// ---- Минимальный DOM/браузер-стаб (как в test/smoke.js) — ровно чтобы src выполнился
//      и стали доступны buildColorTheme/SETS/setName/cfg. Ничего не рисуем и не грузим.
const noop = function () {};
function el(tag) {
    return {
        tagName: tag, style: { cssText: "", setProperty: noop, removeProperty: noop }, children: [], _attrs: {},
        appendChild: function (c) { this.children.push(c); return c; }, insertBefore: function (c) { this.children.push(c); return c; },
        removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
        setAttribute: function (k, v) { this._attrs[k] = String(v); }, getAttribute: function (k) { return k in this._attrs ? this._attrs[k] : null; },
        querySelector: function () { return null; }, querySelectorAll: function () { return []; },
        getContext: function () { return null; }, getBoundingClientRect: function () { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
        contains: function () { return false; }, classList: { add: noop, remove: noop, contains: function () { return false; } },
        focus: noop, click: noop, offsetParent: null, width: 0, height: 0, textContent: "", className: "", id: ""
    };
}
function makeSandbox() {
    const wb = el("div"); wb.className = "monaco-workbench vs-dark";
    const document = {
        currentScript: { src: "vscode-file://vscode-app/x/custom-bg.js" },
        head: el("head"), body: el("body"), documentElement: el("html"), hidden: false,
        getElementById: function () { return null; }, createElement: el,
        querySelector: function (s) { return s && s.indexOf("monaco-workbench") >= 0 ? wb : null; },
        querySelectorAll: function () { return []; }, addEventListener: noop, removeEventListener: noop,
        contains: function () { return true; }, get activeElement() { return null; }, execCommand: function () { return true; }
    };
    const sandbox = {
        document: document, console: { log: noop, warn: noop, error: noop },
        localStorage: { getItem: function () { return null; }, setItem: noop, removeItem: noop },
        navigator: { clipboard: { writeText: noop } },
        btoa: function (s) { return Buffer.from(String(s), "binary").toString("base64"); },
        atob: function (s) { return Buffer.from(String(s), "base64").toString("binary"); },
        matchMedia: function () { return { matches: false, addEventListener: noop, addListener: noop }; },
        requestAnimationFrame: function () { return 1; }, cancelAnimationFrame: noop,
        setInterval: function () { return 1; }, clearInterval: noop, setTimeout: function () { return 1; }, clearTimeout: noop,
        innerWidth: 1280, innerHeight: 800, addEventListener: noop, removeEventListener: noop,
        Image: function () {}, MutationObserver: function () { this.observe = noop; this.disconnect = noop; },
        Blob: function () {}, URL: { createObjectURL: function () { return ""; }, revokeObjectURL: noop }, FileReader: function () {}
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    return sandbox;
}

function run() {
    const code = FILES.map(function (f) {
        const full = path.join(ROOT, f);
        if (!fs.existsSync(full)) { console.error("Нет файла: " + f); process.exit(2); }
        return "// ==== " + f + " ====\n" + fs.readFileSync(full, "utf8");
    }).join("\n");
    const sb = makeSandbox();
    vm.runInNewContext(code, sb, { filename: "custom-bg.concat.js" });
    if (typeof sb.buildColorTheme !== "function" || !Array.isArray(sb.SETS)) {
        console.error("build-themes: buildColorTheme/SETS недоступны — проверь src/**"); process.exit(1);
    }

    // Чистим и пересоздаём папку тем — чтобы удалённые/переименованные наборы не оставляли
    // «осиротевшие» файлы (contributes.themes перегенерируется целиком под текущие SETS).
    if (fs.existsSync(THEMES_DIR)) {
        fs.readdirSync(THEMES_DIR).forEach(function (n) {
            if (/-color-theme\.json$/.test(n)) fs.unlinkSync(path.join(THEMES_DIR, n));
        });
    } else {
        fs.mkdirSync(THEMES_DIR, { recursive: true });
    }

    const seen = {}, contributes = [];
    for (let i = 0; i < sb.SETS.length; i++) {
        const t = sb.buildColorTheme(i);
        let slug = sb._slug(sb.setName(i)) || ("set-" + i);
        if (seen[slug]) slug = slug + "-" + i;      // защита от коллизии слагов
        seen[slug] = 1;
        const file = "moonlight-" + slug + "-color-theme.json";
        fs.writeFileSync(path.join(THEMES_DIR, file), JSON.stringify(t.obj, null, 2) + "\n", "utf8");
        contributes.push({ label: t.name, uiTheme: "vs-dark", path: "./themes/" + file });
    }

    // Прописываем сгенерированные темы в extension/package.json (сохраняя остальной контент и
    // существующие contributes.commands). Пишем с отступом 2 пробела, как в исходном файле.
    const pkg = JSON.parse(fs.readFileSync(EXT_PKG, "utf8"));
    pkg.contributes = pkg.contributes || {};
    pkg.contributes.themes = contributes;
    // Расширение теперь поставляет темы -> добавляем категорию «Themes» (находимость в
    // маркетплейсе/поиске тем). Не дублируем, если уже есть.
    if (!Array.isArray(pkg.categories)) pkg.categories = [];
    if (pkg.categories.indexOf("Themes") < 0) pkg.categories.push("Themes");
    fs.writeFileSync(EXT_PKG, JSON.stringify(pkg, null, 2) + "\n", "utf8");

    console.log("OK: сгенерировано тем — " + contributes.length + " (extension/themes/), прописаны в contributes.themes.");
    return contributes.length;
}

if (require.main === module) run();
module.exports = { run };
