// ============================================================
//  Песочница рантайма для тестов.
//
//  Модули из src/** склеиваются в один код и исполняются в vm с минимальным DOM-стабом —
//  так проверяется реальная проводка модулей, а не отдельные файлы. Отсюда песочницу берут
//  и смоук (test/smoke.js), и фаззер конфига (test/fuzz.js): стаб один на оба, иначе он
//  разъезжается и тесты начинают проверять разные среды.
// ============================================================
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var FILES = require(path.join(ROOT, "build.js")).FILES;

var noop = function () {};
function ctxStub() {
    // Полный набор методов 2D-контекста, которые задействует отрисовка частиц
    // (loopParticles/drawRound/drawShaped/drawStreak): без них смоук ловил бы ошибку
    // только через swallow в try/catch. Здесь — чтобы отрисовка реально прогонялась.
    return {
        fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "butt",
        clearRect: noop, beginPath: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
        fillRect: noop, drawImage: noop, moveTo: noop, lineTo: noop, closePath: noop,
        quadraticCurveTo: noop, bezierCurveTo: noop,
        save: noop, restore: noop, translate: noop, rotate: noop,
        getImageData: function () { return { data: [] }; }
    };
}
function makeEl(tag) {
    var e = {
        // style поддерживает setProperty/removeProperty — панель ставит CSS-переменные
        // (--mlp-*) и стиль вкладок через них; без этих методов togglePanel бросил бы.
        tagName: tag, style: { cssText: "", setProperty: noop, removeProperty: noop }, children: [], _attrs: {},
        appendChild: function (c) { this.children.push(c); return c; },
        insertBefore: function (c) { this.children.push(c); return c; },
        removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
        setAttribute: function (k, v) { this._attrs[k] = String(v); },
        getAttribute: function (k) { return k in this._attrs ? this._attrs[k] : null; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        getContext: function () { return ctxStub(); },
        getBoundingClientRect: function () { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
        contains: function () { return false; },
        classList: { add: noop, remove: noop, contains: function () { return false; } },
        focus: noop, click: noop,
        offsetWidth: 0, offsetHeight: 0, offsetParent: null,
        width: 0, height: 0, textContent: "", className: "", id: ""
    };
    return e;
}

function makeSandbox() {
    var base = "vscode-file://vscode-app/test/vscode-bg/";
    var workbench = makeEl("div"); workbench.className = "monaco-workbench vs-dark";
    var body = makeEl("body"); body.contains = function () { return true; };
    var head = makeEl("head");
    var htmlEl = makeEl("html");

    var document = {
        currentScript: { src: base + "custom-bg.js" },
        head: head, body: body, documentElement: htmlEl, hidden: false,
        getElementById: function () { return null; },
        createElement: function (tag) { return makeEl(tag); },
        querySelector: function (sel) {
            if (sel && sel.indexOf("monaco-workbench") >= 0) return workbench;
            return null; // статусбар и пр. отсутствуют -> виджеты-статусбара выходят рано
        },
        querySelectorAll: function () { return []; },
        addEventListener: noop, removeEventListener: noop,
        contains: function () { return true; },
        get activeElement() { return null; },
        execCommand: function () { return true; }
    };

    var sandbox = {
        document: document,
        console: { log: noop, warn: noop, error: noop },
        localStorage: (function () {
            var m = {};
            return {
                getItem: function (k) { return k in m ? m[k] : null; },
                setItem: function (k, v) { m[k] = String(v); },
                removeItem: function (k) { delete m[k]; }
            };
        })(),
        navigator: { clipboard: { writeText: noop } },
        btoa: function (s) { return Buffer.from(String(s), "binary").toString("base64"); },
        atob: function (s) { return Buffer.from(String(s), "base64").toString("binary"); },
        matchMedia: function () { return { matches: false, addEventListener: noop, addListener: noop }; },
        requestAnimationFrame: function () { return 1; }, // НЕ вызываем cb — избегаем рекурсии
        cancelAnimationFrame: noop,
        setInterval: function () { return 1; },            // НЕ запускаем — иначе тест «зависнет»
        clearInterval: noop,
        setTimeout: function () { return 1; },
        clearTimeout: noop,
        innerWidth: 1280, innerHeight: 800,
        addEventListener: noop, removeEventListener: noop,
        Image: function () { this.onload = null; this.onerror = null; this.src = ""; },
        MutationObserver: function () { this.observe = noop; this.disconnect = noop; },
        Blob: function () {}, URL: { createObjectURL: function () { return ""; }, revokeObjectURL: noop },
        FileReader: function () { this.readAsText = noop; }
    };
    sandbox.window = sandbox;   // window.* и голые глобалы указывают на одно и то же
    sandbox.globalThis = sandbox;
    sandbox._workbench = workbench; // чтобы тест мог менять тему
    return sandbox;
}

// ============================================================
//  Сборка исходников и запуск в песочнице
// ============================================================
var code = FILES.map(function (f) {
    var full = path.join(ROOT, f);
    if (!fs.existsSync(full)) { console.error("Нет файла: " + f); process.exit(2); }
    return "// ==== " + f + " ====\n" + fs.readFileSync(full, "utf8");
}).join("\n");

// Собрать модули и выполнить их в свежей песочнице. Возвращает саму песочницу: после
// запуска в ней доступны все объявления верхнего уровня (buildCSS, cfg, mergeCfg и т.д.).
function loadRuntime() {
    var code = FILES.map(function (f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }).join(String.fromCharCode(10));
    var sandbox = makeSandbox();
    vm.runInNewContext(code, sandbox, { filename: "custom-bg.concat.js" });
    return sandbox;
}

module.exports = { makeSandbox: makeSandbox, loadRuntime: loadRuntime, FILES: FILES, ROOT: ROOT };
