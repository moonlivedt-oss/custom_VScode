#!/usr/bin/env node
// ============================================================
//  Поиск мёртвого кода и осиротевших ресурсов.
//
//  Модули склеиваются в одну область видимости, поэтому «неиспользуемое» здесь видно только
//  глобально: функция может быть объявлена в одном файле, а зваться из трёх других. Скрипт
//  собирает объявления верхнего уровня по всем модулям из FILES и считает ссылки на них —
//  включая тесты, которые тоже законный потребитель.
//
//  Заодно проверяет ресурсы, которые легко забыть при правках:
//    * ключи словаря EN, которых больше нет в коде;
//    * подсказки INFO без потребителя (с учётом доступа по вычисляемому ключу INFO["fx_" + k]);
//    * эффекты из FX_LIST, у которых нет ни CSS-блока, ни обработчика.
//
//  Запуск:  node scripts/lint-dead.js       (или npm run lint:dead)
//  Код возврата 1 — если нашлось мёртвое; предупреждения по ресурсам код не меняют.
// ============================================================
"use strict";
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var FILES = require(path.join(ROOT, "build.js")).FILES;
// Тесты дёргают часть функций напрямую из песочницы — для них это тоже использование.
var CONSUMERS = FILES.concat(["test/smoke.js", "test/e2e.spec.js"]);

var src = {}, code = {};
CONSUMERS.forEach(function (f) {
    var full = path.join(ROOT, f);
    src[f] = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
    code[f] = src[f].split("\n").map(stripComment).join("\n");
});

// Срезать комментарий в конце строки, не тронув «//» внутри строкового литерала или URL.
function stripComment(line) {
    if (line.replace(/^\s+/, "").indexOf("//") === 0) return "";
    var q = null, out = "";
    for (var i = 0; i < line.length; i++) {
        var c = line.charAt(i), n = line.charAt(i + 1);
        if (q) {
            out += c;
            if (c === "\\") { out += n; i++; continue; }
            if (c === q) q = null;
            continue;
        }
        if (c === '"' || c === "'") { q = c; out += c; continue; }
        if (c === "/" && n === "/") break;
        out += c;
    }
    return out;
}

function declarations() {
    var out = [];
    FILES.forEach(function (f) {
        src[f].split("\n").forEach(function (line, i) {
            var m = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
            if (m) { out.push({ name: m[1], file: f, line: i + 1, kind: "function" }); return; }
            m = /^var\s+([A-Za-z_$][\w$]*)\s*[=,;]/.exec(line);
            if (m) out.push({ name: m[1], file: f, line: i + 1, kind: "var" });
        });
    });
    return out;
}
function uses(name) {
    var re = new RegExp("\\b" + name.replace(/\$/g, "\\$") + "\\b", "g"), total = 0;
    CONSUMERS.forEach(function (f) {
        var m = code[f].match(re);
        if (m) total += m.length;
    });
    return total;
}

var problems = 0;
var dead = declarations().filter(function (d) { return uses(d.name) <= 1; });
console.log("Мёртвые объявления (нет ни одной ссылки): " + (dead.length || "нет"));
dead.forEach(function (d) {
    problems++;
    console.log("  " + d.file + ":" + d.line + "  " + d.kind + " " + d.name);
});

// --- словарь локализации ---
var i18n = src["src/core/i18n.js"];
var enBody = i18n.slice(i18n.indexOf("var EN = {"), i18n.indexOf("\n};", i18n.indexOf("var EN = {")));
var keys = [], km, keyRe = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;
while ((km = keyRe.exec(enBody))) keys.push(km[1]);
var deadKeys = keys.filter(function (k) {
    var esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), re = new RegExp('["\']' + esc + '["\']');
    return !FILES.some(function (f) { return f !== "src/core/i18n.js" && re.test(src[f]); });
});
console.log("\nКлючи EN без строки в коде: " + (deadKeys.length || "нет"));
deadKeys.forEach(function (k) { console.log("  " + JSON.stringify(k)); });

// --- подсказки INFO ---
var info = src["src/ui/info.js"];
var infoBody = info.slice(info.indexOf("var INFO = {"), info.indexOf("var INFO_EN"));
var infoKeys = [], im, ire = /^\s{4}([a-z][\w]*)\s*:/gm;
while ((im = ire.exec(infoBody))) infoKeys.push(im[1]);
var cfgSrc = src["src/core/config.js"];
var fxSection = cfgSrc.slice(cfgSrc.indexOf("var FX_LIST"), cfgSrc.indexOf("var FX_GROUPS"));
var fxKeys = [], fm, fxRe = /\["(\w+)",/g;
while ((fm = fxRe.exec(fxSection))) fxKeys.push(fm[1]);
// Динамические ключи: INFO["op_" + zone], INFO["fxp_" + key], INFO["term_" + key], INFO["fx_" + key].
var dynPrefixes = ["op_", "fxp_", "term_", "fx_"];
var deadInfo = infoKeys.filter(function (k) {
    for (var i = 0; i < dynPrefixes.length; i++) {
        if (k.indexOf(dynPrefixes[i]) === 0) return dynPrefixes[i] === "fx_" && fxKeys.indexOf(k.slice(3)) < 0;
    }
    var re = new RegExp("INFO\\." + k + "\\b");
    return !FILES.some(function (f) { return re.test(code[f]); });
});
console.log("\nПодсказки INFO без потребителя: " + (deadInfo.length || "нет"));
deadInfo.forEach(function (k) { console.log("  " + k); });

// --- эффекты без реализации ---
var impl = FILES.map(function (f) { return code[f]; }).join("\n");
var noImpl = fxKeys.filter(function (k) {
    return !new RegExp('\\["' + k + '"|fx\\.' + k + '\\b|cfg\\.fx\\.' + k + '\\b').test(impl);
});
console.log("\nЭффекты из FX_LIST без реализации: " + (noImpl.length || "нет"));
noImpl.forEach(function (k) { problems++; console.log("  " + k); });

process.exit(problems ? 1 : 0);
