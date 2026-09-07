#!/usr/bin/env node
// ============================================================
//  Импорт мастер-картинок наборов.
//
//  Один кадр 21:9 -> один JPEG в assets/sets/ + готовая запись для SETS с вырезами зон.
//  Раньше набор состоял из ТРЁХ отдельных файлов (editor/sidebar/panel): втрое больше веса
//  и никакой гарантии, что зоны сойдутся по палитре. Здесь наоборот: зоны — это разные
//  области ОДНОГО кадра, поэтому окно выглядит цельным, а ассет ровно один.
//
//  Скрипт ничего не изобретает за автора: он измеряет кадр (сетка яркости 32x32, та же
//  метрика WCAG, что и в рантайме) и по ней предлагает вырезы — «код ставим туда, где
//  спокойнее». Предложение печатается, финальное слово за человеком.
//
//  Требуется ffmpeg в PATH (декодирование PNG/JPEG и кодирование JPEG). Никаких npm-зависимостей.
//
//  Запуск:
//    node scripts/import-master.js <файл|папка> [--name "Имя набора"] [--quality 2] [--dry]
//    node scripts/import-master.js ~/wallpapers                     — вся папка
// ============================================================
"use strict";
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var OUT_DIR = path.join(ROOT, "assets", "sets");

// ---- OKLab-палитра: берём ровно тот же модуль, что работает в рантайме ----
// Так «акцент набора» в SETS совпадает с тем, что плагин посчитал бы из картинки сам.
var colorSrc = fs.readFileSync(path.join(ROOT, "src", "fx", "color.js"), "utf8");
var colorApi = (function () {
    var sandbox = {};
    /* eslint-disable no-new-func */
    var f = new Function(colorSrc + "\nreturn { dominantAccent: dominantAccent, dominantPalette: dominantPalette, relLuminance: relLuminance, contrastRatio: contrastRatio };");
    return f.call(sandbox);
}());

function run(cmd, args, opts) {
    var r = cp.spawnSync(cmd, args, Object.assign({ maxBuffer: 64 * 1024 * 1024 }, opts || {}));
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error(cmd + " вышел с кодом " + r.status + ": " + String(r.stderr || "").slice(-400));
    return r;
}
function haveFfmpeg() {
    try { run("ffmpeg", ["-version"], { stdio: ["ignore", "pipe", "pipe"] }); return true; } catch (e) { return false; }
}

// Сырые пиксели кадра, уменьшенного до NxN (rgb24). Дальше вся аналитика — на них.
function pixels(file, N) {
    var r = run("ffmpeg", ["-v", "error", "-i", file, "-vf", "scale=" + N + ":" + N + ":flags=area",
        "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { stdio: ["ignore", "pipe", "pipe"] });
    return r.stdout;
}
// rgb24 -> RGBA-массив (dominantAccent из color.js ждёт данные как у ImageData).
function toRgba(buf) {
    var out = new Array((buf.length / 3) * 4), i, j = 0;
    for (i = 0; i < buf.length; i += 3) { out[j++] = buf[i]; out[j++] = buf[i + 1]; out[j++] = buf[i + 2]; out[j++] = 255; }
    return out;
}
function lumOf(r, g, b) {
    function c(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
// Карта яркости NxN + средние по колонкам/строкам: по ним и предлагаются вырезы.
function analyze(buf, N) {
    var grid = [], cols = [], rows = [], x, y, i, l;
    for (y = 0; y < N; y++) { grid.push([]); rows.push(0); }
    for (x = 0; x < N; x++) cols.push(0);
    for (y = 0; y < N; y++) {
        for (x = 0; x < N; x++) {
            i = (y * N + x) * 3;
            l = lumOf(buf[i], buf[i + 1], buf[i + 2]);
            grid[y].push(l); cols[x] += l / N; rows[y] += l / N;
        }
    }
    return { grid: grid, cols: cols, rows: rows };
}
function meanOf(a) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
// «Беспокойство» полосы: средняя яркость + разброс. Код ставим туда, где обе величины малы.
function bandCost(cols, from, to) {
    var part = cols.slice(from, to), m = meanOf(part), v = 0, i;
    for (i = 0; i < part.length; i++) v += (part[i] - m) * (part[i] - m);
    return { mean: m, sd: Math.sqrt(v / part.length), cost: m + Math.sqrt(v / part.length) * 1.5 };
}
// Предложение вырезов. Редактор — самая спокойная половина кадра по ширине; сайдбар —
// узкая полоса с противоположного (интересного) края; панель — нижняя лента во всю ширину.
function suggestCrops(a, N) {
    var half = Math.round(N * 0.55);
    var left = bandCost(a.cols, 0, half), right = bandCost(a.cols, N - half, N);
    var editorRight = right.cost <= left.cost;
    var edX = editorRight ? Math.round((1 - half / N) * 100) : 0;
    var edW = Math.round((half / N) * 100);
    var sbW = 16, sbX = editorRight ? 0 : 100 - sbW;   // сайдбар — там, где сюжет
    return {
        editor: [edX, 0, edW, 100],
        sidebar: [sbX, 0, sbW, 100],
        panel: [0, 78, 100, 22],
        editorSide: editorRight ? "справа" : "слева",
        leftCost: left.cost, rightCost: right.cost
    };
}
// Контраст кода к вырезу редактора при типичной прозрачности: сразу видно, годится ли кадр.
function editorReadability(a, N, crop, op) {
    var x0 = Math.floor(crop[0] / 100 * N), x1 = Math.ceil((crop[0] + crop[2]) / 100 * N), x, y, mx = 0, sum = 0, n = 0;
    for (y = 0; y < N; y++) for (x = x0; x < x1; x++) { sum += a.grid[y][x]; n++; if (a.grid[y][x] > mx) mx = a.grid[y][x]; }
    var themeBg = 0.021, fg = 0.62;                     // тёмная тема VS Code (editor bg / foreground)
    function mix(l) { return (1 - op) * themeBg + op * l; }
    function ratio(l) { var hi = Math.max(fg, mix(l)), lo = Math.min(fg, mix(l)); return (hi + 0.05) / (lo + 0.05); }
    return { mean: sum / n, max: mx, ratio: ratio(sum / n), worst: ratio(mx) };
}

function translit(s) {
    var m = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya" };
    return String(s).toLowerCase().split("").map(function (c) { return Object.prototype.hasOwnProperty.call(m, c) ? m[c] : c; })
        .join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "set";
}

function processOne(file, opt) {
    var N = 32;
    var buf = pixels(file, N);
    if (buf.length < N * N * 3) throw new Error("не удалось прочитать пиксели: " + file);
    var a = analyze(buf, N);
    var accent = colorApi.dominantAccent(toRgba(buf));
    var palette = colorApi.dominantPalette(toRgba(buf));
    var crops = suggestCrops(a, N);
    var read = editorReadability(a, N, crops.editor, 0.35);
    var name = opt.name || path.basename(file, path.extname(file));
    var slug = translit(name);
    var out = path.join(OUT_DIR, slug + ".jpg");
    if (!opt.dry) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
        // -q:v 2 — визуально без потерь для фона; на больших тёмных градиентах важнее
        // отсутствие бандинга, чем лишние 100 КБ. Метаданные не тащим (-map_metadata -1).
        run("ffmpeg", ["-v", "error", "-y", "-i", file, "-map_metadata", "-1",
            "-q:v", String(opt.quality), "-pix_fmt", "yuvj444p", out], { stdio: ["ignore", "pipe", "pipe"] });
    }
    var size = opt.dry ? 0 : fs.statSync(out).size;
    return {
        file: file, name: name, slug: slug, out: out, size: size,
        accent: accent, palette: palette, crops: crops, read: read,
        meanLuma: meanOf(a.cols)
    };
}

function main() {
    var args = process.argv.slice(2), src = null, opt = { name: null, quality: 2, dry: false };
    for (var i = 0; i < args.length; i++) {
        if (args[i] === "--dry") opt.dry = true;
        else if (args[i] === "--name") opt.name = args[++i];
        else if (args[i] === "--quality") opt.quality = parseInt(args[++i], 10) || 2;
        else if (!src) src = args[i];
    }
    if (!src) { console.error("Использование: node scripts/import-master.js <файл|папка> [--name Имя] [--quality 2] [--dry]"); process.exit(1); }
    if (!haveFfmpeg()) { console.error("Нужен ffmpeg в PATH: он декодирует картинку и кодирует JPEG."); process.exit(1); }
    var files = [];
    var st = fs.statSync(src);
    if (st.isDirectory()) {
        files = fs.readdirSync(src).filter(function (f) { return /\.(png|jpe?g|webp)$/i.test(f); })
            .map(function (f) { return path.join(src, f); }).sort();
    } else files = [src];
    if (!files.length) { console.error("Картинок не найдено."); process.exit(1); }

    var entries = [];
    files.forEach(function (f) {
        var r;
        try { r = processOne(f, opt); } catch (e) { console.error("  ПРОПУЩЕН " + f + ": " + e.message); return; }
        entries.push(r);
        console.log("\n" + path.basename(f) + "  ->  assets/sets/" + r.slug + ".jpg" + (r.size ? "  (" + Math.round(r.size / 1024) + " КБ)" : "  [dry]"));
        console.log("  акцент: " + r.accent + "   палитра: " + (r.palette.join(" ") || "—"));
        console.log("  средняя яркость кадра: " + r.meanLuma.toFixed(3) + "   спокойнее " + r.crops.editorSide +
            " (слева " + r.crops.leftCost.toFixed(3) + " / справа " + r.crops.rightCost.toFixed(3) + ")");
        console.log("  контраст кода к вырезу редактора при прозрачности 0.35: " +
            r.read.ratio.toFixed(1) + ":1, худший участок " + r.read.worst.toFixed(1) + ":1 " +
            (r.read.worst >= 4.5 ? "— годится" : "— светловато, адаптивный скрим пригасит пятна"));
    });

    console.log("\n// ---- вставить в SETS (src/core/config.js) ----");
    entries.forEach(function (r) {
        console.log('    { name: "' + r.name + '", master: "assets/sets/' + r.slug + '.jpg", accent: "' + r.accent + '",');
        console.log('      crop: { editor: [' + r.crops.editor.join(", ") + '], sidebar: [' + r.crops.sidebar.join(", ") +
            '], panel: [' + r.crops.panel.join(", ") + '] } },');
    });
}
main();
