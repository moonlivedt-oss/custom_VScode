// ===== Ресурсы и наборы =====
// IMG — базовый URL к папке плагина (картинки). Пытаемся вычислить из адреса самого
// скрипта (document.currentScript) — тогда перенос папки не ломает пути. Если скрипт
// внедрён инлайном (src пустой), откатываемся к абсолютному пути ниже.
// ВАЖНО: у be5invis.vscode-custom-css скрипт часто внедряется инлайном, и тогда
// document.currentScript пуст — так что запасной абсолютный путь ниже НЕ «на крайний
// случай», а основной рабочий путь. Меняй его под СВОЮ папку плагина при переносе.
var IMG_FALLBACK = "vscode-file://vscode-app/d%3A/Desktop/components/vscode-bg/";
var IMG = (function () {
    try {
        var src = (document.currentScript && document.currentScript.src) || "";
        var i = src.lastIndexOf("/");
        if (i >= 0) return src.slice(0, i + 1); // .../vscode-bg/custom-bg.js -> .../vscode-bg/
    } catch (e) {}
    return IMG_FALLBACK; // адрес скрипта неизвестен (инлайн-внедрение) — берём заданный путь
})();

// Пути к картинкам набора — относительно IMG. Картинки наборов лежат в
// assets/{editor,panel,sidebar}/; ещё не разложенные по наборам — в assets/ (корень).
// У каждого набора свой акцентный цвет (accent) под его палитру — при переключении
// набора интерфейс перекрашивается автоматически (см. getAccent). Пользователь может
// переопределить акцент конкретного набора — правка хранится в cfg.setAccent[idx].
// name — короткое имя набора (в тултипе кнопки BG, на чипах и в статусбаре).
var SETS = [
    { name: "Алые кроны",           editor: "assets/editor/editor_0.jpg", sidebar: "assets/sidebar/sidebar_0.jpg", panel: "assets/panel/panel_0.jpg", accent: "#f38ba8" }, // 0
    { name: "Кот и звёзды",         editor: "assets/editor/editor_1.jpg", sidebar: "assets/sidebar/sidebar_1.jpg", panel: "assets/panel/panel_1.jpg", accent: "#cba6f7" }, // 1
    { name: "Полночные маки",       editor: "assets/editor/editor_2.jpg", sidebar: "assets/sidebar/sidebar_2.jpg", panel: "assets/panel/panel_2.jpg", accent: "#f38ba8" }, // 2
    { name: "Свиток тумана",        editor: "assets/editor/editor_3.jpg", sidebar: "assets/sidebar/sidebar_3.jpg", panel: "assets/panel/panel_3.jpg", accent: "#94e2d5" }, // 3
    { name: "Хрустальное озеро",    editor: "assets/editor/editor_4.jpg", sidebar: "assets/sidebar/sidebar_4.jpg", panel: "assets/panel/panel_4.jpg", accent: "#89b4fa" }, // 4
    { name: "Звёздный причал",      editor: "assets/editor/editor_5.jpg", sidebar: "assets/sidebar/sidebar_5.jpg", panel: "assets/panel/panel_5.jpg", accent: "#cba6f7" }, // 5
    { name: "Багряный портал",      editor: "assets/editor/editor_6.jpg", sidebar: "assets/sidebar/sidebar_6.jpg", panel: "assets/panel/panel_6.jpg", accent: "#f5c2e7" }, // 6
    { name: "Ведьмин чертог",       editor: "assets/editor/editor_7.jpg", sidebar: "assets/sidebar/sidebar_7.jpg", panel: "assets/panel/panel_7.jpg", accent: "#f38ba8" }, // 7
    { name: "Лунная цитадель",      editor: "assets/editor/editor_8.jpg", sidebar: "assets/sidebar/sidebar_8.jpg", panel: "assets/panel/panel_8.jpg", accent: "#89b4fa" }, // 8
    { name: "Тень мастера",         editor: "assets/editor/editor_9.jpg", sidebar: "assets/sidebar/sidebar_9.jpg", panel: "assets/panel/panel_9.jpg", accent: "#94e2d5" }, // 9
    { name: "Меч в маках",          editor: "assets/editor/editor_10.jpg",sidebar: "assets/sidebar/sidebar_10.jpg",panel: "assets/panel/panel_10.jpg",accent: "#eba0ac" }, // 10
    { name: "Ночь падающей звезды", editor: "assets/editor/editor_11.jpg",sidebar: "assets/sidebar/sidebar_11.jpg",panel: "assets/panel/panel_11.jpg",accent: "#74c7ec" }  // 11
];
// Короткое имя набора по индексу (для статусбара/тултипов). Приоритет — имя,
// заданное пользователем в панели (cfg.setName[idx]), затем «родное» имя из SETS,
// иначе пустая строка. cfg к моменту вызова уже есть (функция зовётся из рантайма UI).
function setName(idx) {
    var o = (typeof cfg !== "undefined" && cfg.setName) ? cfg.setName[idx] : null;
    if (typeof o === "string" && o) return o;
    var s = SETS[idx]; return (s && s.name) ? s.name : "";
}

// ===== Дефолты =====
// CFG_VERSION — версия схемы конфига. Растёт, когда меняется структура DEFAULTS так,
// что старый сохранённый конфиг нужно осознанно доработать (см. migrateCfg).
var CFG_VERSION = 1;
var DEFAULTS = {
    version: CFG_VERSION,
    enabled: true,                                      // мастер-выключатель: false — фон и эффекты выключены, настройки сохранены
    mode: "0",
    baseOp: { editor: 0.06, side: 0.30, panel: 0.11 },
    setOp: {},
    accent: "#cba6f7",                                  // глобальный акцент (запасной, если у набора нет своего)
    setAccent: {},                                      // переопределение акцента конкретного набора: { idx: "#rrggbb" }
    setName: {},                                        // пользовательское имя набора: { idx: "строка" }
    setImg: {},                                         // свои картинки набора по зонам: { idx: { editor?, sidebar?, panel? } }
    autoDim: true,                                      // авто-занижение яркости editor под светлые картинки (читаемость кода)
    fit: { editor: "cover", side: "cover", panel: "cover" }, // вписывание фоновой картинки по зонам: cover | contain
    // фильтры самой фоновой картинки — отдельно по зонам (редактор / сайдбар / панель)
    imgfx: {
        editor: { brightness: 1.0, saturate: 1.0, blur: 0 },
        side:   { brightness: 1.0, saturate: 1.0, blur: 0 },
        panel:  { brightness: 1.0, saturate: 1.0, blur: 0 }
    },
    slideshow: { on: false, min: 15 },                  // авто-смена набора по таймеру
    // авто-набор по времени суток: днём — свой набор, ночью — свой. Границы дня
    // настраиваются (from/to, часы 0–23); поддерживается «через полночь» (to < from).
    autoTime: { on: false, day: 0, night: 4, from: 8, to: 20 },
    fxp: { blur: 8, kbScale: 1.08, kbSpeed: 60, vignette: 0.32, partCount: 40, pomoMin: 25 },
    fx: {
        kenburns: true, glassTabs: true, vignette: true, glassSide: true,
        scrim: true, glassStatus: true, activeLine: true, groupRing: true,
        scrollbar: true, activityBg: true, tabAccent: true, rounded: true,
        cursorGlow: true, selection: true, splash: true,
        groupBorder: true, titlebar: true, clock: true, particles: true, pomodoro: false,
        dimOnType: false,                               // приглушать фон редактора, пока идёт набор текста
        dimOnBlur: false,                               // приглушать фон, когда окно VS Code теряет фокус
        groupBorderMono: false                          // «Живой контур» одним акцентом (false — радужный перелив)
    },
    // Только совместимые по метрикам Nerd-шрифты, чтобы не ломать выравнивание терминала
    term: {
        font: "JetBrainsMono NF", ligatures: true, glow: 2, weight: 400,
        cursorGlow: true, cursorColor: "#f5e0dc", selColor: "#585b70",
        cursorSize: 1,                                  // ширина курсора (scaleX): 0 — скрыть, 1 — обычный, до 2.5
        cursorHeight: 1                                 // высота курсора (scaleY): 1 — обычная, до 2.5
    },
    ui: { collapsed: {}, posX: null, posY: null }
};

var TERM_FONTS = [
    "JetBrainsMono NF", "JetBrainsMono NFM", "JetBrainsMono NFP",
    "JetBrainsMonoNL NF", "JetBrainsMonoNL NFM", "JetBrains Mono"
];

var FX_LIST = [
    ["kenburns", "Ken Burns"], ["glassTabs", "Стекло вкладок"],
    ["vignette", "Виньетка"], ["glassSide", "Стекло панелей"],
    ["scrim", "Скрим кода"], ["glassStatus", "Стекло статусбара"],
    ["activeLine", "Активная строка"], ["groupRing", "Контур группы"],
    ["groupBorder", "Живой контур"], ["scrollbar", "Скроллбар"],
    ["activityBg", "Фон актив-бара"], ["tabAccent", "Акцент вкладки"],
    ["rounded", "Скругления"], ["cursorGlow", "Свечение курсора"],
    ["selection", "Градиент выделения"], ["titlebar", "Титлбар"],
    ["splash", "Заставка"], ["clock", "Часы"],
    ["particles", "Частицы"], ["pomodoro", "Помидор"],
    ["dimOnType", "Тускнеть при печати"], ["dimOnBlur", "Тускнеть без фокуса"],
    ["groupBorderMono", "Контур: 1 цвет"]
];

// ключ, подпись, min, max, step, знаков после запятой
var PARAMS = [
    ["blur", "Размытие стекла", 0, 20, 1, 0],
    ["kbScale", "Ken Burns масштаб", 1, 1.2, 0.01, 2],
    ["kbSpeed", "Ken Burns сек", 20, 120, 5, 0],
    ["vignette", "Виньетка сила", 0, 0.6, 0.02, 2],
    ["partCount", "Частиц", 0, 120, 5, 0],
    ["pomoMin", "Помидор, мин", 5, 60, 5, 0]
];

// ============================================================
//  БЕЗОПАСНОСТЬ: валидация/санитизация конфига.
//  Всё, что попадёт в CSS (шрифт, цвета) или в вычисления, строго проверяется,
//  чтобы импортированный/подменённый JSON НЕ мог внедрить произвольный CSS
//  (напр. вырваться из font-family:'...' и дописать свои правила).
// ============================================================
var COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function isColor(s) { return typeof s === "string" && COLOR_RE.test(s); }
function clampNum(v, min, max, def) {
    v = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
}
// Шрифт — строго из белого списка (там нет кавычек/;/{} — CSS-инъекция невозможна).
function safeFont(f) { return TERM_FONTS.indexOf(f) >= 0 ? f : DEFAULTS.term.font; }
function safeColor(c, fallback) { return isColor(c) ? c : fallback; }
// Безопасная сборка CSS url('...'). Путь установки плагина (IMG) приходит из
// document.currentScript.src и вставляется в CSS как есть. Если путь содержит
// одинарную кавычку, обратный слэш или перевод строки (напр. C:\Users\O'Brien\…),
// он вырвется из url('...') и сломает — или подменит — CSS. Экранируем спецсимволы
// по правилам CSS-строк (\ и ' — через escape, переводы строк убираем).
function cssUrl(u) {
    var s = String(u).replace(/[\r\n]/g, "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return "url('" + s + "')";
}
// Акцент -> "r,g,b" для rgba() в CSS и на canvas (там var() недоступен).
// getAccent() определён в state.js; вызывается в рантайме, когда всё уже есть.
function accentRGB() {
    var ac = safeColor(getAccent(), DEFAULTS.accent);
    return parseInt(ac.substr(1, 2), 16) + "," + parseInt(ac.substr(3, 2), 16) + "," + parseInt(ac.substr(5, 2), 16);
}

// диапазоны параметров эффектов (ключ -> [min, max]) из PARAMS
var FXP_RANGE = {};
(function () { for (var i = 0; i < PARAMS.length; i++) FXP_RANGE[PARAMS[i][0]] = [PARAMS[i][2], PARAMS[i][3]]; })();

// ===== Конфиг: слияние с дефолтами + санитизация =====
var CFG_KEY = "moonlight-bg-config", LAST_KEY = "moonlight-bg-last";
var sessionRandomIndex = null, switchMul = 1;

function clone(x) { return JSON.parse(JSON.stringify(x)); }

// Безопасный разбор JSON. Reviver выбрасывает ключи-«отравители» прототипа
// ещё до того, как объект попадёт в mergeCfg — защита от prototype pollution
// из подменённого localStorage или импортированного файла (defense-in-depth).
var DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
function safeParse(text) {
    return JSON.parse(text, function (key, value) {
        return DANGEROUS_KEYS.indexOf(key) >= 0 ? undefined : value;
    });
}

// Миграция сырого конфига к текущей схеме. Вызывается ДО mergeCfg — приводит объект,
// сохранённый старой версией плагина, к форме, которую понимает текущий mergeCfg.
// Пока версия одна (1), шагов нет; сюда добавляются блоки вида «if (v < 2) { ... }»,
// чтобы будущие изменения DEFAULTS не конфликтовали со старым localStorage/импортом.
function migrateCfg(p) {
    if (!p || typeof p !== "object") return p;
    var v = (typeof p.version === "number" && isFinite(p.version)) ? p.version : 0;
    // (будущие миграции здесь, по возрастанию v)
    p.version = CFG_VERSION;
    return p;
}

// Единственная точка входа для ЛЮБОГО внешнего конфига (localStorage и импорт файла).
// Принимает только значения известного типа/диапазона, остальное отбрасывает.
function mergeCfg(p) {
    var c = clone(DEFAULTS), k;
    p = migrateCfg(p);
    if (p && typeof p === "object") {
        c.version = CFG_VERSION; // после слияния конфиг всегда текущей версии
        // мастер-выключатель фона/эффектов: только булево
        if (typeof p.enabled === "boolean") c.enabled = p.enabled;
        // mode: "random" или строковый индекс набора в допустимом диапазоне
        if (p.mode === "random") c.mode = "random";
        else if (typeof p.mode === "string" && /^\d+$/.test(p.mode)) {
            var mi = parseInt(p.mode, 10);
            if (mi >= 0 && mi < SETS.length) c.mode = p.mode;
        }
        // яркость по зонам: числа, зажатые в [0, 0.6]
        if (p.baseOp) for (k in c.baseOp) if (typeof p.baseOp[k] === "number") c.baseOp[k] = clampNum(p.baseOp[k], 0, 0.6, c.baseOp[k]);
        // setOp: пересобираем чистый объект — только числовые яркости по числовым индексам.
        // Индекс обязан указывать на СУЩЕСТВУЮЩИЙ набор (< SETS.length): иначе подделанный/
        // раздутый конфиг мог набить cfg тысячами записей для несуществующих наборов, которые
        // затем уходили в localStorage (getOp читает только валидные индексы — остальное балласт).
        if (p.setOp && typeof p.setOp === "object") {
            c.setOp = {};
            for (var idx in p.setOp) {
                if (!/^\d+$/.test(idx) || parseInt(idx, 10) >= SETS.length) continue;
                var o = p.setOp[idx]; if (!o || typeof o !== "object") continue;
                var clean = {};
                ["editor", "side", "panel"].forEach(function (kk) {
                    if (typeof o[kk] === "number") clean[kk] = clampNum(o[kk], 0, 0.6, 0);
                });
                c.setOp[idx] = clean;
            }
        }
        // сила эффектов: числа, зажатые в диапазоны PARAMS
        if (p.fxp) for (k in c.fxp) if (typeof p.fxp[k] === "number" && FXP_RANGE[k]) c.fxp[k] = clampNum(p.fxp[k], FXP_RANGE[k][0], FXP_RANGE[k][1], c.fxp[k]);
        // акцентный цвет: строго #rrggbb
        if (isColor(p.accent)) c.accent = p.accent;
        // акцент по набору: только #rrggbb по числовым индексам существующих наборов (как setOp)
        if (p.setAccent && typeof p.setAccent === "object") {
            c.setAccent = {};
            for (var ai in p.setAccent) {
                if (!/^\d+$/.test(ai) || parseInt(ai, 10) >= SETS.length) continue;
                if (isColor(p.setAccent[ai])) c.setAccent[ai] = p.setAccent[ai];
            }
        }
        // имя набора: строка (в textContent/title, НЕ в CSS — инъекция не грозит),
        // только по валидным индексам, длина ограничена. Пустая строка -> не сохраняем
        // (набор вернётся к «родному» имени из SETS).
        if (p.setName && typeof p.setName === "object") {
            c.setName = {};
            for (var ni in p.setName) {
                if (!/^\d+$/.test(ni) || parseInt(ni, 10) >= SETS.length) continue;
                var nv = p.setName[ni];
                if (typeof nv === "string" && nv.length && nv.length <= 40) c.setName[ni] = nv;
            }
        }
        // свои картинки набора по зонам: строка-путь (в url('...') — cssUrl экранирует
        // кавычки/слэши/переводы строк, инъекция не грозит), только валидные индексы,
        // длина ограничена. Пустая строка -> зона возвращается к картинке из SETS.
        if (p.setImg && typeof p.setImg === "object") {
            c.setImg = {};
            for (var ii in p.setImg) {
                if (!/^\d+$/.test(ii) || parseInt(ii, 10) >= SETS.length) continue;
                var zo = p.setImg[ii]; if (!zo || typeof zo !== "object") continue;
                var cleanZ = {};
                ["editor", "sidebar", "panel"].forEach(function (zk) {
                    if (typeof zo[zk] === "string" && zo[zk].length && zo[zk].length <= 1024) cleanZ[zk] = zo[zk];
                });
                c.setImg[ii] = cleanZ;
            }
        }
        // авто-яркость editor: только булево
        if (typeof p.autoDim === "boolean") c.autoDim = p.autoDim;
        // вписывание по зонам: строго из белого списка cover|contain (в CSS — без кавычек)
        if (p.fit && typeof p.fit === "object") {
            ["editor", "side", "panel"].forEach(function (z) {
                if (p.fit[z] === "cover" || p.fit[z] === "contain") c.fit[z] = p.fit[z];
            });
        }
        // фильтры картинки по зонам: числа в допустимых диапазонах
        if (p.imgfx && typeof p.imgfx === "object") {
            ["editor", "side", "panel"].forEach(function (z) {
                var o = p.imgfx[z]; if (!o || typeof o !== "object") return;
                if (typeof o.brightness === "number") c.imgfx[z].brightness = clampNum(o.brightness, 0.3, 1.5, c.imgfx[z].brightness);
                if (typeof o.saturate === "number") c.imgfx[z].saturate = clampNum(o.saturate, 0, 2, c.imgfx[z].saturate);
                if (typeof o.blur === "number") c.imgfx[z].blur = clampNum(o.blur, 0, 12, c.imgfx[z].blur);
            });
        }
        // слайдшоу: флаг + интервал в минутах
        if (p.slideshow && typeof p.slideshow === "object") {
            if (typeof p.slideshow.on === "boolean") c.slideshow.on = p.slideshow.on;
            if (typeof p.slideshow.min === "number") c.slideshow.min = clampNum(p.slideshow.min, 1, 120, c.slideshow.min);
        }
        // авто-набор по времени: флаг + индексы наборов (день/ночь) + границы дня (часы 0–23)
        if (p.autoTime && typeof p.autoTime === "object") {
            if (typeof p.autoTime.on === "boolean") c.autoTime.on = p.autoTime.on;
            ["day", "night"].forEach(function (kk) {
                var vi = p.autoTime[kk];
                if (typeof vi === "number" && vi >= 0 && vi < SETS.length) c.autoTime[kk] = Math.floor(vi);
            });
            ["from", "to"].forEach(function (kk) {
                var hv = p.autoTime[kk];
                if (typeof hv === "number" && isFinite(hv)) c.autoTime[kk] = Math.min(23, Math.max(0, Math.floor(hv)));
            });
        }
        // эффекты: только булевы
        if (p.fx) for (k in c.fx) if (typeof p.fx[k] === "boolean") c.fx[k] = p.fx[k];
        // терминал: шрифт из белого списка, цвета строго #rrggbb, числа зажаты
        if (p.term && typeof p.term === "object") {
            if (typeof p.term.font === "string") c.term.font = safeFont(p.term.font);
            if (typeof p.term.ligatures === "boolean") c.term.ligatures = p.term.ligatures;
            if (typeof p.term.glow === "number") c.term.glow = clampNum(p.term.glow, 0, 6, c.term.glow);
            if (typeof p.term.weight === "number") c.term.weight = clampNum(p.term.weight, 400, 800, c.term.weight);
            if (typeof p.term.cursorGlow === "boolean") c.term.cursorGlow = p.term.cursorGlow;
            if (isColor(p.term.cursorColor)) c.term.cursorColor = p.term.cursorColor;
            if (isColor(p.term.selColor)) c.term.selColor = p.term.selColor;
            if (typeof p.term.cursorSize === "number") c.term.cursorSize = clampNum(p.term.cursorSize, 0, 2.5, c.term.cursorSize);
            if (typeof p.term.cursorHeight === "number") c.term.cursorHeight = clampNum(p.term.cursorHeight, 0, 2.5, c.term.cursorHeight);
        }
        // ui: свёрнутость (только булевы значения) + позиция (конечные числа)
        if (p.ui && typeof p.ui === "object") {
            if (p.ui.collapsed && typeof p.ui.collapsed === "object") {
                c.ui.collapsed = {};
                // Ключи — названия секций панели (их единицы). Ограничиваем число
                // и длину ключа, чтобы подменённый конфиг не раздул объект тысячами
                // записей и не утёк в saveCfg -> localStorage.
                var _cn = 0;
                for (var t2 in p.ui.collapsed) {
                    if (!p.ui.collapsed.hasOwnProperty(t2)) continue;
                    if (_cn >= 64 || t2.length > 64) break;
                    if (typeof p.ui.collapsed[t2] === "boolean") { c.ui.collapsed[t2] = p.ui.collapsed[t2]; _cn++; }
                }
            }
            if (typeof p.ui.posX === "number" && isFinite(p.ui.posX)) c.ui.posX = p.ui.posX;
            if (typeof p.ui.posY === "number" && isFinite(p.ui.posY)) c.ui.posY = p.ui.posY;
        }
    }
    return c;
}
function loadCfg() {
    try {
        var raw = localStorage.getItem(CFG_KEY);
        // Нормальный конфиг весит килобайты. Отсекаем заведомо раздутый/подменённый
        // localStorage до JSON.parse (тот же лимит, что и при импорте файла) — чтобы
        // огромная строка не била по старту разбором/памятью. Свыше лимита — дефолты.
        if (raw && raw.length <= 256 * 1024) return mergeCfg(safeParse(raw));
    } catch (e) {}
    return clone(DEFAULTS);
}
function saveCfg() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

var cfg = loadCfg();
