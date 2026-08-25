// ============================================================
//  Смоук-тест MoonLight custom-bg.   Запуск:  node test/smoke.js
// ============================================================
//  Модули из src/ склеиваются в один IIFE (build.js), поэтому `node --check`
//  проверяет только синтаксис КАЖДОГО файла по отдельности и НЕ видит ошибок
//  кросс-модульной проводки (напр. accentRGB() зовёт getAccent() из другого
//  модуля — если имя опечатано, это всплывёт только в рантайме).
//
//  Тест собирает те же модули в один код, выполняет его в vm-песочнице с
//  минимальным DOM-стабом (эмуляция браузера VS Code) и проверяет:
//    - код целиком выполняется без ReferenceError (проводка модулей цела);
//    - buildCSS() выдаёт ожидаемый CSS: акцент набора, url(), fit, opacity;
//    - 404-фолбэк на акцентную подложку;
//    - смена набора меняет акцент;
//    - светлая/тёмная тема подменяет палитру поверхностей;
//    - авто-яркость (autoDim) реально влияет на CSS при светлой картинке;
//    - авто-набор по времени переключает cfg.mode.
// ============================================================

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
// Тот же порядок, что и в build.js (данные -> состояние -> CSS -> UI -> виджеты -> старт).
var FILES = [
    "src/core/config.js",
    "src/core/state.js",
    "src/fx/css.js",
    "src/ui/statusbar.js",
    "src/ui/widgets.js",
    "src/ui/panel.js",
    "src/widgets/extras.js",
    "src/boot.js"
];

// ---- мини-счётчик проверок ----
var passed = 0, failed = 0;
function ok(cond, msg) {
    if (cond) { passed++; console.log("  ok   " + msg); }
    else { failed++; console.log("  FAIL " + msg); }
}
function contains(s, sub, msg) { ok(s.indexOf(sub) >= 0, msg + "  (ищем: " + sub + ")"); }

// ============================================================
//  DOM/браузер-стаб
// ============================================================
var noop = function () {};
function ctxStub() {
    return {
        fillStyle: "", clearRect: noop, beginPath: noop, arc: noop, fill: noop,
        fillRect: noop, drawImage: noop, getImageData: function () { return { data: [] }; }
    };
}
function makeEl(tag) {
    var e = {
        tagName: tag, style: {}, children: [], _attrs: {},
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

var sandbox = makeSandbox();
console.log("Смоук-тест MoonLight custom-bg\n");
try {
    // Без IIFE-обёртки: все var/function верхнего уровня становятся глобалами песочницы,
    // поэтому после запуска доступны sandbox.buildCSS, sandbox.cfg и т.д.
    vm.runInNewContext(code, sandbox, { filename: "custom-bg.concat.js" });
    ok(true, "исходники выполнились целиком (нет ReferenceError в проводке модулей)");
} catch (e) {
    failed++;
    console.log("  FAIL исходники бросили исключение при выполнении:");
    console.log("       " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n       ") : e));
    console.log("\nИтог: провал (код не выполнился).");
    process.exit(1);
}

function build() { sandbox.switchMul = 1; return sandbox.buildCSS(); }

// ---- 1. Базовый CSS (набор 0, тёмная тема) ----
sandbox.cfg.mode = "0";
var css = build();
contains(css, "--mlbg-accent: #f38ba8", "акцент набора 0 (#f38ba8) попал в CSS");
contains(css, "url('", "фон вставлен через url('...') (cssUrl)");
contains(css, "/ cover ", "режим вписывания cover присутствует");
contains(css, "opacity:", "прозрачность зон присутствует");
contains(css, "30,30,46", "тёмная поверхность (стекло) — запасная rgba для тёмной темы");
contains(css, "color-mix(in srgb, var(--vscode-", "поверхности берут цвет темы через var(--vscode-*) + color-mix");
contains(css, "var(--vscode-titleBar-activeBackground", "титлбар берёт подложку из переменной темы");

// ---- 2. 404-фолбэк на акцентную подложку ----
sandbox._imgState[sandbox.IMG + sandbox.SETS[0].editor] = { ok: false, luma: null };
var css404 = build();
contains(css404, "rgba(var(--mlbg-accent-rgb),0.14)", "битая картинка (404) -> акцентная подложка");
delete sandbox._imgState[sandbox.IMG + sandbox.SETS[0].editor];

// ---- 3. Смена набора меняет акцент ----
sandbox.cfg.mode = "3";
contains(build(), "--mlbg-accent: #94e2d5", "набор 3 (Лунная тушь) даёт свой акцент #94e2d5");
sandbox.cfg.mode = "0";

// ---- 4. Светлая / тёмная тема подменяет поверхности ----
sandbox._workbench.className = "monaco-workbench vs";
ok(sandbox.isLightTheme() === true, "тема vs распознана как светлая");
var cssLight = build();
contains(cssLight, "236,236,244", "светлая тема: светлая поверхность стекла");
contains(cssLight, "#e6e6f0", "светлая тема: светлая подложка титлбара");
sandbox._workbench.className = "monaco-workbench vs-dark";
ok(sandbox.isLightTheme() === false, "тема vs-dark распознана как тёмная");

// ---- 5. autoDim реально влияет на CSS при светлой картинке ----
var edUrl = sandbox.IMG + sandbox.SETS[0].editor;
sandbox._imgState[edUrl] = { ok: true, luma: 0.95 }; // почти белая картинка
sandbox.cfg.autoDim = true;  var withDim = build();
sandbox.cfg.autoDim = false; var noDim = build();
ok(withDim !== noDim, "autoDim меняет CSS для светлой картинки (занижает яркость editor)");
sandbox.cfg.autoDim = true;
delete sandbox._imgState[edUrl];

// ---- 6. Авто-набор по времени переключает cfg.mode ----
sandbox.cfg.mode = "0";
sandbox.cfg.autoTime = { on: true, day: 1, night: 5 };
sandbox.timeTick();
var expect = sandbox.isDaytime() ? "1" : "5";
ok(sandbox.cfg.mode === expect, "timeTick переключил набор по времени суток -> " + expect +
    " (сейчас " + (sandbox.isDaytime() ? "день" : "ночь") + ")");

// ---- 7. Горячая клавиша: cycleSet листает наборы по кругу ----
sandbox.cfg.autoTime = { on: false, day: 0, night: 4 };
sandbox.cfg.mode = "0";
sandbox.cycleSet(1);
ok(sandbox.cfg.mode === "1", "cycleSet(+1) от набора 0 -> набор 1");
sandbox.cfg.mode = "0";
sandbox.cycleSet(-1);
ok(sandbox.cfg.mode === String(sandbox.SETS.length - 1), "cycleSet(-1) от набора 0 -> последний набор (по кругу)");

// ============================================================
console.log("\nИтог: " + passed + " ok, " + failed + " fail.");
process.exit(failed ? 1 : 0);
