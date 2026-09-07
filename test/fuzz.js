#!/usr/bin/env node
// ============================================================
//  Фаззинг санитайзера конфига.
//
//  mergeCfg — граница доверия проекта. Через неё проходит всё внешнее: импортированный JSON,
//  чужой код «Поделиться», образ из settings.json, содержимое localStorage. Точечные тесты
//  проверяют известные случаи; здесь наоборот — генерируем тысячи заведомо неправильных и
//  враждебных конфигов и проверяем, что ИНВАРИАНТЫ держатся всегда:
//
//    * числа остаются в своих диапазонах, а не становятся NaN/Infinity/строкой;
//    * цвета — строго #rrggbb, потому что они уходят прямо в CSS;
//    * тумблеры остаются булевыми, номер набора — валидным индексом;
//    * прототип не отравлен (ключи __proto__/constructor/prototype не пролезают);
//    * сетевые картинки не включаются сами и остаются заблокированными;
//    * собранный CSS не содержит следов инъекции — ни закрытия правила, ни javascript:.
//
//  Генератор детерминированный: сид печатается, и падение воспроизводится командой
//  `node test/fuzz.js --seed <число>`.
//
//  Запуск:  node test/fuzz.js [--runs 400] [--seed 12345]
// ============================================================
"use strict";
var sandboxMod = require("./sandbox");

var args = process.argv.slice(2);
function arg(name, def) {
    var i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : def;
}
var RUNS = arg("--runs", 400);
var SEED = arg("--seed", Math.floor(Math.random() * 1e9));

// Простой воспроизводимый ГПСЧ (xorshift32): нужен не крипто-стойкий, а повторяемый.
var _s = SEED >>> 0 || 1;
function rnd() {
    _s ^= _s << 13; _s >>>= 0;
    _s ^= _s >> 17;
    _s ^= _s << 5; _s >>>= 0;
    return _s / 4294967296;
}
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function int(min, max) { return Math.floor(min + rnd() * (max - min + 1)); }

// Значения, которыми осмысленно ломать санитайзер: типы-обманки, выходы за диапазон,
// отравители прототипа, попытки CSS-инъекции и сетевые адреса.
var NASTY = [
    null, undefined, NaN, Infinity, -Infinity, 0, -1, 1e9, -1e9, 0.5, "", "0", "1e999",
    "#gggggg", "#fff", "#ff00ff", "red", "rgba(0,0,0,1)", true, false, [], {}, [1, 2, 3],
    "javascript:alert(1)", "url(x); } body { display:none } .a{",
    "'); background: url(http://evil/x.jpg); a:hover{",
    "http://evil.example/x.jpg", "//evil.example/x.jpg", "file://host/share/x.jpg",
    "file:///c:/ok.jpg", "vscode-file://vscode-app/ok.jpg",
    "__proto__", "constructor", "\\u0000", "a".repeat(5000),
    { toString: function () { return "boom"; } }
];
function nasty() { return pick(NASTY); }

// Случайный «конфиг»: половина полей — правдоподобные, половина — мусор.
function makeCfg(depth) {
    var o = {};
    var keys = ["version", "enabled", "lang", "perfGuard", "imgBase", "allowRemoteImages", "mode",
        "baseOp", "setOp", "accent", "autoWorkspace", "workspaceSets", "autoBranch", "branchSets",
        "autoRemote", "remoteSets", "autoLang", "langSets", "setAccent", "setName", "setImg",
        "genSets", "shaderSrc", "autoDim", "fit", "imgfx", "slideshow", "library",
        "librarySlideshow", "screensaver", "autoTime", "fxp", "fx", "partStyle", "term", "ui"];
    var n = int(3, keys.length);
    for (var i = 0; i < n; i++) {
        var k = pick(keys);
        if (rnd() < 0.35 && depth < 3) o[k] = makeCfg(depth + 1);
        else o[k] = nasty();
    }
    // Иногда подкладываем правдоподобную структуру — так проверяются и «почти валидные» случаи.
    if (rnd() < 0.5) o.baseOp = { editor: nasty(), side: nasty(), panel: nasty() };
    if (rnd() < 0.5) o.fx = { kenburns: nasty(), aurora: nasty(), trueGlass: nasty() };
    if (rnd() < 0.5) o.fxp = { blur: nasty(), vignette: nasty(), spotRadius: nasty() };
    if (rnd() < 0.4) o.setOp = { "0": { editor: nasty() }, "999": { editor: 0.5 } };
    if (rnd() < 0.4) o.term = { font: nasty(), cursorColor: nasty(), glow: nasty() };
    if (rnd() < 0.3) o["__proto__"] = { polluted: true };
    if (rnd() < 0.3) o.constructor = { prototype: { polluted: true } };
    return o;
}

var sandbox = sandboxMod.loadRuntime();
var fails = [];
function check(cond, what, cfgJson) {
    if (!cond) fails.push({ what: what, cfg: cfgJson });
}

var COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function inRange(v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max; }

function verify(c, raw) {
    // --- типы и диапазоны ---
    check(typeof c.enabled === "boolean", "enabled не булево", raw);
    check(typeof c.perfGuard === "boolean", "perfGuard не булево", raw);
    check(["auto", "ru", "en"].indexOf(c.lang) >= 0, "lang вне白 списка: " + c.lang, raw);
    check(typeof c.mode === "string", "mode не строка", raw);
    check(c.mode === "random" || /^\d+$/.test(c.mode), "mode не индекс и не random: " + c.mode, raw);
    if (/^\d+$/.test(c.mode)) check(parseInt(c.mode, 10) < sandbox.SETS.length, "mode за пределами каталога", raw);
    ["editor", "side", "panel"].forEach(function (z) {
        check(inRange(c.baseOp[z], 0, 1), "baseOp." + z + " вне 0..1: " + c.baseOp[z], raw);
        check(["cover", "contain"].indexOf(c.fit[z]) >= 0, "fit." + z + " вне списка", raw);
        var f = c.imgfx[z];
        check(inRange(f.brightness, 0.3, 1.5), "imgfx.brightness вне диапазона", raw);
        check(inRange(f.saturate, 0, 2), "imgfx.saturate вне диапазона", raw);
        check(inRange(f.blur, 0, 12), "imgfx.blur вне диапазона", raw);
    });
    check(COLOR_RE.test(c.accent), "accent не #rrggbb: " + c.accent, raw);
    check(COLOR_RE.test(c.term.cursorColor) && COLOR_RE.test(c.term.selColor), "цвет терминала не #rrggbb", raw);
    check(sandbox.TERM_FONTS.indexOf(c.term.font) >= 0, "шрифт терминала вне белого списка", raw);
    Object.keys(sandbox.DEFAULTS.fx).forEach(function (k) {
        check(typeof c.fx[k] === "boolean", "fx." + k + " не булево", raw);
    });
    Object.keys(sandbox.DEFAULTS.fxp).forEach(function (k) {
        check(typeof c.fxp[k] === "number" && isFinite(c.fxp[k]), "fxp." + k + " не конечное число", raw);
    });
    check(typeof c.shaderSrc === "string" && c.shaderSrc.length <= 8000, "shaderSrc не строка/слишком длинный", raw);
    check(Array.isArray(c.library), "library не массив", raw);

    // --- отравление прототипа ---
    check(({}).polluted === undefined, "прототип объекта отравлен", raw);
    check(/** @type {any} */ (Object.prototype).polluted === undefined, "Object.prototype отравлен", raw);

    // --- карты «ключ -> индекс набора» ---
    [["workspaceSets", c.workspaceSets], ["branchSets", c.branchSets],
     ["remoteSets", c.remoteSets], ["langSets", c.langSets]].forEach(function (pair) {
        Object.keys(pair[1]).forEach(function (k) {
            check(["__proto__", "constructor", "prototype"].indexOf(k) < 0, pair[0] + ": опасный ключ " + k, raw);
            var v = pair[1][k];
            check(typeof v === "string" && /^\d+$/.test(v) && parseInt(v, 10) < sandbox.SETS.length,
                pair[0] + ": значение не индекс набора", raw);
        });
    });
}

// CSS, собранный из подсунутого конфига, не должен содержать следов инъекции.
// Важно считать только то, что ВНЕ строковых литералов: фигурная скобка или http-адрес
// внутри url('...') — это данные, а не код, вырваться из кавычек мешает cssUrl (он
// экранирует кавычки и обратные слэши). Первый прогон фаззера как раз поймал два таких
// ложных срабатывания, и проверка была уточнена.
function stripCssStrings(css) {
    return css.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
var INJECT = [/javascript:/i, /<\/?script/i, /expression\s*\(/i];
// Адреса, реально запрошенные из CSS: содержимое url('...'). Проверять вхождение "http:"
// в сырой текст нельзя — payload вида "'); background: url(http://…)" остаётся ВНУТРИ
// экранированной строки и никуда не ведёт; важно, с чего адрес начинается.
function cssUrls(css) {
    var out = [], re = /url\((['"])((?:[^'"\\]|\\.)*)\1\)/g, m;
    while ((m = re.exec(css))) out.push(m[2]);
    return out;
}
function verifyCss(css, raw, cfg) {
    var code = stripCssStrings(css);
    INJECT.forEach(function (re) {
        check(!re.test(code), "в CSS попал опасный фрагмент " + re, raw);
    });
    // Сетевой адрес в url() допустим ТОЛЬКО когда пользователь сам включил сетевые картинки.
    if (!cfg.allowRemoteImages) {
        cssUrls(css).forEach(function (u) {
            check(!/^\s*(?:https?:|\/\/)/i.test(u),
                "сетевая картинка в CSS при выключенных сетевых картинках: " + u.slice(0, 80), raw);
        });
    }
    // Баланс фигурных скобок вне строк: вырваться из правила и дописать своё не должно получаться.
    var open = (code.match(/\{/g) || []).length, close = (code.match(/\}/g) || []).length;
    check(open === close, "скобки CSS не сбалансированы (" + open + "/" + close + ")", raw);
}

console.log("Фаззинг конфига: прогонов " + RUNS + ", сид " + SEED + "\n");
for (var i = 0; i < RUNS; i++) {
    var input = makeCfg(0);
    var raw;
    try { raw = JSON.stringify(input); } catch (e) { raw = "(несериализуемо)"; }
    var merged;
    try {
        merged = sandbox.mergeCfg(input);
    } catch (e) {
        fails.push({ what: "mergeCfg бросил исключение: " + e.message, cfg: raw });
        continue;
    }
    verify(merged, raw);

    // Чужой конфиг (импорт файла): сетевые картинки обязаны остаться выключенными.
    try {
        var foreign = sandbox.mergeForeign(input);
        check(foreign.allowRemoteImages === false, "mergeForeign не выключил сетевые картинки", raw);
    } catch (e) {
        fails.push({ what: "mergeForeign бросил исключение: " + e.message, cfg: raw });
    }

    // И сборка стиля на этом конфиге не должна ни падать, ни пропускать инъекцию.
    try {
        sandbox.cfg = merged;
        sandbox.switchMul = 1;
        verifyCss(sandbox.buildCSS(), raw, merged);
    } catch (e) {
        fails.push({ what: "buildCSS бросил исключение: " + e.message, cfg: raw });
    }
}

if (!fails.length) {
    console.log("OK: " + RUNS + " прогонов, инварианты держатся.");
    process.exit(0);
}
console.log("НАЙДЕНО НАРУШЕНИЙ: " + fails.length + " (показываю до 5)\n");
fails.slice(0, 5).forEach(function (f, n) {
    console.log("  " + (n + 1) + ") " + f.what);
    console.log("     конфиг: " + String(f.cfg).slice(0, 400));
});
console.log("\nПовторить этот прогон: node test/fuzz.js --seed " + SEED + " --runs " + RUNS);
process.exit(1);
