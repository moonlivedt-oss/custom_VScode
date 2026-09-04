#!/usr/bin/env node
// ============================================================
//  Установщик MoonLight custom-bg (без зависимостей).
//  Прописывает путь к custom-bg.js в vscode_custom_css.imports пользовательского
//  settings.json VS Code (и форков: Cursor / VSCodium / Windsurf / Code - OSS),
//  которые найдёт на этой машине. Сам скрипт custom-bg.js грузит расширение
//  be5invis.vscode-custom-css — его нужно поставить отдельно и включить командой
//  «Enable Custom CSS and JS» (об этом скрипт напомнит в конце).
//
//  Запуск:  node install.js            — обновить все найденные приложения
//           node install.js --app code — только VS Code (code|cursor|vscodium|windsurf|oss)
//           node install.js --dry       — показать, что будет сделано, ничего не записывая
//
//  Безопасность: если settings.json содержит комментарии/висячие запятые (JSONC) и не
//  парсится как строгий JSON, файл НЕ трогаем — показываем готовый сниппет для ручной
//  вставки. Так исключаем порчу пользовательских настроек.
// ============================================================
"use strict";
var fs = require("fs");
var path = require("path");
var os = require("os");

var ROOT = __dirname;
var TARGET = path.join(ROOT, "custom-bg.js");

// file:///-URL к custom-bg.js: прямые слэши, на Windows добавляем третий слэш перед диском.
function fileUrl(p) {
    var abs = path.resolve(p).replace(/\\/g, "/");
    return "file:///" + abs.replace(/^\/+/, "");
}

// Каталоги пользовательских настроек по ОС и приложению. Ключ — короткое имя приложения.
function userDirs() {
    var home = os.homedir(), plat = process.platform, base;
    if (plat === "win32") base = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    else if (plat === "darwin") base = path.join(home, "Library", "Application Support");
    else base = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
    var apps = { code: "Code", cursor: "Cursor", vscodium: "VSCodium", windsurf: "Windsurf", oss: "Code - OSS" };
    var out = {};
    Object.keys(apps).forEach(function (k) { out[k] = path.join(base, apps[k], "User", "settings.json"); });
    return out;
}

function parseArgs() {
    var a = process.argv.slice(2), opt = { app: null, dry: false };
    for (var i = 0; i < a.length; i++) {
        if (a[i] === "--dry" || a[i] === "-n") opt.dry = true;
        else if (a[i] === "--app") opt.app = (a[++i] || "").toLowerCase();
        else if (a[i].indexOf("--app=") === 0) opt.app = a[i].slice(6).toLowerCase();
    }
    return opt;
}

// Вставка URL в vscode_custom_css.imports. Возвращает { changed, reason, obj }.
function addImport(obj, url) {
    var key = "vscode_custom_css.imports";
    var arr = obj[key];
    if (!Array.isArray(arr)) arr = [];
    for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] === "string" && arr[i].toLowerCase() === url.toLowerCase()) {
            return { changed: false, reason: "уже прописан" };
        }
    }
    arr.push(url);
    obj[key] = arr;
    return { changed: true };
}

function manualSnippet(url) {
    return '  "vscode_custom_css.imports": [\n    "' + url + '"\n  ]';
}

function handle(appKey, file, url, dry) {
    if (!fs.existsSync(file)) return { app: appKey, status: "нет (пропуск)" };
    var raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch (e) { return { app: appKey, status: "не читается: " + e.message }; }
    var obj;
    try { obj = raw.trim() ? JSON.parse(raw) : {}; }
    catch (e) {
        return { app: appKey, status: "JSONC/невалидный JSON — правь вручную", manual: true };
    }
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
        return { app: appKey, status: "settings.json не объект — правь вручную", manual: true };
    }
    var res = addImport(obj, url);
    if (!res.changed) return { app: appKey, status: res.reason };
    if (dry) return { app: appKey, status: "будет добавлено (dry-run)" };
    try {
        // резервная копия рядом — откат при желании
        try { fs.writeFileSync(file + ".mlbg-bak", raw, "utf8"); } catch (e) {}
        fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
    } catch (e) { return { app: appKey, status: "не удалось записать: " + e.message }; }
    return { app: appKey, status: "добавлено ✓ (бэкап: settings.json.mlbg-bak)" };
}

function main() {
    var opt = parseArgs();
    if (!fs.existsSync(TARGET)) {
        console.error("Не найден " + TARGET + " — сначала собери проект: node build.js");
        process.exit(1);
    }
    var url = fileUrl(TARGET);
    var dirs = userDirs();
    var keys = opt.app ? [opt.app] : Object.keys(dirs);
    console.log("MoonLight custom-bg — установщик");
    console.log("Путь скрипта: " + url + (opt.dry ? "   (dry-run, без записи)" : ""));
    console.log("");
    var anyManual = false, anyChanged = false;
    keys.forEach(function (k) {
        if (!dirs[k]) { console.log("  " + k + ": неизвестное приложение (code|cursor|vscodium|windsurf|oss)"); return; }
        var r = handle(k, dirs[k], url, opt.dry);
        console.log("  " + r.app + ": " + r.status);
        if (r.manual) anyManual = true;
        if (/добавлено|будет добавлено/.test(r.status)) anyChanged = true;
    });
    if (anyManual) {
        console.log("\nДля приложений с JSONC добавь вручную в settings.json:");
        console.log(manualSnippet(url));
    }
    console.log("\nДальше:");
    console.log("  1) Поставь расширение be5invis.vscode-custom-css (если ещё нет).");
    console.log("  2) Палитра команд → «Enable Custom CSS and JS».");
    console.log("  3) Полностью перезапусти редактор (File → Exit).");
    if (!anyChanged && !anyManual) console.log("\n(Изменений не потребовалось — путь уже прописан везде, где нашлись настройки.)");
}

main();
