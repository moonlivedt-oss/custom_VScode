#!/usr/bin/env node
// ============================================================
//  Сборщик MoonLight custom-bg.
//  Склеивает модули из src/ в один файл custom-bg.js внутри общего IIFE.
//  Модули НЕ используют import/export — они живут в одной области видимости
//  (как раньше в монолите), поэтому порядок важен: сначала данные/состояние,
//  потом CSS, UI, виджеты, старт.
//
//  Запуск:  node build.js
// ============================================================
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "custom-bg.js");

// Порядок склейки (объявления функций поднимаются, но исполняемые строки —
// var cfg = loadCfg(), setInterval(...) и т.п. — должны идти в этом порядке).
const FILES = [
    "src/core/config.js",
    "src/core/state.js",
    "src/fx/css.js",
    "src/ui/statusbar.js",
    "src/ui/widgets.js",
    "src/ui/panel.js",
    "src/widgets/extras.js",
    "src/boot.js"
];

const BANNER =
    "// ============================================================\n" +
    "//  MoonLight custom-bg — СОБРАННЫЙ ФАЙЛ. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ!\n" +
    "//  Исходники: src/**   |   Пересборка: node build.js\n" +
    "//  Грузится через vscode_custom_css.imports (be5invis.vscode-custom-css).\n" +
    "// ============================================================\n";

function indent(code) {
    // Сдвигаем модуль на 4 пробела внутрь IIFE. Многострочных строковых литералов
    // в коде нет (только конкатенация), поэтому добавление отступа безопасно.
    return code.split("\n").map(function (line) {
        return line.length ? "    " + line : line;
    }).join("\n");
}

function readModule(rel) {
    const full = path.join(ROOT, rel);
    let code = fs.readFileSync(full, "utf8").replace(/^﻿/, "").replace(/\s+$/, "");
    return "    // ===================== " + rel + " =====================\n" + indent(code) + "\n";
}

const missing = FILES.filter(function (f) { return !fs.existsSync(path.join(ROOT, f)); });
if (missing.length) {
    console.error("Не найдены модули:\n  " + missing.join("\n  "));
    process.exit(1);
}

const body = FILES.map(readModule).join("\n");
const out = BANNER + "(function () {\n    \"use strict\";\n\n" + body + "\n})();\n";

fs.writeFileSync(OUT, out, "utf8");
console.log("OK: custom-bg.js собран из " + FILES.length + " модулей (" + out.length + " байт).");
