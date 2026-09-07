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
    var a = process.argv.slice(2), opt = { app: null, dry: false, loader: null };
    for (var i = 0; i < a.length; i++) {
        if (a[i] === "--dry" || a[i] === "-n") opt.dry = true;
        else if (a[i] === "--app") opt.app = (a[++i] || "").toLowerCase();
        else if (a[i].indexOf("--app=") === 0) opt.app = a[i].slice(6).toLowerCase();
        else if (a[i] === "--loader") opt.loader = (a[++i] || "").toLowerCase();
        else if (a[i].indexOf("--loader=") === 0) opt.loader = a[i].slice(9).toLowerCase();
    }
    return opt;
}

// ===== Два загрузчика (улучшение 1, v20) =====
// Скрипт в окно VS Code внедряет отдельное расширение. Их два, и они по-разному записывают
// импорт в settings.json:
//   * be5invis.vscode-custom-css   -> "vscode_custom_css.imports": ["file:///…/custom-bg.js"]
//   * subframe7536.custom-ui-style -> "custom-ui-style.external.imports": [{ "type":"js", "url":"…" }]
// Второй заметно надёжнее: он делает бэкап оригиналов редактора, восстанавливает их перед
// каждым патчем, гасит предупреждение «installation appears corrupt» и умеет опции Electron
// (настоящая прозрачность окна). Поэтому установщик определяет, что стоит на машине, и
// пишет импорт в нужном формате; если не найден ни один — прописывает оба, чтобы фон
// заработал сразу после установки любого из расширений.
var LOADERS = {
    "custom-css": { key: "vscode_custom_css.imports", ext: "be5invis.vscode-custom-css", title: "Custom CSS and JS (be5invis)" },
    "custom-ui-style": { key: "custom-ui-style.external.imports", ext: "subframe7536.custom-ui-style", title: "Custom UI Style" }
};
// Установлено ли расширение: ищем его папку в ~/.vscode/extensions (и в аналогах форков).
// API у нас нет (мы не внутри редактора), но папка расширения — надёжный признак.
function extInstalled(extId) {
    var home = os.homedir();
    var dirs = [".vscode", ".vscode-oss", ".vscode-insiders", ".cursor", ".windsurf", ".vscodium"];
    for (var i = 0; i < dirs.length; i++) {
        var d = path.join(home, dirs[i], "extensions");
        var list = [];
        try { list = fs.readdirSync(d); } catch (e) { continue; }
        for (var j = 0; j < list.length; j++) {
            if (list[j].toLowerCase().indexOf(extId.toLowerCase() + "-") === 0) return true;
        }
    }
    return false;
}
// Какие загрузчики прописывать: явный --loader, иначе найденные на машине, иначе оба.
function pickLoaders(force) {
    if (force && LOADERS[force]) return [force];
    var found = Object.keys(LOADERS).filter(function (k) { return extInstalled(LOADERS[k].ext); });
    return found.length ? found : ["custom-css", "custom-ui-style"];
}
// Запись импорта в формате конкретного загрузчика. Возвращает { changed, reason }.
function addImport(obj, url, loader) {
    var key = LOADERS[loader].key;
    var arr = obj[key];
    if (!Array.isArray(arr)) arr = [];
    var i, e, u;
    for (i = 0; i < arr.length; i++) {
        e = arr[i];
        u = (typeof e === "string") ? e : (e && typeof e === "object" && typeof e.url === "string") ? e.url : "";
        if (u && u.toLowerCase() === url.toLowerCase()) return { changed: false, reason: LOADERS[loader].title + ": уже прописан" };
    }
    arr.push(loader === "custom-ui-style" ? { type: "js", url: url } : url);
    obj[key] = arr;
    return { changed: true };
}

function manualSnippet(url, loader) {
    if (loader === "custom-ui-style") {
        return '  "custom-ui-style.external.imports": [\n    { "type": "js", "url": "' + url + '" }\n  ]';
    }
    return '  "vscode_custom_css.imports": [\n    "' + url + '"\n  ]';
}

function handle(appKey, file, url, dry, loaders) {
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
    var notes = [], changed = false;
    loaders.forEach(function (ld) {
        var res = addImport(obj, url, ld);
        if (res.changed) { changed = true; notes.push(LOADERS[ld].title + ": добавлено"); }
        else notes.push(res.reason);
    });
    if (!changed) return { app: appKey, status: notes.join("; ") };
    if (dry) return { app: appKey, status: "будет добавлено (dry-run): " + notes.join("; ") };
    try {
        // резервная копия рядом — откат при желании
        try { fs.writeFileSync(file + ".mlbg-bak", raw, "utf8"); } catch (e) {}
        fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
    } catch (e) { return { app: appKey, status: "не удалось записать: " + e.message }; }
    return { app: appKey, status: notes.join("; ") + " (бэкап: settings.json.mlbg-bak)" };
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
    var loaders = pickLoaders(opt.loader);
    console.log("MoonLight custom-bg — установщик");
    console.log("Путь скрипта: " + url + (opt.dry ? "   (dry-run, без записи)" : ""));
    console.log("Загрузчик: " + loaders.map(function (l) { return LOADERS[l].title + (extInstalled(LOADERS[l].ext) ? " [найден]" : ""); }).join(", "));
    console.log("");
    var anyManual = false, anyChanged = false;
    keys.forEach(function (k) {
        if (!dirs[k]) { console.log("  " + k + ": неизвестное приложение (code|cursor|vscodium|windsurf|oss)"); return; }
        var r = handle(k, dirs[k], url, opt.dry, loaders);
        console.log("  " + r.app + ": " + r.status);
        if (r.manual) anyManual = true;
        if (/добавлено|будет добавлено/.test(r.status)) anyChanged = true;
    });
    if (anyManual) {
        console.log("\nДля приложений с JSONC добавь вручную в settings.json:");
        loaders.forEach(function (ld) { console.log(manualSnippet(url, ld)); });
    }
    console.log("\nДальше:");
    if (loaders.indexOf("custom-ui-style") >= 0) {
        console.log("  Custom UI Style — рекомендуется: переживает обновления редактора и умеет прозрачность окна.");
        console.log("    1) code --install-extension subframe7536.custom-ui-style");
        console.log("    2) Палитра команд -> Custom UI Style: Reload (или перезапуск редактора).");
        console.log("    3) По желанию, настоящая прозрачность окна в settings.json:");
        console.log('       "custom-ui-style.electron": { "transparent": true, "backgroundMaterial": "mica" }');
    }
    if (loaders.indexOf("custom-css") >= 0) {
        console.log("  Custom CSS and JS (be5invis):");
        console.log("    1) code --install-extension be5invis.vscode-custom-css");
        console.log("    2) Палитра команд -> Enable Custom CSS and JS.");
        console.log("    3) Полностью перезапусти редактор (File -> Exit).");
    }
    if (!anyChanged && !anyManual) console.log("\n(Изменений не потребовалось — путь уже прописан везде, где нашлись настройки.)");
}

main();
