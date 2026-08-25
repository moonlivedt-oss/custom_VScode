// ============================================================
//  MoonLight custom-bg — СОБРАННЫЙ ФАЙЛ. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ!
//  Исходники: src/**   |   Пересборка: node build.js
//  Грузится через vscode_custom_css.imports (be5invis.vscode-custom-css).
// ============================================================
(function () {
    "use strict";

    // ===================== src/core/config.js =====================
    // ===== Ресурсы и наборы =====
    // IMG — базовый URL к папке плагина (картинки). Пытаемся вычислить из адреса самого
    // скрипта (document.currentScript) — тогда перенос папки не ломает пути. Если скрипт
    // внедрён инлайном (src пустой), откатываемся к абсолютному пути ниже.
    var IMG = (function () {
        try {
            var src = (document.currentScript && document.currentScript.src) || "";
            var i = src.lastIndexOf("/");
            if (i >= 0) return src.slice(0, i + 1); // .../vscode-bg/custom-bg.js -> .../vscode-bg/
        } catch (e) {}
        return "vscode-file://vscode-app/d%3A/Desktop/components/vscode-bg/"; // запасной путь
    })();

    // Пути к картинкам набора — относительно IMG. Картинки наборов лежат в
    // assets/{editor,panel,sidebar}/; ещё не разложенные по наборам — в assets/ (корень).
    // У каждого набора свой акцентный цвет (accent) под его палитру — при переключении
    // набора интерфейс перекрашивается автоматически (см. getAccent). Пользователь может
    // переопределить акцент конкретного набора — правка хранится в cfg.setAccent[idx].
    // name — короткое имя набора (в тултипе кнопки BG, на чипах и в статусбаре).
    var SETS = [
        { name: "Маки",          editor: "assets/editor/editor_0.jpg", sidebar: "assets/sidebar/sidebar_0.jpg", panel: "assets/panel/panel_0.jpg", accent: "#f38ba8" }, // 0
        { name: "Пурпур",        editor: "assets/editor/editor_1.jpg", sidebar: "assets/sidebar/sidebar_1.jpg", panel: "assets/panel/panel_1.jpg", accent: "#cba6f7" }, // 1
        { name: "Кровавая луна", editor: "assets/editor/editor_2.jpg", sidebar: "assets/sidebar/sidebar_2.jpg", panel: "assets/panel/panel_2.jpg", accent: "#f38ba8" }, // 2
        { name: "Лунная тушь",   editor: "assets/editor/editor_3.jpg", sidebar: "assets/sidebar/sidebar_3.jpg", panel: "assets/panel/panel_3.jpg", accent: "#94e2d5" }, // 3
        { name: "Синяя ночь",    editor: "assets/editor/editor_4.jpg", sidebar: "assets/sidebar/sidebar_4.jpg", panel: "assets/panel/panel_4.jpg", accent: "#89b4fa" }, // 4
        { name: "Пурпурный сон", editor: "assets/editor/editor_5.jpg", sidebar: "assets/sidebar/sidebar_5.jpg", panel: "assets/panel/panel_5.jpg", accent: "#cba6f7" }, // 5
        { name: "Коты и луна",   editor: "assets/editor/editor_6.jpg", sidebar: "assets/sidebar/sidebar_6.jpg", panel: "assets/panel/panel_6.jpg", accent: "#f5c2e7" }  // 6
    ];
    // Короткое имя набора по индексу (для статусбара/тултипов). Пустая строка, если индекс вне диапазона.
    function setName(idx) { var s = SETS[idx]; return (s && s.name) ? s.name : ""; }

    // ===== Дефолты =====
    // CFG_VERSION — версия схемы конфига. Растёт, когда меняется структура DEFAULTS так,
    // что старый сохранённый конфиг нужно осознанно доработать (см. migrateCfg).
    var CFG_VERSION = 1;
    var DEFAULTS = {
        version: CFG_VERSION,
        mode: "0",
        baseOp: { editor: 0.06, side: 0.30, panel: 0.11 },
        setOp: {},
        accent: "#cba6f7",                                  // глобальный акцент (запасной, если у набора нет своего)
        setAccent: {},                                      // переопределение акцента конкретного набора: { idx: "#rrggbb" }
        autoDim: true,                                      // авто-занижение яркости editor под светлые картинки (читаемость кода)
        fit: { editor: "cover", side: "cover", panel: "cover" }, // вписывание фоновой картинки по зонам: cover | contain
        // фильтры самой фоновой картинки — отдельно по зонам (редактор / сайдбар / панель)
        imgfx: {
            editor: { brightness: 1.0, saturate: 1.0, blur: 0 },
            side:   { brightness: 1.0, saturate: 1.0, blur: 0 },
            panel:  { brightness: 1.0, saturate: 1.0, blur: 0 }
        },
        slideshow: { on: false, min: 15 },                  // авто-смена набора по таймеру
        // авто-набор по времени суток: днём — свой набор, ночью — свой (день 8:00–20:00)
        autoTime: { on: false, day: 0, night: 4 },
        fxp: { blur: 8, kbScale: 1.08, kbSpeed: 60, vignette: 0.32, partCount: 40, pomoMin: 25 },
        fx: {
            kenburns: true, glassTabs: true, vignette: true, glassSide: true,
            scrim: true, glassStatus: true, activeLine: true, groupRing: true,
            scrollbar: true, activityBg: true, tabAccent: true, rounded: true,
            cursorGlow: true, selection: true, splash: true,
            groupBorder: true, titlebar: true, clock: true, particles: true, pomodoro: false
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
        ["particles", "Частицы"], ["pomodoro", "Помидор"]
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
            // mode: "random" или строковый индекс набора в допустимом диапазоне
            if (p.mode === "random") c.mode = "random";
            else if (typeof p.mode === "string" && /^\d+$/.test(p.mode)) {
                var mi = parseInt(p.mode, 10);
                if (mi >= 0 && mi < SETS.length) c.mode = p.mode;
            }
            // яркость по зонам: числа, зажатые в [0, 0.6]
            if (p.baseOp) for (k in c.baseOp) if (typeof p.baseOp[k] === "number") c.baseOp[k] = clampNum(p.baseOp[k], 0, 0.6, c.baseOp[k]);
            // setOp: пересобираем чистый объект — только числовые яркости по числовым индексам
            if (p.setOp && typeof p.setOp === "object") {
                c.setOp = {};
                for (var idx in p.setOp) {
                    if (!/^\d+$/.test(idx)) continue;
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
            // акцент по набору: только #rrggbb по числовым индексам (как setOp)
            if (p.setAccent && typeof p.setAccent === "object") {
                c.setAccent = {};
                for (var ai in p.setAccent) {
                    if (!/^\d+$/.test(ai)) continue;
                    if (isColor(p.setAccent[ai])) c.setAccent[ai] = p.setAccent[ai];
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
            // авто-набор по времени: флаг + индексы наборов (день/ночь) в допустимом диапазоне
            if (p.autoTime && typeof p.autoTime === "object") {
                if (typeof p.autoTime.on === "boolean") c.autoTime.on = p.autoTime.on;
                ["day", "night"].forEach(function (kk) {
                    var vi = p.autoTime[kk];
                    if (typeof vi === "number" && vi >= 0 && vi < SETS.length) c.autoTime[kk] = Math.floor(vi);
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

    // ===================== src/core/state.js =====================
    // ===== Активный набор и его яркость =====
    function pickRandom() {
        var last = -1; try { last = parseInt(localStorage.getItem(LAST_KEY), 10); } catch (e) {}
        var idx;
        if (SETS.length <= 1) idx = 0;
        else { do { idx = Math.floor(Math.random() * SETS.length); } while (idx === last); }
        try { localStorage.setItem(LAST_KEY, String(idx)); } catch (e) {}
        return idx;
    }
    function activeIndex() {
        if (cfg.mode === "random") {
            if (sessionRandomIndex === null) sessionRandomIndex = pickRandom();
            return sessionRandomIndex;
        }
        var i = parseInt(cfg.mode, 10);
        if (isNaN(i) || i < 0 || i >= SETS.length) i = 0;
        return i;
    }
    // яркость активного набора (своя или базовая)
    function getOp() {
        var idx = activeIndex(), o = cfg.setOp[idx] || {};
        return {
            editor: typeof o.editor === "number" ? o.editor : cfg.baseOp.editor,
            side: typeof o.side === "number" ? o.side : cfg.baseOp.side,
            panel: typeof o.panel === "number" ? o.panel : cfg.baseOp.panel
        };
    }
    function setOpValue(key, v) {
        var idx = activeIndex();
        if (!cfg.setOp[idx]) cfg.setOp[idx] = {};
        cfg.setOp[idx][key] = v;
    }
    // Акцент активного набора: приоритет — правка пользователя (cfg.setAccent[idx]),
    // затем «родной» акцент набора (SETS[idx].accent), затем глобальный cfg.accent.
    function getAccent() {
        var idx = activeIndex();
        var o = cfg.setAccent && cfg.setAccent[idx];
        if (isColor(o)) return o;
        var s = SETS[idx] && SETS[idx].accent;
        if (isColor(s)) return s;
        return safeColor(cfg.accent, DEFAULTS.accent);
    }
    function setAccentValue(v) {
        var idx = activeIndex();
        if (!cfg.setAccent) cfg.setAccent = {};
        cfg.setAccent[idx] = v;
    }

    // ===================== src/fx/css.js =====================
    // ===== Проба картинок: загрузка (404) + средняя яркость (для авто-дима) =====
    // Одна загрузка на URL обслуживает и фолбэк при 404 (ok), и авто-яркость (luma).
    // Картинки лежат на vscode-file://vscode-app/… — тот же origin, что и воркбенч,
    // поэтому canvas не «портится» (getImageData не бросает security-ошибку).
    // Результат кэшируется; по готовности дёргаем пересборку стиля (bumpStyle+ensureStyle).
    var _imgState = {}; // url -> { ok: bool, luma: 0..1|null }
    function probeImage(url) {
        if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
        var st = { ok: true, luma: null }; // до загрузки считаем «ок, яркость неизвестна»
        _imgState[url] = st;
        try {
            var im = new Image();
            im.onload = function () {
                st.ok = true;
                try {
                    var c = document.createElement("canvas"); c.width = 16; c.height = 16;
                    var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, 16, 16);
                    var d = cx.getImageData(0, 0, 16, 16).data, sum = 0, n = 0;
                    for (var i = 0; i < d.length; i += 4) {
                        sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; // Rec.601, 0..1
                    }
                    st.luma = n ? sum / n : 1;
                } catch (e) { st.luma = 1; } // canvas «испорчен»/ошибка — не димим
                bumpStyle(); ensureStyle();
            };
            im.onerror = function () { st.ok = false; bumpStyle(); ensureStyle(); };
            im.src = url;
        } catch (e) {}
        return st;
    }
    // Коэффициент занижения яркости editor по средней светлоте картинки: тёмные/средние —
    // как есть (1.0), почти белые — до ~0.4, чтобы код не «слепило». Плавно между.
    function lumaDimFactor(luma) {
        if (luma == null || luma <= 0.55) return 1;
        var t = Math.min(1, (luma - 0.55) / 0.35); // 0.55..0.90 -> 0..1
        return 1 - 0.6 * t;                          // -> 1.0 .. 0.4
    }

    // ===== Тема VS Code: светлая / тёмная =====
    // VS Code вешает класс темы на .monaco-workbench: vs (светлая), vs-dark (тёмная),
    // hc-black / hc-light (контрастные). Поверхности «стекла», титлбара и скрима у нас
    // раньше были зашиты тёмными (rgba(30,30,46,…), #181825) — на светлой теме это ломало
    // вид. Теперь определяем тему и подменяем палитру поверхностей (см. buildCSS).
    function themeKind() {
        try {
            var wb = document.querySelector(".monaco-workbench") || document.body;
            var cl = (wb && wb.className) || "";
            if (/\bvs-dark\b/.test(cl) || /\bhc-black\b/.test(cl)) return "dark";
            if (/\bhc-light\b/.test(cl)) return "light";
            if (/\bvs\b/.test(cl)) return "light";
        } catch (e) {}
        return "dark";
    }
    function isLightTheme() { return themeKind() === "light"; }

    // ===== Сборка CSS =====
    function buildCSS() {
        var s = SETS[activeIndex()], fx = cfg.fx, fxp = cfg.fxp, op = getOp();
        // Палитра поверхностей под тему. surfRGB — база «матового стекла»/статусбара/титлбара;
        // titleSolid — непрозрачная подложка титлбара; scrimRGB — цвет тени-скрима под кодом
        // (на светлой теме код тёмный, поэтому ореол светлый); shadowRGB — тень текста в
        // сайдбаре/панели для читаемости поверх картинки.
        var light = isLightTheme();
        var surfRGB   = light ? "236,236,244" : "30,30,46";
        var titleSolid = light ? "#e6e6f0"    : "#181825";
        var scrimRGB  = light ? "255,255,255" : "30,30,46";
        var shadowRGB = light ? "255,255,255" : "0,0,0";
        // Фон зоны: 404 -> сплошная акцентная подложка (не пустота); иначе url + вписывание
        // (cover|contain из cfg.fit) на нужной позиции. zone: editor|side|panel.
        function zoneBg(rel, zone, position) {
            var url = IMG + rel;
            if (!probeImage(url).ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
            var fit = (cfg.fit && cfg.fit[zone] === "contain") ? "contain" : "cover";
            return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
        }
        var BG_ED = zoneBg(s.editor, "editor", "center");
        var BG_SB = zoneBg(s.sidebar, "side", "center bottom");
        var BG_PN = zoneBg(s.panel, "panel", "right bottom");
        // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
        var edDim = cfg.autoDim ? lumaDimFactor(probeImage(IMG + s.editor).luma) : 1;
        var out = [];
        function add() { for (var i = 0; i < arguments.length; i++) out.push(arguments[i]); }
        var TR = "  transition: opacity 0.5s ease;";

        // Акцентный цвет — санитизируем повторно и раскладываем на компоненты для var().
        // Все эффекты ниже используют var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
        var ac = safeColor(getAccent(), DEFAULTS.accent);
        var acRGB = accentRGB();
        add(":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + acRGB + "; }");

        // Фильтры самой фоновой картинки (яркость/насыщенность/размытие) — своя строка на зону.
        // Числа зажаты в mergeCfg, здесь клампим повторно (defense-in-depth). Пустая строка,
        // если зона на дефолте, — тогда filter не добавляется (нулевой оверхед).
        function imgFilter(z) {
            var f = cfg.imgfx[z] || {};
            var b = clampNum(f.brightness, 0.3, 1.5, 1), sa = clampNum(f.saturate, 0, 2, 1), bl = clampNum(f.blur, 0, 12, 0);
            return (b !== 1 || sa !== 1 || bl > 0) ? "  filter: brightness(" + b + ") saturate(" + sa + ") blur(" + bl + "px);" : "";
        }
        // актив-бар делит картинку с сайдбаром, заставка — с редактором, поэтому фильтры общие.
        var IMGF_ED = imgFilter("editor"), IMGF_SB = imgFilter("side"), IMGF_PN = imgFilter("panel");

        // РЕДАКТОР
        add(
            ".monaco-editor .overflow-guard > .monaco-scrollable-element > .monaco-editor-background { background: none; }",
            ".monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
            "  background: " + BG_ED + ";",
            "  opacity: " + (op.editor * switchMul * edDim) + ";", TR, IMGF_ED,
            (fx.kenburns ? "  animation: mlbg-kenburns " + fxp.kbSpeed + "s ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
            "}"
        );
        if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(" + fxp.kbScale + "); } }");

        // САЙДБАР / ПАНЕЛЬ
        add(
            ".part.sidebar::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
            "  background: " + BG_SB + "; opacity: " + (op.side * switchMul) + ";", TR, IMGF_SB,
            "}",
            ".part.panel::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
            "  background: " + BG_PN + "; opacity: " + (op.panel * switchMul) + ";", TR, IMGF_PN,
            "}",
            ".part.sidebar .monaco-list-row, .part.sidebar .pane-header .title,",
            ".part.panel .monaco-list-row, .part.panel .pane-body, .part.panel .xterm-rows {",
            "  text-shadow: 0 1px 2px rgba(" + shadowRGB + ",0.85), 0 0 2px rgba(" + shadowRGB + ",0.6);",
            "}"
        );

        // ТЕРМИНАЛ (типографика). Значения ПОВТОРНО санитизируем перед инъекцией в CSS
        // (защита от подмены cfg в обход панели): шрифт из белого списка, цвета строго #rrggbb.
        var t = cfg.term;
        var tf = safeFont(t.font);
        var tcur = safeColor(t.cursorColor, DEFAULTS.term.cursorColor);
        var tsel = safeColor(t.selColor, DEFAULTS.term.selColor);
        var tw = clampNum(t.weight, 400, 800, 400);
        var tglow = clampNum(t.glow, 0, 6, 2);
        var tcw = clampNum(t.cursorSize, 0, 2.5, 1);   // ширина курсора (scaleX)
        var tch = clampNum(t.cursorHeight, 0, 2.5, 1); // высота курсора (scaleY)
        // Свечение = тёмная тень для читаемости + видимый акцентный ореол, растущий со слайдером.
        var glowHalo = tglow > 0 ? ", 0 0 " + tglow + "px rgba(" + acRGB + "," + Math.min(tglow * 0.1, 0.6).toFixed(2) + ")" : "";
        // Селекторы привязаны к корню xterm (.xterm), а НЕ к «.terminal»: у элемента
        // терминала в VS Code нет класса «terminal» (обёртка — .terminal-wrapper), поэтому
        // прежний префикс «.terminal .xterm…» не совпадал ни с чем и правила не применялись.
        add(
            ".xterm, .xterm .xterm-rows {",
            "  font-family: '" + tf + "', 'JetBrainsMono NF', monospace !important;",
            "  font-variant-ligatures: " + (t.ligatures ? "contextual" : "none") + " !important;",
            "}",
            // font-weight / text-shadow действуют на DOM-рендерер (gpuAcceleration: off).
            ".xterm .xterm-rows {",
            "  font-weight: " + tw + " !important;",
            "  text-shadow: 0 1px 2px rgba(0,0,0,0.85)" + glowHalo + " !important;",
            "}",
            ".xterm .xterm-rows .xterm-bold { font-weight: " + Math.min(tw + 200, 900) + " !important; }"
        );
        // Запасное свечение для GPU-рендерера: текст рисуется в <canvas>, и text-shadow к нему
        // не применяется — а drop-shadow к канвасу даёт ореол вокруг глифов. При gpuAcceleration:off
        // канваса нет, правило неактивно (нулевой оверхед).
        if (tglow > 0) add(
            ".xterm .xterm-screen canvas { filter: drop-shadow(0 0 " + tglow + "px rgba(0,0,0,0.7)); }"
        );
        if (t.cursorGlow) add(
            ".xterm .xterm-cursor-layer .xterm-cursor, .xterm .xterm-rows .xterm-cursor {",
            "  box-shadow: 0 0 7px 1px " + tcur + ";",
            "}"
        );
        add(
            ".xterm .xterm-cursor-layer .xterm-cursor, .xterm .xterm-rows .xterm-cursor-block, .xterm .xterm-rows .xterm-cursor {",
            "  background-color: " + tcur + " !important; border-color: " + tcur + " !important;",
            "}",
            // Выделение: высокая специфичность + !important, чтобы перебить инлайн-цвет xterm.
            // Покрываем и активное, и неактивное выделение (терминал без фокуса).
            ".xterm .xterm-screen .xterm-selection div, .xterm .xterm-selection div, .xterm-selection div {",
            "  background-color: " + tsel + " !important; background-image: none !important;",
            "}"
        );
        // Курсор: ширина (scaleX) и высота (scaleY) отдельно; ширина 0 — скрыть.
        // display:inline-block обязателен — transform не действует на строчные элементы.
        var CUR_SEL = ".xterm .xterm-cursor-layer .xterm-cursor, .xterm .xterm-rows .xterm-cursor";
        if (tcw <= 0) add(CUR_SEL + " { opacity: 0 !important; box-shadow: none !important; }");
        else if (tcw !== 1 || tch !== 1) add(CUR_SEL + " { display: inline-block !important; transform: scale(" + tcw + "," + tch + "); transform-origin: center; }");

        // ЭФФЕКТЫ
        if (fx.activityBg) add(
            ".part.activitybar::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
            "  background: " + BG_SB + "; opacity: " + (0.10 * switchMul) + ";", TR, IMGF_SB,
            "}"
        );
        if (fx.rounded) add(
            ".monaco-menu .monaco-action-bar, .quick-input-widget, .monaco-hover, .suggest-widget,",
            ".editor-widget.find-widget, .notifications-toasts .notification-toast {",
            "  border-radius: 10px !important; overflow: hidden;",
            "}"
        );
        if (fx.tabAccent) add(".tabs-container > .tab.active { box-shadow: inset 0 -2px 0 0 var(--mlbg-accent); }");
        if (fx.vignette) add(".part.editor .editor-container { box-shadow: inset 0 0 140px 30px rgba(0,0,0," + fxp.vignette + "); }");
        if (fx.scrim) add(".monaco-editor .view-lines { text-shadow: 0 0 3px rgba(" + scrimRGB + ",0.85); }");
        if (fx.glassTabs) add(
            ".part.editor > .content .editor-group-container > .title {",
            "  background-color: rgba(" + surfRGB + ",0.55) !important; backdrop-filter: blur(" + fxp.blur + "px); -webkit-backdrop-filter: blur(" + fxp.blur + "px);",
            "}"
        );
        if (fx.glassSide) add(
            ".part.sidebar, .part.panel {",
            "  background-color: rgba(" + surfRGB + ",0.60) !important; backdrop-filter: blur(" + fxp.blur + "px); -webkit-backdrop-filter: blur(" + fxp.blur + "px);",
            "}"
        );
        if (fx.scrollbar) add(
            ".monaco-scrollable-element > .scrollbar > .slider { background: rgba(var(--mlbg-accent-rgb),0.30) !important; border-radius: 8px; }",
            ".monaco-scrollable-element > .scrollbar > .slider:hover { background: rgba(var(--mlbg-accent-rgb),0.55) !important; }"
        );
        if (fx.groupRing) add(".editor-group-container.active { box-shadow: inset 0 0 0 1px rgba(var(--mlbg-accent-rgb),0.28), inset 0 0 24px rgba(var(--mlbg-accent-rgb),0.08); }");
        if (fx.activeLine) add(
            ".monaco-editor .view-overlays .current-line {",
            "  background: rgba(var(--mlbg-accent-rgb),0.06) !important; box-shadow: inset 2px 0 0 0 rgba(var(--mlbg-accent-rgb),0.55);",
            "}"
        );
        if (fx.glassStatus) add(
            ".part.statusbar { background-color: rgba(" + surfRGB + ",0.55) !important; backdrop-filter: blur(" + Math.min(fxp.blur, 8) + "px); -webkit-backdrop-filter: blur(" + Math.min(fxp.blur, 8) + "px); }"
        );
        if (fx.cursorGlow) add(
            ".monaco-editor .cursors-layer > .cursor { box-shadow: 0 0 8px 2px rgba(var(--mlbg-accent-rgb),0.85); border-radius: 1px; }"
        );
        if (fx.selection) add(
            ".monaco-editor .view-overlays .selected-text {",
            "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.32), rgba(137,180,250,0.32)) !important; border-radius: 2px;",
            "}"
        );
        if (fx.groupBorder) add(
            ".editor-group-container.active::before {",
            "  content:''; position:absolute; inset:0; z-index:6; pointer-events:none; padding:2px; border-radius:4px;",
            "  background:linear-gradient(120deg,var(--mlbg-accent),#89b4fa,#a6e3a1,var(--mlbg-accent)); background-size:300% 300%;",
            "  animation: mlbg-flow 8s linear infinite;",
            "  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;",
            "  mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite:exclude;",
            "}",
            "@keyframes mlbg-flow { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }"
        );
        if (fx.titlebar) add(
            ".part.titlebar, .titlebar {",
            "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.30), rgba(137,180,250,0.16) 45%, rgba(" + surfRGB + ",0) 78%), " + titleSolid + " !important;",
            "}"
        );
        if (fx.splash) add(
            ".editor-group-container.empty { position: relative; }",
            ".editor-group-container.empty::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
            // заставка = картинка редактора, всегда «contain»; 404 -> акцентная подложка
            "  background: " + (probeImage(IMG + s.editor).ok ? cssUrl(IMG + s.editor) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)") + "; opacity: " + (0.12 * switchMul * edDim) + ";", TR, IMGF_ED,
            "}"
        );

        add(
            "#moonlight-bg-switcher { cursor: pointer; }",
            "#moonlight-bg-switcher:hover { background: rgba(var(--mlbg-accent-rgb),0.18); }",
            // видимый фокус для клавиатуры (кнопка BG и все div-«кнопки» панели)
            "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible {",
            "  outline: 2px solid var(--mlbg-accent); outline-offset: 1px;",
            "}"
        );

        // Доступность/батарея: при системной «уменьшить движение» гасим CSS-анимации
        // (Ken Burns, живая рамка). Частицы (canvas/JS) выключаются отдельно в ensureParticles.
        add(
            "@media (prefers-reduced-motion: reduce) {",
            "  .monaco-editor .overflow-guard > .monaco-scrollable-element::after,",
            "  .editor-group-container.active::before { animation: none !important; }",
            "}"
        );
        return out.join("\n");
    }

    // ===== Инъекция стиля =====
    // Ревизия: bumpStyle() дёргается при любом изменении, влияющем на CSS (apply/applyFade).
    // ensureStyle пересобирает CSS только когда ревизия сдвинулась ИЛИ наш <style> пропал
    // (VS Code перестроил DOM). Иначе периодический heal() каждые 3 с — это дешёвая проверка
    // getElementById без пересборки ~5 КБ строки.
    var STYLE_ID = "moonlight-custom-bg";
    var _styleRev = 0, _appliedRev = -1;
    function bumpStyle() { _styleRev++; }
    function ensureStyle() {
        try {
            var el = document.getElementById(STYLE_ID);
            if (el && el.textContent && _appliedRev === _styleRev) return; // ничего не менялось, стиль на месте
            var css = buildCSS();
            if (!el) { el = document.createElement("style"); el.id = STYLE_ID; document.head.appendChild(el); }
            if (el.textContent !== css) el.textContent = css;
            _appliedRev = _styleRev;
        } catch (e) {}
    }
    function apply() { saveCfg(); bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
    // Троттлинг для слайдеров: коалесцируем поток input-событий в один apply за кадр
    // (иначе на каждый пиксель — пересборка CSS + запись в localStorage).
    var _applyRaf = 0;
    function applyThrottled() {
        if (_applyRaf) return;
        _applyRaf = requestAnimationFrame(function () { _applyRaf = 0; apply(); });
    }
    function applyFade() {
        saveCfg(); updateLabel(); syncWidgets();
        // switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
        switchMul = 0; bumpStyle(); ensureStyle();
        requestAnimationFrame(function () { switchMul = 1; bumpStyle(); ensureStyle(); });
    }

    // ===================== src/ui/statusbar.js =====================
    // ===== Кнопка статусбара =====
    var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";
    function updateLabel() {
        var item = document.getElementById(SB_ID); if (!item) return;
        var a = item.querySelector("a"); if (!a) return;
        var idx = activeIndex(), nm = setName(idx);
        a.textContent = "BG " + idx + (nm ? " · " + nm : "") + (cfg.mode === "random" ? " ~" : "");
        var t = "Фон и дизайн — настройки" + (nm ? " (набор: " + nm + ")" : "");
        item.title = t; item.setAttribute("aria-label", t);
    }
    function ensureStatusBar() {
        try {
            var right = document.querySelector(".statusbar .right-items") || document.querySelector(".right-items");
            if (!right) return;
            var item = document.getElementById(SB_ID);
            if (!item) {
                item = document.createElement("div");
                item.id = SB_ID; item.className = "statusbar-item right"; item.title = "Фон и дизайн — настройки";
                item.setAttribute("role", "button");
                item.setAttribute("tabindex", "0");
                item.setAttribute("aria-label", "Фон и дизайн — настройки");
                var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px";
                item.appendChild(a);
                item.addEventListener("click", togglePanel);
                item.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); togglePanel(e); }
                });
                right.insertBefore(item, right.firstChild);
            }
            updateLabel();
        } catch (e) {}
    }

    // ===================== src/ui/widgets.js =====================
    // ===== Базовый конструктор элемента =====
    function el(tag, css, text) {
        var e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (text != null) e.textContent = text;
        return e;
    }
    function section(t) {
        return el("div", "margin:12px 2px 6px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.7px; color:#7f849c;", t);
    }
    // Делает div-«кнопку» доступной с клавиатуры: фокусируется и активируется Enter/Space
    // (клик-логика переиспользуется через node.click()). role/aria — для скринридеров.
    function keyActivate(node, label) {
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        if (label) node.setAttribute("aria-label", label);
        node.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); node.click(); }
        });
        return node;
    }

    // health-check: помечаем чип, если картинка набора не грузится
    function probeSet(idx, chip) {
        var s = SETS[idx];
        [s.editor, s.sidebar, s.panel].forEach(function (fn) {
            var im = new Image();
            im.onerror = function () {
                chip.style.border = "1px solid #f38ba8";
                chip.style.boxShadow = "inset 0 0 0 1px rgba(243,139,168,0.55)";
                chip.title = "Не грузится: " + fn;
                var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:1px; left:3px; color:#f38ba8; font-weight:700;", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
            };
            im.src = IMG + fn;
        });
    }

    // чип набора с превью-миниатюрой
    function makeChip(mode, label) {
        var active = cfg.mode === mode, isSet = mode !== "random";
        var css = isSet
            ? "position:relative; width:48px; height:32px; border-radius:7px; overflow:hidden; cursor:pointer;" +
              "background-position:center; background-size:cover;" +
              "border:2px solid " + (active ? "var(--mlbg-accent)" : "rgba(205,214,244,0.16)") + ";" +
              (active ? "box-shadow:0 0 0 2px rgba(var(--mlbg-accent-rgb),0.35);" : "")
            : "min-width:24px; padding:4px 10px; border-radius:7px; cursor:pointer; user-select:none; text-align:center;" +
              "font-weight:" + (active ? "600" : "400") + ";" +
              "border:1px solid " + (active ? "var(--mlbg-accent)" : "rgba(205,214,244,0.16)") + ";" +
              "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.28)" : "transparent") + "; color:" + (active ? "#f2e6ff" : "#cdd6f4") + ";";
        var c = el("div", css, isSet ? null : label);
        if (isSet) {
            var idx = parseInt(mode, 10);
            c.style.backgroundImage = cssUrl(IMG + SETS[idx].editor);
            var num = el("span", "position:absolute; right:3px; bottom:1px; font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.9);", label);
            c.appendChild(num);
            var nm = setName(idx); if (nm) c.title = idx + " · " + nm;
            probeSet(idx, c);
            if (!active) {
                c.addEventListener("mouseenter", function () { c.style.borderColor = "rgba(var(--mlbg-accent-rgb),0.6)"; });
                c.addEventListener("mouseleave", function () { c.style.borderColor = "rgba(205,214,244,0.16)"; });
            }
        } else if (!active) {
            c.addEventListener("mouseenter", function () { c.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
            c.addEventListener("mouseleave", function () { c.style.background = "transparent"; });
        }
        c.addEventListener("click", function () {
            if (mode === "random") sessionRandomIndex = pickRandom();
            cfg.mode = mode; applyFade(); refreshPanel();
        });
        keyActivate(c, isSet ? ("Набор " + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : "Случайный набор");
        return c;
    }

    function makeOpSlider(key, label) {
        var op = getOp();
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
        var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
        sl.type = "range"; sl.min = "0"; sl.max = "0.6"; sl.step = "0.01"; sl.value = String(op[key]);
        var val = el("span", "flex:0 0 30px; text-align:right; color:#a6adc8;", op[key].toFixed(2));
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); setOpValue(key, v); val.textContent = v.toFixed(2); applyThrottled(); });
        wrap.appendChild(sl); wrap.appendChild(val);
        var d = infoDot(INFO["op_" + key]); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeParamSlider(def) {
        var key = def[0], min = def[2], max = def[3], step = def[4], dec = def[5];
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", def[1]));
        var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
        sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(cfg.fxp[key]);
        var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", cfg.fxp[key].toFixed(dec));
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.fxp[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
        wrap.appendChild(sl); wrap.appendChild(val);
        var d = infoDot(INFO["fxp_" + key]); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeCheck(key, label) {
        var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
        cb.type = "checkbox"; cb.checked = !!cfg.fx[key];
        cb.addEventListener("change", function () { cfg.fx[key] = cb.checked; apply(); });
        row.appendChild(cb);
        row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
        var d = infoDot(INFO["fx_" + key]); if (d) row.appendChild(d);
        return row;
    }

    // ==== Контролы секции «Терминал» (работают с cfg.term) ====
    function makeTermSelect() {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", "Шрифт"));
        var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
        TERM_FONTS.forEach(function (f) {
            var o = el("option", null, f); o.value = f; if (f === cfg.term.font) o.selected = true; sel.appendChild(o);
        });
        sel.addEventListener("change", function () { cfg.term.font = sel.value; apply(); });
        wrap.appendChild(sel);
        var d = infoDot(INFO["term_font"]); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeTermCheck(key, label) {
        var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
        cb.type = "checkbox"; cb.checked = !!cfg.term[key];
        cb.addEventListener("change", function () { cfg.term[key] = cb.checked; apply(); });
        row.appendChild(cb);
        row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
        var d = infoDot(INFO["term_" + key]); if (d) row.appendChild(d);
        return row;
    }
    function makeTermSlider(key, label, min, max, step, dec) {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
        var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
        sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(cfg.term[key]);
        var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", Number(cfg.term[key]).toFixed(dec));
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.term[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
        wrap.appendChild(sl); wrap.appendChild(val);
        var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeTermColor(key, label) {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 56px; color:#a6adc8;", label));
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid rgba(205,214,244,0.2); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = cfg.term[key];
        var hex = el("span", "flex:1 1 auto; color:#6c7086; font-size:11px;", cfg.term[key]);
        ip.addEventListener("input", function () { cfg.term[key] = ip.value; hex.textContent = ip.value; applyThrottled(); });
        wrap.appendChild(ip); wrap.appendChild(hex);
        var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
        return wrap;
    }

    // ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
    // Универсальный слайдер над obj[key] — используется для cfg.imgfx и cfg.slideshow.
    function makeObjSlider(obj, key, label, min, max, step, dec, info) {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", label));
        var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
        sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step); sl.value = String(obj[key]);
        var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;", Number(obj[key]).toFixed(dec));
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); obj[key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
        wrap.appendChild(sl); wrap.appendChild(val);
        var d = infoDot(info); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeAccentColor() {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Акцент"));
        var cur = getAccent();
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid rgba(205,214,244,0.2); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = cur;
        var hex = el("span", "flex:1 1 auto; color:#6c7086; font-size:11px;", cur);
        // акцент правится для АКТИВНОГО набора (setAccentValue), у каждого набора свой
        ip.addEventListener("input", function () { setAccentValue(ip.value); hex.textContent = ip.value; applyThrottled(); });
        wrap.appendChild(ip); wrap.appendChild(hex);
        var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
        return wrap;
    }
    // Чекбокс «Авто-яркость editor» (cfg.autoDim). Отдельно, т.к. не входит в FX_LIST.
    function makeAutoDim() {
        var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
        cb.type = "checkbox"; cb.checked = !!cfg.autoDim;
        cb.addEventListener("change", function () { cfg.autoDim = cb.checked; apply(); });
        row.appendChild(cb);
        row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Авто-яркость editor"));
        var d = infoDot(INFO.autoDim); if (d) row.appendChild(d);
        return row;
    }
    // Фильтры картинки с выбором зоны: один селектор + 3 слайдера, которые
    // перенастраиваются на выбранную зону (cfg.imgfx.editor / .side / .panel).
    function makeImgFilters() {
        var box = el("div", null);
        var cur = "editor";
        var ZONES = [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель/терминал"]];
        var DEFS = [
            ["brightness", "Яркость", 0.3, 1.5, 0.05, 2, INFO.img_brightness],
            ["saturate", "Насыщенность", 0, 2, 0.05, 2, INFO.img_saturate],
            ["blur", "Размытие", 0, 12, 0.5, 1, INFO.img_blur]
        ];

        // селектор зоны
        var selWrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        selWrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Зона"));
        var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
        ZONES.forEach(function (z) { var o = el("option", null, z[1]); o.value = z[0]; sel.appendChild(o); });
        selWrap.appendChild(sel);
        var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
        box.appendChild(selWrap);

        // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
        var fitWrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        fitWrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", "Вписывание"));
        var fitSel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
        [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; fitSel.appendChild(op); });
        fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
        fitWrap.appendChild(fitSel);
        var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
        box.appendChild(fitWrap);
        function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

        // слайдеры, читающие/пишущие cfg.imgfx[cur]
        var rows = DEFS.map(function (d) {
            var key = d[0], min = d[2], max = d[3], step = d[4], dec = d[5];
            var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
            wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", d[1]));
            var sl = el("input", "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;");
            sl.type = "range"; sl.min = String(min); sl.max = String(max); sl.step = String(step);
            var val = el("span", "flex:0 0 34px; text-align:right; color:#a6adc8;");
            sl.addEventListener("input", function () { var v = parseFloat(sl.value); cfg.imgfx[cur][key] = v; val.textContent = v.toFixed(dec); applyThrottled(); });
            wrap.appendChild(sl); wrap.appendChild(val);
            var dot = infoDot(d[6]); if (dot) wrap.appendChild(dot);
            box.appendChild(wrap);
            return function () { var o = cfg.imgfx[cur]; sl.value = String(o[key]); val.textContent = Number(o[key]).toFixed(dec); };
        });

        function refresh() { refreshFit(); rows.forEach(function (fn) { fn(); }); }
        sel.addEventListener("change", function () { cur = sel.value; refresh(); });
        refresh();
        return box;
    }
    function makeSlideToggle() {
        var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
        cb.type = "checkbox"; cb.checked = !!cfg.slideshow.on;
        cb.addEventListener("change", function () { cfg.slideshow.on = cb.checked; slideReset(); apply(); });
        row.appendChild(cb);
        row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Включить"));
        var d = infoDot(INFO.slide_on); if (d) row.appendChild(d);
        return row;
    }

    // ==== Авто-набор по времени суток (cfg.autoTime) ====
    // Тумблер «включить» + два выпадающих списка: набор для дня и для ночи.
    // Днём (8:00–20:00) активируется дневной набор, ночью — ночной (см. timeTick).
    function makeAutoTimeToggle() {
        var row = el("label", "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;");
        cb.type = "checkbox"; cb.checked = !!(cfg.autoTime && cfg.autoTime.on);
        cb.addEventListener("change", function () {
            if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4 };
            cfg.autoTime.on = cb.checked; apply();
            if (cb.checked) { try { timeTick(); } catch (e) {} } // сразу применить нужный набор
        });
        row.appendChild(cb);
        row.appendChild(el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", "Включить"));
        var d = infoDot(INFO.autotime_on); if (d) row.appendChild(d);
        return row;
    }
    // Выпадающий список наборов (для выбора дневного/ночного). which — "day" | "night".
    function makeSetPicker(which, label) {
        var wrap = el("div", "display:flex; align-items:center; gap:8px; padding:2px 2px;");
        wrap.appendChild(el("span", "flex:0 0 92px; color:#a6adc8;", label));
        var sel = el("select", "flex:1 1 auto; min-width:0; background:rgba(30,30,46,0.6); color:#cdd6f4; border:1px solid rgba(205,214,244,0.2); border-radius:6px; padding:3px 4px; cursor:pointer;");
        for (var i = 0; i < SETS.length; i++) {
            var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
            if (cfg.autoTime && cfg.autoTime[which] === i) o.selected = true;
            sel.appendChild(o);
        }
        sel.addEventListener("change", function () {
            if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4 };
            cfg.autoTime[which] = parseInt(sel.value, 10); apply();
            if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} }
        });
        wrap.appendChild(sel);
        return wrap;
    }

    // ===== Тексты подсказок («?») =====
    var INFO = {
        accent: "Акцентный цвет интерфейса (курсор, скроллбар, вкладки, рамки…). Свой для каждого набора: правка применяется к активному набору, у остальных — их цвета.",
        autoDim: "Автоматически занижает яркость фоновой картинки редактора, если она светлая, чтобы код оставался читаемым. Не меняет саму настройку яркости.",
        img_fit: "Как вписывать фоновую картинку в зону: «Заполнить» (cover) — обрезая по краям; «Целиком» (contain) — вся картинка, могут быть поля. Для портретных/«тушь на белом» удобнее contain.",
        img_zone: "Для какой зоны настраиваются фильтры ниже. У каждой зоны свои значения. «Панель/терминал» — фон нижней панели за терминалом.",
        img_brightness: "Яркость самой фоновой картинки (не интерфейса).",
        img_saturate: "Насыщенность цветов фоновой картинки (0 — ч/б, 2 — сочно).",
        img_blur: "Размытие самой фоновой картинки, px.",
        slide_on: "Автоматически менять набор по кругу через заданный интервал.",
        slide_min: "Через сколько минут переключать набор в режиме слайдшоу.",
        autotime_on: "Автоматически переключать набор по времени суток: днём (8:00–20:00) — дневной набор, ночью — ночной. Не работает в режиме «случайно»; при включении отменяет слайдшоу.",
        op_editor: "Насколько ярко проступает фоновая картинка за кодом редактора.",
        op_side: "Прозрачность фоновой картинки сайдбара (проводник и пр.).",
        op_panel: "Прозрачность фоновой картинки нижней панели (терминал/проблемы/вывод).",
        fxp_blur: "Сила размытия «матового стекла» (вкладки, панели, статусбар).",
        fxp_kbScale: "Максимальный масштаб анимации Ken Burns (медленный зум фона).",
        fxp_kbSpeed: "Длительность одного цикла Ken Burns, секунды.",
        fxp_vignette: "Сила затемнения по краям редактора (виньетка).",
        fxp_partCount: "Сколько летящих частиц рисовать (если эффект «Частицы» включён).",
        fxp_pomoMin: "Длительность одного помидора (таймера), минуты.",
        fx_kenburns: "Медленный плавный зум фоновой картинки редактора.",
        fx_glassTabs: "Полупрозрачный матовый фон полосы вкладок.",
        fx_vignette: "Затемнение по краям области редактора.",
        fx_glassSide: "Матовое стекло для сайдбара и панели.",
        fx_scrim: "Лёгкая тень под текстом кода для читаемости поверх фона.",
        fx_glassStatus: "Матовое стекло для нижнего статусбара.",
        fx_activeLine: "Подсветка текущей строки акцентным цветом.",
        fx_groupRing: "Внутренний контур активной группы редакторов.",
        fx_groupBorder: "Анимированная «живая» рамка активной группы.",
        fx_scrollbar: "Акцентный цвет ползунка скроллбара.",
        fx_activityBg: "Фоновая картинка за вертикальным актив-баром.",
        fx_tabAccent: "Акцентная полоска под активной вкладкой.",
        fx_rounded: "Скруглённые углы у меню, подсказок и тостов.",
        fx_cursorGlow: "Свечение вокруг курсора в редакторе.",
        fx_selection: "Градиентная заливка выделенного текста.",
        fx_titlebar: "Градиентная подсветка заголовка окна.",
        fx_splash: "Картинка-заставка в пустой группе редактора.",
        fx_clock: "Часы с датой в статусбаре.",
        fx_particles: "Летящие частицы поверх интерфейса.",
        fx_pomodoro: "Таймер-помидор в статусбаре (клик — старт/пауза, Alt+клик — сброс).",
        term_font: "Шрифт терминала. В списке — совместимые по ширине Nerd-шрифты, чтобы не разъезжались колонки и сохранялись иконки oh-my-posh.",
        term_ligatures: "Слитное начертание пар символов (->, =>, != и т.п.).",
        term_cursorGlow: "Ореол-свечение вокруг курсора терминала.",
        term_glow: "Сила тени под текстом терминала для читаемости поверх фоновой картинки.",
        term_weight: "Толщина шрифта терминала. Жирный текст остаётся заметно жирнее базового.",
        term_cursorColor: "Цвет курсора терминала.",
        term_selColor: "Цвет выделения текста в терминале.",
        term_cursorSize: "Ширина курсора терминала: 0 — скрыть курсор, 1 — обычная, больше — шире. Заметнее всего на курсоре-линии (cursorStyle: line).",
        term_cursorHeight: "Высота курсора терминала: 1 — обычная, меньше — короче, больше — выше ячейки."
    };

    // ===== Всплывающая подсказка «?» =====
    var _infoPop = null, _infoAnchor = null;
    function hideInfo() {
        if (_infoPop) { _infoPop.remove(); _infoPop = null; _infoAnchor = null; document.removeEventListener("mousedown", _infoOutside, true); }
    }
    function _infoOutside(e) { if (_infoPop && e.target !== _infoAnchor && !_infoPop.contains(e.target)) hideInfo(); }
    function showInfo(anchor, text) {
        if (_infoAnchor === anchor) { hideInfo(); return; } // повторный клик — закрыть
        hideInfo();
        var pop = el("div",
            "position:fixed; z-index:100003; max-width:250px; padding:8px 11px; border-radius:9px;" +
            "background:rgba(17,17,27,0.99); color:#cdd6f4; font-size:11px; line-height:1.45;" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.45); box-shadow:0 10px 30px rgba(0,0,0,0.6);", text);
        document.body.appendChild(pop);
        var r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
        var left = Math.min(r.left, window.innerWidth - pr.width - 8);
        var top = r.bottom + 6;
        if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 6;
        pop.style.left = Math.max(8, left) + "px";
        pop.style.top = Math.max(8, top) + "px";
        _infoPop = pop; _infoAnchor = anchor;
        setTimeout(function () { document.addEventListener("mousedown", _infoOutside, true); }, 0);
    }
    function infoDot(text) {
        if (!text) return null;
        var d = el("span",
            "flex:0 0 auto; width:15px; height:15px; line-height:15px; text-align:center; border-radius:50%;" +
            "font-size:10px; font-weight:700; cursor:help; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16);" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); user-select:none;", "?");
        d.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); showInfo(d, text); });
        keyActivate(d, "Пояснение");
        return d;
    }

    // ===== Сворачиваемая секция =====
    function collapsible(parent, title, info) {
        var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
        var wrap = el("div", "margin-top:8px;");
        var head = el("div", "display:flex; align-items:center; gap:7px; padding:5px 7px; cursor:pointer; border-radius:7px; background:rgba(var(--mlbg-accent-rgb),0.08);");
        var chev = el("span", "flex:0 0 auto; width:10px; text-align:center; color:var(--mlbg-accent); font-size:9px; transition:transform 0.15s;", "▶");
        chev.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
        head.appendChild(chev);
        head.appendChild(el("div", "flex:1 1 auto; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:#bac2de;", title));
        var idot = infoDot(info); if (idot) head.appendChild(idot);
        var body = el("div", "padding:6px 3px 2px;");
        body.style.display = collapsed ? "none" : "block";
        head.addEventListener("mouseenter", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
        head.addEventListener("mouseleave", function () { head.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
        head.addEventListener("click", function () {
            var show = body.style.display === "none";
            body.style.display = show ? "block" : "none";
            chev.style.transform = show ? "rotate(90deg)" : "rotate(0deg)";
            head.setAttribute("aria-expanded", show ? "true" : "false");
            if (!cfg.ui.collapsed) cfg.ui.collapsed = {};
            cfg.ui.collapsed[title] = !show; saveCfg();
        });
        keyActivate(head, title);
        head.setAttribute("aria-expanded", collapsed ? "false" : "true");
        wrap.appendChild(head); wrap.appendChild(body);
        parent.appendChild(wrap);
        return body;
    }

    // ===== Экспорт / импорт настроек =====
    function toast(msg, ok) {
        var t = el("div",
            "position:fixed; bottom:44px; right:16px; z-index:100004; padding:9px 13px; border-radius:9px;" +
            "font-weight:600; font-family:var(--vscode-font-family,sans-serif); box-shadow:0 8px 24px rgba(0,0,0,0.5);", msg);
        t.style.background = ok === false ? "rgba(243,139,168,0.96)" : "rgba(166,227,161,0.96)";
        t.style.color = "#181825";
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 3200);
    }
    function copyText(s) {
        try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s); return true; } } catch (e) {}
        try {
            var ta = document.createElement("textarea"); ta.value = s; ta.style.position = "fixed"; ta.style.opacity = "0";
            document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok;
        } catch (e) { return false; }
    }
    function exportCfg() {
        var json = JSON.stringify(cfg, null, 2);
        var saved = false;
        try {
            var blob = new Blob([json], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a"); a.href = url; a.download = "moonlight-bg-config.json";
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            saved = true;
        } catch (e) {}
        var copied = copyText(json);
        toast(saved && copied ? "Экспорт: файл сохранён + в буфере обмена"
            : saved ? "Экспорт: файл сохранён" : copied ? "Экспорт: скопировано в буфер" : "Не удалось выгрузить", (saved || copied));
    }
    function importCfg() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
        inp.addEventListener("change", function () {
            var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
            // Конфиг весит килобайты — отсекаем заведомо чужие/огромные файлы до чтения в память.
            if (f.size > 256 * 1024) { toast("Файл слишком большой (>256 КБ)", false); inp.remove(); return; }
            var rd = new FileReader();
            rd.onload = function () {
                try {
                    var parsed = safeParse(String(rd.result));
                    cfg = mergeCfg(parsed); // mergeCfg санитизирует всё содержимое
                    sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                    apply(); refreshPanel();
                    toast("Настройки импортированы");
                } catch (e) { toast("Ошибка: файл не читается как JSON", false); }
                inp.remove();
            };
            rd.onerror = function () { toast("Не удалось прочитать файл", false); inp.remove(); };
            rd.readAsText(f);
        });
        document.body.appendChild(inp); inp.click();
    }
    function makeIoBtn(text) {
        var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", text);
        b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
        b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
        keyActivate(b, text);
        return b;
    }

    // ===================== src/ui/panel.js =====================
    // ===== Панель настроек =====
    // Централизованное закрытие: снимает документные слушатели (Esc/клик-мимо), прячет «?»,
    // удаляет саму панель. panelCleanup хранит отписку слушателей текущей панели.
    var panelCleanup = null, panelPrevFocus = null;
    function closePanel() {
        hideInfo();
        if (panelCleanup) { try { panelCleanup(); } catch (e) {} panelCleanup = null; }
        var ex = document.getElementById(PANEL_ID); if (ex) ex.remove();
        // Вернуть фокус туда, откуда открыли панель (обычно кнопка BG) — для клавиатуры.
        try { if (panelPrevFocus && panelPrevFocus.focus && document.contains(panelPrevFocus)) panelPrevFocus.focus(); } catch (e) {}
        panelPrevFocus = null;
    }
    // Видимые фокусируемые элементы панели (для стартового фокуса и ловушки Tab).
    var FOCUS_SEL = 'a[href], button, input, select, textarea, [tabindex], [role="button"]';
    function panelFocusables(p) {
        var list = [];
        try {
            var all = p.querySelectorAll(FOCUS_SEL);
            for (var i = 0; i < all.length; i++) {
                var n = all[i];
                if (n.getAttribute("tabindex") === "-1") continue;
                if (n.disabled) continue;
                if (n.offsetParent === null && n !== p) continue; // скрыт (свёрнутая секция)
                list.push(n);
            }
        } catch (e) {}
        return list;
    }
    function togglePanel(ev) {
        ev.stopPropagation();
        if (document.getElementById(PANEL_ID)) { closePanel(); return; }

        panelPrevFocus = document.activeElement; // куда вернуть фокус при закрытии
        var p = el("div", null);
        p.id = PANEL_ID;
        p.setAttribute("role", "dialog");
        p.setAttribute("aria-modal", "true");
        p.setAttribute("aria-label", "Фон и дизайн — настройки");
        p.tabIndex = -1; // чтобы можно было сфокусировать сам диалог при открытии
        p.style.cssText =
            "position:fixed; z-index:100000; width:380px; max-height:82vh; overflow-y:auto; overflow-x:hidden;" +
            "background:rgba(24,24,37,0.98); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.35); border-radius:12px; padding:10px 13px 13px;" +
            "box-shadow:0 14px 40px rgba(0,0,0,0.6); font-size:12px; line-height:1.35; color:#cdd6f4;" +
            "font-family:var(--vscode-font-family, sans-serif);";
        p.addEventListener("click", function (e) { e.stopPropagation(); });

        // Заголовок = ручка перетаскивания
        var head = el("div", "display:flex; align-items:center; justify-content:space-between; cursor:move; user-select:none; padding:2px 2px 7px;");
        head.appendChild(el("div", "font-weight:700; font-size:13px; letter-spacing:0.3px;", "⠿  Фон и дизайн"));
        var hr = el("div", "display:flex; align-items:center; gap:5px;");
        var infoAll = infoDot("Перетаскивай окно за заголовок. Секции сворачиваются кликом по названию. У настроек «?» — клик показывает пояснение. Положение и свёрнутость запоминаются.");
        if (infoAll) hr.appendChild(infoAll);
        var close = el("div", "flex:0 0 auto; width:20px; height:20px; line-height:18px; text-align:center; border-radius:6px; cursor:pointer; color:#a6adc8;", "×");
        close.addEventListener("mouseenter", function () { close.style.background = "rgba(var(--mlbg-accent-rgb),0.2)"; });
        close.addEventListener("mouseleave", function () { close.style.background = "transparent"; });
        close.addEventListener("click", function (e) { e.stopPropagation(); closePanel(); });
        keyActivate(close, "Закрыть");
        hr.appendChild(close);
        head.appendChild(hr);
        p.appendChild(head);

        // Перетаскивание за заголовок (в пределах окна)
        var drag = null;
        function onMove(e) {
            if (!drag) return;
            var pw = p.offsetWidth, ph = p.offsetHeight;
            var x = Math.max(0, Math.min(window.innerWidth - pw, e.clientX - drag.dx));
            var y = Math.max(0, Math.min(window.innerHeight - ph, e.clientY - drag.dy));
            p.style.left = x + "px"; p.style.top = y + "px";
        }
        function onUp() {
            if (!drag) return;
            drag = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            var r = p.getBoundingClientRect();
            cfg.ui.posX = Math.round(r.left); cfg.ui.posY = Math.round(r.top); saveCfg();
        }
        head.addEventListener("mousedown", function (e) {
            if (e.button !== 0 || close.contains(e.target) || (infoAll && infoAll.contains(e.target))) return;
            hideInfo();
            var r = p.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            p.style.left = r.left + "px"; p.style.top = r.top + "px";
            p.style.right = "auto"; p.style.bottom = "auto";
            e.preventDefault();
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });

        // Набор (превью-чипы)
        var secSet = collapsible(p, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске.");
        var chips = el("div", "display:flex; flex-wrap:wrap; gap:6px; align-items:center;");
        for (var i = 0; i < SETS.length; i++) chips.appendChild(makeChip(String(i), String(i)));
        chips.appendChild(makeChip("random", "случайно"));
        secSet.appendChild(chips);

        // Слайдшоу
        var secSlide = collapsible(p, "Слайдшоу", "Автоматическая смена набора по кругу через заданный интервал.");
        secSlide.appendChild(makeSlideToggle());
        secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min));

        // Авто-набор по времени суток
        var secTime = collapsible(p, "По времени суток", "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
        secTime.appendChild(makeAutoTimeToggle());
        secTime.appendChild(makeSetPicker("day", "Дневной"));
        secTime.appendChild(makeSetPicker("night", "Ночной"));

        // Яркость набора
        var secOp = collapsible(p, "Яркость набора", "Насколько ярко проступают фоновые картинки в каждой зоне.");
        [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель"]].forEach(function (o) { secOp.appendChild(makeOpSlider(o[0], o[1])); });
        secOp.appendChild(makeAutoDim());

        // Картинка: акцентный цвет + фильтры фоновой картинки по зонам
        var secImg = collapsible(p, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
        secImg.appendChild(makeAccentColor());
        secImg.appendChild(makeImgFilters());

        // Сила эффектов
        var secFxp = collapsible(p, "Сила эффектов", "Числовые параметры эффектов из списка ниже.");
        PARAMS.forEach(function (d) { secFxp.appendChild(makeParamSlider(d)); });

        // Эффекты (2 колонки)
        var secFx = collapsible(p, "Эффекты", "Включение/выключение визуальных эффектов. Наведи на пункт — всплывёт пояснение.");
        var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;");
        FX_LIST.forEach(function (o) { grid.appendChild(makeCheck(o[0], o[1])); });
        secFx.appendChild(grid);

        // Терминал
        var secTerm = collapsible(p, "Терминал", "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение.");
        secTerm.appendChild(makeTermSelect());
        var tgrid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;");
        tgrid.appendChild(makeTermCheck("ligatures", "Лигатуры"));
        tgrid.appendChild(makeTermCheck("cursorGlow", "Свеч. курсора"));
        secTerm.appendChild(tgrid);
        secTerm.appendChild(makeTermSlider("glow", "Свечение", 0, 6, 0.5, 1));
        secTerm.appendChild(makeTermSlider("weight", "Жирность", 400, 800, 100, 0));
        secTerm.appendChild(makeTermSlider("cursorSize", "Кур. шир.", 0, 2.5, 0.1, 1));
        secTerm.appendChild(makeTermSlider("cursorHeight", "Кур. выс.", 0, 2.5, 0.1, 1));
        secTerm.appendChild(makeTermColor("cursorColor", "Курсор"));
        secTerm.appendChild(makeTermColor("selColor", "Выделение"));

        // экспорт / импорт
        var io = el("div", "display:flex; gap:8px; margin-top:12px;");
        var expB = makeIoBtn("⬇ Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
        var impB = makeIoBtn("⬆ Импорт"); impB.addEventListener("click", function () { importCfg(); });
        io.appendChild(expB); io.appendChild(impB);
        p.appendChild(io);

        // сброс
        var reset = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", "Сбросить к дефолту");
        reset.addEventListener("mouseenter", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.26)"; });
        reset.addEventListener("mouseleave", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
        reset.addEventListener("click", function () {
            var keepMode = cfg.mode, keepUi = cfg.ui; // сброс дизайна, но не положения/свёрнутости панели
            cfg = clone(DEFAULTS); cfg.mode = keepMode; cfg.ui = keepUi;
            apply(); refreshPanel();
        });
        keyActivate(reset, "Сбросить к дефолту");
        p.appendChild(reset);

        document.body.appendChild(p);

        // Esc и клик мимо панели — закрыть. onOutside вешаем через setTimeout,
        // чтобы клик, которым панель открыли, её же не закрыл.
        function onKey(e) {
            if (e.key === "Escape") { e.stopPropagation(); closePanel(); return; }
            // Ловушка фокуса: Tab не выпускает фокус за пределы диалога (заворачиваем по кругу).
            if (e.key === "Tab") {
                var f = panelFocusables(p); if (!f.length) return;
                var first = f[0], last = f[f.length - 1], act = document.activeElement;
                if (e.shiftKey && (act === first || act === p)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
            }
        }
        function onOutside(e) {
            if (p.contains(e.target)) return;
            var btn = document.getElementById(SB_ID);
            if (btn && btn.contains(e.target)) return; // клик по кнопке BG обработает togglePanel
            closePanel();
        }
        document.addEventListener("keydown", onKey, true);
        setTimeout(function () { document.addEventListener("mousedown", onOutside, true); }, 0);
        panelCleanup = function () {
            document.removeEventListener("keydown", onKey, true);
            document.removeEventListener("mousedown", onOutside, true);
        };

        // Позиционирование: запомненное (перетаскивание) или у кнопки BG
        if (typeof cfg.ui.posX === "number" && typeof cfg.ui.posY === "number") {
            p.style.left = Math.max(0, Math.min(window.innerWidth - p.offsetWidth, cfg.ui.posX)) + "px";
            p.style.top = Math.max(0, Math.min(window.innerHeight - p.offsetHeight, cfg.ui.posY)) + "px";
        } else {
            var item = document.getElementById(SB_ID);
            if (item) {
                var r = item.getBoundingClientRect();
                p.style.bottom = (window.innerHeight - r.top + 6) + "px";
                p.style.right = Math.max(6, window.innerWidth - r.right) + "px";
            } else { p.style.bottom = "26px"; p.style.right = "8px"; }
        }

        // Стартовый фокус: сам диалог (screen reader объявит role="dialog"), дальше Tab ходит
        // внутри по ловушке. Focus здесь, а не в момент создания, чтобы уже был в DOM.
        try { p.focus(); } catch (e) {}
    }

    function refreshPanel() {
        if (document.getElementById(PANEL_ID)) { closePanel(); togglePanel({ stopPropagation: function () {} }); }
    }

    // ===================== src/widgets/extras.js =====================
    // ===== Виджеты статусбара: часы, помидор, частицы =====
    function statusRight() { return document.querySelector(".statusbar .right-items") || document.querySelector(".right-items"); }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function ensureClock() {
        var right = statusRight(); if (!right) return;
        var c = document.getElementById("mlbg-clock");
        if (cfg.fx.clock) {
            if (!c) {
                c = document.createElement("div"); c.id = "mlbg-clock"; c.className = "statusbar-item right"; c.title = "Часы";
                var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; c.appendChild(a);
                right.insertBefore(c, right.firstChild); tickClock();
            }
        } else if (c) { c.remove(); }
    }
    function tickClock() {
        var c = document.getElementById("mlbg-clock"); if (!c) return;
        var a = c.querySelector("a"); if (!a) return;
        var d = new Date(), days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
        a.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "  " + days[d.getDay()] + " " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
    }

    var pomo = { running: false, remaining: null };
    function pomoDur() { return Math.round((cfg.fxp.pomoMin || 25) * 60); }
    function ensurePomodoro() {
        var right = statusRight(); if (!right) return;
        var e0 = document.getElementById("mlbg-pomo");
        if (cfg.fx.pomodoro) {
            if (!e0) {
                e0 = document.createElement("div"); e0.id = "mlbg-pomo"; e0.className = "statusbar-item right";
                e0.title = "Помидор: клик — старт/пауза, Alt+клик — сброс";
                var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; e0.appendChild(a);
                e0.addEventListener("click", function (ev) {
                    if (ev.altKey) { pomo.running = false; pomo.remaining = pomoDur(); }
                    else { if (pomo.remaining == null) pomo.remaining = pomoDur(); pomo.running = !pomo.running; }
                    paintPomo();
                });
                right.insertBefore(e0, right.firstChild);
            }
            if (pomo.remaining == null) pomo.remaining = pomoDur();
            paintPomo();
        } else if (e0) { e0.remove(); }
    }
    function paintPomo() {
        var e0 = document.getElementById("mlbg-pomo"); if (!e0) return;
        var a = e0.querySelector("a"); if (!a) return;
        var r = pomo.remaining != null ? pomo.remaining : pomoDur();
        a.textContent = (pomo.running ? "" : "|| ") + pad2(Math.floor(r / 60)) + ":" + pad2(r % 60);
        e0.style.background = pomo.running ? "rgba(var(--mlbg-accent-rgb),0.22)" : "transparent";
    }
    function tickPomo() {
        if (!cfg.fx.pomodoro || !pomo.running) return;
        if (pomo.remaining == null) pomo.remaining = pomoDur();
        pomo.remaining--;
        if (pomo.remaining <= 0) { pomo.running = false; pomo.remaining = pomoDur(); pomoDone(); }
        paintPomo();
    }
    function pomoDone() {
        try {
            var t = document.createElement("div");
            t.textContent = "Помидор готов — перерыв!";
            t.style.cssText = "position:fixed; bottom:42px; right:16px; z-index:100001; background:rgba(var(--mlbg-accent-rgb),0.96); color:#181825; font-weight:700; padding:10px 14px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:var(--vscode-font-family,sans-serif);";
            document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
        } catch (e) {}
        try {
            var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
            var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.06;
            o.start(); setTimeout(function () { o.stop(); ctx.close(); }, 260);
        } catch (e) {}
    }

    var part = { canvas: null, ctx: null, raf: 0, list: [] };
    // Кол-во частиц: 0 — легитимное значение («частиц нет»), поэтому НЕ используем
    // "partCount || 40" (0 — falsy и молча превращался бы в 40). Откат к 40 только
    // если значение вообще не число (сломанный конфиг).
    function partCount() {
        var n = cfg.fxp.partCount;
        return typeof n === "number" && isFinite(n) ? Math.round(n) : 40;
    }
    function resizeParticles() { if (part.canvas) { part.canvas.width = window.innerWidth; part.canvas.height = window.innerHeight; } }
    function newPart(anyY) {
        var W = window.innerWidth, H = window.innerHeight;
        // ac — «частица акцентного цвета?». Сам цвет НЕ вшиваем в частицу: он берётся
        // при отрисовке (см. loopParticles), поэтому смена акцента перекрашивает уже
        // летящие частицы вживую, без пересоздания.
        return { x: Math.random() * W, y: anyY ? Math.random() * H : H + 8, r: 0.6 + Math.random() * 1.8, sp: 0.12 + Math.random() * 0.45, dr: (Math.random() - 0.5) * 0.3, a: 0.15 + Math.random() * 0.45, ac: Math.random() < 0.5 };
    }
    function initParticles() {
        var n = partCount(); part.list = [];
        for (var i = 0; i < n; i++) part.list.push(newPart(true));
    }
    // системная настройка «уменьшить движение» — гасим частицы (и CSS-анимации, см. css.js)
    function reduceMotion() {
        try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
    }
    function loopParticles() {
        if (!part.canvas || !part.ctx) { part.raf = 0; return; }
        if (document.hidden) { part.raf = 0; return; } // окно скрыто/свёрнуто — стоп до возврата (экономия CPU/батареи)
        var ctx = part.ctx, W = part.canvas.width, H = part.canvas.height, i, p;
        var acc = accentRGB(); // считаем акцент один раз за кадр, а не на каждую частицу
        ctx.clearRect(0, 0, W, H);
        for (i = 0; i < part.list.length; i++) {
            p = part.list[i]; p.y -= p.sp; p.x += p.dr;
            if (p.y < -10) { part.list[i] = newPart(false); continue; }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = "rgba(" + (p.ac ? acc : "255,255,255") + "," + p.a + ")"; ctx.fill();
        }
        part.raf = requestAnimationFrame(loopParticles);
    }
    function ensureParticles() {
        // Частиц нет, если эффект выключен, включён режим «уменьшить движение» ИЛИ
        // счётчик = 0. В последнем случае раньше висел пустой canvas с работающим rAF
        // (loopParticles каждый кадр чистил пустой холст) — теперь холст убирается.
        if (cfg.fx.particles && !reduceMotion() && partCount() > 0) {
            if (!part.canvas || !document.body.contains(part.canvas)) {
                var cv = document.createElement("canvas"); cv.id = "mlbg-particles";
                cv.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:5; opacity:0.5;";
                document.body.appendChild(cv);
                part.canvas = cv; part.ctx = cv.getContext("2d");
                resizeParticles(); initParticles();
            }
            if (part.list.length !== partCount()) initParticles();
            if (!part.raf && !document.hidden) loopParticles(); // (пере)запуск, если стоим и окно видно
        } else {
            if (part.raf) { cancelAnimationFrame(part.raf); part.raf = 0; }
            if (part.canvas) { part.canvas.remove(); part.canvas = null; part.ctx = null; }
        }
    }

    // ===== Слайдшоу: авто-смена набора по таймеру =====
    var slide = { last: Date.now() };
    function slideReset() { slide.last = Date.now(); preloadNext(); } // отсчёт с нуля при вкл/смене интервала
    // Предзагрузка картинок СЛЕДУЮЩЕГО по кругу набора: браузер держит их в кэше, поэтому
    // при смене fade-in показывает готовую картинку без «моргания». Кэш урлов — чтобы не
    // плодить Image() каждый раз. В режиме «случайно» следующий индекс неизвестен заранее,
    // поэтому предгружаем все наборы по одному разу (их немного).
    var _preloaded = {};
    function preloadOne(rel) {
        var u = IMG + rel; if (_preloaded[u]) return; _preloaded[u] = true;
        try { var im = new Image(); im.src = u; } catch (e) {}
    }
    function preloadNext() {
        if (!cfg.slideshow || !cfg.slideshow.on || SETS.length < 2) return;
        var targets = cfg.mode === "random"
            ? SETS
            : [SETS[(activeIndex() + 1) % SETS.length]];
        targets.forEach(function (s) { preloadOne(s.editor); preloadOne(s.sidebar); preloadOne(s.panel); });
    }
    // ===== Авто-набор по времени суток =====
    // Днём (8:00–20:00) — cfg.autoTime.day, ночью — cfg.autoTime.night. Переиспользует
    // applyFade (как слайдшоу). Не трогает режим «случайно». Проверяется каждую секунду,
    // но переключает только при реальной смене нужного набора (idempotent).
    function isDaytime() { var h = new Date().getHours(); return h >= 8 && h < 20; }
    function timeTick() {
        if (!cfg.autoTime || !cfg.autoTime.on || SETS.length < 1) return;
        if (cfg.mode === "random") return; // ручной «случайно» не перебиваем
        var want = isDaytime() ? cfg.autoTime.day : cfg.autoTime.night;
        if (typeof want !== "number" || want < 0 || want >= SETS.length) return;
        var ws = String(want);
        if (cfg.mode === ws) return; // уже нужный набор
        cfg.mode = ws; applyFade();
        if (document.getElementById(PANEL_ID)) refreshPanel();
    }

    function slideTick() {
        // Авто-набор по времени имеет приоритет над слайдшоу: чтобы они не «дрались»
        // за cfg.mode, при включённом autoTime слайдшоу простаивает.
        if (cfg.autoTime && cfg.autoTime.on) { slide.last = Date.now(); return; }
        if (!cfg.slideshow || !cfg.slideshow.on || SETS.length < 2) { slide.last = Date.now(); return; }
        var period = Math.max(1, cfg.slideshow.min) * 60000;
        if (Date.now() - slide.last < period) return;
        slide.last = Date.now();
        // Не терять режим «случайно»: в нём двигаем сессионный индекс (pickRandom избегает
        // повтора), а не превращаем mode в фиксированный. Иначе слайдшоу молча гасило random.
        if (cfg.mode === "random") sessionRandomIndex = pickRandom();
        else cfg.mode = String((activeIndex() + 1) % SETS.length); // следующий набор по кругу
        applyFade();
        preloadNext();                                          // подготовить следующий заранее
        if (document.getElementById(PANEL_ID)) refreshPanel(); // подсветить активный чип в открытой панели
    }

    function syncWidgets() {
        try { ensureClock(); } catch (e) {}
        try { ensurePomodoro(); } catch (e) {}
        try { ensureParticles(); } catch (e) {}
    }

    // ===================== src/boot.js =====================
    // ===== Старт + самолечение =====
    // Самолечение (интервал + observer) регистрируем ДО виджетов и всё оборачиваем в try,
    // чтобы ошибка любого виджета не убивала возврат кнопки BG после перестройки DOM.
    function heal() {
        try { if (!_themeWatched) _themeWatched = watchTheme(); } catch (e) {}
        try { ensureStyle(); } catch (e) {}
        try { ensureStatusBar(); } catch (e) {}
        syncWidgets();
    }
    // Смена темы VS Code (класс vs/vs-dark на .monaco-workbench) не меняет ревизию стиля,
    // поэтому сама по себе не пересобрала бы CSS. Наблюдаем за классом воркбенча и при
    // смене светлая/тёмная пересобираем стиль (поверхности стекла/титлбара/скрима зависят
    // от темы). Воркбенча может ещё не быть при старте — тогда heal попробует снова.
    var _themeWatched = false, _lastThemeKind = null;
    function watchTheme() {
        var wb = document.querySelector(".monaco-workbench");
        if (!wb) return false;
        _lastThemeKind = themeKind();
        try {
            new MutationObserver(function () {
                var k = themeKind();
                if (k !== _lastThemeKind) { _lastThemeKind = k; bumpStyle(); ensureStyle(); }
            }).observe(wb, { attributes: true, attributeFilter: ["class"] });
        } catch (e) { return false; }
        return true;
    }
    // Один секундный тикер: каждую секунду — лёгкие idempotent-проверки и обновления по времени,
    // а полное самолечение (пересборка CSS + виджеты) — раз в 3 секунды. Раньше это были два
    // отдельных setInterval (1с и 3с) с дублирующимися вызовами.
    var _tick = 0;
    setInterval(function () {
        try {
            // Окно скрыто/свёрнуто/на другом мониторе — статусбар и часы никто не видит,
            // а слайдшоу считает по Date.now и само наверстает при возврате. Пропускаем
            // всю ежесекундную работу (querySelector + запись в DOM) ради CPU/батареи.
            // Частицы уже останавливаются отдельно (loopParticles видит document.hidden).
            if (document.hidden) return;
            _tick++;
            ensureStatusBar(); ensureClock(); ensurePomodoro(); // дешёвые проверки наличия
            tickClock(); tickPomo(); timeTick(); slideTick();   // обновления по времени
            if (_tick % 3 === 0) heal();                         // самолечение раз в 3с
        } catch (e) {}
    }, 1000);
    window.addEventListener("resize", function () { try { resizeParticles(); } catch (e) {} });
    // Возврат окна из скрытого/свёрнутого состояния — сразу лечим всё (стиль, статусбар,
    // виджеты, частицы) и обновляем время/слайдшоу, не дожидаясь следующего тика.
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) { try { heal(); tickClock(); tickPomo(); timeTick(); slideTick(); } catch (e) {} }
    });
    // Смена системной «уменьшить движение» — пересобираем стиль и виджеты (частицы вкл/выкл).
    try {
        var _rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
        if (_rm && _rm.addEventListener) _rm.addEventListener("change", heal);
    } catch (e) {}
    // Коалесцируем всплески мутаций DOM в один heal за кадр: если VS Code за раз
    // перестроит несколько узлов, не дёргаем тяжёлый heal на каждый — только раз.
    // (rAF не тикает, пока окно скрыто, — там heal и не нужен.)
    var _healRaf = 0;
    function healSoon() {
        if (_healRaf) return;
        _healRaf = requestAnimationFrame(function () { _healRaf = 0; heal(); });
    }
    try {
        new MutationObserver(healSoon).observe(document.documentElement, { childList: true });
    } catch (e) {}
    heal();

    console.log("[MoonLight custom-bg] v11 installed (light theme + auto-by-time + a11y), sets:", SETS.length, "mode:", cfg.mode, "term:", cfg.term.font, "theme:", themeKind());

})();
