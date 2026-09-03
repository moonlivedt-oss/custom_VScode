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
    fxp: { blur: 8, kbScale: 1.08, kbSpeed: 60, vignette: 0.32, partCount: 40, pomoMin: 25, auroraSpeed: 24, spotRadius: 320 },
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
        flow: false,                                    // «поток»: при долгом наборе фон плавно уходит сильнее
        // v16: новая пачка эффектов. Тонкие акцентные (findAccent/indentAccent/selectionMatch/
        // stickyGlass/glassCommand) включены по умолчанию — они лишь докрашивают уже видимые
        // элементы под палитру набора и совпадают по духу с уже включённым «стеклом». Заметно
        // меняющие поведение (dimInactive/minimapFade/reading) — по умолчанию выкл (opt-in).
        dimInactive: false,                             // тусклее неактивные группы редактора (фокус на активной)
        reading: false,                                 // режим чтения: фон редактора почти гаснет ради читаемости кода
        glassCommand: true,                             // матовое стекло палитры команд/автодополнения/подсказок
        findAccent: true,                               // акцент для виджета поиска/замены и подсветки совпадений
        minimapFade: false,                             // миникарта полупрозрачная (фон просвечивает сквозь неё)
        indentAccent: true,                             // акцент активной направляющей отступа и парной скобки
        selectionMatch: true,                           // подсветка совпадений выделенного слова акцентом
        stickyGlass: true,                              // матовое стекло закреплённой прокрутки (sticky scroll)
        // v18: живой фон + курсорные эффекты. Все три по умолчанию ВЫКЛ (opt-in): заметно
        // меняют вид/движение и стоят кадров (aurora/typingPulse — CSS-анимации, spotlight —
        // перерисовка полноэкранного градиента за курсором), поэтому включаются осознанно.
        aurora: false,                                  // «полярное сияние»: анимированный градиент-акцент за кодом
        spotlight: false,                               // радиальное затемнение вокруг курсора (фокус на месте правки)
        typingPulse: false                              // активная вкладка мягко пульсирует акцентом, пока идёт набор
    },
    // Стиль летящих частиц (fx.particles). Категориальный (не числовой) — санитизируется
    // по белому списку PART_STYLES. dots — прежнее поведение (кружки), остальные меняют
    // форму/направление отрисовки в loopParticles (см. widgets/extras.js).
    partStyle: "dots",
    // Только совместимые по метрикам Nerd-шрифты, чтобы не ломать выравнивание терминала
    term: {
        font: "JetBrainsMono NF", ligatures: true, glow: 2, weight: 400,
        cursorGlow: true, cursorColor: "#f5e0dc", selColor: "#585b70",
        cursorSize: 1,                                  // ширина курсора (scaleX): 0 — скрыть, 1 — обычный, до 2.5
        cursorHeight: 1                                 // высота курсора (scaleY): 1 — обычная, до 2.5
    },
    ui: { collapsed: {}, posX: null, posY: null, tab: 0 } // tab — активная вкладка панели (Набор/Вид/Терминал/Система)
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
    ["parallax", "Параллакс фона"], ["flow", "Поток (глубокий дим)"],
    ["dimInactive", "Тускнеть неактивные"], ["reading", "Режим чтения"],
    ["glassCommand", "Стекло палитры"], ["findAccent", "Акцент поиска"],
    ["minimapFade", "Миникарта сквозь"], ["indentAccent", "Акцент отступов"],
    ["selectionMatch", "Совпадения слова"], ["stickyGlass", "Стекло sticky"],
    ["aurora", "Aurora фон"], ["spotlight", "Спотлайт"], ["typingPulse", "Пульс печати"]
];

// Стили частиц (fx.particles): ключ + подпись. dots — прежние кружки; stars — искры-звёздочки;
// snow — падающие светлые снежинки; sakura — падающие лепестки (цвет акцента); bubbles — контуры-пузыри;
// firefly — всплывающие «светлячки» с пульсацией яркости; rain — падающие полосы-струи;
// confetti — падающие вращающиеся прямоугольники в трёх цветах палитры (acc + два спутника).
var PART_STYLES = [
    ["dots", "Точки"], ["stars", "Звёзды"], ["snow", "Снег"], ["sakura", "Сакура"], ["bubbles", "Пузыри"],
    ["firefly", "Светлячки"], ["rain", "Дождь"], ["confetti", "Конфетти"]
];
function safePartStyle(s) {
    for (var i = 0; i < PART_STYLES.length; i++) if (PART_STYLES[i][0] === s) return s;
    return "dots";
}

// ключ, подпись, min, max, step, знаков после запятой
var PARAMS = [
    ["blur", "Размытие стекла", 0, 20, 1, 0],
    ["kbScale", "Ken Burns масштаб", 1, 1.2, 0.01, 2],
    ["kbSpeed", "Ken Burns сек", 20, 120, 5, 0],
    ["vignette", "Виньетка сила", 0, 0.6, 0.02, 2],
    ["partCount", "Частиц", 0, 120, 5, 0],
    ["pomoMin", "Помидор, мин", 5, 60, 5, 0],
    ["auroraSpeed", "Aurora сек", 8, 60, 2, 0],
    ["spotRadius", "Спот радиус", 120, 600, 20, 0]
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
        // стиль частиц: только из белого списка PART_STYLES (иначе — дефолт "dots")
        if (typeof p.partStyle === "string") c.partStyle = safePartStyle(p.partStyle);
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
            // активная вкладка панели: неотрицательное целое (реальный верх зажмёт togglePanel
            // под число вкладок; здесь просто небольшой безопасный потолок против мусора)
            if (typeof p.ui.tab === "number" && isFinite(p.ui.tab)) c.ui.tab = Math.min(15, Math.max(0, Math.floor(p.ui.tab)));
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
