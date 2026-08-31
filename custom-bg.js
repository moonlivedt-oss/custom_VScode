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
    // ВАЖНО: у be5invis.vscode-custom-css скрипт часто внедряется инлайном, и тогда
    // document.currentScript пуст. Личный абсолютный путь сюда НЕ хардкодим: он утёк бы в
    // публичный репозиторий (структура ФС автора) и всё равно неверен на чужой машине.
    // Пусто -> при инлайн-внедрении укажи путь ОДИН раз в панели («Папка плагина», cfg.imgBase):
    // он сохранится в localStorage конкретной машины, а не в коде.
    var IMG_FALLBACK = "";
    var IMG = (function () {
        try {
            var src = (document.currentScript && document.currentScript.src) || "";
            var i = src.lastIndexOf("/");
            if (i >= 0) return src.slice(0, i + 1); // .../vscode-bg/custom-bg.js -> .../vscode-bg/
        } catch (e) {}
        return IMG_FALLBACK; // адрес скрипта неизвестен (инлайн-внедрение) — берём заданный путь
    })();

    // Эффективная база для ОТНОСИТЕЛЬНЫХ путей картинок. Приоритет — путь, заданный
    // пользователем в панели (cfg.imgBase): позволяет перенести папку плагина, не правя
    // исходник и не пересобирая. Пусто — берём авто-определённый IMG. cfg к моменту вызова
    // (рантайм: buildCSS/чипы) уже есть; typeof-страховка на случай ранних вызовов.
    function imgBase() {
        var b = (typeof cfg !== "undefined" && cfg && typeof cfg.imgBase === "string") ? cfg.imgBase : "";
        // Удалённая база (http(s)://…) без явного согласия — игнорируем, возвращаем авто-путь:
        // иначе чужой конфиг переключил бы загрузку ВСЕХ картинок на свой сервер.
        return (b && imgAllowed(b)) ? b : IMG;
    }

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
        { name: "Ночь падающей звезды", editor: "assets/editor/editor_11.jpg",sidebar: "assets/sidebar/sidebar_11.jpg",panel: "assets/panel/panel_11.jpg",accent: "#74c7ec" }, // 11
        // ===== Генеративные наборы (grad) — рисуются градиентом из палитры, БЕЗ картинок =====
        // У такого набора нет editor/sidebar/panel: вместо url() зоны заливаются CSS-градиентом
        // (см. gradFor в css.js). Ноль ассетов, мгновенная загрузка, работают на любой машине
        // без правки путей. Пользователь всё равно может подложить свою картинку в зону
        // (cfg.setImg[idx][zone]) — тогда она перекроет градиент. accent — акцент интерфейса.
        { name: "Аврора", grad: ["#1e1e2e", "#89b4fa", "#94e2d5"], accent: "#89b4fa" }, // 12
        { name: "Закат",  grad: ["#1e1e2e", "#f38ba8", "#fab387"], accent: "#f38ba8" }, // 13
        { name: "Неон",   grad: ["#11111b", "#cba6f7", "#f5c2e7"], accent: "#cba6f7" }, // 14
        { name: "Мох",    grad: ["#181825", "#a6e3a1", "#94e2d5"], accent: "#a6e3a1" }, // 15
        { name: "Сакура", grad: ["#1e1e2e", "#f5c2e7", "#eba0ac"], accent: "#f5c2e7" }, // 16
        { name: "Янтарь", grad: ["#1e1e2e", "#fab387", "#f9e2af"], accent: "#fab387" }  // 17
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
        imgBase: "",                                        // папка плагина для картинок; пусто — авто-определение (IMG). Переносимость без правки кода.
        allowRemoteImages: false,                           // разрешить http(s)-картинки. По умолчанию выкл: чужой конфиг не заставит редактор ходить в сеть.
        mode: "0",
        baseOp: { editor: 0.06, side: 0.30, panel: 0.11 },
        setOp: {},
        accent: "#cba6f7",                                  // глобальный акцент (запасной, если у набора нет своего)
        autoWorkspace: false,                               // фон по проекту: набор выбирается по имени открытой папки
        workspaceSets: {},                                  // закреплённые наборы по проектам: { "имя папки": "индекс" }
        ambientBranch: false,                               // тонкая полоска-индикатор ветки git (main -> красная, фича -> зелёная)
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
            groupBorderMono: false,                         // «Живой контур» одним акцентом (false — радужный перелив)
            paletteSync: false,                             // «живой контур» из палитры фоновой картинки, а не радужный
            parallax: false,                                // фон редактора чуть смещается за курсором (глубина)
            flow: false                                     // «поток»: при долгом наборе фон плавно уходит сильнее
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
        ["groupBorderMono", "Контур: 1 цвет"], ["paletteSync", "Палитра из картинки"],
        ["parallax", "Параллакс фона"], ["flow", "Поток (глубокий дим)"]
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
    // База картинок (папка плагина). Уходит в url('...') через cssUrl (кавычки/слэши/переводы
    // строк экранируются — CSS-инъекция невозможна), поэтому здесь только приводим к единому
    // виду: убираем переводы строк, ограничиваем длину, дописываем завершающий слэш. Пусто
    // (или не строка) -> "" — тогда imgBase() возьмёт авто-определённый IMG.
    function safeBase(s) {
        if (typeof s !== "string") return "";
        var b = s.trim().replace(/[\r\n]/g, "").slice(0, 512);
        if (!b) return "";
        return /\/$/.test(b) ? b : b + "/";
    }
    // ===== Безопасность источников картинок =====
    // Картинка из конфига уходит в CSS url() и в new Image().src. Если разрешить любой URL,
    // то ИМПОРТИРОВАННЫЙ или применённый чужой конфиг сможет указать http(s)-адрес — и редактор
    // молча сходит в сеть за картинкой: утечка IP, факт использования плагина, потенциальный
    // маячок-трекер. Поэтому по умолчанию пускаем только ЛОКАЛЬНЫЕ схемы; сеть — лишь когда
    // пользователь сам включил cfg.allowRemoteImages.
    var LOCAL_IMG_SCHEME = /^(?:vscode-file|vscode-resource|vscode-webview-resource|file|data):/i;
    // file://ХОСТ/share на Windows разворачивается в UNC-путь \\ХОСТ\share — а это сетевой
    // SMB-запрос (утечка факта использования, IP и NetNTLM-хеша, тот же класс, что CVE-2025-24054
    // и утечка через обои Windows Themes), НЕ «локальная картинка». Локальными считаем только
    // file:/// (пустой хост) и file://localhost|127.0.0.1/… ; любой другой хост в file:// уводит
    // в сеть так же, как http, — и должен блокироваться (imgAllowed) без явного согласия.
    var FILE_UNC_RE = /^file:\/\/(?!\/|localhost[:/]|127\.0\.0\.1[:/])[^/]/i;
    // Удалённый источник: абсолютный URL с не-локальной схемой, протокол-относительный «//host»
    // ИЛИ file:// с непустым хостом (UNC). Обратные слэши приводим к прямым — иначе
    // file:\\host\share (браузер сам нормализует \ в /) проскользнул бы мимо проверки.
    function isRemoteUrl(u) {
        if (typeof u !== "string") return false;
        var s = u.replace(/\\/g, "/");
        if (/^\/\//.test(s)) return true;                        // //host/x — тянет из сети
        if (FILE_UNC_RE.test(s)) return true;                    // file://host/… — UNC/SMB на Windows
        return /^[a-z][a-z0-9+.-]*:/i.test(s) && !LOCAL_IMG_SCHEME.test(s);
    }
    // Разрешена ли картинка к загрузке: относительные и локальные — да; удалённые — только по
    // явному согласию (cfg.allowRemoteImages). typeof-страховка: cfg может ещё не быть.
    function imgAllowed(u) {
        if (typeof u !== "string" || !u) return false;
        if (typeof cfg !== "undefined" && cfg && cfg.allowRemoteImages) return true;
        return !isRemoteUrl(u);
    }
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
    var CFG_KEY = "moonlight-bg-config", LAST_KEY = "moonlight-bg-last", BACKUP_KEY = "moonlight-bg-backup";
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
            // папка плагина для картинок: строка-URL, нормализуется safeBase (см. imgBase())
            if (typeof p.imgBase === "string") c.imgBase = safeBase(p.imgBase);
            // разрешение сетевых картинок: только булево (по умолчанию false — см. imgAllowed)
            if (typeof p.allowRemoteImages === "boolean") c.allowRemoteImages = p.allowRemoteImages;
            // фон по проекту: флаг + карта «имя папки -> индекс набора». Ключи (имена проектов)
            // и число записей ограничены, значения — только валидные индексы существующих наборов,
            // иначе подменённый конфиг мог бы раздуть объект и утечь в localStorage (как setOp/ui).
            if (typeof p.autoWorkspace === "boolean") c.autoWorkspace = p.autoWorkspace;
            if (p.workspaceSets && typeof p.workspaceSets === "object") {
                c.workspaceSets = {};
                var wc = 0;
                for (var wk in p.workspaceSets) {
                    if (!p.workspaceSets.hasOwnProperty(wk)) continue;
                    if (wc >= 64 || typeof wk !== "string" || wk.length > 120) continue;
                    if (DANGEROUS_KEYS.indexOf(wk) >= 0) continue; // имя проекта не может отравить прототип

                    var wv = p.workspaceSets[wk];
                    if (typeof wv === "string" && /^\d+$/.test(wv) && parseInt(wv, 10) < SETS.length) { c.workspaceSets[wk] = wv; wc++; }
                }
            }
            // индикатор ветки: только булево
            if (typeof p.ambientBranch === "boolean") c.ambientBranch = p.ambientBranch;
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
    // Любой ЧУЖОЙ конфиг (импорт файла, применённый пресет) принимаем с ПРИНУДИТЕЛЬНО
    // выключенными сетевыми картинками: включить их можно только вручную тумблером. Иначе
    // чужой файл сам поднимал бы allowRemoteImages=true и грузил удалённые картинки (маячок)
    // ещё до того, как пользователь это увидел. Собственный сохранённый конфиг (loadCfg)
    // проходит через mergeCfg НАПРЯМУЮ и своё согласие сохраняет.
    function mergeForeign(p) {
        var c = mergeCfg(p);
        c.allowRemoteImages = false;
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

    // ===== Резерв конфига (защита от неудачной замены) =====
    // Перед рискованным ПОЛНЫМ замещением cfg (импорт файла, сброс к дефолту, применение
    // пресета) снимаем текущий cfg в отдельный ключ. Кнопка «Восстановить» возвращает его.
    // ВАЖНО: это откат неудачного действия, а НЕ бэкап на диск — полную очистку localStorage
    // (переустановка custom-css, крупное обновление VS Code) резерв не переживёт; от этого
    // спасает только ручной экспорт в файл. Лимит длины — как у loadCfg/импорта.
    function backupCfg() { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(cfg)); } catch (e) {} }
    function hasBackup() { try { var r = localStorage.getItem(BACKUP_KEY); return !!(r && r.length <= 256 * 1024); } catch (e) { return false; } }
    function readBackup() {
        try {
            var raw = localStorage.getItem(BACKUP_KEY);
            if (raw && raw.length <= 256 * 1024) return mergeCfg(safeParse(raw)); // та же санитизация, что и импорт
        } catch (e) {}
        return null;
    }

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
    // Имя открытого проекта из заголовка окна VS Code. Заголовок обычно выглядит как
    // "<файл> — <папка> — Visual Studio Code" (разделитель — тире с пробелами, у несохранённого
    // файла спереди маркер). API папки в custom-css нет, поэтому парсим document.title:
    // срезаем хвост " — Visual Studio Code" и берём последний сегмент (имя папки-проекта).
    function workspaceName() {
        try {
            var t = (document.title || "").trim();
            if (!t) return "";
            t = t.replace(/\s*[—\-]\s*Visual Studio Code\s*$/i, "").trim();
            var parts = t.split(/\s+[—\-]\s+/); // сегменты, разделённые тире с пробелами
            var name = parts.length ? parts[parts.length - 1] : t;
            return name.replace(/[●•*]/g, "").trim().slice(0, 120); // убрать маркер несохранённого
        } catch (e) { return ""; }
    }
    // Набор, закреплённый за текущим проектом (cfg.workspaceSets[имя]), если «фон по проекту»
    // включён и запись валидна. Иначе null — тогда activeIndex идёт по обычной логике.
    function workspaceIndex() {
        if (!cfg.autoWorkspace) return null;
        var n = workspaceName();
        var v = (n && cfg.workspaceSets) ? cfg.workspaceSets[n] : null;
        if (typeof v === "string" && /^\d+$/.test(v)) {
            var i = parseInt(v, 10);
            if (i >= 0 && i < SETS.length) return i;
        }
        return null;
    }
    // previewMode — индекс набора, «примеряемого» при наведении на его чип в панели
    // (см. previewSet/previewEnd в controls.js). Пока он задан, весь UI считает активным
    // именно его — поэтому превью работает и в режиме «случайно», и при «фоне по проекту»,
    // и не портит сохранённый cfg.mode. null — обычная логика выбора набора.
    var previewMode = null;
    function activeIndex() {
        // Превью при наведении важнее всего — иначе оно не перебило бы «фон по проекту».
        if (previewMode !== null && previewMode >= 0 && previewMode < SETS.length) return previewMode;
        // «Фон по проекту» имеет приоритет над mode/слайдшоу/временем суток.
        var wi = workspaceIndex();
        if (wi !== null) return wi;
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

    // ===== Разрешение путей картинок (с учётом пользовательских переопределений) =====
    // Абсолютный URL — есть схема (file:, vscode-file:, http:, d: и т.п.) или ведущий слэш;
    // такой путь берётся как есть. Иначе путь относительный — дописываем базу IMG.
    function isAbsUrl(u) { return /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(u); }
    // Относительный путь дописываем к базе плагина (imgBase(): свой путь пользователя или IMG).
    // Абсолютный удалённый URL без согласия пользователя (imgAllowed) не пропускаем — "" отдаёт
    // пробе «битую» ссылку, и зона откатывается на акцентную подложку вместо сетевого запроса.
    function imgUrl(rel) {
        if (isAbsUrl(rel)) return imgAllowed(rel) ? rel : "";
        return imgBase() + rel;
    }
    // Путь картинки зоны набора: пользовательское переопределение (cfg.setImg[idx][zone])
    // или «родная» картинка из SETS. zone — ключ SETS: "editor" | "sidebar" | "panel".
    function setImage(idx, zone) {
        var o = cfg.setImg && cfg.setImg[idx];
        var ov = o && o[zone];
        // Свой путь используем, только если он разрешён (локальный, либо сеть явно включена);
        // заблокированный удалённый override игнорируем -> зона берёт «родную» картинку набора.
        if (typeof ov === "string" && ov && imgAllowed(ov)) return ov;
        var s = SETS[idx]; return (s && s[zone]) ? s[zone] : "";
    }
    // Готовый абсолютный URL картинки зоны (переопределение -> resolve).
    function zoneUrl(idx, zone) { return imgUrl(setImage(idx, zone)); }

    // ===================== src/fx/css.js =====================
    // ===== Проба картинок: загрузка (404) + средняя яркость (для авто-дима) =====
    // Одна загрузка на URL обслуживает и фолбэк при 404 (ok), и авто-яркость (luma).
    // Картинки лежат на vscode-file://vscode-app/… — тот же origin, что и воркбенч,
    // поэтому canvas не «портится» (getImageData не бросает security-ошибку).
    // Результат кэшируется; по готовности дёргаем пересборку стиля (bumpStyle+ensureStyle).
    // url -> { ok: bool, luma: 0..1|null, accent: "#rrggbb"|null, resolved: bool }.
    // Одна загрузка на URL обслуживает 404-фолбэк (ok), авто-яркость (luma), «акцент из
    // картинки» (accent) и health-check чипов (через onImage) — картинки больше не грузятся дважды.
    var _imgState = {};
    var _imgListeners = {}; // url -> [cb], вызываются один раз по готовности (или ошибке)
    function _fireImg(url, st) {
        var ls = _imgListeners[url]; if (!ls) return;
        _imgListeners[url] = null;
        for (var i = 0; i < ls.length; i++) { try { ls[i](st); } catch (e) {} }
    }
    function probeImage(url) {
        if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
        var st = { ok: true, luma: null, accent: null, palette: null, thumb: null, resolved: false }; // до загрузки: «ок, метрики неизвестны»
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
                    st.accent = dominantAccent(d); // доминирующий цвет -> готовый акцент
                    st.palette = dominantPalette(d); // гармоничная палитра (для «Палитры из картинки»)
                } catch (e) { st.luma = 1; st.accent = null; st.palette = null; } // canvas «испорчен»/ошибка — не димим
                // Мини-превью для чипов набора: чип 48×32 не нуждается в полноразмерном JPEG (100–250 КБ),
                // который иначе висел бы фоновым слоем и заново подтягивался на КАЖДОЙ пересборке панели.
                // Рисуем один раз из уже загруженной картинки (второй загрузки нет) в компактный data-URL.
                // Локальный origin (vscode-file) -> canvas не «испорчен»; для сетевых картинок toDataURL
                // может бросить (тогда чип покажет акцентный плейсхолдер) — оборачиваем отдельным try.
                try {
                    var tc = document.createElement("canvas"); tc.width = 96; tc.height = 64;
                    tc.getContext("2d").drawImage(im, 0, 0, 96, 64);
                    st.thumb = tc.toDataURL("image/jpeg", 0.72);
                } catch (e2) { st.thumb = null; }
                st.resolved = true; _fireImg(url, st); bumpStyle(); ensureStyle();
            };
            im.onerror = function () { st.ok = false; st.resolved = true; _fireImg(url, st); bumpStyle(); ensureStyle(); };
            im.src = url;
        } catch (e) {}
        return st;
    }
    // Подписка на готовность пробы URL: если уже загружено/сломано — колбэк сразу, иначе в очередь.
    // Используется чипами наборов (health-check) вместо собственной второй загрузки картинки.
    function onImage(url, cb) {
        var st = probeImage(url);
        if (st.resolved) { try { cb(st); } catch (e) {} return; }
        (_imgListeners[url] || (_imgListeners[url] = [])).push(cb);
    }

    // ===== Цвет из картинки (для «Акцент из картинки») =====
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
        if (d) {
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (mx === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h, s, l];
    }
    function _hue2rgb(p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    function hslToHex(h, s, l) {
        var r, g, b;
        if (!s) { r = g = b = l; }
        else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
            r = _hue2rgb(p, q, h + 1 / 3); g = _hue2rgb(p, q, h); b = _hue2rgb(p, q, h - 1 / 3);
        }
        function hx(v) { var t = Math.round(v * 255).toString(16); return t.length < 2 ? "0" + t : t; }
        return "#" + hx(r) + hx(g) + hx(b);
    }
    // Доминирующий цвет как готовый акцент: круговое среднее оттенка с весом по насыщенности^2
    // (серые пиксели почти не влияют на оттенок), затем нормировка S/L в «читаемый акцент».
    // Почти серая картинка -> берём среднее RGB и поднимаем насыщенность.
    function dominantAccent(d) {
        var n = d.length / 4; if (!n) return null;
        var sx = 0, sy = 0, sw = 0, sS = 0, sL = 0, rr = 0, gg = 0, bb = 0, i, hsl, w, ang;
        for (i = 0; i < d.length; i += 4) {
            rr += d[i]; gg += d[i + 1]; bb += d[i + 2];
            hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
            w = hsl[1] * hsl[1]; ang = hsl[0] * 2 * Math.PI;
            sx += Math.cos(ang) * w; sy += Math.sin(ang) * w; sS += hsl[1] * w; sL += hsl[2] * w; sw += w;
        }
        var H, S, L;
        if (sw < 1e-4) { var m = rgbToHsl(rr / n, gg / n, bb / n); H = m[0]; S = Math.max(0.5, m[1]); L = m[2]; }
        else { H = Math.atan2(sy, sx) / (2 * Math.PI); if (H < 0) H += 1; S = sS / sw; L = sL / sw; }
        S = Math.min(0.85, Math.max(0.55, S));
        L = Math.min(0.70, Math.max(0.55, L));
        return hslToHex(H, S, L);
    }
    // ===== Палитра из картинки («wallust для VS Code») =====
    // Гистограмма по 12 корзинам оттенка (вес — насыщенность^2, серые почти не влияют),
    // топ-корзины -> до 3 гармоничных акцентов. Нормируем S/L в «читаемый» диапазон, как
    // dominantAccent. Возвращает [] для почти серой картинки (тогда buildCSS берёт поворот
    // оттенка основного акцента). Считается один раз на загрузку картинки (в probeImage).
    function _normAccent(h, s, l) {
        s = Math.min(0.85, Math.max(0.55, s)); l = Math.min(0.70, Math.max(0.55, l));
        return hslToHex(h, s, l);
    }
    function dominantPalette(d) {
        var BINS = 12, acc = [], i;
        for (i = 0; i < BINS; i++) acc.push({ x: 0, y: 0, s: 0, w: 0, l: 0 });
        for (i = 0; i < d.length; i += 4) {
            var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]), w = hsl[1] * hsl[1];
            var b = Math.min(BINS - 1, Math.floor(hsl[0] * BINS)), a = acc[b], ang = hsl[0] * 2 * Math.PI;
            a.x += Math.cos(ang) * w; a.y += Math.sin(ang) * w; a.s += hsl[1] * w; a.l += hsl[2] * w; a.w += w;
        }
        acc.sort(function (A, B) { return B.w - A.w; });
        var out = [];
        for (i = 0; i < acc.length && out.length < 3; i++) {
            var g = acc[i]; if (g.w < 1e-4) continue;
            var H = Math.atan2(g.y, g.x) / (2 * Math.PI); if (H < 0) H += 1;
            out.push(_normAccent(H, g.s / g.w, g.l / g.w));
        }
        return out;
    }
    // hex -> "r,g,b" массив и поворот оттенка (запасные accent2/accent3, когда палитры из
    // картинки нет: почти серая картинка, набор-градиент или картинка ещё не загрузилась).
    function hexToRgbArr(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    function rotateHue(hex, dh) {
        var c = hexToRgbArr(hex), hsl = rgbToHsl(c[0], c[1], c[2]);
        var h = hsl[0] + dh; h -= Math.floor(h);
        return hslToHex(h, Math.max(0.5, hsl[1]), Math.min(0.70, Math.max(0.55, hsl[2])));
    }
    // Три акцента для эффектов: основной (getAccent) + два спутника. При включённой «Палитре
    // из картинки» и готовой пробе — из картинки; иначе повороты оттенка основного акцента.
    function accentTrio(ac, edUrl) {
        var pal = null;
        if (cfg.fx && cfg.fx.paletteSync && edUrl) { var st = probeImage(edUrl); if (st && st.palette && st.palette.length) pal = st.palette; }
        return [ac, (pal && pal[1]) || rotateHue(ac, 0.33), (pal && pal[2]) || rotateHue(ac, -0.33)];
    }
    // ===== Генеративные наборы (без картинок) =====
    // Набор с массивом grad рисуется CSS-градиентом из палитры вместо фото. Ноль ассетов,
    // грузится мгновенно, не зависит от путей (работает на любой машине). Пользовательская
    // картинка зоны (cfg.setImg) всё равно перекрывает градиент — см. isGrad.
    function isGradSet(idx) { var s = SETS[idx]; return !!(s && s.grad && s.grad.length); }
    function hasUserImg(idx, zone) { var o = cfg.setImg && cfg.setImg[idx]; return !!(o && typeof o[zone] === "string" && o[zone]); }
    function isGrad(idx, zone) { return isGradSet(idx) && !hasUserImg(idx, zone); }
    // Градиент зоны: у каждой зоны своя форма, чтобы редактор/сайдбар/панель не были
    // одинаковыми — редактор идёт по диагонали, сайдбар той же палитрой в обратном порядке
    // (тёмный край смещён к другому углу), панель — радиальный из нижнего правого угла.
    // Палитра берётся из SETS (код, не пользовательский ввод) — CSS-инъекция невозможна.
    function gradFor(idx, zone) {
        var s = SETS[idx], pal = (s && s.grad) ? s.grad : [safeColor(cfg.accent, DEFAULTS.accent)];
        if (zone === "sidebar") return "linear-gradient(160deg, " + pal.slice().reverse().join(", ") + ")";
        if (zone === "panel")   return "radial-gradient(120% 120% at 100% 100%, " + pal.join(", ") + ")";
        return "linear-gradient(135deg, " + pal.join(", ") + ")";
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

    // Стили самой кнопки «BG» и видимого фокуса — нужны всегда (в т.ч. когда фон выключен),
    // иначе панель/кнопка теряют hover и обводку фокуса. Вынесены отдельно для мастер-выключателя.
    function switcherCSS() {
        return [
            "#moonlight-bg-switcher { cursor: pointer; }",
            "#moonlight-bg-switcher:hover { background: rgba(var(--mlbg-accent-rgb),0.18); }",
            // видимый фокус для клавиатуры: кнопка BG, все div-«кнопки» панели И нативные
            // контролы (поля, ползунки, селекты, чекбоксы, цвет) — иначе с клавиатуры не видно,
            // где ты находишься. Обводка акцентом, чуть отступя, поверх любого фона панели.
            "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible,",
            "#moonlight-bg-panel input:focus-visible, #moonlight-bg-panel select:focus-visible,",
            "#moonlight-bg-panel textarea:focus-visible {",
            "  outline: 2px solid var(--mlbg-accent); outline-offset: 1px;",
            "}",
            // Скроллбар панели «Фон и дизайн»: по умолчанию Electron рисует широкий светлый
            // трек с серым ползунком — на тёмной панели он выбивается. Делаем тонкий, трек
            // прозрачный, ползунок акцентного цвета (border+background-clip дают воздух вокруг).
            // Firefox-свойства (scrollbar-*) — на случай не-Chromium движка; в VS Code работает
            // именно ::-webkit-scrollbar. Нужен всегда, даже когда фон выключен, — панель живёт.
            "#moonlight-bg-panel { scrollbar-width: thin; scrollbar-color: rgba(var(--mlbg-accent-rgb),0.45) transparent; }",
            "#moonlight-bg-panel::-webkit-scrollbar { width: 10px; }",
            "#moonlight-bg-panel::-webkit-scrollbar-track { background: transparent; }",
            "#moonlight-bg-panel::-webkit-scrollbar-thumb {",
            "  background: rgba(var(--mlbg-accent-rgb),0.35); border-radius: 8px;",
            "  border: 2px solid transparent; background-clip: padding-box;",
            "}",
            "#moonlight-bg-panel::-webkit-scrollbar-thumb:hover {",
            "  background: rgba(var(--mlbg-accent-rgb),0.6); border: 2px solid transparent; background-clip: padding-box;",
            "}"
        ].join("\n");
    }

    // ===== Сборка CSS =====
    function buildCSS() {
        // Акцент нужен и в выключенном режиме (для стилей кнопки/фокуса), считаем первым.
        var ac = safeColor(getAccent(), DEFAULTS.accent);
        var acRGB = accentRGB();
        var rootVar = ":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + acRGB + "; }";
        // Мастер-выключатель: фон и эффекты выключены — отдаём только переменную акцента и
        // стили кнопки/фокуса. Никаких фоновых картинок, стекла, фильтров — «ванильный» VS Code,
        // но кнопка BG и панель остаются рабочими, чтобы включить обратно.
        if (!cfg.enabled) return rootVar + "\n" + switcherCSS();

        var idx = activeIndex(), s = SETS[idx], fx = cfg.fx, fxp = cfg.fxp, op = getOp();
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
        // rel уже разрешён в абсолютный URL (zoneUrl учёл cfg.setImg). zone: editor|side|panel
        // здесь — ключ cfg.fit (вписывание), поэтому "side", а не "sidebar".
        function zoneBg(url, fitZone, position) {
            if (!probeImage(url).ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
            var fit = (cfg.fit && cfg.fit[fitZone] === "contain") ? "contain" : "cover";
            return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
        }
        // Фон зоны: генеративный набор -> градиент (SETS zone-ключ), иначе картинка (zoneBg).
        // zone — ключ SETS ("editor"|"sidebar"|"panel"); fitZone — ключ cfg.fit ("side" у сайдбара).
        function bgFor(zone, fitZone, position) {
            return isGrad(idx, zone) ? gradFor(idx, zone) : zoneBg(zoneUrl(idx, zone), fitZone, position);
        }
        var edUrl = zoneUrl(idx, "editor");
        var edIsGrad = isGrad(idx, "editor");
        var BG_ED = bgFor("editor", "editor", "center");
        var BG_SB = bgFor("sidebar", "side", "center bottom");
        var BG_PN = bgFor("panel", "panel", "right bottom");
        // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
        // Для градиента яркость не измерить (нет пикселей) — множитель 1.
        var edDim = (!edIsGrad && cfg.autoDim) ? lumaDimFactor(probeImage(edUrl).luma) : 1;
        // Трио акцентов для эффектов: основной + два спутника (палитра из картинки редактора
        // при включённой «Палитре из картинки», иначе повороты оттенка). ac2/ac3 — hex.
        var trio = accentTrio(ac, edIsGrad ? null : edUrl), ac2 = trio[1], ac3 = trio[2];
        var out = [];
        function add() { for (var i = 0; i < arguments.length; i++) out.push(arguments[i]); }
        var TR = "  transition: opacity 0.5s ease;";
        // Поверхность «матового стекла»: точный цвет темы через var(--vscode-*) с нужной
        // прозрачностью (color-mix), плюс запасная строка rgba() под старые движки без
        // color-mix. Порядок важен: сначала fallback, затем color-mix (если поддержан —
        // побеждает как более поздняя валидная декларация; если нет — остаётся rgba).
        // rgb — тема-зависимая запасная база "r,g,b"; a — прозрачность 0..1.
        function addSurface(cssVar, rgb, a) {
            var pct = Math.round(a * 100);
            add("  background-color: rgba(" + rgb + "," + a + ") !important;");
            add("  background-color: color-mix(in srgb, var(" + cssVar + ") " + pct + "%, transparent) !important;");
        }
        function blurLines(px) { return "  backdrop-filter: blur(" + px + "px); -webkit-backdrop-filter: blur(" + px + "px);"; }

        // Акцентный цвет (ac/acRGB уже посчитаны выше) — все эффекты ниже используют
        // var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
        add(rootVar);
        // Спутники акцента как переменные (палитра эффектов). Пока их читает «живой контур»
        // при «Палитре из картинки»; вынесены в :root для переиспользования другими эффектами.
        add(":root { --mlbg-accent2: " + ac2 + "; --mlbg-accent3: " + ac3 + "; }");

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
            // Параллакс: смещаем background-position за курсором (переменные ставит boot.js).
            // Longhand после shorthand background перекрывает его позицию. Только картинка
            // (у градиента позиции нет). cover уже с запасом перекрытия — сдвиг в ~8px не оголяет край.
            (fx.parallax && !edIsGrad ? "  background-position: calc(50% + var(--mlbg-par-x,0px)) calc(50% + var(--mlbg-par-y,0px));" : ""),
            (fx.kenburns ? "  animation: mlbg-kenburns " + fxp.kbSpeed + "s ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
            "}"
        );
        if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(" + fxp.kbScale + "); } }");
        // Приглушение фона при печати: пока на body висит класс mlbg-typing (навешивается
        // в boot.js на набор текста и снимается после паузы), опускаем прозрачность оверлея
        // редактора до ~30% от текущей. У оверлея уже есть transition:opacity — переход плавный.
        if (fx.dimOnType) add(
            "body.mlbg-typing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: " + (op.editor * switchMul * edDim * 0.3) + " !important;",
            "}"
        );
        // Приглушение фона при потере фокуса окном: класс body.mlbg-unfocused навешивается в
        // boot.js на window blur и снимается на focus. Опускаем прозрачность оверлея редактора
        // до ~35% (у оверлея уже есть transition:opacity — переход плавный).
        if (fx.dimOnBlur) add(
            "body.mlbg-unfocused .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: " + (op.editor * switchMul * edDim * 0.35) + " !important;",
            "}"
        );
        // «Поток»: при долгой непрерывной печати boot.js вешает body.mlbg-flowing — фон
        // редактора гаснет сильнее, чем при обычном dim-on-type (~15% от текущего), и плавно
        // (у оверлея есть transition:opacity). Снимается на паузе для чтения.
        if (fx.flow) add(
            "body.mlbg-flowing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: " + (op.editor * switchMul * edDim * 0.15) + " !important;",
            "}"
        );

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
        if (fx.glassTabs) {
            add(".part.editor > .content .editor-group-container > .title {");
            addSurface("--vscode-editorGroupHeader-tabsBackground", surfRGB, 0.55);
            add(blurLines(fxp.blur), "}");
        }
        if (fx.glassSide) {
            // сайдбар и панель берут СВОИ переменные фона темы (раньше делили одну константу)
            add(".part.sidebar {");
            addSurface("--vscode-sideBar-background", surfRGB, 0.60);
            add(blurLines(fxp.blur), "}");
            add(".part.panel {");
            addSurface("--vscode-panel-background", surfRGB, 0.60);
            add(blurLines(fxp.blur), "}");
        }
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
        if (fx.glassStatus) {
            add(".part.statusbar {");
            addSurface("--vscode-statusBar-background", surfRGB, 0.55);
            add(blurLines(Math.min(fxp.blur, 8)), "}");
        }
        if (fx.cursorGlow) add(
            ".monaco-editor .cursors-layer > .cursor { box-shadow: 0 0 8px 2px rgba(var(--mlbg-accent-rgb),0.85); border-radius: 1px; }"
        );
        if (fx.selection) add(
            ".monaco-editor .view-overlays .selected-text {",
            // оба стопа — акцент набора (разная прозрачность даёт глубину градиента),
            // раньше второй стоп был зашит синим и не следовал за палитрой набора
            "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.32), rgba(var(--mlbg-accent-rgb),0.16)) !important; border-radius: 2px;",
            "}"
        );
        if (fx.groupBorder) add(
            ".editor-group-container.active::before {",
            "  content:''; position:absolute; inset:0; z-index:6; pointer-events:none; padding:2px; border-radius:4px;",
            // По умолчанию — радужный перелив; groupBorderMono даёт «дыхание» одним акцентом.
            "  background:" + (fx.groupBorderMono
                ? "linear-gradient(120deg,var(--mlbg-accent),rgba(var(--mlbg-accent-rgb),0.25),var(--mlbg-accent))"
                : (fx.paletteSync
                    ? "linear-gradient(120deg,var(--mlbg-accent)," + ac2 + "," + ac3 + ",var(--mlbg-accent))"
                    : "linear-gradient(120deg,var(--mlbg-accent),#89b4fa,#a6e3a1,var(--mlbg-accent))")) + "; background-size:300% 300%;",
            "  animation: mlbg-flow 8s linear infinite;",
            "  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;",
            "  mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite:exclude;",
            "}",
            "@keyframes mlbg-flow { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }"
        );
        if (fx.titlebar) add(
            ".part.titlebar, .titlebar {",
            // подложка титлбара — цвет темы var(--vscode-titleBar-activeBackground) с запасной
            // тема-зависимой константой; поверх — акцентный градиент, гаснущий к прозрачному.
            "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.30), rgba(var(--mlbg-accent-rgb),0.14) 45%, rgba(" + surfRGB + ",0) 78%), var(--vscode-titleBar-activeBackground, " + titleSolid + ") !important;",
            "}"
        );
        if (fx.splash) add(
            ".editor-group-container.empty { position: relative; }",
            ".editor-group-container.empty::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
            // заставка = картинка редактора, всегда «contain»; градиент -> сам градиент; 404 -> акцентная подложка
            "  background: " + (edIsGrad ? gradFor(idx, "editor") : (probeImage(edUrl).ok ? cssUrl(edUrl) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)")) + "; opacity: " + (0.12 * switchMul * edDim) + ";", TR, IMGF_ED,
            "}"
        );

        add(switcherCSS());

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
    // «Живое» применение БЕЗ записи в localStorage — для непрерывных изменений во время
    // перетаскивания слайдера или выбора цвета. Раньше каждый такой кадр звал apply() ->
    // saveCfg(), то есть до ~60 синхронных записей в localStorage в секунду (джанк + износ).
    // Теперь во время движения только пересобираем CSS/виджеты, а cfg пишем один раз —
    // по событию change (отпускание ползунка / фиксация цвета), см. makeSlider/цветовые контролы.
    function applyNoSave() { bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
    var _applyLiveRaf = 0;
    function applyThrottledLive() {
        if (_applyLiveRaf) return;
        _applyLiveRaf = requestAnimationFrame(function () { _applyLiveRaf = 0; applyNoSave(); });
    }
    // Плавная смена фона: гасим оверлеи зон (switchMul=0), затем в следующем кадре
    // возвращаем (switchMul=1). У оверлеев есть transition:opacity, поэтому новый набор
    // не «прыгает», а мягко проступает. Только CSS — без saveCfg/подписей; используется
    // и сменой набора (applyFade), и предпросмотром при наведении (previewSet/previewEnd).
    // switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
    function fadeSwap() {
        switchMul = 0; bumpStyle(); ensureStyle();
        requestAnimationFrame(function () { switchMul = 1; bumpStyle(); ensureStyle(); });
    }
    function applyFade() {
        saveCfg(); updateLabel(); syncWidgets();
        fadeSwap();
    }

    // ===================== src/ui/dom.js =====================
    // ===== Базовые DOM-хелперы =====
    // Общие для всех UI-модулей: создание элемента, заголовок секции, доступность div-кнопок.

    // el(tag, css, text) — создать элемент с инлайновым стилем и текстом (оба необязательны).
    function el(tag, css, text) {
        var e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (text != null) e.textContent = text;
        return e;
    }

    // ===== Общие фрагменты инлайн-стилей контролов =====
    // Повторяются в controls.js / io.js / panel.js — вынесены сюда, чтобы правка внешнего
    // вида (отступы, цвета полей) делалась в одном месте, а не в двух десятках строк.
    var ST = {
        row: "display:flex; align-items:center; gap:8px; padding:2px 2px;",                                   // строка «метка + контрол»
        toggleRow: "display:flex; align-items:center; gap:6px; padding:3px 4px; border-radius:5px; cursor:pointer; overflow:hidden;", // строка-тумблер (с hover-подсветкой)
        range: "flex:1 1 auto; min-width:0; accent-color:var(--mlbg-accent); cursor:pointer;",                // ползунок <input type=range>
        checkbox: "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer;",                          // <input type=checkbox>
        fill: "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"                   // растягивающаяся подпись (обрезается «…»)
    };
    // Приглушённая метка контрола фиксированной ширины (слева от слайдера/поля).
    // w — ширина в px; ellipsis — обрезать длинный текст «…» (для узких меток широких секций).
    function mutedLabel(w, ellipsis) {
        return "flex:0 0 " + w + "px; color:var(--mlp-muted,#a6adc8);" + (ellipsis ? " white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" : "");
    }
    // База стиля текстового поля / селекта панели; extra дописывает частности (padding, font-size, cursor).
    function fieldStyle(extra) {
        return "flex:1 1 auto; min-width:0; background:var(--mlp-field,rgba(30,30,46,0.6)); color:var(--mlp-fg,#cdd6f4);" +
            " border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px;" + (extra || "");
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

    // ===================== src/ui/info.js =====================
    // ===== Подсказки «?»: тексты + всплывающий попап =====
    // INFO — тексты пояснений по ключам (op_*, fx_*, fxp_*, term_*, img_* и отдельные).
    // infoDot(text) строит кружок «?», клик по которому показывает попап рядом с ним.

    var INFO = {
        accent: "Акцентный цвет интерфейса (курсор, скроллбар, вкладки, рамки…). Свой для каждого набора: правка применяется к активному набору, у остальных — их цвета.",
        set_name: "Имя активного набора — показывается на кнопке BG, в тултипах и списках. Пустое поле возвращает исходное имя набора.",
        presets: "Сохранить весь текущий вид (набор, яркость, эффекты, терминал, акцент) под именем и переключаться между сохранёнными пресетами одним кликом. Хранятся отдельно от экспорта/импорта.",
        autoDim: "Автоматически занижает яркость фоновой картинки редактора, если она светлая, чтобы код оставался читаемым. Не меняет саму настройку яркости.",
        img_fit: "Как вписывать фоновую картинку в зону: «Заполнить» (cover) — обрезая по краям; «Целиком» (contain) — вся картинка, могут быть поля. Для портретных/«тушь на белом» удобнее contain.",
        img_path: "Своя картинка для выбранной зоны активного набора вместо стандартной. Укажи путь file:///… (на Windows слэши прямые, буква диска в нижнем регистре). Пусто — вернётся картинка набора. В подсказке поля показан текущий путь по умолчанию.",
        workspace_on: "Фон подбирается по открытому проекту (имени папки в заголовке окна). Включи и выбери набор — он закрепится за этим проектом; в другом проекте выбери свой. Имеет приоритет над слайдшоу и авто-набором по времени. Требует, чтобы в VS Code была открыта папка.",
        ambient_branch: "Тонкая полоска у верхнего края окна подсказывает текущую git-ветку: на main/master — красноватая (ты на основной ветке), на остальных — зеленоватая. Ветка читается из статусбара; если индикатора git нет, полоска не появляется.",
        allow_remote: "Разрешить фоновые картинки по http(s)-ссылкам. По умолчанию ВЫКЛ ради безопасности: тогда импортированный или чужой конфиг не сможет заставить редактор сходить в сеть за картинкой (утечка IP, факт использования плагина, возможный трекер). Включай, только если сам указываешь адрес картинки в интернете и доверяешь ему.",
        share_code: "Короткий код всего образа (набор, яркость, эффекты, терминал, палитра) — без картинок и путей. «Скопировать» кладёт код в буфер, чтобы поделиться; вставь чужой код в поле и «Применить», чтобы примерить его вид. Свои картинки/пути и закрепления по проектам не затрагиваются.",
        img_base: "Папка плагина, откуда берутся картинки наборов. Нужна, если перенёс плагин в другое место, а фон пропал (плитки набора с «!»). Укажи путь к папке с assets в виде vscode-file://vscode-app/… или file:///… (завершающий слэш добавится сам). Пусто — путь определяется автоматически; в подсказке поля показан текущий.",
        autotime_from: "С какого часа (0–23) считать «день» и включать дневной набор.",
        autotime_to: "До какого часа (0–23) длится «день». Если «до» меньше «с» — интервал считается через полночь (напр. день 20→6).",
        img_zone: "Для какой зоны настраиваются фильтры ниже. У каждой зоны свои значения. «Панель/терминал» — фон нижней панели за терминалом.",
        img_brightness: "Яркость самой фоновой картинки (не интерфейса).",
        img_saturate: "Насыщенность цветов фоновой картинки (0 — ч/б, 2 — сочно).",
        img_blur: "Размытие самой фоновой картинки, px.",
        slide_on: "Автоматически менять набор по кругу через заданный интервал.",
        slide_min: "Через сколько минут переключать набор в режиме слайдшоу.",
        autotime_on: "Автоматически переключать набор по времени суток: днём (8:00–20:00) — дневной набор, ночью — ночной. Не работает в режиме «случайно»; при включении отменяет слайдшоу.",
        enabled: "Главный выключатель: снимает весь фон и эффекты (получается обычный VS Code), но все настройки сохраняются и вернутся при повторном включении. Горячая клавиша Ctrl+Alt+0.",
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
        fx_dimOnType: "Пока печатаешь, фоновая картинка редактора плавно тускнеет для читаемости и возвращается через паузу после последней клавиши.",
        fx_dimOnBlur: "Когда окно VS Code теряет фокус (переключился в браузер/мессенджер), фоновая картинка редактора плавно тускнеет, чтобы не отвлекать; при возврате фокуса возвращается.",
        fx_groupBorderMono: "Живой контур одним акцентным цветом набора вместо радужного перелива. Действует, когда включён «Живой контур».",
        fx_paletteSync: "Радужный «живой контур» перекрашивается в палитру, извлечённую из фоновой картинки редактора (два цвета-спутника к основному акценту). Для картиночных наборов; на градиентных берётся поворот оттенка акцента.",
        fx_parallax: "Фоновая картинка редактора едва заметно смещается вслед за курсором мыши, создавая ощущение глубины. Отключается системной настройкой «уменьшить движение».",
        fx_flow: "«Поток»: чем дольше непрерывно печатаешь, тем сильнее гаснет фон редактора (глубже, чем «Тускнеть при печати»), а на паузе для чтения — возвращается. Помогает не отвлекаться в потоке.",
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
    // Кружок «?» рядом с настройкой. null, если текста нет (тогда просто ничего не добавляем).
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

    // ===================== src/ui/controls.js =====================
    // ===== Построители контролов панели =====
    // Каждая функция make* возвращает готовый DOM-контрол (слайдер / чекбокс / селект / чип),
    // привязанный к соответствующему полю cfg. Изменения применяются через apply / applyThrottled
    // (мгновенно/троттлингом) или applyFade (со сменой набора). Тексты подсказок берутся из INFO.

    // ===== Базовые фабрики контролов =====
    // Тумблеры и слайдеры панели различались только источником cfg и колбэком, а разметка/
    // стиль/hover/«?» повторялись в каждом. Свели к двум фабрикам: makeToggle и makeSlider.

    // Строка-тумблер: hover-подсветка + чекбокс + подпись + «?».
    // get() -> текущее булево; onChange(checked) -> применить изменение.
    function makeToggle(get, onChange, label, info) {
        var row = el("label", ST.toggleRow);
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", ST.checkbox); cb.type = "checkbox"; cb.checked = !!get();
        cb.addEventListener("change", function () { onChange(cb.checked); });
        row.appendChild(cb);
        row.appendChild(el("span", ST.fill, label));
        var d = infoDot(info); if (d) row.appendChild(d);
        return row;
    }

    // Слайдер: метка + ползунок + значение + «?». opts:
    //   label, min, max, step, dec (знаков после запятой), get()->число, onInput(v)->записать,
    //   info, labelW (ширина метки, 92), valW (ширина значения, 34), ellipsis (обрезать метку, true).
    // Все слайдеры пишут значение и зовут applyThrottled (коалесинг в один apply за кадр).
    // На возвращённом узле есть _refresh() — пересинхронизировать ползунок/значение с cfg
    // (нужно, когда один набор слайдеров переключается между зонами, см. makeImgFilters).
    function makeSlider(opts) {
        var labelW = opts.labelW || 92, valW = opts.valW || 34, ell = opts.ellipsis !== false;
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(labelW, ell), opts.label));
        var sl = el("input", ST.range);
        sl.type = "range"; sl.min = String(opts.min); sl.max = String(opts.max); sl.step = String(opts.step); sl.value = String(opts.get());
        var val = el("span", "flex:0 0 " + valW + "px; text-align:right; color:var(--mlp-muted,#a6adc8);", Number(opts.get()).toFixed(opts.dec));
        // input — «живое» применение без записи (коалесинг в кадр); change (отпускание ползунка)
        // — единственная запись в localStorage. Раньше saveCfg дёргался на каждый кадр перетаскивания.
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); opts.onInput(v); val.textContent = v.toFixed(opts.dec); applyThrottledLive(); });
        sl.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
        wrap.appendChild(sl); wrap.appendChild(val);
        var d = infoDot(opts.info); if (d) wrap.appendChild(d);
        wrap._refresh = function () { sl.value = String(opts.get()); val.textContent = Number(opts.get()).toFixed(opts.dec); };
        return wrap;
    }

    // ===== Предпросмотр набора при наведении =====
    // Наведение на чип «примеряет» его набор к фону и акценту, не сохраняя cfg. Работает
    // через previewMode (см. state.js): activeIndex начинает возвращать превью-набор, поэтому
    // сохранённый cfg.mode не трогается, а превью работает и в «случайно», и при «фоне по
    // проекту». Смена мягкая (fadeSwap — фон проступает плавно, не прыгает).
    //
    // Наведение дебаунсим (_previewDelay): пока курсор просто проезжает по ряду чипов, превью
    // не дёргается на каждом; оно включается, только если задержаться на чипе. previewCancel
    // снимает и отложенное, и активное превью (нужно на клике и при закрытии панели, т.к.
    // удалённый из DOM чип не всегда шлёт mouseleave — иначе превью «залипло» бы).
    var _previewTimer = 0, _previewDelay = 70;
    function previewSet(idx) {
        if (!cfg.enabled) return;                 // фон выключен — превью не видно, не дёргаем CSS
        if (previewMode === idx) return;          // уже показываем этот набор
        if (_previewTimer) clearTimeout(_previewTimer);
        _previewTimer = setTimeout(function () {
            _previewTimer = 0; previewMode = idx; fadeSwap();
        }, _previewDelay);
    }
    function previewEnd() {
        if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
        if (previewMode === null) return;
        previewMode = null; fadeSwap();
    }
    // Снять превью без плавного возврата (курсор ушёл с чипа насовсем): используется на
    // клике (фиксируем выбор — mouseleave после клика не должен ничего откатывать) и при
    // закрытии панели. applyFade/refreshPanel далее сами перерисуют фон под выбранный набор.
    function previewCancel() {
        if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
        previewMode = null;
    }

    // health-check: помечаем чип, если картинка набора не грузится. Не грузим картинки сами —
    // подписываемся на общую пробу (onImage), которую использует и генерация CSS: один Image на URL.
    function probeSet(idx, chip) {
        ["editor", "sidebar", "panel"].forEach(function (zone) {
            onImage(zoneUrl(idx, zone), function (st) {
                if (st.ok) return;
                chip.style.border = "1px solid #f38ba8";
                chip.style.boxShadow = "inset 0 0 0 1px rgba(243,139,168,0.55)";
                chip.title = "Не грузится: " + setImage(idx, zone);
                var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:1px; left:3px; color:#f38ba8; font-weight:700;", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
            });
        });
    }

    // чип набора с превью-миниатюрой (мини-триптих зон)
    function makeChip(mode, label) {
        var active = cfg.mode === mode, isSet = mode !== "random";
        var css = isSet
            ? "position:relative; width:48px; height:32px; border-radius:7px; overflow:hidden; cursor:pointer;" +
              "background-position:center; background-size:cover;" +
              "border:2px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
              (active ? "box-shadow:0 0 0 2px rgba(var(--mlbg-accent-rgb),0.35);" : "")
            : "min-width:24px; padding:4px 10px; border-radius:7px; cursor:pointer; user-select:none; text-align:center;" +
              "font-weight:" + (active ? "600" : "400") + ";" +
              "border:1px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
              "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.28)" : "transparent") + "; color:" + (active ? "#f2e6ff" : "var(--mlp-fg,#cdd6f4)") + ";";
        var c = el("div", css, isSet ? null : label);
        if (isSet) {
            var idx = parseInt(mode, 10);
            var s = SETS[idx];
            // Мини-триптих: три вертикальные полоски с превью зон (редактор / сайдбар / панель),
            // чтобы собирать наборы на глаз. Полоски — фон chip как запасной вариант (editor).
            // Генеративный набор — рисуем полоски градиентом (нет картинок и 404-проверки).
            var grad = isGradSet(idx);
            var ZK = ["editor", "sidebar", "panel"];
            // Чип 48×32 не должен держать полноразмерный JPEG фоновым слоем (100–250 КБ × зоны ×
            // наборы = мегабайты, и всё заново при каждой пересборке панели). Кладём акцентный
            // плейсхолдер, а как только проба картинки готова — подставляем компактный data-URL
            // из probeImage.thumb (второй загрузки нет). Сетевая/битая картинка -> остаётся плейсхолдер.
            function paintZone(node, zone) {
                var url = zoneUrl(idx, zone);
                node.style.background = "rgba(var(--mlbg-accent-rgb),0.14)";
                node.style.backgroundPosition = "center"; node.style.backgroundSize = "cover";
                onImage(url, function (st) { if (st && st.thumb) node.style.backgroundImage = cssUrl(st.thumb); });
            }
            if (grad) c.style.background = gradFor(idx, "editor");
            else paintZone(c, "editor");
            for (var zi = 0; zi < 3; zi++) {
                var strip = el("div",
                    "position:absolute; top:0; bottom:0; width:33.34%; left:" + (zi * 33.33) + "%;" +
                    "background-position:center; background-size:cover;" +
                    (zi ? "box-shadow:inset 1px 0 0 rgba(0,0,0,0.35);" : ""));
                if (grad) strip.style.background = gradFor(idx, ZK[zi]);
                else paintZone(strip, ZK[zi]);
                c.appendChild(strip);
            }
            var num = el("span", "position:absolute; right:3px; bottom:1px; z-index:2; font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.95);", label);
            c.appendChild(num);
            var nm = setName(idx); if (nm) c.title = idx + " · " + nm + " (редактор · сайдбар · панель)";
            if (!grad) probeSet(idx, c);
            if (!active) {
                c.addEventListener("mouseenter", function () { c.style.borderColor = "rgba(var(--mlbg-accent-rgb),0.6)"; previewSet(idx); });
                c.addEventListener("mouseleave", function () { c.style.borderColor = "var(--mlp-border-soft,rgba(205,214,244,0.16))"; previewEnd(); });
            }
        } else if (!active) {
            c.addEventListener("mouseenter", function () { c.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
            c.addEventListener("mouseleave", function () { c.style.background = "transparent"; });
        }
        c.addEventListener("click", function () {
            previewCancel(); // фиксируем выбор: mouseleave после клика не откатит фон обратно
            if (mode === "random") sessionRandomIndex = pickRandom();
            cfg.mode = mode;
            // «Фон по проекту» включён и выбран конкретный набор — закрепляем его за текущей папкой,
            // чтобы этот проект и дальше открывался с этим набором.
            if (cfg.autoWorkspace && /^\d+$/.test(mode)) {
                var wn = workspaceName();
                if (wn && DANGEROUS_KEYS.indexOf(wn) < 0) { if (!cfg.workspaceSets) cfg.workspaceSets = {}; cfg.workspaceSets[wn] = mode; }
            }
            applyFade(); refreshPanel();
        });
        keyActivate(c, isSet ? ("Набор " + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : "Случайный набор");
        c.setAttribute("aria-pressed", active ? "true" : "false"); // какой набор выбран — для скринридера
        return c;
    }

    // Переименование АКТИВНОГО набора (cfg.setName[idx]). Имя уходит в textContent/title
    // (кнопка BG, чипы, списки), поэтому CSS-инъекция не грозит — только ограничение длины.
    function makeSetNameEdit() {
        var wrap = el("div", ST.row + " margin-top:6px;");
        wrap.appendChild(el("span", mutedLabel(56), "Имя"));
        var ip = el("input", fieldStyle(" padding:3px 6px;"));
        ip.type = "text"; ip.maxLength = 40;
        var idx = activeIndex();
        ip.value = setName(idx);
        ip.placeholder = "Набор " + idx;
        function commit() {
            var v = ip.value.trim().slice(0, 40);
            var i = activeIndex();
            if (!cfg.setName) cfg.setName = {};
            if (v) cfg.setName[i] = v; else delete cfg.setName[i]; // пусто -> вернуть родное имя
            apply();
            // Обновляем только зависимые подписи, панель не пересобираем — иначе поле
            // потеряет фокус на каждом Enter. Чипы обновятся при следующем открытии панели.
        }
        ip.addEventListener("change", commit);
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
        wrap.appendChild(ip);
        var d = infoDot(INFO.set_name); if (d) wrap.appendChild(d);
        return wrap;
    }

    function makeOpSlider(key, label) {
        return makeSlider({
            label: label, min: 0, max: 0.6, step: 0.01, dec: 2, labelW: 56, valW: 30, ellipsis: false,
            get: function () { return getOp()[key]; }, onInput: function (v) { setOpValue(key, v); }, info: INFO["op_" + key]
        });
    }
    function makeParamSlider(def) {
        var key = def[0];
        return makeSlider({
            label: def[1], min: def[2], max: def[3], step: def[4], dec: def[5],
            get: function () { return cfg.fxp[key]; }, onInput: function (v) { cfg.fxp[key] = v; }, info: INFO["fxp_" + key]
        });
    }
    function makeCheck(key, label) {
        return makeToggle(function () { return cfg.fx[key]; }, function (v) { cfg.fx[key] = v; apply(); }, label, INFO["fx_" + key]);
    }

    // ==== Контролы секции «Терминал» (работают с cfg.term) ====
    function makeTermSelect() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(56), "Шрифт"));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        TERM_FONTS.forEach(function (f) {
            var o = el("option", null, f); o.value = f; if (f === cfg.term.font) o.selected = true; sel.appendChild(o);
        });
        sel.addEventListener("change", function () { cfg.term.font = sel.value; apply(); });
        wrap.appendChild(sel);
        var d = infoDot(INFO["term_font"]); if (d) wrap.appendChild(d);
        return wrap;
    }
    function makeTermCheck(key, label) {
        return makeToggle(function () { return cfg.term[key]; }, function (v) { cfg.term[key] = v; apply(); }, label, INFO["term_" + key]);
    }
    function makeTermSlider(key, label, min, max, step, dec) {
        return makeSlider({
            label: label, min: min, max: max, step: step, dec: dec, labelW: 56, ellipsis: false,
            get: function () { return cfg.term[key]; }, onInput: function (v) { cfg.term[key] = v; }, info: INFO["term_" + key]
        });
    }
    function makeTermColor(key, label) {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(56), label));
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = cfg.term[key];
        var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
        hex.type = "text"; hex.value = cfg.term[key]; hex.maxLength = 7; hex.setAttribute("aria-label", label + " HEX");
        ip.addEventListener("input", function () { cfg.term[key] = ip.value; hex.value = ip.value; applyThrottledLive(); });
        ip.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
        function commitTermHex() {
            var v = hex.value.trim();
            if (isColor(v)) { cfg.term[key] = v; ip.value = v; hex.value = v; apply(); }
            else hex.value = ip.value; // невалидно -> вернуть текущий цвет
        }
        hex.addEventListener("change", commitTermHex);
        hex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitTermHex(); hex.blur(); } });
        wrap.appendChild(ip); wrap.appendChild(hex);
        var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
        return wrap;
    }

    // ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
    // Универсальный слайдер над obj[key] — используется для cfg.imgfx и cfg.slideshow.
    function makeObjSlider(obj, key, label, min, max, step, dec, info) {
        return makeSlider({
            label: label, min: min, max: max, step: step, dec: dec,
            get: function () { return obj[key]; }, onInput: function (v) { obj[key] = v; }, info: info
        });
    }
    function makeAccentColor() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), "Акцент"));
        var cur = getAccent();
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = cur;
        // HEX редактируемый: можно вписать/вставить #rrggbb, а не только тыкать в палитру.
        var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
        hex.type = "text"; hex.value = cur; hex.maxLength = 7; hex.setAttribute("aria-label", "Акцент HEX");
        // акцент правится для АКТИВНОГО набора (setAccentValue), у каждого набора свой
        ip.addEventListener("input", function () { setAccentValue(ip.value); hex.value = ip.value; applyThrottledLive(); });
        ip.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
        function commitAccentHex() {
            var v = hex.value.trim();
            if (isColor(v)) { setAccentValue(v); ip.value = v; hex.value = v; apply(); }
            else hex.value = ip.value; // невалидно -> вернуть текущий цвет
        }
        hex.addEventListener("change", commitAccentHex);
        hex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitAccentHex(); hex.blur(); } });
        wrap.appendChild(ip); wrap.appendChild(hex);
        // «из картинки»: берём доминирующий цвет фоновой картинки редактора набора как акцент
        var pick = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", "из картинки");
        pick.title = "Взять акцент из фоновой картинки набора";
        pick.addEventListener("click", function () {
            onImage(zoneUrl(activeIndex(), "editor"), function (st) {
                if (st.ok && st.accent) {
                    setAccentValue(st.accent); ip.value = st.accent; hex.value = st.accent;
                    apply(); refreshPanel(); toast("Акцент из картинки: " + st.accent);
                } else { toast("Не удалось взять цвет из картинки", false); }
            });
        });
        keyActivate(pick, "Акцент из картинки");
        wrap.appendChild(pick);
        var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
        return wrap;
    }
    // Чекбокс «Авто-яркость editor» (cfg.autoDim). Отдельно, т.к. не входит в FX_LIST.
    function makeAutoDim() {
        return makeToggle(function () { return cfg.autoDim; }, function (v) { cfg.autoDim = v; apply(); }, "Авто-яркость editor", INFO.autoDim);
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
        var selWrap = el("div", ST.row);
        selWrap.appendChild(el("span", mutedLabel(92), "Зона"));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        ZONES.forEach(function (z) { var o = el("option", null, z[1]); o.value = z[0]; sel.appendChild(o); });
        selWrap.appendChild(sel);
        var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
        box.appendChild(selWrap);

        // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
        var fitWrap = el("div", ST.row);
        fitWrap.appendChild(el("span", mutedLabel(92), "Вписывание"));
        var fitSel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; fitSel.appendChild(op); });
        fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
        fitWrap.appendChild(fitSel);
        var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
        box.appendChild(fitWrap);
        function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

        // Свой путь картинки для выбранной зоны активного набора (cfg.setImg[idx][zone]).
        // Ключи зон здесь — cfg.imgfx ("side"), у SETS/setImg — "sidebar"; маппим через IMGZONE.
        var IMGZONE = { editor: "editor", side: "sidebar", panel: "panel" };
        var pathWrap = el("div", ST.row);
        pathWrap.appendChild(el("span", mutedLabel(92), "Путь картинки"));
        var pathIp = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        pathIp.type = "text"; pathIp.maxLength = 1024;
        function commitPath() {
            var z = IMGZONE[cur], i = activeIndex(), v = pathIp.value.trim().slice(0, 1024);
            if (!cfg.setImg) cfg.setImg = {};
            if (!cfg.setImg[i]) cfg.setImg[i] = {};
            if (v) cfg.setImg[i][z] = v; else delete cfg.setImg[i][z]; // пусто -> вернуть картинку набора
            apply();
        }
        pathIp.addEventListener("change", commitPath);
        pathIp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitPath(); pathIp.blur(); } });
        pathWrap.appendChild(pathIp);
        var pd = infoDot(INFO.img_path); if (pd) pathWrap.appendChild(pd);
        box.appendChild(pathWrap);
        function refreshPath() {
            var z = IMGZONE[cur], i = activeIndex(), o = cfg.setImg && cfg.setImg[i];
            pathIp.value = (o && o[z]) ? o[z] : "";
            pathIp.placeholder = setImage(i, z); // дефолтная картинка набора как подсказка
        }

        // слайдеры, читающие/пишущие cfg.imgfx[cur]; cur меняется селектором зоны, поэтому
        // get/onInput всегда смотрят на текущую зону, а refresh() дёргает _refresh при смене.
        var rows = DEFS.map(function (d) {
            var key = d[0];
            var w = makeSlider({
                label: d[1], min: d[2], max: d[3], step: d[4], dec: d[5],
                get: function () { return cfg.imgfx[cur][key]; }, onInput: function (v) { cfg.imgfx[cur][key] = v; }, info: d[6]
            });
            box.appendChild(w);
            return w._refresh;
        });

        function refresh() { refreshFit(); refreshPath(); rows.forEach(function (fn) { fn(); }); }
        sel.addEventListener("change", function () { cur = sel.value; refresh(); });
        refresh();
        return box;
    }
    function makeSlideToggle() {
        return makeToggle(function () { return cfg.slideshow.on; }, function (v) { cfg.slideshow.on = v; slideReset(); apply(); }, "Включить", INFO.slide_on);
    }

    // Поле «Папка плагина» (cfg.imgBase): база для относительных путей картинок набора.
    // Позволяет перенести плагин без правки исходника и пересборки. Пусто -> авто-путь (IMG),
    // показанный в placeholder. Значение уходит в url('...') через cssUrl (инъекция исключена).
    function makeImgBaseField() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), "Папка"));
        var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        ip.type = "text"; ip.maxLength = 512;
        ip.value = cfg.imgBase || "";
        ip.placeholder = IMG; // авто-определённый путь как подсказка
        function commit() {
            cfg.imgBase = safeBase(ip.value);
            ip.value = cfg.imgBase; // показать нормализованный вид (с завершающим слэшем)
            apply(); refreshPanel(); // плитки наборов перепроверят загрузку по новому пути
        }
        ip.addEventListener("change", commit);
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
        wrap.appendChild(ip);
        var d = infoDot(INFO.img_base); if (d) wrap.appendChild(d);
        return wrap;
    }
    // Тумблер «Разрешить сетевые картинки» (cfg.allowRemoteImages). По умолчанию выкл —
    // защита от того, что импортированный/чужой конфиг заставит редактор ходить в сеть.
    function makeRemoteImagesToggle() {
        return makeToggle(function () { return !!cfg.allowRemoteImages; },
            function (v) { cfg.allowRemoteImages = v; apply(); refreshPanel(); }, "Разрешить сетевые картинки", INFO.allow_remote);
    }

    // ==== Фон по проекту (cfg.autoWorkspace / cfg.workspaceSets) ====
    // Тумблер + имя текущего проекта + возможность «забыть» закрепление. Само закрепление
    // набора за проектом происходит кликом по набору, когда режим включён (см. makeChip).
    function makeWorkspaceUI() {
        var box = el("div", null);
        box.appendChild(makeToggle(function () { return !!cfg.autoWorkspace; },
            function (v) { cfg.autoWorkspace = v; apply(); refreshPanel(); }, "Включить", INFO.workspace_on));
        var name = workspaceName();
        box.appendChild(el("div", "padding:4px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
            name ? ("Проект: " + name) : "Проект не определён — открыта ли папка?"));
        var pinned = (name && cfg.workspaceSets) ? cfg.workspaceSets[name] : null;
        if (name && pinned != null) {
            box.appendChild(el("div", "padding:2px 3px 4px; color:var(--mlp-muted,#a6adc8); font-size:11px;",
                "Закреплён набор " + pinned + (setName(parseInt(pinned, 10)) ? " · " + setName(parseInt(pinned, 10)) : "")));
            var forget = el("div", "margin-top:2px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", "Забыть закрепление за проектом");
            forget.addEventListener("click", function () { if (cfg.workspaceSets) delete cfg.workspaceSets[name]; apply(); refreshPanel(); });
            keyActivate(forget, "Забыть закрепление набора за проектом");
            box.appendChild(forget);
        } else if (name && cfg.autoWorkspace) {
            box.appendChild(el("div", "padding:2px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
                "Выбери набор выше — он закрепится за этим проектом."));
        }
        return box;
    }
    // Тумблер полоски-индикатора git-ветки (cfg.ambientBranch). ensureBranchStrip — из boot.js
    // (в общей области видимости после склейки), зовём для мгновенной реакции на переключение.
    function makeAmbientBranchToggle() {
        return makeToggle(function () { return !!cfg.ambientBranch; },
            function (v) { cfg.ambientBranch = v; apply(); try { ensureBranchStrip(); } catch (e) {} }, "Полоска-индикатор ветки", INFO.ambient_branch);
    }

    // ==== Мастер-выключатель фона и эффектов (cfg.enabled) ====
    // Заметный тумблер вверху панели: выкл — «ванильный» VS Code, настройки сохранены.
    function makeMasterToggle() {
        var row = el("label",
            "display:flex; align-items:center; gap:8px; padding:8px 10px; margin:2px 2px 4px; border-radius:8px; cursor:pointer;" +
            "background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);");
        var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer; transform:scale(1.15);");
        cb.type = "checkbox"; cb.checked = cfg.enabled !== false;
        var txt = el("span", "flex:1 1 auto; font-weight:700; letter-spacing:0.2px;", cfg.enabled !== false ? "Фон и эффекты включены" : "Фон и эффекты выключены");
        cb.addEventListener("change", function () {
            cfg.enabled = cb.checked;
            txt.textContent = cb.checked ? "Фон и эффекты включены" : "Фон и эффекты выключены";
            apply();
        });
        row.appendChild(cb); row.appendChild(txt);
        var d = infoDot(INFO.enabled); if (d) row.appendChild(d);
        return row;
    }

    // ==== Авто-набор по времени суток (cfg.autoTime) ====
    // Тумблер «включить» + два выпадающих списка: набор для дня и для ночи.
    // Днём (8:00–20:00) активируется дневной набор, ночью — ночной (см. timeTick).
    function makeAutoTimeToggle() {
        return makeToggle(
            function () { return !!(cfg.autoTime && cfg.autoTime.on); },
            function (v) {
                if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
                cfg.autoTime.on = v; apply();
                if (v) { try { timeTick(); } catch (e) {} } // сразу применить нужный набор
            },
            "Включить", INFO.autotime_on
        );
    }
    // Выпадающий список наборов (для выбора дневного/ночного). which — "day" | "night".
    function makeSetPicker(which, label) {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), label));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        for (var i = 0; i < SETS.length; i++) {
            var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
            if (cfg.autoTime && cfg.autoTime[which] === i) o.selected = true;
            sel.appendChild(o);
        }
        sel.addEventListener("change", function () {
            if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
            cfg.autoTime[which] = parseInt(sel.value, 10); apply();
            if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} }
        });
        wrap.appendChild(sel);
        return wrap;
    }

    // ===== Сворачиваемая секция =====
    function collapsible(parent, title, info) {
        var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
        var wrap = el("div", "margin-top:8px;");
        var head = el("div", "display:flex; align-items:center; gap:7px; padding:5px 7px; cursor:pointer; border-radius:7px; background:rgba(var(--mlbg-accent-rgb),0.08);");
        var chev = el("span", "flex:0 0 auto; width:10px; text-align:center; color:var(--mlbg-accent); font-size:9px; transition:transform 0.15s;", "▶");
        chev.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
        head.appendChild(chev);
        head.appendChild(el("div", "flex:1 1 auto; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", title));
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

    // ===================== src/ui/io.js =====================
    // ===== Экспорт / импорт настроек + тосты =====
    // toast — короткое уведомление внизу справа (зелёное/красное). Экспорт выгружает cfg в
    // JSON-файл и в буфер; импорт читает файл и прогоняет его через mergeCfg (санитизация).

    function toast(msg, ok) {
        var t = el("div",
            "position:fixed; bottom:44px; right:16px; z-index:100004; padding:9px 13px; border-radius:9px;" +
            "max-width:min(360px,80vw); line-height:1.4;" + // длинные предупреждения переносятся, а не уезжают за край
            "font-weight:600; font-family:var(--vscode-font-family,sans-serif); box-shadow:0 8px 24px rgba(0,0,0,0.5);", msg);
        t.style.background = ok === false ? "rgba(243,139,168,0.96)" : "rgba(166,227,161,0.96)";
        t.style.color = "#181825";
        // Скринридер озвучит текст тоста (например «Пресет сохранён»). Ошибки — настойчивее.
        t.setAttribute("role", "status");
        t.setAttribute("aria-live", ok === false ? "assertive" : "polite");
        document.body.appendChild(t);
        // Предупреждения (ok===false) держим дольше — их успеть прочитать важнее.
        setTimeout(function () { t.remove(); }, ok === false ? 6000 : 3200);
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
    // Считает удалённые (http(s)/сетевые) ссылки на картинки в СЫРОМ конфиге (до санитизации):
    // база imgBase и все cfg.setImg[idx][zone]. Нужно, чтобы честно предупредить при импорте
    // чужого файла — такие ссылки по умолчанию блокируются (imgAllowed), но пользователь должен
    // знать, что кто-то пытался заставить редактор ходить в сеть.
    function countRemoteImgs(p) {
        var n = 0;
        try {
            if (!p || typeof p !== "object") return 0;
            if (typeof p.imgBase === "string" && isRemoteUrl(p.imgBase)) n++;
            if (p.setImg && typeof p.setImg === "object") {
                for (var i in p.setImg) {
                    if (!p.setImg.hasOwnProperty(i)) continue;
                    var z = p.setImg[i]; if (!z || typeof z !== "object") continue;
                    ["editor", "sidebar", "panel"].forEach(function (k) { if (typeof z[k] === "string" && isRemoteUrl(z[k])) n++; });
                }
            }
        } catch (e) {}
        return n;
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
                    var remote = countRemoteImgs(parsed); // считаем ДО санитизации (сырой файл)
                    backupCfg(); // текущие настройки -> резерв, чтобы неудачный импорт можно было откатить
                    cfg = mergeForeign(parsed); // санитизация + сетевые картинки принудительно выкл (чужой файл сам их не включит)
                    sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                    apply(); refreshPanel();
                    // Предупреждаем о сетевых ссылках на картинки в импортированном файле. Они
                    // всегда заблокированы (mergeForeign выключил «Разрешить сетевые картинки»),
                    // но пользователь должен знать, что кто-то пытался увести редактор в сеть.
                    if (remote > 0) {
                        toast("Импортировано. Заблокировано " + remote + " сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику.", false);
                    } else {
                        toast("Настройки импортированы");
                    }
                } catch (e) { toast("Ошибка: файл не читается как JSON", false); }
                inp.remove();
            };
            rd.onerror = function () { toast("Не удалось прочитать файл", false); inp.remove(); };
            rd.readAsText(f);
        });
        document.body.appendChild(inp); inp.click();
    }
    // ===== Именованные пресеты =====
    // Несколько сохранённых образов в отдельном ключе localStorage: имя -> снимок cfg.
    // Применение снимка идёт через mergeCfg (та же санитизация, что и импорт файла),
    // поэтому подменённое хранилище не опаснее импортированного JSON.
    var PRESETS_KEY = "moonlight-bg-presets", PRESETS_MAX = 24;
    function loadPresets() {
        try {
            var raw = localStorage.getItem(PRESETS_KEY);
            if (raw && raw.length <= 256 * 1024) {
                var o = safeParse(raw);
                if (o && typeof o === "object") return o;
            }
        } catch (e) {}
        return {};
    }
    function savePresets(obj) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(obj)); } catch (e) {} }

    function makePresetsUI() {
        var box = el("div", null);

        // строка сохранения текущего вида под именем
        var saveRow = el("div", "display:flex; gap:6px; align-items:center; padding:2px 2px;");
        var ip = el("input", fieldStyle(" padding:4px 6px;"));
        ip.type = "text"; ip.maxLength = 40; ip.placeholder = "Имя пресета";
        var saveB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", "Сохранить");
        function doSave() {
            var name = ip.value.trim().slice(0, 40);
            if (!name) { toast("Введите имя пресета", false); return; }
            var cur = loadPresets();
            if (!(name in cur) && Object.keys(cur).length >= PRESETS_MAX) { toast("Слишком много пресетов (макс. " + PRESETS_MAX + ")", false); return; }
            var snap = clone(cfg); delete snap.ui; // положение/свёрнутость панели не входят в пресет
            cur[name] = snap; savePresets(cur);
            ip.value = "";
            toast("Пресет «" + name + "» сохранён");
            refreshPanel();
        }
        saveB.addEventListener("click", doSave);
        keyActivate(saveB, "Сохранить пресет");
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSave(); } });
        saveRow.appendChild(ip); saveRow.appendChild(saveB);
        var sd = infoDot(INFO.presets); if (sd) saveRow.appendChild(sd);
        box.appendChild(saveRow);

        // список сохранённых пресетов: клик по строке — применить, «×» — удалить
        var presets = loadPresets(), names = Object.keys(presets);
        if (!names.length) {
            box.appendChild(el("div", "padding:6px 3px 2px; color:var(--mlp-faint,#6c7086); font-size:11px;", "Пресетов пока нет — сохрани текущий вид под именем."));
        } else {
            var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
            names.forEach(function (name) {
                var row = el("div", "display:flex; align-items:center; gap:6px; padding:5px 7px; border-radius:7px; cursor:pointer; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
                row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
                row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
                row.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mlp-fg,#cdd6f4);", name));
                var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8);", "×");
                del.title = "Удалить пресет";
                row.appendChild(del);
                row.addEventListener("click", function (e) {
                    if (del.contains(e.target)) return; // клик по «×» обрабатывается отдельно
                    var cur = loadPresets(); if (!(name in cur)) return;
                    var keepUi = cfg.ui;                // пресет меняет дизайн, не трогая положение панели
                    backupCfg();                        // прежний вид -> резерв (можно откатить применение пресета)
                    cfg = mergeForeign(cur[name]); cfg.ui = keepUi; // сетевые картинки не включаем из пресета
                    sessionRandomIndex = null;          // random переберётся под новый конфиг
                    apply(); refreshPanel();
                    toast("Пресет «" + name + "» применён");
                });
                keyActivate(row, "Применить пресет " + name);
                del.addEventListener("click", function (e) {
                    e.stopPropagation();
                    var cur = loadPresets(); delete cur[name]; savePresets(cur);
                    toast("Пресет «" + name + "» удалён");
                    refreshPanel();
                });
                keyActivate(del, "Удалить пресет " + name);
                list.appendChild(row);
            });
            box.appendChild(list);
        }
        return box;
    }

    // Восстановление из авто-резерва: возвращает конфиг, бывший до последней замены
    // (импорт/сброс/пресет). Текущий cfg при этом сам уходит в резерв — поэтому «Восстановить»
    // работает как переключатель между «до» и «после» (нажал не туда — нажми ещё раз).
    function restoreBackup() {
        var b = readBackup();
        if (!b) { toast("Резерва нет", false); return; }
        backupCfg();                 // текущее -> резерв (обратный откат тем же действием)
        cfg = b; sessionRandomIndex = null;
        apply(); refreshPanel();
        toast("Восстановлены прежние настройки");
    }

    // ===== Шаринг образа коротким кодом =====
    // Кодируем ТОЛЬКО «внешний вид» (без картинок, путей и личных привязок) в компактный
    // base64-код, которым удобно поделиться. Применение чужого кода идёт через mergeCfg (та же
    // санитизация, что и импорт), а машинно-зависимое (свои картинки, путь плагина, привязки к
    // проектам) сохраняется от текущего конфига — чужой код их не трогает.
    var SHARE_KEYS = ["mode", "accent", "setAccent", "setName", "baseOp", "setOp",
        "fx", "fxp", "imgfx", "fit", "term", "slideshow", "autoTime", "autoDim", "enabled"];
    var SHARE_KEEP = ["ui", "imgBase", "workspaceSets", "autoWorkspace", "ambientBranch", "setImg"]; // не трогаем при применении кода
    // UTF-8-безопасный base64 (в именах наборов бывает кириллица — «сырой» btoa на ней падает).
    function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ""; } }
    function b64dec(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return ""; } }
    function shareEncode() {
        var o = {};
        for (var i = 0; i < SHARE_KEYS.length; i++) { var k = SHARE_KEYS[i]; if (k in cfg) o[k] = cfg[k]; }
        return b64enc(JSON.stringify(o));
    }
    function shareDecode(code) {
        var json = b64dec(String(code).trim()); if (!json) return null;
        try { var o = safeParse(json); return (o && typeof o === "object") ? o : null; } catch (e) { return null; }
    }
    function applyShareCode(code) {
        var o = shareDecode(code);
        if (!o) { toast("Код не распознан", false); return false; }
        backupCfg(); // текущее -> резерв (применение чужого кода можно откатить)
        var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
        cfg = mergeCfg(o); // санитизация всего содержимого кода
        for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // вернуть машинно-зависимое
        sessionRandomIndex = null;
        apply(); refreshPanel();
        toast("Образ применён из кода");
        return true;
    }

    // Секция «Поделиться»: копировать код текущего образа + поле для чужого кода и «Применить».
    function makeShareUI() {
        var box = el("div", null);
        var copyB = makeIoBtn("Скопировать код образа");
        copyB.style.marginBottom = "6px";
        copyB.addEventListener("click", function () {
            var code = shareEncode();
            toast(code && copyText(code) ? "Код образа скопирован в буфер" : "Не удалось сформировать код", !!code);
        });
        box.appendChild(copyB);
        var row = el("div", ST.row);
        var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        ip.type = "text"; ip.placeholder = "Вставь код образа"; ip.maxLength = 8192;
        var applyB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", "Применить");
        function doApply() { if (applyShareCode(ip.value)) ip.value = ""; }
        applyB.addEventListener("click", doApply);
        keyActivate(applyB, "Применить код образа");
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doApply(); } });
        row.appendChild(ip); row.appendChild(applyB);
        var d = infoDot(INFO.share_code); if (d) row.appendChild(d);
        box.appendChild(row);
        return box;
    }

    // Кнопка экспорта/импорта (одинаковый вид, разный обработчик навешивается снаружи).
    function makeIoBtn(text) {
        var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", text);
        b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
        b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
        keyActivate(b, text);
        return b;
    }

    // ===================== src/ui/statusbar.js =====================
    // ===== Кнопка статусбара =====
    var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";
    function updateLabel() {
        var item = document.getElementById(SB_ID); if (!item) return;
        var a = item.querySelector("a"); if (!a) return;
        var idx = activeIndex(), nm = setName(idx);
        // Мастер-выключатель: когда фон выключен — короткая подпись «BG выкл», без индикаторов.
        if (!cfg.enabled) {
            a.textContent = "BG выкл";
            var od = item.querySelector(".mlbg-mode-dot"); if (od) od.remove();
            var t0 = "Фон и дизайн — настройки (фон выключен, Ctrl+Alt+0 — включить)";
            item.title = t0; item.setAttribute("aria-label", t0);
            return;
        }
        a.textContent = "BG " + idx + (nm ? " · " + nm : "") + (cfg.mode === "random" ? " ~" : "");

        // Индикатор активного авто-режима: маленькая точка перед подписью.
        // авто-по-времени — кольцо (акцентная рамка), слайдшоу — залитая точка.
        // Приоритет у авто-по-времени (оно перебивает слайдшоу, см. slideTick).
        var auto = !!(cfg.autoTime && cfg.autoTime.on);
        var slide = !auto && !!(cfg.slideshow && cfg.slideshow.on);
        var dot = item.querySelector(".mlbg-mode-dot");
        var mode = auto ? "auto" : (slide ? "slide" : "");
        if (mode) {
            if (!dot) {
                dot = document.createElement("span"); dot.className = "mlbg-mode-dot";
                dot.style.cssText = "display:inline-block; width:6px; height:6px; border-radius:50%; margin:0 5px 0 1px; vertical-align:middle; box-sizing:border-box;";
                a.insertBefore(dot, a.firstChild);
            }
            if (mode === "auto") { dot.style.background = "transparent"; dot.style.border = "2px solid var(--mlbg-accent)"; }
            else { dot.style.background = "var(--mlbg-accent)"; dot.style.border = "none"; }
        } else if (dot) { dot.remove(); }

        var modeTxt = auto ? " · авто-набор по времени суток" : (slide ? " · слайдшоу вкл" : "");
        var t = "Фон и дизайн — настройки" + (nm ? " (набор: " + nm + ")" : "") + modeTxt;
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

    // ===================== src/ui/panel.js =====================
    // ===== Панель настроек =====
    // Централизованное закрытие: снимает документные слушатели (Esc/клик-мимо), прячет «?»,
    // удаляет саму панель. panelCleanup хранит отписку слушателей текущей панели.
    var panelCleanup = null, panelPrevFocus = null;
    function closePanel() {
        hideInfo();
        try { previewEnd(); } catch (e) {} // снять «залипшее» превью и вернуть реальный набор: удалённый чип может не прислать mouseleave
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
            "background:var(--mlp-bg,rgba(24,24,37,0.98)); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.35); border-radius:12px; padding:10px 13px 13px;" +
            "box-shadow:0 14px 40px rgba(0,0,0,0.6); font-size:12px; line-height:1.35; color:var(--mlp-fg,#cdd6f4);" +
            "font-family:var(--vscode-font-family, sans-serif);";
        // Палитра панели как CSS-переменные на её корне — контролы (метки, поля, границы)
        // читают их через var(--mlp-*, <тёмный fallback>). На тёмной теме значения равны
        // прежним литералам (внешний вид не меняется), на светлой — подменяются на светлые,
        // иначе панель оставалась тёмной поверх светлого VS Code. Каскадирует на всех потомков.
        (function () {
            // faint подняли по контрасту (WCAG): на светлой теме темнее (#6b6e85 вместо #8c8fa1),
            // на тёмной светлее (#8b93ad вместо #6c7086) — вспомогательный текст стал читаемым.
            var V = isLightTheme() ? {
                fg: "#1e1e2e", muted: "#5c5f77", faint: "#6b6e85", field: "rgba(255,255,255,0.75)",
                border: "rgba(30,30,46,0.22)", borderSoft: "rgba(30,30,46,0.16)", borderFaint: "rgba(30,30,46,0.12)",
                head: "#4c4f69", bg: "rgba(245,245,250,0.98)"
            } : {
                fg: "#cdd6f4", muted: "#a6adc8", faint: "#8b93ad", field: "rgba(30,30,46,0.6)",
                border: "rgba(205,214,244,0.2)", borderSoft: "rgba(205,214,244,0.16)", borderFaint: "rgba(205,214,244,0.12)",
                head: "#bac2de", bg: "rgba(24,24,37,0.98)"
            };
            try {
                p.style.setProperty("--mlp-bg", V.bg);
                p.style.setProperty("--mlp-fg", V.fg);
                p.style.setProperty("--mlp-muted", V.muted);
                p.style.setProperty("--mlp-faint", V.faint);
                p.style.setProperty("--mlp-field", V.field);
                p.style.setProperty("--mlp-border", V.border);
                p.style.setProperty("--mlp-border-soft", V.borderSoft);
                p.style.setProperty("--mlp-border-faint", V.borderFaint);
                p.style.setProperty("--mlp-head", V.head);
            } catch (e) {}
        })();
        p.addEventListener("click", function (e) { e.stopPropagation(); });

        // Заголовок = ручка перетаскивания
        var head = el("div", "display:flex; align-items:center; justify-content:space-between; cursor:move; user-select:none; padding:2px 2px 7px;");
        head.appendChild(el("div", "font-weight:700; font-size:13px; letter-spacing:0.3px;", "⠿  Фон и дизайн"));
        var hr = el("div", "display:flex; align-items:center; gap:5px;");
        var infoAll = infoDot("Перетаскивай окно за заголовок. Секции сворачиваются кликом по названию. У настроек «?» — клик показывает пояснение. Положение и свёрнутость запоминаются.");
        if (infoAll) hr.appendChild(infoAll);
        var close = el("div", "flex:0 0 auto; width:20px; height:20px; line-height:18px; text-align:center; border-radius:6px; cursor:pointer; color:var(--mlp-muted,#a6adc8);", "×");
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

        // Мастер-выключатель фона/эффектов (вверху, до секций)
        p.appendChild(makeMasterToggle());

        // Набор (превью-чипы)
        var secSet = collapsible(p, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске.");
        var chips = el("div", "display:flex; flex-wrap:wrap; gap:6px; align-items:center;");
        for (var i = 0; i < SETS.length; i++) chips.appendChild(makeChip(String(i), String(i)));
        chips.appendChild(makeChip("random", "случайно"));
        secSet.appendChild(chips);
        secSet.appendChild(makeSetNameEdit()); // переименование активного набора

        // Слайдшоу
        var secSlide = collapsible(p, "Слайдшоу", "Автоматическая смена набора по кругу через заданный интервал.");
        secSlide.appendChild(makeSlideToggle());
        secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min));

        // Авто-набор по времени суток
        var secTime = collapsible(p, "По времени суток", "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
        secTime.appendChild(makeAutoTimeToggle());
        secTime.appendChild(makeSetPicker("day", "Дневной"));
        secTime.appendChild(makeSetPicker("night", "Ночной"));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "from", "День с, ч", 0, 23, 1, 0, INFO.autotime_from));
        secTime.appendChild(makeObjSlider(cfg.autoTime, "to", "День до, ч", 0, 23, 1, 0, INFO.autotime_to));

        // Яркость набора
        var secOp = collapsible(p, "Яркость набора", "Насколько ярко проступают фоновые картинки в каждой зоне.");
        [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель"]].forEach(function (o) { secOp.appendChild(makeOpSlider(o[0], o[1])); });
        secOp.appendChild(makeAutoDim());

        // Картинка: акцентный цвет + фильтры фоновой картинки по зонам
        var secImg = collapsible(p, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
        secImg.appendChild(makeAccentColor());
        secImg.appendChild(makeImgFilters());

        // Папка плагина: база для картинок набора. Нужна при переносе плагина (иначе фон
        // пропадает — плитки набора с «!»). Отдельная секция, чтобы не путать с путём картинки.
        var secBase = collapsible(p, "Папка плагина", "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.");
        secBase.appendChild(makeImgBaseField());
        secBase.appendChild(makeRemoteImagesToggle());

        // Контекст: фон под открытый проект + индикатор git-ветки (оба читают заголовок/статусбар).
        var secWs = collapsible(p, "По проекту", "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.");
        secWs.appendChild(makeWorkspaceUI());
        secWs.appendChild(makeAmbientBranchToggle());

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

        // Пресеты (сохранённые образы)
        var secPreset = collapsible(p, "Пресеты", "Сохранённые образы: весь вид под именем, переключение одним кликом.");
        secPreset.appendChild(makePresetsUI());

        // Поделиться образом коротким кодом (без картинок/путей)
        var secShare = collapsible(p, "Поделиться", "Короткий код всего образа для обмена: скопируй свой или примени чужой. Картинки и пути не входят.");
        secShare.appendChild(makeShareUI());

        // экспорт / импорт
        var io = el("div", "display:flex; gap:8px; margin-top:12px;");
        var expB = makeIoBtn("⬇ Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
        var impB = makeIoBtn("⬆ Импорт"); impB.addEventListener("click", function () { importCfg(); });
        io.appendChild(expB); io.appendChild(impB);
        p.appendChild(io);

        // Восстановление из авто-резерва: появляется, когда резерв есть (после импорта/сброса/
        // пресета). Возвращает конфиг, бывший до последней такой замены (можно нажать повторно).
        if (hasBackup()) {
            var restB = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", "Восстановить прежние настройки");
            restB.addEventListener("mouseenter", function () { restB.style.background = "rgba(137,180,250,0.26)"; });
            restB.addEventListener("mouseleave", function () { restB.style.background = "rgba(137,180,250,0.14)"; });
            restB.addEventListener("click", function () { restoreBackup(); });
            keyActivate(restB, "Восстановить прежние настройки из резерва");
            p.appendChild(restB);
        }

        // сброс
        var reset = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", "Сбросить к дефолту");
        reset.addEventListener("mouseenter", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.26)"; });
        reset.addEventListener("mouseleave", function () { reset.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
        reset.addEventListener("click", function () {
            var keepMode = cfg.mode, keepUi = cfg.ui; // сброс дизайна, но не положения/свёрнутости панели
            backupCfg();                              // прежние настройки -> резерв (сброс можно откатить)
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

    // Пересобрать открытую панель, СОХРАНИВ прокрутку и фокус. Раньше refreshPanel просто
    // закрывал и открывал панель заново — прокрутка прыгала наверх, а фокус терялся; при этом
    // его дёргают и таймеры (слайдшоу/по времени), так что открытая панель «саморазрушалась»
    // под пользователем каждые N минут. Теперь: запоминаем scrollTop и ПОРЯДКОВЫЙ номер
    // сфокусированного контрола в списке фокусируемых (структура панели детерминирована —
    // после пересборки тот же контрол стоит на том же месте), затем восстанавливаем. Фокус
    // ставим ДО scrollTop: .focus() сам подкручивает элемент в видимую область, поэтому scrollTop
    // должен побеждать последним. Активная подсветка чипов при этом остаётся корректной.
    function refreshPanel() {
        var old = document.getElementById(PANEL_ID);
        if (!old) return;
        var scroll = 0, focusIdx = -1;
        try { scroll = old.scrollTop; } catch (e) {}
        try {
            var f = panelFocusables(old), act = document.activeElement;
            for (var i = 0; i < f.length; i++) if (f[i] === act) { focusIdx = i; break; }
        } catch (e) {}
        closePanel();
        togglePanel({ stopPropagation: function () {} });
        var np = document.getElementById(PANEL_ID);
        if (!np) return;
        if (focusIdx >= 0) {
            try { var nf = panelFocusables(np); if (nf[focusIdx] && nf[focusIdx].focus) nf[focusIdx].focus(); } catch (e) {}
        }
        try { np.scrollTop = scroll; } catch (e) {}
    }

    // ===================== src/widgets/extras.js =====================
    // ===== Рантайм-виджеты и авто-переключатели =====
    // Виджеты статусбара (часы, помидор, летящие частицы) + авто-смена набора:
    // слайдшоу по таймеру (slideTick) и авто-набор по времени суток (timeTick).
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
        if (cfg.enabled && cfg.fx.particles && !reduceMotion() && partCount() > 0) {
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
    function preloadOne(url) {
        if (!url || _preloaded[url]) return; _preloaded[url] = true;
        try { var im = new Image(); im.src = url; } catch (e) {}
    }
    function preloadNext() {
        if (!cfg.slideshow || !cfg.slideshow.on || SETS.length < 2) return;
        // индексы наборов для предзагрузки (учитывают cfg.setImg через zoneUrl)
        var idxs = cfg.mode === "random"
            ? SETS.map(function (_s, i) { return i; })
            : [(activeIndex() + 1) % SETS.length];
        idxs.forEach(function (i) { preloadOne(zoneUrl(i, "editor")); preloadOne(zoneUrl(i, "sidebar")); preloadOne(zoneUrl(i, "panel")); });
    }
    // ===== Авто-набор по времени суток =====
    // Днём (8:00–20:00) — cfg.autoTime.day, ночью — cfg.autoTime.night. Переиспользует
    // applyFade (как слайдшоу). Не трогает режим «случайно». Проверяется каждую секунду,
    // но переключает только при реальной смене нужного набора (idempotent).
    function isDaytime() {
        var h = new Date().getHours(), at = cfg.autoTime || {};
        var f = (typeof at.from === "number") ? at.from : 8;
        var t = (typeof at.to === "number") ? at.to : 20;
        if (f === t) return true;                       // границы совпали — считаем всегда день
        return t > f ? (h >= f && h < t) : (h >= f || h < t); // t < f — интервал «через полночь»
    }
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
        try { ensureBranchStrip(); } catch (e) {}
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
            ensureStatusBar(); ensureClock(); ensurePomodoro(); ensureBranchStrip(); // дешёвые проверки наличия
            tickClock(); tickPomo(); timeTick(); slideTick();   // обновления по времени
            if (_tick % 3 === 0) heal();                         // самолечение раз в 3с
        } catch (e) {}
    }, 1000);
    window.addEventListener("resize", function () { try { resizeParticles(); } catch (e) {} });

    // ===== Горячие клавиши =====
    // Переключение набора без открытия панели и быстрый вызов панели. Коды клавиш (e.code)
    // не зависят от раскладки (RU/EN) — Ctrl+Alt+. / , / B работают на любой. Срабатываем
    // только на точное сочетание Ctrl+Alt (без Shift/Meta), чтобы не мешать редактору.
    function cycleSet(dir) {
        if (SETS.length < 1) return;
        var cur = activeIndex();
        var next = ((cur + dir) % SETS.length + SETS.length) % SETS.length;
        cfg.mode = String(next); // из «случайно» — переходим на конкретный набор
        applyFade();
        if (document.getElementById(PANEL_ID)) refreshPanel();
        try { toast("Набор " + next + (setName(next) ? " · " + setName(next) : "")); } catch (e) {}
    }
    function onHotkey(e) {
        try {
            if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return;
            if (e.code === "Period") { e.preventDefault(); cycleSet(1); }
            else if (e.code === "Comma") { e.preventDefault(); cycleSet(-1); }
            else if (e.code === "KeyB") { e.preventDefault(); togglePanel({ stopPropagation: function () {} }); }
            else if (e.code === "Digit0" || e.code === "Numpad0") { // мастер-выключатель фона
                e.preventDefault();
                cfg.enabled = !cfg.enabled; apply();
                try { toast(cfg.enabled ? "Фон включён" : "Фон выключен"); } catch (er) {}
                if (document.getElementById(PANEL_ID)) refreshPanel();
            }
        } catch (err) {}
    }
    document.addEventListener("keydown", onHotkey, true);

    // ===== Приглушение фона при печати (fx.dimOnType) =====
    // Monaco держит фокус ввода в скрытом <textarea class="inputarea"> и шлёт по нему
    // нативные input-события на КАЖДЫЙ ввод текста (навигация стрелками их не вызывает —
    // поэтому не тускнеем от простого перемещения). На ввод вешаем body.mlbg-typing (CSS в
    // buildCSS опускает прозрачность оверлея редактора) и снимаем класс через паузу простоя.
    // _flowCount копит непрерывные нажатия; после порога — режим «поток» (fx.flow).
    var _typingTimer = 0, _flowCount = 0;
    function onEditorType(e) {
        try {
            if (!cfg.enabled || (!cfg.fx.dimOnType && !cfg.fx.flow)) return;
            var t = e.target;
            if (!t || !t.classList || !t.classList.contains("inputarea")) return;
            var cl = document.body && document.body.classList;
            if (cl && cfg.fx.dimOnType) cl.add("mlbg-typing");
            if (cl && cfg.fx.flow) {
                _flowCount++;
                if (_flowCount >= 12) cl.add("mlbg-flowing"); // ~12 нажатий подряд без паузы -> «поток»
            }
            if (_typingTimer) clearTimeout(_typingTimer);
            _typingTimer = setTimeout(function () {
                _typingTimer = 0; _flowCount = 0; // пауза на чтение — сбрасываем поток и подсветку
                try { var c = document.body && document.body.classList; if (c) { c.remove("mlbg-typing"); c.remove("mlbg-flowing"); } } catch (er) {}
            }, 1400);
        } catch (err) {}
    }
    document.addEventListener("input", onEditorType, true);

    // ===== Параллакс фона по курсору (fx.parallax) =====
    // Двигаем CSS-переменные --mlbg-par-x/y на <html> вслед за мышью; CSS (buildCSS) смещает
    // background-position оверлея редактора, создавая глубину. Коалесим в один кадр (rAF).
    // Уважаем «уменьшить движение» и не работаем при скрытом окне/выключенном фоне.
    var _parRaf = 0, _parX = 0, _parY = 0;
    function _reduceMotion() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
    function onParallax(e) {
        if (!cfg.enabled || !cfg.fx.parallax || document.hidden || _reduceMotion()) return;
        var w = window.innerWidth || 1, h = window.innerHeight || 1;
        _parX = (0.5 - e.clientX / w) * 16; // ±8px «навстречу» курсору — ощущение глубины
        _parY = (0.5 - e.clientY / h) * 16;
        if (_parRaf) return;
        _parRaf = requestAnimationFrame(function () {
            _parRaf = 0;
            try { var s = document.documentElement.style; s.setProperty("--mlbg-par-x", _parX.toFixed(1) + "px"); s.setProperty("--mlbg-par-y", _parY.toFixed(1) + "px"); } catch (er) {}
        });
    }
    document.addEventListener("mousemove", onParallax, true);

    // ===== Индикатор git-ветки (ambientBranch) =====
    // Тонкая полоска у верхнего края окна: на main/master — красноватая (ты на основной ветке),
    // на прочих — зеленоватая. Имя ветки берём из статусбара (иконка git-branch) — API для этого
    // в custom-css нет, поэтому читаем DOM; если индикатора git нет, полоски тоже нет.
    var BRANCH_ID = "moonlight-branch";
    function gitBranch() {
        try {
            var wb = document.querySelector(".monaco-workbench"); if (!wb) return "";
            var ico = wb.querySelector(".statusbar-item .codicon-git-branch");
            if (!ico) return "";
            var item = ico.closest ? ico.closest(".statusbar-item") : null;
            var txt = (item && item.textContent) || "";
            return txt.replace(/\s+/g, " ").trim().slice(0, 80);
        } catch (e) { return ""; }
    }
    function ensureBranchStrip() {
        var strip = document.getElementById(BRANCH_ID);
        var b = (cfg.enabled && cfg.ambientBranch) ? gitBranch() : "";
        if (!b) { if (strip && strip.remove) strip.remove(); return; }
        if (!strip) {
            strip = document.createElement("div"); strip.id = BRANCH_ID;
            strip.style.cssText = "position:fixed; top:0; left:0; right:0; height:2px; z-index:100002; pointer-events:none; transition:background 0.4s ease;";
            (document.body || document.documentElement).appendChild(strip);
        }
        strip.style.background = /^(main|master)$/i.test(b) ? "rgba(243,139,168,0.9)" : "rgba(166,227,161,0.85)";
        strip.title = "git: " + b;
    }

    // ===== Приглушение фона при потере фокуса окном (fx.dimOnBlur) =====
    // Вешаем/снимаем body.mlbg-unfocused на blur/focus окна; CSS-правило (buildCSS) действует,
    // только когда эффект включён, поэтому класс можно навешивать всегда (нулевой эффект при выкл).
    function setUnfocused(on) {
        try { if (document.body && document.body.classList) document.body.classList[on ? "add" : "remove"]("mlbg-unfocused"); } catch (e) {}
    }
    window.addEventListener("blur", function () { setUnfocused(true); });
    window.addEventListener("focus", function () { setUnfocused(false); });

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

    console.log("[MoonLight custom-bg] v15 installed (18 sets: 6 gradient + smooth preview + per-zone gradients + per-project + palette + branch strip + parallax + flow + share), enabled:", cfg.enabled, "sets:", SETS.length, "mode:", cfg.mode, "term:", cfg.term.font, "theme:", themeKind());

})();
