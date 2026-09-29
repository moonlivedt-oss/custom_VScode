#!/usr/bin/env node
// ============================================================
//  Встраивает значки панели (assets/ui/*.webp) в src/ui/icons.js как data-URL.
//  Значки — наклейки из cpp-docs-panel, уменьшенные до 64px. Чего там нет (терминал,
//  данные), нарисовано простым SVG прямо здесь. Запуск: node scripts/embed-icons.js,
//  затем node build.js. Результат детерминирован (файлы по алфавиту).
// ============================================================
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "assets", "ui");
const OUT = path.join(ROOT, "src", "ui", "icons.js");

// Белая обводка + заливка — как у наклеек, чтобы читались и на тёмной, и на светлой теме.
const SVG = {
    "tab-term": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
        "<rect x='6' y='10' width='52' height='44' rx='9' fill='#fff'/>" +
        "<rect x='10' y='14' width='44' height='36' rx='6' fill='#45475a'/>" +
        "<rect x='10' y='14' width='44' height='8' rx='4' fill='#cba6f7'/>" +
        "<path d='M18 30l7 5-7 5' fill='none' stroke='#a6e3a1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>" +
        "<path d='M30 41h12' stroke='#fab387' stroke-width='4' stroke-linecap='round'/></svg>",
    "pin": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
        "<path d='M9 3h6l-1 6 3 3v2h-4v7l-1 1-1-1v-7H7v-2l3-3z' fill='#f38ba8' stroke='#fff' stroke-width='1.6' stroke-linejoin='round'/></svg>",
    "tab-data": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
        "<path d='M8 12a6 6 0 0 1 6-6h30l12 12v32a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z' fill='#fff'/>" +
        "<path d='M12 14a4 4 0 0 1 4-4h26l10 10v28a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z' fill='#89b4fa'/>" +
        "<rect x='20' y='10' width='20' height='13' rx='2' fill='#cdd6f4'/><rect x='32' y='12' width='5' height='8' rx='1' fill='#45475a'/>" +
        "<rect x='19' y='32' width='26' height='18' rx='3' fill='#f5e0dc'/>" +
        "<path d='M24 38h16M24 44h11' stroke='#fab387' stroke-width='3' stroke-linecap='round'/></svg>"
};

function build() {
    const icons = {};
    fs.readdirSync(DIR).filter(function (f) { return /\.webp$/.test(f); }).sort().forEach(function (f) {
        icons[f.replace(/\.webp$/, "")] = "data:image/webp;base64," + fs.readFileSync(path.join(DIR, f)).toString("base64");
    });
    Object.keys(SVG).sort().forEach(function (k) {
        icons[k] = "data:image/svg+xml," + encodeURIComponent(SVG[k]);
    });
    const keys = Object.keys(icons).sort();
    let out = "// ===== Значки панели =====\n" +
        "// СГЕНЕРИРОВАНО scripts/embed-icons.js из assets/ui — вручную не править.\n" +
        "// uiIcon(name, size) -> <img> или null, если значка нет (тогда вызывающий обходится текстом).\n" +
        "var UI_ICONS = {\n";
    out += keys.map(function (k) { return "    \"" + k + "\": \"" + icons[k] + "\""; }).join(",\n") + "\n};\n";
    out += "function uiIcon(name, size) {\n" +
        "    var src = UI_ICONS[name]; if (!src) return null;\n" +
        "    var im = document.createElement(\"img\");\n" +
        "    im.src = src; im.alt = \"\"; im.draggable = false; im.className = \"mlp-ico\";\n" +
        "    if (size) { im.width = size; im.height = size; }\n" +
        "    im.setAttribute(\"aria-hidden\", \"true\");\n" +
        "    return im;\n" +
        "}\n";
    fs.writeFileSync(OUT, out, "utf8");
    console.log("OK: src/ui/icons.js — " + keys.length + " значков, " + Buffer.byteLength(out, "utf8") + " байт.");
}
build();
