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
// Хвост заголовка окна — имя приложения. Поддерживаем не только «Visual Studio Code», но и
// популярные форки (Cursor, VSCodium, Windsurf, Code - OSS): у них тот же движок и та же
// разметка, меняется лишь подпись в конце заголовка. Срезаем любой из этих хвостов, чтобы
// «фон по проекту» работал и в форках. Порядок не важен — совпадает первый подходящий.
var APP_TITLE_RE = /\s*[—\-]\s*(?:Visual Studio Code|Code - OSS|VSCodium|Cursor|Windsurf)\s*$/i;
function workspaceName() {
    try {
        var t = (document.title || "").trim();
        if (!t) return "";
        t = t.replace(APP_TITLE_RE, "").trim();
        var parts = t.split(/\s+[—\-]\s+/); // сегменты, разделённые тире с пробелами
        var name = parts.length ? parts[parts.length - 1] : t;
        name = name.replace(/[●•*]/g, "").trim().slice(0, 120); // убрать маркер несохранённого
        // Учёт «здоровья» скрейпа имени проекта: если заголовок VS Code сменит формат и мы
        // перестанем извлекать имя, диагностика это покажет (см. scrape.js / scrapeHealth).
        if (typeof scrapeMark === "function") scrapeMark("workspace", !!name);
        return name;
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
// Набор, закреплённый за текущей git-веткой (cfg.branchSets[ветка]), если «фон по ветке»
// включён. gitBranch() объявлена в boot.js — в общей области видимости IIFE она доступна из
// рантайма (activeIndex зовётся уже после сборки). null — тогда идём дальше по приоритету.
function branchIndex() {
    if (!cfg.autoBranch) return null;
    var b = (typeof gitBranch === "function") ? gitBranch() : "";
    var v = (b && cfg.branchSets) ? cfg.branchSets[b] : null;
    if (typeof v === "string" && /^\d+$/.test(v)) { var i = parseInt(v, 10); if (i >= 0 && i < SETS.length) return i; }
    return null;
}
// Набор, закреплённый за расширением активного файла (cfg.langSets[ext]), если «фон по языку»
// включён. editorFileExt() объявлена в scrape.js (доступна из рантайма через область IIFE).
function langIndex() {
    if (!cfg.autoLang) return null;
    var e = (typeof editorFileExt === "function") ? editorFileExt() : "";
    var v = (e && cfg.langSets) ? cfg.langSets[e] : null;
    if (typeof v === "string" && /^\d+$/.test(v)) { var i = parseInt(v, 10); if (i >= 0 && i < SETS.length) return i; }
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
    // Контекстные приоритеты (все opt-in): проект важнее ветки, ветка важнее языка файла,
    // всё это важнее mode/слайдшоу/времени суток. Так при одновременном включении «побеждает»
    // более осознанный контекст (закреплённый проект), а язык файла — самый частый и низший.
    var wi = workspaceIndex();
    if (wi !== null) return wi;
    var bi = branchIndex();
    if (bi !== null) return bi;
    var li = langIndex();
    if (li !== null) return li;
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
    // Приоритет: правка пользователя для этого набора -> стартовая прозрачность самого
    // набора (SETS[idx].op — у светлых кадров она ниже, чтобы код читался) -> общая baseOp.
    var d = (SETS[idx] && SETS[idx].op) || {};
    function pick(k) {
        if (typeof o[k] === "number") return o[k];
        if (typeof d[k] === "number") return d[k];
        return cfg.baseOp[k];
    }
    return { editor: pick("editor"), side: pick("side"), panel: pick("panel") };
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
    // Пусто -> пусто. У наборов без картинок (шейдерные, генеративные) зона не имеет файла, и
    // раньше пустой путь склеивался с базой в адрес ПАПКИ плагина: браузер честно пытался
    // загрузить её как картинку, получал ошибку, и чип набора помечался красным «не грузится».
    if (!rel) return "";
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
    var s = SETS[idx];
    if (s && s[zone]) return s[zone];
    // Набор одной мастер-картинкой: у зон нет своих файлов — все три берут один кадр
    // и различаются вырезом (s.crop, см. cropBg в css.js). Один файл вместо трёх: втрое
    // меньше веса и гарантированно единая палитра всех зон.
    if (s && s.master && s.crop && s.crop[zone]) return s.master;
    return "";
}
// Готовый абсолютный URL картинки зоны (переопределение -> resolve).
function zoneUrl(idx, zone) { return imgUrl(setImage(idx, zone)); }
