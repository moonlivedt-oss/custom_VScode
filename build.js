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
    "src/ui/dom.js",       // базовые DOM-хелперы (el, section, keyActivate)
    "src/ui/info.js",      // тексты подсказок INFO + попап «?»
    "src/ui/controls.js",  // построители контролов панели (чипы, слайдеры, тумблеры, секции)
    "src/ui/io.js",        // экспорт/импорт настроек + тосты
    "src/ui/statusbar.js", // кнопка «BG N» в статусбаре
    "src/ui/panel.js",     // сборка панели «Фон и дизайн»
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

// build(write): собирает и возвращает текст артефакта. write===false — только вернуть
// строку, БЕЗ записи на диск и без лога (нужно смоук-тесту для проверки детерминизма,
// чтобы прогон тестов не перезаписывал custom-bg.js). По умолчанию (CLI) пишет файл.
function build(write) {
    const missing = FILES.filter(function (f) { return !fs.existsSync(path.join(ROOT, f)); });
    if (missing.length) {
        console.error("Не найдены модули:\n  " + missing.join("\n  "));
        process.exit(1);
    }
    const body = FILES.map(readModule).join("\n");
    const out = BANNER + "(function () {\n    \"use strict\";\n\n" + body + "\n})();\n";
    if (write === false) return out;
    fs.writeFileSync(OUT, out, "utf8");
    // Buffer.byteLength, а не out.length: в комментариях кириллица (UTF-8 — 2 байта на
    // символ), поэтому out.length (символы) занижает реальный размер файла в байтах.
    console.log("OK: custom-bg.js собран из " + FILES.length + " модулей (" + Buffer.byteLength(out, "utf8") + " байт).");
    return out;
}

// Список модулей нужен и смоук-тесту (test/smoke.js), чтобы собирать их в том же порядке.
// Экспортируем FILES/build; собираем только при прямом запуске `node build.js`,
// а не при require из теста (иначе тест перезаписывал бы custom-bg.js как побочный эффект).
module.exports = { FILES: FILES, build: build };
if (require.main === module) build();
