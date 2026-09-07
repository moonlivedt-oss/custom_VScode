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
    "src/core/util.js",        // общие утилиты и санитизация значений
    "src/core/sets.js",        // каталог наборов и их санитизация
    "src/core/config.js",      // схема конфига, слияние, загрузка и сохранение
    "src/core/state.js",       // активный набор, прозрачность, акцент, пути картинок
    "src/core/scrape.js",      // чтение данных из DOM и здоровье селекторов вёрстки
    "src/core/env.js",         // загрузчик и возможности окна (прозрачность)
    "src/core/i18n.js",        // локализация интерфейса (RU — исходный язык, EN — словарь)
    "src/fx/color.js",       // OKLab/OKLCH и HSL: палитра из картинки, акцент, контраст
    "src/fx/image.js",       // проба картинок: загрузка, яркость, палитра, кэш метрик
    "src/fx/sets-bg.js",     // источники фона набора: градиент, процедурная текстура, вырезы
    "src/fx/readability.js", // авто-дим, адаптивный скрим, метр контраста кода
    "src/fx/blocks.js",      // таблица CSS-блоков эффектов
    "src/fx/css.js",         // сборка таблицы стилей
    "src/fx/style.js",       // CSS-переменные, инъекция <style>, троттлинг применения
    "src/fx/shader.js",        // шейдерные наборы: живой фон на WebGL
    "src/ui/dom.js",           // базовые DOM-хелперы и общие фрагменты стилей
    "src/ui/info.js",          // тексты подсказок «?» и их попап
    "src/ui/controls.js",      // базовые фабрики контролов и сворачиваемые секции
    "src/ui/controls-sets.js", // контролы вкладки «Набор»
    "src/ui/controls-view.js", // контролы вкладки «Вид»
    "src/ui/controls-sys.js",  // контролы вкладок «Терминал» и «Система»
    "src/ui/io.js",            // тосты, буфер обмена, экспорт/импорт конфига
    "src/ui/looks.js",         // образы вида: профили, пресеты, обмен, синхронизация
    "src/ui/theme-export.js",  // экспорт цветовой темы VS Code
    "src/ui/diagnostics.js",   // отчёт о состоянии установки
    "src/ui/quick.js",         // быстрый переключатель Ctrl+Alt+P
    "src/ui/statusbar.js",     // кнопка «BG N» в статусбаре
    "src/ui/panel-fx.js",      // секция «Эффекты»: сетка тумблеров, поиск, группы
    "src/ui/panel-menu.js",    // настройка состава меню и «Избранное»
    "src/ui/panel-tabs.js",    // наполнение вкладок панели секциями
    "src/ui/panel.js",         // каркас панели «Фон и дизайн»
    "src/widgets/extras.js",   // виджеты статусбара: часы, помидор, статистика сессии
    "src/widgets/particles.js",// частицы и шлейф курсора
    "src/widgets/perf.js",     // бюджет производительности (FPS, батарея)
    "src/widgets/pet.js",      // питомец-компаньон
    "src/widgets/auto.js",     // авто-смена набора: слайд-шоу, время суток, витрина
    "src/boot.js"              // запуск, самолечение, хоткеи, синхронизация окон
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

// Артефакт должен собираться БАЙТ В БАЙТ одинаково на любой машине, иначе CI видит
// расхождение там, где менялись только переводы строк. Windows-инструменты легко оставляют
// в исходниках CRLF: тогда «пустая» строка на деле содержит CR, indent() считает её
// непустой и дописывает ей четыре пробела — сборка расходится. Нормализуем вход.
function normalizeEol(code) { return code.replace(/\r\n?/g, "\n"); }

function readModule(rel) {
    const full = path.join(ROOT, rel);
    let code = normalizeEol(fs.readFileSync(full, "utf8")).replace(/^﻿/, "").replace(/\s+$/, "");
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

// ============================================================
//  Мини-сборка: custom-bg.min.js — тот же код без полнострочных
//  комментариев и отступов. БЕЗ внешних зависимостей (терсер/esbuild): это не полноценный
//  минификатор, а безопасный «стриппер». В этом коде НЕТ шаблонных строк и многострочных
//  литералов (см. build.js indent()), поэтому:
//    * строка, начинающаяся (после пробелов) с "//", — гарантированно комментарий -> убираем;
//    * ведущие пробелы можно срезать (JS не зависит от отступа, переводы строк сохраняются —
//      ASI не ломается);
//    * пустые строки схлопываем.
//  Трейлинг-комментарии (`code // ...`) НЕ трогаем — там возможны http://, регэкспы и «//»
//  внутри строк; их безопасный разбор потребовал бы токенизатора. Экономия и так заметная:
//  основной объём — кириллические блоки комментариев целыми строками.
const OUT_MIN = path.join(ROOT, "custom-bg.min.js");
function stripLine(line) {
    // rtrim + срез ведущих пробелов; строку-комментарий (после трима начинается с //) выкидываем.
    const trimmed = line.replace(/^\s+/, "").replace(/\s+$/, "");
    if (trimmed.indexOf("//") === 0) return null; // полнострочный комментарий
    return trimmed;
}
function minify(code) {
    const lines = code.split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const s = stripLine(lines[i]);
        if (s === null || s === "") continue; // комментарий или пустая строка
        out.push(s);
    }
    return out.join("\n") + "\n";
}
function buildMin() {
    const full = build(false);          // тот же собранный код, но не пишем на диск здесь
    const min = minify(full);
    fs.writeFileSync(OUT_MIN, min, "utf8");
    const a = Buffer.byteLength(full, "utf8"), b = Buffer.byteLength(min, "utf8");
    console.log("OK: custom-bg.min.js собран (" + b + " байт, -" + Math.round((1 - b / a) * 100) + "% от полного).");
    return min;
}

// Список модулей нужен и смоук-тесту (test/smoke.js), чтобы собирать их в том же порядке.
// Экспортируем FILES/build/minify; собираем только при прямом запуске `node build.js`,
// а не при require из теста (иначе тест перезаписывал бы custom-bg.js как побочный эффект).
// `node build.js --min` дополнительно пишет минифицированный custom-bg.min.js.
module.exports = { FILES: FILES, build: build, minify: minify, buildMin: buildMin };
if (require.main === module) {
    build();
    if (process.argv.indexOf("--min") >= 0) buildMin();
}
