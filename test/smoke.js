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
// Список модулей и порядок склейки берём прямо из build.js (единый источник правды —
// иначе тест мог бы проходить на устаревшем списке, пока реальная сборка ломается).
var FILES = require(path.join(ROOT, "build.js")).FILES;

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
var sandboxMod = require("./sandbox");
var makeSandbox = sandboxMod.makeSandbox;

var sandbox;
console.log("Смоук-тест MoonLight custom-bg\n");
try {
    // Без IIFE-обёртки: все var/function верхнего уровня становятся глобалами песочницы,
    // поэтому после запуска доступны sandbox.buildCSS, sandbox.cfg и т.д.
    sandbox = sandboxMod.loadRuntime();
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
contains(build(), "--mlbg-accent: #94e2d5", "набор 3 (Свиток тумана) даёт свой акцент #94e2d5");
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
// v20: числа переехали в CSS-переменные (buildVars), поэтому эффект проверяем там —
// сам текст стиля от ползунков и авто-дима больше не зависит (в этом и был смысл правки).
sandbox.cfg.autoDim = true;  var withDim = sandbox.buildVars()["--mlbg-op-editor"];
sandbox.cfg.autoDim = false; var noDim = sandbox.buildVars()["--mlbg-op-editor"];
ok(parseFloat(withDim) < parseFloat(noDim), "autoDim занижает --mlbg-op-editor для светлой картинки (" + withDim + " < " + noDim + ")");
sandbox.cfg.autoDim = true;
delete sandbox._imgState[edUrl];

// ---- 6. Авто-набор по времени переключает cfg.mode ----
sandbox.cfg.mode = "0";
sandbox.cfg.autoTime = { on: true, day: 1, night: 5 };
sandbox.timeTick();
var expect = sandbox.isDaytime() ? "1" : "5";
ok(sandbox.cfg.mode === expect, "timeTick переключил набор по времени суток -> " + expect +
    " (сейчас " + (sandbox.isDaytime() ? "день" : "ночь") + ")");

// ---- 6b. Мастер-выключатель: enabled=false даёт минимальный CSS ----
sandbox.cfg.mode = "0";
sandbox.cfg.enabled = false;
var cssOff = build();
ok(cssOff.indexOf("url('") < 0, "enabled=false: нет фоновых картинок (url) в CSS");
contains(cssOff, "#moonlight-bg-switcher", "enabled=false: стили кнопки BG остаются");
contains(cssOff, "--mlbg-accent:", "enabled=false: переменная акцента остаётся");
sandbox.cfg.enabled = true;
contains(build(), "url('", "enabled=true: фоновые картинки вернулись");

// ---- 7a. Безопасность: mergeCfg отбрасывает out-of-range индексы setOp/setAccent ----
var dirty = sandbox.mergeCfg({
    setOp: { "0": { editor: 0.2 }, "999999": { editor: 0.5 }, "abc": { editor: 0.5 } },
    setAccent: { "1": "#112233", "999999": "#445566" }
});
ok(!("999999" in dirty.setOp) && !("abc" in dirty.setOp) && ("0" in dirty.setOp),
    "mergeCfg: setOp оставляет только валидные индексы наборов");
ok(!("999999" in dirty.setAccent) && ("1" in dirty.setAccent),
    "mergeCfg: setAccent оставляет только валидные индексы наборов");

// ---- 7. Горячая клавиша: cycleSet листает наборы по кругу ----
sandbox.cfg.autoTime = { on: false, day: 0, night: 4 };
sandbox.cfg.mode = "0";
sandbox.cycleSet(1);
ok(sandbox.cfg.mode === "1", "cycleSet(+1) от набора 0 -> набор 1");
sandbox.cfg.mode = "0";
sandbox.cycleSet(-1);
ok(sandbox.cfg.mode === String(sandbox.SETS.length - 1), "cycleSet(-1) от набора 0 -> последний набор (по кругу)");

// ---- 8. dimOnType: включённый эффект добавляет правило body.mlbg-typing ----
sandbox.cfg.autoTime = { on: false, day: 0, night: 4 };
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
sandbox.cfg.fx.dimOnType = true;
contains(build(), "body.mlbg-typing", "dimOnType: CSS содержит правило приглушения при печати");
sandbox.cfg.fx.dimOnType = false;
ok(build().indexOf("body.mlbg-typing") < 0, "dimOnType выкл: правила приглушения нет");

// ---- 8a. dimOnBlur: включённый эффект добавляет правило body.mlbg-unfocused ----
sandbox.cfg.fx.dimOnBlur = true;
contains(build(), "body.mlbg-unfocused", "dimOnBlur: CSS содержит правило приглушения без фокуса");
sandbox.cfg.fx.dimOnBlur = false;
ok(build().indexOf("body.mlbg-unfocused") < 0, "dimOnBlur выкл: правила приглушения нет");

// ---- 8a2. Скроллбар панели стилизован и есть даже при выключенном фоне ----
contains(build(), "#moonlight-bg-panel::-webkit-scrollbar", "скроллбар панели стилизован (::-webkit-scrollbar)");
sandbox.cfg.enabled = false;
contains(build(), "#moonlight-bg-panel::-webkit-scrollbar", "скроллбар панели есть и при выключенном фоне (switcherCSS)");
sandbox.cfg.enabled = true;

// ---- 8b. Живой контур: радужный по умолчанию, моно-акцент по флагу ----
sandbox.cfg.fx.groupBorder = true;
sandbox.cfg.fx.groupBorderMono = false;
contains(build(), "#a6e3a1", "groupBorder: по умолчанию радужный градиент (есть зелёный стоп)");
sandbox.cfg.fx.groupBorderMono = true;
ok(build().indexOf("#a6e3a1") < 0, "groupBorderMono: радужных стопов нет (контур одним акцентом)");
sandbox.cfg.fx.groupBorderMono = false;

// ---- 8c. Свои картинки набора (setImg) + разрешение путей ----
ok(sandbox.isAbsUrl("file:///d:/x.jpg") === true && sandbox.isAbsUrl("vscode-file://vscode-app/x") === true &&
    sandbox.isAbsUrl("assets/editor/editor_0.jpg") === false,
    "isAbsUrl: схема/слэш -> абсолютный, обычный путь -> относительный");
ok(sandbox.imgUrl("assets/x.jpg") === sandbox.IMG + "assets/x.jpg" && sandbox.imgUrl("file:///d:/x.jpg") === "file:///d:/x.jpg",
    "imgUrl: относительный дописывает IMG, абсолютный оставляет как есть");
sandbox.cfg.mode = "0";
sandbox.cfg.setImg = { "0": { editor: "file:///d:/custom/my-editor.jpg" } };
var cssImg = build();
contains(cssImg, "my-editor.jpg", "setImg: своя картинка редактора попала в CSS");
ok(cssImg.indexOf("editor_0.jpg") < 0, "setImg: стандартная картинка editor_0 заменена своей");
sandbox.cfg.setImg = {};

// ---- 8d. Акцент из картинки: dominantAccent красного буфера даёт красноватый hex ----
var red = new Array(16 * 16 * 4);
for (var ri = 0; ri < red.length; ri += 4) { red[ri] = 220; red[ri + 1] = 20; red[ri + 2] = 40; red[ri + 3] = 255; }
var redHex = sandbox.dominantAccent(red);
var rr = parseInt(redHex.substr(1, 2), 16), rg = parseInt(redHex.substr(3, 2), 16), rb = parseInt(redHex.substr(5, 2), 16);
ok(/^#[0-9a-f]{6}$/.test(redHex) && rr > rg && rr > rb, "dominantAccent: красная картинка -> красноватый акцент (" + redHex + ")");

// ---- 8e. Часы дня/ночи: from===to -> всегда день; mergeCfg клампит 0..23 ----
sandbox.cfg.autoTime = { on: false, day: 0, night: 4, from: 12, to: 12 };
ok(sandbox.isDaytime() === true, "isDaytime: совпавшие границы (from===to) -> всегда день");
var atc = sandbox.mergeCfg({ autoTime: { from: 99, to: -5 } }).autoTime;
ok(atc.from === 23 && atc.to === 0, "mergeCfg: часы дня/ночи зажаты в 0..23");

// ---- 9. Имя набора: пользовательское переопределяет родное ----
sandbox.cfg.setName = { "0": "Мой набор" };
ok(sandbox.setName(0) === "Мой набор", "setName: пользовательское имя набора переопределяет родное");
delete sandbox.cfg.setName["0"];
ok(sandbox.setName(0) === "Алые кроны", "setName: без переопределения возвращается родное имя набора");

// ---- 10. Безопасность: mergeCfg санитизирует setName (индексы, длина, тип) ----
var longName = new Array(60).join("x"); // 59 символов > лимита 40
var sn = sandbox.mergeCfg({
    setName: { "0": "Ок", "999999": "мимо", "abc": "мимо", "1": longName, "2": 123 }
});
ok(sn.setName["0"] === "Ок" && !("999999" in sn.setName) && !("abc" in sn.setName) &&
    !("1" in sn.setName) && !("2" in sn.setName),
    "mergeCfg: setName оставляет только валидное имя (индекс в диапазоне, строка <= 40)");

// ---- 11. Портируемость: cfg.imgBase задаёт базу относительных путей ----
ok(sandbox.safeBase("vscode-file://vscode-app/x") === "vscode-file://vscode-app/x/" &&
    sandbox.safeBase("  path/  ") === "path/" && sandbox.safeBase("a\nb/") === "ab/" &&
    sandbox.safeBase("") === "" && sandbox.safeBase(123) === "",
    "safeBase: тримит, убирает переводы строк, дописывает слэш, пустое/не-строка -> пусто");
ok(sandbox.mergeCfg({ imgBase: "d:/plugins/vscode-bg" }).imgBase === "d:/plugins/vscode-bg/",
    "mergeCfg: imgBase нормализован (завершающий слэш)");
sandbox.cfg.imgBase = "file:///d:/moved/";
ok(sandbox.imgUrl("assets/x.jpg") === "file:///d:/moved/assets/x.jpg",
    "imgUrl: относительный путь берёт cfg.imgBase, когда он задан");
ok(sandbox.imgUrl("file:///d:/abs.jpg") === "file:///d:/abs.jpg",
    "imgUrl: абсолютный путь imgBase игнорирует");
sandbox.cfg.imgBase = "";
ok(sandbox.imgUrl("assets/x.jpg") === sandbox.IMG + "assets/x.jpg",
    "imgUrl: пустой imgBase -> авто-путь IMG");

// ---- 12. Санитизация: fit принимает только cover|contain ----
var fitc = sandbox.mergeCfg({ fit: { editor: "contain", side: "zzz", panel: "cover" } }).fit;
ok(fitc.editor === "contain" && fitc.panel === "cover" && fitc.side === sandbox.DEFAULTS.fit.side,
    "mergeCfg: fit принимает cover|contain, мусор -> дефолт зоны");

// ---- 13. Санитизация: imgfx зажимает числа в диапазоны ----
var ifx = sandbox.mergeCfg({ imgfx: { editor: { brightness: 9, saturate: -1, blur: 999 } } }).imgfx.editor;
ok(ifx.brightness === 1.5 && ifx.saturate === 0 && ifx.blur === 12,
    "mergeCfg: imgfx.brightness/saturate/blur зажаты в допустимые диапазоны");

// ---- 14. Санитизация: setImg только валидные индексы и длина пути ----
var longPath = new Array(1100).join("y"); // 1099 символов > лимита 1024
var simg = sandbox.mergeCfg({ setImg: {
    "0": { editor: "ok.jpg", sidebar: longPath },
    "999999": { editor: "x.jpg" }, "abc": { editor: "x.jpg" }
} }).setImg;
ok(simg["0"].editor === "ok.jpg" && !("sidebar" in simg["0"]) &&
    !("999999" in simg) && !("abc" in simg),
    "mergeCfg: setImg оставляет валидный индекс/путь, длинный путь и чужие индексы отброшены");

// ---- 15. Миграция: version приводится к текущей CFG_VERSION ----
ok(sandbox.mergeCfg({ version: 0 }).version === sandbox.CFG_VERSION &&
    sandbox.migrateCfg({ version: 0 }).version === sandbox.CFG_VERSION,
    "migrateCfg/mergeCfg: version приводится к текущей CFG_VERSION");

// ---- 16. Резерв конфига: backupCfg -> readBackup возвращает равнозначный конфиг ----
sandbox.cfg = sandbox.mergeCfg({ mode: "2", accent: "#123456" });
sandbox.backupCfg();
var backupRead = sandbox.readBackup();
ok(backupRead && backupRead.mode === "2" && backupRead.accent === "#123456" && sandbox.hasBackup() === true,
    "backupCfg/readBackup: резерв сохраняется и корректно читается");

// ---- 17a. Генеративные наборы: градиент вместо картинки, без url() ----
var gradIdx = -1;
for (var gi = 0; gi < sandbox.SETS.length; gi++) if (sandbox.isGradSet(gi)) { gradIdx = gi; break; }
ok(gradIdx >= 0 && sandbox.isGradSet(0) === false, "isGradSet: генеративные наборы распознаются, картиночные — нет");
sandbox.cfg.mode = String(gradIdx); sandbox.cfg.setImg = {};
var cssGrad = build();
contains(cssGrad, "linear-gradient(", "генеративный набор: зоны залиты CSS-градиентом");
ok(cssGrad.indexOf("url('") < 0, "генеративный набор: картинок (url) в CSS нет");
sandbox.cfg.setImg = { }; sandbox.cfg.setImg[gradIdx] = { editor: "file:///d:/o.jpg" };
contains(build(), "o.jpg", "генеративный набор: своя картинка зоны перекрывает градиент");
sandbox.cfg.setImg = {}; sandbox.cfg.mode = "0";

// ---- 17a2. Наборы: 12 фото + 6 генеративных + 7 процедурных, у зон разная форма градиента ----
ok(sandbox.SETS.length === 37, "SETS: всего 37 наборов (12 фото + 6 градиентных + 7 процедурных + 8 мастер-кадров + 4 шейдерных)");
var shIdx = -1;
for (var _i = 0; _i < sandbox.SETS.length; _i++) if (sandbox.SETS[_i].shader) { shIdx = _i; break; }
ok(shIdx >= 0 && sandbox.isShaderSet(shIdx), "шейдерный набор распознаётся (isShaderSet)");
sandbox.cfg.mode = String(shIdx);
var cssShader = build();
ok(cssShader.indexOf("url('") < 0, "шейдерный набор: картинок (url) в CSS нет — фон рисует GPU");
contains(cssShader, "linear-gradient", "шейдерный набор: в CSS есть запасной градиент (если WebGL недоступен)");
ok(typeof sandbox.shaderActive === "function" && sandbox.shaderActive() === true,
   "шейдерный набор активен по конфигу (shaderActive)");
var shThrew = false;
try { sandbox.ensureShader(); } catch (e) { shThrew = true; }
ok(!shThrew, "ensureShader без WebGL не бросает исключение (слой молча выключается)");
sandbox.cfg.mode = "0";
var gradCount = 0, procCount = 0;
for (var gj = 0; gj < sandbox.SETS.length; gj++) { if (sandbox.isGradSet(gj)) gradCount++; if (sandbox.isProcSet(gj)) procCount++; }
ok(gradCount === 6, "isGradSet: ровно 6 градиентных наборов");
ok(procCount === 7, "isProcSet: ровно 7 процедурных наборов");
// Новые генераторы: каждый ключ из PROC_KINDS есть в диспетчере PROC_DRAW (иначе откат на грейн).
var procMissing = Object.keys(sandbox.PROC_KINDS).filter(function (k) { return typeof sandbox.PROC_DRAW[k] !== "function"; });
ok(procMissing.length === 0, "PROC_DRAW: у каждого вида proc есть функция отрисовки" + (procMissing.length ? " (нет: " + procMissing.join(",") + ")" : ""));
ok(sandbox.PROC_KINDS.grid && sandbox.PROC_KINDS.topo && sandbox.PROC_KINDS.matrix && sandbox.PROC_KINDS.cells,
    "PROC_KINDS: добавлены grid/topo/matrix/cells");
ok(sandbox.gradFor(gradIdx, "editor").indexOf("linear-gradient(135deg") === 0 &&
    sandbox.gradFor(gradIdx, "panel").indexOf("radial-gradient(") === 0,
    "gradFor: у зон разная форма (editor — диагональ, panel — радиальный)");
// Процедурный набор: без canvas в node procTexture -> null, зона откатывается на градиент
// (procFallback), поэтому картинок (url) в CSS нет, но фон всё равно есть.
var procIdx = -1;
for (var pj = 0; pj < sandbox.SETS.length; pj++) if (sandbox.isProcSet(pj)) { procIdx = pj; break; }
ok(procIdx >= 0 && sandbox.procTexture(procIdx) === null, "procTexture: без canvas возвращает null (деградация)");
var procBgCss = sandbox.procBg(procIdx, "editor");
ok(procBgCss.indexOf("gradient") >= 0 && procBgCss.indexOf("url('") < 0,
    "procBg: без текстуры зона откатывается на градиент (procFallback), без url()");
sandbox.cfg.mode = String(procIdx);
ok(build().indexOf("url('") < 0, "процедурный набор (без canvas): картинок (url) в CSS нет — только градиент");
sandbox.cfg.mode = "0";

// ---- 17a3. Защита рантайма: санитайзер SETS + безопасный fallback CSS ----
// Сломанная ручная правка массива SETS не должна ронять фон: не-объекты отбрасываются,
// объекты нормализуются, а пустой/мусорный вход даёт один безопасный набор.
var ss = sandbox.sanitizeSets([
    null, "строка", 42,                                     // не-объекты -> отброшены
    { name: "Плохой акцент", accent: "red" },               // битый акцент -> дефолт
    { grad: "нельзя" },                                     // grad не массив -> убран
    { proc: "evil", base: "zzz" },                          // proc вне белого списка -> убран
    { name: "Ок", grad: ["#111111", "#222222"], accent: "#333333" }
]);
ok(ss.length === 4, "sanitizeSets: не-объекты отброшены, объекты нормализованы (4 из 7)");
ok(ss[0].accent === sandbox.DEFAULTS.accent, "sanitizeSets: битый акцент -> дефолтный");
ok(!("grad" in ss[1]), "sanitizeSets: grad не-массивом убран");
ok(!("proc" in ss[2]), "sanitizeSets: proc вне белого списка убран");
ok(ss[3].grad.length === 2 && ss[3].accent === "#333333", "sanitizeSets: валидный набор сохранён как есть");
ok(sandbox.sanitizeSets([]).length === 1 && sandbox.sanitizeSets("nope").length === 1,
    "sanitizeSets: из пустого/мусорного входа — один безопасный набор");
// Безопасный минимум CSS (когда buildCSS падает) — как минимум переменная акцента и кнопка.
var fb = sandbox.safeFallbackCSS();
ok(typeof fb === "string" && fb.indexOf("--mlbg-accent") >= 0,
    "safeFallbackCSS: содержит переменную акцента (кнопка/панель переживут сбой сборки)");

// ---- 17a4. Генератор набора по seed/палитре: sanitizeUserSets + genSetFromSeed + addGenSet ----
var us = sandbox.sanitizeUserSets([
    { name: "ok", grad: ["#111111", "#222222"], accent: "#333333" },
    { name: "пусто" },   // без grad/proc/картинки -> не отрисовывается -> отброшен
    null, 5
]);
ok(us.length === 1 && us[0].grad.length === 2, "sanitizeUserSets: неотрисовываемые/мусорные отброшены");
ok(sandbox.sanitizeUserSets([]).length === 0, "sanitizeUserSets: пустой вход -> пустой массив (без подстановки дефолта)");
var g1 = sandbox.genSetFromSeed("moonlight"), g2 = sandbox.genSetFromSeed("moonlight");
ok(g1.grad && g1.grad.length === 3 && sandbox.isColor(g1.accent) && g1.accent === g2.accent,
    "genSetFromSeed: seed даёт согласованный набор (3 цвета) и детерминирован");
var gc = sandbox.genSetFromSeed("#ff0000");
ok(sandbox.isColor(gc.accent) && gc.name.indexOf("#ff0000") >= 0,
    "genSetFromSeed: из базового цвета строит набор того же оттенка");
var lenBefore = sandbox.SETS.length;
var newIdx = sandbox.addGenSet(sandbox.genSetFromSeed("test-seed"));
ok(newIdx === lenBefore && sandbox.SETS.length === lenBefore + 1 && sandbox.cfg.genSets.length >= 1,
    "addGenSet: набор добавлен и в хвост SETS, и в cfg.genSets");
var reMerged = sandbox.mergeCfg({ genSets: sandbox.cfg.genSets, mode: String(newIdx) });
ok(reMerged.genSets.length === sandbox.cfg.genSets.length,
    "mergeCfg: genSets переживают сериализацию/санитизацию (выбор набора уцелеет)");
sandbox.cfg.mode = String(newIdx);
sandbox.removeGenSets();
ok(sandbox.SETS.length === sandbox.GEN_BASE && sandbox.cfg.genSets.length === 0,
    "removeGenSets: сгенерированные наборы убраны (SETS обрезан до GEN_BASE)");
ok(sandbox.cfg.mode === "0", "removeGenSets: висячий mode на удалённый набор сброшен на 0");

// ---- 17a4b. syncGenSets: импорт/пресет доносят ген-наборы до SETS без перезапуска ----
// Старт: чистое состояние после removeGenSets выше (SETS === GEN_BASE, genSets пуст, mode "0").
var genBase = sandbox.GEN_BASE;
var foreign = { genSets: [{ name: "Ввозной", grad: ["#101010", "#a0a0a0", "#505050"], accent: "#a0a0a0" }], mode: String(genBase) };
sandbox.cfg = sandbox.mergeForeign(foreign);
ok(sandbox.cfg.mode === "0",
    "импорт: mergeCfg зажимает mode на ещё-не-догруженный ген-набор (до syncGenSets)");
sandbox.syncGenSets();
ok(sandbox.SETS.length === genBase + 1 && sandbox.cfg.genSets.length === 1,
    "syncGenSets: импортированный ген-набор дозагружен в хвост SETS без перезапуска");
// то же восстановление активного набора, что делает importCfg после syncGenSets
if (/^\d+$/.test(foreign.mode) && parseInt(foreign.mode, 10) < sandbox.SETS.length) sandbox.cfg.mode = foreign.mode;
ok(sandbox.cfg.mode === String(genBase),
    "импорт + syncGenSets: активным стал импортированный ген-набор (mode не потерян)");
sandbox.cfg.genSets = []; sandbox.syncGenSets();
ok(sandbox.SETS.length === genBase && sandbox.cfg.mode === "0",
    "syncGenSets: пустые genSets обрезают хвост SETS и зажимают висячий mode на 0");
sandbox.cfg.mode = "0";

// ---- 17a5. Режим Present / Контраст+ / авто-медиа доступности ----
sandbox.cfg.mode = "0";
sandbox.cfg.fx.present = true;
contains(build(), ".monaco-editor .minimap { display: none", "present вкл: миникарта скрыта (шум убран)");
sandbox.cfg.fx.present = false;
ok(build().indexOf(".monaco-editor .minimap { display: none") < 0, "present выкл: правил Present нет");
sandbox.cfg.fx.highContrast = true;
contains(build(), ".view-line span { text-shadow", "highContrast вкл: усиленная тень глифов (читаемость)");
sandbox.cfg.fx.highContrast = false;
contains(build(), "@media (prefers-reduced-transparency: reduce)",
    "a11y: медиазапрос уменьшенной прозрачности присутствует всегда (авто, без эффектов)");

// ---- 17a6. Фокус-сессия: CSS под body.mlbg-focus + класс по (эффект && Помидор && running) ----
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
["focusSession", "pomodoro"].forEach(function (k) { sandbox.cfg.fx[k] = false; });
sandbox.cfg.fx.focusSession = true;
contains(build(), "body.mlbg-focus", "focusSession вкл: правила фокуса под классом body.mlbg-focus");
sandbox.cfg.fx.focusSession = false;
ok(build().indexOf("body.mlbg-focus") < 0, "focusSession выкл: правил фокуса нет");
// syncFocusClass: класс держится ровно когда эффект+«Помидор» включены И таймер идёт.
// body.classList в стабе — noop, поэтому на время теста подменяем его трекером.
var _focusCls = {};
sandbox.document.body.classList = {
    add: function (n) { _focusCls[n] = 1; }, remove: function (n) { delete _focusCls[n]; },
    contains: function (n) { return !!_focusCls[n]; }
};
sandbox.cfg.fx.focusSession = true; sandbox.cfg.fx.pomodoro = true; sandbox.pomo.running = true;
sandbox.syncFocusClass();
ok(_focusCls["mlbg-focus"] === 1, "syncFocusClass: запущенный «Помидор» с фокус-сессией -> класс mlbg-focus добавлен");
sandbox.pomo.running = false; sandbox.syncFocusClass();
ok(!_focusCls["mlbg-focus"], "syncFocusClass: на паузе (running=false) класс снят");
sandbox.pomo.running = true; sandbox.cfg.fx.focusSession = false; sandbox.syncFocusClass();
ok(!_focusCls["mlbg-focus"], "syncFocusClass: при выключенном эффекте класс не ставится даже во время сессии");
sandbox.cfg.fx.pomodoro = false; sandbox.pomo.running = false; sandbox.syncFocusClass();

// ---- 17a3. Превью при наведении: previewMode перебивает cfg.mode/фон по проекту ----
sandbox.cfg.mode = "0"; sandbox.previewMode = 3;
ok(sandbox.activeIndex() === 3, "previewMode: активным считается примеряемый набор");
contains(build(), "--mlbg-accent: #94e2d5", "previewMode: CSS собирается под примеряемый набор");
sandbox.previewMode = null;
ok(sandbox.activeIndex() === 0, "previewMode=null: возвращается обычный набор (cfg.mode)");

// ---- 17b. Палитра из картинки: живой контур берёт цвета палитры ----
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
sandbox.cfg.fx.groupBorder = true; sandbox.cfg.fx.groupBorderMono = false;
var pEd = sandbox.IMG + sandbox.SETS[0].editor;
sandbox._imgState[pEd] = { ok: true, luma: 0.5, palette: ["#111111", "#22ff22", "#3333ff"], resolved: true };
sandbox.cfg.fx.paletteSync = true;
var cssPal = build();
ok(cssPal.indexOf("#22ff22") >= 0 && cssPal.indexOf("#a6e3a1") < 0,
    "paletteSync: живой контур красится палитрой картинки, а не радужным дефолтом");
ok(JSON.stringify(sandbox.dominantPalette(red)).indexOf("#") >= 0, "dominantPalette: возвращает hex-цвета");
sandbox.cfg.fx.paletteSync = false;
contains(build(), "#a6e3a1", "paletteSync выкл: живой контур снова радужный по умолчанию");
delete sandbox._imgState[pEd];

// ---- 17c. Параллакс: включённый эффект двигает background-position за курсором ----
sandbox.cfg.fx.parallax = true;
contains(build(), "var(--mlbg-par-x", "parallax: background-position привязан к переменной курсора");
sandbox.cfg.fx.parallax = false;
ok(build().indexOf("var(--mlbg-par-x") < 0, "parallax выкл: смещения фона нет");

// ---- 17d. Поток: включённый эффект добавляет правило body.mlbg-flowing ----
sandbox.cfg.fx.flow = true;
contains(build(), "body.mlbg-flowing", "flow: CSS содержит правило глубокого приглушения в потоке");
sandbox.cfg.fx.flow = false;
ok(build().indexOf("body.mlbg-flowing") < 0, "flow выкл: правила потока нет");

// ---- 17e. Фон по проекту: имя из заголовка + приоритет закреплённого набора ----
sandbox.document.title = "app.js — MyProject — Visual Studio Code";
ok(sandbox.workspaceName() === "MyProject", "workspaceName: имя проекта из заголовка окна (тире-разделитель)");
sandbox.document.title = "readme.md - Repo - Visual Studio Code";
ok(sandbox.workspaceName() === "Repo", "workspaceName: работает и с дефисным разделителем");
// Форки VS Code (Cursor / VSCodium / Windsurf / Code - OSS): хвост-имя приложения тоже срезается
sandbox.document.title = "app.js — MyProject — Cursor";
ok(sandbox.workspaceName() === "MyProject", "workspaceName: срезает хвост Cursor (форк)");
sandbox.document.title = "app.js — MyProject — VSCodium";
ok(sandbox.workspaceName() === "MyProject", "workspaceName: срезает хвост VSCodium (форк)");
sandbox.document.title = "app.js — MyProject — Windsurf";
ok(sandbox.workspaceName() === "MyProject", "workspaceName: срезает хвост Windsurf (форк)");
sandbox.document.title = "readme.md - Repo - Visual Studio Code"; // вернуть для последующих тестов
sandbox.cfg.autoWorkspace = true; sandbox.cfg.workspaceSets = { "Repo": "3" }; sandbox.cfg.mode = "0";
ok(sandbox.activeIndex() === 3, "activeIndex: закреплённый за проектом набор важнее cfg.mode");
sandbox.cfg.autoWorkspace = false; sandbox.cfg.workspaceSets = {}; sandbox.document.title = ""; sandbox.cfg.mode = "0";
var wsm = sandbox.mergeCfg({ autoWorkspace: true, workspaceSets: { "ok": "2", "bad": "999", "x": 5 } });
ok(wsm.autoWorkspace === true && wsm.workspaceSets.ok === "2" && !("bad" in wsm.workspaceSets) && !("x" in wsm.workspaceSets),
    "mergeCfg: workspaceSets оставляет только валидные индексы-строки существующих наборов");
ok(sandbox.mergeCfg({ ambientBranch: "yes" }).ambientBranch === false && sandbox.mergeCfg({ ambientBranch: true }).ambientBranch === true,
    "mergeCfg: ambientBranch принимает только булево");

// ---- 17f. Шаринг образа: код кодирует вид и применяется, не трогая машинно-зависимое ----
sandbox.cfg = sandbox.mergeCfg({ mode: "2", accent: "#abcdef", fxp: { blur: 3 } });
var shareCode = sandbox.shareEncode();
ok(typeof shareCode === "string" && shareCode.length > 0, "shareEncode: образ кодируется в непустую строку");
sandbox.cfg = sandbox.mergeCfg({ mode: "5", accent: "#000000" });
sandbox.cfg.imgBase = "file:///mine/"; sandbox.cfg.setImg = { "0": { editor: "mine.jpg" } };
sandbox.applyShareCode(shareCode); sandbox.confirmAccept(); // чужой код сначала показывается окном «что изменится»
ok(sandbox.cfg.mode === "2" && sandbox.cfg.accent === "#abcdef", "applyShareCode: вид (набор/акцент) применился из кода");
ok(sandbox.cfg.imgBase === "file:///mine/" && sandbox.cfg.setImg["0"].editor === "mine.jpg",
    "applyShareCode: свои картинки и путь плагина НЕ затронуты чужим кодом");
ok(sandbox.shareDecode("aGVsbG8=") === null, "shareDecode: валидный base64, но не JSON -> null (без падения)");
sandbox.cfg.mode = "0";

// ---- 17g. Безопасность: сетевые картинки блокируются по умолчанию ----
ok(sandbox.isRemoteUrl("http://evil/x.jpg") && sandbox.isRemoteUrl("https://evil/x.jpg") &&
    sandbox.isRemoteUrl("//evil/x.jpg") && !sandbox.isRemoteUrl("file:///d:/x.jpg") &&
    !sandbox.isRemoteUrl("vscode-file://vscode-app/x.jpg") && !sandbox.isRemoteUrl("assets/x.jpg"),
    "isRemoteUrl: http(s)/протокол-относительные — удалённые, локальные/относительные — нет");
sandbox.cfg.allowRemoteImages = false;
ok(sandbox.imgUrl("http://evil/x.jpg") === "" && sandbox.imgUrl("file:///d:/x.jpg") === "file:///d:/x.jpg",
    "imgUrl: удалённый URL блокируется (\"\"), локальный проходит");
sandbox.cfg.mode = "0"; sandbox.cfg.setImg = { "0": { editor: "http://evil/beacon.jpg" } };
ok(sandbox.setImage(0, "editor") === sandbox.SETS[0].editor,
    "setImage: заблокированная удалённая картинка -> откат на родную картинку набора");
var cssRemote = build();
ok(cssRemote.indexOf("evil") < 0, "buildCSS: удалённого адреса нет в CSS (в сеть не ходим)");
sandbox.cfg.allowRemoteImages = true;
ok(sandbox.imgUrl("http://ok/x.jpg") === "http://ok/x.jpg" && sandbox.setImage(0, "editor") === "http://evil/beacon.jpg",
    "allowRemoteImages: явное согласие пропускает сетевые картинки");
sandbox.cfg.allowRemoteImages = false; sandbox.cfg.setImg = {};
// удалённая imgBase из чужого конфига игнорируется -> авто-путь
sandbox.cfg.imgBase = "http://evil/";
ok(sandbox.imgUrl("assets/x.jpg") === sandbox.IMG + "assets/x.jpg", "imgBase: удалённая база игнорируется без согласия -> авто-путь");
sandbox.cfg.imgBase = "";
// имя проекта не может отравить прототип (own-ключ "__proto__" из JSON отбрасывается)
var pp = sandbox.mergeCfg({ workspaceSets: JSON.parse('{"__proto__":"1","ok":"1"}') });
ok(!Object.prototype.hasOwnProperty.call(pp.workspaceSets, "__proto__") && pp.workspaceSets.ok === "1",
    "mergeCfg: опасный ключ проекта (__proto__) отброшен, безопасные сохранены");
ok(sandbox.mergeCfg({ allowRemoteImages: "1" }).allowRemoteImages === false,
    "mergeCfg: allowRemoteImages принимает только булево");
ok(sandbox.countRemoteImgs({ imgBase: "http://x/", setImg: { "0": { editor: "https://y/a.jpg", sidebar: "assets/ok.jpg" }, "1": { panel: "//z/b.jpg" } } }) === 3,
    "countRemoteImgs: считает удалённые ссылки (imgBase + setImg), локальные пропускает");
ok(sandbox.countRemoteImgs({ setImg: { "0": { editor: "assets/ok.jpg" } } }) === 0 && sandbox.countRemoteImgs(null) === 0,
    "countRemoteImgs: локальные пути и пустой ввод дают 0");

// ---- 17g2. Безопасность: file://ХОСТ (UNC) — сетевой SMB, блокируется как http ----
ok(sandbox.isRemoteUrl("file://192.0.2.1/share/x.jpg") === true &&
    sandbox.isRemoteUrl("file://attacker.example/a/pic.jpg") === true &&
    sandbox.isRemoteUrl("file:\\\\192.0.2.1\\share\\x.jpg") === true &&
    sandbox.isRemoteUrl("file:///d:/x.jpg") === false &&
    sandbox.isRemoteUrl("file://localhost/d:/x.jpg") === false,
    "isRemoteUrl: file://ХОСТ (UNC, в т.ч. через \\) — удалённый; file:/// и localhost — локальные");
sandbox.cfg.allowRemoteImages = false; sandbox.cfg.imgBase = "";
ok(sandbox.imgUrl("file://192.0.2.1/share/x.jpg") === "",
    "imgUrl: file://ХОСТ блокируется без согласия (в сеть/SMB не идём)");
sandbox.cfg.mode = "0"; sandbox.cfg.setImg = { "0": { editor: "file://192.0.2.1/share/beacon.jpg" } };
ok(sandbox.setImage(0, "editor") === sandbox.SETS[0].editor,
    "setImage: file://ХОСТ откатывается на родную картинку набора");
ok(sandbox.countRemoteImgs({ setImg: { "0": { editor: "file://192.0.2.1/x.jpg" } } }) === 1,
    "countRemoteImgs: file://ХОСТ теперь учитывается как сетевая ссылка");
sandbox.cfg.setImg = {};

// ---- 17g3. Чужой конфиг (импорт/пресет) не включает сетевые картинки сам (mergeForeign) ----
ok(sandbox.mergeForeign({ allowRemoteImages: true, mode: "2" }).allowRemoteImages === false,
    "mergeForeign: импорт/пресет всегда с выключенными сетевыми картинками");
ok(sandbox.mergeCfg({ allowRemoteImages: true }).allowRemoteImages === true,
    "mergeCfg: собственный сохранённый конфиг сохраняет включённые сетевые картинки");

// ---- 17h. DES-5: живое применение (applyNoSave) НЕ пишет конфиг в localStorage ----
ok(typeof sandbox.applyNoSave === "function" && typeof sandbox.applyThrottledLive === "function",
    "apply: есть applyNoSave/applyThrottledLive (живое применение без записи)");
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
sandbox.localStorage.setItem(sandbox.CFG_KEY, "SENTINEL");
sandbox.applyNoSave();
ok(sandbox.localStorage.getItem(sandbox.CFG_KEY) === "SENTINEL",
    "applyNoSave: не трогает localStorage (запись только по change/отпусканию)");
sandbox.saveCfg();
ok(sandbox.localStorage.getItem(sandbox.CFG_KEY) !== "SENTINEL",
    "saveCfg: конфиг реально записывается, когда нужно");

// ---- 17i. DES-3: probeImage резервирует поле thumb для мини-превью чипов ----
ok("thumb" in sandbox.probeImage("vscode-file://vscode-app/test/never.jpg"),
    "probeImage: состояние картинки содержит поле thumb (мини-превью чипа)");

// ---- 18. v16: новые эффекты добавляют/убирают свои CSS-правила ----
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
// перед проверками сбросим все новые эффекты, затем включаем по одному
["dimInactive", "reading", "glassCommand", "findAccent", "minimapFade", "indentAccent", "selectionMatch", "stickyGlass"]
    .forEach(function (k) { sandbox.cfg.fx[k] = false; });

// 18a. Тускнеть неактивные группы
sandbox.cfg.fx.dimInactive = true;
contains(build(), ".editor-group-container:not(.active)", "dimInactive: неактивные группы редактора тускнеют");
sandbox.cfg.fx.dimInactive = false;
ok(build().indexOf(".editor-group-container:not(.active)") < 0, "dimInactive выкл: правила нет");

// 18b. Режим чтения занижает прозрачность фона редактора (CSS отличается)
var noRead = parseFloat(sandbox.buildVars()["--mlbg-op-editor"]);
sandbox.cfg.fx.reading = true;
var withRead = parseFloat(sandbox.buildVars()["--mlbg-op-editor"]);
ok(withRead < noRead, "reading: режим чтения гасит фон редактора через --mlbg-op-editor (" + withRead + " < " + noRead + ")");
sandbox.cfg.fx.reading = false;

// 18c. Стекло палитры команд
// (.parameter-hints-widget уникален для glassCommand; .quick-input-widget есть и у rounded)
sandbox.cfg.fx.glassCommand = true;
contains(build(), ".parameter-hints-widget", "glassCommand: стекло палитры команд/автодополнения");
sandbox.cfg.fx.glassCommand = false;
ok(build().indexOf(".parameter-hints-widget") < 0, "glassCommand выкл: правила стекла палитры нет");

// 18d. Акцент поиска
sandbox.cfg.fx.findAccent = true;
contains(build(), ".currentFindMatch", "findAccent: подсветка текущего совпадения поиска");
sandbox.cfg.fx.findAccent = false;
ok(build().indexOf(".currentFindMatch") < 0, "findAccent выкл: правил поиска нет");

// 18e. Миникарта сквозь фон
sandbox.cfg.fx.minimapFade = true;
contains(build(), ".monaco-editor .minimap {", "minimapFade: миникарта полупрозрачная");
sandbox.cfg.fx.minimapFade = false;
ok(build().indexOf(".monaco-editor .minimap {") < 0, "minimapFade выкл: правила миникарты нет");

// 18f. Акцент отступов + парной скобки
sandbox.cfg.fx.indentAccent = true;
contains(build(), ".bracket-match", "indentAccent: акцент парной скобки");
sandbox.cfg.fx.indentAccent = false;
ok(build().indexOf(".bracket-match") < 0, "indentAccent выкл: правил скобки/отступа нет");

// 18g. Совпадения выделенного слова
sandbox.cfg.fx.selectionMatch = true;
contains(build(), ".selectionHighlight", "selectionMatch: подсветка совпадений слова");
sandbox.cfg.fx.selectionMatch = false;
ok(build().indexOf(".selectionHighlight") < 0, "selectionMatch выкл: правил совпадений нет");

// 18h. Стекло sticky scroll
sandbox.cfg.fx.stickyGlass = true;
contains(build(), ".sticky-widget", "stickyGlass: стекло закреплённой прокрутки");
sandbox.cfg.fx.stickyGlass = false;
ok(build().indexOf(".sticky-widget") < 0, "stickyGlass выкл: правил sticky нет");

// ---- 18i. v18: Aurora / спотлайт / пульс печати добавляют-убирают свои CSS-правила ----
["aurora", "spotlight", "typingPulse"].forEach(function (k) { sandbox.cfg.fx[k] = false; });

// Aurora: анимированный градиент-слой ::before на прокручиваемом элементе редактора
sandbox.cfg.fx.aurora = true;
contains(build(), "@keyframes mlbg-aurora", "aurora: keyframes дрейфа сияния присутствуют");
contains(build(), "scrollable-element::before", "aurora: слой ::before за кодом редактора");
sandbox.cfg.fx.aurora = false;
ok(build().indexOf("mlbg-aurora") < 0, "aurora выкл: правил сияния нет");

// Спотлайт: радиальное затемнение body::after вокруг курсора (--mlbg-mx/my)
sandbox.cfg.fx.spotlight = true;
contains(build(), "var(--mlbg-mx", "spotlight: центр затемнения привязан к переменной курсора");
contains(build(), "body::after", "spotlight: полноэкранный оверлей body::after");
sandbox.cfg.fx.spotlight = false;
ok(build().indexOf("var(--mlbg-mx") < 0, "spotlight выкл: оверлея затемнения нет");

// Пульс печати: анимация активной вкладки под классом body.mlbg-typing
sandbox.cfg.fx.typingPulse = true;
contains(build(), "@keyframes mlbg-typpulse", "typingPulse: keyframes пульса вкладки присутствуют");
sandbox.cfg.fx.typingPulse = false;
ok(build().indexOf("mlbg-typpulse") < 0, "typingPulse выкл: правил пульса нет");

// ---- 18j. v19: Тон акцентом / Читаемость / Реакция на ошибки ----
["tint", "legible", "errorReact"].forEach(function (k) { sandbox.cfg.fx[k] = false; });
// Тон: полноэкранный оверлей body::before с mix-blend overlay
sandbox.cfg.fx.tint = true;
var cssTint = build();
ok(cssTint.indexOf("body::before") >= 0 && cssTint.indexOf("mix-blend-mode: overlay") >= 0,
    "tint: оверлей body::before с mix-blend overlay присутствует");
sandbox.cfg.fx.tint = false;
ok(build().indexOf("mix-blend-mode: overlay") < 0, "tint выкл: тонировки нет");
// Читаемость: тень глифов кода (без изменения метрик)
sandbox.cfg.fx.legible = true;
contains(build(), ".monaco-editor .view-line span { text-shadow", "legible: тень глифов кода добавлена");
sandbox.cfg.fx.legible = false;
ok(build().indexOf(".view-line span { text-shadow") < 0, "legible выкл: тени глифов нет");
// Реакция на ошибки: правило под классом body.mlbg-errors + keyframes
sandbox.cfg.fx.errorReact = true;
contains(build(), "body.mlbg-errors", "errorReact: правило подсветки под классом body.mlbg-errors");
contains(build(), "@keyframes mlbg-errpulse", "errorReact: keyframes красного пульса присутствуют");
sandbox.cfg.fx.errorReact = false;
ok(build().indexOf("mlbg-errpulse") < 0, "errorReact выкл: правил реакции нет");
// problemsCount: парсит число ошибок из текста статусбара (первое число у иконки ошибок)
ok(typeof sandbox.problemsCount === "function" && sandbox.problemsCount() === 0,
    "problemsCount: без статусбара в стабе возвращает 0, не бросает");
// ensureErrorClass не бросает и при выключенном эффекте снимает класс
var _errThrew = null; try { sandbox.cfg.fx.errorReact = false; sandbox.ensureErrorClass(); } catch (e) { _errThrew = e; }
ok(_errThrew === null, "ensureErrorClass: отрабатывает без исключений (эффект выкл — класс снят)");

// ---- 18k. v21: Живой фон / Анимации UI / Акрил ----
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
["liveBg", "uiAnim", "acrylic", "cursorTrail"].forEach(function (k) { sandbox.cfg.fx[k] = false; });
// Живой фон: на фото-наборе (mode 0) правил нет (у фото свой Ken Burns); на градиентном — есть.
sandbox.cfg.fx.liveBg = true;
ok(build().indexOf("mlbg-livebg") < 0, "liveBg: на фото-наборе пан-фона нет (у фото свой Ken Burns)");
sandbox.cfg.mode = String(gradIdx);
contains(build(), "@keyframes mlbg-livebg", "liveBg: на градиентном наборе есть keyframes пана фона");
sandbox.cfg.fx.liveBg = false;
ok(build().indexOf("mlbg-livebg") < 0, "liveBg выкл: пан-анимации нет");
sandbox.cfg.mode = "0";
// Анимации UI: keyframes появления виджетов
sandbox.cfg.fx.uiAnim = true;
contains(build(), "@keyframes mlbg-uipop", "uiAnim: keyframes появления виджетов присутствуют");
sandbox.cfg.fx.uiAnim = false;
ok(build().indexOf("mlbg-uipop") < 0, "uiAnim выкл: анимаций интерфейса нет");
// Акрил: усиленный backdrop-filter (blur+saturate) на весь воркбенч
sandbox.cfg.fx.acrylic = true;
contains(build(), "saturate(1.5)", "acrylic: усиленное матовое стекло (blur+saturate) на воркбенч");
sandbox.cfg.fx.acrylic = false;
ok(build().indexOf("saturate(1.5)") < 0, "acrylic выкл: усиленного стекла нет");

// ---- 18l. v21: Шлейф курсора / Питомец (рантайм-виджеты, без исключений) ----
sandbox.cfg.mode = "0"; sandbox.cfg.enabled = true;
var trailThrew = null;
try {
    sandbox.cfg.fx.cursorTrail = true; sandbox.ensureCursorTrail();
    sandbox.pushTrail(10, 10); sandbox.pushTrail(20, 22); sandbox.loopTrail();
    sandbox.cfg.fx.cursorTrail = false; sandbox.ensureCursorTrail();
} catch (e) { trailThrew = e; }
ok(trailThrew === null, "cursorTrail: создание/точка/кадр/удаление шлейфа без исключений" + (trailThrew ? " (" + trailThrew.message + ")" : ""));
var petThrew = null;
try {
    sandbox.cfg.fx.pet = true; sandbox.ensurePet();
    sandbox.petState.typedAt = Date.now(); sandbox.loopPet(1000);                    // «печатаешь»
    sandbox.petState.typedAt = 0; sandbox.petState.errors = 3; sandbox.loopPet(2000); // «ошибки»
    sandbox.petState.errors = 0; sandbox.loopPet(3000);                              // «покой»
    sandbox.cfg.fx.pet = false; sandbox.ensurePet();
} catch (e) { petThrew = e; }
ok(petThrew === null, "pet: маскот во всех настроениях (покой/печать/ошибки) рисуется без исключений" + (petThrew ? " (" + petThrew.message + ")" : ""));
sandbox.cfg.fx.pet = true; sandbox.petState.errors = 0; sandbox.petState.typedAt = 0;
ok(sandbox.petMood() === "idle", "petMood: без печати и ошибок — покой");
sandbox.petState.errors = 2;
ok(sandbox.petMood() === "alert", "petMood: при ошибках в коде — тревога");
sandbox.petState.errors = 0; sandbox.petState.typedAt = Date.now();
ok(sandbox.petMood() === "type", "petMood: недавняя печать — «печатаешь»");
sandbox.cfg.fx.pet = false; sandbox.petState.errors = 0; sandbox.petState.typedAt = 0;

// ---- 18m. v21: фон по ветке / по языку + рассвет-закат ----
// Санитизация карт контекста (как workspaceSets): валидные индексы-строки, мусор отброшен.
var bsm = sandbox.mergeCfg({ autoBranch: true, branchSets: { "main": "2", "bad": "999", "x": 5 }, autoLang: true, langSets: { "js": "3", "py": "999" } });
ok(bsm.autoBranch === true && bsm.branchSets.main === "2" && !("bad" in bsm.branchSets) && !("x" in bsm.branchSets),
    "mergeCfg: branchSets — только валидные индексы-строки существующих наборов");
ok(bsm.autoLang === true && bsm.langSets.js === "3" && !("py" in bsm.langSets),
    "mergeCfg: langSets — только валидные индексы (несуществующий отброшен)");
ok(sandbox.mergeCfg({ autoBranch: "yes" }).autoBranch === false, "mergeCfg: autoBranch принимает только булево");
// Приоритет activeIndex: проект > ветка > язык > mode (подменяем чтение ветки/расширения).
var _gb = sandbox.gitBranch, _ef = sandbox.editorFileExt;
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
sandbox.gitBranch = function () { return "feature"; };
sandbox.editorFileExt = function () { return "py"; };
sandbox.cfg.autoBranch = true; sandbox.cfg.branchSets = { "feature": "3" };
ok(sandbox.activeIndex() === 3, "activeIndex: закреплённый за веткой набор перебивает mode");
sandbox.cfg.autoLang = true; sandbox.cfg.langSets = { "py": "5" };
ok(sandbox.activeIndex() === 3, "activeIndex: ветка приоритетнее языка файла");
sandbox.cfg.autoBranch = false;
ok(sandbox.activeIndex() === 5, "activeIndex: без ветки срабатывает набор по языку файла (.py -> 5)");
sandbox.cfg.autoWorkspace = true; sandbox.cfg.workspaceSets = { "Repo": "1" }; sandbox.document.title = "a.py - Repo - Visual Studio Code";
ok(sandbox.activeIndex() === 1, "activeIndex: проект приоритетнее и ветки, и языка");
sandbox.gitBranch = _gb; sandbox.editorFileExt = _ef; // восстановить оригиналы (иначе сломаем тест scrapeHealth ниже)
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.document.title = "";
ok(sandbox.editorFileExt() === "", "editorFileExt: без активной вкладки возвращает пустую строку (не бросает)");
// Рассвет/закат: sunTimes даёт числовые часы, isDaytime в sun-режиме не бросает.
var _st = sandbox.sunTimes(55.75, 37.62, new Date(2026, 5, 21, 12, 0));
ok(_st && typeof _st.rise === "number" && typeof _st.set === "number" &&
    _st.rise >= 0 && _st.rise < 24 && _st.set >= 0 && _st.set < 24,
    "sunTimes: возвращает восход/закат в местных часах [0,24)");
sandbox.cfg.autoTime = { on: false, day: 1, night: 5, from: 8, to: 20, mode: "sun", lat: 55.75, lon: 37.62 };
var _sunThrew = null, _dt; try { _dt = sandbox.isDaytime(); } catch (e) { _sunThrew = e; }
ok(_sunThrew === null && typeof _dt === "boolean", "isDaytime: режим рассвет/закат считает день/ночь без исключений");
var atc2 = sandbox.mergeCfg({ autoTime: { mode: "sun", lat: 200, lon: -400 } }).autoTime;
ok(atc2.mode === "sun" && atc2.lat === 90 && atc2.lon === -180, "mergeCfg: autoTime.mode/lat/lon санитизируются (координаты зажаты)");
sandbox.cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20, mode: "hours", lat: 0, lon: 0 };
sandbox.cfg.autoLang = false; sandbox.cfg.autoWorkspace = false; sandbox.cfg.workspaceSets = {}; sandbox.cfg.mode = "0";

// ---- 18n. v21: библиотека своих картинок ----
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.cfg.enabled = true;
var libm = sandbox.mergeCfg({ library: ["file:///d:/a.jpg", 123, "vscode-file://vscode-app/b.png", ""], librarySlideshow: true });
ok(libm.library.length === 2 && libm.library[0] === "file:///d:/a.jpg" && libm.librarySlideshow === true,
    "mergeCfg: library — только непустые строки-пути, librarySlideshow булев");
sandbox.cfg.library = ["file:///d:/lib1.jpg", "file:///d:/lib2.jpg"]; sandbox.cfg.librarySlideshow = true; sandbox.sessionLibIndex = 0;
ok(sandbox.libraryActive() === true, "libraryActive: включено при enabled + librarySlideshow + непустой библиотеке");
ok(sandbox.libraryEditorUrl() === "file:///d:/lib1.jpg", "libraryEditorUrl: отдаёт текущую картинку библиотеки");
contains(build(), "lib1.jpg", "buildCSS: библиотека показывает свою картинку в зоне редактора");
var _liBefore = sandbox.sessionLibIndex;
sandbox.libSlide.last = 0; sandbox.cfg.slideshow.min = 1; sandbox.libraryTick();
ok(sandbox.sessionLibIndex === _liBefore + 1, "libraryTick: по таймеру сдвигает индекс библиотеки");
ok(sandbox.countRemoteImgs({ library: ["http://evil/x.jpg", "assets/ok.jpg"] }) === 1, "countRemoteImgs: учитывает удалённые ссылки в библиотеке");
sandbox.cfg.librarySlideshow = false; sandbox.cfg.library = []; sandbox.cfg.mode = "0";

// ---- 18o. v21: витрина/скринсейвер при простое ----
var ssm = sandbox.mergeCfg({ screensaver: { on: true, min: 200 } }).screensaver;
ok(ssm.on === true && ssm.min === 120, "mergeCfg: screensaver.on булев, min зажат в 1..120");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.cfg.enabled = true;
sandbox.cfg.screensaver = { on: true, min: 1 };
var ssThrew = null;
try {
    sandbox.saver.lastAct = 0; sandbox.screensaverTick();      // давно простаиваем -> показать
    var shown = sandbox.saver.active;
    sandbox.screensaverBump();                                 // активность -> убрать
    ok(shown === true && sandbox.saver.active === false, "screensaverTick/bump: простой показывает витрину, активность убирает");
} catch (e) { ssThrew = e; }
ok(ssThrew === null, "screensaver: показ/обновление/сокрытие без исключений" + (ssThrew ? " (" + ssThrew.message + ")" : ""));
sandbox.cfg.screensaver = { on: false, min: 5 }; sandbox.screensaverSync();
ok(sandbox.saver.active === false, "screensaverSync: выключение убирает активную витрину");
sandbox.cfg.mode = "0";

// ---- 18p. v21: статистика сессии ----
sandbox.statsReset();
ok(sandbox.statsState.keys === 0 && sandbox.statsState.fileCount === 0, "statsReset: обнуляет счётчики сессии");
sandbox.statsOnType(); sandbox.statsOnType();
ok(sandbox.statsState.keys === 2, "statsOnType: считает нажатия");
ok(sandbox.fmtDur(0) === "0:00" && sandbox.fmtDur(65000) === "1:05" && sandbox.fmtDur(3665000) === "1:01:05",
    "fmtDur: формат MM:SS и H:MM:SS");
var statThrew = null;
try { sandbox.cfg.fx.stats = true; sandbox.ensureStats(); sandbox.paintStats(); sandbox.statsTrackFile(); sandbox.cfg.fx.stats = false; sandbox.ensureStats(); } catch (e) { statThrew = e; }
ok(statThrew === null, "stats: виджет/подсчёт файла без исключений (нет статусбара в стабе)" + (statThrew ? " (" + statThrew.message + ")" : ""));
sandbox.statsReset();

// ---- 18q. v21: контраст акцента + дальтоник-безопасная палитра ----
ok(Math.round(sandbox.contrastRatio("#ffffff", "#000000")) === 21, "contrastRatio: белый/чёрный ~ 21:1 (максимум WCAG)");
ok(Math.abs(sandbox.contrastRatio("#808080", "#808080") - 1) < 0.001, "contrastRatio: одинаковые цвета -> 1:1");
ok(sandbox.CB_SAFE.length === 7 && sandbox.CB_SAFE.every(function (h) { return sandbox.isColor(h); }),
    "CB_SAFE: 7 дальтоник-безопасных hex-акцентов (Окабэ-Ито)");
sandbox.cfg.mode = "0";
ok(sandbox.isColor(sandbox.accentContrastRef()), "accentContrastRef: возвращает валидный hex подложки набора");

// ---- 19. v16: стиль частиц санитизируется по белому списку ----
ok(sandbox.safePartStyle("sakura") === "sakura" && sandbox.safePartStyle("dots") === "dots" &&
    sandbox.safePartStyle("evil<style>") === "dots" && sandbox.safePartStyle(123) === "dots",
    "safePartStyle: пропускает известные стили, мусор -> dots");
ok(sandbox.mergeCfg({ partStyle: "snow" }).partStyle === "snow" &&
    sandbox.mergeCfg({ partStyle: "zzz" }).partStyle === "dots" &&
    sandbox.mergeCfg({}).partStyle === "dots",
    "mergeCfg: partStyle санитизируется (известный проходит, мусор/пусто -> dots)");
ok(sandbox.PART_STYLES.length === 9, "PART_STYLES: 9 стилей частиц (8 форм + «Сезон (авто)»)");
ok(sandbox.safePartStyle("firefly") === "firefly" && sandbox.safePartStyle("rain") === "rain" &&
    sandbox.safePartStyle("confetti") === "confetti", "safePartStyle: новые стили (светлячки/дождь/конфетти) проходят белый список");
// «Сезон (авто)»: хранится как "seasonal", но partStyleNow разворачивает его в конкретную
// форму по месяцу (никогда не отдаёт "seasonal" в отрисовку). seasonStyle сам возвращает
// один из четырёх сезонных стилей, и он обязан быть в белом списке PART_STYLES.
ok(sandbox.safePartStyle("seasonal") === "seasonal", "safePartStyle: «seasonal» проходит белый список (это выбираемая опция)");
var _seasonPart = ["snow", "sakura", "firefly", "rain"];
ok(_seasonPart.indexOf(sandbox.seasonStyle()) >= 0, "seasonStyle: возвращает сезонный стиль (снег/сакура/светлячки/дождь)");
var _savedPart = sandbox.cfg.partStyle;
sandbox.cfg.partStyle = "seasonal";
ok(sandbox.partStyleNow() === sandbox.seasonStyle() && sandbox.partStyleNow() !== "seasonal",
    "partStyleNow: «seasonal» разворачивается в конкретный сезонный стиль, а не отдаёт «seasonal»");
sandbox.cfg.partStyle = _savedPart;
sandbox.cfg.partStyle = "snow";
ok(sandbox.partFalls() === true, "partFalls: снег падает (сверху вниз)");
sandbox.cfg.partStyle = "rain";
ok(sandbox.partFalls() === true, "partFalls: дождь падает (сверху вниз)");
sandbox.cfg.partStyle = "confetti";
ok(sandbox.partFalls() === true, "partFalls: конфетти падает (сверху вниз)");
sandbox.cfg.partStyle = "firefly";
ok(sandbox.partFalls() === false, "partFalls: светлячки всплывают (снизу вверх)");
sandbox.cfg.partStyle = "stars";
ok(sandbox.partFalls() === false, "partFalls: звёзды всплывают (снизу вверх)");
sandbox.cfg.partStyle = "dots";

// ---- 19a2. v18: отрисовка каждого стиля частиц прогоняется без исключений ----
// loopParticles рисует все формы; ctxStub теперь полноценный, поэтому ошибка в drawRound/
// drawShaped/drawStreak всплывёт здесь, а не утонет в try/catch ensureParticles.
sandbox.cfg.enabled = true; sandbox.cfg.fx.particles = true; sandbox.cfg.fxp.partCount = 12;
var drawThrew = null, drawStyle = "";
try {
    sandbox.PART_STYLES.forEach(function (st) {
        drawStyle = st[0];
        sandbox.cfg.partStyle = st[0];
        sandbox.ensureParticles(); // (пере)создать холст и набор частиц под стиль
        sandbox.loopParticles();   // один кадр отрисовки всех частиц этого стиля
    });
} catch (e) { drawThrew = e; }
ok(drawThrew === null, "loopParticles: все стили частиц (включая «Сезон») рисуются без исключений" +
    (drawThrew ? " (стиль " + drawStyle + ": " + drawThrew.message + ")" : ""));
sandbox.cfg.partStyle = "dots";

// ---- 19b. v16: partStyle входит в шаринг образа (SHARE_KEYS) ----
sandbox.cfg = sandbox.mergeCfg({ mode: "0", partStyle: "sakura" });
var scode = sandbox.shareEncode();
sandbox.cfg = sandbox.mergeCfg({ mode: "0", partStyle: "dots" });
sandbox.applyShareCode(scode); sandbox.confirmAccept();
ok(sandbox.cfg.partStyle === "sakura", "shareEncode/applyShareCode: стиль частиц переносится кодом образа");
sandbox.cfg.partStyle = "dots";

// ---- 20. Панель со вкладками собирается без ошибок (togglePanel не бросает) ----
// Простой режим (по умолчанию) строит только главное — его проверяем отдельно ниже; здесь
// проверяется полная панель со всеми вкладками и техническими секциями.
sandbox.DEFAULTS.ui.simple = false; sandbox.panelShowTech = true;
// Панель раскладывает 12 секций по 4 вкладкам (Набор/Вид/Терминал/Система). Прямой вызов
// togglePanel в мини-DOM-стабе ловит ReferenceError/битую проводку контролов панели, которую
// проверка только buildCSS не видит (панель строит десятки контролов из controls.js/io.js).
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
var panelThrew = null;
try { sandbox.togglePanel({ stopPropagation: function () {} }); }
catch (e) { panelThrew = e; }
ok(panelThrew === null, "togglePanel: панель со вкладками строится без исключений" + (panelThrew ? " (" + panelThrew.message + ")" : ""));
// Индекс поиска по панели: collapsible регистрирует секции в panelSections при сборке.
ok(Array.isArray(sandbox.panelSections) && sandbox.panelSections.length >= 8,
    "поиск: секции панели зарегистрированы в panelSections (" + (sandbox.panelSections ? sandbox.panelSections.length : "нет") + ")");
var _secTitles = (sandbox.panelSections || []).map(function (s) { return s.title; });
ok(_secTitles.indexOf("Эффекты") >= 0 && _secTitles.indexOf("Образы") >= 0 && _secTitles.indexOf("Диагностика") >= 0 && _secTitles.indexOf("Стили") >= 0,
    "поиск: индекс содержит ключевые секции (Эффекты / Образы / Стили / Диагностика)");
// панель добавлена в body и это наш диалог (id === PANEL_ID)
var builtPanel = null;
for (var bi = 0; bi < sandbox.document.body.children.length; bi++) {
    var ch = sandbox.document.body.children[bi];
    if (ch && ch.id === sandbox.PANEL_ID) { builtPanel = ch; break; }
}
ok(!!builtPanel, "togglePanel: диалог панели добавлен в body (id=" + sandbox.PANEL_ID + ")");
ok(builtPanel && builtPanel.getAttribute("role") === "dialog", "togglePanel: у панели role=dialog (доступность)");
// повторный вызов и refreshPanel не должны падать (частый путь: таймеры/смена набора)
var reThrew = null;
try { sandbox.refreshPanel(); sandbox.togglePanel({ stopPropagation: function () {} }); }
catch (e2) { reThrew = e2; }
ok(reThrew === null, "refreshPanel + повторный togglePanel не бросают" + (reThrew ? " (" + reThrew.message + ")" : ""));
ok(sandbox.panelTab === 0, "panelTab: активная вкладка по умолчанию 0");
// Указатель секций: collapsible регистрирует setOpen (нужен «Свернуть/Развернуть всё»).
ok(sandbox.panelSections.length > 0 && typeof sandbox.panelSections[0].setOpen === "function" && typeof sandbox.panelSections[0].expand === "function",
    "указатель секций: у секции есть setOpen/expand (свернуть-развернуть всё + переход)");

// ---- 20a2. v21: настройка меню (скрыть/показать секции и эффекты) ----
var uih = sandbox.mergeCfg({ ui: { hidden: { "Слайдшоу": true, "x": "no" }, hiddenFx: { "aurora": true, "y": 5 } } }).ui;
ok(uih.hidden["Слайдшоу"] === true && !("x" in uih.hidden) && uih.hiddenFx.aurora === true && !("y" in uih.hiddenFx),
    "mergeCfg: ui.hidden/hiddenFx принимают только булевы значения");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
sandbox.cfg.ui.hidden = { "Слайдшоу": true }; sandbox.panelEditMenu = false;
sandbox.togglePanel({ stopPropagation: function () {} });
var secTitles2 = (sandbox.panelSections || []).map(function (s) { return s.title; });
ok(secTitles2.indexOf("Слайдшоу") < 0, "настройка меню: скрытая секция не попадает в видимые (panelSections)");
var allTitles = (sandbox.panelAllSections || []).map(function (s) { return s.title; });
ok(allTitles.indexOf("Слайдшоу") >= 0 && allTitles.indexOf("Настройка меню") >= 0,
    "настройка меню: скрытая секция и сам менеджер есть в полном списке (panelAllSections)");
sandbox.cfg.ui.hidden = {};
sandbox.panelEditMenu = true;
var editThrew = null; try { sandbox.togglePanel({ stopPropagation: function () {} }); } catch (e) { editThrew = e; }
ok(editThrew === null, "настройка меню: режим редактирования строит панель без исключений" + (editThrew ? " (" + editThrew.message + ")" : ""));
sandbox.panelEditMenu = false;
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });

// ---- 20b. Запоминание вкладки: cfg.ui.tab санитизируется и подхватывается панелью ----
ok(sandbox.mergeCfg({ ui: { tab: 2 } }).ui.tab === 2 &&
    sandbox.mergeCfg({ ui: { tab: -5 } }).ui.tab === 0 &&
    sandbox.mergeCfg({ ui: { tab: 999 } }).ui.tab === 15 &&
    sandbox.mergeCfg({ ui: { tab: "x" } }).ui.tab === 0,
    "mergeCfg: ui.tab — неотрицательное целое, зажато в 0..15, мусор -> 0");
sandbox.cfg = sandbox.mergeCfg({ mode: "0", ui: { tab: 2 } });
sandbox.togglePanel({ stopPropagation: function () {} });
ok(sandbox.panelTab === 2, "togglePanel: стартовая вкладка берётся из cfg.ui.tab (запомнена между запусками)");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); // вернуть дефолт для последующих тестов

// ---- 20c. Зависимые контролы: partStyle-селект появляется только при включённых частицах ----
// (косвенно — панель со включёнными/выключенными частицами строится без ошибок в обоих случаях)
sandbox.cfg.fx.particles = false;
var noPartThrew = null; try { sandbox.togglePanel({ stopPropagation: function () {} }); } catch (e3) { noPartThrew = e3; }
ok(noPartThrew === null, "togglePanel: панель строится и когда «Частицы» выключены (стиль частиц скрыт)");
sandbox.cfg.fx.particles = true;

// ---- 17. Детерминизм сборки: build() дважды даёт идентичный артефакт ----
var B = require(path.join(ROOT, "build.js"));
ok(B.build(false) === B.build(false), "build.js: повторная сборка даёт идентичный custom-bg.js (детерминизм)");
// Сборка должна быть одинаковой и на РАЗНЫХ машинах. Windows-инструменты оставляют в
// исходниках CRLF, и раньше «пустая» строка с CR получала отступ в четыре пробела: артефакт
// с Windows отличался от собранного на Linux, и CI падал на сверке. build.js нормализует
// переводы строк на входе — проверяем результат прямо здесь.
var _art = B.build(false);
ok(_art.indexOf("\r") < 0, "build.js: в артефакте нет CR — сборка одинакова на Windows и Linux");
ok(!/^[ \t]+$/m.test(_art), "build.js: нет строк из одних пробелов (следствие CRLF в исходниках)");

// ---- 18. В src/ нет многострочных шаблонных литералов (backtick) ----
// build.js.indent() сдвигает КАЖДУЮ строку модуля на 4 пробела. Это безопасно, только пока
// в исходниках нет обратных кавычек: многострочный `...` при сдвиге получил бы лишние пробелы
// внутри строки (изменив её содержимое) — молчаливая порча артефакта. Ловим появление backtick
// в src сразу здесь, а не постфактум по странному поведению собранного custom-bg.js.
var _backtickHits = [];
B.FILES.forEach(function (rel) {
    var code = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (code.indexOf("`") >= 0) _backtickHits.push(rel);
});
ok(_backtickHits.length === 0, "build.js: в src/ нет backtick-литералов, сдвиг отступа безопасен" +
    (_backtickHits.length ? "  (найдено в: " + _backtickHits.join(", ") + ")" : ""));

// ---- 18z. История Undo/Redo: шаг фиксируется, undo/redo восстанавливают снимки ----
// commitHistory вызываем напрямую (в тесте не ждём дебаунс-таймер scheduleHistory).
// Проверяем, что после правки есть что отменять, undo возвращает прежнее значение,
// а redo — новое; и что авто-смена под _histSuppress не создаёт шага истории.
sandbox.cfg = sandbox.mergeCfg({ mode: "0", accent: "#111111" });
sandbox._histUndo.length = 0; sandbox._histRedo.length = 0;
sandbox._histLast = JSON.stringify(sandbox.cfg);   // база = текущее состояние
sandbox.cfg.accent = "#222222";                    // пользовательская правка
sandbox.commitHistory();
ok(sandbox.canUndo() === true, "история: после изменения появляется шаг отмены");
sandbox.undo();
ok(sandbox.cfg.accent === "#111111", "undo: акцент вернулся к прежнему (#111111)");
ok(sandbox.canRedo() === true, "история: после undo доступно redo");
sandbox.redo();
ok(sandbox.cfg.accent === "#222222", "redo: акцент снова #222222");
// Авто-смена (эмуляция слайдшоу): под _histSuppress шаг истории НЕ добавляется.
var _uLen = sandbox._histUndo.length;
sandbox._histSuppress++;
sandbox.cfg.mode = "3"; sandbox.saveCfg();
sandbox._histSuppress--;
sandbox.commitHistory();
ok(sandbox._histUndo.length === _uLen, "история: авто-смена под _histSuppress не создаёт шага отмены");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); // вернуть дефолт для последующих тестов
sandbox._histUndo.length = 0; sandbox._histRedo.length = 0; sandbox._histLast = JSON.stringify(sandbox.cfg);

// ---- 18a. Диагностика установки: отчёт собирается и содержит ключевые поля ----
// diagnostics() только читает состояние (ничего не меняет) и отдаёт { lines, ok, text }.
// Проверяем, что отчёт непустой, содержит опорные поля и булев флаг ok, и не бросает.
var _diagThrew = null, diag = null;
try { diag = sandbox.diagnostics(); } catch (e) { _diagThrew = e; }
ok(_diagThrew === null && diag && typeof diag.text === "string" &&
    diag.text.indexOf("диагностика") >= 0 && diag.text.indexOf("Версия") >= 0 &&
    diag.text.indexOf("Всего наборов") >= 0 && typeof diag.ok === "boolean" && Array.isArray(diag.lines),
    "diagnostics: собирает отчёт (версия/набор/итог + флаг ok), не бросает");

// ---- 18b. Экспорт цветовой темы VS Code (buildColorTheme / exportTheme / _slug) ----
// Тема собирается из палитры активного набора: цвета интерфейса + подсветка синтаксиса.
// Проверяем структуру, что акцент набора попадает в тему, что смена набора меняет цвета,
// и что подложка выводится корректно для grad/proc/фото-наборов.
var HEXA = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); // «Алые кроны», акцент #f38ba8 (фото-набор)
var thm = sandbox.buildColorTheme(0);
ok(thm && thm.obj && thm.obj.type === "dark" && typeof thm.obj.name === "string" &&
    thm.obj.colors && Array.isArray(thm.obj.tokenColors) && thm.obj.semanticHighlighting === true,
    "buildColorTheme: возвращает валидный объект темы (type=dark, colors, tokenColors, semanticHighlighting)");
ok(thm.obj.colors["editorCursor.foreground"] === "#f38ba8" &&
    thm.obj.colors["button.background"] === "#f38ba8",
    "buildColorTheme: акцент набора (#f38ba8) уходит в курсор/кнопки темы");
ok(HEXA.test(thm.obj.colors["editor.background"]) && HEXA.test(thm.obj.colors["editor.foreground"]),
    "buildColorTheme: подложка и текст редактора — валидные hex");
// Все значения colors — валидные hex (#rrggbb или #rrggbbaa): в теме не должно быть мусора.
var _badColor = Object.keys(thm.obj.colors).filter(function (k) { return !HEXA.test(thm.obj.colors[k]); });
ok(_badColor.length === 0, "buildColorTheme: все цвета темы — валидные hex" +
    (_badColor.length ? " (мусор: " + _badColor.slice(0, 3).join(", ") + ")" : ""));
// Все tokenColors.settings.foreground — валидные hex.
var _badTok = thm.obj.tokenColors.filter(function (t) { return !(t.settings && HEXA.test(t.settings.foreground)); });
ok(_badTok.length === 0, "buildColorTheme: у каждого правила tokenColors валидный foreground-hex");
// Имя темы содержит имя набора.
ok(thm.obj.name.indexOf("MoonLight") === 0 && thm.name === thm.obj.name,
    "buildColorTheme: имя темы начинается с «MoonLight» и совпадает в объекте/обёртке");
// Смена набора меняет акцент темы.
var thm3 = sandbox.buildColorTheme(3); // «Свиток тумана», акцент #94e2d5
ok(thm3.obj.colors["editorCursor.foreground"] === "#94e2d5",
    "buildColorTheme: смена набора меняет акцент темы (#94e2d5)");
// Grad-набор: подложка темы = первый цвет градиента набора.
var _gi = -1; for (var _t = 0; _t < sandbox.SETS.length; _t++) if (sandbox.isGradSet(_t)) { _gi = _t; break; }
ok(_gi >= 0 && sandbox.buildColorTheme(_gi).obj.colors["editor.background"] === sandbox.SETS[_gi].grad[0],
    "buildColorTheme: у grad-набора подложка = grad[0]");
// Proc-набор: подложка темы = base набора.
var _pi = -1; for (var _u = 0; _u < sandbox.SETS.length; _u++) if (sandbox.isProcSet(_u)) { _pi = _u; break; }
ok(_pi >= 0 && sandbox.buildColorTheme(_pi).obj.colors["editor.background"] === sandbox.SETS[_pi].base,
    "buildColorTheme: у proc-набора подложка = base");
// Правка акцента набора (cfg.setAccent) отражается в теме.
sandbox.cfg.setAccent = { "0": "#abcdef" };
ok(sandbox.buildColorTheme(0).obj.colors["editorCursor.foreground"] === "#abcdef",
    "buildColorTheme: пользовательский акцент набора (setAccent) уходит в тему");
sandbox.cfg.setAccent = {};
// exportTheme не бросает (Blob/URL/clipboard застабены).
var _expThrew = null; try { sandbox.cfg.mode = "0"; sandbox.exportTheme(); } catch (e) { _expThrew = e; }
ok(_expThrew === null, "exportTheme: выгрузка темы не бросает" + (_expThrew ? " (" + _expThrew.message + ")" : ""));
// _slug: транслит кириллицы -> ASCII-слаг для имени файла; пусто -> "".
ok(sandbox._slug("Алые кроны") === "alye-krony" && sandbox._slug("Grid 21!") === "grid-21" &&
    sandbox._slug("---") === "" && /^[a-z0-9-]*$/.test(sandbox._slug("Хрустальное озеро")),
    "_slug: кириллица транслитерируется в ASCII-слаг (для имени файла)");
// _hexA: hex + альфа -> #rrggbbaa.
ok(sandbox._hexA("#112233", 1) === "#112233ff" && sandbox._hexA("#112233", 0) === "#11223300" &&
    /^#112233[0-9a-f]{2}$/.test(sandbox._hexA("#112233", 0.5)),
    "_hexA: добавляет 2-значную альфу к hex (#rrggbbaa)");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });

// ---- 18c. Устанавливаемые темы расширения (extension/contributes.themes + themes/*.json) ----
// build-themes.js генерирует по теме на встроенный набор и прописывает их в extension/package.json.
// Здесь — read-only проверка целостности (без запуска генератора): каждая объявленная тема
// существует файлом, парсится как JSON и имеет ожидаемую форму (type=dark, есть colors).
var extPkgPath = path.join(ROOT, "extension", "package.json");
if (fs.existsSync(extPkgPath)) {
    var extPkg = JSON.parse(fs.readFileSync(extPkgPath, "utf8"));
    var themes = (extPkg.contributes && extPkg.contributes.themes) || [];
    ok(Array.isArray(themes) && themes.length > 0,
        "extension: contributes.themes непустой (" + themes.length + " тем)");
    var themeBad = [];
    themes.forEach(function (t) {
        try {
            if (!t || t.uiTheme !== "vs-dark" || typeof t.path !== "string") { themeBad.push(String(t && t.label)); return; }
            var tp = path.join(ROOT, "extension", t.path);
            if (!fs.existsSync(tp)) { themeBad.push(t.label + " (нет файла)"); return; }
            var obj = JSON.parse(fs.readFileSync(tp, "utf8"));
            if (obj.type !== "dark" || !obj.colors || !obj.colors["editor.background"] || !Array.isArray(obj.tokenColors)) themeBad.push(t.label + " (форма)");
        } catch (e) { themeBad.push((t && t.label) + " (" + e.message + ")"); }
    });
    ok(themeBad.length === 0, "extension: все объявленные темы существуют и валидны" +
        (themeBad.length ? " (проблемы: " + themeBad.slice(0, 3).join(", ") + " — перегенерируй: node build-themes.js)" : ""));
    ok(extPkg.categories && extPkg.categories.indexOf("Themes") >= 0,
        "extension: категория «Themes» объявлена (находимость тем в маркетплейсе)");
} else {
    ok(true, "extension: package.json отсутствует — проверка тем пропущена");
}

// ---- 19. Линтер инвариантов конфига (рассинхрон таблиц UI и DEFAULTS) ----
// Тумблеры/слайдеры/стили частиц описаны ДВАЖДЫ: раз в таблице для UI (FX_LIST / PARAMS /
// PART_STYLES) и раз в дефолтах (DEFAULTS.fx / DEFAULTS.fxp / DEFAULTS.partStyle). Легко
// добавить эффект в один список и забыть про другой — тогда тумблер либо не имеет дефолта
// (читается undefined), либо дефолт есть, но контрола в панели нет. Эти проверки ловят
// расхождение сразу при добавлении, а не по «странному поведению» уже в редакторе.
var fxListKeys = sandbox.FX_LIST.map(function (o) { return o[0]; });
var fxDefKeys = Object.keys(sandbox.DEFAULTS.fx);
var fxNoDefault = fxListKeys.filter(function (k) { return typeof sandbox.DEFAULTS.fx[k] !== "boolean"; });
ok(fxNoDefault.length === 0, "линтер: у каждого эффекта из FX_LIST есть булев дефолт в DEFAULTS.fx" +
    (fxNoDefault.length ? "  (без дефолта: " + fxNoDefault.join(", ") + ")" : ""));
var fxNoControl = fxDefKeys.filter(function (k) { return fxListKeys.indexOf(k) < 0; });
ok(fxNoControl.length === 0, "линтер: у каждого дефолта DEFAULTS.fx есть тумблер в FX_LIST" +
    (fxNoControl.length ? "  (без контрола: " + fxNoControl.join(", ") + ")" : ""));

var paramKeys = sandbox.PARAMS.map(function (o) { return o[0]; });
var fxpDefKeys = Object.keys(sandbox.DEFAULTS.fxp);
var pNoDefault = paramKeys.filter(function (k) { return typeof sandbox.DEFAULTS.fxp[k] !== "number"; });
ok(pNoDefault.length === 0, "линтер: у каждого слайдера PARAMS есть числовой дефолт в DEFAULTS.fxp" +
    (pNoDefault.length ? "  (без дефолта: " + pNoDefault.join(", ") + ")" : ""));
var pNoControl = fxpDefKeys.filter(function (k) { return paramKeys.indexOf(k) < 0; });
ok(pNoControl.length === 0, "линтер: у каждого дефолта DEFAULTS.fxp есть слайдер в PARAMS" +
    (pNoControl.length ? "  (без контрола: " + pNoControl.join(", ") + ")" : ""));

// Каждая пара PARAMS корректна: min < max, step > 0, число знаков — целое >= 0, а дефолт
// из DEFAULTS.fxp попадает в диапазон (иначе clampNum молча его подрежет при первом заходе).
var badParam = sandbox.PARAMS.filter(function (o) {
    var min = o[2], max = o[3], step = o[4], dec = o[5], def = sandbox.DEFAULTS.fxp[o[0]];
    return !(min < max) || !(step > 0) || !(dec >= 0 && dec === Math.round(dec)) || def < min || def > max;
});
ok(badParam.length === 0, "линтер: у слайдеров PARAMS корректны min<max, step>0, знаки>=0 и дефолт в диапазоне" +
    (badParam.length ? "  (проблемные: " + badParam.map(function (o) { return o[0]; }).join(", ") + ")" : ""));

// Дефолтный стиль частиц обязан быть в белом списке PART_STYLES — иначе safePartStyle
// молча вернёт "dots", а сохранённый выбор пользователя выглядел бы «сбрасывающимся».
var partKeys = sandbox.PART_STYLES.map(function (o) { return o[0]; });
ok(partKeys.indexOf(sandbox.DEFAULTS.partStyle) >= 0,
    "линтер: DEFAULTS.partStyle входит в белый список PART_STYLES (" + sandbox.DEFAULTS.partStyle + ")");

// ---- 30. i18n: t() переводит на EN, на RU/неизвестном отдаёт исходную строку ----
var _langWas = sandbox.cfg.lang;
sandbox.cfg.lang = "en";
ok(sandbox.uiLang() === "en", "i18n: cfg.lang='en' -> uiLang()='en'");
ok(sandbox.t("Сохранить") === "Save" && sandbox.t("Эффекты") === "Effects",
    "i18n: t() переводит известные строки на английский");
ok(sandbox.t("Строка без перевода 12345") === "Строка без перевода 12345",
    "i18n: t() возвращает исходную строку, если перевода нет (не ломается)");
sandbox.cfg.lang = "ru";
ok(sandbox.t("Сохранить") === "Сохранить", "i18n: на русском t() возвращает русскую строку без изменений");
sandbox.cfg.lang = "auto";
ok(sandbox.t("Сохранить") === "Сохранить", "i18n: 'auto' без EN-локали VS Code -> русский (родной язык проекта)");
ok(sandbox.mergeCfg({ lang: "en" }).lang === "en" && sandbox.mergeCfg({ lang: "zzz" }).lang === "auto",
    "mergeCfg: lang принимает auto/ru/en, мусор -> 'auto'");
sandbox.cfg.lang = _langWas;
// Инвариант: у каждого ключа EN-словаря значение — непустая строка (нет «дыр» в переводе).
var enBad = Object.keys(sandbox.EN).filter(function (k) { return typeof sandbox.EN[k] !== "string" || !sandbox.EN[k]; });
ok(enBad.length === 0, "линтер: все значения EN-словаря — непустые строки" + (enBad.length ? "  (пустые: " + enBad.slice(0, 3).join(", ") + ")" : ""));

// Инвариант: у каждой подсказки INFO есть английская пара в INFO_EN (непустая строка) — иначе
// в английском режиме «?» этой настройки остался бы на русском (рассинхрон RU/EN подсказок).
var infoNoEn = Object.keys(sandbox.INFO).filter(function (k) { return typeof sandbox.INFO_EN[k] !== "string" || !sandbox.INFO_EN[k]; });
ok(infoNoEn.length === 0, "линтер: у каждой подсказки INFO есть перевод в INFO_EN" + (infoNoEn.length ? "  (без EN: " + infoNoEn.slice(0, 5).join(", ") + ")" : ""));
var enNoInfo = Object.keys(sandbox.INFO_EN).filter(function (k) { return !(k in sandbox.INFO); });
ok(enNoInfo.length === 0, "линтер: в INFO_EN нет лишних ключей без пары в INFO" + (enNoInfo.length ? "  (лишние: " + enNoInfo.slice(0, 5).join(", ") + ")" : ""));
// infoText переводит подсказку контрола на EN и не трогает на RU.
sandbox.cfg.lang = "en";
ok(sandbox.infoText(sandbox.INFO.fx_aurora) === sandbox.INFO_EN.fx_aurora, "infoText: подсказка контрола переводится на английский");
ok(sandbox.infoText("Эффекты") === "Effects", "infoText: подпись секции берётся из общего словаря (fallback t())");
sandbox.cfg.lang = "ru";
ok(sandbox.infoText(sandbox.INFO.fx_aurora) === sandbox.INFO.fx_aurora, "infoText: на русском подсказка не меняется");
sandbox.cfg.lang = _langWas;

// ---- 31. Профили: applyProfile накладывает patch поверх текущего вида ----
var _cfgWas = sandbox.clone(sandbox.cfg);
sandbox.cfg.mode = "3"; // выбранный набор должен сохраниться после профиля
sandbox.applyProfile("focus");
ok(sandbox.cfg.fx.spotlight === true && sandbox.cfg.fx.dimOnType === true && sandbox.cfg.fx.particles === false,
    "профиль 'Фокус': включил спотлайт/дим-при-печати, выключил частицы");
ok(sandbox.cfg.mode === "3", "профиль сохраняет выбранный набор (mode не сбрасывается)");
sandbox.applyProfile("minimal");
ok(sandbox.cfg.fx.glassTabs === false && sandbox.cfg.fx.particles === false && sandbox.cfg.fx.aurora === false,
    "профиль 'Минимал': выключил стекло/частицы/aurora (почти ванильный вид)");
ok(sandbox.cfg.enabled === true, "профиль включает фон (enabled=true)");
sandbox.cfg = _cfgWas; // вернуть исходный конфиг тесту
// Инвариант: все fx-ключи в патчах профилей существуют в DEFAULTS.fx (иначе mergeCfg их молча теряет).
var profFxBad = [];
sandbox.PROFILES.forEach(function (p) {
    if (!p.patch.fx) return;
    Object.keys(p.patch.fx).forEach(function (k) { if (!(k in sandbox.DEFAULTS.fx)) profFxBad.push(p.id + "." + k); });
});
ok(profFxBad.length === 0, "линтер: fx-ключи всех PROFILES есть в DEFAULTS.fx" + (profFxBad.length ? "  (лишние: " + profFxBad.join(", ") + ")" : ""));
ok(sandbox.profileById("focus") && !sandbox.profileById("нет-такого"), "profileById: находит существующий профиль, на несуществующий -> null");

// ---- 32. DOM-скрейпинг: учёт «здоровья» селекторов ----
var h0 = sandbox.scrapeHealth();
ok(Array.isArray(h0) && h0.length >= 3, "scrapeHealth: возвращает статус по каждому скрейперу (>=3)");
for (var sc = 0; sc < 10; sc++) sandbox.gitBranch(); // в песочнице статусбар пуст -> все попытки без попаданий
var gh = sandbox.scrapeHealth().filter(function (x) { return x.key === "gitBranch"; })[0];
ok(gh && gh.tries >= 8 && gh.hits === 0 && gh.ok === false,
    "scrapeHealth: 10 пустых чтений git-ветки -> селектор помечен как сбойный (ok=false)");

// ---- 33. Авто-бюджет производительности: дефолт включён ----
ok(sandbox.DEFAULTS.perfGuard === true, "perfGuard: включён по умолчанию");
ok(sandbox.mergeCfg({ perfGuard: false }).perfGuard === false, "mergeCfg: perfGuard принимает булево");

// ---- 34. Мост settings.json: seed из window.__MLBG_SEED__ ----
ok(sandbox.seedConfig() === null, "seedConfig: без window.__MLBG_SEED__ базового конфига нет");
sandbox.window.__MLBG_SEED__ = { accent: "#abcdef", mode: "2" };
ok(!!sandbox.seedConfig(), "seedConfig: window.__MLBG_SEED__ распознан");
sandbox.localStorage.removeItem("moonlight-bg-config"); // пустое хранилище -> loadCfg берёт seed
var seeded = sandbox.loadCfg();
ok(seeded.accent === "#abcdef" && seeded.mode === "2", "loadCfg: при пустом localStorage берёт базовый конфиг из seed");
var seedBad = sandbox.mergeCfg({ accent: "не-цвет" }); // seed проходит ту же санитизацию mergeCfg
ok(seedBad.accent === sandbox.DEFAULTS.accent, "seed проходит санитизацию mergeCfg (мусорный акцент -> дефолт)");
try { delete sandbox.window.__MLBG_SEED__; } catch (e) { sandbox.window.__MLBG_SEED__ = undefined; }

// ---- 40. v22: группы эффектов / избранное / каталог поиска / активный профиль ----
// Группировка эффектов: каждый эффект отнесён к существующей группе, и каждая группа непуста.
var fxGroupOrderKeys = sandbox.FX_GROUP_ORDER.map(function (g) { return g[0]; });
var fxNoGroup = sandbox.FX_LIST.map(function (o) { return o[0]; }).filter(function (k) { return !sandbox.FX_GROUPS[k]; });
ok(fxNoGroup.length === 0, "линтер: у каждого эффекта FX_LIST есть группа в FX_GROUPS" + (fxNoGroup.length ? "  (без группы: " + fxNoGroup.join(", ") + ")" : ""));
var fxBadGroup = sandbox.FX_LIST.map(function (o) { return o[0]; }).filter(function (k) { return fxGroupOrderKeys.indexOf(sandbox.FX_GROUPS[k]) < 0; });
ok(fxBadGroup.length === 0, "линтер: группа каждого эффекта объявлена в FX_GROUP_ORDER" + (fxBadGroup.length ? "  (чужая: " + fxBadGroup.join(", ") + ")" : ""));
var emptyGroups = fxGroupOrderKeys.filter(function (gk) { return sandbox.FX_LIST.every(function (o) { return sandbox.FX_GROUPS[o[0]] !== gk; }); });
ok(emptyGroups.length === 0, "линтер: в каждой группе FX_GROUP_ORDER есть хотя бы один эффект" + (emptyGroups.length ? "  (пустые: " + emptyGroups.join(", ") + ")" : ""));

// Избранное: mergeCfg санитизирует ui.favSec/favFx как булевы карты (как hidden/hiddenFx).
var favm = sandbox.mergeCfg({ ui: { favSec: { "Слайдшоу": true, "x": 5 }, favFx: { "aurora": true, "y": "no" } } }).ui;
ok(favm.favSec["Слайдшоу"] === true && !("x" in favm.favSec) && favm.favFx.aurora === true && !("y" in favm.favFx),
    "mergeCfg: ui.favSec/favFx принимают только булевы значения");
ok(sandbox.DEFAULTS.ui.favSec && sandbox.DEFAULTS.ui.favFx, "DEFAULTS.ui: есть карты избранного favSec/favFx");

// Каталог глубокого поиска: каждая непустая секция каталога реально существует; вкладки 0..4.
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.panelEditMenu = false;
sandbox.togglePanel({ stopPropagation: function () {} });
var allTitles40 = (sandbox.panelAllSections || []).map(function (s) { return s.title; });
var catBadSec = sandbox.PANEL_SEARCH_CATALOG.filter(function (c) { return c[2] && allTitles40.indexOf(c[2]) < 0; });
ok(catBadSec.length === 0, "каталог поиска: все секции каталога существуют среди секций панели" + (catBadSec.length ? "  (нет: " + catBadSec.map(function (c) { return c[2]; }).join(", ") + ")" : ""));
var catBadTab = sandbox.PANEL_SEARCH_CATALOG.filter(function (c) { return !(c[1] >= 0 && c[1] < sandbox.TABS.length); });
ok(catBadTab.length === 0, "каталог поиска: индексы вкладок в диапазоне вкладок (TABS)");

// «Сейчас работает»: activeRule объясняет выбор набора тем же приоритетом, что activeIndex.
sandbox.cfg = sandbox.mergeCfg({ mode: "3" });
var _ar = sandbox.activeRule();
ok(_ar.idx === 3 && _ar.why === "manual", "activeRule: ручной выбор без авто-смены -> manual, тот же индекс");
sandbox.cfg = sandbox.mergeCfg({ mode: "random" });
ok(sandbox.activeRule().why === "random", "activeRule: режим «случайно» -> random");
sandbox.cfg = sandbox.mergeCfg({ mode: "2", slideshow: { on: true, min: 5 } });
ok(sandbox.activeRule().why === "slide", "activeRule: слайдшоу -> slide");
// Любимые наборы: только индексы-строки и булевы значения.
var _fs = sandbox.mergeCfg({ ui: { favSets: { "3": true, "x": true, "12": "yes" }, pinned: true, tour: true } }).ui;
ok(_fs.favSets["3"] === true && !("x" in _fs.favSets) && !("12" in _fs.favSets) && _fs.pinned === true && _fs.tour === true,
    "mergeCfg: ui.favSets — индексы-строки с булевыми значениями; pinned/tour — булевы");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });

// Простой режим: только главные вкладки и секции, без технических и тонкой настройки.
sandbox.DEFAULTS.ui.simple = true; sandbox.panelShowTech = false;
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
var _smThrew = null; try { sandbox.togglePanel({ stopPropagation: function () {} }); } catch (e) { _smThrew = e; }
ok(_smThrew === null, "простой режим: панель строится без исключений" + (_smThrew ? " (" + _smThrew.message + ")" : ""));
var _smT = (sandbox.panelAllSections || []).map(function (s) { return s.title; });
ok(_smT.indexOf("Набор") >= 0 && _smT.indexOf("Стили") >= 0 && _smT.indexOf("Образы") >= 0 && _smT.indexOf("Яркость набора") >= 0,
    "простой режим: главные секции на месте (Набор / Яркость / Стили / Образы)");
ok(_smT.indexOf("Эффекты") < 0 && _smT.indexOf("Генератор") < 0 && _smT.indexOf("Диагностика") < 0 && _smT.indexOf("Слайдшоу") < 0,
    "простой режим: тонкая настройка, генератор, диагностика и авто-смена не строятся");
ok(sandbox.swapLayout("yf,jh") === "набор" && sandbox.swapLayout("ыуеы") === "sets", "поиск: неправильная раскладка переводится (yf,jh -> набор)");
ok(sandbox.isPosStr("40% 60%") && !sandbox.isPosStr("140% 0%") && !sandbox.isPosStr("1px 2px") && !sandbox.isPosStr("40%;x"),
    "точка фокуса: только «N% N%» в пределах 0..100");
sandbox.DEFAULTS.ui.simple = false; sandbox.panelShowTech = true;
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });

// Умные зоны: сайдбару — самая тёмная колонка, панели — самая тёмная строка карты 8x8.
var _grid = []; for (var _gi = 0; _gi < 64; _gi++) _grid.push(0.8);
for (var _gr = 0; _gr < 8; _gr++) _grid[_gr * 8 + 7] = 0.1;   // тёмная правая колонка
for (var _gc = 0; _gc < 8; _gc++) _grid[0 * 8 + _gc] = 0.05;  // тёмная верхняя строка
var _zp = sandbox.smartZonePos(_grid);
ok(_zp && _zp.sidebar === "100% 50%" && _zp.panel === "50% 0%" && sandbox.smartZonePos(null) === null,
    "smartZonePos: сайдбар — тёмная колонка, панель — тёмная строка; без карты -> null");
// Пресеты картинки: применённый пресет узнаётся, ручная правка — нет.
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
ok(sandbox.currentImgLook() === "none", "пресет картинки: дефолтные фильтры = «Как есть»");
sandbox.cfg.imgfx.side.blur = 3;
ok(sandbox.currentImgLook() === "", "пресет картинки: ручная правка одной зоны — пресета нет");
// Синхронизация: машинно-зависимое (пути, библиотека, ui) не уезжает на другую машину.
sandbox.cfg = sandbox.mergeCfg({ mode: "2", imgBase: "D:/x/", library: ["file:///a.jpg"] });
var _snap = sandbox.syncSnapshot();
ok(_snap.mode === "2" && !("imgBase" in _snap) && !("library" in _snap) && !("ui" in _snap),
    "синхронизация: в образ не попадают imgBase/library/ui");
ok(sandbox.mergeCfg({ ui: { news: "x", tipsOff: { readable: true, bad: 1 }, sync: true } }).ui.tipsOff.readable === true &&
    !("bad" in sandbox.mergeCfg({ ui: { tipsOff: { bad: 1 } } }).ui.tipsOff),
    "mergeCfg: ui.tipsOff — только булевы");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });

// Активный профиль: сразу после применения он активен; ручная правка снимает активность.
var _cfgSave40 = sandbox.clone(sandbox.cfg);
sandbox.applyProfile("calm");
ok(sandbox.activeProfileId() === "calm", "activeProfileId: сразу после применения профиль активен");
sandbox.cfg.fx.particles = !sandbox.cfg.fx.particles; // ручная правка ломает совпадение с патчем
ok(sandbox.activeProfileId() === null, "activeProfileId: после ручной правки активного профиля нет");
sandbox.cfg = _cfgSave40;

// Обратимое скрытие: в режиме «Настроить» скрытая секция всё равно строится (её видно, чтобы вернуть).
sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
sandbox.cfg.ui.hidden = { "Слайдшоу": true };
sandbox.panelEditMenu = true;
sandbox.togglePanel({ stopPropagation: function () {} });
var editTitles = (sandbox.panelSections || []).map(function (s) { return s.title; });
ok(editTitles.indexOf("Слайдшоу") >= 0, "обратимое скрытие: в режиме «Настроить» скрытая секция показана (можно вернуть на месте)");
sandbox.panelEditMenu = false; sandbox.cfg = sandbox.mergeCfg({ mode: "0" });
sandbox.togglePanel({ stopPropagation: function () {} });

// ---- 41. v23: ресайз ширины / превью образа / индикатор FPS / переход к эффекту ----
// Ширина панели: mergeCfg санитизирует ui.width в разумные пределы; дефолт — null.
ok(sandbox.DEFAULTS.ui.width === null, "DEFAULTS.ui.width: по умолчанию null (ширина 380)");
ok(sandbox.mergeCfg({ ui: { width: 500 } }).ui.width === 500 &&
    sandbox.mergeCfg({ ui: { width: 100 } }).ui.width === 320 &&
    sandbox.mergeCfg({ ui: { width: 9999 } }).ui.width === 760 &&
    sandbox.mergeCfg({ ui: { width: "x" } }).ui.width === null,
    "mergeCfg: ui.width зажат в 320..760, мусор -> null (дефолт)");

// Превью целого образа: функции есть и не пишут в localStorage (applyNoSave).
ok(typeof sandbox.previewLook === "function" && typeof sandbox.endLookPreview === "function" &&
    typeof sandbox.profilePreviewCfg === "function" && typeof sandbox.presetPreviewCfg === "function",
    "превью образа: previewLook/endLookPreview/profilePreviewCfg/presetPreviewCfg объявлены");
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.cfg.enabled = true;
var _snap41 = sandbox.clone(sandbox.cfg);
var prof = sandbox.profileById("focus");
var pcfg = sandbox.profilePreviewCfg(_snap41, prof);
ok(pcfg.fx.spotlight === true && pcfg.mode === _snap41.mode,
    "profilePreviewCfg: применяет патч профиля, но НЕ трогает набор (mode из снимка)");
sandbox.localStorage.setItem(sandbox.CFG_KEY, "SENTINEL41");
sandbox.previewLook(function (s) { return sandbox.profilePreviewCfg(s, prof); });
// previewLook дебаунсит через setTimeout — в стабе setTimeout не выполняет колбэк, поэтому
// проверяем лишь то, что вызов не пишет конфиг синхронно (живое превью — applyNoSave, без saveCfg).
ok(sandbox.localStorage.getItem(sandbox.CFG_KEY) === "SENTINEL41", "previewLook: не пишет конфиг в localStorage");
sandbox.endLookPreview();
sandbox.cfg = _snap41;

// В оболочке VS Code (vscode-file:) file:///-адреса картинок переводятся в vscode-file: запросы
// file:// VS Code отклоняет. Вне оболочки (стенд по http) адрес остаётся как был.
var _loc = sandbox.location;
sandbox.location = { protocol: "vscode-file:" };
ok(sandbox.appFileUrl("file:///d:/Pics/a%20b.png") === "vscode-file://vscode-app/d:/Pics/a%20b.png" &&
    sandbox.imgUrl("file:///d:/x.jpg") === "vscode-file://vscode-app/d:/x.jpg" &&
    sandbox.appFileUrl("vscode-file://vscode-app/x.png") === "vscode-file://vscode-app/x.png",
    "appFileUrl: file:/// -> vscode-file:// в оболочке VS Code");
sandbox.location = { protocol: "http:" };
ok(sandbox.appFileUrl("file:///d:/x.jpg") === "file:///d:/x.jpg", "appFileUrl: вне оболочки адрес не меняется");
sandbox.location = _loc;

// Пресет-превью сохраняет текущий набор/картинки (слой «эффекты + палитра»).
var _pp = sandbox.presetPreviewCfg(sandbox.mergeCfg({ mode: "3", setImg: { "0": { editor: "keep.jpg" } } }),
    { mode: "5", fx: { aurora: true }, setImg: { "0": { editor: "other.jpg" } } });
ok(_pp.mode === "3" && _pp.setImg["0"].editor === "keep.jpg" && _pp.fx.aurora === true,
    "presetPreviewCfg: набор/картинки из снимка, эффекты — из пресета");

// Живой индикатор FPS: builder есть, глобальное состояние perf доступно.
ok(typeof sandbox.makePerfStatus === "function" && typeof sandbox.perf === "object" && typeof sandbox.perfShouldRun === "function",
    "индикатор FPS: makePerfStatus + perf + perfShouldRun доступны");

// Единый поиск: переход к эффекту (goEffect) регистрирует фокус-ключ и цель прокрутки.
sandbox.cfg = sandbox.mergeCfg({ mode: "0" }); sandbox.panelEditMenu = false;
sandbox.togglePanel({ stopPropagation: function () {} });
ok(sandbox.panelFxNodes && typeof sandbox.panelFxNodes === "object" && ("aurora" in sandbox.panelFxNodes),
    "единый поиск: строки эффектов зарегистрированы в panelFxNodes (для прокрутки к эффекту)");

// ============================================================
//  v20: движок читаемости, переменные, загрузчик, мастер-кадры, палитра OKLab,
//  здоровье селекторов, быстрый переключатель.
// ============================================================
console.log("\n-- v20 --");

// ---- Логика меню: зависимости пунктов объявлены корректно ----
(function () {
    var k, bad = [];
    for (k in sandbox.FX_REQUIRES) {
        if (!(k in sandbox.DEFAULTS.fx)) bad.push(k + " (нет такого эффекта)");
        if (!(sandbox.FX_REQUIRES[k] in sandbox.DEFAULTS.fx)) bad.push(k + " -> " + sandbox.FX_REQUIRES[k] + " (нет предпосылки)");
    }
    ok(!bad.length, "линтер: FX_REQUIRES ссылается на существующие эффекты" + (bad.length ? " (" + bad.join(", ") + ")" : ""));
    bad = [];
    for (k in sandbox.PARAM_REQUIRES) {
        if (!(k in sandbox.DEFAULTS.fxp)) bad.push(k + " (нет такого параметра)");
        sandbox.PARAM_REQUIRES[k].forEach(function (fx) { if (!(fx in sandbox.DEFAULTS.fx)) bad.push(k + " -> " + fx); });
    }
    ok(!bad.length, "линтер: PARAM_REQUIRES ссылается на существующие параметры и эффекты" + (bad.length ? " (" + bad.join(", ") + ")" : ""));
    // Каждый ползунок силы должен иметь владельца, иначе он висит в панели всегда.
    var orphan = sandbox.PARAMS.filter(function (d) { return !sandbox.PARAM_REQUIRES[d[0]]; }).map(function (d) { return d[0]; });
    ok(!orphan.length, "линтер: у каждого ползунка силы есть эффект-владелец" + (orphan.length ? " (без владельца: " + orphan.join(", ") + ")" : ""));
}());
var fxSnap0 = JSON.stringify(sandbox.cfg.fx);
Object.keys(sandbox.cfg.fx).forEach(function (k) { sandbox.cfg.fx[k] = false; });
ok(sandbox.paramNeeded("blur") === false, "paramNeeded: без единого стекла ползунок размытия не нужен");
sandbox.cfg.fx.glassSide = true;
ok(sandbox.paramNeeded("blur") === true, "paramNeeded: включённое стекло возвращает ползунок размытия");
ok(sandbox.fxAffectsPanel("kenburns") === true, "fxAffectsPanel: Ken Burns управляет своими ползунками");
ok(sandbox.fxAffectsPanel("rounded") === false, "fxAffectsPanel: эффект без зависимых контролов не пересобирает панель");
sandbox.cfg.fx = JSON.parse(fxSnap0);

// ---- Переменные вместо чисел в тексте стиля ----
var vars = sandbox.buildVars();
ok(typeof vars["--mlbg-op-editor"] === "string" && typeof vars["--mlbg-blur"] === "string",
   "buildVars: прозрачность зон и размытие стекла — переменные");
ok(/px$/.test(vars["--mlbg-blur"]) && /px$/.test(vars["--mlbg-spot"]),
   "buildVars: размеры отдаются с единицами (px), иначе calc() в CSS не сложится");
sandbox.cfg.fxp.blur = 3; var v1 = sandbox.buildVars()["--mlbg-blur"];
sandbox.cfg.fxp.blur = 14; var v2 = sandbox.buildVars()["--mlbg-blur"];
ok(v1 !== v2, "buildVars: ползунок меняет значение переменной (" + v1 + " -> " + v2 + ")");
var cssA = build(); sandbox.cfg.fxp.vignette = 0.77; sandbox.cfg.baseOp.side = 0.5;
ok(build() === cssA, "текст стиля НЕ меняется от ползунков — переразбора CSS при перетаскивании нет");
sandbox.cfg.fxp.blur = 8; sandbox.cfg.fxp.vignette = 0.32; sandbox.cfg.baseOp.side = 0.30;

// ---- Бюджет размера стиля (чтобы рост не проехал незамеченным) ----
var fxSnapshot = JSON.stringify(sandbox.cfg.fx);
Object.keys(sandbox.cfg.fx).forEach(function (k) { sandbox.cfg.fx[k] = true; });
var cssAll = build();
ok(cssAll.length < 24000, "бюджет CSS: со всеми эффектами лист меньше 24 КБ (сейчас " + cssAll.length + ")");
sandbox.cfg.fx = JSON.parse(fxSnapshot);

// ---- Палитра в OKLab ----
var acc = sandbox.dominantAccent(red);
ok(/^#[0-9a-f]{6}$/.test(acc), "OKLab: dominantAccent даёт корректный hex (" + acc + ")");
var lo = "#4a4a6a", raised = sandbox.accentForContrast(lo, "#11111b", 4.5);
ok(sandbox.contrastRatio(raised, "#11111b") >= sandbox.contrastRatio(lo, "#11111b"),
   "accentForContrast: поднимает контраст тусклого акцента к тёмной подложке");
var lch = sandbox.hexToOklch("#89b4fa");
ok(lch.length === 3 && lch[0] > 0 && lch[0] < 1, "hexToOklch: светлота в диапазоне 0..1");

// ---- Карта яркости и адаптивный скрим ----
var flat = []; for (var _g = 0; _g < 32 * 32 * 4; _g++) flat.push(_g % 4 === 3 ? 255 : 10);
var gridDark = sandbox.lumaGrid(flat, 32);
ok(gridDark.length === 64, "lumaGrid: сетка 8x8 = 64 ячейки");
ok(gridDark[0] < 0.05, "lumaGrid: тёмная картинка -> низкая яркость ячейки");
var edUrl2 = sandbox.IMG + sandbox.SETS[0].editor;
var bright = []; for (var _i2 = 0; _i2 < 64; _i2++) bright.push(_i2 === 20 ? 0.9 : 0.02); // одно яркое пятно
sandbox._imgState[edUrl2] = { ok: true, luma: 0.2, grid: bright, resolved: true, thumb: null, accent: null, palette: null };
sandbox.cfg.mode = "0"; sandbox.cfg.fx.autoRead = true;
var cssRead = build();
contains(cssRead, "radial-gradient(ellipse", "адаптивный скрим: над ярким пятном появился гасящий градиент");
sandbox.cfg.fx.autoRead = false;
ok(build().indexOf("radial-gradient(ellipse 26%") < 0, "адаптивный скрим выключен: гасящих пятен в CSS нет");
sandbox.cfg.fx.autoRead = true;

// ---- Метр читаемости и авто-починка ----
var rd = sandbox.readability();
ok(rd && rd.worstRatio > 0 && rd.ratio > 0, "readability: считает контраст кода к подложке");
// Скрим гасит самые светлые ячейки, поэтому метр должен учитывать его и не пугать зря.
sandbox.cfg.fx.autoRead = false; var wOff = sandbox.readability().worstRatio;
sandbox.cfg.fx.autoRead = true;  var wOn = sandbox.readability().worstRatio;
ok(wOn >= wOff, "readability: с адаптивным скримом худший участок не хуже (" + wOff.toFixed(1) + " -> " + wOn.toFixed(1) + ")");
sandbox.cfg.enabled = false;
ok(sandbox.readability().off === true, "readability: при выключенном фоне отвечает «выключено», а не «нет данных»");
sandbox.cfg.enabled = true;
sandbox.cfg.baseOp.editor = 0.9;                       // заведомо нечитаемо
var before = sandbox.readability().worstRatio;
sandbox.fixReadability(4.5);
var after = sandbox.readability().worstRatio;
ok(after >= before, "fixReadability: контраст худшего участка не ухудшился (" + before.toFixed(1) + " -> " + after.toFixed(1) + ")");
sandbox.cfg.setOp = {}; sandbox.cfg.baseOp.editor = 0.06;
delete sandbox._imgState[edUrl2];

// ---- Наборы одной мастер-картинкой ----
var mIdx = -1;
for (var _m = 0; _m < sandbox.SETS.length; _m++) if (sandbox.SETS[_m].master) { mIdx = _m; break; }
ok(mIdx >= 0, "в наборах есть мастер-кадры (master + crop)");
sandbox.cfg.mode = String(mIdx);
var cssMaster = build();
contains(cssMaster, "assets/sets/", "мастер-набор: все зоны берут один файл из assets/sets/");
ok(/100\.00% 50\.00% \/ 178\.57%/.test(cssMaster), "мастер-набор: вырез редактора посчитан по формуле background-position/size");
ok(sandbox.cropFor(mIdx, "sidebar") !== null, "cropFor: у сайдбара свой вырез");
sandbox.cfg.setImg = {}; sandbox.cfg.setImg[mIdx] = { sidebar: "file:///d:/my.jpg" };
ok(sandbox.cropFor(mIdx, "sidebar") === null, "своя картинка зоны отменяет вырез (показывается целиком)");
sandbox.cfg.setImg = {};
// Стартовая прозрачность набора (светлые кадры) уважает пользовательскую правку
var brightSet = -1;
for (var _b = 0; _b < sandbox.SETS.length; _b++) if (sandbox.SETS[_b].op) { brightSet = _b; break; }
if (brightSet >= 0) {
    sandbox.cfg.mode = String(brightSet);
    ok(sandbox.getOp().editor === sandbox.SETS[brightSet].op.editor, "op набора: светлый кадр стартует с пониженной прозрачности");
    sandbox.cfg.setOp[brightSet] = { editor: 0.5 };
    ok(sandbox.getOp().editor === 0.5, "правка пользователя важнее стартовой прозрачности набора");
    sandbox.cfg.setOp = {};
}
sandbox.cfg.mode = "0";

// ---- Загрузчик и настоящая прозрачность ----
ok(sandbox.loaderKind().id === "custom-css", "loaderKind: без данных компаньона считаем загрузчиком be5invis");
sandbox.window.__MLBG_ENV__ = { loader: "custom-ui-style", version: "1.2.3", transparent: true };
ok(sandbox.loaderKind().id === "custom-ui-style" && sandbox.loaderKind().sure === true,
   "loaderKind: компаньон сообщает загрузчик точно");
ok(sandbox.trueGlassReady() === true, "trueGlassReady: окно создано прозрачным");
sandbox.cfg.fx.trueGlass = true;
contains(build(), "background: transparent !important", "trueGlass при прозрачном окне: воркбенч становится прозрачным");
sandbox.window.__MLBG_ENV__ = null;
ok(build().indexOf("body, .monaco-workbench, .monaco-workbench > .part.editor { background: transparent") < 0,
   "trueGlass без прозрачного окна: полной прозрачности НЕ включаем (иначе чёрное окно)");
sandbox.cfg.fx.trueGlass = false;
contains(sandbox.trueGlassSnippet(), "custom-ui-style.electron", "готовый сниппет опций Electron для settings.json");
contains(sandbox.loaderImportSnippet(), "imports", "готовый сниппет импорта для settings.json");

// ---- Moon Core: плагин встроен ядром как модуль "mlbg" ----
ok(sandbox._viaMoonCore === false, "moon-core: обычный <script src> не считается модулем ядра");
ok(sandbox.mooncoreModule() === null && sandbox.mooncoreBase() === "", "moon-core: без ядра помощника и базы нет");
var mcEnv = null;
sandbox.window.__MOONCORE__ = {
    version: "0.1.0",
    module: function (id) {
        if (id !== "mlbg") return null;
        return { id: "mlbg", base: "vscode-file://vscode-app/d:/mods/bg", get: function (ev) { return ev === "env" ? mcEnv : undefined; }, on: function () { return function () {}; } };
    }
};
ok(sandbox.mooncoreBase() === "vscode-file://vscode-app/d:/mods/bg/", "moon-core: база ресурсов со слэшем на конце");
sandbox.window.__MOONCORE__.module = function () { return { base: "https://evil.example/" }; };
ok(sandbox.mooncoreBase() === "", "moon-core: сетевая база ресурсов отвергается");
sandbox.window.__MOONCORE__.module = function () { return { base: "vscode-file://vscode-app/x/", get: function (ev) { return ev === "env" ? mcEnv : undefined; } }; };
ok(sandbox.loaderKind().id === "custom-css", "moon-core: ядро есть, но скрипт внедрён не им — загрузчик прежний");
sandbox._viaMoonCore = true;
ok(sandbox.loaderKind().id === "moon-core" && sandbox.loaderKind().sure === true && sandbox.loaderKind().version === "0.1.0",
   "moon-core: встроены ядром — загрузчик Moon Core, точно");
ok(sandbox.mlbgEnv() === null && sandbox.trueGlassReady() === false, "moon-core: среды по мосту ещё нет");
mcEnv = { loader: "moon-core", transparent: true, vscode: "1.99.0" };
ok(sandbox.mlbgEnv() && sandbox.mlbgEnv().loader === "moon-core" && sandbox.trueGlassReady() === true,
   "moon-core: среда (прозрачность окна) приходит событием env по мосту");
// Живые данные по мосту Moon Core (событие "live"), а не файлом через <script src>.
var mcLive = { branch: "moon/branch", errors: 2, languageId: "Rust", evil: 1 };
var mcLogged = [], mcSaved = [], mcData = null;
sandbox.window.__MOONCORE__.module = function () {
    return {
        base: "vscode-file://vscode-app/x/",
        get: function (ev) { return ev === "env" ? mcEnv : ev === "live" ? mcLive : undefined; },
        on: function () { return function () {}; },
        log: function (where, err) { mcLogged.push([where, String(err && err.message || err)]); },
        data: function () { return mcData; },
        saveData: function (obj) { mcSaved.push(obj); return { then: function (ok) { ok({ ok: true }); } }; }
    };
};
sandbox.window.__MLBG_LIVE__ = null;
var mlv = sandbox.mlbgLive();
ok(mlv && mlv.branch === "moon/branch" && mlv.errors === 2 && mlv.languageId === "rust" && mlv.evil === undefined,
   "живые данные: берутся из события live моста и санитизируются");
ok(sandbox.gitBranch() === "moon/branch", "живые данные моста важнее статусбара");
ok(sandbox.liveSource() === "хост расширений", "liveSource: данные от компаньона пришли");
mcLive = undefined;
ok(sandbox.liveSource().indexOf("ещё не пришли") >= 0, "liveSource: через Moon Core, но данных пока нет");
ok(typeof sandbox.liveRefresh === "undefined" && typeof sandbox.liveUrl === "undefined", "файл живых данных и его опрос убраны");

// Журнал ошибок: каждая разная ошибка один раз, повторы только считаются, копия — в Moon Core.
var errBefore = sandbox.errTotal();
sandbox.logErr("тест: место", new Error("сломалось"));
sandbox.logErr("тест: место", new Error("сломалось"));
sandbox.logErr("тест: другое", "строкой");
ok(sandbox.errTotal() === errBefore + 3, "logErr: считает все ошибки, включая повторы");
var lastErr = sandbox.errLog[sandbox.errLog.length - 2];
ok(lastErr.where === "тест: место" && lastErr.n === 2, "logErr: повтор не дублирует запись, а увеличивает счётчик");
ok(mcLogged.length === 2 && mcLogged[0][0] === "тест: место" && mcLogged[0][1] === "сломалось", "logErr: разные ошибки уходят в журнал Moon Core по одному разу");
for (var ei = 0; ei < 40; ei++) sandbox.logErr("тест: поток", "ошибка " + ei);
ok(sandbox.errLog.length <= 20, "logErr: для диагностики держим только последние");

// Резерв конфига на диске: при пустом localStorage конфиг восстанавливается из файла модуля.
ok(sandbox.diskCfg() === null, "резерв: файла данных нет -> null");
mcData = { v: 1, cfg: { accent: "#123456", mode: "4", allowRemoteImages: true } };
ok(sandbox.diskCfg() && sandbox.diskCfg().mode === "4", "резерв: конфиг читается из файла данных модуля");
var lsKeep = sandbox.localStorage.getItem(sandbox.CFG_KEY);
sandbox.localStorage.removeItem(sandbox.CFG_KEY);
var restored = sandbox.loadCfg();
ok(restored.mode === "4" && restored.accent === "#123456" && sandbox.cfgLoadedFrom === "disk", "резерв: пустой localStorage -> конфиг из резерва на диске");
ok(restored.allowRemoteImages === true, "резерв: свой конфиг сохраняет согласие на сетевые картинки (это не чужой импорт)");
mcData = { v: 1, cfg: [1, 2] };
ok(sandbox.diskCfg() === null, "резерв: не объект — игнорируется");
mcData = { v: 1, cfg: { big: "x".repeat(300 * 1024) } };
ok(sandbox.diskCfg() === null, "резерв: сверх 256 КБ — игнорируется");
if (lsKeep !== null) sandbox.localStorage.setItem(sandbox.CFG_KEY, lsKeep);
sandbox.diskSaveNow();
ok(mcSaved.length === 1 && mcSaved[0].v === 1 && mcSaved[0].cfg && mcSaved[0].cfg.mode === sandbox.cfg.mode, "резерв: копия текущего конфига уходит в файл данных");
ok(sandbox.diskBackupInfo().indexOf("сохранён") === 0, "резерв: диагностика показывает время сохранения");
// Вид от установщика (moon-bundle): метка install применяет образ поверх localStorage один раз.
(function () {
    var lsBefore = sandbox.localStorage.getItem(sandbox.CFG_KEY), cfgBefore = JSON.stringify(sandbox.cfg);
    var bkBefore = sandbox.localStorage.getItem(sandbox.BACKUP_KEY);
    mcData = { v: 1, seed: true, install: { id: "111", force: true }, cfg: { mode: "7", accent: "#abcdef" } };
    var inst = sandbox.loadCfg();
    ok(inst.mode === "7" && inst.accent === "#abcdef" && sandbox.cfgLoadedFrom === "install", "установщик: образ с force применяется поверх localStorage");
    ok(sandbox.localStorage.getItem(sandbox.BACKUP_KEY) === lsBefore, "установщик: прежний конфиг ушёл в резерв «Восстановить»");
    ok(JSON.parse(sandbox.localStorage.getItem(sandbox.CFG_KEY)).mode === "7", "установщик: новый конфиг сразу записан в localStorage");
    sandbox.loadCfg();
    ok(sandbox.cfgLoadedFrom === "local", "установщик: метка одноразовая - следующий старт берёт localStorage");
    mcData = { v: 1, seed: true, install: { id: "222", force: false }, cfg: { mode: "9" } };
    var soft = sandbox.loadCfg();
    ok(soft.mode === "7" && sandbox.cfgLoadedFrom === "local", "установщик: без force настроенный конфиг не трогается");
    mcData = { v: 1, install: { id: "333", force: true }, cfg: { mode: "5", genSets: [] } };
    var n0 = mcSaved.length;
    sandbox.diskSaveNow();
    var last = mcSaved[mcSaved.length - 1];
    ok(sandbox.cfg.mode === "5" && mcSaved.length === n0 + 1 && last.cfg.mode === "5" && !last.install,
       "установщик: образ, пришедший при открытом окне, принимается до записи резерва (и метка не переписывается)");
    mcData = null;
    if (lsBefore !== null) sandbox.localStorage.setItem(sandbox.CFG_KEY, lsBefore); else sandbox.localStorage.removeItem(sandbox.CFG_KEY);
    if (bkBefore !== null) sandbox.localStorage.setItem(sandbox.BACKUP_KEY, bkBefore); else sandbox.localStorage.removeItem(sandbox.BACKUP_KEY);
    sandbox.cfg = sandbox.mergeCfg(JSON.parse(cfgBefore));
})();
// Образ фона как часть профиля вида Moon Core.
var mcHooks = /** @type {any} */ (null);
var mcModObj = sandbox.window.__MOONCORE__.module();
sandbox.window.__MOONCORE__.module = function () { mcModObj.profile = function (h) { mcHooks = h; return true; }; return mcModObj; };
ok(sandbox.registerMoonCoreProfile() === true && mcHooks, "профиль: vscode-bg регистрирует свою часть в профилях Moon Core");
sandbox.cfg.mode = "2"; sandbox.cfg.imgBase = "vscode-file://vscode-app/мой/путь/";
var snap = mcHooks.save();
ok(snap.mode === "2" && snap.fx && snap.imgBase === undefined, "профиль: снимок — ключи образа, без машинно-зависимого (imgBase)");
sandbox.cfg.mode = "0";
mcHooks.apply(snap, "Только код");
ok(sandbox.cfg.mode === "2" && sandbox.cfg.imgBase === "vscode-file://vscode-app/мой/путь/", "профиль: применение возвращает образ и не трогает машинно-зависимое");
mcHooks.apply({ mode: "999", accent: "red;}body{x" }, "мусор");
ok(sandbox.isColor(sandbox.cfg.accent), "профиль: чужая часть проходит санитизацию mergeCfg");
sandbox.cfg.imgBase = ""; sandbox.cfg.mode = "0";

sandbox._viaMoonCore = false;
ok(sandbox.diskCfg() === null && sandbox.diskBackupInfo().indexOf("нужен Moon Core") >= 0, "резерв: без Moon Core не используется");
ok(sandbox.registerMoonCoreProfile() === false, "профиль: без Moon Core не регистрируется");
mcData = null;

sandbox._viaMoonCore = false;
sandbox.window.__MOONCORE__ = undefined;

// Защита от двойного запуска: собранный файл во второй раз в том же окне ничего не делает.
(function () {
    var built = require("../build.js").build(false);
    var sb = makeSandbox();
    var styles = 0;
    var mk = sb.document.createElement;
    sb.document.createElement = function (tag) { if (tag === "style") styles++; return mk(tag); };
    vm.runInNewContext(built, sb, { filename: "custom-bg.js" });
    var afterFirst = styles;
    ok(sb.window.__MLBG_RUNNING__ === "loader", "двойной запуск: первый экземпляр отмечает себя (через загрузчик)");
    vm.runInNewContext(built, sb, { filename: "custom-bg.js" });
    ok(styles === afterFirst, "двойной запуск: второй экземпляр пропущен, новых <style> не создал");
    var sb2 = makeSandbox();
    sb2.document.currentScript = { src: "", getAttribute: function (k) { return k === "data-mooncore-module" ? "mlbg" : null; } };
    vm.runInNewContext(built, sb2, { filename: "custom-bg.js" });
    ok(sb2.window.__MLBG_RUNNING__ === "moon-core", "двойной запуск: экземпляр от Moon Core отмечает себя как moon-core");
})();

// Версия модуля Moon Core совпадает с версией плагина во всех манифестах.
(function () {
    var rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    var extPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "extension", "package.json"), "utf8"));
    var mod = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mooncore-module.json"), "utf8"));
    var extMod = extPkg.moonCore && extPkg.moonCore.modules && extPkg.moonCore.modules[0];
    ok(mod.id === "mlbg" && extMod && extMod.id === "mlbg", "moon-core: id модуля mlbg в обоих манифестах");
    ok(mod.version === rootPkg.version && extMod.version === rootPkg.version && extPkg.version === rootPkg.version,
       "moon-core: версия модуля = версии плагина (package.json, extension/package.json, mooncore-module.json)");
    ok(mod.script === "custom-bg.min.js" && extMod.script === "custom-bg.min.js", "moon-core: модуль встраивает сжатую сборку (вдвое меньше кода на старте)");
    // Сжатая сборка — это тот же код без комментариев: она должна исполняться так же.
    var bm = require("../build.js");
    var sbMin = makeSandbox();
    vm.runInNewContext(bm.minify(bm.build(false)), sbMin, { filename: "custom-bg.min.js" });
    ok(sbMin.window.__MLBG_RUNNING__ === "loader", "сжатая сборка исполняется целиком");
})();

// ---- Здоровье селекторов вёрстки ----
var sh = sandbox.selectorHealthSummary();
ok(sh && typeof sh.total === "number" && sh.total >= 15, "selectorHealth: проверяется весь список ключевых селекторов");
ok(Object.prototype.toString.call(sh.missingRequired) === "[object Array]", "selectorHealth: список обязательных промахов");

// ---- Быстрый переключатель ----
ok(sandbox.quickScore("Звёздный причал", "звпр") >= 0, "быстрый поиск: подпоследовательность находит набор");
ok(sandbox.quickScore("Звёздный причал", "xyz") < 0, "быстрый поиск: несовпадение отсекается");
ok(sandbox.quickScore("Кот и звезды", "ёзды") >= 0, "быстрый поиск: ё и е равнозначны");
var qi = sandbox.quickItems();
ok(qi.length >= sandbox.SETS.length + sandbox.FX_LIST.length, "быстрый переключатель: в списке и наборы, и эффекты");

// ---- Синхронизация окон ----
ok(typeof sandbox.broadcastCfg === "function", "синхронизация окон: broadcastCfg объявлен");
ok(typeof sandbox.initBattery === "function" && sandbox.perf.battery === false, "экономия по батарее: флаг есть, по умолчанию выключен");

// ============================================================
//  Живые данные из хоста расширений: приоритет над скрейпингом DOM и санитизация.
// ============================================================
console.log("\n-- живые данные --");

ok(sandbox.mlbgLive() === null, "живых данных нет -> mlbgLive() === null (работает скрейпинг DOM)");
ok(sandbox.liveStr("branch") === null && sandbox.liveNum("errors") === null, "без данных liveStr/liveNum отдают null");

// Файл живых данных лежит на диске и в теории может быть подменён: пропускаем только
// известные поля известных типов и режем длину.
sandbox.window.__MLBG_LIVE__ = {
    rev: 3, branch: "feature/x", remote: "moonlivedt-oss/custom_VScode", dirty: true,
    errors: 4, warnings: 2, languageId: "JavaScript", fileExt: "JS", folder: "vscode-bg",
    evil: "<script>", errorsExtra: 99
};
var lv = sandbox.mlbgLive();
ok(lv && lv.branch === "feature/x" && lv.errors === 4, "живые данные читаются");
ok(lv.languageId === "javascript" && lv.fileExt === "js", "языковые ключи нормализуются к нижнему регистру");
ok(lv.evil === undefined, "неизвестные поля отбрасываются");
ok(sandbox.mlbgLive(null) !== undefined, "mlbgLive устойчив к вызову без аргументов");
sandbox.window.__MLBG_LIVE__ = { branch: 123, errors: "много", languageId: { x: 1 } };
var bad = sandbox.mlbgLive();
ok(bad.branch === "" && bad.errors === null && bad.languageId === "", "значения не тех типов заменяются пустыми");

// Приоритет: пока живые данные есть, DOM не спрашиваем.
sandbox.window.__MLBG_LIVE__ = { branch: "release/1.2", errors: 7, folder: "живая-папка", remote: "acme/tool" };
ok(sandbox.gitBranch() === "release/1.2", "gitBranch: живые данные важнее статусбара");
ok(sandbox.problemsCount() === 7, "problemsCount: счётчик из диагностики API");
ok(sandbox.workspaceName() === "живая-папка", "workspaceName: папка воркспейса важнее заголовка окна");

// Фон по репозиторию — привязка, которую из DOM не сделать вовсе.
sandbox.cfg.autoRemote = true;
sandbox.cfg.remoteSets = { "acme/tool": "3" };
ok(sandbox.remoteIndex() === 3, "remoteIndex: набор закреплён за удалённым репозиторием");
sandbox.cfg.remoteSets = { "acme/tool": "999" };
ok(sandbox.remoteIndex() === null, "remoteIndex: индекс вне диапазона игнорируется");
sandbox.cfg.autoRemote = false;
ok(sandbox.remoteIndex() === null, "remoteIndex: выключенная привязка ничего не выбирает");

// Приоритет привязок: проект > репозиторий > ветка > язык файла.
sandbox.cfg.autoRemote = true; sandbox.cfg.remoteSets = { "acme/tool": "3" };
sandbox.cfg.autoBranch = true; sandbox.cfg.branchSets = { "release/1.2": "5" };
ok(sandbox.activeIndex() === 3, "приоритет: репозиторий важнее ветки");
sandbox.cfg.autoWorkspace = true; sandbox.cfg.workspaceSets = { "живая-папка": "7" };
ok(sandbox.activeIndex() === 7, "приоритет: проект важнее репозитория");
sandbox.cfg.autoWorkspace = false; sandbox.cfg.autoRemote = false; sandbox.cfg.autoBranch = false;
sandbox.cfg.workspaceSets = {}; sandbox.cfg.remoteSets = {}; sandbox.cfg.branchSets = {};
sandbox.window.__MLBG_LIVE__ = null;

// ============================================================
//  Новое API Moon Core: живые данные из событий VS Code, общая шина, команды, выключение.
//  Идёт последним: mlbgStop в конце останавливает фон в песочнице.
// ============================================================
console.log("\n-- новое API Moon Core --");
(function () {
    var vsH = {}, shared = {}, cmdOn = {}, disposers = [];
    /** @type {any[]} */
    var cmdReg = [];
    sandbox.window.__MLBG_LIVE__ = null;
    sandbox.window.__MOONCORE__ = { version: "0.2.0", module: function () {
        return {
            base: "vscode-file://vscode-app/x/",
            get: function () { return undefined; },                 // компаньона нет
            on: function (ev, fn) { if (ev === "command") cmdOn.fn = fn; return function () {}; },
            log: function () {},
            vscode: { on: function (kind, fn) { vsH[kind] = fn; return function () {}; } },
            share: function (k, v) { shared[k] = v; return true; },
            commands: { register: function (list) { cmdReg = list; return list.length; }, on: function (id, fn) { cmdOn[id] = fn; return function () {}; } },
            onDispose: function (fn) { disposers.push(fn); }
        };
    } };
    sandbox._viaMoonCore = true;
    var hits = 0;
    ok(sandbox.liveSubscribe(function () { hits++; }) === true, "события VS Code: подписка через Moon Core");
    ok(typeof vsH.editor === "function" && typeof vsH.git === "function" && typeof vsH.diagnostics === "function", "события VS Code: editor, git, diagnostics");
    vsH.editor({ file: "main.RS", lang: "Rust", ext: "rs" });
    vsH.git({ branch: "feature/vs", changes: 2, remote: "acme/tool", folder: "проект" });
    vsH.diagnostics({ errors: 1, warnings: 0, totalErrors: 5, totalWarnings: 3 });
    var lv2 = sandbox.mlbgLive();
    ok(lv2 && lv2.branch === "feature/vs" && lv2.dirty === true && lv2.remote === "acme/tool" && lv2.folder === "проект", "без компаньона: ветка, изменения, репозиторий и папка — из событий Moon Core");
    ok(lv2.languageId === "rust" && lv2.fileExt === "rs", "язык и расширение файла — из события editor");
    ok(lv2.errors === 5 && lv2.warnings === 3, "ошибки — по всему проекту, как у компаньона");
    ok(hits === 3, "каждое новое событие сразу запускает самолечение (" + hits + ")");
    vsH.git({ branch: "feature/vs", changes: 2, remote: "acme/tool", folder: "проект" });
    ok(hits === 3, "то же значение повторно не будит самолечение");
    ok(sandbox.gitBranch() === "feature/vs" && sandbox.problemsCount() === 5, "ветка и ошибки берутся из событий, а не из статусбара");
    ok(sandbox.liveSource() === "события VS Code (Moon Core)", "liveSource: видно, что данные от Moon Core");
    sandbox.window.__MLBG_LIVE__ = { branch: "companion" };
    ok(sandbox.gitBranch() === "companion", "ручной/компаньонский источник важнее событий Moon Core");
    sandbox.window.__MLBG_LIVE__ = null;

    sandbox.shareLook("#89b4fa");
    ok(shared["mlbg.accent"] && shared["mlbg.accent"].hex === "#89b4fa" && shared["mlbg.accent"].rgb.join(",") === "137,180,250", "общая шина: акцент фона с rgb");
    ok(shared["mlbg.set"] && typeof shared["mlbg.set"].index === "number", "общая шина: текущий набор");

    ok(sandbox.registerMoonCoreCommands() === true && cmdReg.length === sandbox.MLBG_COMMANDS.length, "команды фона объявлены в Moon Core");
    var mod = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "mooncore-module.json"), "utf8"));
    ok(JSON.stringify((mod.commands || []).map(function (c) { return c.id; })) === JSON.stringify(sandbox.MLBG_COMMANDS.map(function (c) { return c.id; })),
       "команды фона в манифесте модуля совпадают с рантаймом");
    var mode0 = sandbox.cfg.mode;
    sandbox.cfg.mode = "0";
    cmdOn.next();
    ok(sandbox.cfg.mode === "1", "команда «следующий набор» из палитры Moon Core работает");
    cmdOn.prev();
    ok(sandbox.cfg.mode === "0", "команда «предыдущий набор»");
    sandbox.cfg.mode = mode0;

    ok(sandbox.registerMoonCoreLifecycle() === true && disposers.length === 1, "выключение модуля: уборка зарегистрирована в Moon Core");
    var offs = sandbox._mlbgOff.length;
    ok(offs >= 10, "глобальные подписки, тикер и наблюдатели снимаемые (" + offs + ")");
    sandbox.window.__MLBG_RUNNING__ = "moon-core";
    // Заглушка документа не хранит элементы — ловим, что именно фон убирает по id.
    var removedIds = [], gid = sandbox.document.getElementById;
    sandbox.document.getElementById = function (id) { return { remove: function () { removedIds.push(id); } }; };
    disposers[0]();
    sandbox.document.getElementById = gid;
    ok(sandbox._mlbgStopped === true && sandbox._mlbgOff.length === 0, "выключение: всё снято");
    ok(sandbox.window.__MLBG_RUNNING__ === undefined, "выключение: метка запуска снята — повторное включение запустит фон заново");
    ok([sandbox.STYLE_ID, sandbox.SB_ID, sandbox.PANEL_ID, "mlbg-particles", "mlbg-pet", "mlbg-shader"].every(function (id) { return removedIds.indexOf(id) !== -1; }),
       "выключение: стиль, кнопка статусбара, панель и холсты виджетов убраны");
    var made = 0, mk = sandbox.document.createElement;
    sandbox.document.createElement = function (tag) { made++; return mk(tag); };
    sandbox.heal();
    sandbox.document.createElement = mk;
    ok(made === 0, "после выключения самолечение ничего не создаёт заново");
})();

// ============================================================
//  Исправления аудита 2026-10-08 и новые возможности
// ============================================================
console.log("\n-- аудит: исправления --");

// Под Moon Core модуль по умолчанию лежит файлом рядом с workbench.html (moonCore.moduleFiles):
// у скрипта есть адрес, но это папка VS Code. Картинки должны браться из папки модуля от ядра.
(function () {
    // Исходники без обёртки IIFE — чтобы снаружи были видны IMG и zoneUrl.
    var built = FILES.map(function (f) { return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); }).join(String.fromCharCode(10));
    var sb = makeSandbox();
    sb.document.currentScript = {
        src: "vscode-file://vscode-app/c:/vscode/out/vs/code/electron-browser/workbench/mooncore-mod-mlbg.js",
        getAttribute: function (k) { return k === "data-mooncore-module" ? "mlbg" : null; }
    };
    sb.window.__MOONCORE__ = { module: function () { return { base: "vscode-file://vscode-app/d:/mods/vscode-bg/" }; } };
    vm.runInNewContext(built, sb, { filename: "custom-bg.js" });
    ok(sb._viaMoonCore === true, "moon-core (файл модуля): фон узнал, что запущен как модуль");
    ok(sb.IMG === "vscode-file://vscode-app/d:/mods/vscode-bg/", "moon-core (файл модуля): картинки — из папки модуля, а не из папки workbench.html (" + sb.IMG + ")");
    ok(sb.zoneUrl(0, "editor") === "vscode-file://vscode-app/d:/mods/vscode-bg/" + sb.SETS[0].editor, "moon-core (файл модуля): путь картинки набора собран от папки модуля");
    // Без адреса от ядра — прежнее поведение (адрес скрипта): не ломаем загрузчики.
    var sb2 = makeSandbox();
    vm.runInNewContext(built, sb2, { filename: "custom-bg.js" });
    ok(sb2.IMG === "vscode-file://vscode-app/test/vscode-bg/", "загрузчик без Moon Core: база картинок — папка скрипта");
    // Старт с сохранённым ген-набором: хвост наборов готов ДО проверки индексов конфига.
    var sb3 = makeSandbox();
    var nBuiltin = sb2.GEN_BASE;
    var saved = { genSets: [{ name: "Свой", grad: ["#111111", "#888888", "#444444"], accent: "#888888" }], mode: String(nBuiltin), setAccent: {} };
    saved.setAccent[nBuiltin] = "#224466";
    sb3.localStorage.setItem("moonlight-bg-config", JSON.stringify(saved));
    vm.runInNewContext(built, sb3, { filename: "custom-bg.js" });
    ok(sb3.cfg.mode === String(nBuiltin) && sb3.cfg.setAccent[nBuiltin] === "#224466" && sb3.SETS.length === nBuiltin + 1,
       "старт: сохранённый ген-набор, его выбор и акцент пережили перезапуск");
})();

(function () {
    var s = sandboxMod.loadRuntime();
    var base = s.GEN_BASE;
    // Импорт конфига с собственным ген-набором: его акцент, яркость, имя и привязка не теряются.
    var raw = {
        genSets: [{ name: "Ввозной", grad: ["#101010", "#a0a0a0", "#505050"], accent: "#a0a0a0" }],
        mode: String(base), setAccent: {}, setOp: {}, setName: {}, workspaceSets: { proj: String(base) }
    };
    raw.setAccent[base] = "#123456"; raw.setOp[base] = { editor: 0.2 }; raw.setName[base] = "Мой";
    var len0 = s.SETS.length;
    var cand = s.candidateCfg(raw, true);
    ok(s.SETS.length === len0, "candidateCfg: расчёт кандидата не меняет список наборов");
    ok(cand.mode === String(base) && cand.setAccent[base] === "#123456" && cand.setOp[base] && cand.setOp[base].editor === 0.2 &&
       cand.setName[base] === "Мой" && cand.workspaceSets.proj === String(base),
       "импорт: ссылки на ген-набор файла (набор, акцент, яркость, имя, проект) сохраняются");
    ok(s.importCfgText(JSON.stringify(raw)) === true, "importCfgText: файл разобран, показано окно «что изменится»");
    ok(s.cfg.mode !== String(base), "импорт: до «Применить» конфиг не меняется");
    s.confirmAccept();
    ok(s.cfg.mode === String(base) && s.SETS.length === base + 1 && s.setName(base) === "Мой", "импорт: после «Применить» ген-набор в списке и активен");
    ok(s.importCfgText("{не json") === false, "импорт: битый файл не открывает окно");

    // Отмена/повтор знают про ген-наборы: снимок несёт свои наборы.
    s.commitHistory && s.commitHistory();
    var before = s.SETS.length;
    s._histApply(JSON.stringify(s.mergeCfg({})));
    ok(s.SETS.length === base && s.cfg.genSets.length === 0, "отмена: хвост наборов совпадает с genSets снимка");
    s._histApply(JSON.stringify(s.candidateCfg(raw)));
    ok(s.SETS.length === before && s.cfg.mode === String(base), "повтор: ген-набор вернулся вместе с выбором");

    // Удаление ген-наборов чистит все ссылки, включая репозитории, время суток и избранное.
    s.cfg.remoteSets = { "me/repo": String(base) };
    s.cfg.autoTime.night = base; s.cfg.autoTime.morning = base;
    s.cfg.ui.favSets[String(base)] = true;
    s.cfg.setPos = {}; s.cfg.setPos[base] = { editor: "10% 10%" };
    s.removeGenSets();
    ok(!s.cfg.remoteSets["me/repo"] && s.cfg.autoTime.night === 0 && s.cfg.autoTime.morning === -1 &&
       !s.cfg.ui.favSets[String(base)] && !s.cfg.setPos[base] && s.cfg.mode === "0",
       "removeGenSets: висячие ссылки убраны (репозиторий, ночь, утро, избранное, точка фокуса, набор)");
    ok(!s.mergeCfg({ setPos: { "99": { editor: "1% 1%" } } }).setPos["99"], "mergeCfg: точка фокуса для несуществующего набора отбрасывается");

    // «Что изменится»: список изменений, примерка без записи, отмена.
    var next = s.candidateCfg({ mode: "3", fx: { particles: !s.cfg.fx.particles }, baseOp: { editor: 0.31 } });
    var diff = s.lookDiff(s.cfg, next);
    ok(diff.length >= 3, "lookDiff: набор, эффект и яркость попали в список (" + diff.length + ")");
    ok(s.lookDiff(s.cfg, s.clone(s.cfg)).length === 0, "lookDiff: одинаковые конфиги — пустой список");
    var applied = 0, mode0 = s.cfg.mode;
    s.confirmLook("тест", next, function () { applied++; });
    s.confirmPreview(true);
    ok(s.cfg.mode === "3", "примерка: вид кандидата показан");
    s.confirmCancel();
    ok(s.cfg.mode === mode0 && applied === 0, "отмена: вид вернулся, применение не вызвано");
    s.confirmLook("тест", next, function () { applied++; });
    s.confirmAccept();
    ok(applied === 1, "«Применить» вызывает применение один раз");

    // Части суток: утро и вечер — первые/последние edge часов дня.
    s.cfg.autoTime = { on: true, day: 1, night: 2, morning: 3, evening: 4, edge: 2, from: 8, to: 20, mode: "hours", lat: 0, lon: 0 };
    function at(h) { return s.dayPart(new Date(2026, 0, 10, h, 30)); }
    ok(at(8) === "morning" && at(12) === "day" && at(19) === "evening" && at(22) === "night", "части суток: утро/день/вечер/ночь по границам дня");
    ok(s.timeSetFor("morning") === 3 && s.timeSetFor("evening") === 4 && s.timeSetFor("night") === 2, "части суток: свои наборы утра и вечера");
    s.cfg.autoTime.morning = -1;
    ok(s.timeSetFor("morning") === 1, "части суток: утро «как днём» отдаёт дневной набор");
    s.cfg.autoTime.from = 22; s.cfg.autoTime.to = 2;   // короткий день через полночь
    ok(s.dayPart(new Date(2026, 0, 10, 22, 30)) === "morning" && s.dayPart(new Date(2026, 0, 10, 1, 30)) === "evening",
       "части суток: день через полночь короче двух edge — утро и вечер делят его пополам");
    var atm = s.mergeCfg({ autoTime: { morning: 999, evening: 5, edge: 40 } }).autoTime;
    ok(atm.morning === -1 && atm.evening === 5 && atm.edge === 6, "mergeCfg: утро/вечер — индекс или -1, edge зажат в 1..6");

    // Набор из файла проекта (moonlightBg.projectSet): имя или номер, важнее авто-правил.
    s.cfg.autoTime.on = false;
    var plasma = -1; for (var i = 0; i < s.SETS.length; i++) if (s.SETS[i].name === "Плазма") plasma = i;
    s.window.__MLBG_LIVE__ = { projectSet: "плазма" };
    ok(s.activeIndex() === plasma && s.activeRule().why === "project", "файл проекта: набор по имени (без учёта регистра) важнее всего");
    s.window.__MLBG_LIVE__ = { projectSet: "5" };
    ok(s.activeIndex() === 5, "файл проекта: набор по номеру");
    s.window.__MLBG_LIVE__ = { projectSet: "нет такого" };
    ok(s.projectFileIndex() === null && s.activeRule().why !== "project", "файл проекта: неизвестное имя игнорируется");
    // Счётчик ошибок без данных о диагностике — null, и счёт берётся из статусбара.
    s.window.__MLBG_LIVE__ = { languageId: "js" };
    ok(s.liveNum("errors") === null, "живые данные без диагностики: ошибок не «0», а неизвестно");
    s.window.__MLBG_LIVE__ = undefined;

    // Синхронизация: авто-смена не отправляет вид, отправка ждёт первого подтягивания.
    s._viaMoonCore = true; s.cfg.ui.sync = true;
    s._syncTimer = 0;
    s.autoChange(function () { s.saveCfg(); });
    ok(!s._syncTimer, "синхронизация: авто-смена (слайдшоу, время суток) в Settings Sync не уходит");
    s.syncHoldUntilPull();
    s.saveCfg();
    ok(!s._syncTimer && s._syncWaiting === true, "синхронизация: до первого подтягивания отправка придержана");
    s.syncRelease();
    ok(!!s._syncTimer && s._syncWaiting === false, "синхронизация: после подтягивания придержанная отправка уходит");
    s._viaMoonCore = false; s.cfg.ui.sync = false;

    // Резерв на диске укладывается в лимит файла данных Moon Core.
    var big = s.clone(s.cfg); big.shaderSrc = new Array(7990).join("x");
    big.library = []; for (var li = 0; li < 64; li++) big.library.push("file:///" + new Array(1000).join("p") + li);
    var daily = []; for (var di = 0; di < 14; di++) daily.push({ day: "2026-01-" + (10 + di), cfg: big });
    s.window.__MOONCORE__ = { module: function () { return { data: function () { return { daily: daily }; } }; } };
    s._viaMoonCore = true;
    var payload = s.diskPayload(JSON.stringify(big));
    s._viaMoonCore = false; s.window.__MOONCORE__ = undefined;
    ok(JSON.stringify(payload).length <= s.DISK_FILE_MAX && payload.daily.length >= 1, "резерв на диске: старые копии отброшены, файл в лимите (" + payload.daily.length + " копий)");

    // Журнал ошибок не пустеет после лимита разных ошибок.
    for (var ei = 0; ei < 80; ei++) s.logErr("тест", new Error("ошибка " + ei));
    ok(s.errLog.length === s.ERR_KEEP, "журнал ошибок: после лимита держит последние " + s.ERR_KEEP + " записей (" + s.errLog.length + ")");

    // Шейдер: контекст WebGL отдаётся сразу.
    var lost = 0;
    s._releaseGl({ getExtension: function (n) { return n === "WEBGL_lose_context" ? { loseContext: function () { lost++; } } : null; } });
    ok(lost === 1, "шейдер: при остановке контекст WebGL освобождается");

    // Выключение модуля снимает отложенные таймеры (later).
    var offs = s._mlbgOff.length;
    s.later(function () {}, 1000);
    ok(s._mlbgOff.length === offs + 1, "later: отложенный вызов снимается при выключении модуля");
})();

// ============================================================
console.log("\nИтог: " + passed + " ok, " + failed + " fail.");
process.exit(failed ? 1 : 0);
