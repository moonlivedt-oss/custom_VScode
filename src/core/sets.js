// ===== Каталог наборов =====
// Набор — это источник фона плюс акцентный цвет интерфейса. Источников четыре: фотографии по
// зонам, вырез из мастер-кадра, процедурная текстура и шейдер. Здесь же санитизация записей
// (битая запись не должна ронять список) и пользовательские наборы из генератора, которые
// дописываются в конец каталога ДО загрузки конфига — иначе выбранный ген-набор не пережил бы
// перезапуск.

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
    { name: "Янтарь", grad: ["#1e1e2e", "#fab387", "#f9e2af"], accent: "#fab387" }, // 17
    // ===== Процедурные наборы (proc) — текстура рисуется на canvas в data-URL, БЕЗ картинок =====
    // Как grad, но не плоский градиент, а сгенерированная текстура (см. procTexture в css.js):
    // stars — звёздное поле, waves — волны-дюны, noise — плёночный грейн с искрами,
    // grid — техно-сетка с узлами, topo — топографические контуры, matrix — «дождь матрицы»,
    // cells — органическая сетка клеток (вороной-подобная). base — цвет подложки, accent —
    // акцент интерфейса и цвет деталей текстуры. Ноль ассетов.
    { name: "Звёздное поле", proc: "stars", base: "#0b0b16", accent: "#89b4fa" }, // 18
    { name: "Дюны",          proc: "waves", base: "#1e1e2e", accent: "#fab387" }, // 19
    { name: "Грейн",         proc: "noise", base: "#11111b", accent: "#a6e3a1" }, // 20
    { name: "Сетка",         proc: "grid",   base: "#0d1117", accent: "#89b4fa" }, // 21
    { name: "Топография",    proc: "topo",   base: "#10151f", accent: "#94e2d5" }, // 22
    { name: "Матрица",       proc: "matrix", base: "#0a0f0a", accent: "#a6e3a1" }, // 23
    { name: "Клетки",        proc: "cells",  base: "#141018", accent: "#cba6f7" }, // 24
    // ===== Наборы одной мастер-картинкой (master + crop) — v20 =====
    // Один кадр 21:9 на весь набор: редактор берёт спокойную правую часть, сайдбар — узкую
    // полосу с сюжетом слева, панель — нижнюю ленту. Втрое меньше файлов, чем у наборов с
    // тремя картинками, и зоны гарантированно одной палитры (это буквально один кадр).
    // Кадры и вырезы подготовлены scripts/import-master.js: он же измерил акцент (OKLab) и
    // подсказал, какая половина кадра спокойнее для кода.
    // op — стартовая прозрачность зон ДЛЯ ЭТОГО набора: у светлых кадров (туман, лёд) она
    // ниже, иначе поверх них хуже читается код. Пользовательская настройка её перекрывает.
    { name: "Неоновый дождь", master: "assets/sets/neonovyy-dozhd.jpg", accent: "#94b9f1",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 25
    { name: "Свечной зал", master: "assets/sets/svechnoy-zal.jpg", accent: "#e4a97e",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 26
    { name: "Сияние фьорда", master: "assets/sets/siyanie-forda.jpg", accent: "#7bc1e8",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 27
    { name: "Дюны под звёздами", master: "assets/sets/dyuny-pod-zvezdami.jpg", accent: "#f3a173",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 28
    { name: "Бамбук в тумане", master: "assets/sets/bambuk-v-tumane.jpg", accent: "#83c9a3",
      op: { editor: 0.045, side: 0.20, panel: 0.08 },
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 29
    { name: "Сакура у фонаря", master: "assets/sets/sakura-u-fonarya.jpg", accent: "#c5a9e6",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 30
    { name: "Ледяная пещера", master: "assets/sets/ledyanaya-peschera.jpg", accent: "#7bc1ed",
      op: { editor: 0.04, side: 0.18, panel: 0.07 },
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 31
    { name: "Кровавая луна", master: "assets/sets/krovavaya-luna.jpg", accent: "#eca19d",
      crop: { editor: [44, 0, 56, 100], sidebar: [0, 0, 16, 100], panel: [0, 78, 100, 22] } },      // 32
    // ===== Шейдерные наборы (shader) — кадр считает GPU, ноль ассетов =====
    // Как proc, но текстура не рисуется один раз на canvas, а пересчитывается на видеокарте
    // ~30 раз в секунду: фон медленно течёт и дышит. Холст живёт в зоне редактора; сайдбар и
    // панель показывают спокойный градиент той же палитры (см. shaderBg в css.js). Если
    // WebGL недоступен, потерян контекст или включено «уменьшить движение» — набор молча
    // становится обычным градиентным, ничего не ломая.
    { name: "Сияние GPU",   shader: "aurora", base: "#0b1020", accent: "#89b4fa" }, // 33
    { name: "Плазма",       shader: "plasma", base: "#12101c", accent: "#cba6f7" }, // 34
    { name: "Туманность",   shader: "nebula", base: "#0d1117", accent: "#94e2d5" }, // 35
    // «Свой шейдер» — рисует GLSL из cfg.shaderSrc (панель: Набор → Шейдер). Пока код не
    // задан или не компилируется, показывает встроенное «Сияние»: набор никогда не пустой.
    { name: "Свой шейдер",  shader: "custom", base: "#11111b", accent: "#89b4fa" }  // 36
];
// Короткое имя набора по индексу (для статусбара/тултипов). Приоритет — имя,
// заданное пользователем в панели (cfg.setName[idx]), затем «родное» имя из SETS,
// иначе пустая строка. cfg к моменту вызова уже есть (функция зовётся из рантайма UI).
function setName(idx) {
    var o = (typeof cfg !== "undefined" && cfg.setName) ? cfg.setName[idx] : null;
    if (typeof o === "string" && o) return o;
    var s = SETS[idx]; return (s && s.name) ? s.name : "";
}

// ===== Санитайзер наборов (защита рантайма от сломанной РУЧНОЙ правки массива SETS) =====
// Частый сценарий: пользователь лезет в исходник, добавляет/меняет набор и ошибается —
// битый цвет, grad не массивом, лишний proc, пропущенное поле. Без страховки одна опечатка
// роняла бы весь фон. Нормализуем КАЖДУЮ запись (имя/акцент/тип) и гарантируем непустой
// валидный массив: неисправимые записи отбрасываются, а если валидных не осталось —
// подставляем один безопасный градиентный набор. Дубликат белого списка proc — намеренно
// локальный (config не знает про css.js); поля-строки картинок оставляем как есть (их
// разрешение и проверка сети — уже в imgAllowed/imgUrl).
var PROC_KINDS = { stars: 1, waves: 1, noise: 1, grid: 1, topo: 1, matrix: 1, cells: 1 };

// Белый список шейдерных наборов. Держим здесь, а не в src/fx/shader.js: санитайзер
// наборов работает на этапе загрузки config.js, когда модуль шейдеров ещё не выполнился.
// "custom" — пользовательский GLSL из cfg.shaderSrc.
var SHADER_KINDS = { aurora: 1, plasma: 1, nebula: 1, custom: 1 };
// Нормализация ОДНОЙ записи набора (общая для sanitizeSets и sanitizeUserSets/addGenSet).
// Возвращает чистый объект (имя/акцент/тип строго проверены) или null — если это не объект.
// Поля-строки картинок оставляем как есть (их разрешение и проверка сети — в imgAllowed/imgUrl).
function _normSetEntry(s, fallbackName) {
    if (!s || typeof s !== "object") return null;
    var e = {};
    e.name = (typeof s.name === "string" && s.name) ? s.name.slice(0, 60) : fallbackName;
    e.accent = isColor(s.accent) ? s.accent : DEFAULT_ACCENT;
    if (Array.isArray(s.grad)) { var g = []; for (var k = 0; k < s.grad.length; k++) if (isColor(s.grad[k])) g.push(s.grad[k]); if (g.length >= 2) e.grad = g; }
    if (typeof s.proc === "string" && PROC_KINDS[s.proc]) { e.proc = s.proc; e.base = isColor(s.base) ? s.base : "#181825"; }
    // Шейдерный набор: имя из белого списка + цвет подложки. Сам GLSL живёт в
    // src/fx/shader.js (или в cfg.shaderSrc для «своего» шейдера) — сюда попадает только ключ.
    if (typeof s.shader === "string" && SHADER_KINDS[s.shader]) { e.shader = s.shader; e.base = isColor(s.base) ? s.base : "#11111b"; }
    // Набор одной мастер-картинкой: master + вырезы зон в процентах кадра.
    if (typeof s.master === "string" && s.master && s.crop && typeof s.crop === "object") {
        var cr = {}, zk = ["editor", "sidebar", "panel"], zi, r, j, okRect;
        for (zi = 0; zi < zk.length; zi++) {
            r = s.crop[zk[zi]];
            if (Object.prototype.toString.call(r) !== "[object Array]" || r.length !== 4) continue;
            okRect = true;
            for (j = 0; j < 4; j++) if (typeof r[j] !== "number" || !isFinite(r[j]) || r[j] < 0 || r[j] > 100) okRect = false;
            if (okRect && r[2] > 0 && r[3] > 0) cr[zk[zi]] = [r[0], r[1], r[2], r[3]];
        }
        if (cr.editor || cr.sidebar || cr.panel) { e.master = s.master; e.crop = cr; }
    }
    // Стартовая прозрачность зон конкретного набора: светлым кадрам нужна меньшая.
    // Это ДЕФОЛТ, а не настройка пользователя: cfg.setOp[idx] по-прежнему главнее.
    if (s.op && typeof s.op === "object") {
        var op = {}, ok2 = ["editor", "side", "panel"], oi, ov;
        for (oi = 0; oi < ok2.length; oi++) {
            ov = s.op[ok2[oi]];
            if (typeof ov === "number" && isFinite(ov) && ov >= 0 && ov <= 1) op[ok2[oi]] = ov;
        }
        if (op.editor != null || op.side != null || op.panel != null) e.op = op;
    }
    if (typeof s.editor === "string" && s.editor) e.editor = s.editor;
    if (typeof s.sidebar === "string" && s.sidebar) e.sidebar = s.sidebar;
    if (typeof s.panel === "string" && s.panel) e.panel = s.panel;
    return e;
}
// Есть ли у записи хоть один источник для отрисовки (иначе зона была бы пустой).
function _setRenderable(e) { return !!(e && (e.grad || e.proc || e.shader || e.master || e.editor || e.sidebar || e.panel)); }
function sanitizeSets(list) {
    var out = [];
    if (Array.isArray(list)) {
        for (var i = 0; i < list.length; i++) {
            var e = _normSetEntry(list[i], "Набор " + out.length);
            if (e) out.push(e);
        }
    }
    if (!out.length) out.push({ name: "По умолчанию", grad: ["#1e1e2e", "#89b4fa", "#94e2d5"], accent: "#89b4fa" });
    return out;
}
// Пользовательские (сгенерированные) наборы: как sanitizeSets, но БЕЗ подстановки дефолта
// для пустого списка и с жёстким лимитом числа записей (защита от раздутого/подменённого
// конфига). Пропускаем только реально отрисовываемые записи.
var GEN_MAX = 24;
function sanitizeUserSets(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length && out.length < GEN_MAX; i++) {
        var e = _normSetEntry(list[i], "Мой набор " + (out.length + 1));
        if (_setRenderable(e)) out.push(e);
    }
    return out;
}
// Сколько записей отбросил санитайзер (битые) — показываем в диагностике, чтобы правку было
// видно, а не «молча пропал набор».
var SETS_DROPPED = (function () {
    var before = Array.isArray(SETS) ? SETS.length : 0;
    SETS = sanitizeSets(SETS);
    return Math.max(0, before - SETS.length);
})();

// ===== Сгенерированные наборы (по seed/палитре) =====
// Пользователь создаёт согласованный набор из seed-строки или базового цвета (genSetFromSeed
// в css.js). Такие наборы хранятся в cfg.genSets и ДОЗАГРУЖАЮТСЯ в хвост SETS при старте —
// ПЕРЕД loadCfg(), чтобы санитизация mode/setOp/workspaceSets (проверка индекса < SETS.length)
// уже учитывала их и выбранный сгенерированный набор переживал перезапуск.
// GEN_BASE — индекс первого сгенерированного набора (граница «встроенные | пользовательские»).
var GEN_BASE = SETS.length;
(function _appendGenSets() {
    try {
        var raw = localStorage.getItem(CFG_KEY);
        if (!raw || raw.length > 256 * 1024) return;
        var p = safeParse(raw);
        var us = (p && typeof p === "object") ? sanitizeUserSets(p.genSets) : [];
        for (var i = 0; i < us.length; i++) SETS.push(us[i]);
    } catch (e) {}
})();

// Добавить один сгенерированный набор: нормализуем, кладём и в cfg.genSets (сохранится),
// и в хвост SETS (виден сразу). Возвращает индекс нового набора или -1 (мусор) / -2 (лимит).
function addGenSet(s) {
    var e = _normSetEntry(s, "Мой набор " + (cfg.genSets.length + 1));
    if (!_setRenderable(e)) return -1;
    if (cfg.genSets.length >= GEN_MAX) return -2;
    cfg.genSets.push(e);
    SETS.push(e);
    return SETS.length - 1;
}
// Убрать ВСЕ сгенерированные наборы (они всегда в хвосте, поэтому обрезаем SETS до GEN_BASE).
// Чистим привязки к удалённым индексам (яркость/акцент/имя/картинки/выбранный набор), чтобы
// не осталось «висячих» ссылок на несуществующие наборы.
function removeGenSets() {
    SETS.length = GEN_BASE;
    cfg.genSets = [];
    [cfg.setOp, cfg.setAccent, cfg.setName, cfg.setImg].forEach(function (o) {
        if (o) for (var k in o) if (/^\d+$/.test(k) && parseInt(k, 10) >= SETS.length) delete o[k];
    });
    // карты «контекст -> индекс набора» (проект/ветка/язык): выкинуть висячие ссылки на удалённые наборы
    [cfg.workspaceSets, cfg.branchSets, cfg.langSets].forEach(function (m) {
        if (m) for (var mk in m) { var mv = m[mk]; if (typeof mv === "string" && parseInt(mv, 10) >= SETS.length) delete m[mk]; }
    });
    var mi = parseInt(cfg.mode, 10);
    if (!isNaN(mi) && mi >= SETS.length) cfg.mode = "0";
}
// Пересобрать хвост SETS из cfg.genSets. Нужно после ПОЛНОЙ подмены cfg (импорт файла,
// применение пресета, восстановление из резерва, применение кода образа, сброс к дефолту):
// _appendGenSets дозагружает сгенерированные наборы только на СТАРТЕ (из localStorage, до
// создания cfg), поэтому без этого импортированные ген-наборы не появлялись бы в списке до
// перезапуска, а сброшенные — наоборот, висели бы в SETS. Обрезаем до встроенных (GEN_BASE),
// нормализуем cfg.genSets тем же санитайзером и дозагружаем; затем чистим mode, если он указывал
// на исчезнувший набор. Идемпотентна: повторный вызов при неизменном cfg ничего не ломает.
function syncGenSets() {
    SETS.length = GEN_BASE;
    var us = sanitizeUserSets(cfg.genSets || []);
    cfg.genSets = us; // нормализованная форма — та же, что уйдёт в localStorage
    for (var i = 0; i < us.length; i++) SETS.push(us[i]);
    var mi = parseInt(cfg.mode, 10);
    if (!isNaN(mi) && mi >= SETS.length) cfg.mode = "0";
}
