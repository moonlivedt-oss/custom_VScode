// ============================================================
//  MoonLight custom-bg — СОБРАННЫЙ ФАЙЛ. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ!
//  Исходники: src/**   |   Пересборка: node build.js
//  Грузится через vscode_custom_css.imports (be5invis.vscode-custom-css).
// ============================================================
(function () {
    "use strict";

    if (window.__MLBG_RUNNING__) {
        try { console.warn("[MoonLight custom-bg] уже запущен (" + window.__MLBG_RUNNING__ + "), второй экземпляр пропущен"); } catch (e) {}
        return;
    }
    window.__MLBG_RUNNING__ = (document.currentScript && document.currentScript.getAttribute && document.currentScript.getAttribute("data-mooncore-module")) ? "moon-core" : "loader";

    // ===================== src/core/util.js =====================
    // ===== Журнал ошибок =====
    // Раньше ошибки в самолечении, виджетах и сборке стиля глотались пустым catch: когда что-то
    // ломалось, узнать об этом было нельзя. Теперь каждая РАЗНАЯ ошибка один раз уходит в консоль
    // DevTools и (через Moon Core) в журнал «Moon Core» в Output, а последние лежат в errLog для
    // «Системы → Диагностики». Повторы только считаются: самолечение крутится раз в 3 с, и одна
    // и та же поломка иначе забила бы журнал.
    var ERR_MAX = 50;          // разных ошибок за сессию (дальше — только счёт)
    var ERR_KEEP = 20;         // сколько последних держим для диагностики
    var errLog = [];           // [{ where, msg, t, n }]
    var _errByKey = {}, _errTotal = 0;
    function logErr(where, e) {
        try {
            var w = String(where || "").slice(0, 80);
            var msg = String((e && e.message) || e).slice(0, 300);
            var key = w + "|" + msg;
            _errTotal++;
            if (_errByKey[key]) { _errByKey[key].n++; return; }
            if (errLog.length + 1 > ERR_KEEP) errLog.shift();
            if (Object.keys(_errByKey).length >= ERR_MAX) return;
            var rec = { where: w, msg: msg, t: Date.now(), n: 1 };
            _errByKey[key] = rec;
            errLog.push(rec);
            try { console.warn("[MoonLight custom-bg] " + w + ":", e); } catch (e2) {}
            var m = (typeof mooncoreModule === "function") ? mooncoreModule() : null;
            if (m && typeof m.log === "function") m.log(w, e);
        } catch (e3) {}
    }
    // Сколько ошибок всего (с повторами) — для диагностики.
    function errTotal() { return _errTotal; }

    // ===== Общие утилиты и санитизация значений =====
    // Всё внешнее (localStorage, импортированный файл, код «Поделиться», настройка компаньона)
    // проходит через эти проверки, прежде чем попасть в конфиг или в CSS: значение принимается,
    // только если оно нужного типа и в известном диапазоне. Иначе подменённый JSON мог бы
    // вырваться из font-family:'...' и дописать в стиль свои правила.
    // Запасной акцент: используется и как значение по умолчанию в конфиге, и при санитизации
    // набора без своего цвета. Отдельной константой, потому что каталог наборов собирается
    // раньше, чем объявлены DEFAULTS.
    var DEFAULT_ACCENT = "#cba6f7";
    var COLOR_RE = /^#[0-9a-fA-F]{6}$/;
    function isColor(s) { return typeof s === "string" && COLOR_RE.test(s); }
    function clampNum(v, min, max, def) {
        v = typeof v === "number" ? v : parseFloat(v);
        if (!isFinite(v)) return def;
        return Math.min(max, Math.max(min, v));
    }
    function safeColor(c, fallback) { return isColor(c) ? c : fallback; }
    // База картинок (папка плагина). Уходит в url('...') через cssUrl (кавычки/слэши/переводы
    // строк экранируются — CSS-инъекция невозможна), поэтому здесь только приводим к единому
    // виду: убираем переводы строк, ограничиваем длину, дописываем завершающий слэш. Пусто
    // (или не строка) -> "" — тогда imgBase() возьмёт авто-определённый IMG.
    function safeBase(s) {
        if (typeof s !== "string") return "";
        var b = s.trim().replace(/[\r\n]/g, "").slice(0, 512);
        if (!b) return "";
        // Путь к папке не содержит кавычек, скобок, точек с запятой и фигурных скобок. Если они
        // есть — это не путь, а попытка дописать что-то в CSS: отбрасываем целиком. Вырваться из
        // url('...') не даёт экранирование в cssUrl, это второй рубеж (подсказал фаззер конфига).
        if (/["'();{}<>]/.test(b)) return "";
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
    // VS Code отклоняет в окне любой запрос file:// (в журнале: «Refused to load resource ... from
    // file: protocol») и отдаёт локальные файлы только как vscode-file://vscode-app/<путь>. Поэтому
    // картинки из диалога выбора (компаньон отдаёт file:///), библиотека и «Папка плагина» в виде
    // file:/// в настоящем VS Code не грузились. Меняем только схему; вне оболочки (стенд, тесты
    // по http) адрес не трогаем.
    function appFileUrl(u) {
        if (typeof u !== "string") return u;
        var m = /^file:\/\/(?:localhost)?\/(.*)$/i.exec(u);
        if (!m || typeof location === "undefined" || !location || location.protocol !== "vscode-file:") return u;
        return "vscode-file://vscode-app/" + m[1];
    }
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

    // ===== Конфиг: слияние с дефолтами + санитизация =====
    var CFG_KEY = "moonlight-bg-config", LAST_KEY = "moonlight-bg-last", BACKUP_KEY = "moonlight-bg-backup";
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

    // ===================== src/core/sets.js =====================
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

    // ===== Moon Core =====
    // Плагин может быть встроен ядром Moon Core как модуль "mlbg": тогда тег скрипта помечен
    // data-mooncore-module, а ядро выдаёт помощника с адресом папки ресурсов (base) и каналом к
    // расширению-компаньону. currentScript есть только пока скрипт выполняется синхронно —
    // поэтому признак снимаем сразу при загрузке.
    var MOONCORE_ID = "mlbg";
    var _viaMoonCore = (function () {
        try {
            var s = /** @type {HTMLScriptElement} */ (document.currentScript);
            return !!(s && s.getAttribute && s.getAttribute("data-mooncore-module") === MOONCORE_ID);
        } catch (e) { return false; }
    })();
    // Помощник модуля от Moon Core или null (ядра нет / модуль не встроен им).
    function mooncoreModule() {
        try {
            var mc = (typeof window !== "undefined") ? window.__MOONCORE__ : null;
            var m = (mc && typeof mc.module === "function") ? mc.module(MOONCORE_ID) : null;
            return (m && typeof m === "object") ? m : null;
        } catch (e) { return null; }
    }
    // Запрос к компаньону через Moon Core: Promise<result>. Нет Moon Core/компаньона — reject с
    // понятной причиной (UI покажет её тостом).
    /** @returns {Promise<any>} */
    function mlbgRpc(method, body) {
        var m = mooncoreModule();
        if (!m || typeof m.rpc !== "function") return Promise.reject(new Error("нужен Moon Core и компаньон-расширение"));
        return m.rpc(method, body || null).then(function (r) {
            if (r && r.ok) return r.result;
            throw new Error(String((r && r.error) || "расширение не ответило"));
        });
    }
    // Папка ресурсов от Moon Core: только локальные схемы и со слэшем на конце.
    function mooncoreBase() {
        var m = mooncoreModule();
        var b = (m && typeof m.base === "string") ? m.base : "";
        if (!/^(?:vscode-file|file):\/\//i.test(b)) return "";
        return /\/$/.test(b) ? b : b + "/";
    }

    var IMG = (function () {
        try {
            var src = (/** @type {HTMLScriptElement} */ (document.currentScript) || {}).src || "";
            var i = src.lastIndexOf("/");
            if (i >= 0) return src.slice(0, i + 1); // .../vscode-bg/custom-bg.js -> .../vscode-bg/
        } catch (e) {}
        // Инлайн-внедрение: адрес скрипта неизвестен. Moon Core знает папку модуля точно;
        // иначе — заданный путь (а поверх него «Папка плагина» из панели, см. imgBase).
        return mooncoreBase() || IMG_FALLBACK;
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
    /**
     * Запись каталога наборов. Обязательны только name и accent; источник фона — ровно один из:
     * фотографии по зонам (editor/sidebar/panel), мастер-кадр с вырезами (master + crop),
     * градиент (grad), процедурная текстура (proc + base) или шейдер (shader + base).
     * @typedef {Object} MlbgSet
     * @property {string} name           подпись набора в панели и на кнопке BG
     * @property {string} [accent]       акцент интерфейса для этого набора (#rrggbb)
     * @property {string} [editor]       путь картинки зоны редактора
     * @property {string} [sidebar]      путь картинки сайдбара
     * @property {string} [panel]        путь картинки нижней панели
     * @property {string} [master]       один кадр на весь набор; зоны берут из него вырезы
     * @property {Object.<string, number[]>} [crop] вырезы зон в процентах кадра: [x, y, w, h]
     * @property {string[]} [grad]       палитра для градиентного набора (2+ цвета)
     * @property {string} [proc]         вид процедурной текстуры (см. PROC_KINDS)
     * @property {string} [shader]       вид шейдера (см. SHADER_KINDS)
     * @property {string} [base]         цвет подложки для proc/shader
     * @property {Object.<string, number>} [op] стартовая прозрачность зон именно этого набора
     */

    /** @type {MlbgSet[]} */
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
    /**
     * Привести запись набора к безопасному виду: пропускаем только известные поля известных
     * типов, всё остальное отбрасываем. Через эту функцию проходят и встроенные наборы, и
     * пользовательские из генератора/импорта.
     * @param {*} s сырая запись
     * @param {string} fallbackName имя, если своего нет
     * @returns {MlbgSet|null} null — если это вообще не объект
     */
    function _normSetEntry(s, fallbackName) {
        if (!s || typeof s !== "object") return null;
        /** @type {MlbgSet} */
        var e = { name: "" };
        e.name = (typeof s.name === "string" && s.name) ? s.name.slice(0, 60) : fallbackName;
        e.accent = isColor(s.accent) ? s.accent : DEFAULT_ACCENT;
        if (Array.isArray(s.grad)) { /** @type {string[]} */ var g = []; for (var k = 0; k < s.grad.length; k++) if (isColor(s.grad[k])) g.push(s.grad[k]); if (g.length >= 2) e.grad = g; }
        if (typeof s.proc === "string" && PROC_KINDS[s.proc]) { e.proc = s.proc; e.base = isColor(s.base) ? s.base : "#181825"; }
        // Шейдерный набор: имя из белого списка + цвет подложки. Сам GLSL живёт в
        // src/fx/shader.js (или в cfg.shaderSrc для «своего» шейдера) — сюда попадает только ключ.
        if (typeof s.shader === "string" && SHADER_KINDS[s.shader]) { e.shader = s.shader; e.base = isColor(s.base) ? s.base : "#11111b"; }
        // Набор одной мастер-картинкой: master + вырезы зон в процентах кадра.
        if (typeof s.master === "string" && s.master && s.crop && typeof s.crop === "object") {
            /** @type {Object.<string, number[]>} */
            var cr = {};
            var zk = ["editor", "sidebar", "panel"], zi, r, j, okRect;
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
            /** @type {Object.<string, number>} */
            var op = {};
            var ok2 = ["editor", "side", "panel"], oi, ov;
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

    // ===================== src/core/config.js =====================


    // ===== Дефолты =====
    // CFG_VERSION — версия схемы конфига. Растёт, когда меняется структура DEFAULTS так,
    // что старый сохранённый конфиг нужно осознанно доработать (см. migrateCfg).
    var CFG_VERSION = 1;
    // APP_VERSION — отображаемая версия релиза (единый номер v14, v15, …), она же в package.json.
    // Держим здесь одной строкой, чтобы баннер в консоли (boot.js) и диагностика (io.js) брали
    // её из одного места, а не хардкодили порознь. При релизе меняется тут + в package.json.
    var APP_VERSION = "v20";
    var DEFAULTS = {
        version: CFG_VERSION,
        enabled: true,                                      // мастер-выключатель: false — фон и эффекты выключены, настройки сохранены
        lang: "auto",                                       // язык интерфейса панели: "auto" (по языку VS Code) | "ru" | "en"
        perfGuard: true,                                    // авто-бюджет производительности: при низком FPS приглушать тяжёлые эффекты
        imgBase: "",                                      // папка плагина для картинок; пусто — авто-определение (IMG). Переносимость без правки кода.
        allowRemoteImages: false,                           // разрешить http(s)-картинки. По умолчанию выкл: чужой конфиг не заставит редактор ходить в сеть.
        mode: "0",
        baseOp: { editor: 0.06, side: 0.30, panel: 0.11 },
        setOp: {},
        accent: DEFAULT_ACCENT,                             // глобальный акцент (запасной, если у набора нет своего)
        autoWorkspace: false,                               // фон по проекту: набор выбирается по имени открытой папки
        workspaceSets: {},                                  // закреплённые наборы по проектам: { "имя папки": "индекс" }
        autoBranch: false,                                  // фон по git-ветке: набор выбирается по имени текущей ветки
        branchSets: {},                                     // закреплённые наборы по веткам: { "имя ветки": "индекс" }
        autoRemote: false,                                  // фон по удалённому репозиторию (владелец/имя) — нужны живые данные компаньона
        remoteSets: {},                                     // закреплённые наборы по репозиториям: { "owner/repo": "индекс" }
        autoLang: false,                                    // фон по языку/расширению активного файла
        langSets: {},                                       // закреплённые наборы по расширениям: { "js": "индекс", "py": "индекс" }
        ambientBranch: false,                               // тонкая полоска-индикатор ветки git (main -> красная, фича -> зелёная)
        setAccent: {},                                      // переопределение акцента конкретного набора: { idx: "#rrggbb" }
        setName: {},                                        // пользовательское имя набора: { idx: "строка" }
        setImg: {},                                         // свои картинки набора по зонам: { idx: { editor?, sidebar?, panel? } }
        setPos: {},                                         // точка фокуса картинки по зонам: { idx: { editor?: "40% 60%", ... } }
        libraryDir: "",                                     // папка-источник библиотеки: при старте перечитывается (новые картинки подхватываются)
        genSets: [],                                        // сгенерированные наборы (по seed/палитре): дозагружаются в хвост SETS
        shaderSrc: "",                                      // свой GLSL для шейдерного набора «Свой шейдер»; пусто — встроенный

        autoDim: true,                                      // авто-занижение яркости editor под светлые картинки (читаемость кода)
        fit: { editor: "cover", side: "cover", panel: "cover" }, // вписывание фоновой картинки по зонам: cover | contain
        // фильтры самой фоновой картинки — отдельно по зонам (редактор / сайдбар / панель)
        imgfx: {
            editor: { brightness: 1.0, saturate: 1.0, blur: 0 },
            side:   { brightness: 1.0, saturate: 1.0, blur: 0 },
            panel:  { brightness: 1.0, saturate: 1.0, blur: 0 }
        },
        slideshow: { on: false, min: 15 },                  // авто-смена набора по таймеру
        library: [],                                        // своя библиотека картинок (локальные пути) для слайдшоу в редакторе
        librarySlideshow: false,                            // крутить картинки из library в зоне редактора по таймеру слайдшоу
        screensaver: { on: false, min: 5 },                 // витрина/скринсейвер при простое: часы + набор поверх экрана
        // авто-набор по времени суток: днём — свой набор, ночью — свой. Границы дня настраиваются
        // (from/to, часы 0–23); поддерживается «через полночь» (to < from). mode: "hours" — по
        // фиксированным часам; "sun" — по реальному рассвету/закату для координат lat/lon (без сети,
        // считается локально из даты; при "sun" from/to игнорируются). lat/lon — широта/долгота.
        autoTime: { on: false, day: 0, night: 4, from: 8, to: 20, mode: "hours", lat: 0, lon: 0 },
        fxp: { blur: 8, kbScale: 1.08, kbSpeed: 60, vignette: 0.32, partCount: 40, pomoMin: 25, auroraSpeed: 24, spotRadius: 320, tintStrength: 0.18 },
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
            typingPulse: false,                             // активная вкладка мягко пульсирует акцентом, пока идёт набор
            // v19: тон/читаемость/реакция на ошибки. Все opt-in (заметно меняют вид или стоят
            // чтения DOM). tint — полноэкранная тонировка воркбенча в акцент (duotone); legible —
            // мягкая тень глифов кода для читаемости поверх картинки (НЕ трогает метрики Monaco,
            // поэтому курсор не сдвигается); errorReact — мягкая красная реакция при ошибках в коде.
            tint: false,                                    // тонировать весь воркбенч акцентом (mix-blend overlay)
            legible: false,                                 // тень глифов кода ради читаемости над фоном (без сдвига курсора)
            errorReact: false,                              // мягкая красная подсветка статусбара, когда в коде есть ошибки
            // v20: сценарии/доступность. present — «презентационный» режим (стрим/скринкаст/курс):
            // прячет визуальный шум (хлебные крошки, миникарта, экшены редактора) и крупнее/ярче
            // подаёт акценты. highContrast — a11y: плотная тень под кодом и подписями панелей +
            // толще фокус-обводка ради читаемости поверх картинки. Оба opt-in.
            present: false,                                 // режим Present: спокойный фон, крупнее акценты, скрыть шум
            highContrast: false,                            // контраст+: усиленная читаемость текста и фокуса (a11y)
            // Фокус-сессия: модификатор «Помидора». Пока идёт таймер (body.mlbg-focus), гасит
            // отвлекающее — неактивные группы/вкладки, миникарту, хлебные крошки — и приглушает
            // сайдбар/актив-бар/панель, чтобы взгляд держался на активном редакторе. Работает
            // ТОЛЬКО при включённом и запущенном «Помидоре»; на паузе/по завершении фокус спадает.
            focusSession: false,                            // затемнить всё, кроме активного файла, на время сессии
            // v21: «живой» фон + анимации интерфейса + акрил. Все opt-in (движение/размытие стоят
            // кадров или заметно меняют вид). liveBg — медленный пан фоновых градиентных/процедурных
            // зон (для фото-наборов уже есть Ken Burns/параллакс). uiAnim — плавные появления палитры
            // команд/подсказок, переходы вкладок/списков/тостов. acrylic — усиленное «матовое стекло»
            // на весь воркбенч (эстетика Acrylic/Mica; настоящая прозрачность до рабочего стола —
            // только через отдельное расширение vibrancy, см. подсказку).
            liveBg: false,                                  // «живой фон»: медленный пан градиентных/процедурных наборов
            uiAnim: false,                                  // анимации интерфейса: появление палитры/подсказок, вкладки, списки, тосты
            acrylic: false,                                 // акрил: усиленное матовое стекло на весь воркбенч
            cursorTrail: false,                             // шлейф курсора: тающий след за указателем мыши (canvas, v21)
            pet: false,                                     // питомец-компаньон: канвас-маскот в углу, реагирует на печать/ошибки
            stats: false,                                   // статистика сессии в статусбаре: время, файлы, нажатия, стрик потока
            // v20: движок читаемости и настоящая прозрачность.
            // autoRead — адаптивный скрим: фон гасится ТОЧЕЧНО в тех местах кадра, где он
            // светлее комфортного порога (карта яркости 8x8 из probeImage), а не целиком
            // ползунком. Включён по умолчанию: он только улучшает читаемость и почти ничего
            // не стоит (несколько CSS-градиентов, считается один раз на картинку).
            autoRead: true,
            // trueGlass — настоящая прозрачность до рабочего стола (Mica/Acrylic). Работает
            // только когда окно VS Code создано прозрачным (загрузчик custom-ui-style с
            // опциями Electron, см. панель «Стекло → Настоящая прозрачность»). Без этого
            // включение даст просто более прозрачные поверхности внутри окна. Opt-in.
            trueGlass: false
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
        // ui.hidden — скрытые секции панели (ключ — русский заголовок секции, как в collapsed);
        // ui.hiddenFx — скрытые эффекты в сетке «Эффекты» (ключ — key из FX_LIST). Настраивается в
        // «Система → Настройка меню» и кнопкой «скрыть» в режиме редактирования меню.
        // ui.favSec / ui.favFx — «Избранное»: закреплённые наверх панели секции и
        // эффекты (ключ — тот же, что у hidden/hiddenFx). Закрепить/открепить — звёздочкой в режиме
        // «Настроить». Зеркально к hidden: hidden прячет пункт, fav — поднимает его в блок «Избранное».
        // ui.width — ширина панели в px (перетаскивается за левый край); null — дефолт 380.
        ui: { collapsed: {}, hidden: {}, hiddenFx: {}, favSec: {}, favFx: {}, posX: null, posY: null, width: null, tab: 0, keys: true, pinned: false, tour: false, favSets: {}, favOnly: false, simple: true, news: "", tipsOff: {}, sync: false } // simple — простой режим панели (только главное); keys — горячие клавиши; pinned — панель не закрывается кликом мимо; tour — знакомство пройдено; favSets/favOnly — любимые наборы и фильтр по ним // tab — активная вкладка панели (Набор/Вид/Терминал/Система/Данные)
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
        ["aurora", "Aurora фон"], ["spotlight", "Спотлайт"], ["typingPulse", "Пульс печати"],
        ["tint", "Тон акцентом"], ["legible", "Читаемость кода"], ["errorReact", "Реакция на ошибки"],
        ["present", "Режим Present"], ["highContrast", "Контраст+"],
        ["focusSession", "Фокус-сессия"],
        ["liveBg", "Живой фон"], ["uiAnim", "Анимации UI"], ["acrylic", "Акрил"],
        ["cursorTrail", "Шлейф курсора"], ["pet", "Питомец"], ["stats", "Статистика"],
        ["autoRead", "Адаптивный скрим"], ["trueGlass", "Настоящая прозрачность"]
    ];

    // ===== Группировка эффектов по смыслу =====
    // Сетка «Эффекты» разрослась до полусотни тумблеров — плоский список читается как стена.
    // Раскладываем эффекты по категориям-подзаголовкам: порядок групп — FX_GROUP_ORDER, а
    // принадлежность каждого эффекта — FX_GROUPS[key]. Это ЧИСТО презентационная раскладка
    // панели (в конфиг не сохраняется). Линтер смоука проверяет, что у каждого эффекта из
    // FX_LIST есть группа, а каждая группа из FX_GROUP_ORDER непуста, — чтобы при добавлении
    // нового эффекта его нельзя было забыть отнести к категории (иначе он «утёк» бы в «Прочее»).
    var FX_GROUP_ORDER = [
        ["glass",   "Стекло и поверхности"],
        ["code",    "Код и подсветка"],
        ["motion",  "Движение и фон"],
        ["focus",   "Фокус и чтение"],
        ["ambient", "Окружение и статус"],
        ["ui",      "Интерфейс"],
        ["fun",     "Приятное"]
    ];
    var FX_GROUPS = {
        kenburns: "motion", glassTabs: "glass", vignette: "focus", glassSide: "glass", scrim: "focus",
        glassStatus: "glass", activeLine: "code", groupRing: "code", groupBorder: "code", scrollbar: "glass",
        activityBg: "glass", tabAccent: "code", rounded: "glass", cursorGlow: "code", selection: "code",
        titlebar: "glass", splash: "fun", clock: "ambient", particles: "motion", pomodoro: "ambient",
        dimOnType: "focus", dimOnBlur: "focus", groupBorderMono: "code", paletteSync: "code", parallax: "motion",
        flow: "focus", dimInactive: "focus", reading: "focus", glassCommand: "glass", findAccent: "code",
        minimapFade: "focus", indentAccent: "code", selectionMatch: "code", stickyGlass: "glass", aurora: "motion",
        spotlight: "focus", typingPulse: "motion", tint: "ui", legible: "focus", errorReact: "ambient",
        present: "focus", highContrast: "focus", focusSession: "focus", liveBg: "motion", uiAnim: "ui",
        acrylic: "glass", cursorTrail: "motion", pet: "fun", stats: "ambient",
        autoRead: "focus", trueGlass: "glass"
    };

    // Эффект, который без другого эффекта ничего не делает. Показываем такой пункт приглушённым
    // и с подсказкой, вместо того чтобы дать включить тумблер «в никуда».
    // Подпись эффекта по ключу (для сообщений вида «нужен эффект: Живой контур»).
    function fxLabel(key) {
        for (var i = 0; i < FX_LIST.length; i++) if (FX_LIST[i][0] === key) return FX_LIST[i][1];
        return key;
    }
    var FX_REQUIRES = {
        groupBorderMono: "groupBorder",  // «контур одним цветом» — вариант живого контура
        focusSession: "pomodoro"         // фокус-сессия идёт по таймеру помидора
    };
    // Какой параметр «силы» имеет смысл только при включённых эффектах. Пустая запись — параметр
    // нужен всегда. Ключи внутри массива объединяются по ИЛИ: размытие стекла важно, если включено
    // хоть одно матовое стекло.
    var PARAM_REQUIRES = {
        blur: ["glassTabs", "glassSide", "glassStatus", "glassCommand", "stickyGlass", "acrylic", "trueGlass"],
        kbScale: ["kenburns"],
        kbSpeed: ["kenburns"],
        vignette: ["vignette"],
        partCount: ["particles"],
        pomoMin: ["pomodoro"],
        auroraSpeed: ["aurora"],
        spotRadius: ["spotlight"],
        tintStrength: ["tint"]
    };
    // Влияет ли переключение эффекта на СОСТАВ панели (появится/исчезнет ползунок силы или
    // изменится доступность пункта-надстройки). Если да — панель пересобирается после клика.
    function fxAffectsPanel(key) {
        var k;
        for (k in PARAM_REQUIRES) {
            if (PARAM_REQUIRES[k].indexOf(key) >= 0) return true;
        }
        for (k in FX_REQUIRES) {
            if (FX_REQUIRES[k] === key) return true;
        }
        return key === "particles"; // стиль частиц показывается только при включённых частицах
    }
    // Нужен ли сейчас параметр силы: хотя бы один из эффектов-владельцев включён.
    function paramNeeded(key) {
        var req = PARAM_REQUIRES[key];
        if (!req) return true;
        for (var i = 0; i < req.length; i++) if (cfg.fx[req[i]]) return true;
        return false;
    }

    // Стили частиц (fx.particles): ключ + подпись. dots — прежние кружки; stars — искры-звёздочки;
    // snow — падающие светлые снежинки; sakura — падающие лепестки (цвет акцента); bubbles — контуры-пузыри;
    // firefly — всплывающие «светлячки» с пульсацией яркости; rain — падающие полосы-струи;
    // confetti — падающие вращающиеся прямоугольники в трёх цветах палитры (acc + два спутника).
    // seasonal — не отдельная форма, а АВТО-выбор по времени года: зима — снег, весна — сакура,
    // лето — светлячки, осень — дождь (разрешается в конкретный стиль в seasonStyle/partStyleNow).
    var PART_STYLES = [
        ["dots", "Точки"], ["stars", "Звёзды"], ["snow", "Снег"], ["sakura", "Сакура"], ["bubbles", "Пузыри"],
        ["firefly", "Светлячки"], ["rain", "Дождь"], ["confetti", "Конфетти"], ["seasonal", "Сезон (авто)"]
    ];
    function safePartStyle(s) {
        for (var i = 0; i < PART_STYLES.length; i++) if (PART_STYLES[i][0] === s) return s;
        return "dots";
    }

    // ===== Профили быстрого старта (улучшение 10: онбординг) =====
    // Готовые «образы» вида одним кликом. patch накладывается ПОВЕРХ текущего конфига (см.
    // applyProfile в io.js): трогаем только внешний вид (fx/fxp/baseOp/partStyle/enabled), а
    // выбранный набор, картинки, привязки к проектам и язык остаются. Имена/описания — русские
    // ключи, переводятся через t(). Задача — дать новичку 5 осмысленных пресетов вместо стены
    // из четырёх десятков тумблеров. Ключи fx строго из DEFAULTS.fx (линтер смоука это проверяет).
    var PROFILES = [
        {
            id: "calm", name: "Спокойный",
            desc: "Ровный тёмный фон, мягкое стекло, без движения — читаемость на первом месте.",
            patch: {
                enabled: true, partStyle: "dots", baseOp: { editor: 0.05, side: 0.26, panel: 0.10 },
                fx: {
                    kenburns: false, particles: false, aurora: false, spotlight: false, parallax: false,
                    typingPulse: false, flow: false, tint: false, present: false, dimInactive: false,
                    glassTabs: true, glassSide: true, glassStatus: true, scrim: true, vignette: true,
                    rounded: true, activeLine: true, reading: false
                }
            }
        },
        {
            id: "focus", name: "Фокус",
            desc: "Гаснет всё лишнее, спотлайт у курсора, приглушение при печати — только код.",
            patch: {
                enabled: true, partStyle: "dots", baseOp: { editor: 0.04, side: 0.24, panel: 0.09 },
                fx: {
                    spotlight: true, dimOnType: true, dimInactive: true, minimapFade: true, reading: false,
                    particles: false, aurora: false, kenburns: false, parallax: false, typingPulse: false,
                    present: false, scrim: true, vignette: true, glassTabs: true, glassSide: true
                }
            }
        },
        {
            id: "present", name: "Презентация",
            desc: "Крупные акценты, спокойный фон, скрыт визуальный шум — для стрима и скринкаста.",
            patch: {
                enabled: true, partStyle: "dots", baseOp: { editor: 0.06, side: 0.28, panel: 0.11 },
                fx: {
                    present: true, aurora: true, tabAccent: true, activeLine: true, cursorGlow: true,
                    particles: false, spotlight: false, dimOnType: false, kenburns: false, parallax: false,
                    glassTabs: true, glassSide: true, rounded: true, vignette: true
                }
            }
        },
        {
            id: "minimal", name: "Минимал",
            desc: "Почти ванильный VS Code: тонкий фон, без эффектов и частиц.",
            patch: {
                enabled: true, partStyle: "dots", baseOp: { editor: 0.03, side: 0.16, panel: 0.06 },
                fx: {
                    kenburns: false, particles: false, aurora: false, spotlight: false, parallax: false,
                    typingPulse: false, flow: false, tint: false, present: false, vignette: false,
                    glassTabs: false, glassSide: false, glassStatus: false, scrim: false, groupBorder: false,
                    rounded: true, activeLine: false
                }
            }
        },
        {
            id: "max", name: "Максимум",
            desc: "Всё включено: живой фон, частицы, свечения — витрина возможностей.",
            patch: {
                enabled: true, partStyle: "stars", baseOp: { editor: 0.08, side: 0.34, panel: 0.14 },
                fx: {
                    kenburns: true, particles: true, aurora: true, cursorGlow: true, selection: true,
                    glassTabs: true, glassSide: true, glassStatus: true, scrim: true, vignette: true,
                    rounded: true, activeLine: true, groupBorder: true, tabAccent: true, typingPulse: true,
                    parallax: true, spotlight: false, present: false
                }
            }
        }
    ];
    function profileById(id) { for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].id === id) return PROFILES[i]; return null; }

    // ключ, подпись, min, max, step, знаков после запятой
    var PARAMS = [
        ["blur", "Размытие стекла", 0, 20, 1, 0],
        ["kbScale", "Ken Burns масштаб", 1, 1.2, 0.01, 2],
        ["kbSpeed", "Ken Burns сек", 20, 120, 5, 0],
        ["vignette", "Виньетка сила", 0, 0.6, 0.02, 2],
        ["partCount", "Частиц", 0, 120, 5, 0],
        ["pomoMin", "Помидор, мин", 5, 60, 5, 0],
        ["auroraSpeed", "Aurora сек", 8, 60, 2, 0],
        ["spotRadius", "Спот радиус", 120, 600, 20, 0],
        ["tintStrength", "Тон сила", 0, 0.6, 0.02, 2]
    ];

    // Точка фокуса картинки: "x% y%", оба 0..100 целые.
    function isPosStr(v) {
        var m = typeof v === "string" && /^(\d{1,3})% (\d{1,3})%$/.exec(v);
        return !!(m && +m[1] <= 100 && +m[2] <= 100);
    }
    // Шрифт — строго из белого списка (там нет кавычек/;/{} — CSS-инъекция невозможна).
    function safeFont(f) { return TERM_FONTS.indexOf(f) >= 0 ? f : DEFAULTS.term.font; }
    // диапазоны параметров эффектов (ключ -> [min, max]) из PARAMS
    var FXP_RANGE = {};
    (function () { for (var i = 0; i < PARAMS.length; i++) FXP_RANGE[PARAMS[i][0]] = [PARAMS[i][2], PARAMS[i][3]]; })();

    var sessionRandomIndex = null, switchMul = 1;

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

    // Санитизация карты «строковый ключ -> строковый индекс существующего набора». Общая для
    // branchSets (ключ — имя git-ветки) и langSets (ключ — расширение файла), по образцу
    // workspaceSets: число и длина ключей ограничены, опасные ключи (отравители прототипа)
    // отброшены, значения — только валидные индексы наборов (< SETS.length).
    function _sanSetMap(src, maxKeyLen) {
        var out = {}, n = 0;
        if (src && typeof src === "object") {
            for (var k in src) {
                if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
                if (n >= 64 || typeof k !== "string" || !k.length || k.length > maxKeyLen) continue;
                if (DANGEROUS_KEYS.indexOf(k) >= 0) continue;
                var v = src[k];
                if (typeof v === "string" && /^\d+$/.test(v) && parseInt(v, 10) < SETS.length) { out[k] = v; n++; }
            }
        }
        return out;
    }

    // Санитизация карты «строковый ключ -> булево» (для ui.hidden / ui.hiddenFx — скрытые секции/
    // эффекты панели). Ограничивает число и длину ключей, отбрасывает отравители прототипа.
    function _sanBoolMap(src, maxKeyLen) {
        var out = {}, n = 0;
        if (src && typeof src === "object") {
            for (var k in src) {
                if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
                if (n >= 128 || typeof k !== "string" || k.length > maxKeyLen) continue;
                if (DANGEROUS_KEYS.indexOf(k) >= 0) continue;
                if (typeof src[k] === "boolean") { out[k] = src[k]; n++; }
            }
        }
        return out;
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
            // язык интерфейса: только из белого списка (auto/ru/en), иначе остаётся дефолт
            if (typeof p.lang === "string") c.lang = safeLang(p.lang);
            // авто-бюджет производительности: только булево
            if (typeof p.perfGuard === "boolean") c.perfGuard = p.perfGuard;
            // свой GLSL шейдерного фона: только строка, ограниченная длиной. Код исполняется на
            // GPU в песочнице драйвера (к DOM/файлам доступа нет), поэтому фильтровать содержимое
            // не нужно — достаточно не пускать мегабайтные строки в localStorage.
            if (typeof p.shaderSrc === "string") c.shaderSrc = p.shaderSrc.slice(0, 8000);
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
            // фон по git-ветке: флаг + карта «ветка -> индекс набора» (санитизация как workspaceSets)
            if (typeof p.autoBranch === "boolean") c.autoBranch = p.autoBranch;
            c.branchSets = _sanSetMap(p.branchSets, 120);
            // фон по языку/расширению активного файла: флаг + карта «расширение -> индекс набора»
            if (typeof p.autoRemote === "boolean") c.autoRemote = p.autoRemote;
            c.remoteSets = _sanSetMap(p.remoteSets, 140);
            if (typeof p.autoLang === "boolean") c.autoLang = p.autoLang;
            c.langSets = _sanSetMap(p.langSets, 32);
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
            // сгенерированные наборы: нормализуются как SETS, число ограничено GEN_MAX.
            // Дозагрузка в хвост SETS — в _appendGenSets (ниже), при старте.
            if (Array.isArray(p.genSets)) c.genSets = sanitizeUserSets(p.genSets);
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
            // библиотека картинок: массив строк-путей (разрешение сети — при рендере, imgAllowed),
            // ограничение числа и длины пути; librarySlideshow — только булево.
            if (Array.isArray(p.library)) {
                c.library = [];
                for (var _li = 0; _li < p.library.length && c.library.length < 64; _li++) {
                    var _lv = p.library[_li];
                    if (typeof _lv === "string" && _lv && _lv.length <= 1024) c.library.push(_lv);
                }
            }
            if (typeof p.librarySlideshow === "boolean") c.librarySlideshow = p.librarySlideshow;
            if (typeof p.libraryDir === "string" && p.libraryDir.length <= 1024) c.libraryDir = p.libraryDir;
            // точка фокуса: только «N% N%» (0..100) — строка уходит в CSS background-position
            if (p.setPos && typeof p.setPos === "object") {
                c.setPos = {};
                for (var _pi in p.setPos) {
                    if (!/^\d{1,2}$/.test(_pi)) continue;
                    var _po = p.setPos[_pi]; if (!_po || typeof _po !== "object") continue;
                    var _pz = {};
                    ["editor", "sidebar", "panel"].forEach(function (z) { if (isPosStr(_po[z])) _pz[z] = _po[z]; });
                    c.setPos[_pi] = _pz;
                }
            }
            // скринсейвер/витрина при простое: флаг + минуты простоя до показа
            if (p.screensaver && typeof p.screensaver === "object") {
                if (typeof p.screensaver.on === "boolean") c.screensaver.on = p.screensaver.on;
                if (typeof p.screensaver.min === "number") c.screensaver.min = clampNum(p.screensaver.min, 1, 120, c.screensaver.min);
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
                // режим границ дня: по часам или по реальному рассвету/закату (координаты ниже)
                if (p.autoTime.mode === "sun" || p.autoTime.mode === "hours") c.autoTime.mode = p.autoTime.mode;
                if (typeof p.autoTime.lat === "number" && isFinite(p.autoTime.lat)) c.autoTime.lat = Math.min(90, Math.max(-90, p.autoTime.lat));
                if (typeof p.autoTime.lon === "number" && isFinite(p.autoTime.lon)) c.autoTime.lon = Math.min(180, Math.max(-180, p.autoTime.lon));
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
                        if (_cn >= 64) break;           // лимит числа записей — дальше не берём
                        if (t2.length > 64) continue;   // слишком длинный ключ — пропускаем ЕГО, не обрывая разбор
                        if (typeof p.ui.collapsed[t2] === "boolean") { c.ui.collapsed[t2] = p.ui.collapsed[t2]; _cn++; }
                    }
                }
                // скрытые секции/эффекты панели: строго булевы карты, ключи ограничены
                c.ui.hidden = _sanBoolMap(p.ui.hidden, 64);
                c.ui.hiddenFx = _sanBoolMap(p.ui.hiddenFx, 40);
                // «Избранное»: закреплённые секции/эффекты — те же булевы карты (ключи как у hidden)
                c.ui.favSec = _sanBoolMap(p.ui.favSec, 64);
                c.ui.favFx = _sanBoolMap(p.ui.favFx, 40);
                if (typeof p.ui.posX === "number" && isFinite(p.ui.posX)) c.ui.posX = p.ui.posX;
                if (typeof p.ui.posY === "number" && isFinite(p.ui.posY)) c.ui.posY = p.ui.posY;
                // ширина панели: число в разумных пределах (иначе панель уехала бы за край/схлопнулась)
                if (typeof p.ui.width === "number" && isFinite(p.ui.width)) c.ui.width = Math.min(760, Math.max(320, Math.round(p.ui.width)));
                // активная вкладка панели: неотрицательное целое (реальный верх зажмёт togglePanel
                // под число вкладок; здесь просто небольшой безопасный потолок против мусора)
                if (typeof p.ui.tab === "number" && isFinite(p.ui.tab)) c.ui.tab = Math.min(15, Math.max(0, Math.floor(p.ui.tab)));
                if (typeof p.ui.keys === "boolean") c.ui.keys = p.ui.keys; // горячие клавиши вкл/выкл
                if (typeof p.ui.pinned === "boolean") c.ui.pinned = p.ui.pinned;
                if (typeof p.ui.tour === "boolean") c.ui.tour = p.ui.tour;
                if (typeof p.ui.favOnly === "boolean") c.ui.favOnly = p.ui.favOnly;
                if (typeof p.ui.simple === "boolean") c.ui.simple = p.ui.simple;
                if (typeof p.ui.news === "string" && p.ui.news.length <= 32) c.ui.news = p.ui.news;   // просмотренный выпуск «Что нового»
                c.ui.tipsOff = _sanBoolMap(p.ui.tipsOff, 32);                                           // отклонённые советы
                if (typeof p.ui.sync === "boolean") c.ui.sync = p.ui.sync;                              // синхронизация через Settings Sync
                // любимые наборы: ключ — индекс набора строкой ("0".."99")
                c.ui.favSets = _sanBoolMap(p.ui.favSets, 64);
                for (var _fk in c.ui.favSets) if (!/^\d{1,2}$/.test(_fk)) delete c.ui.favSets[_fk];
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
    // Откуда взялся конфиг при старте: "local" | "disk" | "seed" | "defaults" (для диагностики).
    var cfgLoadedFrom = "defaults";
    function loadCfg() {
        try {
            var raw = localStorage.getItem(CFG_KEY);
            // Нормальный конфиг весит килобайты. Отсекаем заведомо раздутый/подменённый
            // localStorage до JSON.parse (тот же лимит, что и при импорте файла) — чтобы
            // огромная строка не била по старту разбором/памятью. Свыше лимита — дефолты.
            if (raw && raw.length <= 256 * 1024) { cfgLoadedFrom = "local"; return mergeCfg(safeParse(raw)); }
        } catch (e) {}
        // localStorage пуст (новая машина / переустановка / крупный апдейт VS Code почистил
        // хранилище). Сначала — резерв на диске от Moon Core: это наш же последний конфиг, поэтому
        // проходит через mergeCfg напрямую и своё согласие на сетевые картинки сохраняет.
        var disk = diskCfg();
        if (disk) { try { var c = mergeCfg(disk); cfgLoadedFrom = "disk"; return c; } catch (e) {} }
        // Дальше — базовый конфиг из settings.json (window.__MLBG_SEED__ — едет через Settings
        // Sync): вид «переезжает» на новую машину сам. mergeCfg санитизирует чужой объект.
        var seed = seedConfig();
        if (seed) { try { var c2 = mergeCfg(seed); cfgLoadedFrom = "seed"; return c2; } catch (e) {} }
        cfgLoadedFrom = "defaults";
        return clone(DEFAULTS);
    }

    // ===== Резерв конфига на диске (Moon Core) =====
    // localStorage окна VS Code иногда очищается целиком (крупное обновление, переустановка), и
    // вместе с ним пропадали все наборы и настройки. Через Moon Core у модуля есть свой файл
    // данных на диске (<globalStorage Moon Core>/modules/mlbg.json): окно читает его синхронно
    // при старте, а пишет через мост. Сюда с задержкой уходит копия конфига после каждой правки.
    // Без Moon Core — ничего не делаем (ручной экспорт в файл по-прежнему работает).
    var DISK_SAVE_MS = 2000;           // ползунок двигают десятки раз в секунду — пишем после паузы
    var DISK_MAX = 256 * 1024;         // тот же лимит, что у localStorage и импорта
    var _disk = { timer: null, lastOk: 0, lastErr: "", pending: false };
    // Конфиг из файла данных модуля: объект или null. Файл на диске может быть подменён — поэтому
    // только объект разумного размера, дальше его чистит mergeCfg.
    function diskCfg() {
        try {
            if (!_viaMoonCore) return null;
            var m = mooncoreModule();
            var d = (m && typeof m.data === "function") ? m.data() : null;
            var c = d && d.cfg;
            if (!c || typeof c !== "object" || Array.isArray(c)) return null;
            if (JSON.stringify(c).length > DISK_MAX) return null;
            return c;
        } catch (e) { return null; }
    }
    function scheduleDiskSave() {
        try { if (typeof scheduleSyncPush === "function") scheduleSyncPush(); } catch (e) {} // Settings Sync (looks.js)
        if (!_viaMoonCore) return;
        _disk.pending = true;
        if (_disk.timer) clearTimeout(_disk.timer);
        _disk.timer = setTimeout(diskSaveNow, DISK_SAVE_MS);
    }
    function diskSaveNow() {
        _disk.timer = null;
        var m = mooncoreModule();
        if (!m || typeof m.saveData !== "function") return;
        var text;
        try { text = JSON.stringify(cfg); } catch (e) { logErr("резерв конфига", e); return; }
        if (text.length > DISK_MAX) { _disk.lastErr = "конфиг больше 256 КБ"; return; }
        m.saveData({ v: 1, app: APP_VERSION, t: Date.now(), cfg: JSON.parse(text), daily: dailyCopies(text) }).then(function (r) {
            _disk.pending = false;
            if (r && r.ok) { _disk.lastOk = Date.now(); _disk.lastErr = ""; }
            else { _disk.lastErr = String((r && r.error) || "нет ответа"); logErr("резерв конфига", _disk.lastErr); }
        }, function (e) { _disk.lastErr = String(e); logErr("резерв конфига", e); });
    }
    // Ежедневные копии: по одной на день, последние 14 (как у cpp-docs-panel). Лежат в том же
    // файле данных модуля. Новая копия дня заменяет старую того же дня только при отличии.
    var DAILY_KEEP = 14;
    function dailyList() {
        try {
            var m = mooncoreModule(), d = (m && typeof m.data === "function") ? m.data() : null;
            var a = d && Array.isArray(d.daily) ? d.daily : [];
            return a.filter(function (x) { return x && typeof x.day === "string" && x.cfg && typeof x.cfg === "object"; }).slice(0, DAILY_KEEP);
        } catch (e) { return []; }
    }
    function dailyCopies(text) {
        var now = new Date();
        var day = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
        var list = dailyList().filter(function (x) { return x.day !== day; });
        list.unshift({ day: day, cfg: JSON.parse(text) });
        return list.slice(0, DAILY_KEEP);
    }
    // Строка для диагностики.
    function diskBackupInfo() {
        if (!_viaMoonCore) return "нет (нужен Moon Core)";
        var from = cfgLoadedFrom === "disk" ? " · при старте восстановлен из резерва" : "";
        if (_disk.lastErr) return "ошибка: " + _disk.lastErr + from;
        if (_disk.lastOk) {
            var d = new Date(_disk.lastOk);
            return "сохранён в " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + from;
        }
        return (_disk.pending ? "сохраняется" : "есть") + from;
    }
    // Базовый конфиг из settings.json, проброшенный компаньоном как глобал window.__MLBG_SEED__
    // (см. extension/extension.js). Возвращает объект или null. Мягко — глобала может не быть
    // (плагин подключён вручную, без расширения) или он битый.
    function seedConfig() {
        try {
            var s = (typeof window !== "undefined") ? window.__MLBG_SEED__ : null;
            if (s && typeof s === "object") return s;
        } catch (e) {}
        return null;
    }
    function saveCfg() {
        try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { logErr("сохранение конфига", e); }
        try { scheduleDiskSave(); } catch (e) {}
        // Единая точка сохранения конфига — здесь же отмечаем изменение для истории Undo/Redo
        // (scheduleHistory определён в io.js; поднят по области IIFE). При старте (loadCfg) не
        // зовётся, поэтому лишнего шага истории на загрузке нет.
        try { scheduleHistory(); } catch (e) {}
        // Другие окна VS Code (общий localStorage, но свой рантайм) должны увидеть правку сразу,
        // а не через цикл самолечения. broadcastCfg объявлен в boot.js — доступен по области IIFE.
        try { if (typeof broadcastCfg === "function") broadcastCfg(); } catch (e) {}
    }

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
    // Хвост заголовка окна — имя приложения. Поддерживаем не только «Visual Studio Code», но и
    // популярные форки (Cursor, VSCodium, Windsurf, Code - OSS): у них тот же движок и та же
    // разметка, меняется лишь подпись в конце заголовка. Срезаем любой из этих хвостов, чтобы
    // «фон по проекту» работал и в форках. Порядок не важен — совпадает первый подходящий.
    var APP_TITLE_RE = /\s*[—\-]\s*(?:Visual Studio Code|Code - OSS|VSCodium|Cursor|Windsurf)\s*$/i;
    function workspaceName() {
        try {
            // Компаньон знает папку воркспейса напрямую; заголовок окна — запасной путь.
            var liveVal = (typeof liveStr === "function") ? liveStr("folder") : null;
            if (liveVal) { if (typeof scrapeMark === "function") scrapeMark("workspace", true); return liveVal; }
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
    // Набор, закреплённый за удалённым репозиторием (cfg.remoteSets["владелец/имя"]). В отличие
    // от «по проекту» это не зависит от того, как названа папка на диске: один и тот же репозиторий,
    // склонированный дважды под разными именами, получит один фон. Работает только с живыми данными
    // компаньона — из DOM удалённый адрес не достать.
    function remoteIndex() {
        if (!cfg.autoRemote) return null;
        var r = (typeof liveStr === "function") ? liveStr("remote") : null;
        var v = (r && cfg.remoteSets) ? cfg.remoteSets[r] : null;
        if (typeof v === "string" && /^\d+$/.test(v)) { var i = parseInt(v, 10); if (i >= 0 && i < SETS.length) return i; }
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
        var ri = remoteIndex();
        if (ri !== null) return ri;
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
    // Почему сейчас показан именно этот набор: то же дерево приоритетов, что в activeIndex, но
    // с причиной. Для строки «Сейчас работает» на вкладке «Авто-смена».
    // -> { idx, why: "workspace"|"remote"|"branch"|"lang"|"random"|"time"|"slide"|"manual", key }
    function activeRule() {
        var r = { idx: activeIndex(), why: "manual", key: "" };
        try {
            if (workspaceIndex() !== null) { r.why = "workspace"; r.key = workspaceName() || ""; return r; }
            if (remoteIndex() !== null) { r.why = "remote"; r.key = (typeof liveStr === "function" && liveStr("remote")) || ""; return r; }
            if (branchIndex() !== null) { r.why = "branch"; r.key = (typeof gitBranch === "function" && gitBranch()) || ""; return r; }
            if (langIndex() !== null) { r.why = "lang"; r.key = (typeof editorFileExt === "function" && editorFileExt()) || ""; return r; }
            if (cfg.mode === "random") { r.why = "random"; return r; }
            if (cfg.autoTime && cfg.autoTime.on) { r.why = "time"; return r; }
            if (cfg.slideshow && cfg.slideshow.on) { r.why = "slide"; return r; }
        } catch (e) {}
        return r;
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
        // Своя картинка в редакторе (выбрана пользователем) — акцент из неё, пока его не меняли
        // руками: «родной» акцент набора к чужой картинке не подходит. Пока проба не готова —
        // запасной путь ниже; когда готова, probeImage сам пересоберёт стиль.
        try {
            if (typeof hasUserImg === "function" && hasUserImg(idx, "editor")) {
                var st = probeImage(zoneUrl(idx, "editor"));
                if (st && st.ok && st.accent) return accentForContrast(st.accent, accentContrastRef(), 3);
            }
        } catch (e) {}
        var s = SETS[idx] && SETS[idx].accent;
        if (isColor(s)) return s;
        return safeColor(cfg.accent, DEFAULTS.accent);
    }
    // Цвет курсора/выделения терминала: пока пользователь его не менял (равен дефолту),
    // он следует за акцентом набора — терминал в цвет фона без настройки.
    function effTermColor(key) {
        var v = cfg.term && cfg.term[key];
        if (!isColor(v) || v === DEFAULTS.term[key]) return getAccent();
        return v;
    }
    // Точка фокуса картинки зоны набора ("x% y%") или "" — тогда позиция по умолчанию.
    function setPosFor(idx, zone) {
        var o = cfg.setPos && cfg.setPos[idx];
        var v = o && o[zone];
        return isPosStr(v) ? v : "";
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
        if (isAbsUrl(rel)) return imgAllowed(rel) ? appFileUrl(rel) : "";
        return appFileUrl(imgBase() + rel);
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

    // ===================== src/core/scrape.js =====================
    // ===== Чтение данных из DOM и здоровье селекторов =====
    // Загрузчик не даёт API к git-ветке, счётчику ошибок и имени проекта — их приходится читать
    // прямо из вёрстки воркбенча. Вёрстка меняется от версии к версии, и сломавшийся селектор
    // молча возвращает пусто: фича «отваливается» без единой ошибки. Поэтому всё чтение собрано
    // здесь, и по каждому ключу считается «сколько раз спрашивали / сколько раз нашли» —
    // диагностика показывает, что именно перестало находиться.

    // Реестр скрейперов: имя для отчёта и счётчики. hits===0 при tries>=SCRAPE_MIN_TRIES —
    // селектор, скорее всего, не подходит текущей версии редактора.
    var SCRAPE = {
        gitBranch: { name: "git-ветка", tries: 0, hits: 0 },
        problems:  { name: "счётчик ошибок", tries: 0, hits: 0 },
        workspace: { name: "имя проекта", tries: 0, hits: 0 },
        editorFile: { name: "язык файла", tries: 0, hits: 0 }
    };
    var SCRAPE_MIN_TRIES = 8; // ниже этого порога «0 попаданий» ещё не показатель (просто рано/нет данных)

    // Отметить попытку скрейпа: tries++ всегда, hits++ только при успехе. hit — «нашли валидное».
    function scrapeMark(key, hit) {
        var s = SCRAPE[key]; if (!s) return hit;
        s.tries++; if (hit) s.hits++;
        return hit;
    }

    // Найти статусбар-элемент по codicon-иконке и вернуть текст его .statusbar-item (или "").
    // Общий путь для git-ветки и счётчика ошибок — оба висят на иконке в статусбаре. Вынесено,
    // чтобы селектор статусбара правился в одном месте, если VS Code поменяет разметку.
    function scrapeStatusItem(iconClass) {
        try {
            var wb = document.querySelector(".monaco-workbench"); if (!wb) return "";
            var ico = wb.querySelector(".statusbar-item ." + iconClass);
            if (!ico) return "";
            var item = ico.closest ? ico.closest(".statusbar-item") : null;
            return (item && item.textContent) || "";
        } catch (e) { return ""; }
    }

    // Расширение активного файла (для «фон по языку файла»). API к языку редактора в custom-css
    // нет, поэтому берём имя файла из подписи АКТИВНОЙ вкладки и вырезаем расширение. aria-label
    // вкладки надёжнее textContent (там бывают значки-точки «изменён»): формат обычно
    // «file.ts» или «file.ts, изменён» — берём первый токен и хвост после последней точки.
    // Нормализуем к [a-z0-9_], ограничиваем длину. Пусто -> "" (тогда langIndex не сработает).
    function editorFileExt() {
        try {
            // У компаньона есть document.languageId — это надёжнее расширения из подписи вкладки
            // (одно расширение бывает у разных языков, и наоборот). Ключ ищем сначала по языку,
            // потом по расширению: старые конфиги, где закреплено «js», продолжают работать.
            var d = (typeof mlbgLive === "function") ? mlbgLive() : null;
            if (d && (d.languageId || d.fileExt)) {
                scrapeMark("editorFile", true);
                var map = cfg && cfg.langSets;
                if (d.languageId && map && Object.prototype.hasOwnProperty.call(map, d.languageId)) return d.languageId;
                if (d.fileExt && map && Object.prototype.hasOwnProperty.call(map, d.fileExt)) return d.fileExt;
                return d.languageId || d.fileExt;
            }
            var wb = document.querySelector(".monaco-workbench");
            if (!wb) { scrapeMark("editorFile", false); return ""; }
            var tab = wb.querySelector(".editor-group-container.active .tab.active .tab-label")
                   || wb.querySelector(".tab.active .tab-label")
                   || wb.querySelector(".tabs-container .tab.active");
            var name = (tab && tab.getAttribute && tab.getAttribute("aria-label")) || (tab && tab.textContent) || "";
            var base = String(name).trim().split(/[\s,]/)[0] || "";
            var dot = base.lastIndexOf(".");
            var ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) : "";
            scrapeMark("editorFile", !!ext);
            return ext;
        } catch (e) { return ""; }
    }

    // ===== Здоровье CSS-селекторов воркбенча =====
    // Скрейперы выше отвечают за ЧТЕНИЕ данных из DOM. Но у плагина, который живёт на чужой
    // вёрстке, главный режим отказа другой: VS Code переименовал класс — и правило перестало
    // на что-либо попадать. Ошибки нет, исключения нет, просто «стекло куда-то пропало».
    // Здесь перечислены ключевые селекторы, на которых держится оформление; проверка ищет
    // каждый в живом DOM и показывает, какие не находятся. Это превращает молчаливую поломку
    // после обновления редактора в конкретный список «что чинить».
    //
    // opt: true — элемента может не быть по нормальным причинам (панель закрыта, ни один файл
    // не открыт, титлбар нативный). Такие промахи НЕ считаются поломкой, но видны в отчёте.
    var UI_SELECTORS = [
        { sel: ".monaco-workbench", name: "корень воркбенча" },
        { sel: ".part.editor", name: "часть: редактор" },
        { sel: ".part.sidebar", name: "часть: сайдбар" },
        { sel: ".part.panel", name: "часть: панель", opt: true },
        { sel: ".part.activitybar", name: "часть: актив-бар", opt: true },
        { sel: ".part.statusbar", name: "часть: статусбар" },
        { sel: ".part.titlebar", name: "часть: титлбар", opt: true },
        { sel: ".statusbar-item", name: "элемент статусбара" },
        { sel: ".monaco-editor", name: "редактор Monaco", opt: true },
        { sel: ".monaco-editor .overflow-guard > .monaco-scrollable-element", name: "холст фона редактора", opt: true },
        { sel: ".monaco-editor .view-lines", name: "строки кода", opt: true },
        { sel: ".editor-group-container", name: "группа редактора", opt: true },
        { sel: ".tabs-container", name: "полоса вкладок", opt: true },
        { sel: ".monaco-scrollable-element > .scrollbar > .slider", name: "ползунок скроллбара", opt: true },
        { sel: ".part.sidebar .monaco-list-row", name: "строка списка сайдбара", opt: true },
        { sel: ".monaco-workbench .pane-header", name: "заголовок секции", opt: true },
        { sel: ".xterm", name: "терминал xterm", opt: true },
        { sel: ".minimap", name: "миникарта", opt: true },
        { sel: ".quick-input-widget", name: "палитра команд", opt: true },
        { sel: ".monaco-editor .cursors-layer > .cursor", name: "курсор редактора", opt: true }
    ];
    // Снимок: [{ name, sel, found, opt }]. Ничего не меняет — только читает DOM. Зовётся по
    // требованию (диагностика в панели), а не в цикле: 20 querySelector — это дёшево, но
    // бессмысленно делать каждую секунду.
    function selectorHealth() {
        var out = [], i, s, found;
        for (i = 0; i < UI_SELECTORS.length; i++) {
            s = UI_SELECTORS[i];
            found = false;
            try { found = !!document.querySelector(s.sel); } catch (e) { found = false; }
            out.push({ name: s.name, sel: s.sel, found: found, opt: !!s.opt });
        }
        return out;
    }
    // Сводка одной строкой + признак «есть обязательные промахи» (тогда вёрстка, скорее всего,
    // изменилась и оформление частично не применяется).
    function selectorHealthSummary() {
        var h = selectorHealth(), found = 0, missReq = [], i;
        for (i = 0; i < h.length; i++) {
            if (h[i].found) found++;
            else if (!h[i].opt) missReq.push(h[i].name);
        }
        return { total: h.length, found: found, missingRequired: missReq, ok: missReq.length === 0, items: h };
    }

    // Health-снимок для диагностики: массив { name, ok, tries, hits, note } по каждому скрейперу.
    // ok=false только когда попыток достаточно (>=SCRAPE_MIN_TRIES), а попаданий ноль — тогда
    // селектор, скорее всего, устарел под новую версию VS Code. При малом числе попыток статус
    // «нейтральный» (рано судить). Ничего не меняет — только читает счётчики.
    function scrapeHealth() {
        var out = [];
        for (var k in SCRAPE) {
            if (!Object.prototype.hasOwnProperty.call(SCRAPE, k)) continue;
            var s = SCRAPE[k];
            var enough = s.tries >= SCRAPE_MIN_TRIES;
            var broken = enough && s.hits === 0;
            out.push({
                key: k, name: s.name, tries: s.tries, hits: s.hits,
                ok: !broken,
                note: broken ? "ни разу не нашёл за " + s.tries + " попыток — вероятно, изменилась вёрстка VS Code"
                    : !enough ? "мало данных (" + s.hits + "/" + s.tries + ")"
                    : "работает (" + s.hits + "/" + s.tries + ")"
            });
        }
        return out;
    }

    // ===================== src/core/env.js =====================
    // ===== Среда: чем внедрён скрипт и что умеет окно =====
    // Загрузчиков два. be5invis.vscode-custom-css теряет инжект после каждого обновления
    // редактора; subframe7536.custom-ui-style бэкапит оригиналы, переживает обновления и умеет
    // опции Electron — то есть настоящую прозрачность окна, недостижимую средствами CSS.
    // От того, какой из них активен, зависят и диагностика, и доступность «настоящего стекла».
    //
    // Сам скрипт не видит ни settings.json, ни API расширений, поэтому среда приходит извне:
    // точно — глобалом window.__MLBG_ENV__ от компаньона, косвенно — по следам в DOM.

    // Точные данные от компаньон-расширения. Глобала может не быть (плагин подключён вручную) —
    // тогда null. Санитизируем: это внешний объект, он попадает в отчёты и в UI.
    function mlbgEnv() {
        try {
            var e = (typeof window !== "undefined") ? window.__MLBG_ENV__ : null;
            // Через Moon Core пролога с глобалом нет: компаньон присылает ту же среду событием
            // "env" по мосту ядра, помощник модуля хранит последнее значение.
            if ((!e || typeof e !== "object") && _viaMoonCore) {
                var m = mooncoreModule();
                e = (m && typeof m.get === "function") ? m.get("env") : null;
            }
            if (!e || typeof e !== "object") return null;
            var loader = (e.loader === "custom-ui-style" || e.loader === "custom-css" || e.loader === "moon-core") ? e.loader : null;
            return {
                loader: loader,
                version: (typeof e.version === "string") ? e.version.replace(/[^0-9a-z.\-]/gi, "").slice(0, 24) : "",
                vscode: (typeof e.vscode === "string") ? e.vscode.replace(/[^0-9a-z.\-]/gi, "").slice(0, 24) : "",
                transparent: e.transparent === true,   // окно создано прозрачным (опции Electron заданы)
                script: (typeof e.script === "string") ? e.script.slice(0, 512) : ""
            };
        } catch (e) { return null; }
    }
    // Косвенный признак custom-ui-style: он объявляет свои CSS-переменные шрифтов на :root.
    // Признака у be5invis нет никакого, поэтому его считаем «загрузчиком по умолчанию».
    function _cusMarker() {
        try {
            var v = getComputedStyle(document.documentElement).getPropertyValue("--cus-mono");
            return !!(v && v.trim());
        } catch (e) { return false; }
    }
    // Что за загрузчик: { id, title, version, sure }. sure=false — определено косвенно.
    var MOONCORE_TITLE = "Moon Core";
    function loaderKind() {
        // Встроены ядром Moon Core — это известно точно по тегу скрипта, компаньон не нужен.
        if (_viaMoonCore) {
            var core = (typeof window !== "undefined" && window.__MOONCORE__) || {};
            return { id: "moon-core", sure: true, version: (typeof core.version === "string") ? core.version.replace(/[^0-9a-z.\-]/gi, "").slice(0, 24) : "", title: MOONCORE_TITLE };
        }
        var e = mlbgEnv();
        if (e && e.loader && e.loader !== "moon-core") {
            return {
                id: e.loader, sure: true, version: e.version,
                title: e.loader === "custom-ui-style" ? "Custom UI Style" : "Custom CSS and JS (be5invis)"
            };
        }
        if (_cusMarker()) return { id: "custom-ui-style", sure: false, version: "", title: "Custom UI Style" };
        return { id: "custom-css", sure: false, version: "", title: "Custom CSS and JS (be5invis)" };
    }
    // Готово ли окно к настоящей прозрачности: это знает только компаньон (он видит опции
    // Electron в settings.json). Без компаньона считаем, что нет, — и честно говорим об этом
    // в подсказке, вместо того чтобы включить «стекло в никуда» и получить чёрное окно.
    function trueGlassReady() {
        var e = mlbgEnv();
        return !!(e && e.transparent);
    }
    // Готовый кусок settings.json для включения настоящей прозрачности через custom-ui-style.
    // Пользователь копирует его кнопкой в панели — плагин сам в настройки писать не может.
    // backgroundMaterial: "mica" — материал Windows 11; на macOS работает vibrancy, поэтому
    // отдаём оба ключа: лишний будет проигнорирован Electron.
    function trueGlassSnippet() {
        return [
            '"custom-ui-style.electron": {',
            '  "transparent": true,',
            '  "backgroundMaterial": "mica",',
            '  "vibrancy": "under-window"',
            '}'
        ].join("\n");
    }
    // Кусок settings.json с импортом самого плагина — под тот загрузчик, который стоит.
    // url берём из адреса текущего скрипта (IMG + имя файла), если он известен.
    function loaderImportSnippet() {
        var url = "";
        try { url = (/** @type {HTMLScriptElement} */ (document.currentScript) || {}).src || ""; } catch (e) {}
        if (!url) url = (typeof IMG === "string" && IMG ? IMG : "file:///path/to/") + "custom-bg.js";
        if (loaderKind().id === "custom-ui-style") {
            return '"custom-ui-style.external.imports": [\n  { "type": "js", "url": "' + url + '" }\n]';
        }
        return '"vscode_custom_css.imports": [\n  "' + url + '"\n]';
    }

    // ===================== src/core/live.js =====================
    // ===== Живые данные из хоста расширений =====
    // Скрипт фона живёт в окне редактора: у него нет ни API расширений, ни git. Всё, что ему
    // нужно знать о работе — ветка, ошибки, язык открытого файла, папка проекта, — до сих пор
    // добывалось скрейпингом DOM. Это работает, но держится на чужой вёрстке и ломается на
    // обновлениях редактора; ради этого пришлось завести целую систему здоровья селекторов.
    //
    // Компаньон-расширение живёт там, где эти данные точные (см. extension/live.js), и присылает
    // их событием "live" по мосту Moon Core — только окну своего хоста, поэтому у каждого окна
    // VS Code своя ветка и свои ошибки. Раньше это был JS-файл в globalStorage, подключаемый
    // через <script src>: оболочка VS Code такие внешние скрипты блокирует, и данные молча не
    // доходили. Глобал window.__MLBG_LIVE__ остался как ручной/тестовый источник.
    //
    // Данных может не быть вовсе: нет Moon Core или компаньона, git выключен, окно без папки.
    // Поэтому живые данные — это ПРЕДПОЧТЕНИЕ, а не требование: где их нет, работает скрейпинг DOM.

    // Сырые данные: глобал (тесты, ручная подстановка) или последнее событие "live" от компаньона.
    function _liveRaw() {
        var d = (typeof window !== "undefined") ? window.__MLBG_LIVE__ : null;
        if (d && typeof d === "object") return d;
        if (!_viaMoonCore) return null;
        var m = mooncoreModule();
        return (m && typeof m.get === "function") ? m.get("live") : null;
    }

    // Санитизация: данные приходят снаружи, а значения уходят в UI и в ключи конфига.
    // Пропускаем только известные поля известных типов и ограничиваем длину.
    function mlbgLive() {
        try {
            var d = _liveRaw();
            if (!d || typeof d !== "object") return null;
            function str(v, max) { return (typeof v === "string") ? v.slice(0, max) : ""; }
            function num(v) { return (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v) : 0; }
            return {
                rev: num(d.rev),
                branch: str(d.branch, 80),
                remote: str(d.remote, 120),
                dirty: d.dirty === true,
                errors: num(d.errors),
                warnings: num(d.warnings),
                languageId: str(d.languageId, 40).toLowerCase().replace(/[^a-z0-9_+-]/g, ""),
                fileExt: str(d.fileExt, 16).toLowerCase().replace(/[^a-z0-9_]/g, ""),
                folder: str(d.folder, 120)
            };
        } catch (e) { return null; }
    }
    // Подписка на свежие данные: fn зовётся, когда компаньон прислал новое событие "live"
    // (ветка сменилась, появились ошибки) — не ждать цикла самолечения. Без Moon Core — ничего.
    function liveSubscribe(fn) {
        if (!_viaMoonCore) return false;
        var m = mooncoreModule();
        if (!m || typeof m.on !== "function") return false;
        m.on("live", function () { try { fn(); } catch (e) { logErr("живые данные", e); } });
        return true;
    }

    // Значение с приоритетом живых данных: если поле есть и непустое — берём его, иначе null,
    // и вызывающий сам решает, чем это заменить (обычно — скрейпингом DOM).
    function liveStr(key) {
        var d = mlbgLive();
        var v = d ? d[key] : null;
        return (typeof v === "string" && v) ? v : null;
    }
    function liveNum(key) {
        var d = mlbgLive();
        var v = d ? d[key] : null;
        return (typeof v === "number") ? v : null;
    }
    // Откуда пришло значение — показываем в диагностике, чтобы было видно, работает ли мостик.
    function liveSource() {
        if (mlbgLive()) return "хост расширений";
        if (!_viaMoonCore) return "DOM (без Moon Core)";
        return "DOM (данные от компаньона ещё не пришли)";
    }

    // ===================== src/core/i18n.js =====================
    // ===== Локализация интерфейса (i18n) =====
    // Проект писался по-русски, и русский остаётся «исходным» языком: строки в коде — русские,
    // они же служат КЛЮЧАМИ словаря. t(ru) возвращает английский перевод, когда язык интерфейса
    // английский, иначе — саму русскую строку. Такой подход не может сломать русский UI: при
    // отсутствии перевода (или на русском языке) t() отдаёт исходную строку без изменений.
    //
    // Язык: cfg.lang ("auto" | "ru" | "en"). В «auto» берём язык интерфейса VS Code (атрибут lang
    // у <html>, который VS Code выставляет по display-language; запасной — navigator.language).
    // Если определить не удалось — русский (родной язык проекта). Пользователь всегда может явно
    // переключить язык в панели («Система» → «Язык / Language»).

    // Автоопределение — один раз при загрузке (потом только читаем cfg.lang). Возвращает "ru"/"en"/"".
    var _autoLang = (function () {
        try {
            var l = "";
            if (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute)
                l = document.documentElement.getAttribute("lang") || "";
            if (!l && typeof navigator !== "undefined") l = navigator.language || navigator.userLanguage || "";
            l = String(l).toLowerCase();
            if (l.indexOf("ru") === 0) return "ru";
            if (l.indexOf("en") === 0) return "en";
            return "";
        } catch (e) { return ""; }
    })();

    // Итоговый язык UI: явный выбор пользователя приоритетнее авто. cfg может ещё не существовать
    // (t() зовётся и до создания cfg в теории) — тогда идём от авто.
    function uiLang() {
        var v = (typeof cfg !== "undefined" && cfg && typeof cfg.lang === "string") ? cfg.lang : "auto";
        if (v === "ru" || v === "en") return v;
        return _autoLang === "en" ? "en" : "ru"; // auto: английский интерфейс -> en, иначе русский
    }

    // Перевод строки. На русском (или при отсутствии перевода) — исходная строка без изменений.
    function t(s) {
        if (uiLang() !== "en") return s;
        var v = EN[s];
        return typeof v === "string" ? v : s;
    }
    // Список кодов языка для селектора в панели: код + подпись (подпись не переводится — она
    // показывает язык на самом этом языке, как принято в переключателях).
    var LANGS = [["auto", "Авто / Auto"], ["ru", "Русский"], ["en", "English"]];
    function safeLang(v) { return (v === "auto" || v === "ru" || v === "en") ? v : "auto"; }

    // ===== Английский словарь =====
    // Ключ — точная русская строка из кода. Держим ПЛОСКИМ: так call-site просто оборачивается
    // в t("…"), без выдумывания идентификаторов. Отсутствие ключа не ошибка — покажется русский.
    var EN = {
        // -- Статусбар / заголовок панели --
        "Закрыть": "Close",

        // -- Вкладки --
        "Набор": "Sets",
        "Вид": "View",
        "Терминал": "Terminal",
        "Система": "System",
        "Данные": "Data",

        // -- Названия секций --
        "Генератор": "Generator",
        "Слайдшоу": "Slideshow",
        "По времени суток": "By time of day",
        "По проекту": "By project",
        "По ветке": "By branch",
        "По языку": "By file type",
        "Библиотека": "Library",
        "Яркость набора": "Set brightness",
        "Картинка": "Image",
        "Эффекты": "Effects",
        "Диагностика": "Diagnostics",
        "Горячие клавиши": "Hotkeys",
        "Папка плагина": "Plugin folder",
        "Экспорт темы": "Theme export",

        // -- Описания секций (info) --
        "Создать согласованный набор из seed-строки или базового цвета (#rrggbb): тёмная подложка + акцент + гармоничный спутник. Один seed всегда даёт один и тот же набор — им можно делиться. Наборы сохраняются и добавляются в конец списка.":
            "Create a coherent set from a seed string or a base color (#rrggbb): dark backdrop + accent + a harmonious companion. The same seed always yields the same set — shareable. Sets are saved and appended to the list.",
        "Автоматическая смена набора по кругу через заданный интервал.":
            "Automatically cycles through sets on a timer.",
        "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».":
            "Day set by day, night set by night. Takes priority over the slideshow; does not run in “random” mode.",
        "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.":
            "A set per open project and a git-branch indicator strip. Both rely on reading the VS Code title and status bar.",
        "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.":
            "Interface accent color and per-zone background image filters.",
        "Быстрые действия без открытия панели. Работают на любой раскладке (RU/EN).":
            "Quick actions without opening the panel. Work on any keyboard layout (RU/EN).",
        "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.":
            "Where to read set images from. Change it if you moved the plugin and the background vanished. Empty — the path is detected automatically.",
        "Собрать настоящую VS Code-тему (color-theme.json) из палитры активного набора: цвета интерфейса + подсветка синтаксиса. Работает там, где custom-фон недоступен. Как применить — в пояснении: задержи курсор на кнопке.":
            "Build a real VS Code theme (color-theme.json) from the active set’s palette: workbench colors + syntax highlighting. Works where the custom background isn’t available. How to apply it — hover the button for the explanation.",

        // -- Названия эффектов (FX_LIST) --
        "Ken Burns": "Ken Burns",
        "Стекло вкладок": "Glass tabs",
        "Виньетка": "Vignette",
        "Стекло панелей": "Glass panels",
        "Скрим кода": "Code scrim",
        "Стекло статусбара": "Glass status bar",
        "Активная строка": "Active line",
        "Контур группы": "Group ring",
        "Живой контур": "Living border",
        "Скроллбар": "Scrollbar",
        "Фон актив-бара": "Activity bar background",
        "Акцент вкладки": "Tab accent",
        "Скругления": "Rounded corners",
        "Свечение курсора": "Cursor glow",
        "Градиент выделения": "Selection gradient",
        "Титлбар": "Title bar",
        "Заставка": "Splash",
        "Часы": "Clock",
        "Частицы": "Particles",
        "Помидор": "Pomodoro",
        "Тускнеть при печати": "Dim while typing",
        "Тускнеть без фокуса": "Dim when unfocused",
        "Контур: 1 цвет": "Border: 1 color",
        "Палитра из картинки": "Palette from image",
        "Параллакс фона": "Background parallax",
        "Поток (глубокий дим)": "Flow (deep dim)",
        "Тускнеть неактивные": "Dim inactive",
        "Режим чтения": "Reading mode",
        "Стекло палитры": "Glass command palette",
        "Акцент поиска": "Find accent",
        "Миникарта сквозь": "See-through minimap",
        "Акцент отступов": "Indent accent",
        "Совпадения слова": "Word matches",
        "Стекло sticky": "Glass sticky scroll",
        "Aurora фон": "Aurora background",
        "Спотлайт": "Spotlight",
        "Пульс печати": "Typing pulse",
        "Тон акцентом": "Accent tint",
        "Читаемость кода": "Code legibility",
        "Реакция на ошибки": "Error reaction",
        "Режим Present": "Present mode",
        "Контраст+": "Contrast+",
        "Фокус-сессия": "Focus session",
        "Живой фон": "Living background",
        "Анимации UI": "UI animations",
        "Акрил": "Acrylic",
        "Шлейф курсора": "Cursor trail",
        "Питомец": "Pet",
        "Статистика": "Stats",

        // -- Стили частиц (PART_STYLES) --
        "Точки": "Dots",
        "Звёзды": "Stars",
        "Снег": "Snow",
        "Сакура": "Sakura",
        "Пузыри": "Bubbles",
        "Светлячки": "Fireflies",
        "Дождь": "Rain",
        "Конфетти": "Confetti",
        "Сезон (авто)": "Season (auto)",

        // -- Параметры силы (PARAMS) --
        "Размытие стекла": "Glass blur",
        "Ken Burns масштаб": "Ken Burns scale",
        "Ken Burns сек": "Ken Burns sec",
        "Виньетка сила": "Vignette strength",
        "Частиц": "Particle count",
        "Помидор, мин": "Pomodoro, min",
        "Aurora сек": "Aurora sec",
        "Спот радиус": "Spotlight radius",
        "Тон сила": "Tint strength",

        // -- Кнопки / поля / прочее --
        "Сохранить": "Save",
        "Применить": "Apply",
        "Экспорт": "Export",
        "Импорт": "Import",
        "Сбросить к дефолту": "Reset to defaults",
        "Восстановить прежние настройки": "Restore previous settings",
        "Проверить установку": "Check installation",
        "Скопировать код образа": "Copy look code",
        "↶ Отменить": "↶ Undo",
        "↷ Повторить": "↷ Redo",
        "только включённые": "only enabled",
        "Показывать только включённые эффекты": "Show only enabled effects",
        "Ничего не найдено": "Nothing found",
        "Ничего не найдено.": "Nothing found.",
        "Пресетов пока нет — сохрани текущий вид под именем.": "No presets yet — save the current look under a name.",
        "Поиск настроек…": "Search settings…",
        "Настроить": "Customize",
        "Настроить меню: показать кнопки «скрыть» у секций и эффектов": "Customize the menu: show “hide” buttons on sections and effects",
        "скрыть": "hide",
        "показать": "show",
        "Скрыть секцию": "Hide section",
        "Настройка меню": "Menu setup",
        "Показать/скрыть секции и эффекты панели, чтобы меню не разрасталось. Сними галочку — пункт исчезнет из панели (настройки не теряются), «Показать всё» вернёт всё. Быстро скрыть прямо в панели — кнопка «Настроить» в шапке.":
            "Show/hide panel sections and effects so the menu doesn’t grow out of hand. Uncheck an item and it disappears from the panel (settings are kept); “Show all” brings everything back. To hide something right in the panel, use the “Customize” button in the header.",
        "Секции": "Sections",
        "Эффекты в сетке": "Effects in the grid",
        "Показать всё": "Show all",
        "Показать все секции и эффекты": "Show all sections and effects",
        "Имя пресета": "Preset name",
        "Вставь код образа": "Paste look code",
        "Сохранить пресет": "Save preset",
        "Применить код образа": "Apply look code",

        // -- Горячие клавиши (описания) --
        "Открыть / закрыть панель": "Open / close panel",
        "Следующий набор": "Next set",
        "Предыдущий набор": "Previous set",
        "Фон и эффекты вкл / выкл": "Background & effects on / off",
        "Режим чтения вкл / выкл": "Reading mode on / off",
        "Отменить изменение вида": "Undo a look change",
        "Повторить отменённое": "Redo an undone change",

        // -- Тосты (boot.js / io.js) --
        "Фон включён": "Background on",
        "Фон выключен": "Background off",
        "Режим чтения включён": "Reading mode on",
        "Введите имя пресета": "Enter a preset name",
        "Резерва нет": "No backup",
        "Восстановлены прежние настройки": "Previous settings restored",
        "Код не распознан": "Code not recognized",
        "Образ применён из кода": "Look applied from code",
        "Код образа скопирован в буфер": "Look code copied to clipboard",
        "Не удалось сформировать код": "Could not build the code",
        "Всё в порядке": "All good",
        "Всё в порядке · отчёт скопирован": "All good · report copied",
        "Есть проблемы · отчёт скопирован для issue": "Problems found · report copied for an issue",

        // -- Служебные фрагменты / метки --
        "Эффект: ": "Effect: ",
        "Включено: ": "Enabled: ",
        "Фон и эффекты включены": "Background & effects on",
        "Фон и эффекты выключены": "Background & effects off",
        "Включить": "Enable",
        "Стиль частиц": "Particle style",
        "Дневной": "Day",
        "Ночной": "Night",
        "Шрифт": "Font",
        "Курсор": "Cursor",
        "Выделение": "Selection",
        "Редактор": "Editor",
        "Сайдбар": "Sidebar",
        "Панель": "Panel",
        "Лигатуры": "Ligatures",
        "Свеч. курсора": "Cursor glow",
        "Свечение": "Glow",
        "Жирность": "Weight",
        "Кур. шир.": "Cur. width",
        "Кур. выс.": "Cur. height",
        "Интервал, мин": "Interval, min",
        "День с, ч": "Day from, h",
        "День до, ч": "Day to, h",

        // -- Тосты с именем (переводим фиксированные фрагменты; имя набора/пресета — как есть) --
        "Пресет «": "Preset ",
        "» сохранён": " saved",
        "» применён": " applied",
        "» удалён": " deleted",
        "Слишком много пресетов (макс. ": "Too many presets (max ",

        // -- Диагностика (ключи отчёта) --
        "MoonLight custom-bg — диагностика": "MoonLight custom-bg — diagnostics",
        "Версия": "Version",
        "Тема": "Theme",
        "Активный набор": "Active set",
        "Папка картинок": "Image folder",
        "Сетевые картинки": "Remote images",
        "Стиль в DOM": "Style in DOM",
        "Кнопка BG": "BG button",
        "Всего наборов": "Total sets",
        "Язык интерфейса": "UI language",
        "да": "yes",
        "разрешены": "allowed",
        "выключены": "off",
        "НЕ найден": "NOT found",
        "найдена": "found",
        "нет (статусбар ещё не готов?)": "no (status bar not ready yet?)",
        "нет (мастер-выключатель)": "no (master switch)",
        "редактор": "editor",
        "сайдбар": "sidebar",
        "панель": "panel",

        // -- Статусбар (кнопка BG + подсказка) --
        "Набор ": "Set ",
        "BG выкл": "BG off",
        "Фон и дизайн — настройки": "Background & design — settings",
        "Фон и дизайн — настройки (фон выключен, Ctrl+Alt+0 — включить)": "Background & design — settings (background off, Ctrl+Alt+0 to enable)",
        " · авто-набор по времени суток": " · auto set by time of day",
        " · слайдшоу вкл": " · slideshow on",
        " (набор: ": " (set: ",

        // -- Пресеты (aria / title) --
        "Удалить пресет": "Delete preset",
        "Применить пресет ": "Apply preset ",
        "Удалить пресет ": "Delete preset ",

        // -- Диагностика: составные ключи скрейпинга --
        "Картинка · ": "Image · ",
        "Чтение из DOM · ": "DOM read · ",
        "СБОЙ": "FAIL",
        "git-ветка": "git branch",
        "счётчик ошибок": "error count",
        "имя проекта": "project name",

        // -- Секция «Набор»: переименование / генератор --
        "Имя": "Name",
        "Сгенерировать": "Generate",
        "Создать набор из seed/цвета в поле": "Create a set from the seed/color in the field",
        "Случайный": "Random",
        "Случайный согласованный набор": "A random coherent set",
        "Убрать все сгенерированные наборы": "Remove all generated sets",
        "Seed или базовый цвет набора": "Seed or base color of the set",
        "Достигнут предел сгенерированных наборов (": "Reached the generated-sets limit (",
        "Не удалось создать набор": "Could not create the set",
        "Набор создан: ": "Set created: ",
        "Сгенерированные наборы убраны": "Generated sets removed",
        "Очистить (": "Clear (",

        // -- Секция «Картинка»: акцент + фильтры --
        "Акцент": "Accent",
        "Акцент HEX": "Accent HEX",
        "Контраст к фону: ": "Contrast to background: ",
        "AA (крупный)": "AA (large)",
        "низкий": "low",
        "из картинки": "from image",
        "Взять акцент из фоновой картинки набора": "Take the accent from the set’s background image",
        "Акцент из картинки": "Accent from image",
        "Акцент из картинки: ": "Accent from image: ",
        "Не удалось взять цвет из картинки": "Could not take a color from the image",
        "Авто-яркость editor": "Auto-brightness (editor)",
        "Панель/терминал": "Panel/terminal",
        "Яркость": "Brightness",
        "Насыщенность": "Saturation",
        "Размытие": "Blur",
        "Зона": "Zone",
        "Вписывание": "Fit",
        "Заполнить (cover)": "Fill (cover)",
        "Целиком (contain)": "Contain",
        "Путь картинки": "Image path",

        // -- Папка / сеть / проект --
        "Папка": "Folder",
        "Разрешить сетевые картинки": "Allow remote images",
        "Полоска-индикатор ветки": "Branch indicator strip",
        "Проект: ": "Project: ",
        "Проект не определён — открыта ли папка?": "Project not detected — is a folder open?",
        "Закреплён набор ": "Pinned set ",
        "Забыть закрепление за проектом": "Forget the project pin",
        "Забыть закрепление набора за проектом": "Forget the set pin for this project",
        "Выбери набор выше — он закрепится за этим проектом.": "Pick a set above — it will be pinned to this project.",

        // -- Фон по ветке / по языку --
        "Набор под текущую git-ветку: main/master — один, фиче-ветки — другой. Приоритетнее слайдшоу и времени суток, но уступает «по проекту». Ветка читается из статусбара VS Code.":
            "A set per current git branch: main/master one, feature branches another. Takes priority over the slideshow and time of day, but yields to “by project”. The branch is read from the VS Code status bar.",
        "Набор под язык активного файла (по расширению): напр. .py — один набор, .md — другой. Самый частый контекст (низший приоритет). Расширение читается из подписи активной вкладки.":
            "A set per active file language (by extension): e.g. .py one set, .md another. The most frequent context (lowest priority). The extension is read from the active tab label.",
        "Фон по ветке": "Background by branch",
        "Фон по языку файла": "Background by file type",
        "Ветка: ": "Branch: ",
        "Ветка не определена — открыт ли git-репозиторий?": "Branch not detected — is a git repository open?",
        "Расширение: .": "Extension: .",
        "Файл не определён — открыт ли редактор?": "File not detected — is an editor open?",
        "Набор для ветки": "Set for branch",
        "Набор для расширения": "Set for extension",
        "Границы дня": "Day bounds",
        "По часам": "Fixed hours",
        "Рассвет/закат": "Sunrise/sunset",
        "Широта": "Latitude",
        "Долгота": "Longitude",
        "Крутить библиотеку в редакторе": "Cycle the library in the editor",
        "Добавить": "Add",
        "Удалить": "Delete",
        "Слишком много картинок (макс. 64)": "Too many images (max 64)",
        "Витрина": "Showcase",
        "После нескольких минут простоя показывает крупные часы, дату и имя набора поверх экрана; любое действие возвращает редактор. Удобно для стрима и «настроения» рабочего стола.":
            "After a few idle minutes it shows a large clock, date and the set name over the screen; any action brings the editor back. Nice for streaming and desk ambiance.",
        "Простой, мин": "Idle, min",
        "Любое действие — вернуться": "Any action returns",
        "Статистика сессии": "Session stats",
        "В сессии": "Session",
        "Нажатий": "Keystrokes",
        "Файлов": "Files",
        "В потоке": "In flow",
        "Лучший стрик": "Best streak",
        "Сбросить статистику": "Reset stats",

        // -- Чипы наборов / слайдеры --
        "Двойной клик — сброс к значению по умолчанию": "Double-click — reset to default",
        "Не грузится: ": "Not loading: ",
        " (редактор · сайдбар · панель)": " (editor · sidebar · panel)",
        "Случайный набор": "Random set",

        // -- Онбординг / профили --
        "Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.":
            "Pick a ready-made profile — it sets the whole look. You can fine-tune everything afterwards.",
        "Применить профиль": "Apply profile",
        "Спокойный": "Calm",
        "Фокус": "Focus",
        "Презентация": "Presentation",
        "Минимал": "Minimal",
        "Максимум": "Maximum",
        "Ровный тёмный фон, мягкое стекло, без движения — читаемость на первом месте.":
            "Even dark background, soft glass, no motion — readability first.",
        "Гаснет всё лишнее, спотлайт у курсора, приглушение при печати — только код.":
            "Everything extra dims, a spotlight at the cursor, dim-on-type — code only.",
        "Крупные акценты, спокойный фон, скрыт визуальный шум — для стрима и скринкаста.":
            "Bold accents, calm background, visual noise hidden — for streams and screencasts.",
        "Почти ванильный VS Code: тонкий фон, без эффектов и частиц.":
            "Almost vanilla VS Code: a faint background, no effects or particles.",
        "Всё включено: живой фон, частицы, свечения — витрина возможностей.":
            "Everything on: living background, particles, glows — a showcase.",
        "Профиль применён: ": "Profile applied: ",
        "MoonLight BG: открой панель кнопкой BG в статусбаре. Быстрый старт — «Данные → Профили»; колесо над кнопкой листает наборы, правый клик — быстрые действия.":
            "MoonLight BG: open the panel from the BG button in the status bar. Quick start — “Data → Profiles”; scroll over the button to flip sets, right-click for quick actions.",

        // -- Производительность --
        "Авто-бюджет FPS": "Auto FPS budget",
        "Экономия ресурсов активна: часть эффектов приглушена": "Power-saving active: some effects dimmed",

        // -- Язык --
        "Язык панели": "Panel language",

        // -- Синхронизация через settings.json --
        "Загрузить базу из settings.json": "Load baseline from settings.json",
        "Не удалось скопировать": "Could not copy",
        "Загружено из settings.json": "Loaded from settings.json",
        "Базовый конфиг из settings.json не найден (нужно расширение-компаньон)":
            "No baseline config from settings.json (companion extension required)",

        // -- Экспорт темы VS Code --
        "Экспорт VS Code-темы": "Export VS Code theme",
        "Тема соберётся из палитры активного набора: ": "The theme is built from the active set’s palette: ",
        "Тема «": "Theme ",
        "» сохранена в файл + в буфере": " saved to file + clipboard",
        "Тема сохранена в файл": "Theme saved to file",
        "Тема скопирована в буфер": "Theme copied to clipboard",
        "Не удалось выгрузить тему": "Could not export the theme",

        // -- Экспорт / импорт конфига (тосты) --
        "Экспорт: файл сохранён + в буфере обмена": "Export: file saved + on clipboard",
        "Экспорт: файл сохранён": "Export: file saved",
        "Экспорт: скопировано в буфер": "Export: copied to clipboard",
        "Не удалось выгрузить": "Could not export",
        "Файл слишком большой (>256 КБ)": "File too large (>256 KB)",
        "Импортировано. Заблокировано ": "Imported. Blocked ",
        " сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику.":
            " remote image links — the editor won’t go online. Remote images stay off; enable them manually only if you trust the source.",
        "Настройки импортированы": "Settings imported",
        "Ошибка: файл не читается как JSON": "Error: file can’t be read as JSON",
        "Не удалось прочитать файл": "Could not read the file",

        // -- История (Undo/Redo) тосты --
        "Нечего отменять": "Nothing to undo",
        "Отменено": "Undone",
        "Нечего повторить": "Nothing to redo",
        "Повторено": "Redone",

        // -- Помидор (виджет) --
        "Помидор: клик — старт/пауза, Alt+клик — сброс": "Pomodoro: click — start/pause, Alt+click — reset",
        "Помидор готов — перерыв!": "Pomodoro done — take a break!",

        // -- v22: избранное / группы эффектов / бейджи / сброс / быстрое меню --
        // Избранное + настройка меню
        "★ Избранное": "★ Favorites",
        "В избранное": "Add to favorites",
        "Убрать из избранного": "Remove from favorites",
        "Перейти к секции": "Go to section",
        "Показать секцию": "Show section",
        "Категории настроек": "Setting categories",
        "Отметь звёздочкой секции и эффекты в режиме «Настроить» — они появятся здесь для быстрого доступа.":
            "Star sections and effects in “Customize” mode — they’ll appear here for quick access.",
        "Галочка — показывать пункт в панели; звёздочка — закрепить его в «Избранное» вверху. Снятая галочка ничего не теряет — пункт вернётся, если поставить её снова.":
            "Checkbox — show the item in the panel; star — pin it to “Favorites” at the top. Unchecking loses nothing — the item returns when you check it again.",
        // Группы эффектов (FX_GROUP_ORDER)
        "Стекло и поверхности": "Glass & surfaces",
        "Код и подсветка": "Code & syntax",
        "Движение и фон": "Motion & background",
        "Фокус и чтение": "Focus & reading",
        "Окружение и статус": "Ambient & status",
        "Интерфейс": "Interface",
        "Приятное": "Delight",
        "Прочее": "Other",
        // «Изменено» / сброс
        "Отличается от значения по умолчанию": "Differs from the default",
        "Сбросить к значению по умолчанию": "Reset to default",
        "Сбросить эффекты к дефолту": "Reset effects to defaults",
        "Эффекты сброшены к значениям по умолчанию": "Effects reset to defaults",
        // Глубокий поиск: подписи каталога контролов
        "Яркость: редактор": "Brightness: editor",
        "Яркость: сайдбар": "Brightness: sidebar",
        "Яркость: панель": "Brightness: panel",
        "Авто-яркость": "Auto-brightness",
        "Акцентный цвет": "Accent color",
        "Безопасные акценты": "Safe accents",
        "Фильтры картинки": "Image filters",
        "Сила эффектов": "Effect strength",
        "Сброс эффектов": "Reset effects",
        "Шрифт терминала": "Terminal font",
        "Курсор терминала": "Terminal cursor",
        "Выделение терминала": "Terminal selection",
        "Свечение терминала": "Terminal glow",
        "Интервал слайдшоу": "Slideshow interval",
        "Экспорт настроек": "Export settings",
        "Импорт настроек": "Import settings",
        "Отменить / Повторить": "Undo / Redo",
        // Активный профиль
        "(сейчас: изменён вручную)": "(now: edited manually)",
        "✓ активен": "✓ active",
        "активен": "active",
        // Быстрое меню по правому клику
        "Выключить фон и эффекты": "Turn background & effects off",
        "Включить фон и эффекты": "Turn background & effects on",
        "Выключить режим чтения": "Turn reading mode off",
        "Включить режим чтения": "Turn reading mode on",
        "Открыть панель…": "Open panel…",
        "Режим чтения выключен": "Reading mode off",

        // -- v22.1: индикатор производительности / ресайз панели --
        "Авто-бюджет FPS выключен — эффекты не приглушаются": "Auto FPS budget off — effects aren’t dimmed",
        "FPS не измеряется (нет тяжёлых эффектов)": "FPS not measured (no heavy effects)",
        "Производительность: ~": "Performance: ~",
        " FPS · эконом-режим: ": " FPS · power-saving: ",
        "вкл": "on",
        "выкл": "off",
        "Потянуть — ширина панели": "Drag — panel width",
        "Адаптивный скрим": "Adaptive scrim",
        "Настоящая прозрачность": "True transparency",
        "худший участок": "worst spot",
        "— норма": "— fine",
        "Исправить": "Fix",
        "Подобрать прозрачность фона ради читаемости кода": "Pick a background opacity that keeps code readable",
        "Читаемость: нет данных (картинка ещё грузится)": "Readability: no data yet (image still loading)",
        "Не удалось измерить читаемость": "Could not measure readability",
        "Прозрачность фона редактора для этого набора": "Editor background opacity for this set",
        "(ниже 4.5 — фон мешает читать)": "(below 4.5 — the background hurts reading)",
        "Загрузчик": "Loader",
        "определено косвенно": "detected indirectly",
        "Окно создано прозрачным — эффект «Настоящая прозрачность» покажет рабочий стол сквозь редактор.": "The window is transparent — the “True transparency” effect will show the desktop through the editor.",
        "Окно непрозрачное. Настоящее стекло умеет только Custom UI Style: скопируй опции ниже в settings.json и перезапусти редактор.": "The window is opaque. Only Custom UI Style can do real glass: copy the options below into settings.json and restart the editor.",
        "Скопировать импорт": "Copy import",
        "Скопировать опции прозрачности": "Copy transparency options",
        "Скопировано в буфер — вставь в settings.json": "Copied — paste it into settings.json",
        "Скопировано в буфер — вставь в settings.json и перезапусти редактор": "Copied — paste into settings.json and restart the editor",
        "Селекторы вёрстки": "Workbench selectors",
        "Обязательные элементы вёрстки не найдены — скорее всего, обновление VS Code изменило разметку. Часть оформления не применится. Приложи этот отчёт к issue.": "Required workbench elements were not found — a VS Code update most likely changed the markup, so part of the styling will not apply. Attach this report to an issue.",
        "Не найдено (норма, если элемент скрыт): ": "Not found (normal when the element is hidden): ",
        "Быстрый переключатель": "Quick switcher",
        "Набор, эффект или команда…": "Set, effect or command…",
        "эффект": "effect",
        "команда": "command",
        "шейдер": "shader",
        "процедурный": "procedural",
        "градиент": "gradient",
        "фото": "photo",
        "Открыть панель": "Open panel",
        "Свой GLSL-шейдер": "Custom GLSL shader",
        "Применить шейдер": "Apply shader",
        "Очистить": "Clear",
        "Шейдер применён": "Shader applied",
        "Шейдер сброшен на встроенный": "Shader reset to the built-in one",
        "Тело фрагментного шейдера: функция vec3 render(vec2 p). Доступны u_time, u_res, u_accent, u_base, u_mouse. Выбери набор «Свой шейдер», чтобы увидеть результат.": "Fragment shader body: a vec3 render(vec2 p) function. u_time, u_res, u_accent, u_base and u_mouse are available. Pick the “Custom shader” set to see the result.",
        "Быстрый переключатель (наборы, эффекты, команды)": "Quick switcher (sets, effects, commands)",
        "Нужен эффект: ": "Requires effect: ",
        "Шейдер рисуется только в наборе «Свой шейдер» — сейчас выбран другой.": "The shader is drawn only in the “Custom shader” set — another set is active right now.",
        "Выбрать": "Switch",
        "Выбрать набор «Свой шейдер»": "Switch to the “Custom shader” set",
        "Читаемость: фон выключен": "Readability: background is off",
        "Данные редактора": "Editor data",
        "хост расширений": "extension host",
        "DOM (без Moon Core)": "DOM (no Moon Core)",
        "DOM (данные от компаньона ещё не пришли)": "DOM (no data from the companion yet)",
        "Ошибки рантайма": "Runtime errors",
        "разных": "distinct",
        "нет": "none",
        "всего": "total",
        "Резерв конфига на диске": "Config backup on disk",
        "нет (нужен Moon Core)": "none (needs Moon Core)",
        "есть": "present",
        "сохраняется": "saving",
        "Фон из профиля": "Background from profile",
        "Живые данные": "Live data",
        "ветка": "branch",
        "репозиторий": "repository",
        "язык": "language",
        "ошибок": "errors",
        "Фон по репозиторию": "Background per repository",
        "Репозиторий: ": "Repository: ",
        "Репозиторий не определён — нужен компаньон и git-remote": "Repository unknown — needs the companion and a git remote",
        "Набор для репо": "Set for repo",
        "Авто-смена": "Auto switch",
        "Какой фон показывать и откуда он берётся": "Which background to show and where it comes from",
        "Когда и по какому поводу фон меняется сам": "When and why the background changes by itself",
        "Яркость, акцент и фильтры картинки": "Brightness, accent and image filters",
        "Анимации, стекло, частицы и виджеты": "Animations, glass, particles and widgets",
        "Шрифт, курсор и свечение терминала": "Terminal font, cursor and glow",
        "Профили, пресеты, обмен и резервные копии": "Profiles, presets, sharing and backups",
        "Язык, загрузчик, диагностика и состав меню": "Language, loader, diagnostics and menu layout",
        "Фон и дизайн": "Background & design",
        "Всё меняется сразу — сохранять не нужно": "Everything applies instantly — no need to save",
        "Быстрый переключатель: наборы, эффекты, команды": "Quick switcher: sets, effects, commands",
        "Быстрый переключатель…": "Quick switcher…",
        "Закрыть панель": "Close panel",
        "Новый набор при каждом запуске": "A new set on every launch",
        "найден (скрипт активен)": "found (script active)",
        "Фон и дизайн — настройки (фон выключен)": "Background & design — settings (background off)",
        "Точно сбросить? Нажми ещё раз": "Really reset? Click again",
        "\nКлик — панель, колесо — листать наборы, правый клик — быстрые действия": "\nClick — panel, scroll — flip sets, right-click — quick actions",
        "Шейдер": "Shader",
        "По репозиторию": "By repository",
        "Свой GLSL-фон для набора «Свой шейдер»: тело функции render(vec2 p). Ошибка компиляции не ломает редактор — фон откатится на встроенный.": "Your own GLSL background for the “Custom shader” set: the body of render(vec2 p). A compile error never breaks the editor — the background falls back to the built-in one.",
        "Набор под удалённый репозиторий (владелец/имя): один и тот же проект, склонированный в разные папки, получает один фон. Адрес репозитория берётся из git через компаньон-расширение — из вёрстки редактора его не достать.": "A set per remote repository (owner/name): the same project cloned into different folders gets one background. The repository address comes from git via the companion extension — the editor layout doesn't expose it.",
        "Свои картинки списком: когда «Крутить библиотеку» включено, они по очереди показываются в редакторе и сменяются по таймеру слайдшоу (интервал — на вкладке «Авто-смена»). Пути локальные: file:/// или vscode-file://.": "Your own pictures as a list: with “Rotate library” on, they show in the editor one by one and change on the slideshow timer (interval — on the “Auto switch” tab). Paths are local: file:/// or vscode-file://.",
        "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — пояснение и живой предпросмотр. Эффекты сгруппированы по смыслу; «только включённые» прячет выключенные. Конкретный эффект ищи полем поиска вверху панели.": "Turn visual effects on/off and set their strength. Hover an item for its explanation and a live preview. Effects are grouped by meaning; “only enabled” hides the disabled ones. Find a specific effect with the search box at the top of the panel.",
        "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, найден ли стиль). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.": "Installation check: what the plugin sees about itself (version, theme, set, folder and image loading, whether the style was found). The report is copied to the clipboard for an issue. Look here if the background didn't appear.",
        "Каким путём внедрён плагин (Moon Core, Custom UI Style или Custom CSS and JS) и готово ли окно к настоящей прозрачности. Кнопки кладут в буфер нужные строки для settings.json.": "How the plugin is injected (Moon Core, Custom UI Style or Custom CSS and JS) and whether the window is ready for true transparency. The buttons copy the needed settings.json lines to the clipboard.",
        "Сводка текущей сессии: время, тронутые файлы, нажатия, суммарное время в потоке и лучший стрик непрерывной печати. Копится, пока включён тумблер «Статистика» (вкладка «Эффекты»). Данные живут только в этой сессии.": "Summary of the current session: time, files touched, keystrokes, total time in flow and the best streak of continuous typing. Accumulates while the “Statistics” switch is on (“Effects” tab). Data lives only in this session.",
        "Убрать из любимых": "Remove from favorites",
        "В любимые": "Add to favorites",
        "Палитры": "Palettes",
        "Любимые": "Favorites",
        "Все": "All",
        "Безопасные": "Colorblind-safe",
        "Любимые наборы": "Favorite sets",
        "Наборы": "Sets",
        "Отметь наборы звёздочкой на карточке — они появятся здесь": "Star sets on their cards — they will show up here",
        "Сейчас: набор ": "Now: set ",
        "по проекту": "by project",
        "по репозиторию": "by repository",
        "по ветке": "by branch",
        "по языку файла": "by file language",
        "случайный при каждом запуске": "random on every launch",
        "по времени суток": "by time of day",
        "слайдшоу": "slideshow",
        "выбран вручную — авто-смена выключена": "picked manually — auto switch is off",
        "; в редакторе крутится библиотека": "; the editor rotates your library",
        "Правило: ": "Rule: ",
        "Открепить панель": "Unpin panel",
        "Закрепить панель: не закрывать кликом мимо": "Pin panel: don't close on outside click",
        "Показать знакомство с панелью": "Show the panel tour",
        "Пропустить": "Skip",
        "Дальше": "Next",
        "из": "of",
        "Понятно": "Got it",
        "1. Вкладки": "1. Tabs",
        "2. Кнопки в шапке": "2. Header buttons",
        "3. Кнопка BG": "3. The BG button",
        "Эту картинку нельзя загрузить (сетевые картинки выключены)": "This image can't be loaded (network images are off)",
        "Картинка стала фоном набора ": "The image is now the background of set ",
        ". Отменить — стрелка в шапке панели.": ". Undo — the arrow in the panel header.",
        "Не удалось открыть выбор файла: ": "Couldn't open the file picker: ",
        "В папке нет картинок": "No images in this folder",
        "Папка «": "Folder “",
        " карт. — сменяются в редакторе по таймеру слайдшоу": " images — they rotate in the editor on the slideshow timer",
        "Не удалось открыть выбор папки: ": "Couldn't open the folder picker: ",
        "Картинку можно и перетащить в панель из проводника VS Code.": "You can also drag an image into the panel from the VS Code explorer.",
        "по зонам": "per zone",
        "Яркость по зонам": "Brightness per zone",
        "Яркость фона": "Background brightness",
        "Точка фокуса": "Focus point",
        "Кликни по картинке — эта точка останется в кадре.": "Click the picture — that point stays in view.",
        "по центру": "center",
        "Сбросить точку фокуса": "Reset focus point",
        "Набор больше не привязан к проекту «": "The set is no longer pinned to project “",
        "Проект «": "Project “",
        "» теперь всегда открывается с этим набором": "” will now always open with this set",
        "Закрепить набор за проектом": "Pin this set to the project",
        "Открепить набор от проекта": "Unpin the set from the project",
        "Правила ниже — по старшинству: срабатывает верхнее включённое.": "Rules below are in priority order: the topmost enabled one wins.",
        "Похоже, картинки набора не грузятся — проверь «Папку плагина» и диагностику ниже.": "Looks like the set's images don't load — check “Plugin folder” and diagnostics below.",
        "Вернуть настройки на ": "Restore settings from ",
        "Настройки возвращены на ": "Settings restored from ",
        " — отменить: «Восстановить прежние настройки»": " — to undo: “Restore previous settings”",
        "Перетащи картинку из проводника VS Code или нажми «Своя картинка…»": "Drag an image from the VS Code explorer or click “Your image…”",
        "Все настройки": "All settings",
        "Проще": "Simpler",
        "Показать все вкладки и настройки": "Show all tabs and settings",
        "Оставить только главное": "Keep only the essentials",
        "Своя картинка…": "Your image…",
        "Папка картинок…": "Image folder…",
        "Вернуть картинки набора": "Restore set images",
        "Убрать папку": "Remove folder",
        "Тонкая настройка эффектов": "Fine-tune effects",
        "Проблемы с фоном? Проверить установку": "Background issues? Check the installation",
        "Поделиться кодом": "Share as code",
        "Копии настроек по дням": "Daily settings copies",
        "Стили": "Styles",
        "Образы": "Looks",
        "Здесь только главное. Число на вкладке — сколько там включено. Кнопка «Все настройки» в шапке открывает остальное, а поиск вверху находит любой пункт.": "Only the essentials are here. The number on a tab shows how much is enabled. “All settings” in the header opens the rest, and the search at the top finds any item.",
        "Быстрый переключатель наборов и эффектов, отмена и повтор, «Все настройки» и булавка: закреплённая панель не закрывается кликом мимо. Свою картинку можно просто перетащить в панель.": "Quick switcher for sets and effects, undo and redo, “All settings” and the pin: a pinned panel doesn't close on an outside click. You can simply drag your own image into the panel.",
        "Клик — эта панель. Колесо мыши над кнопкой листает наборы. Правый клик — любимые наборы, закрепление набора за проектом и частые действия.": "Click — this panel. Scroll over the button to flip sets. Right-click — favorite sets, pinning the set to the project and common actions.",
        "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске. Свою картинку можно выбрать кнопкой или перетащить в панель.": "Pick the background set (editor / sidebar / panel). “random” — a new set on every launch. Choose your own image with the button or drag it into the panel.",
        "Насколько ярко проступает фон. Один ползунок двигает все зоны сразу; «по зонам» — тонкая настройка редактора, сайдбара и панели.": "How strongly the background shows. One slider moves all zones at once; “per zone” fine-tunes the editor, sidebar and panel.",
        "Готовые стили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком. Наведи — примерка без применения.": "Ready-made styles: calm, focus, presentation, minimal, maximum. One click sets up the background and effects. Hover to try without applying.",
        "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение. Цвета курсора и выделения, пока их не меняли, следуют за акцентом набора.": "Integrated terminal look: font, ligatures, glow, cursor, selection. Cursor and selection colors follow the set's accent until you change them.",
        "Сохранённые образы вида: весь вид под именем, переключение одним кликом (наведи — примерка). Ниже — обмен коротким кодом и перенос на другие машины.": "Saved looks: the whole appearance under a name, switched in one click (hover to try). Below — sharing via a short code and moving to other machines.",
        "На других машинах ещё нет синхронизированного вида": "No synced look from other machines yet",
        "Здесь уже самый свежий вид": "This machine already has the latest look",
        "Вид подтянут с другой машины": "Look pulled from another machine",
        "Вид будет переезжать на другие машины через Settings Sync": "Your look will move to other machines via Settings Sync",
        "Не удалось: ": "Failed: ",
        "Прежний вид возвращён": "Previous look restored",
        "Режим презентации: фон тише, акценты крупнее": "Presentation mode: quieter background, bolder accents",
        "Что нового": "What's new",
        "Фон приглушён ровно настолько, чтобы код читался": "Background dimmed just enough for code to read well",
        "Не показывать этот совет": "Don't show this tip",
        "Список пуст — выбери «Папку картинок…» в секции «Набор» или добавь пути к картинкам.": "The list is empty — pick an “Image folder…” in the “Set” section or add image paths.",
        "Простой режим: на виду только главное, остальное — «Все настройки».": "Simple mode: only the essentials are visible, the rest is under “All settings”.",
        "Своя картинка или целая папка — кнопками ниже или перетаскиванием в панель.": "Your own image or a whole folder — with the buttons below or by dragging into the panel.",
        "Стили эффектов в один клик и копии настроек по дням.": "One-click effect styles and daily settings copies.",
        "Код местами читается хуже: картинка слишком яркая под текстом.": "Code is harder to read in places: the image is too bright under the text.",
        "Приглушить фон": "Dim the background",
        "Картинка светлая — включить авто-яркость, чтобы код не терялся?": "The image is light — turn on auto-brightness so code doesn't get lost?",
        "Как есть": "As is",
        "Мягко": "Soft",
        "Чётко": "Crisp",
        "Приглушённо": "Muted",
        "Режим презентации": "Presentation mode",
        "Выключить режим презентации": "Turn off presentation mode",
        "Синхронизировать между машинами": "Sync between machines",
        "Подтянуть вид с другой машины": "Pull the look from another machine",
        "Между машинами": "Between machines",
        "цвет": "color"
    };

    // ===================== src/fx/color.js =====================
    // ===== Перцептивный цвет: OKLab/OKLCH, палитра из картинки, контраст =====
    // Раньше акцент и палитра считались в HSL. HSL «врёт» о светлоте: жёлтый с L=0.5 и синий
    // с L=0.5 воспринимаются как разные по яркости, поэтому нормировка «S/L в читаемый диапазон»
    // давала то ядовитый, то почти невидимый акцент. Здесь тот же приём, что у pywal/matugen/
    // Material You, но без зависимостей: перевод в OKLab (перцептивно равномерное пространство),
    // кластеризация по цветности, отбор по «оценке» и приведение к постоянной воспринимаемой
    // светлоте. Формулы OKLab — Björn Ottosson (public domain).
    //
    // Порядок в сборке: ДО css.js (там эти функции зовутся из probeImage/buildCSS).

    // ---- sRGB <-> линейное ----
    function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function linToSrgb(v) {
        v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, v)) * 255);
    }
    // ---- OKLab ----
    function rgbToOklab(r, g, b) {
        var R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
        var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
        var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
        var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
        return [
            0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
        ];
    }
    function oklabToRgb(L, a, b) {
        var l = L + 0.3963377774 * a + 0.2158037573 * b;
        var m = L - 0.1055613458 * a - 0.0638541728 * b;
        var s = L - 0.0894841775 * a - 1.2914855480 * b;
        l = l * l * l; m = m * m * m; s = s * s * s;
        return [
            linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
        ];
    }
    // ---- OKLCH (полярная форма OKLab): L — светлота 0..1, C — цветность, h — оттенок в радианах ----
    function rgbArrToHex(c) {
        function hx(v) { var t = Math.round(Math.min(255, Math.max(0, v))).toString(16); return t.length < 2 ? "0" + t : t; }
        return "#" + hx(c[0]) + hx(c[1]) + hx(c[2]);
    }
    function hexToRgbArr(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    function oklchToHex(L, C, h) { return rgbArrToHex(oklabToRgb(L, Math.cos(h) * C, Math.sin(h) * C)); }
    function hexToOklch(hex) {
        var c = hexToRgbArr(hex), lab = rgbToOklab(c[0], c[1], c[2]);
        return [lab[0], Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]), Math.atan2(lab[2], lab[1])];
    }

    // ---- Контраст (WCAG 2.1) ----
    // Относительная яркость и коэффициент контраста 1..21. Живёт здесь, а не в css.js, чтобы
    // весь цвет считался в одном месте (палитра, акцент и проверка читаемости — одна тема).
    function relLuminance(hex) {
        var a = hexToRgbArr(hex), i, v, o = [];
        for (i = 0; i < 3; i++) { v = a[i] / 255; o.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); }
        return 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2];
    }
    // Контраст между двумя ЯРКОСТЯМИ (0..1). Нужен «метру читаемости»: фон под кодом — это
    // смесь темы и картинки, у которой нет одного hex-цвета, только измеренная светлота.
    function contrastLum(l1, l2) {
        var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
    }
    function contrastRatio(h1, h2) { return contrastLum(relLuminance(h1), relLuminance(h2)); }
    // Поднять/опустить светлоту акцента, пока контраст к подложке не достигнет want (обычно 3.0
    // для крупных элементов интерфейса). Оттенок и цветность сохраняются — меняется только L,
    // поэтому цвет остаётся «тем же», просто читаемым. Возвращает исходный hex, если уже хватает.
    function accentForContrast(hex, bgHex, want) {
        try {
            if (contrastRatio(hex, bgHex) >= want) return hex;
            var lch = hexToOklch(hex), bgLum = relLuminance(bgHex);
            var up = bgLum < 0.18; // тёмная подложка -> осветляем акцент, светлая -> затемняем
            var best = hex, L = lch[0], i;
            for (i = 0; i < 24; i++) {
                L += up ? 0.02 : -0.02;
                if (L <= 0.05 || L >= 0.98) break;
                best = oklchToHex(L, lch[1], lch[2]);
                if (contrastRatio(best, bgHex) >= want) return best;
            }
            return best;
        } catch (e) { return hex; }
    }

    // ===== Палитра из картинки =====
    // ACC_L / ACC_C — целевые светлота и цветность акцента в OKLab. Подобраны так, чтобы акцент
    // был различим на тёмной подложке редактора и не «кислотил» на светлой теме. Все цвета
    // палитры приводятся к ним — поэтому набор акцентов из любой картинки выглядит единым по
    // силе, а не «один бледный, другой ядовитый».
    var ACC_L = 0.78, ACC_C_MIN = 0.09, ACC_C_MAX = 0.17;
    function normAccentLch(L, C, h) {
        return oklchToHex(ACC_L, Math.min(ACC_C_MAX, Math.max(ACC_C_MIN, C)), h);
    }
    // Кластеризация пикселей по оттенку в OKLab. Вес пикселя — цветность^2 (серые почти не
    // влияют на оттенок) с поправкой на светлоту: почти чёрные и почти белые пиксели дают
    // ненадёжный оттенок, поэтому их вклад гасится. Возвращает отсортированные по «оценке»
    // корзины [{ h, C, L, w }]. BINS=24 (шаг 15°) — мельче различает соседние оттенки, чем
    // прежние 12 корзин по HSL.
    function _hueBins(d) {
        var BINS = 24, acc = [], i;
        for (i = 0; i < BINS; i++) acc.push({ x: 0, y: 0, c: 0, l: 0, w: 0 });
        for (i = 0; i < d.length; i += 4) {
            var lab = rgbToOklab(d[i], d[i + 1], d[i + 2]);
            var L = lab[0], C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
            if (C < 0.012) continue;                               // почти серый — оттенка нет
            var trust = Math.max(0, 1 - Math.abs(L - 0.55) * 1.8); // доверие к оттенку по светлоте
            var w = C * C * trust;
            if (w <= 0) continue;
            var h = Math.atan2(lab[2], lab[1]);                    // -PI..PI
            var b = Math.floor(((h + Math.PI) / (2 * Math.PI)) * BINS) % BINS;
            var a = acc[b];
            a.x += Math.cos(h) * w; a.y += Math.sin(h) * w; a.c += C * w; a.l += L * w; a.w += w;
        }
        var out = [];
        for (i = 0; i < BINS; i++) {
            var g = acc[i]; if (g.w < 1e-5) continue;
            out.push({ h: Math.atan2(g.y, g.x), C: g.c / g.w, L: g.l / g.w, w: g.w });
        }
        // Оценка корзины — не только «сколько пикселей», но и насколько цвет выразителен:
        // редкий, но насыщенный неон важнее огромного блёклого неба (иначе акцентом любой
        // ночной картинки становился бы серо-синий). Это аналог color scoring в Material You.
        out.sort(function (A, B) { return (B.w * (0.35 + B.C)) - (A.w * (0.35 + A.C)); });
        return out;
    }
    // Доминирующий цвет как готовый акцент. d — ImageData.data уменьшенной картинки.
    // Почти серая картинка -> берём среднее RGB и поднимаем цветность до минимума.
    function dominantAccent(d) {
        if (!d || !d.length) return null;
        var bins = _hueBins(d);
        if (bins.length) return normAccentLch(bins[0].L, bins[0].C, bins[0].h);
        var r = 0, g = 0, b = 0, n = 0, i;
        for (i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        if (!n) return null;
        var lch = hexToOklch(rgbArrToHex([r / n, g / n, b / n]));
        return normAccentLch(lch[0], Math.max(ACC_C_MIN, lch[1]), lch[2]);
    }
    // Гармоничная палитра до 3 акцентов: топ-корзины с разносом по оттенку не меньше MIN_DH
    // (иначе получались три почти одинаковых цвета и «радужный контур» выглядел одноцветным).
    function dominantPalette(d) {
        if (!d || !d.length) return [];
        var MIN_DH = Math.PI / 6; // 30°
        var bins = _hueBins(d), out = [], hs = [], i, j, ok;
        for (i = 0; i < bins.length && out.length < 3; i++) {
            ok = true;
            for (j = 0; j < hs.length; j++) {
                var dh = Math.abs(bins[i].h - hs[j]);
                if (dh > Math.PI) dh = 2 * Math.PI - dh;
                if (dh < MIN_DH) { ok = false; break; }
            }
            if (!ok) continue;
            hs.push(bins[i].h);
            out.push(normAccentLch(bins[i].L, bins[i].C, bins[i].h));
        }
        return out;
    }
    // Поворот оттенка в OKLab (запасные accent2/accent3, когда палитры из картинки нет).
    // dh — доля полного круга (0.33 = +120°). Светлота/цветность приводятся к акцентным.
    function rotateHue(hex, dh) {
        var lch = hexToOklch(hex);
        return normAccentLch(lch[0], lch[1], lch[2] + dh * 2 * Math.PI);
    }

    // ===== HSL =====
    // Осталось для генератора наборов по seed и экспорта темы: там оттенок задаётся вручную и
    // удобнее крутить именно HSL. Палитра из картинки и акценты считаются в OKLab (выше).
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
    // Палитра, доминирующий акцент, поворот оттенка и WCAG-контраст переехали в src/fx/color.js
    //: считаются в OKLab, а не в HSL. Имена функций прежние — dominantAccent,
    // dominantPalette, rotateHue, contrastRatio, hexToRgbArr; здесь оставлены только
    // HSL-хелперы, которыми пользуются генератор наборов по seed и экспорт тем.

    // ===================== src/fx/image.js =====================
    // ===== Картинки набора: загрузка, метрики, кэш =====
    // Одна проба на URL обслуживает всё сразу: факт загрузки (404 -> зона откатывается на
    // акцентную подложку), среднюю яркость (авто-дим), доминирующий акцент и палитру, карту
    // яркости 8x8 (адаптивный скрим) и мини-превью для чипов. Результат кэшируется в памяти и в
    // localStorage, поэтому следующий запуск рисует фон сразу, не дожидаясь декодирования JPEG.

    var _imgState = {};
    var _imgListeners = {}; // url -> [cb], вызываются один раз по готовности (или ошибке)

    // ===== Карта яркости 8x8 (движок читаемости) =====
    // Средняя яркость картинки (st.luma) не отвечает на главный вопрос: «мешает ли фон читать
    // код ИМЕННО ЗДЕСЬ». Тёмный кадр с одним ярким окном в углу по среднему выглядит спокойным,
    // а код поверх этого окна не читается. Поэтому считаем яркость по сетке 8x8 (WCAG-яркость,
    // а не Rec.601: она нужна для расчёта контраста). Дальше по ней работает адаптивный скрим
    // (src/fx/readability.js). Данные снимаются с той же ImageData, второй загрузки нет.
    function lumaGrid(d, N) {
        var G = 8, cell = N / G, out = [], gx, gy, x, y, i, sum, cnt, v, o;
        for (gy = 0; gy < G; gy++) {
            for (gx = 0; gx < G; gx++) {
                sum = 0; cnt = 0;
                for (y = gy * cell; y < (gy + 1) * cell; y++) {
                    for (x = gx * cell; x < (gx + 1) * cell; x++) {
                        i = (y * N + x) * 4;
                        o = 0;
                        v = d[i] / 255;     o += 0.2126 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                        v = d[i + 1] / 255; o += 0.7152 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                        v = d[i + 2] / 255; o += 0.0722 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                        sum += o; cnt++;
                    }
                }
                out.push(cnt ? Math.round((sum / cnt) * 1000) / 1000 : 0);
            }
        }
        return out;
    }

    // ===== Кэш метрик картинок в localStorage (мгновенный первый кадр) =====
    // Декодировать 200-килобайтный JPEG, посчитать палитру и нарисовать превью — это десятки
    // миллисекунд ПОСЛЕ того, как файл дойдёт с диска. На старте это видно: секунда пустого
    // редактора, затем вспышка фона и смена акцента. Кэшируем результат (яркость, акцент,
    // палитра, карта 8x8 и мини-превью 96x64) по URL: следующий запуск сразу рисует превью
    // нужным цветом, а полная картинка тихо подменяет его, когда догрузится.
    var IMGC_KEY = "moonlight-bg-imgcache-v1";
    var IMGC_MAX = 96;                 // записей: 37 наборов (у фото-наборов по 3 зоны) + библиотека
    var IMGC_LIMIT = 1200 * 1024;      // потолок сериализованного кэша, чтобы не пухнуть в localStorage
    var _imgCache = null, _imgCacheDirty = false, _imgCacheTimer = 0;
    function imgCacheAll() {
        if (_imgCache) return _imgCache;
        _imgCache = {};
        try {
            var raw = localStorage.getItem(IMGC_KEY);
            if (raw && raw.length <= IMGC_LIMIT) {
                var o = JSON.parse(raw);
                if (o && typeof o === "object") _imgCache = o;
            }
        } catch (e) { _imgCache = {}; }
        return _imgCache;
    }
    function imgCacheGet(url) {
        try {
            var e = imgCacheAll()[url];
            if (!e || typeof e !== "object") return null;
            // Санитизация: кэш лежит в localStorage, его мог подменить кто угодно, а thumb уходит
            // в CSS url(). Пропускаем только ожидаемые типы и только data:image-превью.
            return {
                luma: typeof e.luma === "number" ? e.luma : null,
                accent: isColor(e.accent) ? e.accent : null,
                palette: Object.prototype.toString.call(e.palette) === "[object Array]" ? e.palette.filter(isColor).slice(0, 3) : null,
                grid: (Object.prototype.toString.call(e.grid) === "[object Array]" && e.grid.length === 64) ? e.grid : null,
                thumb: (typeof e.thumb === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.thumb)) ? e.thumb : null
            };
        } catch (e) { return null; }
    }
    function imgCacheSet(url, st) {
        try {
            var all = imgCacheAll();
            all[url] = { luma: st.luma, accent: st.accent, palette: st.palette, grid: st.grid, thumb: st.thumb, t: Date.now() };
            _imgCacheDirty = true;
            if (_imgCacheTimer) return;
            // Пишем пачкой: на старте метрики приходят по 3-6 картинок подряд, и каждая
            // отдельная запись в localStorage — синхронный I/O в кадре отрисовки.
            _imgCacheTimer = setTimeout(imgCacheFlush, 1500);
        } catch (e) {}
    }
    function imgCacheFlush() {
        _imgCacheTimer = 0;
        if (!_imgCacheDirty) return;
        _imgCacheDirty = false;
        try {
            var all = imgCacheAll(), keys = Object.keys(all), i;
            if (keys.length > IMGC_MAX) { // вытесняем самые старые записи
                keys.sort(function (a, b) { return (all[a].t || 0) - (all[b].t || 0); });
                for (i = 0; i < keys.length - IMGC_MAX; i++) delete all[keys[i]];
            }
            var s = JSON.stringify(all);
            if (s.length > IMGC_LIMIT) { // не влезли — начинаем кэш заново, чем ронять квоту
                _imgCache = {}; try { localStorage.removeItem(IMGC_KEY); } catch (e2) {}
                return;
            }
            localStorage.setItem(IMGC_KEY, s);
        } catch (e) { try { localStorage.removeItem(IMGC_KEY); } catch (e2) {} }
    }
    function _fireImg(url, st) {
        var ls = _imgListeners[url]; if (!ls) return;
        _imgListeners[url] = null;
        for (var i = 0; i < ls.length; i++) { try { ls[i](st); } catch (e) {} }
    }
    // Картинка намного больше экрана (4K-обои на FullHD) держит в памяти весь декодированный
    // кадр и дольше перерисовывается при эффектах. Делаем копию под экран (с запасом 1.25x на
    // Ken Burns) как blob: URL и проверяем, что оболочка её грузит (CSP) — только тогда
    // st.small подменяет оригинал в CSS. Не вышло — остаётся оригинал, ничего не ломается.
    function downscaleBig(im, st) {
        try {
            var dpr = window.devicePixelRatio || 1;
            var lim = Math.max(1920, Math.round(Math.max(screen.width || 0, window.innerWidth || 0) * dpr * 1.25));
            var w = im.naturalWidth || 0, h = im.naturalHeight || 0;
            if (!w || !h || w <= lim * 1.3 || typeof URL === "undefined" || !URL.createObjectURL) return;
            var k = lim / w, c = document.createElement("canvas");
            c.width = Math.round(w * k); c.height = Math.round(h * k);
            c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
            if (!c.toBlob) return;
            c.toBlob(function (b) {
                if (!b) return;
                var u = URL.createObjectURL(b), test = new Image();
                test.onload = function () { st.small = u; bumpStyle(); ensureStyle(); };
                test.onerror = function () { try { URL.revokeObjectURL(u); } catch (e) {} };
                test.src = u;
            }, "image/jpeg", 0.9);
        } catch (e) {}
    }
    function probeImage(url) {
        if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
        // «Картинки нет» — это не «картинка сломана»: у шейдерных и генеративных наборов зоны
        // рисуются без файла. Отвечаем сразу, ничего не загружая, и помечаем none, чтобы UI
        // (чипы наборов, диагностика) отличал отсутствие картинки от битого пути.
        if (!url) {
            _imgState[url] = { ok: false, none: true, luma: null, accent: null, palette: null, thumb: null, grid: null, resolved: true };
            return _imgState[url];
        }
        var st = { ok: true, luma: null, accent: null, palette: null, thumb: null, grid: null, resolved: false }; // до загрузки: «ок, метрики неизвестны»
        // Кэш метрик прошлых сессий (localStorage): пока полноразмерный JPEG декодируется,
        // зона уже показывает мини-превью (thumb) и красится верным акцентом — без «пустого
        // кадра» и без прыжка цвета на старте. resolved остаётся false: реальная загрузка всё
        // равно идёт и перезапишет метрики (картинку могли подменить на диске).
        var cached = imgCacheGet(url);
        if (cached) {
            st.luma = cached.luma; st.accent = cached.accent;
            st.palette = cached.palette; st.thumb = cached.thumb; st.grid = cached.grid;
        }
        _imgState[url] = st;
        try {
            var im = new Image();
            im.onload = function () {
                st.ok = true;
                try {
                    // 32x32: хватает и для палитры (1024 пикселя), и для карты яркости 8x8
                    // (каждая ячейка — блок 4x4). Раньше было 16x16 только под средний цвет.
                    var N = 32, c = document.createElement("canvas"); c.width = N; c.height = N;
                    var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, N, N);
                    var d = cx.getImageData(0, 0, N, N).data, sum = 0, n = 0;
                    for (var i = 0; i < d.length; i += 4) {
                        sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; // Rec.601, 0..1
                    }
                    st.luma = n ? sum / n : 1;
                    st.accent = dominantAccent(d); // доминирующий цвет -> готовый акцент
                    st.palette = dominantPalette(d); // гармоничная палитра (для «Палитры из картинки»)
                    st.grid = lumaGrid(d, N);      // карта яркости 8x8 (адаптивный скрим)
                } catch (e) { st.luma = 1; st.accent = null; st.palette = null; st.grid = null; } // canvas «испорчен»/ошибка — не димим
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
                imgCacheSet(url, st); // метрики и мини-превью — в кэш, чтобы следующий старт был мгновенным
                downscaleBig(im, st);
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

    // ===================== src/fx/sets-bg.js =====================
    // ===== Из чего рисуется фон набора =====
    // У набора четыре возможных источника: фотография (в т.ч. вырез мастер-кадра), CSS-градиент,
    // процедурная текстура на canvas и шейдер на GPU (см. src/fx/shader.js). Здесь — предикаты
    // «какой источник у этой зоны» и построение самого фона для градиентных и процедурных
    // наборов. Пользовательская картинка зоны (cfg.setImg) перекрывает любой из них.

    // Опорная тёмная подложка набора для проверки контраста акцента: у grad — первый цвет,
    // у proc — base, у фото-набора — типовая тёмная поверхность редактора (#1e1e2e).
    function accentContrastRef() {
        var s = SETS[activeIndex()];
        if (s && s.grad && s.grad.length && isColor(s.grad[0])) return s.grad[0];
        if (s && s.proc && isColor(s.base)) return s.base;
        return "#1e1e2e";
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
    // ===== Наборы одной мастер-картинкой =====
    // Набор вида { master: "assets/sets/x.jpg", crop: { editor:[x,y,w,h], sidebar:[…], panel:[…] } }
    // показывает во всех трёх зонах ОДИН файл, вырезая из него разные области (проценты кадра).
    // Втрое меньше ассетов и единая палитра зон. Свой файл зоны (cfg.setImg) вырез отменяет —
    // пользовательская картинка показывается целиком, как и раньше.
    function cropFor(idx, zone) {
        var s = SETS[idx];
        if (!s || !s.master || !s.crop || hasUserImg(idx, zone)) return null;
        var c = s.crop[zone];
        return (Object.prototype.toString.call(c) === "[object Array]" && c.length === 4) ? c : null;
    }

    // ===== Генерация набора по seed/палитре =====
    // Из seed-строки ИЛИ базового цвета (#rrggbb) строим согласованный градиентный набор:
    // тёмная подложка + акцент того же оттенка + гармоничный спутник (поворот на 150°). Всё —
    // детерминировано от seed (одинаковый seed -> одинаковый набор), без ассетов, рендерится
    // сразу как обычный grad-набор. Используется addGenSet (config.js) из UI-генератора.
    // FNV-1a хэш строки -> целое (детерминированный «случайный» оттенок из текста).
    function _seedHash(str) {
        var h = 2166136261, i;
        for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
        return h >>> 0;
    }
    function genSetFromSeed(seed) {
        seed = (typeof seed === "string" ? seed : "").trim();
        var hue, name; // hue в долях [0,1) — как ждут rgbToHsl/hslToHex
        if (isColor(seed)) {
            var c = hexToRgbArr(seed);
            hue = rgbToHsl(c[0], c[1], c[2])[0];
            name = "Из цвета " + seed;
        } else {
            var src = seed || ("r" + Math.floor(Math.random() * 1e9)); // пусто -> случайный набор
            hue = (_seedHash(src) % 3600) / 3600;
            name = seed ? ("Seed: " + seed.slice(0, 20)) : "Случайный";
        }
        var accent = hslToHex(hue, 0.72, 0.66);
        var base = hslToHex(hue, 0.30, 0.10);
        var sat = hslToHex((hue + 150 / 360) % 1, 0.55, 0.60);
        return { name: name.slice(0, 40), grad: [base, accent, sat], accent: accent };
    }
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

    // ===== Процедурные наборы (proc) =====
    // Как grad, но не плоский градиент: текстура («звёздное поле» / «волны-дюны» / «шум-грейн»)
    // рисуется на canvas в data-URL — ни единого ассета. Рисуем один раз на набор (кэш _procCache),
    // результат — фон для ВСЕХ зон набора (цельный вид). Если canvas/toDataURL недоступны
    // (нестандартная среда, node-смоук), procTexture вернёт null и зона откатится на градиент
    // из палитры набора (procFallback), поэтому набор всегда что-то показывает.
    function isProcSet(idx) { var s = SETS[idx]; return !!(s && s.proc); }
    function isProc(idx, zone) { return isProcSet(idx) && !hasUserImg(idx, zone); }
    // Осветлить/затемнить hex на долю t (t>0 к белому, t<0 к чёрному).
    function shadeHex(hex, t) {
        var c = hexToRgbArr(hex), to = t >= 0 ? 255 : 0, k = Math.abs(t);
        function f(v) { var x = Math.round(v + (to - v) * k); return (x < 16 ? "0" : "") + x.toString(16); }
        return "#" + f(c[0]) + f(c[1]) + f(c[2]);
    }
    var _procCache = {};
    function _procStars(cx, W, H, acc) {
        var i, n = 150;
        for (i = 0; i < n; i++) {
            var x = Math.random() * W, y = Math.random() * H, r = Math.random() * 1.4 + 0.2;
            var useAcc = Math.random() < 0.35, a = 0.25 + Math.random() * 0.6;
            cx.fillStyle = useAcc ? "rgba(" + acc + "," + a + ")" : "rgba(235,235,255," + a + ")";
            cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
        }
    }
    function _procWaves(cx, W, H, acc) {
        var layer, x;
        for (layer = 0; layer < 6; layer++) {
            var yBase = H * (0.25 + layer * 0.12), amp = 10 + layer * 5, a = 0.05 + layer * 0.03;
            cx.strokeStyle = "rgba(" + acc + "," + a + ")"; cx.lineWidth = 1.5;
            cx.beginPath();
            for (x = 0; x <= W; x += 8) {
                var y = yBase + Math.sin((x / W) * 6.283 * (1 + layer * 0.3) + layer) * amp;
                if (x === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
            }
            cx.stroke();
        }
    }
    function _procNoise(cx, W, H, acc) {
        var i, n = 1400;
        for (i = 0; i < n; i++) {
            var x = Math.random() * W, y = Math.random() * H, a = Math.random() * 0.06;
            cx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255," + a + ")" : "rgba(0,0,0," + (a * 1.4) + ")";
            cx.fillRect(x, y, 1.5, 1.5);
        }
        // редкие акцентные искры поверх грейна
        for (i = 0; i < 40; i++) {
            cx.fillStyle = "rgba(" + acc + "," + (0.1 + Math.random() * 0.25) + ")";
            cx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
        }
    }
    // Техно-сетка: ровные линии акцентом с редкими яркими узлами на пересечениях.
    function _procGrid(cx, W, H, acc) {
        var step = 34, x, y;
        cx.strokeStyle = "rgba(" + acc + ",0.10)"; cx.lineWidth = 1;
        for (x = 0; x <= W; x += step) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
        for (y = 0; y <= H; y += step) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
        for (x = 0; x <= W; x += step) for (y = 0; y <= H; y += step) {
            if (Math.random() < 0.12) {
                cx.fillStyle = "rgba(" + acc + "," + (0.25 + Math.random() * 0.4) + ")";
                cx.beginPath(); cx.arc(x, y, 1.6, 0, 6.283); cx.fill();
            }
        }
    }
    // Топография: набор горизонтальных «контуров высоты» (сумма синусов), как на карте местности.
    function _procTopo(cx, W, H, acc) {
        var line, x;
        cx.lineWidth = 1.2;
        for (line = 0; line < 14; line++) {
            var yBase = H * (line / 13) * 1.06 - H * 0.03;
            cx.strokeStyle = "rgba(" + acc + "," + (0.06 + (line % 3) * 0.02) + ")";
            cx.beginPath();
            for (x = 0; x <= W; x += 6) {
                var y = yBase + Math.sin((x / W) * 6.283 * 1.3 + line * 0.6) * (14 + line)
                              + Math.sin((x / W) * 6.283 * 2.7 + line) * 6;
                if (x === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
            }
            cx.stroke();
        }
    }
    // «Дождь матрицы»: вертикальные колонки-струи из квадратиков, голова — светлая, хвост гаснет.
    function _procMatrix(cx, W, H, acc) {
        var colW = 12, col, i;
        for (col = 0; col * colW < W; col++) {
            var x = col * colW + 2, headY = Math.random() * H, len = 6 + Math.floor(Math.random() * 16);
            for (i = 0; i < len; i++) {
                var y = headY - i * 12; if (y < 0) y += H;
                cx.fillStyle = i === 0 ? "rgba(235,255,235,0.85)" : "rgba(" + acc + "," + ((1 - i / len) * 0.5) + ")";
                cx.fillRect(x, y, 6, 8);
            }
        }
    }
    // Клетки: сетка точек со случайным сдвигом, между соседями — грани (вороной-подобная сеть),
    // часть клеток мягко залита акцентом, часть вершин — яркими точками.
    function _procCells(cx, W, H, acc) {
        var cols = 8, rows = 6, gx = W / cols, gy = H / rows, r, c;
        /** @type {number[][][]} сетка узлов: pts[строка][колонка] = [x, y] */
        var pts = [];
        for (r = 0; r <= rows; r++) {
            pts[r] = [];
            for (c = 0; c <= cols; c++) {
                var jx = (c === 0 || c === cols) ? 0 : (Math.random() - 0.5) * gx * 0.6;
                var jy = (r === 0 || r === rows) ? 0 : (Math.random() - 0.5) * gy * 0.6;
                pts[r][c] = [c * gx + jx, r * gy + jy];
            }
        }
        cx.strokeStyle = "rgba(" + acc + ",0.14)"; cx.lineWidth = 1;
        for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
            var p0 = pts[r][c], p1 = pts[r][c + 1], p2 = pts[r + 1][c + 1], p3 = pts[r + 1][c];
            cx.beginPath(); cx.moveTo(p0[0], p0[1]); cx.lineTo(p1[0], p1[1]); cx.lineTo(p2[0], p2[1]); cx.lineTo(p3[0], p3[1]); cx.closePath();
            if (Math.random() < 0.18) { cx.fillStyle = "rgba(" + acc + "," + (0.05 + Math.random() * 0.08) + ")"; cx.fill(); }
            cx.stroke();
        }
        for (r = 0; r <= rows; r++) for (c = 0; c <= cols; c++) {
            if (Math.random() < 0.10) { cx.fillStyle = "rgba(" + acc + ",0.5)"; cx.beginPath(); cx.arc(pts[r][c][0], pts[r][c][1], 1.4, 0, 6.283); cx.fill(); }
        }
    }
    // Диспетчер генераторов: ключ proc -> функция отрисовки (неизвестный ключ санитайзер не
    // пропустит, но на всякий случай откатываемся на грейн).
    var PROC_DRAW = { stars: _procStars, waves: _procWaves, noise: _procNoise, grid: _procGrid, topo: _procTopo, matrix: _procMatrix, cells: _procCells };
    function procTexture(idx) {
        var s = SETS[idx]; if (!s || !s.proc) return null;
        var base = isColor(s.base) ? s.base : "#181825", accHex = safeColor(s.accent, DEFAULTS.accent);
        var key = s.proc + "|" + base + "|" + accHex;
        if (Object.prototype.hasOwnProperty.call(_procCache, key)) return _procCache[key];
        var url = null;
        try {
            var W = 480, H = 300, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
            var cx = cv.getContext && cv.getContext("2d");
            if (!cx || !cv.toDataURL) { _procCache[key] = null; return null; }
            var g = cx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, base); g.addColorStop(1, shadeHex(base, 0.14));
            cx.fillStyle = g; cx.fillRect(0, 0, W, H);
            var acc = hexToRgbArr(accHex).join(",");
            (PROC_DRAW[s.proc] || _procNoise)(cx, W, H, acc);
            url = cv.toDataURL("image/jpeg", 0.82);
        } catch (e) { url = null; }
        _procCache[key] = url;
        return url;
    }
    // Запасной градиент проц-набора (когда текстуру не удалось нарисовать): из base и акцента.
    function procFallback(idx, zone) {
        var s = SETS[idx], base = (s && isColor(s.base)) ? s.base : "#181825";
        var acc = safeColor(s && s.accent, DEFAULTS.accent), pal = [base, shadeHex(acc, -0.2)];
        if (zone === "sidebar") return "linear-gradient(160deg, " + pal.slice().reverse().join(", ") + ")";
        if (zone === "panel")   return "radial-gradient(120% 120% at 100% 100%, " + pal.join(", ") + ")";
        return "linear-gradient(135deg, " + pal.join(", ") + ")";
    }
    // ===== Шейдерные наборы =====
    // Кадр рисует WebGL-холст (см. src/fx/shader.js) и только в зоне редактора. CSS-фон здесь —
    // это, во-первых, подложка для сайдбара/панели (холста там нет), во-вторых, честный запасной
    // вариант, если WebGL недоступен или контекст потерян: набор всё равно выглядит как набор.
    function shaderBg(idx, zone) { return procFallback(idx, zone); }

    // Готовый CSS-фон проц-зоны: текстура (data-URL, cover) или запасной градиент.
    function procBg(idx, zone) {
        var url = procTexture(idx);
        return url ? (cssUrl(url) + " center / cover no-repeat") : procFallback(idx, zone);
    }

    // ===================== src/fx/readability.js =====================
    // ===== Читаемость кода поверх фона =====
    // Три уровня одной задачи «код должен читаться»: авто-дим по средней яркости кадра,
    // адаптивный скрим по карте яркости 8x8 (гасим только светлые участки) и метр контраста,
    // который считает реальную подложку под кодом и умеет подобрать прозрачность сам.

    // Коэффициент занижения яркости editor по средней светлоте картинки: тёмные/средние —
    // как есть (1.0), почти белые — до ~0.4, чтобы код не «слепило». Плавно между.
    function lumaDimFactor(luma) {
        if (luma == null || luma <= 0.55) return 1;
        var t = Math.min(1, (luma - 0.55) / 0.35); // 0.55..0.90 -> 0..1
        return 1 - 0.6 * t;                          // -> 1.0 .. 0.4
    }

    // ===== Адаптивный скрим: гасим фон ТОЧЕЧНО, где светло =====
    // Обычный «ползунок прозрачности» — это компромисс на весь кадр: опустишь ради читаемости
    // над ярким окном — и вся остальная картинка исчезнет. Здесь мы знаем карту яркости 8x8
    // (probeImage -> st.grid) и подмешиваем поверх картинки несколько мягких тёмных пятен ровно
    // в те ячейки, что светлее комфортного порога. Слой рисуется ВНУТРИ фонового оверлея зоны,
    // то есть локально уменьшает вклад картинки — там, где он мешает, и только там.
    var READ_TARGET = 0.22;   // комфортная яркость подложки под кодом (WCAG-яркость 0..1)
    var READ_MAX_SPOTS = 4;   // больше пятен = длиннее CSS без заметной пользы
    // Ячейки карты, попадающие в видимую область зоны, с позицией уже в координатах зоны.
    // crop — [x,y,w,h] в процентах кадра (набор с мастер-картинкой) или null (видно весь кадр).
    function _readSpots(grid, crop) {
        var G = 8, out = [], gx, gy, cx, cy, v;
        for (gy = 0; gy < G; gy++) {
            for (gx = 0; gx < G; gx++) {
                v = grid[gy * G + gx];
                if (typeof v !== "number" || v <= READ_TARGET) continue;
                cx = (gx + 0.5) / G * 100; cy = (gy + 0.5) / G * 100;
                if (crop) {
                    if (cx < crop[0] || cx > crop[0] + crop[2] || cy < crop[1] || cy > crop[1] + crop[3]) continue;
                    cx = (cx - crop[0]) / crop[2] * 100; cy = (cy - crop[1]) / crop[3] * 100;
                }
                out.push({ x: cx, y: cy, a: Math.min(0.85, (v - READ_TARGET) * 1.6) });
            }
        }
        out.sort(function (A, B) { return B.a - A.a; });
        return out.slice(0, READ_MAX_SPOTS);
    }
    // Слои-градиенты для background-shorthand (с запятой на конце) или "" — если гасить нечего.
    // Цвет пятна — «в сторону подложки редактора»: на тёмной теме чёрный, на светлой белый.
    function adaptiveLayers(url, crop, light) {
        try {
            if (!cfg.fx || !cfg.fx.autoRead) return "";
            var st = probeImage(url);
            if (!st || !st.grid || st.grid.length !== 64) return "";
            var spots = _readSpots(st.grid, crop);
            if (!spots.length) return "";
            var col = light ? "255,255,255" : "0,0,0", i, s, out = [];
            for (i = 0; i < spots.length; i++) {
                s = spots[i];
                out.push("radial-gradient(ellipse 26% 30% at " + s.x.toFixed(1) + "% " + s.y.toFixed(1) + "%, rgba(" +
                         col + "," + s.a.toFixed(2) + ") 0%, rgba(" + col + ",0) 100%)");
            }
            return out.join(", ") + ", ";
        } catch (e) { return ""; }
    }

    // ===== Метр читаемости =====
    // Отвечает на прямой вопрос «читается ли код поверх этого фона» числом, а не на глаз.
    // Яркость подложки под кодом — смесь темы и картинки в пропорции прозрачности оверлея;
    // берём и среднюю ячейку, и САМУЮ СВЕТЛУЮ (худший случай — именно там код и теряется).
    // Возвращает { fg, mean, worst, ratio, worstRatio, ok } или null, если мерить нечего.
    function themeLuma(varName, fallback) {
        try {
            var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            if (/^#[0-9a-f]{6}$/i.test(v)) return relLuminance(v);
            var m = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
            if (m) return relLuminance(rgbArrToHex([+m[1], +m[2], +m[3]]));
        } catch (e) {}
        return fallback;
    }
    // Самая светлая ячейка кадра ПОСЛЕ адаптивного скрима: он гасит верхние по яркости пятна,
    // поэтому без учёта этого метр показывал бы худший случай, которого на экране уже нет.
    // Ячейки вне вырезов не различаем — оценка получается консервативной, и это нам на руку.
    function worstCellLuma(grid, mean) {
        if (!grid || grid.length !== 64) return mean;
        var vals = grid.slice().sort(function (a, b) { return b - a; }), i, worst = 0, v;
        for (i = 0; i < vals.length; i++) {
            v = vals[i];
            // Гасятся только READ_MAX_SPOTS самых светлых ячеек — ровно те, что попадут в CSS.
            if (cfg.fx && cfg.fx.autoRead && i < READ_MAX_SPOTS && v > READ_TARGET) {
                v *= 1 - Math.min(0.85, (v - READ_TARGET) * 1.6);
            }
            if (v > worst) worst = v;
        }
        return worst;
    }
    function readability() {
        try {
            var idx = activeIndex();
            if (!cfg.enabled) return { off: true };
            var light = isLightTheme();
            var url = zoneUrl(idx, "editor");
            var st = url ? probeImage(url) : null;
            var mean = (st && typeof st.luma === "number") ? st.luma : null;
            // Генеративные/процедурные/шейдерные наборы: пикселей нет, берём светлоту подложки.
            if (mean == null) {
                var s = SETS[idx];
                var base = (s && s.grad && s.grad[0]) || (s && s.base) || null;
                if (isColor(base)) mean = relLuminance(base);
            }
            if (mean == null) return null;
            var worst = worstCellLuma(st && st.grid, mean);
            // Учитываем пользовательский фильтр яркости картинки.
            var br = clampNum(cfg.imgfx && cfg.imgfx.editor ? cfg.imgfx.editor.brightness : 1, 0.3, 1.5, 1);
            mean *= br; worst *= br;
            // Прозрачность берём той же функцией, что и CSS-переменная, — иначе метр показывал бы
            // не то, что реально нарисовано (авто-дим, режим чтения, картинка библиотеки).
            var op = Math.min(1, Math.max(0, getOp().editor * editorOpFactor()));
            var bgTheme = themeLuma("--vscode-editor-background", light ? 0.95 : 0.021);
            var fg = themeLuma("--vscode-editor-foreground", light ? 0.09 : 0.62);
            var mix = function (l) { return (1 - op) * bgTheme + op * l; };
            var r1 = contrastLum(fg, mix(mean)), r2 = contrastLum(fg, mix(worst));
            return {
                fg: fg, mean: mix(mean), worst: mix(worst),
                ratio: r1, worstRatio: r2, ok: r2 >= 4.5, op: op
            };
        } catch (e) { return null; }
    }
    // Подобрать прозрачность фона редактора так, чтобы худший случай дал контраст >= want.
    // Меняем только прозрачность активного набора (setOpValue) — глобальный baseOp не трогаем,
    // чтобы починка одной картинки не испортила остальные. Возвращает новую прозрачность.
    var READ_OP_MIN = 0.02; // ниже этого фон уже не виден — дальше опускать бессмысленно
    function fixReadability(want) {
        want = want || 4.5;
        var r = readability(); if (!r || r.off) return null;
        var cur = getOp().editor, step = 0.01, v = cur, i, best = cur;
        for (i = 0; i < 100 && v > READ_OP_MIN; i++) {
            setOpValue("editor", Math.round(v * 100) / 100);
            var rr = readability();
            if (rr && rr.worstRatio >= want) { best = Math.round(v * 100) / 100; break; }
            v -= step; best = Math.round(v * 100) / 100;
        }
        setOpValue("editor", Math.max(READ_OP_MIN, best));
        return getOp().editor;
    }

    // ===================== src/fx/blocks.js =====================
    // ===== Таблица CSS-блоков эффектов =====
    // Каждый эффект — пара [ключ, функция, возвращающая строки правил]. buildCSS проходит по
    // таблице и добавляет блоки включённых эффектов. Всё, что блокам нужно от сборки стиля
    // (акценты, палитра поверхностей текущей темы, готовые примитивы «стекло» и «размытие»),
    // приходит одним контекстом — так таблица не зависит от порядка объявлений внутри buildCSS
    // и живёт отдельным файлом, а не тремя сотнями строк посреди сборщика.

    /**
     * @param {Object} c контекст сборки стиля (акценты, палитра поверхностей, примитивы)
     * @returns {Array<[string, function(): string[]]>} пары «ключ эффекта -> строки правил»
     */
    function fxBlocks(c) {
        var ac = c.ac, ac2 = c.ac2, ac3 = c.ac3, acRGB = c.acRGB, ac2RGB = c.ac2RGB, ac3RGB = c.ac3RGB;
        var light = c.light, surfRGB = c.surfRGB, scrimRGB = c.scrimRGB, shadowRGB = c.shadowRGB, titleSolid = c.titleSolid;
        var surfaceLines = c.surfaceLines, blurLines = c.blurLines;
        var idx = c.idx, s = c.set, edUrl = c.edUrl, edIsGrad = c.edIsGrad, fx = c.fx, fxp = c.fxp, TR = c.TR;
        var BG_SB = c.BG_SB, IMGF_ED = c.IMGF_ED, IMGF_SB = c.IMGF_SB;

    // ЭФФЕКТЫ (таблица). Каждый простой эффект — строка [ключ fx, fn -> массив CSS-строк].
    // fn замыкает все локальные переменные buildCSS (палитра, surfRGB, fxp, BG_/IMGF_-зоны,
    // surfaceLines/blurLines и т.д.), поэтому таблица определена ЗДЕСЬ, после их вычисления.
    // Порядок строк = порядок вывода (важен для каскада), поэтому и порядок записей сохранён
    // как был. Добавить эффект теперь = одна запись в таблице (+ тумблер в FX_LIST/DEFAULTS.fx),
    // а не ещё один if-блок в теле функции. Эффекты, вплетённые в яркость/оверлеи редактора
    // (kenburns, dimOnType/flow, reading, параллакс), остаются выше — они не самостоятельные
    // добавки, а модификаторы уже собранных правил.
        return [
            ["activityBg", function () { return [
                ".part.activitybar::after {",
                "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
                "  background: " + BG_SB + "; opacity: " + (0.10 * switchMul) + ";", TR, IMGF_SB,
                "}"
            ]; }],
            ["rounded", function () { return [
                ".monaco-menu .monaco-action-bar, .quick-input-widget, .monaco-hover, .suggest-widget,",
                ".editor-widget.find-widget, .notifications-toasts .notification-toast {",
                "  border-radius: 10px !important; overflow: hidden;",
                "}"
            ]; }],
            ["tabAccent", function () { return [".tabs-container > .tab.active { box-shadow: inset 0 -2px 0 0 var(--mlbg-accent); }"]; }],
            ["vignette", function () { return [".part.editor .editor-container { box-shadow: inset 0 0 140px 30px rgba(0,0,0,var(--mlbg-vig)); }"]; }],
            ["scrim", function () { return [".monaco-editor .view-lines { text-shadow: 0 0 3px rgba(" + scrimRGB + ",0.85); }"]; }],
            ["glassTabs", function () { return [".part.editor > .content .editor-group-container > .title {"]
                .concat(surfaceLines("--vscode-editorGroupHeader-tabsBackground", 0.55))
                .concat([blurLines("var(--mlbg-blur)"), "}"]); }],
            // сайдбар и панель берут СВОИ переменные фона темы (раньше делили одну константу)
            ["glassSide", function () { return [".part.sidebar {"]
                .concat(surfaceLines("--vscode-sideBar-background", 0.60))
                .concat([blurLines("var(--mlbg-blur)"), "}", ".part.panel {"])
                .concat(surfaceLines("--vscode-panel-background", 0.60))
                .concat([blurLines("var(--mlbg-blur)"), "}"]); }],
            ["scrollbar", function () { return [
                ".monaco-scrollable-element > .scrollbar > .slider { background: rgba(var(--mlbg-accent-rgb),0.30) !important; border-radius: 8px; }",
                ".monaco-scrollable-element > .scrollbar > .slider:hover { background: rgba(var(--mlbg-accent-rgb),0.55) !important; }"
            ]; }],
            ["groupRing", function () { return [".editor-group-container.active { box-shadow: inset 0 0 0 1px rgba(var(--mlbg-accent-rgb),0.28), inset 0 0 24px rgba(var(--mlbg-accent-rgb),0.08); }"]; }],
            ["activeLine", function () { return [
                ".monaco-editor .view-overlays .current-line {",
                "  background: rgba(var(--mlbg-accent-rgb),0.06) !important; box-shadow: inset 2px 0 0 0 rgba(var(--mlbg-accent-rgb),0.55);",
                "}"
            ]; }],
            ["glassStatus", function () { return [".part.statusbar {"]
                .concat(surfaceLines("--vscode-statusBar-background", 0.55))
                .concat([blurLines("min(var(--mlbg-blur),8px)"), "}"]); }],
            ["cursorGlow", function () { return [
                ".monaco-editor .cursors-layer > .cursor { box-shadow: 0 0 8px 2px rgba(var(--mlbg-accent-rgb),0.85); border-radius: 1px; }"
            ]; }],
            // оба стопа — акцент набора (разная прозрачность даёт глубину градиента)
            ["selection", function () { return [
                ".monaco-editor .view-overlays .selected-text {",
                "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.32), rgba(var(--mlbg-accent-rgb),0.16)) !important; border-radius: 2px;",
                "}"
            ]; }],
            // по умолчанию — радужный перелив; groupBorderMono — одним акцентом; paletteSync — палитрой картинки
            ["groupBorder", function () { return [
                ".editor-group-container.active::before {",
                "  content:''; position:absolute; inset:0; z-index:6; pointer-events:none; padding:2px; border-radius:4px;",
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
            ]; }],
            // подложка титлбара — цвет темы + акцентный градиент, гаснущий к прозрачному
            ["titlebar", function () { return [
                ".part.titlebar, .titlebar {",
                "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.30), rgba(var(--mlbg-accent-rgb),0.14) 45%, rgba(" + surfRGB + ",0) 78%), var(--vscode-titleBar-activeBackground, " + titleSolid + ") !important;",
                "}"
            ]; }],
            // заставка = картинка редактора, всегда «contain»; градиент -> сам градиент; 404 -> акцентная подложка
            ["splash", function () { return [
                ".editor-group-container.empty { position: relative; }",
                ".editor-group-container.empty::after {",
                "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
                "  background: " + (edIsGrad ? (typeof isShader === "function" && isShader(idx, "editor") ? shaderBg(idx, "editor") : isProc(idx, "editor") ? procBg(idx, "editor") : gradFor(idx, "editor")) : (probeImage(edUrl).ok ? cssUrl(edUrl) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)")) + "; opacity: calc(0.12 * var(--mlbg-switch));", TR, IMGF_ED,
                "}"
            ]; }],
            // v16: тусклее неактивные группы — гасим только текст (view-lines), не оверлеи/эффекты
            ["dimInactive", function () { return [
                ".editor-group-container:not(.active):not(.empty) .monaco-editor .view-lines {",
                "  opacity: 0.55; transition: opacity 0.25s ease;",
                "}"
            ]; }],
            // Фокус-сессия: правила ДЕЙСТВУЮТ только пока на body висит класс mlbg-focus (его
            // навешивает ensurePomodoro/tickPomo, пока идёт «Помидор» — см. syncFocusClass в
            // widgets/extras.js). Гасим отвлекающее сильнее, чем dimInactive: неактивные группы/
            // вкладки, миникарта, хлебные крошки; сайдбар/актив-бар/панель приглушаются, но
            // проявляются при наведении (остаются рабочими). Активная группа — мягкий акцентный
            // контур. Всё с transition — вход/выход из сессии плавный.
            ["focusSession", function () { return [
                "body.mlbg-focus .editor-group-container:not(.active):not(.empty) .monaco-editor .view-lines { opacity: 0.3; transition: opacity 0.3s ease; }",
                "body.mlbg-focus .part.sidebar, body.mlbg-focus .part.activitybar, body.mlbg-focus .part.panel { opacity: 0.55; transition: opacity 0.3s ease; }",
                "body.mlbg-focus .part.sidebar:hover, body.mlbg-focus .part.activitybar:hover, body.mlbg-focus .part.panel:hover { opacity: 1; }",
                "body.mlbg-focus .monaco-editor .minimap { opacity: 0.22; transition: opacity 0.3s ease; }",
                "body.mlbg-focus .monaco-breadcrumbs { opacity: 0.4; }",
                "body.mlbg-focus .tabs-container > .tab:not(.active) { opacity: 0.55; transition: opacity 0.3s ease; }",
                "body.mlbg-focus .editor-group-container.active { box-shadow: inset 0 0 0 1px rgba(var(--mlbg-accent-rgb),0.35), inset 0 0 44px rgba(var(--mlbg-accent-rgb),0.07); transition: box-shadow 0.3s ease; }"
            ]; }],
            // v16: стекло палитры команд/автодополнения/подсказок + тонкая акцентная рамка
            ["glassCommand", function () { return [".quick-input-widget, .suggest-widget, .monaco-hover, .parameter-hints-widget, .monaco-editor .suggest-widget {"]
                .concat(surfaceLines("--vscode-editorWidget-background", 0.72))
                .concat([blurLines("min(var(--mlbg-blur),12px)"), "  border: 1px solid rgba(var(--mlbg-accent-rgb),0.25) !important;", "}"]); }],
            // v16: акцент виджета поиска/замены и подсветки совпадений — под палитру набора
            ["findAccent", function () { return [
                ".editor-widget.find-widget { border: 1px solid rgba(var(--mlbg-accent-rgb),0.4) !important; box-shadow: 0 4px 18px rgba(0,0,0,0.4); }",
                ".editor-widget.find-widget.replaceToggled { border-color: rgba(var(--mlbg-accent-rgb),0.5) !important; }",
                ".monaco-editor .findMatch { background: rgba(var(--mlbg-accent-rgb),0.22) !important; }",
                ".monaco-editor .currentFindMatch { background: rgba(var(--mlbg-accent-rgb),0.42) !important; outline: 1px solid var(--mlbg-accent); border-radius: 2px; }"
            ]; }],
            // v16: миникарта полупрозрачная — фон просвечивает сквозь неё
            ["minimapFade", function () { return [
                ".monaco-editor .minimap { opacity: 0.55; transition: opacity 0.2s ease; }",
                ".monaco-editor .minimap:hover { opacity: 0.9; }"
            ]; }],
            // v16: акцент активной направляющей отступа и парной скобки
            ["indentAccent", function () { return [
                ".monaco-editor .core-guide-indent-active { box-shadow: inset 1px 0 0 0 rgba(var(--mlbg-accent-rgb),0.7) !important; }",
                ".monaco-editor .bracket-match { border-color: rgba(var(--mlbg-accent-rgb),0.8) !important; background: rgba(var(--mlbg-accent-rgb),0.1) !important; }"
            ]; }],
            // v16: подсветка всех вхождений выделенного слова акцентом
            ["selectionMatch", function () { return [
                ".monaco-editor .selectionHighlight { background: rgba(var(--mlbg-accent-rgb),0.18) !important; outline: 1px solid rgba(var(--mlbg-accent-rgb),0.4); border-radius: 2px; }"
            ]; }],
            // v16: стекло закреплённой прокрутки (sticky scroll — приклеенные заголовки)
            ["stickyGlass", function () { return [".monaco-editor .sticky-widget, .monaco-editor .sticky-widget .sticky-line-content {"]
                .concat(surfaceLines("--vscode-editorStickyScroll-background", 0.6))
                .concat([blurLines("min(var(--mlbg-blur),10px)"), "}"]); }],
            // v18: Aurora — «полярное сияние» за кодом. Слой ::before на прокручиваемом элементе
            // редактора (рядом с фоновой картинкой ::after): три размытых радиальных пятна в палитре
            // набора медленно дрейфуют (translate+scale — только композитинг). Под кодом (z-index:0),
            // читаемости не мешает; на паузе движения гасится reduced-motion (ниже).
            ["aurora", function () { return [
                ".monaco-editor .overflow-guard > .monaco-scrollable-element::before {",
                "  content: ''; position: absolute; inset: -25%; z-index: 0; pointer-events: none;",
                "  background:",
                "    radial-gradient(45% 45% at 25% 30%, rgba(" + acRGB + ",0.55), transparent 60%),",
                "    radial-gradient(40% 50% at 78% 38%, rgba(" + ac2RGB + ",0.50), transparent 62%),",
                "    radial-gradient(50% 45% at 55% 82%, rgba(" + ac3RGB + ",0.45), transparent 62%);",
                "  filter: blur(34px); opacity: 0.40; will-change: transform;",
                "  animation: mlbg-aurora var(--mlbg-aurora-speed) ease-in-out infinite alternate;",
                "}",
                "@keyframes mlbg-aurora {",
                "  0%   { transform: translate3d(-4%,-3%,0) scale(1.05); }",
                "  50%  { transform: translate3d(3%,2%,0)   scale(1.18); }",
                "  100% { transform: translate3d(4%,4%,0)   scale(1.08); }",
                "}"
            ]; }],
            // v18: Спотлайт под курсором — радиальное затемнение экрана с «окном» вокруг мыши.
            // Полноэкранный fixed-оверлей (body::after), центр — --mlbg-mx/my (двигает boot.js за
            // курсором). Радиус — fxp.spotRadius. z-index 9000: ВЫШЕ оверлеев зон (сайдбар/панель —
            // z:1000), чтобы затемнение накрывало весь воркбенч, но НИЖЕ панели настроек (z:100000)
            // и верхнего UI (тосты/полоска ветки/попап «?» — z:100001+), чтобы их не гасить. Клики
            // сквозь (pointer-events:none). Раньше был z:40 — затемнялся только редактор.
            ["spotlight", function () {
                return [
                    "body::after {",
                    "  content: ''; position: fixed; inset: 0; z-index: 9000; pointer-events: none;",
                    "  background: radial-gradient(circle calc(var(--mlbg-spot) + 220px) at var(--mlbg-mx,50%) var(--mlbg-my,50%),",
                    "    transparent 0, transparent var(--mlbg-spot), rgba(0,0,0,0.45) 100%);",
                    "  transition: background 0.10s linear;",
                    "}"
                ];
            }],
            // v18: Пульс вкладки при печати — активная вкладка «дышит» акцентом, пока идёт набор
            // (класс body.mlbg-typing навешивает boot.js); на паузе класс снимается, анимация стоит.
            ["typingPulse", function () { return [
                "body.mlbg-typing .tabs-container > .tab.active {",
                "  animation: mlbg-typpulse 1.1s ease-in-out infinite;",
                "}",
                "@keyframes mlbg-typpulse {",
                "  0%,100% { box-shadow: inset 0 -2px 0 0 var(--mlbg-accent); }",
                "  50%     { box-shadow: inset 0 -2px 0 0 var(--mlbg-accent), 0 0 12px 0 rgba(var(--mlbg-accent-rgb),0.65); }",
                "}"
            ]; }],
            // v19: Тон акцентом — полноэкранная тонировка воркбенча в цвет набора. Fixed-оверлей
            // (body::before — свободен: спотлайт занимает body::after) с mix-blend-mode:overlay,
            // поэтому это светофильтр, а не мутная плёнка. z-index 8000: над оверлеями зон (z:1000),
            // под спотлайтом (9000), панелью (100000) и верхним UI. Клики сквозь.
            ["tint", function () {
                return [
                    "body::before {",
                    "  content:''; position:fixed; inset:0; z-index:8000; pointer-events:none;",
                    "  background: var(--mlbg-accent); opacity: var(--mlbg-tint); mix-blend-mode: overlay;",
                    "}"
                ];
            }],
            // v19: Читаемость кода — мягкая тень под глифами, чтобы текст читался поверх яркой
            // картинки. text-shadow НЕ влияет на ширину символов, поэтому метрики Monaco целы и
            // курсор/выделение не сдвигаются (в отличие от подмены font-family — так делать нельзя).
            // shadowRGB тема-зависимая: тёмный ореол на тёмной теме, светлый — на светлой.
            ["legible", function () { return [
                ".monaco-editor .view-line span { text-shadow: 0 1px 2px rgba(" + shadowRGB + ",0.6); }",
                ".monaco-editor { -webkit-font-smoothing: antialiased; }"
            ]; }],
            // v19: Реакция на ошибки — когда JS видит ошибки в коде (счётчик у иконки ошибок в
            // статусбаре, class body.mlbg-errors ставит heal в boot.js), статусбар мягко пульсирует
            // красным. Правило есть только при включённом эффекте, а класс — только при errorReact,
            // поэтому лишнего чтения DOM/подсветки без эффекта нет.
            ["errorReact", function () { return [
                "body.mlbg-errors .monaco-workbench .part.statusbar {",
                "  animation: mlbg-errpulse 1.6s ease-in-out infinite;",
                "}",
                "@keyframes mlbg-errpulse {",
                "  0%,100% { box-shadow: inset 0 2px 0 0 rgba(243,139,168,0.5); }",
                "  50%     { box-shadow: inset 0 2px 0 0 rgba(243,139,168,0.95), 0 0 16px 0 rgba(243,139,168,0.4); }",
                "}"
            ]; }],
            // v20: Режим Present — «спокойнее фон, крупнее акценты, скрыть шум» для стрима/скринкаста/
            // курса. Прячем визуальный шум (хлебные крошки, миникарта), приглушаем экшены редактора
            // (проявляются по наведению), и КРУПНЕЕ подаём акценты: толще подчёркивание активной
            // вкладки, ярче индикатор активити-бара, контрастнее активная строка. Только CSS —
            // ничего не двигает и не читает DOM.
            ["present", function () { return [
                ".monaco-workbench .monaco-breadcrumbs { display: none !important; }",
                ".monaco-editor .minimap { display: none !important; }",
                ".monaco-workbench .editor-actions { opacity: 0.3; transition: opacity 0.2s ease; }",
                ".monaco-workbench .editor-actions:hover { opacity: 1; }",
                ".tabs-container > .tab.active { box-shadow: inset 0 -3px 0 0 var(--mlbg-accent) !important; }",
                ".monaco-workbench .activitybar .action-item.active .active-item-indicator:before {",
                "  border-left-width: 3px !important; border-left-color: var(--mlbg-accent) !important;",
                "}",
                ".monaco-editor .view-overlays .current-line { border: 1px solid rgba(var(--mlbg-accent-rgb),0.45) !important; }"
            ]; }],
            // v20: Контраст+ (a11y) — читаемость поверх яркой картинки без сдвига метрик Monaco:
            // плотная тень под глифами кода (в обе стороны) и под подписями сайдбара/панели, ярче
            // подсветка выделения, ТОЛЩЕ обводка фокуса (клавиатурная навигация видна лучше).
            // shadowRGB тема-зависимая: тёмный ореол на тёмной теме, светлый — на светлой.
            ["highContrast", function () { return [
                ".monaco-editor .view-line span { text-shadow: 0 0 3px rgba(" + shadowRGB + ",0.95), 0 1px 2px rgba(" + shadowRGB + ",0.9) !important; }",
                ".monaco-workbench .part.sidebar, .monaco-workbench .part.panel { text-shadow: 0 1px 2px rgba(" + shadowRGB + ",0.85); }",
                ".monaco-editor .focused .selected-text { outline: 1px solid var(--mlbg-accent); }",
                "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible,",
                "#moonlight-bg-panel input:focus-visible, #moonlight-bg-panel select:focus-visible,",
                "#moonlight-bg-panel textarea:focus-visible { outline-width: 3px !important; outline-offset: 2px !important; }"
            ]; }],
            // v21: «Живой фон» — медленный пан фоновых зон градиентных/процедурных наборов. Фото-
            // наборы не трогаем (у них есть Ken Burns/параллакс), поэтому эмитим правило только для
            // зон, где сейчас градиент/текстура (isGrad/isProc). Двигаем background-position при
            // увеличенном background-size (транслейт-независимо от transform Ken Burns) — поэтому на
            // редакторе можем совместить обе анимации в одном shorthand. Гасится reduced-motion
            // (см. rmSel ниже) и эконом-режимом (perfsave). Скорость фиксированная — спокойный дрейф.
            ["liveBg", function () {
                var lines = [], SPEED = 46;
                if (isGrad(idx, "editor") || isProc(idx, "editor")) {
                    var edAnim = (fx.kenburns ? "mlbg-kenburns var(--mlbg-kb-speed) ease-in-out infinite alternate, " : "")
                        + "mlbg-livebg " + SPEED + "s ease-in-out infinite alternate";
                    lines.push(
                        ".monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
                        "  background-size: 200% 200% !important; animation: " + edAnim + ";",
                        "}"
                    );
                }
                if (isGrad(idx, "sidebar") || isProc(idx, "sidebar")) lines.push(
                    ".part.sidebar::after { background-size: 200% 200% !important; animation: mlbg-livebg " + SPEED + "s ease-in-out infinite alternate; }"
                );
                if (isGrad(idx, "panel") || isProc(idx, "panel")) lines.push(
                    ".part.panel::after { background-size: 200% 200% !important; animation: mlbg-livebg " + SPEED + "s ease-in-out infinite alternate; }"
                );
                if (lines.length) lines.push("@keyframes mlbg-livebg { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }");
                return lines;
            }],
            // v21: «Анимации UI» (Smooth UI) — мягкие появления палитры команд/автодополнения/
            // подсказок/поиска, плавные переходы вкладок и строк списков, выезд тостов. Только
            // CSS-переходы/keyframes (тот же механизм инъекции, что и весь плагин). keyframes-
            // появления гасятся reduced-motion (см. rmSel); тонкие transition оставляем.
            ["uiAnim", function () { return [
                ".quick-input-widget, .suggest-widget, .monaco-hover, .parameter-hints-widget, .editor-widget.find-widget {",
                "  animation: mlbg-uipop 0.15s cubic-bezier(0.2,0.85,0.25,1);",
                "}",
                "@keyframes mlbg-uipop { from { opacity: 0; transform: translateY(-6px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }",
                ".tabs-container > .tab { transition: background-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease; }",
                ".monaco-list .monaco-list-row { transition: background-color 0.12s ease; }",
                ".monaco-workbench .monaco-action-bar .action-item { transition: transform 0.12s ease; }",
                ".notifications-toasts .notification-toast { animation: mlbg-uislide 0.24s cubic-bezier(0.2,0.85,0.25,1); }",
                "@keyframes mlbg-uislide { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }"
            ]; }],
            // Настоящая прозрачность: окно создано прозрачным (опции Electron у custom-ui-style),
            // поэтому сквозь редактор виден рабочий стол, а система подмешивает свой материал.
            // Включаем это ТОЛЬКО по подтверждению компаньона (trueGlassReady) — иначе отдаём
            // усиленное стекло, чтобы не получить чёрное окно на обычной сборке.
            ["trueGlass", function () {
                var ready = false;
                try { ready = (typeof trueGlassReady === "function") && trueGlassReady(); } catch (e) {}
                var a = ready ? 0.30 : 0.55;
                var L = [];
                if (ready) L.push(
                    "body, .monaco-workbench, .monaco-workbench > .part.editor { background: transparent !important; }",
                    ".monaco-editor, .monaco-editor .monaco-editor-background, .monaco-editor .margin,",
                    ".monaco-workbench .part.editor > .content .editor-group-container { background-color: transparent !important; }"
                );
                L.push(".monaco-workbench .part.sidebar, .monaco-workbench .part.panel, .monaco-workbench .part.auxiliarybar,",
                       ".monaco-workbench .part.activitybar, .monaco-workbench .part.statusbar, .monaco-workbench .part.titlebar {");
                L = L.concat(surfaceLines("--vscode-sideBar-background", a));
                L.push(blurLines("var(--mlbg-blur)"), "}");
                return L;
            }],
            // Акрил: сильное матовое стекло на весь воркбенч поверх точечных glass*-эффектов.
            // Это внутриредакторный «морозный» вид — не прозрачность до рабочего стола.
            ["acrylic", function () {
                var b = "max(var(--mlbg-blur),18px)";
                return [
                    ".monaco-workbench .part.sidebar, .monaco-workbench .part.panel, .monaco-workbench .part.auxiliarybar,",
                    ".monaco-workbench .part.activitybar, .monaco-workbench .part.statusbar, .monaco-workbench .part.titlebar,",
                    ".monaco-workbench .part.editor > .content .editor-group-container > .title {",
                    "  backdrop-filter: blur(" + b + ") saturate(1.5); -webkit-backdrop-filter: blur(" + b + ") saturate(1.5);",
                    "}",
                    ".monaco-workbench .part.sidebar, .monaco-workbench .part.panel, .monaco-workbench .part.auxiliarybar {"
                ].concat(surfaceLines("--vscode-sideBar-background", 0.5)).concat(["}"]);
            }]
        ];
    }

    // ===================== src/fx/css.js =====================
    // ===== Сборка таблицы стилей =====
    // Один <style> на весь плагин. Здесь собираются правила, зависящие от НАБОРА ПРАВИЛ:
    // активный набор, тема редактора, включённые эффекты. Числовые параметры сюда не попадают —
    // они уходят в CSS-переменные (см. src/fx/style.js).

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
        try { announceAccent(ac); } catch (e) {} // соседям (окно «Документация C++») — сразу
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
            var st = probeImage(url);
            if (!st.ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
            var fit = (cfg.fit && cfg.fit[fitZone] === "contain") ? "contain" : "cover";
            // LQIP: полная картинка ещё декодируется, но в кэше есть мини-превью
            // прошлой сессии — показываем его, чтобы первый кадр был не пустым. Как только
            // придёт настоящая картинка, probeImage дёрнет пересборку и превью сменится.
            if (!st.resolved && st.thumb) return cssUrl(st.thumb) + " " + position + " / " + fit + " no-repeat";
            // Огромная картинка (4K+ на экране поменьше) — уменьшенная копия: меньше памяти и
            // быстрее перерисовка. Копию делает проба (st.small), пока её нет — оригинал.
            return cssUrl(st.small || url) + " " + position + " / " + fit + " no-repeat";
        }
        // Вырез из мастер-картинки. crop = [x, y, w, h] в процентах исходника.
        // Формула стандартная для background: масштаб 100/w, позиция x/(100-w) — так в окно
        // зоны попадает ровно указанный прямоугольник кадра.
        function cropBg(url, crop) {
            var st = probeImage(url);
            if (!st.ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
            var x = clampNum(crop[0], 0, 100, 0), y = clampNum(crop[1], 0, 100, 0);
            var w = clampNum(crop[2], 1, 100, 100), h = clampNum(crop[3], 1, 100, 100);
            var px = w >= 100 ? 50 : (x / (100 - w)) * 100;
            var py = h >= 100 ? 50 : (y / (100 - h)) * 100;
            var src = (!st.resolved && st.thumb) ? st.thumb : url;
            return cssUrl(src) + " " + px.toFixed(2) + "% " + py.toFixed(2) + "% / " +
                   (10000 / w).toFixed(2) + "% " + (10000 / h).toFixed(2) + "% no-repeat";
        }
        // Фон зоны: генеративный набор -> градиент (SETS zone-ключ), иначе картинка (zoneBg).
        // zone — ключ SETS ("editor"|"sidebar"|"panel"); fitZone — ключ cfg.fit ("side" у сайдбара).
        function bgFor(zone, fitZone, position) {
            if (typeof isShader === "function" && isShader(idx, zone)) return shaderBg(idx, zone);
            if (isProc(idx, zone)) return procBg(idx, zone);
            if (isGrad(idx, zone)) return gradFor(idx, zone);
            var cr = cropFor(idx, zone), u = zoneUrl(idx, zone);
            position = setPosFor(idx, zone) || position; // точка фокуса, выбранная кликом по превью
            // Адаптивный скрим идёт ПЕРВЫМИ слоями фона — поверх картинки.
            return adaptiveLayers(u, cr, light) + (cr ? cropBg(u, cr) : zoneBg(u, fitZone, position));
        }
        // Библиотека картинок: если «Крутить библиотеку» включено, зона редактора показывает
        // текущую картинку из личной библиотеки (libraryEditorUrl определён в extras.js — доступен из
        // рантайма через область IIFE) вместо картинки/градиента набора. Остальные зоны и акцент —
        // как у активного набора. libEd — уже разрешённый абсолютный URL или null.
        var libEd = null;
        try { if (typeof libraryActive === "function" && libraryActive()) libEd = libraryEditorUrl(); } catch (e) {}
        var edUrl = libEd || zoneUrl(idx, "editor");
        // «Не фото» редактора: градиент ИЛИ процедурная текстура — у обоих нет измеримой светлоты
        // и своего URL-фото, поэтому авто-дим и трио-акцент из картинки для них выключаются.
        // Картинка библиотеки — это фото, поэтому при libEd считаем зону «фото» (edIsGrad=false).
        // «Не фото» в редакторе: градиент, процедурная текстура ИЛИ шейдер — ни у одного нет
        // измеримой светлоты и URL-фото, поэтому авто-дим, параллакс и трио-акцент из картинки
        // для них выключаются, а заставка берёт градиент набора вместо url().
        var edIsGrad = !libEd && (isGrad(idx, "editor") || isProc(idx, "editor") ||
                                  (typeof isShader === "function" && isShader(idx, "editor")));
        var BG_ED = libEd ? (adaptiveLayers(libEd, null, light) + zoneBg(libEd, "editor", "center")) : bgFor("editor", "editor", "center");
        var BG_SB = bgFor("sidebar", "side", "center bottom");
        var BG_PN = bgFor("panel", "panel", "right bottom");
        // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
        // Для градиента яркость не измерить (нет пикселей) — множитель 1.
        if (!edIsGrad && cfg.autoDim) probeImage(edUrl); // запускаем пробу: яркость нужна editorOpFactor()
        // Режим чтения: постоянно и сильно гасим фон редактора (не как flow — тот по печати),
        // чтобы код читался максимально чётко; сайдбар/панель/эффекты не трогаем.
        // Режим чтения и авто-дим учтены в переменной --mlbg-op-editor (editorOpFactor).
        // Трио акцентов для эффектов: основной + два спутника (палитра из картинки редактора
        // при включённой «Палитре из картинки», иначе повороты оттенка). ac2/ac3 — hex.
        var trio = accentTrio(ac, edIsGrad ? null : edUrl), ac2 = trio[1], ac3 = trio[2];
        // rgb-формы спутников ("r,g,b") — для rgba() в градиентах Aurora (там нужен альфа-канал).
        var ac2RGB = hexToRgbArr(ac2).join(","), ac3RGB = hexToRgbArr(ac3).join(",");
        var out = [];
        function add() { for (var i = 0; i < arguments.length; i++) out.push(arguments[i]); }
        var TR = "  transition: opacity 0.5s ease;";
        // Поверхность «матового стекла»: точный цвет темы через var(--vscode-*) с нужной
        // прозрачностью (color-mix), плюс запасная строка rgba() под старые движки без
        // color-mix. Порядок важен: сначала fallback, затем color-mix (если поддержан —
        // побеждает как более поздняя валидная декларация; если нет — остаётся rgba).
        // База rgba — тема-зависимая surfRGB; a — прозрачность 0..1. ВОЗВРАЩАЕТ пару строк
        // (а не пишет в out): блоки эффектов собираются в таблицу FX_BLOCKS и сами складывают
        // свои строки, поэтому примитивам поверхности/размытия удобнее отдавать строки.
        function surfaceLines(cssVar, a) {
            var pct = Math.round(a * 100);
            return [
                "  background-color: rgba(" + surfRGB + "," + a + ") !important;",
                "  background-color: color-mix(in srgb, var(" + cssVar + ") " + pct + "%, transparent) !important;"
            ];
        }
        function blurLines(px) { return "  backdrop-filter: blur(" + px + "); -webkit-backdrop-filter: blur(" + px + ");"; }

        // Акцентный цвет (ac/acRGB уже посчитаны выше) — все эффекты ниже используют
        // var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
        add(rootVar);
        // Спутники акцента как переменные (палитра эффектов). Пока их читает «живой контур»
        // при «Палитре из картинки»; вынесены в :root для переиспользования другими эффектами.
        add(":root { --mlbg-accent2: " + ac2 + "; --mlbg-accent3: " + ac3 + "; }");

        // Фильтры самой фоновой картинки (яркость/насыщенность/размытие) — своя строка на зону.
        // Числа зажаты в mergeCfg, здесь клампим повторно (defense-in-depth). Пустая строка,
        // если зона на дефолте, — тогда filter не добавляется (нулевой оверхед).
        // Значения едут через CSS-переменные (см. buildVars): при перетаскивании ползунка
        // меняется только переменная, текст стиля остаётся прежним и не переразбирается.
        function imgFilter(z) {
            return "  filter: brightness(var(--mlbg-br-" + z + ")) saturate(var(--mlbg-sa-" + z + ")) blur(var(--mlbg-bl-" + z + "));";
        }
        // актив-бар делит картинку с сайдбаром, заставка — с редактором, поэтому фильтры общие.
        var IMGF_ED = imgFilter("editor"), IMGF_SB = imgFilter("side"), IMGF_PN = imgFilter("panel");

        // РЕДАКТОР
        add(
            ".monaco-editor .overflow-guard > .monaco-scrollable-element > .monaco-editor-background { background: none; }",
            ".monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
            "  background: " + BG_ED + ";",
            "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch));", TR, IMGF_ED,
            // Параллакс: смещаем background-position за курсором (переменные ставит boot.js).
            // Longhand после shorthand background перекрывает его позицию. Только картинка
            // (у градиента позиции нет). cover уже с запасом перекрытия — сдвиг в ~8px не оголяет край.
            (fx.parallax && !edIsGrad ? "  background-position: calc(50% + var(--mlbg-par-x,0px)) calc(50% + var(--mlbg-par-y,0px));" : ""),
            (fx.kenburns ? "  animation: mlbg-kenburns var(--mlbg-kb-speed) ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
            "}"
        );
        if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(var(--mlbg-kb-scale)); } }");
        // Приглушение фона при печати: пока на body висит класс mlbg-typing (навешивается
        // в boot.js на набор текста и снимается после паузы), опускаем прозрачность оверлея
        // редактора до ~30% от текущей. У оверлея уже есть transition:opacity — переход плавный.
        if (fx.dimOnType) add(
            "body.mlbg-typing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.3) !important;",
            "}"
        );
        // Приглушение фона при потере фокуса окном: класс body.mlbg-unfocused навешивается в
        // boot.js на window blur и снимается на focus. Опускаем прозрачность оверлея редактора
        // до ~35% (у оверлея уже есть transition:opacity — переход плавный).
        if (fx.dimOnBlur) add(
            "body.mlbg-unfocused .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.35) !important;",
            "}"
        );
        // «Поток»: при долгой непрерывной печати boot.js вешает body.mlbg-flowing — фон
        // редактора гаснет сильнее, чем при обычном dim-on-type (~15% от текущего), и плавно
        // (у оверлея есть transition:opacity). Снимается на паузе для чтения.
        if (fx.flow) add(
            "body.mlbg-flowing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
            "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.15) !important;",
            "}"
        );

        // САЙДБАР / ПАНЕЛЬ
        add(
            ".part.sidebar::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
            "  background: " + BG_SB + "; opacity: calc(var(--mlbg-op-side) * var(--mlbg-switch));", TR, IMGF_SB,
            "}",
            ".part.panel::after {",
            "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
            "  background: " + BG_PN + "; opacity: calc(var(--mlbg-op-panel) * var(--mlbg-switch));", TR, IMGF_PN,
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
        var tcur = safeColor(effTermColor("cursorColor"), DEFAULTS.term.cursorColor); // дефолт -> акцент набора
        var tsel = safeColor(effTermColor("selColor"), DEFAULTS.term.selColor);
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

        // Блоки эффектов живут в src/fx/blocks.js — сюда приходит только их таблица.
        var FX_BLOCKS = fxBlocks({
            ac: ac, ac2: ac2, ac3: ac3, acRGB: acRGB, ac2RGB: ac2RGB, ac3RGB: ac3RGB,
            light: light, surfRGB: surfRGB, scrimRGB: scrimRGB, shadowRGB: shadowRGB, titleSolid: titleSolid,
            surfaceLines: surfaceLines, blurLines: blurLines,
            idx: idx, set: s, edUrl: edUrl, edIsGrad: edIsGrad, fx: fx, fxp: fxp, TR: TR,
            BG_SB: BG_SB, IMGF_ED: IMGF_ED, IMGF_SB: IMGF_SB
        });
        for (var bi = 0; bi < FX_BLOCKS.length; bi++) {
            if (fx[FX_BLOCKS[bi][0]]) add.apply(null, FX_BLOCKS[bi][1]());
        }

        add(switcherCSS());

        // Доступность/батарея: при системной «уменьшить движение» гасим CSS-анимации
        // (Ken Burns, живая рамка, Aurora, пульс печати). Частицы (canvas/JS) выключаются
        // отдельно в ensureParticles. Спотлайт — не авто-анимация (следует за курсором по
        // явному желанию пользователя), поэтому его тут не трогаем. Селекторы Aurora/пульса
        // добавляем в список ТОЛЬКО когда эффект включён — иначе их правила всё равно нет,
        // а лишний селектор зря «маячил» бы в CSS (и путал бы точечные проверки).
        var rmSel = [
            "  .monaco-editor .overflow-guard > .monaco-scrollable-element::after",
            "  .editor-group-container.active::before"
        ];
        if (fx.aurora) rmSel.push("  .monaco-editor .overflow-guard > .monaco-scrollable-element::before");
        if (fx.typingPulse) rmSel.push("  body.mlbg-typing .tabs-container > .tab.active");
        if (fx.errorReact) rmSel.push("  body.mlbg-errors .monaco-workbench .part.statusbar");
        // «Живой фон»: пан сайдбара/панели (редактор ::after уже в списке выше). «Анимации UI»:
        // keyframes-появления палитры/подсказок/тостов (тонкие transition при этом остаются).
        if (fx.liveBg) { rmSel.push("  .part.sidebar::after"); rmSel.push("  .part.panel::after"); }
        if (fx.uiAnim) {
            rmSel.push("  .quick-input-widget", "  .suggest-widget", "  .monaco-hover",
                "  .parameter-hints-widget", "  .editor-widget.find-widget",
                "  .notifications-toasts .notification-toast");
        }
        add(
            "@media (prefers-reduced-motion: reduce) {",
            rmSel.join(",\n") + " { animation: none !important; }",
            "}"
        );
        // Доступность: при системной «уменьшить прозрачность» убираем размытие «матового стекла»
        // с наших поверхностей (backdrop-filter — источник полупрозрачности, тяжёлой для чтения и
        // для восприятия при вестибулярных/зрительных особенностях). Сам фон/цвета остаются; уходит
        // только blur. Всегда в CSS (не зависит от эффектов) — активируется только при системном флаге.
        add(
            "@media (prefers-reduced-transparency: reduce) {",
            "  #moonlight-bg-panel, .quick-input-widget, .suggest-widget, .monaco-hover,",
            "  .monaco-workbench .part.sidebar, .monaco-workbench .part.panel, .monaco-workbench .part.statusbar,",
            "  .monaco-workbench .part.titlebar, .monaco-workbench .part.activitybar, .monaco-workbench .part.auxiliarybar,",
            "  .tabs-container {",
            "    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;",
            "  }",
            "}"
        );
        // Авто-бюджет производительности: класс body.mlbg-perfsave навешивается
        // рантаймом (perf.js в widgets), когда FPS устойчиво низкий. Гасим самые дорогие по кадрам
        // непрерывные эффекты — анимированный градиент Aurora, пульс печати, «поток» и «живой
        // контур» группы — и приглушаем слой частиц (их число рантайм тоже снижает). Правило есть
        // в CSS всегда, но действует лишь при наличии класса (нулевая цена, пока FPS в норме).
        add(
            "body.mlbg-perfsave .monaco-editor .overflow-guard > .monaco-scrollable-element::before,",
            "body.mlbg-perfsave .editor-group-container.active::before,",
            "body.mlbg-perfsave .tabs-container > .tab.active { animation: none !important; }",
            "body.mlbg-perfsave #mlbg-particles { opacity: 0.25 !important; }"
        );
        // «Живой фон» — тоже непрерывная анимация (пан зон), поэтому под эконом-режимом гасим её.
        if (fx.liveBg) add(
            "body.mlbg-perfsave .monaco-editor .overflow-guard > .monaco-scrollable-element::after,",
            "body.mlbg-perfsave .part.sidebar::after, body.mlbg-perfsave .part.panel::after { animation: none !important; }"
        );
        return out.join("\n");
    }

    // ===================== src/fx/style.js =====================
    // ===== Применение стиля: переменные, инъекция, троттлинг =====
    // Стиль разделён надвое: текст правил (buildCSS) меняется только при смене набора, темы или
    // набора эффектов, а числа живут в CSS-переменных и обновляются точечно. Поэтому движение
    // ползунка не заставляет браузер заново разбирать лист.

    // В переменные уходят только ЧИСЛА. Всё, что меняет НАБОР правил (тумблеры эффектов, смена
    // набора, тема), по-прежнему пересобирает лист — иначе новые правила просто не появятся.
    // Пересборка идёт по ревизии: bumpStyle() отмечает изменение, ensureStyle собирает CSS,
    // только когда ревизия сдвинулась или наш <style> пропал (VS Code перестроил DOM).
    // Сменился акцент — событие окну: соседние скрипты (окно «Документация C++») перекрашиваются
    // сразу, не дожидаясь своего таймера. Только при реальной смене цвета.
    var _lastAnnounced = "";
    function announceAccent(ac) {
        if (ac === _lastAnnounced) return;
        _lastAnnounced = ac;
        setTimeout(function () { try { window.dispatchEvent(new CustomEvent("mlbg-accent", { detail: { accent: ac } })); } catch (e) {} }, 0);
    }
    function editorOpFactor() {
        // Множители прозрачности редактора, зависящие не от ползунка: авто-дим под светлую
        // картинку и режим чтения. Повторяет логику buildCSS, чтобы переменная совпадала с ней.
        try {
            var idx = activeIndex();
            var libEd = null;
            try { if (typeof libraryActive === "function" && libraryActive()) libEd = libraryEditorUrl(); } catch (e) {}
            var edIsGen = !libEd && (isGrad(idx, "editor") || isProc(idx, "editor"));
            var edUrl = libEd || zoneUrl(idx, "editor");
            var dim = (!edIsGen && cfg.autoDim) ? lumaDimFactor(probeImage(edUrl).luma) : 1;
            return dim * (cfg.fx && cfg.fx.reading ? 0.12 : 1);
        } catch (e) { return 1; }
    }
    function buildVars() {
        var op = getOp(), f = cfg.imgfx || {}, fxp = cfg.fxp || {}, v = {};
        v["--mlbg-switch"] = String(switchMul);
        v["--mlbg-op-editor"] = String(clampNum(op.editor, 0, 1, 0.06) * editorOpFactor());
        v["--mlbg-op-side"] = String(clampNum(op.side, 0, 1, 0.30));
        v["--mlbg-op-panel"] = String(clampNum(op.panel, 0, 1, 0.11));
        var zones = ["editor", "side", "panel"], i, z, zf;
        for (i = 0; i < zones.length; i++) {
            z = zones[i]; zf = f[z] || {};
            v["--mlbg-br-" + z] = String(clampNum(zf.brightness, 0.3, 1.5, 1));
            v["--mlbg-sa-" + z] = String(clampNum(zf.saturate, 0, 2, 1));
            v["--mlbg-bl-" + z] = clampNum(zf.blur, 0, 12, 0) + "px";
        }
        v["--mlbg-blur"] = clampNum(fxp.blur, 0, 20, 8) + "px";
        v["--mlbg-vig"] = String(clampNum(fxp.vignette, 0, 1, 0.32));
        v["--mlbg-tint"] = String(clampNum(fxp.tintStrength, 0, 0.6, 0.18));
        v["--mlbg-spot"] = clampNum(fxp.spotRadius, 120, 600, 320) + "px";
        v["--mlbg-kb-scale"] = String(clampNum(fxp.kbScale, 1, 1.4, 1.08));
        v["--mlbg-kb-speed"] = clampNum(fxp.kbSpeed, 10, 240, 60) + "s";
        v["--mlbg-aurora-speed"] = clampNum(fxp.auroraSpeed, 6, 120, 24) + "s";
        return v;
    }
    var _varsApplied = {};
    function ensureVars() {
        try {
            var v = buildVars(), st = document.documentElement && document.documentElement.style, k;
            if (!st) return;
            for (k in v) {
                if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
                if (_varsApplied[k] === v[k]) continue; // не трогаем то, что не изменилось
                st.setProperty(k, v[k]);
                _varsApplied[k] = v[k];
            }
        } catch (e) { logErr("CSS-переменные", e); }
    }

    var STYLE_ID = "moonlight-custom-bg";
    var _styleRev = 0, _appliedRev = -1, _buildErrLogged = false;
    function bumpStyle() { _styleRev++; }
    // Безопасный минимум CSS, если основная сборка упала (обычно из-за сломанной ручной правки
    // исходника): только акцент-переменная и стили кнопки BG/фокуса. Кнопка остаётся видимой, а
    // панель — открываемой, где есть «Сбросить к дефолту» и диагностика, чтобы восстановиться,
    // а не остаться с наглухо сломанным редактором. Сам fallback тоже под try — если и он не
    // собрался, отдаём голую переменную акцента.
    function safeFallbackCSS() {
        try {
            var ac = safeColor((typeof getAccent === "function" ? getAccent() : null), DEFAULTS.accent);
            return ":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + accentRGB() + "; }\n" + switcherCSS();
        } catch (e) { return ":root { --mlbg-accent: " + DEFAULTS.accent + "; }"; }
    }
    function ensureStyle() {
        var el = null;
        ensureVars(); // числовые параметры — отдельно от текста стиля
        try {
            el = document.getElementById(STYLE_ID);
            if (el && el.textContent && _appliedRev === _styleRev) return; // ничего не менялось, стиль на месте
            var css;
            try { css = buildCSS(); }
            catch (buildErr) {
                // Сборка CSS упала — не оставляем редактор без кнопки/панели: ставим безопасный
                // минимум и ОДИН раз громко пишем в консоль (чтобы «копавшийся» увидел причину).
                if (!_buildErrLogged) {
                    _buildErrLogged = true;
                    try { console.error("[MoonLight custom-bg] Сборка CSS упала — включён безопасный режим (видна только кнопка BG). Проверьте правки в src/ или откройте панель → Система → «Сбросить к дефолту».", buildErr); } catch (e2) {}
                }
                logErr("сборка CSS (безопасный режим)", buildErr);
                css = safeFallbackCSS();
            }
            if (!el) { el = document.createElement("style"); el.id = STYLE_ID; document.head.appendChild(el); }
            if (el.textContent !== css) el.textContent = css;
            _appliedRev = _styleRev;
        } catch (e) { logErr("вставка стиля", e); }
    }
    function apply() { saveCfg(); bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
    // «Живое» применение БЕЗ записи в localStorage — для непрерывных изменений во время
    // перетаскивания слайдера или выбора цвета. Раньше каждый такой кадр звал apply() ->
    // saveCfg(), то есть до ~60 синхронных записей в localStorage в секунду (джанк + износ).
    // Теперь во время движения только пересобираем CSS/виджеты, а cfg пишем один раз —
    // по событию change (отпускание ползунка / фиксация цвета), см. makeSlider/цветовые контролы.
    function applyNoSave() { bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
    // Живое перетаскивание ползунка: сразу двигаем только CSS-переменные (setProperty — это
    // пересчёт значений, без переразбора листа), а полную пересборку (виджеты, подписи, те
    // правила, что зависят от чисел структурно) делаем один раз после паузы в движении.
    var _liveFullTimer = 0;
    function applyThrottledLive() {
        ensureVars();
        if (_liveFullTimer) clearTimeout(_liveFullTimer);
        _liveFullTimer = setTimeout(function () { _liveFullTimer = 0; applyNoSave(); }, 120);
    }
    // Плавная смена фона: гасим оверлеи зон (switchMul=0), затем в следующем кадре
    // возвращаем (switchMul=1). У оверлеев есть transition:opacity, поэтому новый набор
    // не «прыгает», а мягко проступает. Только CSS — без saveCfg/подписей; используется
    // и сменой набора (applyFade), и предпросмотром при наведении (previewSet/previewEnd).
    // switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
    function fadeSwap() {
        switchMul = 0; bumpStyle(); ensureStyle();
        requestAnimationFrame(function () { switchMul = 1; ensureVars(); });
    }
    function applyFade() {
        saveCfg(); updateLabel(); syncWidgets();
        fadeSwap();
    }

    // ===================== src/fx/shader.js =====================
    // ===== Шейдерные наборы: живой фон на GPU =====
    // Процедурный набор рисуется на canvas один раз и стоит неподвижно. Шейдерный — то же
    // «ноль ассетов», но кадр считает видеокарта, поэтому фон может течь и дышать, не занимая CPU.
    //
    // Чтобы это не стало «ещё одной вечно крутящейся анимацией», слой дисциплинирован: стоит при
    // скрытом окне, выключается при системном «уменьшить движение», подчиняется авто-бюджету FPS,
    // считает в половину CSS-пикселей и при потере контекста молча уступает место обычному фону.

    var SHADERS = {
        // Полярное сияние: несколько «лент» синусов с мягким свечением в акценте.
        aurora:
            "float band(vec2 p, float o, float sp){" +
            " float y = sin(p.x*1.7 + u_time*sp + o)*0.18 + sin(p.x*0.7 - u_time*sp*0.6 + o)*0.10;" +
            " return smoothstep(0.22, 0.0, abs(p.y - y));}" +
            "vec3 render(vec2 p){" +
            " float a = band(p, 0.0, 0.10)*0.9 + band(p, 2.1, 0.07)*0.6 + band(p, 4.2, 0.13)*0.45;" +
            " float glow = smoothstep(1.1, 0.0, length(p*vec2(0.6,1.4)));" +
            " return mix(u_base, u_accent, a*0.55*glow);}",
        // Плазма: классические пересекающиеся синусы, тонированные в палитру набора.
        plasma:
            "vec3 render(vec2 p){" +
            " float t = u_time*0.15;" +
            " float v = sin(p.x*2.2 + t) + sin(p.y*2.6 - t*1.3) + sin((p.x+p.y)*1.7 + t*0.7);" +
            " v = v/3.0*0.5 + 0.5;" +
            " vec3 c = mix(u_base, u_accent, smoothstep(0.35, 1.0, v)*0.5);" +
            " return c + u_accent*0.05*smoothstep(0.9, 1.0, v);}",
        // Туманность: два слоя «шумовых» облаков, медленно расходящихся в разные стороны.
        nebula:
            "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }" +
            "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);" +
            " return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }" +
            "float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }" +
            "vec3 render(vec2 p){" +
            " float t = u_time*0.03;" +
            " float n = fbm(p*1.6 + vec2(t, -t*0.6));" +
            " float m = fbm(p*2.7 - vec2(t*0.7, t));" +
            " float v = smoothstep(0.35, 0.95, n*0.7 + m*0.4);" +
            " return mix(u_base, u_accent, v*0.42);}"
    };

    var VERT_SRC =
        "attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";
    // Общая обвязка фрагментного шейдера: нормализованные координаты с поправкой на пропорции,
    // плюс лёгкий дизеринг — на больших тёмных градиентах он убирает полосатость (banding).
    function fragSource(body) {
        return "precision mediump float;\n" +
            "uniform vec2 u_res; uniform float u_time; uniform vec3 u_accent; uniform vec3 u_base; uniform vec2 u_mouse;\n" +
            body + "\n" +
            "void main(){\n" +
            "  vec2 p = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;\n" +
            "  vec3 c = render(p);\n" +
            "  float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453);\n" +
            "  gl_FragColor = vec4(c + (d - 0.5)/255.0, 1.0);\n" +
            "}";
    }

    function isShaderSet(idx) { var s = SETS[idx]; return !!(s && s.shader && SHADERS[s.shader]); }
    function isShader(idx, zone) { return isShaderSet(idx) && !hasUserImg(idx, zone); }

    var shd = { canvas: null, gl: null, prog: null, raf: 0, t0: 0, last: 0, u: null, key: "", failed: false };

    function shaderHost() {
        // Холст живёт внутри части «редактор»: так он лежит под кодом, но над фоном части, и
        // не перекрывает сайдбар/панель/статусбар. Контейнер редактора VS Code пересоздаёт при
        // смене раскладки — heal() раз в 3 секунды возвращает холст на место.
        return document.querySelector(".part.editor > .content") || document.querySelector(".part.editor");
    }
    function shaderActive() {
        if (!cfg.enabled || shd.failed) return false;
        if (typeof reduceMotion === "function" && reduceMotion()) return false;
        return isShader(activeIndex(), "editor");
    }
    function _compile(gl, type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            try { console.warn("[MoonLight custom-bg] шейдер не скомпилировался:", gl.getShaderInfoLog(s)); } catch (e) {}
            gl.deleteShader(s); return null;
        }
        return s;
    }
    // Собственный GLSL пользователя (cfg.shaderSrc) — «свой фон» без пересборки плагина.
    // Ограничиваем только длиной: код исполняется на GPU в песочнице драйвера, к DOM и файлам
    // доступа не имеет. В код «Поделиться» он не входит — чужой шейдер на своей машине не запустится.
    function shaderBody(name) {
        if (name === "custom") {
            var src = (typeof cfg.shaderSrc === "string") ? cfg.shaderSrc : "";
            return src ? src.slice(0, 8000) : SHADERS.aurora;
        }
        return SHADERS[name] || SHADERS.aurora;
    }
    function ensureShader() {
        if (!shaderActive()) { shaderStop(); return; }
        var host = shaderHost(); if (!host) return;
        var idx = activeIndex(), s = SETS[idx], key = s.shader + "|" + getAccent() + "|" + (s.base || "");
        // Холст потерялся (VS Code пересобрал редактор) или сменился набор — пересоздаём.
        if (shd.canvas && (!shd.canvas.isConnected || shd.key !== key)) shaderStop();
        if (shd.canvas) { shaderStart(); return; }
        try {
            var c = document.createElement("canvas");
            c.id = "mlbg-shader";
            c.style.cssText = "position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; display:block;";
            var gl = /** @type {WebGLRenderingContext} */ (
                c.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" })
                || c.getContext("experimental-webgl")
            );
            if (!gl) { shd.failed = true; return; }
            var vs = _compile(gl, gl.VERTEX_SHADER, VERT_SRC);
            var fs = _compile(gl, gl.FRAGMENT_SHADER, fragSource(shaderBody(s.shader)));
            if (!vs || !fs) {
                // Свой шейдер не собрался — откатываемся на встроенный, а не гасим фон совсем.
                if (s.shader === "custom") fs = _compile(gl, gl.FRAGMENT_SHADER, fragSource(SHADERS.aurora));
                if (!vs || !fs) { shd.failed = true; return; }
            }
            var p = gl.createProgram();
            gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { shd.failed = true; return; }
            gl.useProgram(p);
            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // один большой треугольник
            var loc = gl.getAttribLocation(p, "a_pos");
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            shd.u = {
                res: gl.getUniformLocation(p, "u_res"), time: gl.getUniformLocation(p, "u_time"),
                accent: gl.getUniformLocation(p, "u_accent"), base: gl.getUniformLocation(p, "u_base"),
                mouse: gl.getUniformLocation(p, "u_mouse")
            };
            c.addEventListener("webglcontextlost", function (e) { e.preventDefault(); shaderStop(); shd.failed = true; }, false);
            host.insertBefore(c, host.firstChild);
            shd.canvas = c; shd.gl = gl; shd.prog = p; shd.key = key; shd.t0 = 0;
            shaderResize();
            shaderStart();
        } catch (e) { shd.failed = true; }
    }
    function shaderResize() {
        if (!shd.canvas || !shd.gl) return;
        try {
            // Половина CSS-пикселей: фон мягкий, разницы не видно, а работы GPU вчетверо меньше.
            var w = Math.max(2, Math.round(shd.canvas.clientWidth * 0.5));
            var h = Math.max(2, Math.round(shd.canvas.clientHeight * 0.5));
            if (shd.canvas.width !== w || shd.canvas.height !== h) {
                shd.canvas.width = w; shd.canvas.height = h;
                shd.gl.viewport(0, 0, w, h);
            }
        } catch (e) {}
    }
    function shaderFrame(ts) {
        shd.raf = 0;
        if (!shd.canvas || !shd.gl || !shaderActive()) return;
        if (document.hidden) return;                       // окно скрыто — кадры никому не нужны
        var save = (typeof perf === "object" && perf && perf.save);
        var minDt = save ? 66 : 33;                        // ~15 или ~30 кадров в секунду: фон медленный, больше не нужно
        if (!shd.t0) shd.t0 = ts;
        if (ts - shd.last >= minDt) {
            shd.last = ts;
            try {
                shaderResize();
                var gl = shd.gl, acc = hexToRgbArr(safeColor(getAccent(), DEFAULTS.accent));
                var s = SETS[activeIndex()], baseHex = isColor(s && s.base) ? s.base : "#11111b";
                var bas = hexToRgbArr(baseHex);
                gl.uniform2f(shd.u.res, shd.canvas.width, shd.canvas.height);
                gl.uniform1f(shd.u.time, (ts - shd.t0) / 1000);
                gl.uniform3f(shd.u.accent, acc[0] / 255, acc[1] / 255, acc[2] / 255);
                gl.uniform3f(shd.u.base, bas[0] / 255, bas[1] / 255, bas[2] / 255);
                gl.uniform2f(shd.u.mouse, mouseNorm.x, mouseNorm.y);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            } catch (e) { shaderStop(); shd.failed = true; return; }
        }
        shd.raf = requestAnimationFrame(shaderFrame);
    }
    var mouseNorm = { x: 0.5, y: 0.5 };
    function shaderStart() {
        if (shd.raf || !shd.canvas) return;
        if (document.hidden || !shaderActive()) return;
        shd.last = 0;
        shd.raf = requestAnimationFrame(shaderFrame);
    }
    function shaderStop() {
        if (shd.raf) { try { cancelAnimationFrame(shd.raf); } catch (e) {} shd.raf = 0; }
        if (shd.canvas) { try { shd.canvas.remove(); } catch (e) {} }
        shd.canvas = null; shd.gl = null; shd.prog = null; shd.key = "";
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

    // Пустое состояние: наклейка + одна строка «что сюда добавится». sticker — ключ UI_ICONS.
    function emptyState(text, sticker) {
        var box = el("div", null); box.className = "mlp-empty";
        var ic = uiIcon(sticker || "empty", 48); if (ic) box.appendChild(ic);
        box.appendChild(el("span", null, t(text)));
        return box;
    }

    // Сетка образцов цвета: группы [подпись, [#hex, ...]]; текущий цвет — с кольцом. Клик -> pick(hex).
    // Живёт под полем цвета (акцент, курсор, выделение терминала): hex вручную остаётся рядом.
    var SWATCH_CATPPUCCIN = ["#cba6f7", "#f5c2e7", "#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5", "#89dceb", "#89b4fa", "#b4befe"];
    function makeSwatches(groups, cur, pick) {
        var box = el("div", null); box.className = "mlp-sw-box";
        var curL = String(cur || "").toLowerCase();
        groups.forEach(function (g) {
            var cols = (g[1] || []).filter(function (c, i, a) { return isColor(c) && a.indexOf(c) === i; });
            if (!cols.length) return;
            var row = el("div", null); row.className = "mlp-sw-row";
            row.appendChild(el("span", null, t(g[0])));
            cols.forEach(function (hex) {
                var sw = el("div", null); sw.className = "mlp-sw" + (hex.toLowerCase() === curL ? " on" : "");
                sw.style.background = hex; sw.title = hex;
                sw.addEventListener("click", function (e) { e.stopPropagation(); pick(hex); });
                keyActivate(sw, t(g[0]) + " " + hex);
                row.appendChild(sw);
            });
            box.appendChild(row);
        });
        return box;
    }

    // Сегмент-переключатель «А | Б | В» вместо короткого селекта (как в настройках cpp-docs-panel):
    // все варианты видны сразу, выбор — один клик. options — [[значение, подпись], ...];
    // get() -> текущее значение; set(v) -> применить. label (необязательна) — метка слева.
    function makeSeg(label, options, get, set, info) {
        var wrap = el("div", ST.row + " flex-wrap:wrap;");
        if (label) wrap.appendChild(el("span", mutedLabel(92, true), t(label)));
        var seg = el("div", null); seg.className = "mlp-seg"; seg.setAttribute("role", "radiogroup");
        if (label) seg.setAttribute("aria-label", t(label));
        var btns = [];
        function sync() {
            var cur = get();
            btns.forEach(function (b) {
                var on = b._v === cur;
                b.className = on ? "on" : "";
                b.setAttribute("aria-checked", on ? "true" : "false");
                b.tabIndex = on ? 0 : -1;
            });
        }
        options.forEach(function (o) {
            var b = el("button", null, t(o[1])); b.type = "button"; b._v = o[0];
            b.setAttribute("role", "radio");
            b.addEventListener("click", function (e) { e.stopPropagation(); if (get() === o[0]) return; set(o[0]); sync(); });
            btns.push(b); seg.appendChild(b);
        });
        seg.addEventListener("keydown", function (e) {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            var i = -1; for (var k = 0; k < btns.length; k++) if (btns[k] === document.activeElement) i = k;
            if (i < 0) return;
            e.preventDefault(); e.stopPropagation();
            var n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
            n.click(); try { n.focus(); } catch (er) {}
        });
        sync();
        wrap.appendChild(seg);
        var d = info ? infoDot(info) : null; if (d) wrap.appendChild(d);
        wrap._sync = sync;
        return wrap;
    }

    // ===================== src/ui/icons.js =====================
    // ===== Значки панели =====
    // СГЕНЕРИРОВАНО scripts/embed-icons.js из assets/ui — вручную не править.
    // uiIcon(name, size) -> <img> или null, если значка нет (тогда вызывающий обходится текстом).
    var UI_ICONS = {
        "dice": "data:image/webp;base64,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",
        "empty": "data:image/webp;base64,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",
        "logo": "data:image/webp;base64,UklGRngEAABXRUJQVlA4IGwEAABQEwCdASpAAEAAPlEejESjoaEWDAbMOAUEtC/7Iwsg78XxnmY2r/ObgoWWGlt1fMBjtXogdLhPu2yBYA+icuLCRoXkk1Cx22zOafPNAfVVyJcRRrLrWd7cLKCK2/IBByvaJlmCTQ9+ULBZOxiJOJP/BZ+kPtvXBAXRNeM4QTgicyFc5oVLHLY/5gJaFMdr1fvPeC/mVaUNjZQTkldLnzbKI3AAAP7/VvsqW63++6Rd+e1Hd92Pkk4pYnVb9rLlmIb0iN004exGQuGmSZGKgMxGLoqK/93/Zz8VwlWj/Lnvk7+e/FWt/I0Z+feN990zRkioCBFbiRPt1zYnhMqMHZ6HcrifrVINHBob4tRVAGNz2MOykNBotLcEZibi3Bk2FU1lxr8av+Qg9xsZkFPkwu8dBfqYL5abbTOd8cH4Ozj2pxdrvwDxS/9ozxd+RX7WwXt7oTScq2LHAtM+Rzn06TmuE5ulq4XNJPXKgnIy7Aisl/KIBFDE+qxZ5Dd2JGXWp89Hum3wx98Ljb4jabz9+JDB9fDnMnjlwY5oD+xTIjwCK5bA+ct/+M3IGLaFT4h9b3P2pAzYTXOsp7mG9GOX6439fmGdkjzzaumfx9q5REnO0jUAu1kywu1RUNniLIj89QuO33vNKl/q1UIa4I/pBx7limS317xIC9uNy/mfuf64FCoH/MQfzcbAri2OkhBkTqCpnLS2KSpLpNf6ve12t7rKD/mFqr3Pt/fGiB0xG4mF0tMdwlkIN+E5Vd5wriNqdqTy9+mGMLgnGhZlHPtTOGDxzxSfpVz3uajIseMzcmwuiW8J0pUJWR+WuqVr5f1sUUnMAMTN0qYV0zsu+h9WuHoT4ucboFd62fceFz261MsMintWmA/5scfXH4F5Jz+dDnhUtm4szGGeqeF9LrsqVkJtb8UnVG24x/f31ply4OoeI8vqFGCiHfpkc0QpYyhyf+1tuM+VtUZ/1VV9ud7Le6f3AMvKDdXEO1W/KR678iwqbJzd9u6icx7FsSYsRF33Q0N3t0IBTFLrRdvLiFjPBSoY6TK59SAF+jf1ZZTJsOijWFQDSr+rHem2wsuqLMpffjLmpjdYcfopD2NpIbByqiIpe5ApLaqHk6/0vxg4IGYjFYX3uGJVtYEOD3E6A99/eT4Y4ovF1+OTO3u+VYPXVajUFvx82C6qr424XwKpcizkKXAKOFkd+paV4pQa4Pds+ZKk1seXRHCWYXRkmiIHqWIN0p2dghtsEHFK9CR+FY+WPn5DFTOzca+ah7V4MtjmLf21AtjodMH/elZzbfl/6Lkz1hvGwp/ARbHFyMbVCaseo8Bu/x3Uzrf9bYKrO2d9RPgWJhkVws4AYEXV1NdyPx6R8or7XaTv2dph+sYwvzmeEXgC9pTb5TGDXE8eS6ySmyJ1CQoWE6SOkJYPUJKdbUle4lXCaxpexXQLJ/HR9S0GCRlfJGxXCa++b67mFsQ9HDkjhFo2nA9ZRew+6B06ddb0BX8xnPHZOPn4oAAA",
        "noresult": "data:image/webp;base64,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",
        "pin": "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2024%2024'%3E%3Cpath%20d%3D'M9%203h6l-1%206%203%203v2h-4v7l-1%201-1-1v-7H7v-2l3-3z'%20fill%3D'%23f38ba8'%20stroke%3D'%23fff'%20stroke-width%3D'1.6'%20stroke-linejoin%3D'round'%2F%3E%3C%2Fsvg%3E",
        "star": "data:image/webp;base64,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",
        "tab-auto": "data:image/webp;base64,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",
        "tab-data": "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2064%2064'%3E%3Cpath%20d%3D'M8%2012a6%206%200%200%201%206-6h30l12%2012v32a6%206%200%200%201-6%206H14a6%206%200%200%201-6-6z'%20fill%3D'%23fff'%2F%3E%3Cpath%20d%3D'M12%2014a4%204%200%200%201%204-4h26l10%2010v28a4%204%200%200%201-4%204H16a4%204%200%200%201-4-4z'%20fill%3D'%2389b4fa'%2F%3E%3Crect%20x%3D'20'%20y%3D'10'%20width%3D'20'%20height%3D'13'%20rx%3D'2'%20fill%3D'%23cdd6f4'%2F%3E%3Crect%20x%3D'32'%20y%3D'12'%20width%3D'5'%20height%3D'8'%20rx%3D'1'%20fill%3D'%2345475a'%2F%3E%3Crect%20x%3D'19'%20y%3D'32'%20width%3D'26'%20height%3D'18'%20rx%3D'3'%20fill%3D'%23f5e0dc'%2F%3E%3Cpath%20d%3D'M24%2038h16M24%2044h11'%20stroke%3D'%23fab387'%20stroke-width%3D'3'%20stroke-linecap%3D'round'%2F%3E%3C%2Fsvg%3E",
        "tab-fx": "data:image/webp;base64,UklGRoAMAABXRUJQVlA4WAoAAAAQAAAAPwAAPwAAQUxQSHoFAAABsEXbtiHZ1lx7R9bxubZt27bv373Ptm3btm3btm3r2BWx15o5PyIyIupdfEfEBOB2quWqSrekjLbZLcCslbD8xsc/+gIg/98lwICEs38piZ/cH3lIrqq0MNhlAiSctEmlqYv+ej5SPwOAvACGR679xl6W81c1T7o32nwmci9c9uSHHoJkYxl2WCs9CzhzGiQZrPXdymZZmnuTpLUPxjiWc7a575A/Xoqnqm6R9OnZyDMy7qt6vpnqVTnZCO05PFR1ORWfVR1djZ6KaobN/Yx10LfpvsiDDLu/6i0nwQ5aPx9PXLJKzu6iT8K6KpxHJ8mGP8lpUMbrpC2Pq/Be6YlnqUSXh/62AtaqkL6o0qLHWZgMe7M2ur58xD4f+8COL1DD2R4XWAaQsN/75QxGeNHX90YekOzAL4tbtOpMYPkfFbOi1guRgYRHrpIHIzycof/eA9YPBtz/f9qsD5rdWc6eoT+vNMt4hKaFTroHSZeelcx6IRkO+bjHPdOKn0/7ue6OCZb/mbWTEeFse60XIvUDKuC8M+bwJBX2dZ/+ZnnGnuvp4XQPD0aQTWzeBzYAKQE4dz4GRNHzMVd9W004w90jPEiP5hikIZaW4Nh/Tj3IiBnBcN6A6sLN0TgZ4c4gfV5/Wg4bUmWc9Q8VZ7jPIulcexpwda0myIggyUblOmT0tpxgD9+qQpIe7O369wXAFb9RCQbbru+dh4TeGcBFXxbdW9GKmMEif9kBWPQ0lmDb9aJFSOhrhsm1n5BKMEgG233o1H+ftz8+riaCbPQmIGPgnX8kReH40UjrH3CGSoRHrN3LMvpamrxR8sJYADIa6RnPUPFmm16DjN4Zj1Jd2DtiBDJqveqZkvTnfc36YfHvWEev8HHo87rX3b7763cdAkNvw96bFOyMDg/OjuhVTz+PajGQMGTlP+kd4QwygiOx0efyBClhaMZLNd/BoJNkxKyBtV6SUBkGW9r+66oZbHuQpI/iQV/3g7sANgiGnX6mpkSLERy3cTljKr1kDjYICft9TmLTch8WpLu0NsLD5/XhxckGwYBrPxViISNGiEb61CUfUhOkb9NjkYfBDDjzXVThmF7r11dj9w1Tku4N/72T2TAgG3DW1+QxzGu9e2fgBSp0hrPoPshjACmjeoY8hkStl6DKR21gRJCkT3+2KNkoQM54kLxXkEWvx1Is+46cnUHX4zBn4yBN8FKVfkXfWDqHPT+vhoxgO2LbRbBqHORq2c/lPeix6WhUN/1JxZ1Bb9G55v6LYDZGhQpXR/Sp9Rxc/jWpJp2MLjr14zvCbJAlVEuRvqgyK6arV9xNKs5gkJzBKNJLABuQgau//YvzcBf5rEYvWrlpWujsjugivdEHVpr1Stjp1ZI+jH1XKbrCdfzFKuwOtqOLnNcLkfsYTv2ltoXuneY+rhIdrr9WF43X8BcT2KyEQ1Zps/51ByzF49R0RKN3YsUv1HSRDJIMj64f5z4ZF0n61MF42HfveqQ7SUbUuidw3N9Vz3IPMoIkvdGjkdHTqmf/6GHAedKmla9XTZIRmw/ABEf9Q6UOb4VHBElGI716YtYHQIWcPj6Nb012/JJq97JNb0ZGxiHvLWo6SIaT9NB3r8bghAnO82Z6DdLiD6n9w93MgASc+lGV6GKQRVseUSENgiX7cPBbVcqYe+wP//7jZ+wIA4CUgPu7xyzX306HZYxo9i3pCmQYUK2oAEN3qvAclS46/3c0KoyacOLb7g8DYBlANsy2tN2f6R1RdCMmWEBDp5mhd8ZjVEer1seQMXrKGSMn22tdFAbpfvpCLGTCY1VHcF6fQ8It0RKeIzaN/HTLtwgg4WlFWnUHJNxCLeG4e995HyTcchMAJNySU5UNtzcBVlA4IOAGAABwHgCdASpAAEAAPl0kjUUjoiEZ/AYAOAXEtgBTo5Bo70G++cCeXGEztjvMB5zv+A9Sn+O3x/0APLn9jP+1+cBmlf8a6t34V/sB63+LH2DmUVlGZH7u/sOEHav3YsAH1I/0HHb3J3+Z8ojwN6AH5Q/33sof03/g8q35t/iv+p7gX8d/nX+v/uf5H+Bj9jPZB/WpYDzwSgeuTYqaFF45KQa9P2nrH4km0kgoXs3UY+FOFtf+NQOiNDlHSIyB4ZmJheUeArwdnPP9ez9YNwu/SX4IoVcLZ2jLMrEP5v8d6Zq8ProBRGvbeQiMz1Gt6xdPNfjET4xTgSrJfT/pgAAA/vEfvwxm2Jw2gnH0ZTOWPTQigN/3W9H8YLF/IQcQDEj993ObbDhJZFNRkwSak9qwTGbfSjMP+WZdtsc0Br3gOU1XR83QvEIWvU7hxWc4AVllawnrcVoCVjm+u/m6dyPX1B9W+LMjaAyjnjAmQlt+OQqkMpN/pwV7H4HU+UsienzLDjuwJk1b+8uFrlecPGifrOt1HRvBN1Dh6wjOIiDacaCH40E7Vaq/+ixKv3P4X5ctgpkc9vajuyIOM+Hmj/ZErFxPJElvqC4IX8Jb8ioN5I+cDnJllhM0u7df7idABWQO6RuooxoCQdnnuo975hq6Jf4BvzEOUjXLk9CwT2GTn5aFx2uOrfIKJZ0MXuouOyiEPmHI/uu9DKlgnuBNCO2zIFv+4OlJw31xLTdpd7zsgFSKsM4Of5DFV3o5y3w2g84orPikYN68P4ZEcVW4zxGUUxKe5ze6uncjX/firN7ZV7Z8lLAUYH3U/qjrl9g/Mx7vleIc7hhRLAF3hz49xuRSxt9aXqJpjo9GN38Rv9csFCdo56HX34QW5VfLk8qquqVuPwA9IK2vEnl91d28IE60ntpBVjPwQGpYP98bn2bPiuFlPZ7/31184ZA40pHKqr4j1xH5qhzVWxu7uJIBeBvZqWIjfd6qPPpA9gUfm9h2QCkKheozCUvAWR+2oFXc5XCa9pTuVKQBGpy4p9y5kddIkgaWRBq3ZAfZPDGbo1qHf6qsLkZOciro41T2tPeZZqe/TqzZNIAFyWWObPpsoC9GqVoGGQU9Wymi07Lt6xhwl9P+1lZkPLCdR9iwUllmkpG0R86WIp7cPzgb31iZ7rowh1/sjR4rNOC5NMRvKzqWLVIvYbSfgzd8NECWloLub1rVnCRhbOpOlVVRm8PJvAdJvZln/weYrVn/D3A6OFFbLLOu1ALZE2+F0utlHbacrMcxmeYvtCbHWRkzeSWcrI7LAKbm3U9VxaDIxEcCRJxFGcVmDSzmdAl/7gJFLO3+gYatdAP+UoRne0fSTUDauUTYoBnou2wcrJaeHRaNuDvyHjSvWBmkgBJyoTuBgA3k+Ci0vtScG1btXQRgEvExFU4XWsJNtz+gvChHvrJWtQ8XhCKMPsqUTC9N79UbDAW+GwhIAJKebY1jBJ6oWSYYvWcwG78BYR3QZ40ozQCqbmnk96BgTKlxtTW4whEOLYyqmfY6mhIw79eq8cQf+yn+by3Yye6ITgcBDyaxzDh2b6xb1E5oAJ16Kjd2V9NBhQKd7T/XSHyffKp7uzWECqbFb8iUw7m/dPBSMbEXW9f0jyQujxJOZvfqUdv+M/hzcYNV3qtd0iYil2qOH3zrIStuebyydhBmxuegQ1B9LE0OvxuNwCyUb824yxVHJG7leEwPlMV9Nhri3hkAR/L7249RG+O9T4PRDmID+Vpm8UTrdo0ZTbm87/Xx/8pJ2Jkjv+a5zYNfVvJudiLM3LE/38B/+eizac/+rK8z9zPL13sNgcrGQNj+nL/fFVe2Fjka1/orqy/BYVz/6OjsZfAwK0MX4PqqnPjTc0jM64Ne/idj/TbOzy/6NIsZrOsSf/6D2c/NDUYxQLXq/v9k2TGnsmcLgXjENylgZ1bVm+Q2lXhsDf+d8eep/olBPRkMACUDwW51lHvUDC9fsDvyxZfevduj11v28RWAfKZP7V4r4gzohx73m/P5WAWb4MbXdLCYlJ6gxD+RdPoTZb4CG38KDh1v4s5HhgA6/A4vt2Vx7VKMCsCGMeNtxGtT9GxWylb/VkLWQp+bf4uPG+pr1wH07eX0tzp+CwEgo2/Zcsup0dqZxpyr7XDzsZpU/QhHGewr4wwPS9yMzym+qvkD8NQT6/3Es/vbCvnoBe1vaWEGlHK/yn682jajFsB7hoCDjwGI+79cB9av/WfUwZGmyJkfgsxzRNlQNBJ1K8+kTO28qh+oYICFKnRXJN6QMvoEUBJhfVcFUQpCoaCFc/OClXInIx2YY6Vsn6isPykQRR0gzf8blq04MiAAAA==",
        "tab-set": "data:image/webp;base64,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",
        "tab-sys": "data:image/webp;base64,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",
        "tab-term": "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2064%2064'%3E%3Crect%20x%3D'6'%20y%3D'10'%20width%3D'52'%20height%3D'44'%20rx%3D'9'%20fill%3D'%23fff'%2F%3E%3Crect%20x%3D'10'%20y%3D'14'%20width%3D'44'%20height%3D'36'%20rx%3D'6'%20fill%3D'%2345475a'%2F%3E%3Crect%20x%3D'10'%20y%3D'14'%20width%3D'44'%20height%3D'8'%20rx%3D'4'%20fill%3D'%23cba6f7'%2F%3E%3Cpath%20d%3D'M18%2030l7%205-7%205'%20fill%3D'none'%20stroke%3D'%23a6e3a1'%20stroke-width%3D'4'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%2F%3E%3Cpath%20d%3D'M30%2041h12'%20stroke%3D'%23fab387'%20stroke-width%3D'4'%20stroke-linecap%3D'round'%2F%3E%3C%2Fsvg%3E",
        "tab-view": "data:image/webp;base64,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"
    };
    function uiIcon(name, size) {
        var src = UI_ICONS[name]; if (!src) return null;
        var im = document.createElement("img");
        im.src = src; im.alt = ""; im.draggable = false; im.className = "mlp-ico";
        if (size) { im.width = size; im.height = size; }
        im.setAttribute("aria-hidden", "true");
        return im;
    }

    // ===================== src/ui/panel-css.js =====================
    // ===== Таблица стилей панели =====
    // Внешний вид панели в духе окна настроек cpp-docs-panel: карточка с мягким акцентным
    // отблеском, вкладки колонкой слева со значками, заголовок страницы с подписью, секции-карточки,
    // свитчи вместо чекбоксов, сегменты вместо коротких селектов, ползунки с заливкой.
    // Раньше каждый контрол нёс весь стиль инлайном; общие элементы (поля, чекбоксы, ползунки)
    // теперь оформляет этот лист по тегу/классу внутри панели, так что старые фабрики тоже
    // выглядят по-новому без переписывания. Цвета — из --mlp-* (их задаёт togglePanel под тему)
    // и --mlbg-accent / --mlbg-accent-rgb (акцент активного набора).
    var PANEL_CSS_ID = "moonlight-bg-panel-css";
    function panelCss() {
        var P = "#moonlight-bg-panel", Q = "#moonlight-bg-qmenu";
        var A = "rgba(var(--mlbg-accent-rgb,203,166,247),";   // + "0.2)" — акцент с прозрачностью
        var T = "rgba(var(--mlp-tint,205,214,244),";          // + "0.06)" — нейтральный оттенок темы
        return [
            "@keyframes mlp-pop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}",
            "@keyframes mlp-page{from{opacity:0;transform:translateX(4px)}to{opacity:1;transform:none}}",
            P + "{display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:16px;animation:mlp-pop .18s cubic-bezier(.2,.9,.3,1.2);" +
                "box-shadow:0 24px 70px rgba(0,0,0,.45),0 0 0 1px " + A + "0.10);}",
            P + "::before{content:'';position:absolute;inset:0 0 auto 0;height:130px;pointer-events:none;" +
                "background:radial-gradient(120% 100% at 0% 0%," + A + "0.22),transparent 70%);}",
            // шапка
            P + " .mlp-head{position:relative;display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;cursor:move;user-select:none;}",
            P + " .mlp-hic{flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;" +
                "background:" + A + "0.16);border:1px solid " + A + "0.35);}",
            P + " .mlp-hic img{width:26px;height:26px;border-radius:6px;}",
            P + " .mlp-ht{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px;}",
            P + " .mlp-ht b{font-size:14px;font-weight:700;letter-spacing:.2px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            P + ".mlp-narrow .mlp-ht span{display:none;}",
            P + " .mlp-ht span{font-size:11px;color:var(--mlp-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            P + " .mlp-hbtn{flex:0 0 auto;min-width:28px;height:28px;padding:0 8px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;" +
                "border-radius:9px;cursor:pointer;font-size:12px;color:var(--mlp-muted);background:" + T + "0.05);border:1px solid var(--mlp-border-faint);transition:background .12s,border-color .12s,color .12s;}",
            P + " .mlp-hbtn:hover{color:var(--mlp-fg);background:" + A + "0.18);border-color:" + A + "0.45);}",
            P + " .mlp-hbtn.on{color:var(--mlbg-accent);background:" + A + "0.18);border-color:" + A + "0.5);}",
            P + " .mlp-hbtn.off{opacity:.4;cursor:default;}",
            // верхняя полоса: мастер-выключатель + поиск
            P + " .mlp-top{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 14px 10px;}",
            P + " .mlp-master{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:6px 11px;border-radius:11px;cursor:pointer;" +
                "background:" + A + "0.12);border:1px solid " + A + "0.3);font-weight:600;}",
            P + " .mlp-master.off{background:" + T + "0.05);border-color:var(--mlp-border-faint);color:var(--mlp-muted);}",
            P + " .mlp-search{position:relative;flex:1 1 180px;min-width:0;}",
            P + " .mlp-fav{padding:0 14px 8px;}",
            // тело: вкладки слева + страница
            P + " .mlp-body{position:relative;flex:1 1 auto;min-height:0;display:flex;border-top:1px solid var(--mlp-border-faint);}",
            P + " .mlp-nav{flex:0 0 164px;box-sizing:border-box;padding:10px 8px;display:flex;flex-direction:column;gap:3px;overflow-y:auto;" +
                "border-right:1px solid var(--mlp-border-faint);background:" + T + "0.025);}",
            P + " .mlp-tab{position:relative;display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:11px;cursor:pointer;" +
                "font-size:12px;font-weight:600;color:var(--mlp-muted);border:1px solid transparent;transition:background .12s,color .12s;}",
            P + " .mlp-tab:hover{color:var(--mlp-fg);background:" + T + "0.06);}",
            P + " .mlp-tab.on{color:var(--mlp-fg);background:linear-gradient(90deg," + A + "0.24)," + A + "0.08));border-color:" + A + "0.45);box-shadow:inset 3px 0 0 var(--mlbg-accent);}",
            P + " .mlp-tic{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:" + T + "0.06);}",
            P + " .mlp-tab.on .mlp-tic{background:" + A + "0.2);}",
            P + " .mlp-tic img{width:21px;height:21px;}",
            P + " .mlp-tl{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            P + " .mlp-badge{flex:0 0 auto;min-width:16px;height:16px;line-height:14px;padding:0 4px;box-sizing:border-box;border-radius:8px;font-size:9.5px;font-weight:700;text-align:center;" +
                "color:var(--mlbg-accent);background:" + A + "0.18);border:1px solid " + A + "0.45);}",
            P + " .mlp-pages{flex:1 1 auto;min-width:0;overflow-y:auto;overflow-x:hidden;padding:12px 14px 16px;}",
            P + " .mlp-page{animation:mlp-page .16s ease-out;}",
            P + " .mlp-ph{display:flex;flex-direction:column;gap:2px;margin:0 2px 4px;}",
            P + " .mlp-ph b{font-size:15px;font-weight:700;color:var(--mlp-fg);}",
            P + " .mlp-ph span{font-size:11px;color:var(--mlp-faint);}",
            // узкая панель: вкладки только значками
            P + ".mlp-narrow .mlp-nav{flex-basis:50px;padding:10px 6px;}",
            P + ".mlp-narrow .mlp-tl{display:none;}",
            P + ".mlp-narrow .mlp-tab{justify-content:center;padding:6px 4px;}",
            P + ".mlp-narrow .mlp-badge{position:absolute;top:-3px;right:-3px;}",
            // секции-карточки
            P + " .mlp-sec{margin-top:10px;border-radius:13px;background:" + T + "0.035);border:1px solid var(--mlp-border-faint);overflow:hidden;}",
            P + " .mlp-sec.hid{opacity:.55;}",
            P + " .mlp-sec-h{display:flex;align-items:center;gap:8px;padding:9px 11px;cursor:pointer;border-radius:13px;transition:background .12s;}",
            P + " .mlp-sec-h:hover{background:" + A + "0.08);}",
            P + " .mlp-sec-t{flex:1 1 auto;min-width:0;font-size:12.5px;font-weight:700;color:var(--mlp-head);}",
            P + " .mlp-chev{flex:0 0 auto;width:14px;text-align:center;color:var(--mlp-faint);font-size:10px;transition:transform .15s;}",
            P + " .mlp-sec.open .mlp-chev{transform:rotate(90deg);color:var(--mlbg-accent);}",
            P + " .mlp-sec-b{padding:0 10px 10px;}",
            // кнопки
            P + " .mlp-btn{flex:1 1 0;padding:7px 10px;text-align:center;border-radius:10px;cursor:pointer;font-weight:600;font-size:12px;" +
                "color:var(--mlp-fg);background:" + T + "0.06);border:1px solid var(--mlp-border-soft);transition:background .12s,border-color .12s;}",
            P + " .mlp-btn:hover{background:" + A + "0.18);border-color:" + A + "0.45);}",
            P + " .mlp-btn.off{opacity:.45;cursor:default;}",
            P + " .mlp-danger{margin-top:14px;padding:10px;border-radius:13px;border:1px solid rgba(243,139,168,.3);background:rgba(243,139,168,.06);}",
            P + " .mlp-danger .mlp-btn{color:#f38ba8;border-color:rgba(243,139,168,.35);background:rgba(243,139,168,.10);}",
            P + " .mlp-danger .mlp-btn:hover{background:rgba(243,139,168,.2);}",
            // сегменты
            P + " .mlp-seg{display:inline-flex;flex:0 1 auto;flex-wrap:wrap;gap:2px;padding:2px;border-radius:10px;background:var(--mlp-field);border:1px solid var(--mlp-border-soft);}",
            P + " .mlp-seg button{all:unset;box-sizing:border-box;padding:4px 11px;border-radius:8px;cursor:pointer;font-size:11.5px;color:var(--mlp-muted);white-space:nowrap;}",
            P + " .mlp-seg button:hover{color:var(--mlp-fg);background:" + T + "0.08);}",
            P + " .mlp-seg button.on{color:var(--mlp-on-accent,#1e1e2e);background:var(--mlbg-accent);font-weight:600;}",
            P + " .mlp-seg button:focus-visible{outline:2px solid var(--mlbg-accent);outline-offset:1px;}",
            // поля
            P + " input[type=text]," + P + " input:not([type])," + P + " textarea," + P + " select{border-radius:8px !important;padding:5px 8px !important;outline:none;}",
            P + " input[type=text]:focus," + P + " textarea:focus," + P + " select:focus{border-color:" + A + "0.6) !important;box-shadow:0 0 0 2px " + A + "0.18);}",
            // свитч вместо чекбокса
            P + " input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:0 0 auto;position:relative;width:30px;height:17px;margin:0 2px 0 0;border-radius:9px;cursor:pointer;" +
                "background:" + T + "0.2);border:1px solid var(--mlp-border-soft);transition:background .15s,border-color .15s;}",
            P + " input[type=checkbox]::after{content:'';position:absolute;top:1px;left:1px;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .15s;}",
            P + " input[type=checkbox]:checked{background:var(--mlbg-accent);border-color:var(--mlbg-accent);}",
            P + " input[type=checkbox]:checked::after{transform:translateX(13px);}",
            P + " input[type=checkbox]:focus-visible{outline:2px solid var(--mlbg-accent);outline-offset:2px;}",
            // ползунок с заливкой до значения (--p ставит makeSlider)
            P + " input[type=range]{-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;cursor:pointer;margin:0 2px;" +
                "background:linear-gradient(90deg,var(--mlbg-accent) var(--p,50%)," + T + "0.18) var(--p,50%));}",
            P + " input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--mlbg-accent);box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.4);}",
            P + " input[type=range]:focus-visible{outline:2px solid " + A + "0.6);outline-offset:3px;}",
            // карточки наборов
            P + " .mlp-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;}",
            P + " .mlp-set{position:relative;display:flex;flex-direction:column;border-radius:11px;overflow:hidden;cursor:pointer;background:" + T + "0.04);" +
                "border:1px solid var(--mlp-border-soft);transition:border-color .12s,transform .12s;}",
            P + " .mlp-set:hover{border-color:" + A + "0.6);transform:translateY(-1px);}",
            P + " .mlp-set.on{border-color:var(--mlbg-accent);box-shadow:0 0 0 2px " + A + "0.35);}",
            P + " .mlp-set-pv{position:relative;height:52px;overflow:hidden;}",
            P + " .mlp-set-nm{display:flex;align-items:center;gap:4px;padding:5px 7px 6px;font-size:11px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;}",
            P + " .mlp-set-nm span{overflow:hidden;text-overflow:ellipsis;}",
            P + " .mlp-set.on .mlp-set-nm{font-weight:700;}",
            P + " .mlp-set-no{flex:0 0 auto;font-size:10px;font-weight:700;color:var(--mlp-faint);}",
            P + " .mlp-set.on .mlp-set-no{color:var(--mlbg-accent);}",
            P + " .mlp-set-rand{align-items:center;justify-content:center;}",
            P + " .mlp-set-rand .mlp-set-pv{display:flex;align-items:center;justify-content:center;background:" + A + "0.10);}",
            P + " .mlp-set-rand img{width:36px;height:36px;}",
            P + " .mlp-set-star{position:absolute;top:3px;right:4px;z-index:3;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;font-size:12px;cursor:pointer;" +
                "color:#fff;background:rgba(0,0,0,.45);opacity:0;transition:opacity .12s;}",
            P + " .mlp-set:hover .mlp-set-star," + P + " .mlp-set-star.on," + P + " .mlp-set-star:focus-visible{opacity:1;}",
            P + " .mlp-set-star.on{color:#f9e2af;}",
            P + " .mlp-hbtn img{width:16px;height:16px;}",
            // «Сейчас работает» на вкладке «Авто-смена»
            P + " .mlp-now{display:flex;align-items:center;gap:11px;margin:8px 0 2px;padding:9px 11px;border-radius:13px;" +
                "background:" + A + "0.10);border:1px solid " + A + "0.35);}",
            P + " .mlp-now-pv{flex:0 0 auto;width:64px;height:38px;border-radius:8px;}",
            P + " .mlp-now-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;}",
            P + " .mlp-now-t b{font-size:12.5px;color:var(--mlp-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            P + " .mlp-now-t span{font-size:11px;color:var(--mlp-muted);}",
            // образец терминала
            P + " .mlp-term{margin:2px 0 8px;padding:10px 12px;border-radius:10px;background:#11111b;color:#cdd6f4;font-size:12.5px;line-height:1.6;" +
                "border:1px solid var(--mlp-border-soft);white-space:pre;overflow:hidden;}",
            P + " .mlp-term-cur{display:inline-block;vertical-align:text-bottom;animation:mlp-blink 1.1s steps(1) infinite;}",
            "@keyframes mlp-blink{50%{opacity:0}}",
            // образцы цвета
            P + " .mlp-sw-box{display:flex;flex-direction:column;gap:4px;padding:3px 2px 6px;}",
            P + " .mlp-sw-row{display:flex;flex-wrap:wrap;align-items:center;gap:5px;}",
            P + " .mlp-sw-row>span{flex:0 0 86px;font-size:10.5px;color:var(--mlp-faint);}",
            P + " .mlp-sw-row>span:empty{display:none;}",
            P + " .mlp-sw{width:18px;height:18px;border-radius:50%;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);transition:transform .1s;}",
            P + " .mlp-sw:hover{transform:scale(1.15);}",
            P + " .mlp-sw.on{box-shadow:0 0 0 2px var(--mlp-bg),0 0 0 4px var(--mlp-fg);}",
            // группы эффектов — карточки
            P + " .mlp-fxg{margin-top:6px;border-radius:10px;border:1px solid var(--mlp-border-faint);background:" + T + "0.025);}",
            P + " .mlp-fxg-h{display:flex;align-items:center;gap:7px;padding:6px 9px;cursor:pointer;border-radius:10px;font-size:11px;font-weight:700;color:var(--mlp-head);}",
            P + " .mlp-fxg-h:hover{background:" + A + "0.08);}",
            P + " .mlp-fxg.open .mlp-chev{transform:rotate(90deg);color:var(--mlbg-accent);}",
            P + " .mlp-fxg-n{flex:0 0 auto;font-size:10px;font-weight:600;padding:1px 7px;border-radius:8px;color:var(--mlp-faint);background:" + T + "0.06);}",
            P + " .mlp-fxg-n.on{color:var(--mlbg-accent);background:" + A + "0.16);}",
            P + " .mlp-fxg-b{padding:0 6px 6px;}",
            P + " .mlp-empty{display:flex;align-items:center;gap:10px;padding:8px 6px;font-size:11.5px;color:var(--mlp-muted);}",
            P + " .mlp-empty img{flex:0 0 auto;width:44px;height:44px;opacity:.9;}",
            P + " .mlp-news{display:flex;align-items:flex-start;gap:10px;margin:8px 0 2px;padding:10px 11px;border-radius:13px;font-size:11.5px;line-height:1.5;color:var(--mlp-muted);" +
                "background:linear-gradient(135deg," + A + "0.16)," + A + "0.05));border:1px solid " + A + "0.4);}",
            P + " .mlp-news b{display:block;margin-bottom:2px;font-size:12.5px;color:var(--mlp-fg);}",
            P + " .mlp-news img{flex:0 0 auto;width:28px;height:28px;}",
            P + " .mlp-tip{display:flex;align-items:center;gap:8px;padding:7px 8px 7px 11px;border-radius:11px;font-size:11.5px;color:var(--mlp-fg);" +
                "background:rgba(249,226,175,.10);border:1px solid rgba(249,226,175,.35);}",
            P + ".mlp-drop{box-shadow:0 0 0 3px var(--mlbg-accent),0 24px 70px rgba(0,0,0,.45);}",
            P + " .mlp-rule-n{flex:0 0 auto;width:18px;height:18px;line-height:18px;border-radius:50%;text-align:center;font-size:10px;font-weight:700;color:var(--mlp-faint);background:" + T + "0.08);}",
            P + " .mlp-rule-n.on{color:var(--mlp-on-accent,#1e1e2e);background:var(--mlbg-accent);}",
            P + " .mlp-rule-s{flex:0 0 auto;font-size:10px;font-weight:600;padding:1px 7px;border-radius:8px;color:var(--mlp-faint);background:" + T + "0.06);}",
            P + " .mlp-rule-s.on{color:var(--mlbg-accent);background:" + A + "0.16);}",
            P + " .mlp-inl{grid-column:1/-1;margin:0 0 4px 26px;padding:2px 6px 4px;border-left:2px solid " + A + "0.35);}",
            P + " .mlp-focus{position:relative;width:100%;aspect-ratio:16/9;max-height:150px;margin:0 auto;border-radius:9px;cursor:crosshair;background-size:100% 100%;background-color:" + T + "0.06);border:1px solid var(--mlp-border-soft);}",
            P + " .mlp-focus-dot{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;background:var(--mlbg-accent);box-shadow:0 0 0 2px rgba(0,0,0,.4);pointer-events:none;}",
            P + " .mlp-chip{padding:3px 9px;border-radius:8px;cursor:pointer;font-size:11px;color:var(--mlp-fg);background:" + T + "0.06);border:1px solid var(--mlp-border-soft);}",
            P + " .mlp-chip:hover{border-color:" + A + "0.55);background:" + A + "0.14);}",
            // быстрое меню у кнопки BG
            Q + "{animation:mlp-pop .14s ease-out;}",
            Q + " .mlp-qsets{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:3px 6px 6px;}",
            Q + " .mlp-qset{position:relative;height:34px;border-radius:7px;cursor:pointer;border:1px solid rgba(255,255,255,.14);transition:transform .1s;}",
            Q + " .mlp-qset:hover{transform:translateY(-1px);border-color:rgba(var(--mlbg-accent-rgb),.7);}",
            Q + " .mlp-qset.on{border:2px solid var(--mlbg-accent);}",
            "@media (prefers-reduced-motion: reduce){" + P + "," + P + " .mlp-page," + P + " .mlp-term-cur," + Q + "{animation:none !important;}" + P + " *{transition:none !important;}}"
        ].join("\n");
    }
    function ensurePanelCss() {
        try {
            var s = document.getElementById(PANEL_CSS_ID);
            if (s) return;
            s = document.createElement("style"); s.id = PANEL_CSS_ID;
            s.textContent = panelCss();
            (document.head || document.documentElement).appendChild(s);
        } catch (e) {}
    }

    // ===================== src/ui/info.js =====================
    // ===== Пояснения к настройкам: тексты + всплывающий попап =====
    // INFO — русские тексты пояснений по ключам (op_*, fx_*, fxp_*, term_*, img_* и отдельные).
    // INFO_EN — их английские версии с ТЕМИ ЖЕ ключами (синхронность гарантирована ключом, а не
    // ручным повтором строки). infoDot(text) ставит невидимую метку пояснения, а перевод делает в одной точке
    // (infoText): в английском режиме подменяет русский текст на английский. Так переводятся и
    // подсказки контролов (из INFO), и подписи секций (литералы из panel.js — через общий словарь).

    var INFO = {
        perf_guard: "Авто-бюджет производительности: на слабой машине при устойчиво низком FPS часть тяжёлых эффектов (Aurora, пульс печати, лишние частицы) сама приглушается, а когда кадры восстанавливаются — возвращается. Оставь включённым для плавности; выключи, если хочешь всегда полный набор эффектов независимо от нагрузки.",
        accent: "Акцентный цвет всего интерфейса: курсор, скроллбар, активная вкладка, рамки, подсветки. У каждого набора свой — правка меняет только активный набор. Можно вписать HEX вручную или взять доминирующий цвет прямо из фоновой картинки кнопкой «из картинки».",
        accent_safe: "Палитра акцентов, различимых при основных типах дальтонизма (набор Окабэ-Ито) — клик по образцу задаёт акцент активного набора. Ниже — контраст акцента к тёмной подложке набора по WCAG: 4.5+ — уровень AA, 7+ — AAA, 3+ — годится для крупных элементов, меньше 3 (подсвечено красным) — акцент почти сливается с фоном, стоит взять светлее/насыщеннее.",
        set_name: "Имя активного набора — видно на кнопке BG, в подсказках и списках. Оставь поле пустым, чтобы вернуть исходное имя набора.",
        presets: "Сохранить ВЕСЬ текущий вид (набор, яркость, эффекты, терминал, акцент) под именем и потом переключаться между сохранёнными образами одним кликом. Это личные пресеты в браузере редактора — отдельно от файлов экспорта/импорта и от кода «Поделиться».",
        autoDim: "Если фоновая картинка редактора светлая, её яркость автоматически занижается, чтобы код оставался читаемым. Саму настройку «Яркость → Редактор» не меняет — просто подстраховка от засветки текста.",
        img_fit: "Как вписывать картинку в зону: «Заполнить» (cover) — обрезая по краям, без полей; «Целиком» (contain) — вся картинка, но могут остаться поля. Для портретных и «тушь на белом» обычно лучше «Целиком».",
        img_path: "Своя картинка для выбранной зоны активного набора вместо стандартной. Укажи путь вида file:///… (на Windows слэши прямые, буква диска строчная) или vscode-file://vscode-app/…. Пусто — вернётся картинка набора; текущий путь по умолчанию показан подсказкой в поле.",
        workspace_on: "Набор привязывается к открытому проекту (по имени папки в заголовке окна). Включи и выбери набор — он закрепится за этим проектом и вернётся при следующем открытии; в другом проекте закрепи свой. Приоритетнее слайдшоу и авто-набора по времени. Нужна открытая папка в VS Code.",
        ambient_branch: "Тонкая полоска у верхнего края окна показывает текущую git-ветку: на main/master — красноватая (ты на основной ветке — осторожнее с коммитами), на прочих — зеленоватая. Имя ветки читается из статусбара; без git-индикатора полоски нет.",
        auto_branch: "Набор привязывается к git-ветке: включи и выбери набор для текущей ветки — он вернётся, когда ты снова на ней. Удобно держать спокойный набор на main/master и яркий на фиче-ветках. Приоритетнее слайдшоу и времени суток, но уступает «фону по проекту». Имя ветки читается из статусбара; нужен git-репозиторий.",
        auto_lang: "Набор привязывается к языку активного файла (по расширению): выбери набор для текущего расширения — он включится, когда открыт файл этого типа. Например .py — один фон, .md — другой. Самый частый контекст, поэтому у него низший приоритет (уступает проекту и ветке). Расширение читается из подписи активной вкладки.",
        allow_remote: "Разрешить фоновые картинки по ссылкам http(s). По умолчанию ВЫКЛ ради безопасности: иначе импортированный или чужой конфиг мог бы заставить редактор молча сходить в сеть за картинкой (утечка IP, факт использования плагина, возможный трекер). Включай, только если сам задаёшь адрес и доверяешь ему.",
        share_code: "Компактный код всего образа (набор, яркость, эффекты, терминал, палитра) — без картинок и путей. «Скопировать» кладёт код в буфер, чтобы поделиться; вставь чужой код в поле и «Применить», чтобы примерить его вид. Твои картинки, пути и привязки к проектам при этом не затрагиваются.",
        theme_export: "Собрать из палитры активного набора настоящую тему VS Code (color-theme.json): согласованные цвета интерфейса + подсветку синтаксиса, выведенные из акцента. Файл скачивается и копируется в буфер. Зачем: тема работает и там, где кастомный фон недоступен — в vscode.dev, по SSH, в Codespaces — и находится через поиск тем. Как применить: (1) быстро — вставь блок \"colors\" в settings.json под \"workbench.colorCustomizations\", а \"tokenColors\" — под \"editor.tokenColorCustomizations\".textMateRules (применяется сразу, без упаковки); (2) как полноценную тему — положи файл в папку themes/ theme-расширения. У фото-наборов подложка тёмная, выведена из акцента (саму картинку в тему перенести нельзя).",
        img_base: "Папка, откуда берутся картинки наборов. Пригодится, если перенёс плагин, а фон пропал (плитки набора помечены «!»). Укажи путь к папке с assets в виде vscode-file://vscode-app/… или file:///… (завершающий слэш добавится сам). Пусто — путь определяется автоматически и показан подсказкой в поле.",
        autotime_from: "С какого часа (0–23) начинается «день» и включается дневной набор.",
        autotime_to: "До какого часа (0–23) длится «день». Если «до» меньше, чем «с», интервал считается через полночь (например, день 20→6 — ночной набор днём, дневной вечером).",
        autotime_mode: "Как определять день/ночь: «Часы» — по заданным ниже часам «с/до»; «Рассвет/закат» — по реальному восходу и закату солнца для указанных координат (считается локально, без сети). В режиме рассвета часы «с/до» не используются.",
        autotime_lat: "Широта места (−90…90) для расчёта рассвета/заката. Северное полушарие — положительная, южное — отрицательная. Достаточно приблизительного значения города.",
        autotime_lon: "Долгота места (−180…180) для расчёта рассвета/заката. Восток — положительная, запад — отрицательная. Достаточно приблизительного значения города.",
        img_zone: "Для какой зоны настраиваются фильтры ниже — у каждой свои значения. «Панель/терминал» — это фон нижней панели за терминалом.",
        img_brightness: "Яркость самой фоновой картинки зоны (код и интерфейс не трогает). Меньше 1 — темнее, больше — светлее.",
        img_saturate: "Насыщенность цветов фоновой картинки: 0 — чёрно-белая, 1 — как есть, 2 — сочно.",
        img_blur: "Размытие самой фоновой картинки, пиксели. Помогает коду читаться поверх пёстрого фона.",
        slide_on: "Автоматически менять набор по кругу через заданный интервал.",
        slide_min: "Через сколько минут переключать набор в режиме слайдшоу.",
        library: "Личная библиотека картинок: добавь свои локальные пути (file:/// или vscode-file://), и при включённом «Крутить библиотеку» они будут по очереди показываться в зоне редактора, сменяясь по таймеру слайдшоу (интервал — в секции «Слайдшоу»). Сайдбар, панель и акцент остаются от активного набора. Сетевые ссылки не грузятся, пока не включишь «Разрешить сетевые картинки».",
        screensaver: "Витрина при простое: если не трогать мышь и клавиатуру заданное число минут, поверх редактора плавно появляются крупные часы, дата и имя активного набора на тёмном акцентном фоне. Любое действие (движение мыши, клик, клавиша) сразу возвращает редактор; первая клавиша при этом гасится, чтобы не попасть в текст. Не показывается, когда окно свёрнуто.",
        screensaver_min: "Сколько минут без ввода до появления витрины.",
        autotime_on: "Переключать набор по времени суток: днём — дневной набор, ночью — ночной (границы дня задаются ниже). Не работает в режиме «случайно»; при включении отменяет слайдшоу.",
        sync: "Вид (набор, эффекты, акценты) сам переезжает на другие твои машины через встроенный Settings Sync VS Code — ничего копировать не нужно. Пути, папки и своя библиотека остаются свои на каждой машине. Нужны Moon Core и компаньон-расширение, а в VS Code — включённый Settings Sync.",
        img_look: "Готовый вид картинки для всех зон: «Мягко» — чуть размыта и спокойнее, «Чётко» — ярче и насыщеннее, «Приглушённо» — темнее и почти без цвета, код читается лучше всего. Тонкая настройка по зонам — в полном режиме.",
        hotkeys: "Горячие клавиши Ctrl+Alt+… (наборы, панель, режим чтения, отмена). Выключи, если ими не пользуешься: сочетания перестанут перехватываться (важно для раскладок с AltGr), а их подписи и справка исчезнут из панели. Всё то же доступно мышью: кнопки в шапке панели, колесо и правый клик по кнопке BG.",
        enabled: "Главный выключатель: убирает весь фон и эффекты (получается обычный VS Code), но все настройки сохраняются и вернутся при повторном включении. Горячая клавиша — Ctrl+Alt+0.",
        op_editor: "Насколько ярко фоновая картинка проступает за кодом редактора. Ниже — код читается легче, выше — фон заметнее.",
        op_side: "Насколько ярко проступает фон сайдбара (проводник, поиск и пр.).",
        op_panel: "Насколько ярко проступает фон нижней панели (терминал, проблемы, вывод).",
        fxp_blur: "Сила размытия «матового стекла» на вкладках, панелях и статусбаре. 0 — стекло прозрачное без размытия.",
        fxp_kbScale: "Насколько сильно приближается фон в анимации Ken Burns (медленный зум). Ближе к 1 — почти незаметно.",
        fxp_kbSpeed: "Длительность одного цикла Ken Burns в секундах. Больше — медленнее и спокойнее.",
        fxp_vignette: "Сила затемнения по краям редактора (виньетка). Собирает взгляд к центру.",
        fxp_partCount: "Сколько летящих частиц рисовать (когда эффект «Частицы» включён). 0 — частиц нет.",
        fxp_pomoMin: "Длительность одного помидора (рабочего интервала) в минутах.",
        fxp_auroraSpeed: "Длительность одного цикла дрейфа «Aurora» в секундах. Больше — спокойнее и медленнее.",
        fxp_spotRadius: "Радиус светлого «окна» спотлайта вокруг курсора, пиксели. Меньше — уже луч и сильнее затемнение по краям.",
        fxp_tintStrength: "Сила тонировки воркбенча акцентом (эффект «Тон акцентом»). 0 — нет, больше — насыщеннее.",
        fx_kenburns: "Медленный плавный зум фоновой картинки редактора — фон «дышит», а не стоит статично.",
        fx_glassTabs: "Полупрозрачный матовый фон полосы вкладок (эффект матового стекла).",
        fx_vignette: "Затемнение по краям области редактора, чтобы взгляд держался на коде.",
        fx_glassSide: "Матовое стекло для сайдбара и нижней панели.",
        fx_scrim: "Лёгкая тень-подложка под кодом для читаемости поверх пёстрого фона.",
        fx_glassStatus: "Матовое стекло для нижнего статусбара.",
        fx_activeLine: "Подсветка текущей строки кода акцентным цветом набора.",
        fx_groupRing: "Тонкий внутренний контур активной группы редакторов — видно, где фокус, при сплите на колонки.",
        fx_groupBorder: "Анимированная «живая» рамка вокруг активной группы (радужный перелив или один цвет — см. «Контур: 1 цвет»).",
        fx_scrollbar: "Ползунок скроллбара красится акцентным цветом набора.",
        fx_activityBg: "Фоновая картинка проступает и за вертикальным актив-баром слева.",
        fx_tabAccent: "Акцентная полоска-подчёркивание под активной вкладкой.",
        fx_rounded: "Скруглённые углы у меню, подсказок, палитры команд и тостов.",
        fx_cursorGlow: "Мягкое свечение вокруг текстового курсора в редакторе.",
        fx_selection: "Градиентная акцентная заливка выделенного текста вместо плоской.",
        fx_titlebar: "Градиентная акцентная подсветка заголовка окна.",
        fx_splash: "Картинка-заставка из набора в пустой группе редактора (когда не открыт ни один файл).",
        fx_clock: "Часы с датой и днём недели в статусбаре.",
        fx_particles: "Летящие частицы поверх интерфейса (форма — в списке «Стиль частиц», число — ползунком «Частиц»).",
        fx_pomodoro: "Таймер-помидор в статусбаре: клик — старт/пауза, Alt+клик — сброс. Длительность — ползунком «Помидор, мин».",
        fx_focusSession: "Пока идёт «Помидор», редактор уходит в фокус: неактивные группы и вкладки, миникарта и хлебные крошки гаснут, сайдбар/панель/актив-бар приглушаются (проявляются при наведении), активный редактор обведён мягким акцентом. На паузе, по сбросу и по завершении фокус плавно спадает. Нужен включённый и запущенный «Помидор».",
        fx_dimOnType: "Пока печатаешь, фон редактора плавно тускнеет для читаемости и возвращается через короткую паузу после последней клавиши.",
        fx_dimOnBlur: "Когда окно VS Code теряет фокус (перешёл в браузер или мессенджер), фон редактора плавно тускнеет, чтобы не отвлекать; при возврате — возвращается.",
        fx_groupBorderMono: "«Живой контур» одним акцентным цветом набора вместо радужного перелива. Действует, когда включён сам «Живой контур».",
        fx_paletteSync: "«Живой контур» перекрашивается в палитру, извлечённую из фоновой картинки редактора (два цвета-спутника к акценту). Для картиночных наборов; на градиентных берётся поворот оттенка акцента.",
        fx_parallax: "Фон редактора едва заметно смещается вслед за курсором мыши — появляется ощущение глубины. Гаснет при системной настройке «уменьшить движение».",
        fx_flow: "«Поток»: чем дольше печатаешь без пауз, тем сильнее гаснет фон редактора (глубже, чем «Тускнеть при печати»), а на паузе для чтения — возвращается. Помогает удержаться в потоке.",
        fx_dimInactive: "Неактивные группы редактора становятся тусклее, чтобы взгляд держался на активной. Удобно при сплите на несколько колонок.",
        fx_reading: "Режим чтения: фон редактора почти гаснет — код виден максимально чётко, а фон сайдбара и панели остаётся. Горячая клавиша — Ctrl+Alt+R.",
        fx_glassCommand: "Матовое стекло (размытие + подложка темы) для палитры команд, автодополнения и всплывающих подсказок, чтобы они не были глухо-непрозрачными поверх фона.",
        fx_findAccent: "Виджет поиска/замены и подсветка найденных совпадений красятся акцентным цветом набора.",
        fx_minimapFade: "Миникарта (обзор кода справа) становится полупрозрачной, и сквозь неё просвечивает фон. Выключи, если по ней трудно ориентироваться.",
        fx_indentAccent: "Активная направляющая отступа и парная скобка подсвечиваются акцентным цветом набора — легче видеть вложенность.",
        fx_selectionMatch: "Все вхождения выделенного слова подсвечиваются лёгкой акцентной заливкой с контуром — видно, где ещё встречается имя.",
        fx_stickyGlass: "Матовое стекло для закреплённой прокрутки (sticky scroll — приклеенные сверху заголовки функций и классов), чтобы они читались поверх фона.",
        fx_aurora: "«Полярное сияние»: за кодом медленно дрейфует размытый градиент из палитры набора (акцент и два спутника). Лежит под текстом — читаемости не мешает. Скорость — ползунком «Aurora сек». Гаснет при системной настройке «уменьшить движение».",
        fx_spotlight: "Экран мягко затемняется по краям, а вокруг курсора остаётся светлое «окно» — взгляд держится на месте правки. Радиус — ползунком «Спот радиус». Следует за мышью.",
        fx_typingPulse: "Пока печатаешь, активная вкладка мягко пульсирует акцентным свечением; на паузе — затихает. Гаснет при системной настройке «уменьшить движение».",
        fx_tint: "Полупрозрачная тонировка всего воркбенча в цвет акцента (режим наложения overlay — как светофильтр). Сила — ползунком «Тон сила». Клики проходят сквозь неё.",
        fx_legible: "Мягкая тень под глифами кода, чтобы текст читался поверх яркой картинки. Ширину символов не меняет (метрики Monaco не трогаются), поэтому курсор и выделение не сдвигаются.",
        fx_errorReact: "Когда в коде есть ошибки (счётчик у иконки ошибок в статусбаре больше нуля), статусбар мягко подсвечивается красным. Счётчик читается из DOM статусбара — как и индикатор git-ветки.",
        fx_present: "Режим для стрима, скринкаста и записи курса: прячет визуальный шум (хлебные крошки, миникарту, экшены редактора — проявляются при наведении) и КРУПНЕЕ подаёт акценты (толще подчёркивание вкладки, ярче индикатор актив-бара и активная строка). Только оформление — ничего не двигает.",
        fx_highContrast: "Доступность: плотная тень под кодом и подписями сайдбара/панели ради читаемости поверх яркого фона (метрики Monaco не трогаются) и толще обводка фокуса для навигации с клавиатуры. Дополняет системные «уменьшить движение» и «уменьшить прозрачность», которые плагин учитывает сам.",
        fx_liveBg: "«Живой фон»: у градиентных и процедурных наборов фон медленно панорамируется — картина «дышит», а не стоит статично. Для фото-наборов есть отдельный Ken Burns. Гаснет при системной «уменьшить движение» и в эконом-режиме FPS.",
        fx_uiAnim: "Анимации интерфейса: мягкое появление палитры команд, автодополнения и подсказок, плавные переходы вкладок и строк списков, выезд уведомлений. Только оформление; появления гаснут при системной «уменьшить движение».",
        fx_acrylic: "Акрил: усиленное «матовое стекло» на весь воркбенч (сайдбар, панель, актив-бар, статусбар, титлбар, вкладки) — эстетика Acrylic/Mica одним тумблером, поверх точечных «стекло …». Это внутриредакторный морозный вид: настоящую прозрачность ДО рабочего стола custom-css дать не может — для неё нужно отдельное расширение прозрачности окна (например vscode-vibrancy-continued). Учитывает системную «уменьшить прозрачность».",
        auto_remote: "Фон под удалённый репозиторий: ключом служит «владелец/имя» из git-remote, поэтому один и тот же проект, склонированный в две разные папки, откроется с одним фоном — в отличие от привязки «по проекту», которая смотрит на имя папки. Приоритет: проект > репозиторий > ветка > язык файла. Требует компаньон-расширение: адрес репозитория есть только в git API, из вёрстки редактора его не прочитать.",
        fx_autoRead: "Адаптивный скрим: фон гасится не целиком ползунком, а ТОЧЕЧНО — в тех местах кадра, где он светлее комфортного порога. Плагин один раз измеряет картинку сеткой 8x8 и подмешивает поверх неё несколько мягких тёмных пятен, поэтому яркое окно или фонарь за кодом перестают мешать, а остальная картина остаётся видимой. Стоит ноль кадров (это обычные CSS-градиенты) и работает вместе с авто-яркостью.",
        fx_trueGlass: "Настоящая прозрачность: сквозь редактор виден рабочий стол, а система подмешивает свой материал (Mica на Windows 11, vibrancy на macOS). В отличие от «Акрила», это не размытие своей же картинки внутри окна. Требует, чтобы окно было СОЗДАНО прозрачным: загрузчик Custom UI Style с опциями Electron (Система → Загрузчик → «Скопировать опции прозрачности», затем полный перезапуск). Если окно обычное, тумблер даёт просто усиленное стекло и ничего не ломает.",
        fx_cursorTrail: "Шлейф курсора: за указателем мыши тянется короткий тающий след акцентного цвета. Рисуется на canvas поверх интерфейса, клики проходят сквозь. Гаснет при системной «уменьшить движение» и в эконом-режиме FPS.",
        fx_pet: "Питомец-компаньон: маленький кот в правом нижнем углу над статусбаром. Следит глазами за курсором, моргает и водит хвостом; оживляется при печати, настораживается при ошибках в коде и дремлет («z-z-z») после минуты без активности. Рисуется на canvas из акцента набора, клики проходят сквозь. При системной «уменьшить движение» сидит неподвижно.",
        fx_stats: "Статистика сессии в статусбаре: время в сессии, число тронутых файлов и нажатий. Полная сводка (плюс «время в потоке» и лучший стрик непрерывной печати) — в «Данные → Статистика». Данные живут только в этой сессии (не сохраняются на диск) и никуда не отправляются.",
        part_style: "Форма летящих частиц: точки, звёзды-искры, снег, лепестки сакуры, контуры-пузыри, светлячки (пульсируют яркостью), дождь (струи) или конфетти (цветные прямоугольники). Снег, сакура, дождь и конфетти падают сверху вниз, остальные всплывают снизу вверх. «Сезон (авто)» сам выбирает форму по времени года: зима — снег, весна — сакура, лето — светлячки, осень — дождь.",
        term_font: "Шрифт терминала. В списке — совместимые по ширине Nerd-шрифты, чтобы не разъезжались колонки и сохранялись иконки oh-my-posh / powerline.",
        term_ligatures: "Слитное начертание пар символов: ->, =>, != и подобных.",
        term_cursorGlow: "Ореол-свечение вокруг курсора терминала.",
        term_glow: "Сила тени под текстом терминала для читаемости поверх фоновой картинки.",
        term_weight: "Толщина шрифта терминала. Жирный текст остаётся заметно жирнее базового.",
        term_cursorColor: "Цвет курсора терминала.",
        term_selColor: "Цвет выделения текста в терминале.",
        term_cursorSize: "Ширина курсора терминала: 0 — скрыть, 1 — обычная, больше — шире. Заметнее всего на курсоре-линии (cursorStyle: line).",
        term_cursorHeight: "Высота курсора терминала: 1 — обычная, меньше — короче, больше — выше ячейки."
    };

    // Английские версии подсказок — ТЕ ЖЕ ключи, что в INFO. Сопоставление RU->EN строится по
    // ключу (см. _infoEN ниже), поэтому русские строки нигде не дублируются вручную и не рискуют
    // разойтись. Ключа нет в INFO_EN -> в английском режиме останется русский текст (не сломается).
    var INFO_EN = {
        perf_guard: "Auto performance budget: on a weak machine, when the FPS stays low, some heavy effects (Aurora, typing pulse, extra particles) dim themselves, and return once frames recover. Leave it on for smoothness; turn it off if you always want the full set of effects regardless of load.",
        accent: "Accent color for the whole interface: cursor, scrollbar, active tab, borders, highlights. Each set has its own — editing changes only the active set. Type a HEX value, or pull the dominant color straight from the background image with “from image”.",
        accent_safe: "A palette of accents distinguishable under the main types of color blindness (the Okabe-Ito set) — click a swatch to set the active set’s accent. Below is the accent’s WCAG contrast against the set’s dark backdrop: 4.5+ is AA, 7+ is AAA, 3+ is fine for large elements, under 3 (shown in red) means the accent nearly blends into the background — pick a lighter/more saturated one.",
        set_name: "Name of the active set — shown on the BG button, in tooltips and lists. Leave the field empty to restore the set’s original name.",
        presets: "Save the WHOLE current look (set, brightness, effects, terminal, accent) under a name, then switch between saved looks with one click. These are personal presets in the editor’s browser storage — separate from export/import files and from the “Share” code.",
        autoDim: "If the editor’s background image is light, its brightness is lowered automatically so code stays readable. It doesn’t change the “Brightness → Editor” setting itself — just a safeguard against washed-out text.",
        img_fit: "How the image fills the zone: “Fill” (cover) — cropped at the edges, no gaps; “Contain” — the whole image, but there may be margins. For portrait or “ink on white” art, “Contain” usually looks better.",
        img_path: "Your own image for the selected zone of the active set instead of the default. Use a path like file:///… (on Windows forward slashes, lowercase drive letter) or vscode-file://vscode-app/…. Empty — the set’s image returns; the current default path is shown as the field’s placeholder.",
        workspace_on: "The set is tied to the open project (by the folder name in the window title). Turn it on and pick a set — it gets pinned to this project and comes back next time; pin a different one in another project. Takes priority over the slideshow and time-of-day auto-set. Requires an open folder in VS Code.",
        ambient_branch: "A thin strip at the top edge of the window shows the current git branch: reddish on main/master (you’re on the main branch — commit with care), greenish otherwise. The branch name is read from the status bar; with no git indicator there’s no strip.",
        auto_branch: "The set is tied to the git branch: turn it on and pick a set for the current branch — it returns whenever you are on it. Handy to keep a calm set on main/master and a vivid one on feature branches. Takes priority over the slideshow and time of day, but yields to “background by project”. The branch is read from the status bar; requires a git repository.",
        auto_lang: "The set is tied to the active file’s language (by extension): pick a set for the current extension — it turns on whenever a file of that type is open. E.g. .py — one background, .md — another. It’s the most frequent context, so it has the lowest priority (yields to project and branch). The extension is read from the active tab label.",
        allow_remote: "Allow background images from http(s) links. OFF by default for safety: otherwise an imported or someone else’s config could make the editor silently fetch an image over the network (IP leak, the fact that you use the plugin, a possible tracker). Enable it only if you set the address yourself and trust it.",
        share_code: "A compact code of the whole look (set, brightness, effects, terminal, palette) — without images or paths. “Copy” puts the code on the clipboard to share; paste someone’s code into the field and “Apply” to try their look. Your images, paths and project pins are left untouched.",
        theme_export: "Build a real VS Code theme (color-theme.json) from the active set’s palette: coherent workbench colors + syntax highlighting derived from the accent. The file is downloaded and copied to the clipboard. Why: a theme works even where the custom background can’t — vscode.dev, over SSH, in Codespaces — and is found through theme search. How to apply: (1) quick — paste the \"colors\" block into settings.json under \"workbench.colorCustomizations\", and \"tokenColors\" under \"editor.tokenColorCustomizations\".textMateRules (applies instantly, no packaging); (2) as a full theme — drop the file into your theme extension’s themes/ folder. Photo sets get a dark backdrop derived from the accent (the image itself can’t be carried into a theme).",
        img_base: "The folder the set images are read from. Useful if you moved the plugin and the background vanished (set tiles marked with “!”). Point it at the folder that contains assets, as vscode-file://vscode-app/… or file:///… (a trailing slash is added automatically). Empty — the path is detected automatically and shown as the field’s placeholder.",
        autotime_from: "From which hour (0–23) “day” begins and the day set turns on.",
        autotime_to: "Until which hour (0–23) “day” lasts. If “to” is less than “from”, the interval wraps past midnight (e.g. day 20→6 — night set by day, day set in the evening).",
        autotime_mode: "How day/night is decided: “Hours” — by the from/to hours below; “Sunrise/sunset” — by the real sunrise and sunset for the given coordinates (computed locally, no network). In sunrise mode the from/to hours are not used.",
        autotime_lat: "Latitude of your location (−90…90) for the sunrise/sunset calculation. Northern hemisphere positive, southern negative. An approximate city value is enough.",
        autotime_lon: "Longitude of your location (−180…180) for the sunrise/sunset calculation. East positive, west negative. An approximate city value is enough.",
        img_zone: "Which zone the filters below apply to — each zone has its own values. “Panel/terminal” is the background of the bottom panel behind the terminal.",
        img_brightness: "Brightness of the zone’s background image itself (leaves code and UI alone). Below 1 — darker, above — lighter.",
        img_saturate: "Color saturation of the background image: 0 — black-and-white, 1 — as is, 2 — vivid.",
        img_blur: "Blur of the background image itself, pixels. Helps code read over a busy background.",
        slide_on: "Automatically cycle through sets on the given interval.",
        slide_min: "How many minutes between set switches in slideshow mode.",
        library: "A personal image library: add your own local paths (file:/// or vscode-file://) and, with “Cycle the library” on, they show one by one in the editor zone, switching on the slideshow timer (interval in the “Slideshow” section). The sidebar, panel and accent stay from the active set. Remote links won’t load until you enable “Allow remote images”.",
        screensaver: "Idle showcase: if you don’t touch the mouse or keyboard for the set number of minutes, a large clock, date and the active set name fade in over the editor on a dark accent background. Any action (mouse move, click, key) brings the editor back at once; the first key is swallowed so it won’t land in your text. Not shown while the window is minimized.",
        screensaver_min: "How many minutes without input before the showcase appears.",
        autotime_on: "Switch the set by time of day: the day set by day, the night set by night (day bounds set below). Doesn’t run in “random” mode; turning it on cancels the slideshow.",
        sync: "Your look (set, effects, accents) moves to your other machines by itself via the built-in VS Code Settings Sync — nothing to copy. Paths, folders and your own library stay per machine. Needs Moon Core and the companion extension, and Settings Sync turned on in VS Code.",
        img_look: "A ready-made picture look for all zones: “Soft” — slightly blurred and calmer, “Crisp” — brighter and more saturated, “Muted” — darker and nearly colorless, the best for reading code. Per-zone fine-tuning is in the full mode.",
        hotkeys: "Ctrl+Alt+… hotkeys (sets, panel, reading mode, undo). Turn off if you don't use them: the combos stop being intercepted (matters for AltGr layouts), and their hints and reference disappear from the panel. Everything stays reachable by mouse: panel header buttons, scroll and right-click on the BG button.",
        enabled: "Master switch: removes all background and effects (plain VS Code), but every setting is kept and returns when you switch it back on. Hotkey — Ctrl+Alt+0.",
        op_editor: "How brightly the background image shows through behind editor code. Lower — code reads easier, higher — the background is more visible.",
        op_side: "How brightly the sidebar background shows through (explorer, search, etc.).",
        op_panel: "How brightly the bottom panel background shows through (terminal, problems, output).",
        fxp_blur: "Blur strength of the “frosted glass” on tabs, panels and the status bar. 0 — glass is clear, no blur.",
        fxp_kbScale: "How far the background zooms in the Ken Burns animation (slow zoom). Near 1 — barely noticeable.",
        fxp_kbSpeed: "Length of one Ken Burns cycle in seconds. Larger — slower and calmer.",
        fxp_vignette: "Strength of the edge darkening of the editor (vignette). Draws the eye toward the center.",
        fxp_partCount: "How many flying particles to draw (when the “Particles” effect is on). 0 — no particles.",
        fxp_pomoMin: "Length of one pomodoro (work interval) in minutes.",
        fxp_auroraSpeed: "Length of one Aurora drift cycle in seconds. Larger — calmer and slower.",
        fxp_spotRadius: "Radius of the spotlight’s bright “window” around the cursor, pixels. Smaller — a tighter beam and stronger edge darkening.",
        fxp_tintStrength: "Strength of the accent tint over the workbench (the “Accent tint” effect). 0 — none, higher — richer.",
        fx_kenburns: "A slow, smooth zoom of the editor background image — the background “breathes” instead of sitting still.",
        fx_glassTabs: "Semi-transparent frosted background for the tab bar (frosted-glass effect).",
        fx_vignette: "Edge darkening of the editor area to keep the eye on the code.",
        fx_glassSide: "Frosted glass for the sidebar and the bottom panel.",
        fx_scrim: "A soft shadow scrim under the code for readability over a busy background.",
        fx_glassStatus: "Frosted glass for the bottom status bar.",
        fx_activeLine: "Highlights the current line of code with the set’s accent color.",
        fx_groupRing: "A thin inner outline of the active editor group — shows where focus is when you split into columns.",
        fx_groupBorder: "An animated “living” border around the active group (rainbow shift or a single color — see “Border: 1 color”).",
        fx_scrollbar: "The scrollbar thumb is tinted with the set’s accent color.",
        fx_activityBg: "The background image also shows through behind the vertical activity bar on the left.",
        fx_tabAccent: "An accent underline strip beneath the active tab.",
        fx_rounded: "Rounded corners on menus, tooltips, the command palette and toasts.",
        fx_cursorGlow: "A soft glow around the text cursor in the editor.",
        fx_selection: "A gradient accent fill for selected text instead of a flat one.",
        fx_titlebar: "A gradient accent highlight on the window title bar.",
        fx_splash: "A splash image from the set in an empty editor group (when no file is open).",
        fx_clock: "A clock with date and weekday in the status bar.",
        fx_particles: "Flying particles over the interface (shape in the “Particle style” list, count via the “Particle count” slider).",
        fx_pomodoro: "A pomodoro timer in the status bar: click — start/pause, Alt+click — reset. Length via the “Pomodoro, min” slider.",
        fx_focusSession: "While the pomodoro runs, the editor goes into focus: inactive groups and tabs, the minimap and breadcrumbs fade, the sidebar/panel/activity bar dim (revealed on hover), and the active editor gets a soft accent outline. On pause, reset and completion the focus fades away. Requires the pomodoro to be enabled and running.",
        fx_dimOnType: "While you type, the editor background gently dims for readability and returns after a short pause following the last keystroke.",
        fx_dimOnBlur: "When the VS Code window loses focus (you switched to a browser or messenger), the editor background gently dims so it won’t distract; it returns when focus comes back.",
        fx_groupBorderMono: "The “Living border” in a single accent color of the set instead of the rainbow shift. Active when the “Living border” itself is on.",
        fx_paletteSync: "The “Living border” is recolored from the palette extracted from the editor background image (two companion colors to the accent). For photo sets; gradient sets use an accent hue rotation.",
        fx_parallax: "The editor background shifts ever so slightly with the mouse cursor, adding a sense of depth. Disabled by the system “reduce motion” setting.",
        fx_flow: "“Flow”: the longer you type without pauses, the more the editor background dims (deeper than “Dim while typing”), returning on a reading pause. Helps you stay in the flow.",
        fx_dimInactive: "Inactive editor groups get dimmer so the eye stays on the active one. Handy when split into several columns.",
        fx_reading: "Reading mode: the editor background nearly fades out — code is as crisp as possible, while the sidebar and panel backgrounds stay. Hotkey — Ctrl+Alt+R.",
        fx_glassCommand: "Frosted glass (blur + theme backdrop) for the command palette, autocomplete and hover tooltips, so they aren’t flatly opaque over the background.",
        fx_findAccent: "The find/replace widget and matched-result highlights are tinted with the set’s accent color.",
        fx_minimapFade: "The minimap (code overview on the right) becomes semi-transparent and the background shows through it. Turn it off if it’s hard to navigate.",
        fx_indentAccent: "The active indent guide and the matching bracket are highlighted with the set’s accent color — nesting is easier to see.",
        fx_selectionMatch: "Every occurrence of the selected word is highlighted with a light accent fill and outline — you can see where the name recurs.",
        fx_stickyGlass: "Frosted glass for sticky scroll (the function/class headers pinned at the top) so they read over the background.",
        fx_aurora: "“Aurora”: a blurred gradient from the set’s palette (the accent and two companions) drifts slowly behind the code. It sits under the text — no harm to readability. Speed via the “Aurora sec” slider. Disabled by the system “reduce motion” setting.",
        fx_spotlight: "The screen softly darkens at the edges while a bright “window” stays around the cursor — the eye stays on the edit spot. Radius via the “Spotlight radius” slider. Follows the mouse.",
        fx_typingPulse: "While you type, the active tab gently pulses with an accent glow; on a pause it settles. Disabled by the system “reduce motion” setting.",
        fx_tint: "A semi-transparent tint of the whole workbench in the accent color (overlay blend — like a color filter). Strength via the “Tint strength” slider. Clicks pass through it.",
        fx_legible: "A soft shadow under code glyphs so text reads over a bright image. It doesn’t change glyph width (Monaco metrics untouched), so the cursor and selection don’t shift.",
        fx_errorReact: "When the code has errors (the count by the status-bar error icon is above zero), the status bar softly glows red. The count is read from the status-bar DOM — like the git-branch indicator.",
        fx_present: "A mode for streaming, screencasts and course recording: it hides visual noise (breadcrumbs, minimap, editor actions — revealed on hover) and presents accents LARGER (a thicker tab underline, a brighter activity-bar indicator and active line). Styling only — nothing is moved.",
        fx_highContrast: "Accessibility: a dense shadow under code and sidebar/panel labels for readability over a bright background (Monaco metrics untouched) and a thicker focus outline for keyboard navigation. Complements the system “reduce motion” and “reduce transparency”, which the plugin honors on its own.",
        auto_remote: "Background per remote repository: the key is “owner/name” from the git remote, so the same project cloned into two different folders opens with the same background — unlike the per-project binding, which looks at the folder name. Priority: project > repository > branch > file language. Requires the companion extension: the remote address exists only in the git API and cannot be read from the editor markup.",
        fx_autoRead: "Adaptive scrim: instead of dimming the whole image with one slider, the background is dimmed EXACTLY where it is brighter than comfortable. The image is measured once on an 8x8 luminance grid, and a few soft dark spots are blended on top of it — a bright window or a lantern behind your code stops interfering while the rest of the picture stays visible. Costs no frames (plain CSS gradients) and works together with auto-brightness.",
        fx_trueGlass: "True transparency: the desktop shows through the editor and the OS blends in its own material (Mica on Windows 11, vibrancy on macOS). Unlike “Acrylic”, this is not a blur of our own image inside the window. It requires the window to be CREATED transparent: the Custom UI Style loader with Electron options (System → Loader → “Copy transparency options”, then a full restart). If the window is opaque, the switch simply gives stronger glass and breaks nothing.",
        fx_liveBg: "“Living background”: for gradient and procedural sets the background slowly pans — the scene “breathes” instead of sitting still. Photo sets have a separate Ken Burns. Disabled by the system “reduce motion” and in the FPS power-saving mode.",
        fx_uiAnim: "Interface animations: a soft appearance of the command palette, autocomplete and tooltips, smooth transitions of tabs and list rows, notification slide-in. Styling only; the appearances are disabled by the system “reduce motion”.",
        fx_acrylic: "Acrylic: strong “frosted glass” across the whole workbench (sidebar, panel, activity bar, status bar, title bar, tabs) — the Acrylic/Mica aesthetic in one switch, on top of the per-surface “Glass …” effects. This is an in-editor frosted look: custom-css cannot make the window truly see-through to the desktop — that needs a separate window-transparency extension (e.g. vscode-vibrancy-continued). Honors the system “reduce transparency”.",
        fx_cursorTrail: "Cursor trail: a short fading trail in the accent color follows the mouse pointer. Drawn on a canvas above the interface; clicks pass through. Disabled by the system “reduce motion” and in the FPS power-saving mode.",
        fx_pet: "A companion pet: a small cat in the bottom-right corner above the status bar. Its eyes follow the cursor; it blinks and sways its tail, perks up while you type, looks alert when the code has errors, and dozes off (“z-z-z”) after a minute of inactivity. Drawn on a canvas from the set’s accent; clicks pass through. With the system “reduce motion” it sits still.",
        fx_stats: "Session stats in the status bar: session time, number of files touched and keystrokes. The full summary (plus “time in flow” and the best continuous-typing streak) is in “Data → Stats”. The data lives only in this session (not saved to disk) and is sent nowhere.",
        part_style: "Shape of the flying particles: dots, spark-stars, snow, sakura petals, outline bubbles, fireflies (pulsing brightness), rain (streaks) or confetti (colored rectangles). Snow, sakura, rain and confetti fall top-down, the rest float bottom-up. “Season (auto)” picks the shape by season: winter — snow, spring — sakura, summer — fireflies, autumn — rain.",
        term_font: "Terminal font. The list holds width-compatible Nerd fonts so columns don’t drift and oh-my-posh / powerline icons stay intact.",
        term_ligatures: "Joined rendering of character pairs: ->, =>, != and the like.",
        term_cursorGlow: "A halo glow around the terminal cursor.",
        term_glow: "Strength of the shadow under terminal text for readability over the background image.",
        term_weight: "Terminal font weight. Bold text stays noticeably heavier than the base.",
        term_cursorColor: "Terminal cursor color.",
        term_selColor: "Color of selected text in the terminal.",
        term_cursorSize: "Terminal cursor width: 0 — hide, 1 — normal, higher — wider. Most visible on the line cursor (cursorStyle: line).",
        term_cursorHeight: "Terminal cursor height: 1 — normal, less — shorter, more — taller than the cell."
    };

    // Обратная карта «русский текст подсказки -> английский». Строится по общим ключам INFO/INFO_EN,
    // поэтому русскую строку не приходится писать дважды и рассинхрон невозможен. Ключа нет в
    // INFO_EN -> перевода нет -> останется русский текст.
    var _infoEN = (function () {
        var m = {};
        for (var k in INFO) { if (INFO.hasOwnProperty(k) && typeof INFO_EN[k] === "string") m[INFO[k]] = INFO_EN[k]; }
        return m;
    })();
    // Перевод текста подсказки под язык панели. Английский: сначала карта подсказок контролов
    // (_infoEN), затем общий словарь t() (для подписей секций — литералы из panel.js). Русский —
    // строка как есть.
    function infoText(s) {
        if (uiLang() !== "en") return s;
        if (_infoEN[s]) return _infoEN[s];
        return t(s);
    }

    // ===== Всплывающая подсказка «?» =====
    var _infoPop = null, _infoAnchor = null;
    function hideInfo() {
        if (_infoPop) { _infoPop.remove(); _infoPop = null; _infoAnchor = null; document.removeEventListener("mousedown", _infoOutside, true); }
    }
    function _infoOutside(e) { if (_infoPop && e.target !== _infoAnchor && !_infoPop.contains(e.target)) hideInfo(); }
    function showInfo(anchor, text) {
        if (_infoAnchor === anchor) { hideInfo(); return; } // повторный клик — закрыть
        hideInfo();
        // Тема: подсказка живёт на body (вне панели с её --mlp-*), поэтому цвета подложки/текста
        // выбираем сами под светлую/тёмную тему. Акцент берём из :root (--mlbg-accent* глобальны).
        var light = false; try { light = isLightTheme(); } catch (e) {}
        var bg = light ? "rgba(248,248,251,0.95)" : "rgba(24,24,37,0.93)";
        var fg = light ? "#1e1e2e" : "#cdd6f4";
        var brd = "rgba(var(--mlbg-accent-rgb),0.4)";
        // «Уменьшить движение» — показываем сразу, без выезда/масштаба.
        var reduce = false; try { reduce = (typeof reduceMotion === "function") ? reduceMotion() : false; } catch (e) {}
        var pop = el("div",
            "position:fixed; z-index:100003; max-width:272px; padding:10px 13px 10px 14px; border-radius:11px;" +
            "background:" + bg + "; color:" + fg + "; font-size:11.5px; line-height:1.5; letter-spacing:0.1px;" +
            "font-family:var(--vscode-font-family, sans-serif);" +
            "border:1px solid " + brd + "; border-left:3px solid var(--mlbg-accent);" +
            "box-shadow:0 12px 34px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.28);" +
            "backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); opacity:0;", text);
        document.body.appendChild(pop);
        // Размеры берём через offset* (не зависят от transform, в отличие от getBoundingClientRect),
        // чтобы стартовый масштаб анимации не искажал позиционирование.
        var r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
        var left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
        var below = true, top = r.bottom + 9;                       // по умолчанию — под кнопкой «?»
        if (top + ph > window.innerHeight - 8) { top = r.top - ph - 9; below = false; } // не влезло — над ней
        top = Math.max(8, top);
        pop.style.left = left + "px";
        pop.style.top = top + "px";
        pop.style.transformOrigin = below ? "top left" : "bottom left";
        // Стрелка-указатель к «?»: маленький повёрнутый квадрат у нужного края, с акцентными
        // сторонами, обращёнными наружу. Горизонтально — под центром кнопки (в пределах попапа).
        var arrow = el("div",
            "position:absolute; width:11px; height:11px; background:" + bg + "; transform:rotate(45deg);" +
            (below ? "top:-6px; border-left:1px solid " + brd + "; border-top:1px solid " + brd + ";"
                   : "bottom:-6px; border-right:1px solid " + brd + "; border-bottom:1px solid " + brd + ";"));
        var ax = (r.left + r.width / 2) - left - 5.5;               // центр «?» в координатах попапа
        arrow.style.left = Math.max(12, Math.min(pw - 23, ax)) + "px";
        pop.appendChild(arrow);
        // Появление: мягкий выезд «от кнопки» + лёгкий масштаб. Двойной rAF — чтобы браузер успел
        // отрисовать стартовое состояние до перехода (иначе анимации не будет).
        if (reduce) {
            pop.style.opacity = "1";
        } else {
            pop.style.transform = "translateY(" + (below ? "-5px" : "5px") + ") scale(0.97)";
            pop.style.transition = "opacity 0.14s ease, transform 0.17s cubic-bezier(0.2,0.85,0.25,1)";
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    try { pop.style.opacity = "1"; pop.style.transform = "translateY(0) scale(1)"; } catch (e) {}
                });
            });
        }
        _infoPop = pop; _infoAnchor = anchor;
        setTimeout(function () { document.addEventListener("mousedown", _infoOutside, true); }, 0);
    }
    // Пояснение к настройке. Раньше это был кружок «?» у каждой строки — десятки значков в панели.
    // Теперь — невидимая метка: пояснение всплывает при наведении на саму строку (с короткой
    // задержкой) или при фокусе с клавиатуры. Подключает wireInfoHovers, когда панель собрана.
    // null, если текста нет (тогда вызывающий ничего не добавляет).
    function infoDot(text) {
        if (!text) return null;
        var d = el("span", "display:none;");
        d.className = "mlp-i";
        d._info = infoText(text); // перевод подписи — в одной точке (infoText)
        return d;
    }
    // Доступность: у поля без подписи (цвет, имя набора, seed, код образа) скринридер слышал
    // только «поле ввода». Даём имя из подписи строки (первый span) или из placeholder.
    function labelInputs(root) {
        var list = root.querySelectorAll ? root.querySelectorAll("input, select, textarea") : [];
        for (var i = 0; i < list.length; i++) {
            var n = list[i];
            if (n.getAttribute("aria-label") || (n.closest && n.closest("label"))) continue;
            var row = n.parentNode, lab = row && row.querySelector ? row.querySelector("span") : null;
            var name = (lab && lab.textContent || "").trim() || n.getAttribute("placeholder") || "";
            if (n.type === "color" && name) name += " — " + t("цвет");
            if (name) n.setAttribute("aria-label", name);
        }
    }
    // Навесить всплывающие пояснения на строки с меткой .mlp-i внутри root.
    function wireInfoHovers(root) {
        var marks = root.querySelectorAll ? root.querySelectorAll(".mlp-i") : [];
        for (var i = 0; i < marks.length; i++) (function (m) {
            var host = m.parentNode; if (!host || host._infoWired) return;
            host._infoWired = true;
            host.classList.add("mlp-has-i");
            var timer = 0;
            function show() { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = 0; if (_infoAnchor !== host) showInfo(host, m._info); }, 650); }
            function hide() { if (timer) { clearTimeout(timer); timer = 0; } if (_infoAnchor === host) hideInfo(); }
            host.addEventListener("mouseenter", show);
            host.addEventListener("mouseleave", hide);
            host.addEventListener("focusin", show);
            host.addEventListener("focusout", hide);
            try { host.setAttribute("aria-description", m._info); } catch (e) {}
        })(marks[i]);
    }

    // ===================== src/ui/controls.js =====================


    // ===== Построители контролов панели =====
    // Каждая функция make* возвращает готовый DOM-контрол (слайдер / чекбокс / селект / чип),
    // привязанный к соответствующему полю cfg. Изменения применяются через apply / applyThrottled
    // (мгновенно/троттлингом) или applyFade (со сменой набора). Тексты подсказок берутся из INFO.

    // ===== Базовые фабрики контролов =====
    // Тумблеры и слайдеры панели различались только источником cfg и колбэком, а разметка/
    // стиль/hover/«?» повторялись в каждом. Свели к двум фабрикам: makeToggle и makeSlider.

    // Строка-тумблер: hover-подсветка + чекбокс + подпись + пояснение (всплывает при наведении).
    // get() -> текущее булево; onChange(checked) -> применить изменение.
    function makeToggle(get, onChange, label, info) {
        var row = el("label", ST.toggleRow);
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.12)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
        var cb = el("input", ST.checkbox); cb.type = "checkbox"; cb.checked = !!get();
        cb.addEventListener("change", function () { onChange(cb.checked); });
        row.appendChild(cb);
        row.appendChild(el("span", ST.fill, t(label)));
        var d = infoDot(info); if (d) row.appendChild(d);
        return row;
    }

    // Слайдер: метка + ползунок + значение + пояснение. opts:
    //   label, min, max, step, dec (знаков после запятой), get()->число, onInput(v)->записать,
    //   info, labelW (ширина метки, 92), valW (ширина значения, 34), ellipsis (обрезать метку, true),
    //   def (значение по умолчанию для сброса двойным кликом; число ИЛИ функция ()->число для
    //   контролов, чья зона/цель меняется, напр. фильтры картинки по зонам — см. makeImgFilters).
    // Все слайдеры пишут значение и зовут applyThrottled (коалесинг в один apply за кадр).
    // На возвращённом узле есть _refresh() — пересинхронизировать ползунок/значение с cfg
    // (нужно, когда один набор слайдеров переключается между зонами, см. makeImgFilters).
    function makeSlider(opts) {
        var labelW = opts.labelW || 92, valW = opts.valW || 34, ell = opts.ellipsis !== false;
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(labelW, ell), t(opts.label)));
        var sl = el("input", ST.range);
        sl.type = "range"; sl.min = String(opts.min); sl.max = String(opts.max); sl.step = String(opts.step); sl.value = String(opts.get());
        var val = el("span", "flex:0 0 " + valW + "px; text-align:right; color:var(--mlp-muted,#a6adc8);", Number(opts.get()).toFixed(opts.dec));
        // «Изменено» + встроенный сброс. Когда текущее значение отличается от
        // дефолта (def), значение красится акцентом, а справа появляется кнопка «⟲» — клик по ней
        // сбрасывает к дефолту (видимая и доступная альтернатива двойному клику по ползунку). Так
        // сразу видно, какие контролы ты трогал, и любой из них откатывается одним кликом. def может
        // быть функцией — для слайдеров с зонозависимым дефолтом (фильтры картинки по зонам).
        function defVal() { return (typeof opts.def === "function") ? opts.def() : opts.def; }
        var reset = null;
        if (opts.def != null) {
            reset = el("span", "flex:0 0 auto; width:15px; height:15px; line-height:14px; text-align:center; border-radius:50%; font-size:11px; cursor:pointer; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.4);", "↺");
            reset.title = t("Сбросить к значению по умолчанию");
            keyActivate(reset, t("Сбросить к значению по умолчанию"));
        }
        // Отражает состояние «изменено»: цвет значения + видимость кнопки сброса. Сравнение
        // с допуском (float), чтобы 0.32 против 0.32 не считалось изменением из-за представления.
        // Заливка трека до значения (CSS читает --p, см. panel-css.js).
        function fill() {
            try { var mn = Number(opts.min), mx = Number(opts.max), v = Number(sl.value); sl.style.setProperty("--p", (mx > mn ? (v - mn) / (mx - mn) * 100 : 0) + "%"); } catch (e) {}
        }
        function syncChanged() {
            fill();
            if (!reset) return;
            var changed = Math.abs(Number(opts.get()) - Number(defVal())) > 1e-9;
            reset.hidden = !changed;
            val.style.color = changed ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)";
        }
        function doReset() {
            var dv = defVal();
            opts.onInput(dv);
            sl.value = String(dv); val.textContent = Number(dv).toFixed(opts.dec);
            apply(); syncChanged();
        }
        // input — «живое» применение без записи (коалесинг в кадр); change (отпускание ползунка)
        // — единственная запись в localStorage. Раньше saveCfg дёргался на каждый кадр перетаскивания.
        sl.addEventListener("input", function () { var v = parseFloat(sl.value); opts.onInput(v); val.textContent = v.toFixed(opts.dec); syncChanged(); applyThrottledLive(); });
        sl.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
        // Двойной клик по ползунку — тот же сброс к дефолту (одно дискретное действие -> apply).
        if (reset) {
            sl.title = t("Двойной клик — сброс к значению по умолчанию");
            sl.addEventListener("dblclick", doReset);
            reset.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); doReset(); });
        }
        wrap.appendChild(sl); wrap.appendChild(val);
        if (reset) wrap.appendChild(reset);
        var d = infoDot(opts.info); if (d) wrap.appendChild(d);
        wrap._refresh = function () { sl.value = String(opts.get()); val.textContent = Number(opts.get()).toFixed(opts.dec); syncChanged(); };
        syncChanged();
        return wrap;
    }

    function makeParamSlider(def) {
        var key = def[0];
        return makeSlider({
            label: def[1], min: def[2], max: def[3], step: def[4], dec: def[5],
            get: function () { return cfg.fxp[key]; }, onInput: function (v) { cfg.fxp[key] = v; }, info: INFO["fxp_" + key],
            def: DEFAULTS.fxp[key]
        });
    }
    function makeCheck(key, label) {
        return makeToggle(function () { return cfg.fx[key]; }, function (v) {
            cfg.fx[key] = v; apply();
            // Тумблеры с зависимыми контролами (число/стиль частиц, длительность помидора,
            // скорость Aurora, радиус спотлайта) — пересобираем панель, чтобы соответствующий
            // слайдер силы появился/исчез. refreshPanel сохраняет вкладку/прокрутку/фокус (panel.js).
            // Панель пересобираем, если от этого тумблера зависит показ других контролов:
            // ползунка силы (PARAM_REQUIRES) или пунктов-надстроек (FX_REQUIRES).
            if (fxAffectsPanel(key)) { try { refreshPanel(); } catch (e) {} }
        }, label, INFO["fx_" + key]);
    }

    // ==== Контролы для картинки / слайдшоу (работают с произвольным разделом cfg) ====
    // Универсальный слайдер над obj[key] — используется для cfg.slideshow и cfg.autoTime.
    // def (необязателен) — значение сброса по двойному клику (обычно из DEFAULTS).
    function makeObjSlider(obj, key, label, min, max, step, dec, info, def) {
        return makeSlider({
            label: label, min: min, max: max, step: step, dec: dec,
            get: function () { return obj[key]; }, onInput: function (v) { obj[key] = v; }, info: info, def: def
        });
    }
    // ===== Сворачиваемая секция =====
    // Настройка меню: каждую секцию регистрируем в panelAllSections (для менеджера «Настройка
    // меню» — он должен видеть и скрытые тоже). Скрытую секцию ВНЕ режима «Настроить» не строим и
    // не аппендим — отдаём открепленный body, чтобы .appendChild вызывающих был безвреден. В режиме
    // «Настроить» скрытая секция показывается ПРИГЛУШЁННОЙ с кнопкой «показать» — чтобы скрытие было
    // обратимым прямо на месте (а не только через менеджер). Сам менеджер «Настройка меню» скрыть нельзя.
    // rule (необязателен) — {num, on}: номер правила по старшинству и включено ли оно (вкладка
    // «Авто-смена»); показываются в заголовке секции.
    function collapsible(parent, title, info, rule) {
        try { if (typeof panelAllSections !== "undefined" && panelAllSections && panelAllSections.push) panelAllSections.push({ title: title, label: t(title), parent: parent }); } catch (e) {}
        var canHide = title !== "Настройка меню";
        var editing = (typeof panelEditMenu !== "undefined" && panelEditMenu);
        var isHidden = !!(canHide && cfg.ui && cfg.ui.hidden && cfg.ui.hidden[title]);
        if (isHidden && !editing) return el("div", null); // скрыта и не настраиваем — не строим
        var collapsed = !!(cfg.ui.collapsed && cfg.ui.collapsed[title]);
        var wrap = el("div", null); wrap.className = "mlp-sec" + (collapsed ? "" : " open") + (isHidden ? " hid" : ""); // hid — «скрыто, но показано для настройки»
        var head = el("div", null); head.className = "mlp-sec-h";
        var chev = el("span", null, "▶"); chev.className = "mlp-chev";
        head.appendChild(chev);
        if (rule && rule.num) { var rn = el("span", null, String(rule.num)); rn.className = "mlp-rule-n" + (rule.on ? " on" : ""); head.appendChild(rn); }
        var ttl = el("div", null, t(title)); ttl.className = "mlp-sec-t"; head.appendChild(ttl);
        if (rule) { var rs = el("span", null, rule.on ? t("вкл") : t("выкл")); rs.className = "mlp-rule-s" + (rule.on ? " on" : ""); head.appendChild(rs); }
        var idot = infoDot(info); if (idot) head.appendChild(idot); // перевод подписи секции — внутри infoDot (infoText)
        // Режим «Настроить»: звезда «в избранное» + обратимая кнопка «скрыть/показать» в шапке.
        if (canHide && editing) {
            var isFav = !!(cfg.ui.favSec && cfg.ui.favSec[title]);
            var star = el("span", "flex:0 0 auto; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
            star.title = isFav ? t("Убрать из избранного") : t("В избранное");
            star.addEventListener("click", function (e) {
                e.stopPropagation(); e.preventDefault();
                if (!cfg.ui.favSec) cfg.ui.favSec = {};
                if (isFav) delete cfg.ui.favSec[title]; else cfg.ui.favSec[title] = true;
                saveCfg(); try { refreshPanel(); } catch (er) {}
            });
            keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + t(title));
            head.appendChild(star);

            var hideB = el("span", "flex:0 0 auto; padding:1px 7px; border-radius:5px; font-size:10px; cursor:pointer; " +
                (isHidden ? "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);"
                          : "color:#f38ba8; background:rgba(243,139,168,0.14); border:1px solid rgba(243,139,168,0.3);"),
                isHidden ? t("показать") : t("скрыть"));
            hideB.addEventListener("click", function (e) {
                e.stopPropagation(); e.preventDefault();
                if (!cfg.ui.hidden) cfg.ui.hidden = {};
                if (isHidden) delete cfg.ui.hidden[title]; else cfg.ui.hidden[title] = true;
                saveCfg(); try { refreshPanel(); } catch (er) {}
            });
            keyActivate(hideB, (isHidden ? t("Показать секцию") : t("Скрыть секцию")) + ": " + t(title));
            head.appendChild(hideB);
        }
        var body = el("div", null); body.className = "mlp-sec-b";
        body.style.display = collapsed ? "none" : "block";
        // Единая смена состояния секции (используется и кликом, и разворотом из поиска по панели).
        function setOpen(show) {
            body.style.display = show ? "block" : "none";
            wrap.classList.toggle("open", !!show);
            head.setAttribute("aria-expanded", show ? "true" : "false");
            if (!cfg.ui.collapsed) cfg.ui.collapsed = {};
            cfg.ui.collapsed[title] = !show; saveCfg();
        }
        head.addEventListener("click", function () { setOpen(body.style.display === "none"); });
        keyActivate(head, t(title));
        head.setAttribute("aria-expanded", collapsed ? "false" : "true");
        wrap.appendChild(head); wrap.appendChild(body);
        parent.appendChild(wrap);
        // Регистрируем секцию для поиска по панели (panelSections живёт в panel.js и обнуляется
        // в начале togglePanel). Храним, к какой вкладке-родителю секция принадлежит, её head для
        // прокрутки/подсветки и expand() для разворота. typeof-страховка — collapsible может быть
        // вызван и вне панели (тогда индекса просто нет).
        try {
            if (typeof panelSections !== "undefined" && panelSections && panelSections.push) {
                // title — стабильный русский ключ (sectionByTitle ищет по нему, cfg.ui.collapsed
                // хранит по нему); label — переведённый текст для отображения и поиска по панели.
                panelSections.push({ title: title, label: t(title), parent: parent, head: head, expand: function () { setOpen(true); }, setOpen: setOpen });
            }
        } catch (e) {}
        return body;
    }

    // ===================== src/ui/controls-sets.js =====================
    // ===== Контролы вкладки «Набор» =====
    // Всё, что относится к выбору и источнику фона: плитки наборов с превью, переименование,
    // генератор по seed, слайд-шоу, библиотека своих картинок, контекстные привязки (проект,
    // ветка, язык файла), время суток, витрина и поле своего шейдера.

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
            var u = zoneUrl(idx, zone);
            if (!u) return;                       // у зоны нет картинки по замыслу набора — проверять нечего
            onImage(u, function (st) {
                if (st.ok || st.none) return;
                chip.style.borderColor = "#f38ba8";
                chip.title = t("Не грузится: ") + setImage(idx, zone);
                var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:2px; left:4px; z-index:3; color:#f38ba8; font-weight:700; text-shadow:0 1px 3px rgba(0,0,0,0.9);", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
            });
        });
    }

    // Превью набора в узле pv: три полосы зон (редактор 60% / сайдбар / панель). Генеративный
    // набор — градиентом (нет картинок и 404-проверки), шейдерный — запасной палитрой, которой он
    // рисуется без WebGL, процедурный — одной текстурой. Картинки — компактным data-URL из пробы
    // (probeImage.thumb), а не полноразмерным JPEG: превью много, и пересобираются они часто.
    // Нужна карточкам наборов, строке «сейчас работает» и быстрому меню у кнопки BG.
    // Возвращает true, если у набора настоящие картинки (их имеет смысл проверять на 404).
    function paintSetPreview(pv, idx) {
        var grad = isGradSet(idx), proc = isProcSet(idx);
        var shader = (typeof isShaderSet === "function") && isShaderSet(idx);
        var procCss = proc ? (function () { var u = procTexture(idx); return u ? cssUrl(u) + " center / cover no-repeat" : procFallback(idx, "editor"); })() : null;
        var ZK = ["editor", "sidebar", "panel"], W = [[0, 60], [60, 20], [80, 20]];
        function paintZone(node, zone) {
            var url = zoneUrl(idx, zone);
            node.style.background = "rgba(var(--mlbg-accent-rgb),0.14)";
            node.style.backgroundPosition = "center"; node.style.backgroundSize = "cover";
            onImage(url, function (st) { if (st && st.thumb) node.style.backgroundImage = cssUrl(st.thumb); });
        }
        if (!pv.style.position) pv.style.position = "relative";
        pv.style.overflow = "hidden";
        for (var zi = 0; zi < 3; zi++) {
            var strip = el("div",
                "position:absolute; top:0; bottom:0; left:" + W[zi][0] + "%; width:" + W[zi][1] + "%;" +
                "background-position:center; background-size:cover;" +
                (zi ? "box-shadow:inset 1px 0 0 rgba(0,0,0,0.35);" : ""));
            if (proc) strip.style.background = procCss;
            else if (grad) strip.style.background = gradFor(idx, ZK[zi]);
            else if (shader) strip.style.background = shaderBg(idx, ZK[zi]);
            else paintZone(strip, ZK[zi]);
            pv.appendChild(strip);
        }
        return !grad && !proc && !shader;
    }
    function isFavSet(idx) { return !!(cfg.ui.favSets && cfg.ui.favSets[String(idx)]); }

    // Карточка набора: превью + номер и имя под ним + звёздочка «любимый» в углу превью.
    // label — номер набора (или подпись для «случайно»); вид — panel-css.js (.mlp-set).
    function makeChip(mode, label) {
        var active = cfg.mode === mode, isSet = mode !== "random";
        var c = el("div", null); c.className = "mlp-set" + (active ? " on" : "") + (isSet ? "" : " mlp-set-rand");
        var pv = el("div", null); pv.className = "mlp-set-pv"; c.appendChild(pv);
        var nmRow = el("div", null); nmRow.className = "mlp-set-nm"; c.appendChild(nmRow);
        if (isSet) {
            var idx = parseInt(mode, 10);
            var real = paintSetPreview(pv, idx);
            var nm = setName(idx);
            var no = el("span", null, label); no.className = "mlp-set-no"; nmRow.appendChild(no);
            nmRow.appendChild(el("span", null, nm || t("Набор ") + label));
            c.title = idx + (nm ? " · " + nm : "") + t(" (редактор · сайдбар · панель)");
            // Звёздочка: любимые наборы попадают в быстрое меню у кнопки BG и в фильтр «только любимые».
            var fav = isFavSet(idx);
            var star = el("span", null, fav ? "\u2605" : "\u2606"); star.className = "mlp-set-star" + (fav ? " on" : "");
            star.title = fav ? t("Убрать из любимых") : t("В любимые");
            star.addEventListener("click", function (e) {
                e.stopPropagation(); e.preventDefault();
                if (!cfg.ui.favSets) cfg.ui.favSets = {};
                if (fav) delete cfg.ui.favSets[String(idx)]; else cfg.ui.favSets[String(idx)] = true;
                saveCfg(); try { refreshPanel(); } catch (er) {}
            });
            keyActivate(star, (fav ? t("Убрать из любимых") : t("В любимые")) + ": " + (nm || label));
            pv.appendChild(star);
            if (real) probeSet(idx, c);
            if (!active) {
                // Превью набора и по мыши, и с клавиатуры (focus/blur): идущий по карточкам с Tab
                // тоже «примеряет» набор. previewSet дебаунсит, previewEnd мягко возвращает.
                var hoverOn = function () { previewSet(idx); };
                var hoverOff = function () { previewEnd(); };
                c.addEventListener("mouseenter", hoverOn);
                c.addEventListener("mouseleave", hoverOff);
                c.addEventListener("focus", hoverOn);
                c.addEventListener("blur", hoverOff);
            }
        } else {
            var ic = uiIcon("dice", 36); if (ic) pv.appendChild(ic);
            nmRow.appendChild(el("span", null, t(label)));
            c.title = t("Новый набор при каждом запуске");
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
        keyActivate(c, isSet ? (t("Набор ") + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : t("Случайный набор"));
        c.setAttribute("aria-pressed", active ? "true" : "false"); // какой набор выбран — для скринридера
        return c;
    }

    // Своя картинка -> фон АКТИВНОГО набора во всех трёх зонах (зоны сами показывают разные части:
    // редактор — центр, сайдбар и панель — низ). Акцент набора сбрасывается: пока его не
    // поменяют руками, он берётся из этой картинки (getAccent). Отменяется кнопкой «Отменить».
    function setUserImage(url) {
        if (!url || !imgAllowed(url)) { toast(t("Эту картинку нельзя загрузить (сетевые картинки выключены)"), false); return; }
        var idx = activeIndex();
        if (cfg.mode === "random") cfg.mode = String(idx); // иначе при следующем запуске набор сменится
        if (!cfg.setImg) cfg.setImg = {};
        cfg.setImg[idx] = { editor: url, sidebar: url, panel: url };
        if (cfg.setAccent) delete cfg.setAccent[idx];
        if (cfg.setPos) delete cfg.setPos[idx];
        applyFade(); refreshPanel();
        toast(t("Картинка стала фоном набора ") + idx + t(". Отменить — стрелка в шапке панели."));
        // Одна картинка на три зоны: сайдбару и панели — самые тёмные участки кадра (по карте
        // яркости 8x8), там текст списков и терминала читается лучше. Редактор — центр.
        onImage(imgUrl(url), function (st) {
            var pos = smartZonePos(st && st.grid);
            if (!pos || !cfg.setImg[idx] || cfg.setImg[idx].editor !== url) return;
            if (!cfg.setPos) cfg.setPos = {};
            cfg.setPos[idx] = { sidebar: pos.sidebar, panel: pos.panel };
            apply();
        });
    }
    // Позиции для сайдбара (вертикальная полоса) и панели (горизонтальная полоса) по карте
    // яркости 8x8: берём самую тёмную полосу. null — карты нет.
    function smartZonePos(grid) {
        if (!grid || grid.length !== 64) return null;
        var bestC = 0, bestR = 7, minC = 9, minR = 9, c, r;
        for (c = 0; c < 8; c++) { var sc = 0; for (r = 0; r < 8; r++) sc += grid[r * 8 + c]; if (sc < minC) { minC = sc; bestC = c; } }
        for (r = 0; r < 8; r++) { var sr = 0; for (c = 0; c < 8; c++) sr += grid[r * 8 + c]; if (sr < minR) { minR = sr; bestR = r; } }
        var pct = function (i) { return Math.round(i / 7 * 100) + "%"; };
        return { sidebar: pct(bestC) + " 50%", panel: "50% " + pct(bestR) };
    }
    // Адрес картинки из перетаскивания: проводник VS Code кладёт file:///-адрес в text/uri-list
    // (или в text/plain). Файлы с рабочего стола адреса не несут — тогда null.
    function droppedImageUrl(dt) {
        if (!dt) return null;
        var raw = "";
        try { raw = dt.getData("text/uri-list") || dt.getData("text/plain") || ""; } catch (e) {}
        var lines = raw.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var u = lines[i].trim();
            if (/^(?:file|vscode-file):\/\/.+\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(u)) return u;
        }
        return null;
    }
    // Кнопки «Своя картинка…» и «Папка картинок…»: обычный диалог выбора файла показывает
    // компаньон-расширение (скрипт в оболочке к диску доступа не имеет).
    function makeOwnImageRow() {
        var box = el("div", null);
        var row = el("div", "display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;");
        var pick = makeIoBtn("Своя картинка…");
        pick.addEventListener("click", function () {
            mlbgRpc("pickImage").then(function (r) { if (r && r.url) setUserImage(r.url); },
                function (e) { toast(t("Не удалось открыть выбор файла: ") + e.message, false); });
        });
        var folder = makeIoBtn("Папка картинок…");
        folder.addEventListener("click", function () {
            mlbgRpc("pickFolder").then(function (r) {
                if (!r || r.cancelled) return;
                if (!r.images || !r.images.length) { toast(t("В папке нет картинок"), false); return; }
                useFolder(r.dir, r.images);
                toast(t("Папка «") + r.name + "»: " + r.images.length + t(" карт. — сменяются в редакторе по таймеру слайдшоу"));
            }, function (e) { toast(t("Не удалось открыть выбор папки: ") + e.message, false); });
        });
        row.appendChild(pick); row.appendChild(folder);
        box.appendChild(row);
        var idx = activeIndex();
        if (hasUserImg(idx, "editor") || cfg.libraryDir) {
            var row2 = el("div", "display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;");
            if (hasUserImg(idx, "editor")) {
                var back = makeIoBtn("Вернуть картинки набора");
                back.addEventListener("click", function () {
                    if (cfg.setImg) delete cfg.setImg[idx];
                    if (cfg.setPos) delete cfg.setPos[idx];
                    applyFade(); refreshPanel();
                });
                row2.appendChild(back);
            }
            if (cfg.libraryDir) {
                var off = makeIoBtn("Убрать папку");
                off.title = cfg.libraryDir;
                off.addEventListener("click", function () { cfg.libraryDir = ""; cfg.librarySlideshow = false; apply(); refreshPanel(); });
                row2.appendChild(off);
            }
            box.appendChild(row2);
        }
        box.appendChild(el("div", "padding:6px 2px 0; font-size:11px; color:var(--mlp-faint);", t("Картинку можно и перетащить в панель из проводника VS Code.")));
        return box;
    }
    // Папка как источник фона: её картинки крутятся в редакторе (механизм библиотеки), а при
    // каждом запуске список перечитывается — новые файлы в папке подхватываются сами.
    function useFolder(dir, images) {
        cfg.libraryDir = String(dir || "").slice(0, 1024);
        cfg.library = images.slice(0, 64);
        cfg.librarySlideshow = true;
        try { libraryReset(); } catch (e) {}
        apply(); refreshPanel();
    }

    // Переименование АКТИВНОГО набора (cfg.setName[idx]). Имя уходит в textContent/title
    // (кнопка BG, чипы, списки), поэтому CSS-инъекция не грозит — только ограничение длины.
    function makeSetNameEdit() {
        var wrap = el("div", ST.row + " margin-top:6px;");
        wrap.appendChild(el("span", mutedLabel(56), t("Имя")));
        var ip = el("input", fieldStyle(" padding:3px 6px;"));
        ip.type = "text"; ip.maxLength = 40;
        var idx = activeIndex();
        ip.value = setName(idx);
        ip.placeholder = t("Набор ") + idx;
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

    // ===== Генератор набора по seed/палитре =====
    // Поле «seed или #rrggbb» + кнопки «Сгенерировать» / «Случайный». Из ввода строим
    // согласованный градиентный набор (genSetFromSeed), кладём его в хвост наборов (addGenSet:
    // правит cfg.genSets + SETS, сохраняется в localStorage) и сразу делаем активным. Пока есть
    // сгенерированные наборы — доступна «Очистить» (removeGenSets убирает их из хвоста и чистит
    // висячие привязки). Один seed всегда даёт один и тот же набор — им можно делиться текстом.
    function makeGenerator() {
        var wrap = el("div");
        // маленькая кнопка в стиле «из картинки»
        function btn(label, title) {
            var b = el("div", "flex:0 0 auto; padding:3px 9px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", label);
            if (title) b.title = title;
            keyActivate(b, title || label);
            return b;
        }
        var row = el("div", ST.row);
        var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        ip.type = "text"; ip.maxLength = 40; ip.placeholder = "seed / #rrggbb";
        ip.setAttribute("aria-label", t("Seed или базовый цвет набора"));
        row.appendChild(ip);
        wrap.appendChild(row);

        // Применить сгенерированный набор: добавить в хвост и сделать активным.
        function makeAndApply(seed) {
            var idx = addGenSet(genSetFromSeed(seed));
            if (idx === -2) { toast(t("Достигнут предел сгенерированных наборов (") + GEN_MAX + ")", false); return; }
            if (idx < 0) { toast(t("Не удалось создать набор"), false); return; }
            cfg.mode = String(idx);
            applyFade(); refreshPanel();
            toast(t("Набор создан: ") + setName(idx));
        }

        var gen = btn(t("Сгенерировать"), t("Создать набор из seed/цвета в поле"));
        gen.addEventListener("click", function () { makeAndApply(ip.value); });
        var rnd = btn(t("Случайный"), t("Случайный согласованный набор"));
        rnd.addEventListener("click", function () { ip.value = ""; makeAndApply(""); });
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); makeAndApply(ip.value); } });

        var btns = el("div", "display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;");
        btns.appendChild(gen); btns.appendChild(rnd);
        if (cfg.genSets && cfg.genSets.length) {
            var clr = btn(t("Очистить (") + cfg.genSets.length + ")", t("Убрать все сгенерированные наборы"));
            clr.style.color = "#f38ba8"; clr.style.background = "rgba(243,139,168,0.14)"; clr.style.borderColor = "rgba(243,139,168,0.3)";
            clr.addEventListener("click", function () {
                backupCfg();          // на случай «ой, не то» — «Восстановить» в «Система» вернёт
                removeGenSets();
                applyFade(); refreshPanel();
                toast(t("Сгенерированные наборы убраны"));
            });
            btns.appendChild(clr);
        }
        wrap.appendChild(btns);
        return wrap;
    }

    // ==== Витрина / скринсейвер при простое (cfg.screensaver) ====
    function makeScreensaverToggle() {
        return makeToggle(
            function () { return !!(cfg.screensaver && cfg.screensaver.on); },
            function (v) {
                if (!cfg.screensaver) cfg.screensaver = { on: false, min: 5 };
                cfg.screensaver.on = v; try { screensaverBump(); } catch (e) {} apply();
                try { refreshPanel(); } catch (e) {} // «Простой, мин» есть только при включённой витрине
            }, "Включить", INFO.screensaver);
    }

    function makeSlideToggle() {
        // Ползунок интервала показывается только при включённом слайд-шоу, поэтому после
        // переключения пересобираем панель — иначе он появился бы лишь при следующем открытии.
        return makeToggle(function () { return cfg.slideshow.on; }, function (v) {
            cfg.slideshow.on = v; slideReset(); apply();
            try { refreshPanel(); } catch (e) {}
        }, "Включить", INFO.slide_on);
    }

    // ==== Библиотека картинок (cfg.library / cfg.librarySlideshow) ====
    // Тумблер «крутить библиотеку в редакторе» + добавление локальных путей + список с удалением.
    // Смена картинок идёт по таймеру слайдшоу (libraryTick). Пути уходят в url('...') через cssUrl.
    function makeLibraryUI() {
        var box = el("div", null);
        box.appendChild(makeToggle(function () { return !!cfg.librarySlideshow; },
            function (v) { cfg.librarySlideshow = v; try { libraryReset(); } catch (e) {} apply(); refreshPanel(); },
            "Крутить библиотеку в редакторе", INFO.library));
        var row = el("div", ST.row);
        var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        ip.type = "text"; ip.maxLength = 1024; ip.placeholder = "file:///… , vscode-file://…"; ip.setAttribute("aria-label", t("Путь картинки"));
        var addB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Добавить"));
        function addPath() {
            var v = ip.value.trim().slice(0, 1024); if (!v) return;
            if (!Array.isArray(cfg.library)) cfg.library = [];
            if (cfg.library.length >= 64) { toast(t("Слишком много картинок (макс. 64)"), false); return; }
            cfg.library.push(v); ip.value = ""; apply(); refreshPanel();
        }
        addB.addEventListener("click", addPath); keyActivate(addB, t("Добавить"));
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addPath(); } });
        row.appendChild(ip); row.appendChild(addB);
        box.appendChild(row);
        var lib = Array.isArray(cfg.library) ? cfg.library : [];
        if (!lib.length) {
            box.appendChild(emptyState("Список пуст — выбери «Папку картинок…» в секции «Набор» или добавь пути к картинкам."));
        } else {
            var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
            lib.forEach(function (u, i) {
                var r = el("div", "display:flex; align-items:center; gap:6px; padding:4px 7px; border-radius:6px; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
                r.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; direction:rtl; text-align:left; color:var(--mlp-fg,#cdd6f4); font-size:11px;", u));
                var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8); cursor:pointer;", "×");
                del.addEventListener("click", function () { cfg.library.splice(i, 1); apply(); refreshPanel(); });
                keyActivate(del, t("Удалить"));
                r.appendChild(del); list.appendChild(r);
            });
            box.appendChild(list);
        }
        return box;
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
            name ? (t("Проект: ") + name) : t("Проект не определён — открыта ли папка?")));
        var pinned = (name && cfg.workspaceSets) ? cfg.workspaceSets[name] : null;
        if (name && pinned != null) {
            box.appendChild(el("div", "padding:2px 3px 4px; color:var(--mlp-muted,#a6adc8); font-size:11px;",
                t("Закреплён набор ") + pinned + (setName(parseInt(pinned, 10)) ? " · " + setName(parseInt(pinned, 10)) : "")));
            var forget = el("div", "margin-top:2px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Забыть закрепление за проектом"));
            forget.addEventListener("click", function () { if (cfg.workspaceSets) delete cfg.workspaceSets[name]; apply(); refreshPanel(); });
            keyActivate(forget, t("Забыть закрепление набора за проектом"));
            box.appendChild(forget);
        } else if (name && cfg.autoWorkspace) {
            box.appendChild(el("div", "padding:2px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
                t("Выбери набор выше — он закрепится за этим проектом.")));
        }
        return box;
    }
    // ==== Фон по контексту (git-ветка / язык файла) — общий построитель ====
    // Тумблер + текущий ключ (имя ветки или расширение файла) + выбор набора для этого ключа
    // («—» = не закреплять / забыть). Ветка/расширение читаются из DOM (gitBranch/editorFileExt);
    // без них показываем подсказку и прячем выбор набора. opts: flag (поле-флаг cfg), map (поле-
    // карта cfg), read() -> текущий ключ, info, toggle/detected/none/pin — метки (переводятся).
    function makeCtxAutoUI(opts) {
        var box = el("div", null);
        box.appendChild(makeToggle(
            function () { return !!cfg[opts.flag]; },
            function (v) { cfg[opts.flag] = v; apply(); refreshPanel(); },
            opts.toggle, opts.info));
        var key = ""; try { key = opts.read() || ""; } catch (e) {}
        box.appendChild(el("div", "padding:4px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
            key ? (t(opts.detected) + key) : t(opts.none)));
        if (key && cfg[opts.flag]) {
            var wrap = el("div", ST.row);
            wrap.appendChild(el("span", mutedLabel(96, true), t(opts.pin)));
            var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
            var cur = (cfg[opts.map] && cfg[opts.map][key] != null) ? String(cfg[opts.map][key]) : "";
            var none = el("option", null, "—"); none.value = ""; sel.appendChild(none);
            for (var i = 0; i < SETS.length; i++) {
                var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
                if (o.value === cur) o.selected = true; sel.appendChild(o);
            }
            sel.addEventListener("change", function () {
                if (!cfg[opts.map]) cfg[opts.map] = {};
                if (sel.value === "") delete cfg[opts.map][key]; else cfg[opts.map][key] = sel.value;
                applyFade(); refreshPanel();
            });
            wrap.appendChild(sel);
            box.appendChild(wrap);
        }
        return box;
    }
    function makeRemoteAutoUI() {
        return makeCtxAutoUI({
            flag: "autoRemote", map: "remoteSets", info: INFO.auto_remote,
            read: function () { return (typeof liveStr === "function") ? (liveStr("remote") || "") : ""; },
            toggle: "Фон по репозиторию", detected: "Репозиторий: ",
            none: "Репозиторий не определён — нужен компаньон и git-remote",
            pin: "Набор для репо"
        });
    }
    function makeBranchAutoUI() {
        return makeCtxAutoUI({
            flag: "autoBranch", map: "branchSets", info: INFO.auto_branch,
            read: function () { return (typeof gitBranch === "function") ? gitBranch() : ""; },
            toggle: "Фон по ветке", detected: "Ветка: ", none: "Ветка не определена — открыт ли git-репозиторий?",
            pin: "Набор для ветки"
        });
    }
    function makeLangAutoUI() {
        return makeCtxAutoUI({
            flag: "autoLang", map: "langSets", info: INFO.auto_lang,
            read: function () { return (typeof editorFileExt === "function") ? editorFileExt() : ""; },
            toggle: "Фон по языку файла", detected: "Расширение: .", none: "Файл не определён — открыт ли редактор?",
            pin: "Набор для расширения"
        });
    }
    // Режим границ дня для авто-набора по времени: по фиксированным часам или по рассвету/закату.
    function makeAutoTimeMode() {
        return makeSeg("Границы дня", [["hours", "По часам"], ["sun", "Рассвет/закат"]],
            function () { return (cfg.autoTime && cfg.autoTime.mode === "sun") ? "sun" : "hours"; },
            function (v) {
                if (!cfg.autoTime) cfg.autoTime = clone(DEFAULTS.autoTime);
                cfg.autoTime.mode = (v === "sun") ? "sun" : "hours";
                apply(); if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} } refreshPanel();
            }, INFO.autotime_mode);
    }

    // ===== Свой GLSL для шейдерного набора =====
    // Набор «Свой шейдер» рисует то, что здесь написано: тело фрагментного шейдера с функцией
    // vec3 render(vec2 p). Доступны uniform-ы u_time, u_res, u_accent, u_base, u_mouse.
    // Ошибка компиляции не ломает редактор — слой молча откатывается на встроенное «Сияние».
    function makeShaderSrcUI() {
        var box = el("div", "padding:2px 4px;");
        var hint = el("div", "font-size:10.5px; color:var(--mlp-muted,#a6adc8); line-height:1.5; margin-bottom:4px;",
            t("Тело фрагментного шейдера: функция vec3 render(vec2 p). Доступны u_time, u_res, u_accent, u_base, u_mouse. Выбери набор «Свой шейдер», чтобы увидеть результат."));
        // Секция относится к одному конкретному набору. Если сейчас выбран другой, поле выглядит
        // так, будто ничего не делает, — поэтому прямо говорим об этом и даём переключиться.
        var customIdx = -1;
        for (var ci = 0; ci < SETS.length; ci++) if (SETS[ci].shader === "custom") { customIdx = ci; break; }
        if (customIdx >= 0 && activeIndex() !== customIdx) {
            var note = el("div", "display:flex; align-items:center; gap:8px; margin-bottom:6px; padding:5px 8px; border-radius:7px; font-size:11px; color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
            note.appendChild(el("span", ST.fill, t("Шейдер рисуется только в наборе «Свой шейдер» — сейчас выбран другой.")));
            var go = el("span", "flex:0 0 auto; padding:2px 8px; border-radius:6px; cursor:pointer; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Выбрать"));
            go.addEventListener("click", function () {
                previewCancel(); cfg.mode = String(customIdx); applyFade(); saveCfg();
                try { refreshPanel(); } catch (e) {}
            });
            keyActivate(go, t("Выбрать набор «Свой шейдер»"));
            note.appendChild(go);
            box.appendChild(note);
        }
        var ta = el("textarea", fieldStyle(" display:block; width:100%; box-sizing:border-box; padding:6px 8px; font-family:var(--vscode-editor-font-family,monospace); font-size:10.5px; min-height:96px; resize:vertical;"));
        ta.value = typeof cfg.shaderSrc === "string" ? cfg.shaderSrc : "";
        ta.placeholder = "vec3 render(vec2 p){ return mix(u_base, u_accent, 0.5 + 0.5*sin(p.x*3.0 + u_time)); }";
        ta.setAttribute("aria-label", t("Свой GLSL-шейдер"));
        var row = el("div", "display:flex; gap:6px; margin-top:6px;");
        var save = makeIoBtn(t("Применить шейдер"));
        save.addEventListener("click", function () {
            cfg.shaderSrc = String(ta.value || "").slice(0, 8000);
            saveCfg();
            try { shd.failed = false; shaderStop(); ensureShader(); } catch (e) {}
            toast(cfg.shaderSrc ? t("Шейдер применён") : t("Шейдер сброшен на встроенный"));
        });
        var reset = makeIoBtn(t("Очистить"));
        reset.addEventListener("click", function () {
            ta.value = ""; cfg.shaderSrc = ""; saveCfg();
            try { shd.failed = false; shaderStop(); ensureShader(); } catch (e) {}
            toast(t("Шейдер сброшен на встроенный"));
        });
        row.appendChild(save); row.appendChild(reset);
        box.appendChild(hint); box.appendChild(ta); box.appendChild(row);
        return box;
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
        wrap.appendChild(el("span", mutedLabel(92), t(label)));
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

    // ===================== src/ui/controls-view.js =====================
    // ===== Контролы вкладки «Вид» =====
    // Яркость зон и читаемость кода, акцент и палитра картинки, фильтры изображения, стиль
    // частиц, бюджет производительности и сводка сессии. Здесь же предпросмотр эффекта при
    // наведении: тумблер показывает результат до клика.

    // ===== Предпросмотр эффекта при наведении =====
    // Наведение на строку ВЫКЛЮЧЕННОГО эффекта временно включает его (applyNoSave — без записи в
    // localStorage и без шага истории), уход курсора / потеря фокуса — возвращает прежнее значение.
    // Так десятки эффектов с непонятными названиями можно «примерить», не запоминая, что включил.
    // Дебаунс, как у previewSet: пока курсор просто проезжает по сетке, ничего не мигает.
    // previewFxCancel фиксирует выбор на клике (mouseleave после переключения не должен откатить
    // уже сохранённое значение). Превью для уже включённого эффекта не делаем — примерять нечего.
    var _fxPrevTimer = 0, _fxPrevKey = null, _fxPrevVal = null, _fxPrevDelay = 90;
    function previewFx(key) {
        if (!cfg.enabled) return;                 // фон выключен — эффекты не видно, не дёргаем CSS
        if (_fxPrevKey === key) return;           // уже примеряем этот
        if (cfg.fx[key] && _fxPrevKey === null) return; // эффект и так включён — примерять нечего
        if (_fxPrevTimer) clearTimeout(_fxPrevTimer);
        _fxPrevTimer = setTimeout(function () {
            _fxPrevTimer = 0;
            if (_fxPrevKey !== null && _fxPrevKey !== key) cfg.fx[_fxPrevKey] = _fxPrevVal; // сменили строку — вернуть прошлую
            _fxPrevKey = key; _fxPrevVal = cfg.fx[key];
            cfg.fx[key] = true; applyNoSave();
        }, _fxPrevDelay);
    }
    function previewFxEnd() {
        if (_fxPrevTimer) { clearTimeout(_fxPrevTimer); _fxPrevTimer = 0; }
        if (_fxPrevKey === null) return;
        cfg.fx[_fxPrevKey] = _fxPrevVal; _fxPrevKey = null; _fxPrevVal = null;
        applyNoSave();
    }
    // Снять превью БЕЗ отката (пользователь кликнул тумблер — значение зафиксировано change-хендлером).
    function previewFxCancel() {
        if (_fxPrevTimer) { clearTimeout(_fxPrevTimer); _fxPrevTimer = 0; }
        _fxPrevKey = null; _fxPrevVal = null;
    }

    // ==== Статистика сессии (fx.stats) — сводка в панели ====
    // Показывает снимок statsState на момент открытия панели (переоткрой/переключи вкладку для
    // обновления). Значения копятся, только пока включён тумблер «Статистика».
    function makeStatsUI() {
        var box = el("div", null);
        function line(label, val) {
            var r = el("div", "display:flex; justify-content:space-between; padding:2px 3px; font-size:11px;");
            r.appendChild(el("span", "color:var(--mlp-muted,#a6adc8);", t(label)));
            r.appendChild(el("span", "color:var(--mlp-fg,#cdd6f4); font-variant-numeric:tabular-nums;", val));
            box.appendChild(r);
        }
        line("В сессии", fmtDur(Date.now() - statsState.start));
        line("Нажатий", String(statsState.keys));
        line("Файлов", String(statsState.fileCount));
        line("В потоке", fmtDur(statsState.flowMs));
        line("Лучший стрик", fmtDur(statsState.bestMs));
        var rb = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Сбросить статистику"));
        rb.addEventListener("click", function () { try { statsReset(); } catch (e) {} apply(); refreshPanel(); });
        keyActivate(rb, t("Сбросить статистику"));
        box.appendChild(rb);
        return box;
    }

    function makeOpSlider(key, label) {
        return makeSlider({
            label: label, min: 0, max: 0.6, step: 0.01, dec: 2, labelW: 56, valW: 30, ellipsis: false,
            get: function () { return getOp()[key]; }, onInput: function (v) { setOpValue(key, v); }, info: INFO["op_" + key],
            def: DEFAULTS.baseOp[key]
        });
    }
    // Пресеты фильтров картинки — одним выбором для всех зон: «Как есть / Мягко / Чётко /
    // Приглушённо». Ползунки по зонам (полный режим) остаются для тонкой правки.
    var IMG_LOOKS = {
        none:  { brightness: 1.0,  saturate: 1.0,  blur: 0 },
        soft:  { brightness: 0.95, saturate: 0.85, blur: 2 },
        crisp: { brightness: 1.05, saturate: 1.15, blur: 0 },
        muted: { brightness: 0.8,  saturate: 0.6,  blur: 1 }
    };
    function currentImgLook() {
        var e = cfg.imgfx && cfg.imgfx.editor; if (!e) return "";
        for (var k in IMG_LOOKS) {
            var L = IMG_LOOKS[k], same = true;
            ["editor", "side", "panel"].forEach(function (z) {
                var f = cfg.imgfx[z]; if (!f || Math.abs(f.brightness - L.brightness) > 1e-6 || Math.abs(f.saturate - L.saturate) > 1e-6 || Math.abs(f.blur - L.blur) > 1e-6) same = false;
            });
            if (same) return k;
        }
        return "";
    }
    function makeImgLook() {
        return makeSeg("Картинка", [["none", "Как есть"], ["soft", "Мягко"], ["crisp", "Чётко"], ["muted", "Приглушённо"]],
            currentImgLook, function (v) {
                var L = IMG_LOOKS[v]; if (!L) return;
                if (!cfg.imgfx) cfg.imgfx = clone(DEFAULTS.imgfx);
                ["editor", "side", "panel"].forEach(function (z) { cfg.imgfx[z] = { brightness: L.brightness, saturate: L.saturate, blur: L.blur }; });
                apply(); if (!panelSimple()) refreshPanel(); // ползунки по зонам — пересинхронизировать
            }, INFO.img_look);
    }

    // Одна «Яркость фона»: ползунок двигает все три зоны на одну и ту же величину (разница между
    // зонами сохраняется). «По зонам» раскрывает прежние три ползунка — для тонкой настройки.
    var _opZonesOpen = false;
    function makeOpMaster() {
        var box = el("div", null);
        var zones = el("div", null); zones.hidden = !_opZonesOpen;
        var zoneSliders = [];
        var master = makeSlider({
            label: "Яркость фона", min: 0, max: 0.6, step: 0.01, dec: 2, labelW: 132,
            get: function () { return getOp().editor; },
            onInput: function (v) {
                var o = getOp(), d = v - o.editor;
                setOpValue("editor", v);
                setOpValue("side", Math.max(0, Math.min(0.6, Math.round((o.side + d) * 100) / 100)));
                setOpValue("panel", Math.max(0, Math.min(0.6, Math.round((o.panel + d) * 100) / 100)));
                zoneSliders.forEach(function (s) { try { s._refresh(); } catch (e) {} });
            },
            info: INFO.op_editor, def: DEFAULTS.baseOp.editor
        });
        box.appendChild(master);
        [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель"]].forEach(function (o) {
            var s = makeOpSlider(o[0], o[1]); zoneSliders.push(s); zones.appendChild(s);
        });
        var tg = el("div", "display:inline-block; margin:2px 2px 4px; font-size:11px; cursor:pointer; color:var(--mlbg-accent);", (_opZonesOpen ? "\u25BE " : "\u25B8 ") + t("по зонам"));
        tg.addEventListener("click", function () {
            _opZonesOpen = !_opZonesOpen; zones.hidden = !_opZonesOpen;
            tg.textContent = (_opZonesOpen ? "\u25BE " : "\u25B8 ") + t("по зонам");
            try { master._refresh(); } catch (e) {}
        });
        keyActivate(tg, t("Яркость по зонам"));
        box.appendChild(tg); box.appendChild(zones);
        // Правка отдельной зоны — пересинхронизировать общий ползунок (он показывает редактор).
        zones.addEventListener("input", function () { try { master._refresh(); } catch (e) {} });
        return box;
    }

    // Точка фокуса: клик по превью картинки — какая её часть видна в зоне (background-position).
    // Понятнее ползунков «X/Y». Своя для каждой зоны набора; «по центру» — сброс.
    var _focusZone = "editor";
    function makeFocusPoint() {
        var box = el("div", null);
        var idx = activeIndex();
        if (isGrad(idx, "editor") && isGrad(idx, "sidebar")) return box; // градиент — точки нет
        box.appendChild(el("div", "margin:10px 2px 4px; font-size:11px; font-weight:700; color:var(--mlp-head);", t("Точка фокуса")));
        var zsel = makeSeg("", [["editor", "Редактор"], ["sidebar", "Сайдбар"], ["panel", "Панель"]],
            function () { return _focusZone; }, function (v) { _focusZone = v; paint(); });
        box.appendChild(zsel);
        var pv = el("div", null); pv.className = "mlp-focus";
        var dot = el("span", null); dot.className = "mlp-focus-dot"; pv.appendChild(dot);
        var hint = el("div", "padding:4px 2px 0; font-size:11px; color:var(--mlp-faint);", t("Кликни по картинке — эта точка останется в кадре."));
        function cur() { return setPosFor(idx, _focusZone) || (_focusZone === "editor" ? "50% 50%" : (_focusZone === "sidebar" ? "50% 100%" : "100% 100%")); }
        function paint() {
            // Сама картинка (или её уменьшенная копия), а не мини-превью 96x64 карточек — иначе
            // растянутое превью было пиксельным. Рамка повторяет пропорции кадра (высота до 150px),
            // поэтому клик по точке превью = та же точка картинки.
            var u = zoneUrl(idx, _focusZone);
            onImage(u, function (st) {
                if (!st || !st.ok) { pv.style.backgroundImage = "none"; return; }
                var src = st.small || u;
                if (st.thumb) pv.style.backgroundImage = cssUrl(st.thumb); // пока грузится полная — хоть что-то
                var im = new Image();
                im.onload = function () {
                    var k = im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1.6;
                    pv.style.aspectRatio = String(k);
                    pv.style.width = "min(100%, " + Math.round(150 * k) + "px)";
                    pv.style.backgroundImage = cssUrl(src);
                };
                im.src = src;
            });
            var p = cur().split(" ");
            // Точка у края (100%) не вылезает за рамку превью.
            dot.style.left = "clamp(7px, " + p[0] + ", calc(100% - 7px))";
            dot.style.top = "clamp(7px, " + p[1] + ", calc(100% - 7px))";
        }
        pv.addEventListener("click", function (e) {
            var r = pv.getBoundingClientRect();
            var x = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
            var y = Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 100);
            if (!cfg.setPos) cfg.setPos = {};
            if (!cfg.setPos[idx]) cfg.setPos[idx] = {};
            cfg.setPos[idx][_focusZone] = x + "% " + y + "%";
            paint(); apply();
        });
        var reset = el("span", "margin-left:8px; cursor:pointer; color:var(--mlbg-accent);", t("по центру"));
        reset.addEventListener("click", function () { if (cfg.setPos && cfg.setPos[idx]) delete cfg.setPos[idx][_focusZone]; paint(); apply(); });
        keyActivate(reset, t("Сбросить точку фокуса"));
        hint.appendChild(reset);
        box.appendChild(pv); box.appendChild(hint);
        paint();
        return box;
    }
    function makeAccentColor() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), t("Акцент")));
        var cur = getAccent();
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = cur;
        // HEX редактируемый: можно вписать/вставить #rrggbb, а не только тыкать в палитру.
        var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
        hex.type = "text"; hex.value = cur; hex.maxLength = 7; hex.setAttribute("aria-label", t("Акцент HEX"));
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
        // «из картинки»: берём доминирующий цвет фоновой картинки редактора набора как акцент.
        // У генеративного набора картинки нет (зона рисуется градиентом) — там кнопку не
        // показываем (иначе клик всегда упирался бы в «Не удалось взять цвет из картинки»).
        // Если в зону редактора подложена своя картинка (isGrad ложно), кнопка снова доступна.
        if (!isGrad(activeIndex(), "editor")) {
            var pick = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", t("из картинки"));
            pick.title = t("Взять акцент из фоновой картинки набора");
            pick.addEventListener("click", function () {
                onImage(zoneUrl(activeIndex(), "editor"), function (st) {
                    if (!st.ok || !st.accent) { toast(t("Не удалось взять цвет из картинки"), false); return; }
                    // Доминирующий цвет тёмной картинки сам бывает тёмным — на подложке набора он
                    // сольётся. Поднимаем светлоту до контраста 3:1 (порог WCAG для крупных
                    // элементов), сохраняя оттенок и цветность.
                    var acc = accentForContrast(st.accent, accentContrastRef(), 3);
                    setAccentValue(acc); ip.value = acc; hex.value = acc;
                    apply(); refreshPanel();
                    toast(t("Акцент из картинки: ") + acc);
                });
            });
            keyActivate(pick, t("Акцент из картинки"));
            wrap.appendChild(pick);
        }
        var d = infoDot(INFO.accent); if (d) wrap.appendChild(d);
        return wrap;
    }
    // ==== Дальтоник-безопасные акценты + проверка контраста ====
    // Быстрый выбор акцента из палитры Окабэ-Ито (различимой при основных типах дальтонизма) и
    // строка контраста акцента к тёмной подложке набора (WCAG): помогает не выбрать акцент,
    // который сольётся с фоном или будет плохо различим. Клик по образцу красит активный набор.
    var CB_SAFE = ["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7"];
    function makeAccentSafeUI() {
        var box = el("div", null);
        var head = el("div", ST.row);
        head.appendChild(el("span", mutedLabel(92, true), t("Палитры")));
        var d = infoDot(INFO.accent_safe); if (d) head.appendChild(d);
        box.appendChild(head);
        // Палитры акцента: из картинки набора (когда проба готова), Catppuccin и безопасные Окабэ-Ито.
        var pick = function (hex) { setAccentValue(hex); apply(); refreshPanel(); };
        var sw = makeSwatches([["Набор", []], ["Catppuccin", SWATCH_CATPPUCCIN], ["Безопасные", CB_SAFE]], getAccent(), pick);
        box.appendChild(sw);
        try {
            if (!isGrad(activeIndex(), "editor")) {
                onImage(zoneUrl(activeIndex(), "editor"), function (st) {
                    if (!st || !st.ok) return;
                    var cols = [].concat(st.accent ? [st.accent] : [], st.palette || []).map(function (c) { return accentForContrast(c, accentContrastRef(), 3); });
                    if (!cols.length) return;
                    var fresh = makeSwatches([["Набор", cols]], getAccent(), pick);
                    if (fresh.firstChild && sw.parentNode) sw.insertBefore(fresh.firstChild, sw.firstChild);
                });
            }
        } catch (e) {}
        // строка контраста: акцент против тёмной подложки набора
        var cr = 1; try { cr = contrastRatio(getAccent(), accentContrastRef()); } catch (e) {}
        var lvl = cr >= 7 ? "AAA" : cr >= 4.5 ? "AA" : cr >= 3 ? t("AA (крупный)") : t("низкий");
        var warn = cr < 3;
        box.appendChild(el("div", "padding:2px 3px; font-size:11px; color:" + (warn ? "#f38ba8" : "var(--mlp-muted,#a6adc8)") + ";",
            t("Контраст к фону: ") + cr.toFixed(1) + " (" + lvl + ")"));
        return box;
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
        selWrap.appendChild(el("span", mutedLabel(92), t("Зона")));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        ZONES.forEach(function (z) { var o = el("option", null, t(z[1])); o.value = z[0]; sel.appendChild(o); });
        selWrap.appendChild(sel);
        var zd = infoDot(INFO.img_zone); if (zd) selWrap.appendChild(zd);
        box.appendChild(selWrap);

        // вписывание фоновой картинки выбранной зоны: cover (заполнить) | contain (целиком)
        var fitWrap = el("div", ST.row);
        fitWrap.appendChild(el("span", mutedLabel(92), t("Вписывание")));
        var fitSel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        [["cover", "Заполнить (cover)"], ["contain", "Целиком (contain)"]].forEach(function (o) { var op = el("option", null, t(o[1])); op.value = o[0]; fitSel.appendChild(op); });
        fitSel.addEventListener("change", function () { if (!cfg.fit) cfg.fit = {}; cfg.fit[cur] = fitSel.value; apply(); });
        fitWrap.appendChild(fitSel);
        var fd = infoDot(INFO.img_fit); if (fd) fitWrap.appendChild(fd);
        box.appendChild(fitWrap);
        function refreshFit() { fitSel.value = (cfg.fit && cfg.fit[cur] === "contain") ? "contain" : "cover"; }

        // Свой путь картинки для выбранной зоны активного набора (cfg.setImg[idx][zone]).
        // Ключи зон здесь — cfg.imgfx ("side"), у SETS/setImg — "sidebar"; маппим через IMGZONE.
        var IMGZONE = { editor: "editor", side: "sidebar", panel: "panel" };
        var pathWrap = el("div", ST.row);
        pathWrap.appendChild(el("span", mutedLabel(92), t("Путь картинки")));
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
                get: function () { return cfg.imgfx[cur][key]; }, onInput: function (v) { cfg.imgfx[cur][key] = v; }, info: d[6],
                // дефолт зонозависимый: сбрасываем к DEFAULTS для ТЕКУЩЕЙ выбранной зоны (cur)
                def: function () { return DEFAULTS.imgfx[cur][key]; }
            });
            box.appendChild(w);
            return w._refresh;
        });

        function refresh() { refreshFit(); refreshPath(); rows.forEach(function (fn) { fn(); }); }
        sel.addEventListener("change", function () { cur = sel.value; refresh(); });
        refresh();
        return box;
    }
    // ===== Метр читаемости =====
    // Главный вопрос любого фона за кодом — «а читать-то можно?». Раньше на него отвечали
    // глазами и ползунком наугад. Здесь он отвечен числом: контраст цвета кода к РЕАЛЬНОЙ
    // подложке под ним (смесь темы и картинки в пропорции прозрачности), причём и в среднем,
    // и на самом светлом участке кадра — именно там код обычно и теряется. Кнопка «Исправить»
    // подбирает прозрачность этого набора так, чтобы худший участок дал 4.5:1 (порог WCAG AA).
    function makeReadabilityUI() {
        var box = el("div", "padding:3px 4px;");
        var row = el("div", ST.row);
        var lab = el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);");
        var btn = el("span", "flex:0 0 auto; padding:2px 8px; border-radius:6px; cursor:pointer; font-size:11px;" +
            " background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.35);", t("Исправить"));
        keyActivate(btn, t("Подобрать прозрачность фона ради читаемости кода"));
        function paint() {
            var r = null;
            try { r = readability(); } catch (e) {}
            if (r && r.off) { lab.textContent = t("Читаемость: фон выключен"); btn.hidden = true; return; }
            if (!r) { lab.textContent = t("Читаемость: нет данных (картинка ещё грузится)"); btn.hidden = true; return; }
            var good = r.worstRatio >= 4.5;
            lab.textContent = t("Читаемость кода") + ": " + r.ratio.toFixed(1) + ":1, " +
                t("худший участок") + " " + r.worstRatio.toFixed(1) + ":1" + (good ? "  " + t("— норма") : "");
            lab.style.color = good ? "var(--mlp-muted,#a6adc8)" : "#f38ba8";
            btn.hidden = good;
        }
        btn.addEventListener("click", function () {
            var v = null;
            try { v = fixReadability(4.5); } catch (e) {}
            if (v == null) { toast(t("Не удалось измерить читаемость")); return; }
            apply(); paint();
            toast(t("Прозрачность фона редактора для этого набора") + ": " + v.toFixed(2));
            try { refreshPanel(); } catch (e) {}
        });
        row.appendChild(lab); row.appendChild(btn);
        box.appendChild(row);
        box.appendChild(makeCheck("autoRead", "Адаптивный скрим"));
        paint();
        // Картинка могла ещё не догрузиться — обновим строку, когда метрики появятся.
        try {
            var url = zoneUrl(activeIndex(), "editor");
            if (url) onImage(url, function () { try { paint(); } catch (e) {} });
        } catch (e) {}
        return box;
    }

    // ==== Авто-бюджет производительности (cfg.perfGuard) ====
    // Тумблер: при устойчиво низком FPS автоматически приглушать тяжёлые эффекты (см. perf.js /
    // perfTick в widgets). Метка/подсказка переводятся централизованно в makeToggle.
    function makePerfGuardToggle() {
        return makeToggle(function () { return cfg.perfGuard !== false; },
            function (v) { cfg.perfGuard = v; apply(); }, "Авто-бюджет FPS", INFO.perf_guard);
    }
    // ==== Живой индикатор производительности ====
    // Показывает текущий FPS и активен ли эконом-режим (perf в widgets/extras.js). Раньше эффекты
    // «сами приглушались» без объяснения — теперь это видно. Обновляется раз в секунду, пока строка
    // в DOM (self-terminating: как только панель закрыта/пересобрана — интервал снимается).
    function makePerfStatus() {
        var line = el("div", "padding:3px 3px 0; font-size:10.5px; color:var(--mlp-faint,#6c7086);", "");
        function paint() {
            var txt;
            if (cfg.perfGuard === false) txt = t("Авто-бюджет FPS выключен — эффекты не приглушаются");
            else if (typeof perfShouldRun === "function" && !perfShouldRun()) txt = t("FPS не измеряется (нет тяжёлых эффектов)");
            else {
                var fps = Math.round((typeof perf !== "undefined" && perf.fps) ? perf.fps : 60);
                var save = !!(typeof perf !== "undefined" && perf.save);
                txt = t("Производительность: ~") + fps + t(" FPS · эконом-режим: ") + (save ? t("вкл") : t("выкл"));
                line.style.color = save ? "#f9e2af" : "var(--mlp-faint,#6c7086)";
            }
            line.textContent = txt;
        }
        paint();
        try {
            var id = setInterval(function () {
                if (!line.isConnected) { clearInterval(id); return; }
                paint();
            }, 1000);
        } catch (e) {}
        return line;
    }

    // Выбор стиля летящих частиц (cfg.partStyle). Категориальный — селект из PART_STYLES.
    // syncWidgets пересоздаёт частицы под новый стиль (см. ensureParticles).
    function makePartStyleSelect() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), t("Стиль частиц")));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        var cur = safePartStyle(cfg.partStyle);
        PART_STYLES.forEach(function (o) {
            var op = el("option", null, t(o[1])); op.value = o[0]; if (o[0] === cur) op.selected = true; sel.appendChild(op);
        });
        sel.addEventListener("change", function () { cfg.partStyle = safePartStyle(sel.value); apply(); });
        wrap.appendChild(sel);
        var d = infoDot(INFO.part_style); if (d) wrap.appendChild(d);
        return wrap;
    }

    // ===================== src/ui/controls-sys.js =====================
    // ===== Контролы вкладок «Терминал» и «Система» =====
    // Типографика терминала, язык панели, загрузчик и прозрачность окна, папка с картинками,
    // разрешение сетевых картинок, индикатор ветки и мастер-выключатель.

    // ==== Контролы секции «Терминал» (работают с cfg.term) ====
    function makeTermSelect() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(56), t("Шрифт")));
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
            get: function () { return cfg.term[key]; }, onInput: function (v) { cfg.term[key] = v; }, info: INFO["term_" + key],
            def: DEFAULTS.term[key]
        });
    }
    function makeTermColor(key, label) {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(56), t(label)));
        var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
        ip.type = "color"; ip.value = effTermColor(key); // пока не меняли — акцент набора
        var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
        hex.type = "text"; hex.value = effTermColor(key); hex.maxLength = 7; hex.setAttribute("aria-label", t(label) + " HEX");
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
        // Образцы: акцент набора + Catppuccin. Выделению нужна полупрозрачность, но hex её не
        // хранит — поэтому для него те же цвета, а читаемость даёт сам терминал.
        var box = el("div", null);
        box.appendChild(wrap);
        box.appendChild(makeSwatches([["", [getAccent()].concat(SWATCH_CATPPUCCIN)]], cfg.term[key], function (v) {
            cfg.term[key] = v; ip.value = v; hex.value = v; apply();
            try { var rows = box.querySelectorAll(".mlp-sw"); for (var i = 0; i < rows.length; i++) rows[i].classList.toggle("on", rows[i].title.toLowerCase() === v.toLowerCase()); } catch (e) {}
        }));
        return box;
    }

    // Поле «Папка плагина» (cfg.imgBase): база для относительных путей картинок набора.
    // Позволяет перенести плагин без правки исходника и пересборки. Пусто -> авто-путь (IMG),
    // показанный в placeholder. Значение уходит в url('...') через cssUrl (инъекция исключена).
    function makeImgBaseField() {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(92), t("Папка")));
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

    // Тумблер полоски-индикатора git-ветки (cfg.ambientBranch). ensureBranchStrip — из boot.js
    // (в общей области видимости после склейки), зовём для мгновенной реакции на переключение.
    function makeAmbientBranchToggle() {
        return makeToggle(function () { return !!cfg.ambientBranch; },
            function (v) { cfg.ambientBranch = v; apply(); try { ensureBranchStrip(); } catch (e) {} }, "Полоска-индикатор ветки", INFO.ambient_branch);
    }

    // ==== Язык интерфейса панели (cfg.lang) ====
    // Селект «Авто / Русский / English». Смена перестраивает панель (refreshPanel), чтобы все
    // подписи сразу перерисовались на новом языке. «Авто» — по языку интерфейса VS Code (uiLang).
    function makeLangSelect() {
        return makeSeg("Язык панели", LANGS,
            function () { return safeLang(cfg.lang); },
            function (v) { cfg.lang = safeLang(v); saveCfg(); try { updateLabel(); } catch (e) {} refreshPanel(); });
    }


    // ===== Загрузчик и настоящая прозрачность =====
    // Скрипт живёт внутри чужого расширения-загрузчика и сам в settings.json писать не может.
    // Поэтому здесь — честная картина («чем внедрено, готово ли окно к прозрачности») и кнопки,
    // которые кладут в буфер ровно тот кусок настроек, который нужно вставить.
    function makeLoaderUI() {
        var box = el("div", "padding:2px 4px;");
        var ld = { id: "custom-css", title: "Custom CSS and JS", sure: false, version: "" };
        try { ld = loaderKind(); } catch (e) {}
        var ready = false;
        try { ready = trueGlassReady(); } catch (e) {}
        var info = el("div", "font-size:11px; color:var(--mlp-muted,#a6adc8); line-height:1.55;");
        info.textContent = t("Загрузчик") + ": " + ld.title + (ld.version ? " " + ld.version : "") +
            (ld.sure ? "" : "  (" + t("определено косвенно") + ")");
        var glass = el("div", "font-size:11px; line-height:1.55; margin-top:2px; color:" + (ready ? "#a6e3a1" : "var(--mlp-muted,#a6adc8)") + ";");
        glass.textContent = ready
            ? t("Окно создано прозрачным — эффект «Настоящая прозрачность» покажет рабочий стол сквозь редактор.")
            : t("Окно непрозрачное. Настоящее стекло умеет только Custom UI Style: скопируй опции ниже в settings.json и перезапусти редактор.");
        var btns = el("div", "display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;");
        var b1 = makeIoBtn(t("Скопировать импорт"));
        b1.addEventListener("click", function () {
            var ok = false;
            try { ok = copyText(loaderImportSnippet()); } catch (e) {}
            toast(ok ? t("Скопировано в буфер — вставь в settings.json") : t("Не удалось скопировать"));
        });
        var b2 = makeIoBtn(t("Скопировать опции прозрачности"));
        b2.addEventListener("click", function () {
            var ok = false;
            try { ok = copyText(trueGlassSnippet()); } catch (e) {}
            toast(ok ? t("Скопировано в буфер — вставь в settings.json и перезапусти редактор") : t("Не удалось скопировать"));
        });
        // Через Moon Core импорт в settings.json не нужен: модуль встраивает ядро.
        if (ld.id !== "moon-core") btns.appendChild(b1);
        btns.appendChild(b2);
        box.appendChild(info); box.appendChild(glass); box.appendChild(btns);
        return box;
    }

    // ==== Мастер-выключатель фона и эффектов (cfg.enabled) ====
    // Заметный тумблер вверху панели: выкл — «ванильный» VS Code, настройки сохранены.
    function makeMasterToggle() {
        var on = cfg.enabled !== false;
        var row = el("label", null); row.className = "mlp-master" + (on ? "" : " off");
        var cb = el("input", null); cb.type = "checkbox"; cb.checked = on;
        var txt = el("span", null, on ? t("Фон и эффекты включены") : t("Фон и эффекты выключены"));
        cb.addEventListener("change", function () {
            cfg.enabled = cb.checked;
            txt.textContent = cb.checked ? t("Фон и эффекты включены") : t("Фон и эффекты выключены");
            row.className = "mlp-master" + (cb.checked ? "" : " off");
            apply();
        });
        row.appendChild(cb); row.appendChild(txt);
        var d = infoDot(INFO.enabled); if (d) row.appendChild(d);
        return row;
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
        // Класс нужен, чтобы тост можно было найти снаружи: генератор скриншотов убирает их
        // перед съёмкой (иначе уведомление ложится поверх панели), а тесты — проверяют текст.
        t.className = "mlbg-toast";
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
        toast(saved && copied ? t("Экспорт: файл сохранён + в буфере обмена")
            : saved ? t("Экспорт: файл сохранён") : copied ? t("Экспорт: скопировано в буфер") : t("Не удалось выгрузить"), (saved || copied));
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
            if (Array.isArray(p.library)) for (var li = 0; li < p.library.length; li++) if (typeof p.library[li] === "string" && isRemoteUrl(p.library[li])) n++;
        } catch (e) {}
        return n;
    }
    function importCfg() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
        inp.addEventListener("change", function () {
            var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
            // Конфиг весит килобайты — отсекаем заведомо чужие/огромные файлы до чтения в память.
            if (f.size > 256 * 1024) { toast(t("Файл слишком большой (>256 КБ)"), false); inp.remove(); return; }
            var rd = new FileReader();
            rd.onload = function () {
                try {
                    var parsed = safeParse(String(rd.result));
                    var remote = countRemoteImgs(parsed); // считаем ДО санитизации (сырой файл)
                    backupCfg(); // текущие настройки -> резерв, чтобы неудачный импорт можно было откатить
                    cfg = mergeForeign(parsed); // санитизация + сетевые картинки принудительно выкл (чужой файл сам их не включит)
                    syncGenSets(); // импортированные ген-наборы -> в список сразу (иначе видны только после перезапуска)
                    // Вернуть активный набор, если файл ссылался на свой ген-набор: mergeCfg зажал mode
                    // до syncGenSets (SETS ещё не был расширен), поэтому индекс ген-набора сбросился бы на 0.
                    if (parsed && typeof parsed.mode === "string" && /^\d+$/.test(parsed.mode) && parseInt(parsed.mode, 10) < SETS.length) cfg.mode = parsed.mode;
                    sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                    apply(); refreshPanel();
                    // Предупреждаем о сетевых ссылках на картинки в импортированном файле. Они
                    // всегда заблокированы (mergeForeign выключил «Разрешить сетевые картинки»),
                    // но пользователь должен знать, что кто-то пытался увести редактор в сеть.
                    if (remote > 0) {
                        toast(t("Импортировано. Заблокировано ") + remote + t(" сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику."), false);
                    } else {
                        toast(t("Настройки импортированы"));
                    }
                } catch (e) { toast(t("Ошибка: файл не читается как JSON"), false); }
                inp.remove();
            };
            rd.onerror = function () { toast(t("Не удалось прочитать файл"), false); inp.remove(); };
            rd.readAsText(f);
        });
        document.body.appendChild(inp); inp.click();
    }
    // Тёмная подложка набора: у grad — первый цвет палитры, у proc — base, у фото-набора
    // (картинку в тему не затащить) — выводим тёмный тон из оттенка акцента.
    function _setBaseBg(idx, ac) {
        var s = SETS[idx];
        if (s && s.grad && s.grad.length && isColor(s.grad[0])) return s.grad[0];
        if (s && s.proc && isColor(s.base)) return s.base;
        return hslToHex(_hueOf(ac), 0.28, 0.09);
    }
    // Транслитерация для ASCII-имени файла (имена наборов кириллические). Не идеал по ГОСТ —
    // достаточно для читаемого и портируемого имени; пусто -> вызывающий подставит индекс.
    var _TRANSLIT = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
        "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
        "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
    };
    function _slug(s) {
        s = String(s).toLowerCase(); var o = "";
        for (var i = 0; i < s.length; i++) { var c = s[i]; o += (_TRANSLIT[c] != null ? _TRANSLIT[c] : c); }
        return o.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    }

    // ===== История изменений (Undo / Redo) =====
    // Лёгкий сессионный стек снимков cfg (в памяти, не localStorage — это удобство сессии,
    // как panelTab/fxFilter). Снимок делаем по «осевшему» изменению: любое сохранение конфига
    // (saveCfg — единая точка и для apply, и для applyFade) дёргает scheduleHistory, а тот
    // с небольшой задержкой фиксирует состояние. Дребезг слайдера при перетаскивании в историю
    // не идёт (applyNoSave не сохраняет), поэтому одно движение ползунка = один шаг отмены.
    // Авто-смены набора (слайдшоу / по времени) в историю НЕ пишутся: _histSuppress лишь
    // сдвигает базовую точку, не создавая шага (иначе Undo откатывал бы тик слайдшоу).
    var _histUndo = [], _histRedo = [], _histLast = null, _histTimer = 0, _histSuppress = 0;
    var HIST_MAX = 50;
    function _histNow() { try { return JSON.stringify(cfg); } catch (e) { return null; } }
    function scheduleHistory() {
        var snap = _histNow();
        if (snap === null) return;
        if (_histLast === null || _histSuppress) { _histLast = snap; return; } // база / авто-смена — без шага
        if (_histTimer) { clearTimeout(_histTimer); _histTimer = 0; }
        _histTimer = setTimeout(commitHistory, 450);
    }
    function commitHistory() {
        _histTimer = 0;
        var snap = _histNow();
        if (snap === null || snap === _histLast) return; // ничего не изменилось с прошлой фиксации
        _histUndo.push(_histLast);
        if (_histUndo.length > HIST_MAX) _histUndo.shift();
        _histRedo.length = 0; // новая ветка правок — «повторить» сбрасывается
        _histLast = snap;
    }
    // Есть ли что отменять/повторять. Используются и в UI (вид кнопок), и в смоук-тесте.
    function canUndo() { return _histUndo.length > 0; }
    function canRedo() { return _histRedo.length > 0; }
    // Восстановить снимок: через ту же санитизацию, что и импорт (defense-in-depth), и подавляя
    // запись собственного apply() в историю (иначе восстановление плодило бы новый шаг).
    function _histApply(json) {
        cfg = mergeCfg(safeParse(json));
        _histLast = _histNow();
        if (_histTimer) { clearTimeout(_histTimer); _histTimer = 0; }
        _histSuppress++;
        try { apply(); } finally { _histSuppress--; }
        try { if (document.getElementById(PANEL_ID)) refreshPanel(); } catch (e) {}
    }
    function undo() {
        if (_histTimer) commitHistory();          // зафиксировать «осевшее» изменение перед отменой
        if (!_histUndo.length) { toast(t("Нечего отменять"), false); return; }
        _histRedo.push(_histLast);
        _histApply(_histUndo.pop());
        toast(t("Отменено"));
    }
    function redo() {
        if (!_histRedo.length) { toast(t("Нечего повторить"), false); return; }
        _histUndo.push(_histLast);
        _histApply(_histRedo.pop());
        toast(t("Повторено"));
    }
    // Кнопки «Отменить / Повторить» для вкладки «Система». Всегда активны: если стек пуст,
    // действие мягко сообщает тостом (проще, чем держать их вид в актуальном состоянии без
    // пересборки панели на каждый шаг). Хоткеи — Ctrl+Alt+Z / Ctrl+Alt+Y (boot.js).
    function makeHistoryUI() {
        var row = el("div", "display:flex; gap:8px; margin-top:8px;");
        // Отражаем доступность: счётчик шагов в подписи + приглушение пустой кнопки.
        // Панель пересобирается после undo/redo (см. _histApply -> refreshPanel), поэтому счётчики
        // всегда актуальны на момент открытия/после действия. Клик по пустой мягко тостит.
        var uN = _histUndo.length, rN = _histRedo.length;
        var uB = makeIoBtn("↶ Отменить" + (uN ? " (" + uN + ")" : ""));
        var rB = makeIoBtn("↷ Повторить" + (rN ? " (" + rN + ")" : ""));
        if (!canUndo()) uB.classList.add("off");
        if (!canRedo()) rB.classList.add("off");
        uB.addEventListener("click", function () { undo(); });
        rB.addEventListener("click", function () { redo(); });
        row.appendChild(uB); row.appendChild(rB);
        return row;
    }

    // Кнопка экспорта/импорта (одинаковый вид, разный обработчик навешивается снаружи).
    function makeIoBtn(text) {
        var b = el("div", null, t(text)); b.className = "mlp-btn"; // вид — panel-css.js (.mlp-btn)
        keyActivate(b, t(text));
        return b;
    }

    // Базовая точка истории = состояние на момент загрузки (cfg уже создан в config.js).
    // Без этого первое же изменение стало бы «базой» и не попало бы в Undo. saveCfg на старте
    // не вызывается, поэтому инициализируем явно здесь.
    try { _histLast = JSON.stringify(cfg); } catch (e) {}

    // ===================== src/ui/looks.js =====================
    // ===== Образы вида: профили, пресеты, обмен, синхронизация =====
    // «Образ» — это весь внешний вид одним объектом. Отсюда им управляют: готовые профили для
    // быстрого старта, именованные пресеты, короткий код для обмена и перенос через settings.json.
    // Здесь же предпросмотр образа по наведению: примерить, ничего не сохраняя.

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
        ip.type = "text"; ip.maxLength = 40; ip.placeholder = t("Имя пресета");
        var saveB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Сохранить"));
        function doSave() {
            var name = ip.value.trim().slice(0, 40);
            if (!name) { toast(t("Введите имя пресета"), false); return; }
            var cur = loadPresets();
            if (!(name in cur) && Object.keys(cur).length >= PRESETS_MAX) { toast(t("Слишком много пресетов (макс. ") + PRESETS_MAX + ")", false); return; }
            var snap = clone(cfg); delete snap.ui; // положение/свёрнутость панели не входят в пресет
            cur[name] = snap; savePresets(cur);
            ip.value = "";
            toast(t("Пресет «") + name + t("» сохранён"));
            refreshPanel();
        }
        saveB.addEventListener("click", doSave);
        keyActivate(saveB, t("Сохранить пресет"));
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSave(); } });
        saveRow.appendChild(ip); saveRow.appendChild(saveB);
        var sd = infoDot(INFO.presets); if (sd) saveRow.appendChild(sd);
        box.appendChild(saveRow);

        // список сохранённых пресетов: клик по строке — применить, «×» — удалить
        var presets = loadPresets(), names = Object.keys(presets);
        if (!names.length) {
            box.appendChild(emptyState("Пресетов пока нет — сохрани текущий вид под именем."));
        } else {
            var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
            names.forEach(function (name) {
                var row = el("div", "display:flex; align-items:center; gap:6px; padding:5px 7px; border-radius:7px; cursor:pointer; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
                // Превью пресета при наведении: показывает слой «эффекты + палитра».
                var doPrev = (function (nm) { return function () { previewLook(function (snap) { return presetPreviewCfg(snap, presets[nm]); }); }; })(name);
                row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; doPrev(); });
                row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; endLookPreview(); });
                row.addEventListener("focus", doPrev);
                row.addEventListener("blur", function () { endLookPreview(); });
                row.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mlp-fg,#cdd6f4);", name));
                var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8);", "×");
                del.title = t("Удалить пресет");
                row.appendChild(del);
                row.addEventListener("click", function (e) {
                    if (del.contains(e.target)) return; // клик по «×» обрабатывается отдельно
                    endLookPreview();                    // снять превью, дальше — реальное применение
                    var cur = loadPresets(); if (!(name in cur)) return;
                    var keepUi = cfg.ui;                // пресет меняет дизайн, не трогая положение панели
                    backupCfg();                        // прежний вид -> резерв (можно откатить применение пресета)
                    cfg = mergeForeign(cur[name]); cfg.ui = keepUi; // сетевые картинки не включаем из пресета
                    syncGenSets();                      // ген-наборы пресета -> в список сразу
                    if (typeof cur[name].mode === "string" && /^\d+$/.test(cur[name].mode) && parseInt(cur[name].mode, 10) < SETS.length) cfg.mode = cur[name].mode;
                    sessionRandomIndex = null;          // random переберётся под новый конфиг
                    apply(); refreshPanel();
                    toast(t("Пресет «") + name + t("» применён"));
                });
                keyActivate(row, t("Применить пресет ") + name);
                del.addEventListener("click", function (e) {
                    e.stopPropagation();
                    var cur = loadPresets(); delete cur[name]; savePresets(cur);
                    toast(t("Пресет «") + name + t("» удалён"));
                    refreshPanel();
                });
                keyActivate(del, t("Удалить пресет ") + name);
                list.appendChild(row);
            });
            box.appendChild(list);
        }
        return box;
    }

    // ===== Профили быстрого старта =====
    // Накладывает patch профиля (PROFILES из config.js) ПОВЕРХ текущего конфига: трогает только
    // внешний вид, а выбранный набор/картинки/привязки/язык сохраняются. Идёт через backupCfg
    // (можно откатить «Восстановить») и mergeCfg (санитизация после наложения).
    function applyProfile(id) {
        var p = profileById(id); if (!p) { toast(t("Не удалось создать набор"), false); return; }
        backupCfg();                       // текущий вид -> резерв (профиль можно откатить)
        var raw = clone(cfg);              // стартуем от текущего конфига — сохраняем набор/картинки/язык/ui
        var patch = p.patch, k;
        for (k in patch) {
            if (!patch.hasOwnProperty(k)) continue;
            if ((k === "fx" || k === "fxp" || k === "baseOp") && raw[k] && typeof raw[k] === "object") {
                for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk)) raw[k][kk] = patch[k][kk]; // слить по полям
            } else raw[k] = patch[k];
        }
        cfg = mergeCfg(raw);               // санитизация после наложения (в т.ч. clamp яркостей/сил)
        syncGenSets();                     // ген-наборы текущего конфига остаются в хвосте SETS
        apply(); refreshPanel();
        toast(t("Профиль применён: ") + t(p.name));
    }
    // Совпадает ли текущий вид с профилем: все ключи патча профиля равны текущим значениям cfg.
    // Патч трогает enabled/partStyle и по-полям fx/fxp/baseOp — сравниваем ровно эти поля.
    function profileMatches(p) {
        try {
            var patch = p.patch, k;
            for (k in patch) {
                if (!patch.hasOwnProperty(k)) continue;
                if (k === "fx" || k === "fxp" || k === "baseOp") {
                    for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk) && cfg[k][kk] !== patch[k][kk]) return false;
                } else if (cfg[k] !== patch[k]) return false;
            }
            return true;
        } catch (e) { return false; }
    }
    // Какой профиль сейчас «активен» (вид точно соответствует его патчу) — или null (правили вручную).
    function activeProfileId() {
        for (var i = 0; i < PROFILES.length; i++) if (profileMatches(PROFILES[i])) return PROFILES[i].id;
        return null;
    }

    // ===== Предпросмотр целого образа при наведении =====
    // Наведение на профиль/пресет временно применяет его вид (applyNoSave — без записи в
    // localStorage и без шага истории), уход курсора / потеря фокуса — откат к снимку. Так образ
    // можно «примерить», не боясь потерять текущий вид. Дебаунс — как у previewSet/previewFx.
    // Клик фиксирует выбор через endLookPreview ДО реального применения (иначе mouseleave откатил бы).
    var _lookSnap = null, _lookTimer = 0, _lookDelay = 110;
    function previewLook(build) {
        if (!cfg.enabled) return;                 // фон выключен — превью не видно, не дёргаем CSS
        if (_lookTimer) clearTimeout(_lookTimer);
        _lookTimer = setTimeout(function () {
            _lookTimer = 0;
            if (_lookSnap === null) _lookSnap = clone(cfg);
            var next; try { next = build(_lookSnap); } catch (e) { next = null; }
            if (!next) return;
            cfg = next; applyNoSave();
        }, _lookDelay);
    }
    function endLookPreview() {
        if (_lookTimer) { clearTimeout(_lookTimer); _lookTimer = 0; }
        if (_lookSnap === null) return;
        cfg = _lookSnap; _lookSnap = null; applyNoSave();
    }
    // Образ-конфиг для превью профиля: как applyProfile, но без backup/save/syncGenSets — набор,
    // картинки, ui и genSets берём из снимка (превью не свапает фон и не переставляет SETS).
    function profilePreviewCfg(snap, p) {
        var raw = clone(snap), patch = p.patch, k;
        for (k in patch) {
            if (!patch.hasOwnProperty(k)) continue;
            if ((k === "fx" || k === "fxp" || k === "baseOp") && raw[k] && typeof raw[k] === "object") {
                for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk)) raw[k][kk] = patch[k][kk];
            } else raw[k] = patch[k];
        }
        return mergeCfg(raw);
    }
    // Образ-конфиг для превью пресета: применяем сохранённый вид, но НАБОР/картинки/ui/genSets
    // оставляем текущими — превью показывает слой «эффекты + сила + палитра», не свапая фон
    // и не трогая SETS (полное применение пресета делает клик).
    function presetPreviewCfg(snap, presetObj) {
        var next = mergeForeign(presetObj);
        next.ui = snap.ui; next.genSets = snap.genSets; next.mode = snap.mode;
        next.setImg = snap.setImg; next.imgBase = snap.imgBase; next.library = snap.library;
        return next;
    }
    // UI секции «Профили»: пять карточек-кнопок с названием и коротким описанием. Клик — применить.
    // Активный профиль подсвечен акцентной рамкой и помечен «✓ активен», чтобы было
    // видно, с какого пресета начат вид; после ручных правок ни один не активен (профиль «изменён»).
    function makeProfilesUI() {
        var box = el("div", null);
        var active = activeProfileId();
        box.appendChild(el("div", "padding:2px 3px 6px; color:var(--mlp-faint,#6c7086); font-size:11px;",
            t("Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.") +
            (active ? "" : "  " + t("(сейчас: изменён вручную)"))));
        var list = el("div", "display:flex; flex-direction:column; gap:5px;");
        PROFILES.forEach(function (p) {
            var on = (p.id === active);
            var baseBg = on ? "rgba(var(--mlbg-accent-rgb),0.18)" : "rgba(var(--mlbg-accent-rgb),0.08)";
            var row = el("div", "padding:7px 9px; border-radius:8px; cursor:pointer; background:" + baseBg + "; border:1px solid " + (on ? "rgba(var(--mlbg-accent-rgb),0.5)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))") + ";");
            var doPrev = (function (pr) { return function () { previewLook(function (snap) { return profilePreviewCfg(snap, pr); }); }; })(p);
            row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.24)"; doPrev(); });
            row.addEventListener("mouseleave", function () { row.style.background = baseBg; endLookPreview(); });
            row.addEventListener("focus", doPrev);
            row.addEventListener("blur", function () { endLookPreview(); });
            var nameRow = el("div", "display:flex; align-items:center; gap:6px; margin-bottom:2px;");
            nameRow.appendChild(el("div", "flex:1 1 auto; font-weight:600; color:var(--mlp-fg,#cdd6f4);", t(p.name)));
            if (on) nameRow.appendChild(el("div", "flex:0 0 auto; font-size:10px; color:var(--mlbg-accent);", t("✓ активен")));
            row.appendChild(nameRow);
            row.appendChild(el("div", "font-size:10.5px; line-height:1.4; color:var(--mlp-muted,#a6adc8);", t(p.desc)));
            row.addEventListener("click", function () { endLookPreview(); applyProfile(p.id); }); // снять превью, затем применить набело
            keyActivate(row, t("Применить профиль") + ": " + t(p.name) + (on ? " (" + t("активен") + ")" : ""));
            list.appendChild(row);
        });
        box.appendChild(list);
        return box;
    }

    // Восстановление из авто-резерва: возвращает конфиг, бывший до последней замены
    // (импорт/сброс/пресет). Текущий cfg при этом сам уходит в резерв — поэтому «Восстановить»
    // работает как переключатель между «до» и «после» (нажал не туда — нажми ещё раз).
    function restoreBackup() {
        var b = readBackup();
        if (!b) { toast(t("Резерва нет"), false); return; }
        backupCfg();                 // текущее -> резерв (обратный откат тем же действием)
        cfg = b; syncGenSets(); sessionRandomIndex = null; // хвост SETS под ген-наборы восстановленного конфига
        apply(); refreshPanel();
        toast(t("Восстановлены прежние настройки"));
    }

    // ===== Шаринг образа коротким кодом =====
    // Кодируем ТОЛЬКО «внешний вид» (без картинок, путей и личных привязок) в компактный
    // base64-код, которым удобно поделиться. Применение чужого кода идёт через mergeCfg (та же
    // санитизация, что и импорт), а машинно-зависимое (свои картинки, путь плагина, привязки к
    // проектам) сохраняется от текущего конфига — чужой код их не трогает.
    var SHARE_KEYS = ["mode", "accent", "setAccent", "setName", "baseOp", "setOp",
        "fx", "fxp", "imgfx", "fit", "term", "slideshow", "autoTime", "autoDim", "enabled", "partStyle"];
    // не трогаем при применении кода: машинно-зависимое (свои картинки, путь плагина, привязки к
    // проектам) + согласие на сетевые картинки (allowRemoteImages) — оно личное, как setImg/imgBase;
    // иначе применение чужого кода образа тихо отключало бы собственные удалённые картинки пользователя.
    // genSets тоже личные (сгенерированные пользователем наборы) и в код образа не входят (SHARE_KEYS);
    // без сохранения их mergeCfg(o) обнулил бы — и генеративные наборы пропали бы при применении чужого кода.
    var SHARE_KEEP = ["ui", "imgBase", "workspaceSets", "autoWorkspace", "ambientBranch", "setImg", "allowRemoteImages", "genSets",
        "branchSets", "autoBranch", "langSets", "autoLang", "library", "librarySlideshow"];
    // UTF-8-безопасный base64 (в именах наборов бывает кириллица — «сырой» btoa на ней падает).
    function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ""; } }
    function b64dec(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return ""; } }
    // Снимок образа (SHARE_KEYS) — общий для кода «Поделиться» и профилей вида Moon Core.
    function lookSnapshot() {
        var o = {};
        for (var i = 0; i < SHARE_KEYS.length; i++) { var k = SHARE_KEYS[i]; if (k in cfg) o[k] = JSON.parse(JSON.stringify(cfg[k])); }
        return o;
    }
    function shareEncode() { return b64enc(JSON.stringify(lookSnapshot())); }
    function shareDecode(code) {
        var json = b64dec(String(code).trim()); if (!json) return null;
        try { var o = safeParse(json); return (o && typeof o === "object") ? o : null; } catch (e) { return null; }
    }
    // Применить образ из объекта (SHARE_KEYS): всё через mergeCfg, машинно-зависимое (SHARE_KEEP)
    // остаётся своим. Текущий конфиг уходит в резерв — применение можно откатить.
    function applyLook(o) {
        if (!o || typeof o !== "object") return false;
        backupCfg(); // текущее -> резерв (применение чужого кода можно откатить)
        var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
        cfg = mergeCfg(o); // санитизация всего содержимого
        for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // вернуть машинно-зависимое (в т.ч. genSets)
        syncGenSets(); // хвост SETS под сохранённые ген-наборы (genSets вернулись из keep); заодно зажмёт mode на чужой ген-индекс
        sessionRandomIndex = null;
        apply();
        try { if (document.getElementById(PANEL_ID)) refreshPanel(); } catch (e) { logErr("панель после образа", e); }
        return true;
    }
    function applyShareCode(code) {
        var o = shareDecode(code);
        if (!o) { toast(t("Код не распознан"), false); return false; }
        applyLook(o);
        toast(t("Образ применён из кода"));
        return true;
    }

    // ===== Профили вида Moon Core =====
    // Профиль Moon Core (раскладка интерфейса, скрытые элементы, настройки VS Code) может нести
    // и образ фона: при сохранении профиля ядро берёт lookSnapshot(), при применении — отдаёт его
    // обратно. Так «Только код» для markdown может заодно включать спокойный фон, а профиль по
    // ветке — свой набор. Без Moon Core ничего не делает.
    function registerMoonCoreProfile() {
        if (!_viaMoonCore) return false;
        var m = mooncoreModule();
        if (!m || typeof m.profile !== "function") return false;
        return m.profile({
            save: function () { return lookSnapshot(); },
            apply: function (o, name) {
                if (applyLook(o)) { try { toast(t("Фон из профиля") + (name ? " «" + name + "»" : "")); } catch (e) {} }
            }
        });
    }

    // Секция «Поделиться»: копировать код текущего образа + поле для чужого кода и «Применить».
    function makeShareUI() {
        var box = el("div", null);
        var copyB = makeIoBtn("Скопировать код образа");
        copyB.style.marginBottom = "6px";
        copyB.addEventListener("click", function () {
            var code = shareEncode();
            toast(code && copyText(code) ? t("Код образа скопирован в буфер") : t("Не удалось сформировать код"), !!code);
        });
        box.appendChild(copyB);
        var row = el("div", ST.row);
        var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
        ip.type = "text"; ip.placeholder = t("Вставь код образа"); ip.maxLength = 8192;
        var applyB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Применить"));
        function doApply() { if (applyShareCode(ip.value)) ip.value = ""; }
        applyB.addEventListener("click", doApply);
        keyActivate(applyB, t("Применить код образа"));
        ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doApply(); } });
        row.appendChild(ip); row.appendChild(applyB);
        var d = infoDot(INFO.share_code); if (d) row.appendChild(d);
        box.appendChild(row);
        return box;
    }

    // ===== Синхронизация через settings.json =====
    // custom-bg.js хранит конфиг в localStorage конкретной машины — он не переносится и не едет
    // через Settings Sync. Мост: компаньон-расширение читает объект-настройку moonlightBg.config
    // из settings.json (а он синхронизируется) и прокидывает его сюда как window.__MLBG_SEED__.
    // На новой машине с пустым localStorage этот seed становится отправным конфигом (см. loadCfg).
    // Синхронизация между машинами без копирования строк: компаньон хранит образ в своём
    // globalState с setKeysForSync — его переносит встроенный Settings Sync VS Code. После
    // каждой правки (с паузой) образ уходит в компаньон; при старте более новый образ с другой
    // машины применяется. Машинно-зависимое (SHARE_KEEP: пути, папки, библиотека) не едет.
    var SYNC_T_KEY = "moonlight-bg-sync-t", _syncTimer = 0;
    function syncSnapshot() {
        var o = JSON.parse(JSON.stringify(cfg));
        SHARE_KEEP.forEach(function (k) { delete o[k]; });
        return o;
    }
    function scheduleSyncPush() {
        if (!cfg.ui || !cfg.ui.sync || !_viaMoonCore) return;
        if (_syncTimer) clearTimeout(_syncTimer);
        _syncTimer = setTimeout(function () {
            _syncTimer = 0;
            var tNow = Date.now();
            mlbgRpc("syncSet", { t: tNow, cfg: syncSnapshot() }).then(function () {
                try { localStorage.setItem(SYNC_T_KEY, String(tNow)); } catch (e) {}
            }, function (e) { logErr("синхронизация", e); });
        }, 3000);
    }
    function syncPull(quiet) {
        return mlbgRpc("syncGet").then(function (r) {
            if (!r || !r.cfg || typeof r.t !== "number") { if (!quiet) toast(t("На других машинах ещё нет синхронизированного вида")); return; }
            var mine = 0; try { mine = Number(localStorage.getItem(SYNC_T_KEY)) || 0; } catch (e) {}
            if (r.t <= mine) { if (!quiet) toast(t("Здесь уже самый свежий вид")); return; }
            var keep = {}; SHARE_KEEP.forEach(function (k) { keep[k] = cfg[k]; });
            cfg = mergeCfg(r.cfg);
            SHARE_KEEP.forEach(function (k) { cfg[k] = keep[k]; });
            try { localStorage.setItem(SYNC_T_KEY, String(r.t)); } catch (e) {}
            syncGenSets(); sessionRandomIndex = null;
            _histSuppress++; try { apply(); } finally { _histSuppress--; }
            if (document.getElementById(PANEL_ID)) refreshPanel();
            toast(t("Вид подтянут с другой машины"));
        });
    }
    // Прежний способ — база в settings.json («moonlightBg.config»): если она есть, её можно загрузить.
    function applySeed() {
        var o = seedConfig();
        if (!o) { toast(t("Базовый конфиг из settings.json не найден (нужно расширение-компаньон)"), false); return; }
        backupCfg(); // текущее -> резерв (загрузку базы можно откатить)
        var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
        cfg = mergeCfg(o);
        for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // машинно-зависимое оставляем своё
        syncGenSets(); sessionRandomIndex = null;
        apply(); refreshPanel();
        toast(t("Загружено из settings.json"));
    }
    function makeSyncUI() {
        var box = el("div", null);
        box.appendChild(makeToggle(function () { return !!cfg.ui.sync; }, function (v) {
            cfg.ui.sync = v; saveCfg();
            if (v) { scheduleSyncPush(); toast(t("Вид будет переезжать на другие машины через Settings Sync")); }
        }, "Синхронизировать между машинами", INFO.sync));
        if (cfg.ui.sync) {
            var pull = makeIoBtn("Подтянуть вид с другой машины");
            pull.addEventListener("click", function () { syncPull(false).then(null, function (e) { toast(t("Не удалось: ") + e.message, false); }); });
            box.appendChild(pull);
        }
        if (seedConfig()) {
            var loadB = makeIoBtn("Загрузить базу из settings.json");
            loadB.style.marginTop = "6px";
            loadB.addEventListener("click", applySeed);
            box.appendChild(loadB);
        }
        return box;
    }

    // ===================== src/ui/theme-export.js =====================
    // ===== Как строится тема =====
    // Палитра активного набора -> настоящий color-theme.json. Нужен там, где фон недоступен
    // (веб, Codespaces, чужая машина): цвета интерфейса и подсветка синтаксиса переносятся,
    // даже когда картинку показать нельзя.

    // ===== Экспорт цветовой темы VS Code =====
    // Из палитры активного набора (подложка + акцент) собираем НАСТОЯЩУЮ VS Code color-theme.json:
    // согласованный тёмный набор цветов воркбенча + подсветка синтаксиса. Ценность — «вид живёт
    // и там, где custom-css недоступен»: тема грузится в vscode.dev, по SSH/в Codespaces, находится
    // поиском тем. Ничего сетевого/личного в файл не попадает: только цвета, выведенные из набора.
    //
    // Как использовать (см. INFO.theme_export): (1) цвета можно вставить в settings.json под
    // "workbench.colorCustomizations" / "editor.tokenColorCustomizations" — применится сразу без
    // упаковки; (2) сам файл — положить в themes/ своего theme-расширения (тогда тема ставится и
    // находится поиском, работает там, где custom-css нет).
    //
    // Все цвета выводятся детерминированно из акцента набора существующими хелперами палитры
    // (hexToRgbArr/rgbToHsl/hslToHex/shadeHex/rotateHue из css.js — они в общей области IIFE),
    // поэтому один и тот же набор всегда даёт одну и ту же тему.

    // hex + альфа (0..1) -> #rrggbbaa (VS Code принимает 8-значный hex в colors).
    function _hexA(hex, a) {
        var v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16);
        return hex + (v.length < 2 ? "0" + v : v);
    }
    // Оттенок (0..1) акцента — основа тонированных нейтралей темы.
    function _hueOf(hex) { return rgbToHsl.apply(null, hexToRgbArr(hex))[0]; }
    // Акцент произвольного набора (как getAccent, но по индексу): правка пользователя ->
    // «родной» акцент набора -> глобальный. Тема строится под конкретный набор.
    function _setAccent(idx) {
        var o = cfg.setAccent && cfg.setAccent[idx];
        if (isColor(o)) return o;
        var s = SETS[idx];
        if (s && isColor(s.accent)) return s.accent;
        return safeColor(cfg.accent, DEFAULTS.accent);
    }
    // Собрать объект color-theme.json для набора idx. Возвращает { name, obj }.
    function buildColorTheme(idx) {
        if (typeof idx !== "number" || idx < 0 || idx >= SETS.length) idx = activeIndex();
        var ac = _setAccent(idx);
        var bg = _setBaseBg(idx, ac);
        var h = _hueOf(ac);
        // Нейтрали, чуть тонированные в оттенок акцента (низкая насыщенность — интерфейс спокойный).
        var bgDark = shadeHex(bg, -0.28);              // актив-бар / статусбар / титлбар (темнее)
        var bgSide = shadeHex(bg, -0.12);              // сайдбар / панель / неактивные вкладки
        var bgLift = shadeHex(bg, 0.08);               // поля/дропдауны/виджеты (светлее)
        var border = shadeHex(bg, 0.16);               // границы/направляющие
        var fg = hslToHex(h, 0.14, 0.86);              // основной текст
        var fgMut = hslToHex(h, 0.10, 0.62);           // приглушённый текст
        var fgDim = hslToHex(h, 0.08, 0.44);           // номера строк / комментарии / whitespace
        // Акценты подсветки синтаксиса — повороты оттенка (rotateHue нормализует S/L в читаемые).
        var kw = ac;                                   // ключевые слова / теги
        var str = rotateHue(ac, 0.33);                 // строки
        var fn = rotateHue(ac, -0.33);                 // функции
        var typ = rotateHue(ac, -0.12);                // типы/классы
        var num = rotateHue(ac, 0.5);                  // числа/константы
        var attr = rotateHue(ac, 0.12);                // атрибуты/свойства
        var err = "#f38ba8", warn = "#f9e2af", good = "#a6e3a1"; // диагностика — фиксированные (узнаваемые)

        var colors = {
            "focusBorder": _hexA(ac, 0.5),
            "foreground": fgMut,
            "widget.shadow": "#00000066",
            "selection.background": _hexA(ac, 0.34),
            "descriptionForeground": fgMut,
            "errorForeground": err,
            "textLink.foreground": ac,
            "textLink.activeForeground": shadeHex(ac, 0.16),

            "editor.background": bg,
            "editor.foreground": fg,
            "editorLineNumber.foreground": fgDim,
            "editorLineNumber.activeForeground": ac,
            "editorCursor.foreground": ac,
            "editor.selectionBackground": _hexA(ac, 0.32),
            "editor.selectionHighlightBackground": _hexA(ac, 0.16),
            "editor.wordHighlightBackground": _hexA(ac, 0.16),
            "editor.wordHighlightStrongBackground": _hexA(ac, 0.24),
            "editor.findMatchBackground": _hexA(ac, 0.45),
            "editor.findMatchHighlightBackground": _hexA(ac, 0.22),
            "editor.lineHighlightBackground": _hexA(shadeHex(bg, 0.12), 0.4),
            "editorIndentGuide.background1": border,
            "editorIndentGuide.activeBackground1": _hexA(ac, 0.6),
            "editorWhitespace.foreground": fgDim,
            "editorBracketMatch.background": _hexA(ac, 0.16),
            "editorBracketMatch.border": _hexA(ac, 0.6),
            "editorError.foreground": err,
            "editorWarning.foreground": warn,
            "editorInfo.foreground": ac,
            "editorGutter.modifiedBackground": attr,
            "editorGutter.addedBackground": good,
            "editorGutter.deletedBackground": err,

            "editorWidget.background": bgLift,
            "editorWidget.border": border,
            "editorSuggestWidget.background": bgLift,
            "editorSuggestWidget.selectedBackground": _hexA(ac, 0.24),
            "editorHoverWidget.background": bgLift,
            "editorHoverWidget.border": border,
            "peekViewEditor.background": bg,
            "peekViewResult.background": bgSide,

            "sideBar.background": bgSide,
            "sideBar.foreground": fgMut,
            "sideBar.border": border,
            "sideBarTitle.foreground": fg,
            "sideBarSectionHeader.background": bgSide,
            "sideBarSectionHeader.foreground": fg,

            "activityBar.background": bgDark,
            "activityBar.foreground": ac,
            "activityBar.inactiveForeground": fgDim,
            "activityBar.border": border,
            "activityBarBadge.background": ac,
            "activityBarBadge.foreground": bg,
            "activityBar.activeBorder": ac,

            "titleBar.activeBackground": bgDark,
            "titleBar.activeForeground": fg,
            "titleBar.inactiveBackground": bgDark,
            "titleBar.inactiveForeground": fgDim,
            "titleBar.border": border,

            "statusBar.background": bgDark,
            "statusBar.foreground": fgMut,
            "statusBar.border": border,
            "statusBar.noFolderBackground": bgDark,
            "statusBar.debuggingBackground": ac,
            "statusBar.debuggingForeground": bg,
            "statusBarItem.remoteBackground": ac,
            "statusBarItem.remoteForeground": bg,

            "tab.activeBackground": bg,
            "tab.inactiveBackground": bgSide,
            "tab.activeForeground": fg,
            "tab.inactiveForeground": fgDim,
            "tab.activeBorderTop": ac,
            "tab.activeBorder": _hexA(ac, 0.7),
            "tab.border": bgDark,
            "editorGroupHeader.tabsBackground": bgSide,
            "editorGroupHeader.tabsBorder": border,
            "editorGroup.border": border,

            "panel.background": bgSide,
            "panel.border": border,
            "panelTitle.activeForeground": fg,
            "panelTitle.inactiveForeground": fgDim,
            "panelTitle.activeBorder": ac,

            "terminal.background": bg,
            "terminal.foreground": fg,
            "terminalCursor.foreground": ac,

            "button.background": ac,
            "button.foreground": bg,
            "button.hoverBackground": shadeHex(ac, 0.14),
            "badge.background": ac,
            "badge.foreground": bg,
            "progressBar.background": ac,

            "input.background": bgLift,
            "input.foreground": fg,
            "input.border": border,
            "input.placeholderForeground": fgDim,
            "inputOption.activeBorder": ac,
            "inputOption.activeBackground": _hexA(ac, 0.24),
            "dropdown.background": bgLift,
            "dropdown.foreground": fg,
            "dropdown.border": border,
            "quickInput.background": bgLift,
            "quickInput.foreground": fg,
            "quickInputList.focusBackground": _hexA(ac, 0.24),

            "list.activeSelectionBackground": _hexA(ac, 0.28),
            "list.activeSelectionForeground": fg,
            "list.inactiveSelectionBackground": _hexA(ac, 0.16),
            "list.hoverBackground": _hexA(shadeHex(bg, 0.14), 0.5),
            "list.focusBackground": _hexA(ac, 0.28),
            "list.highlightForeground": ac,

            "scrollbarSlider.background": _hexA(ac, 0.22),
            "scrollbarSlider.hoverBackground": _hexA(ac, 0.38),
            "scrollbarSlider.activeBackground": _hexA(ac, 0.55),

            "gitDecoration.modifiedResourceForeground": attr,
            "gitDecoration.untrackedResourceForeground": good,
            "gitDecoration.deletedResourceForeground": err,

            "minimap.selectionHighlight": _hexA(ac, 0.5),
            "breadcrumb.foreground": fgDim,
            "breadcrumb.focusForeground": fg,
            "breadcrumb.activeSelectionForeground": ac
        };

        // TextMate-подсветка: общие скоупы -> выведенные акценты. semanticHighlighting=true
        // разрешает семантическую подсветку темы (LSP-токены), поверх этих scope-правил.
        function tc(scope, color, style) {
            var s = { scope: scope, settings: { foreground: color } };
            if (style) s.settings.fontStyle = style;
            return s;
        }
        var tokenColors = [
            tc(["comment", "punctuation.definition.comment"], fgDim, "italic"),
            tc(["string", "string.quoted", "string.template"], str),
            tc(["constant.numeric", "constant.language", "constant.character", "constant.other"], num),
            tc(["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new"], kw),
            tc(["keyword.operator", "punctuation", "meta.brace"], fgMut),
            tc(["entity.name.function", "support.function", "meta.function-call.generic"], fn),
            tc(["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], typ),
            tc(["variable", "variable.other", "meta.definition.variable.name"], fg),
            tc(["variable.parameter", "variable.other.readwrite"], fg),
            tc(["variable.language", "variable.other.constant", "support.variable"], num),
            tc(["entity.name.tag", "punctuation.definition.tag"], kw),
            tc(["entity.other.attribute-name", "meta.object-literal.key", "support.type.property-name"], attr),
            tc(["markup.heading", "entity.name.section"], kw, "bold"),
            tc(["markup.bold"], num, "bold"),
            tc(["markup.italic"], str, "italic"),
            tc(["markup.inline.raw", "markup.fenced_code"], fn),
            tc(["markup.inserted"], good),
            tc(["markup.deleted"], err),
            tc(["invalid", "invalid.illegal"], err)
        ];

        var name = "MoonLight " + (setName(idx) || ("Набор " + idx));
        return {
            name: name,
            obj: {
                "$schema": "vscode://schemas/color-theme",
                name: name,
                type: "dark",
                semanticHighlighting: true,
                colors: colors,
                tokenColors: tokenColors
            }
        };
    }

    // Экспорт темы активного набора: скачать color-theme.json + положить в буфер (как exportCfg).
    function exportTheme() {
        var idx = activeIndex();
        var th = buildColorTheme(idx); // не «t»: имя t занято функцией перевода (i18n)
        var json = JSON.stringify(th.obj, null, 2);
        var fname = "moonlight-" + (_slug(setName(idx)) || ("set-" + idx)) + "-color-theme.json";
        var saved = false;
        try {
            var blob = new Blob([json], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a"); a.href = url; a.download = fname;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            saved = true;
        } catch (e) {}
        var copied = copyText(json);
        toast(saved && copied ? (t("Тема «") + th.name + t("» сохранена в файл + в буфере"))
            : saved ? t("Тема сохранена в файл") : copied ? t("Тема скопирована в буфер") : t("Не удалось выгрузить тему"), (saved || copied));
    }

    // Секция «Экспорт темы»: одна кнопка — тема активного набора. Имя набора показываем,
    // чтобы было понятно, ЧТО именно выгрузится (тема строится под текущий набор).
    function makeThemeExportUI() {
        var box = el("div", null);
        box.appendChild(el("div", "padding:2px 3px 6px; font-size:11px; color:var(--mlp-muted,#a6adc8);",
            t("Тема соберётся из палитры активного набора: ") + "«" + (setName(activeIndex()) || "?") + "»"));
        var row = el("div", "display:flex; align-items:center; gap:8px;");
        var b = makeIoBtn("Экспорт VS Code-темы");
        b.addEventListener("click", function () { exportTheme(); });
        row.appendChild(b);
        var d = infoDot(INFO.theme_export); if (d) row.appendChild(d);
        box.appendChild(row);
        return box;
    }

    // ===================== src/ui/diagnostics.js =====================
    // ===== Диагностика установки =====
    // Главная боль плагинов через custom-css — «поставил, а фон не появился». Отчёт отвечает,
    // что плагин видит о себе: версия, тема, набор, пути и загрузка картинок, активный
    // загрузчик, здоровье селекторов вёрстки и читаемость кода. Ничего не меняет.

    // ===== Диагностика установки =====
    // Главная боль custom-css плагинов — «поставил, а фон не появился»: чаще всего не задан путь
    // к картинкам (перенос папки) либо не перезапущен VS Code. Собираем короткий отчёт о том, что
    // плагин видит о себе: версия, тема, активный набор, папка картинок, загрузились ли картинки
    // активного набора, найден ли наш <style> и кнопка BG. Ничего не меняет — только читает
    // состояние. Возвращает { lines, ok, text }: ok=false, если есть явная проблема.
    function _zoneDiag(idx, zone) {
        if (isGrad(idx, zone)) return { s: "градиент (без картинки)", bad: false };
        if (typeof isShader === "function" && isShader(idx, zone)) return { s: "шейдер (без картинки)", bad: false };
        if (isProc(idx, zone)) return { s: "процедурная текстура (без картинки)", bad: false };
        var url = zoneUrl(idx, zone);
        if (!url) return { s: "путь не задан", bad: false }; // зона без своей картинки — это не ошибка
        var st = probeImage(url);
        if (!st.resolved) return { s: "загружается…", bad: false };
        return st.ok ? { s: "загружена", bad: false } : { s: "НЕ загружена (проверь путь)", bad: true };
    }
    function diagnostics() {
        var idx = activeIndex(), lines = [], bad = 0;
        function add(k, v) { lines.push(t(k) + ": " + v); }
        add("Версия", APP_VERSION + " (схема конфига v" + CFG_VERSION + ")");
        add("Тема", themeKind());
        add("Язык интерфейса", uiLang() + (cfg.lang === "auto" ? "  [авто]" : "  [" + cfg.lang + "]"));
        add("Фон включён", cfg.enabled ? t("да") : t("нет (мастер-выключатель)"));
        var kind = (typeof isShaderSet === "function" && isShaderSet(idx)) ? " (шейдер)"
            : isProcSet(idx) ? " (проц.)"
            : isGradSet(idx) ? " (град.)"
            : (SETS[idx] && SETS[idx].master) ? " (мастер-кадр)" : " (фото)";
        add("Активный набор", idx + " · " + (setName(idx) || "?") + kind);
        var base = imgBase();
        add("Папка картинок", (base || "(путь не определён)") + (cfg.imgBase ? "  [задана вручную]" : "  [авто]"));
        add("Сетевые картинки", cfg.allowRemoteImages ? t("разрешены") : t("выключены"));
        var styleFound = !!document.getElementById(STYLE_ID);
        add("Стиль в DOM", styleFound ? t("найден (скрипт активен)") : t("НЕ найден"));
        if (!styleFound) bad++;
        add("Кнопка BG", document.getElementById(SB_ID) ? t("найдена") : t("нет (статусбар ещё не готов?)"));
        ["editor", "sidebar", "panel"].forEach(function (z, i) {
            var r = _zoneDiag(idx, z);
            if (r.bad) bad++;
            lines.push(t("Картинка · ") + t(["редактор", "сайдбар", "панель"][i]) + ": " + r.s);
        });
        add("Всего наборов", SETS.length + (SETS_DROPPED > 0 ? "  (отброшено битых: " + SETS_DROPPED + " — проверь правки SETS)" : ""));
        // «Здоровье» DOM-скрейпинга (git-ветка / счётчик ошибок / имя проекта): если селектор под
        // текущую версию VS Code перестал находиться, показываем это явно — вместо тихой поломки.
        // scrapeHealth живёт в scrape.js (typeof-страховка на случай сборки без модуля).
        if (typeof scrapeHealth === "function") {
            var health = scrapeHealth();
            health.forEach(function (h) {
                if (!h.ok) bad++;
                lines.push(t("Чтение из DOM · ") + t(h.name) + ": " + (h.ok ? "" : t("СБОЙ") + " · ") + t(h.note));
            });
        }
        // Загрузчик: каким расширением внедрён скрипт. Компаньон кладёт это в
        // window.__MLBG_ENV__; без компаньона определяем по косвенным признакам (loaderKind).
        if (typeof loaderKind === "function") {
            var ld = loaderKind();
            add("Загрузчик", ld.title + (ld.version ? " " + ld.version : "") + (ld.sure ? "" : "  [" + t("определено косвенно") + "]"));
        }
        // Источник данных о работе: живой мостик компаньона или скрейпинг DOM. Это первое, что
        // хочется знать, когда «фон по ветке» показывает не то.
        if (typeof liveSource === "function") {
            add("Данные редактора", t(liveSource()));
            var lv = mlbgLive();
            if (lv) {
                lines.push(t("Живые данные") + ": " +
                    t("ветка") + " " + (lv.branch || "—") + " · " +
                    t("репозиторий") + " " + (lv.remote || "—") + " · " +
                    t("язык") + " " + (lv.languageId || "—") + " · " +
                    t("ошибок") + " " + lv.errors);
            }
        }
        // «Здоровье» CSS-селекторов воркбенча: не читаем данные, а проверяем, что
        // элементы, на которые вешается оформление, вообще существуют в текущей версии VS Code.
        if (typeof selectorHealthSummary === "function") {
            var sh = selectorHealthSummary();
            add("Селекторы вёрстки", sh.found + "/" + sh.total + (sh.ok ? "" : "  " + t("СБОЙ") + ": " + sh.missingRequired.join(", ")));
            if (!sh.ok) {
                bad++;
                lines.push(t("Обязательные элементы вёрстки не найдены — скорее всего, обновление VS Code изменило разметку. Часть оформления не применится. Приложи этот отчёт к issue."));
            }
            // Необязательные промахи перечисляем справочно: они нормальны, когда панель закрыта
            // или файл не открыт, но в отчёте по багу помогают понять картину.
            var optMiss = sh.items.filter(function (h) { return !h.found && h.opt; }).map(function (h) { return h.sel; });
            if (optMiss.length) lines.push(t("Не найдено (норма, если элемент скрыт): ") + optMiss.join(" "));
        }
        // Читаемость: контраст кода к реальной подложке под ним.
        if (typeof readability === "function") {
            var rd = readability();
            if (rd && !rd.off) add("Читаемость кода", rd.ratio.toFixed(1) + ":1  " + t("худший участок") + " " + rd.worstRatio.toFixed(1) + ":1" + (rd.ok ? "" : "  " + t("(ниже 4.5 — фон мешает читать)")));
        }
        // Подсказка, если картинки набора не грузятся — почти всегда виноват путь.
        // Ошибки рантайма (logErr в util.js): раньше они глотались молча.
        if (typeof errTotal === "function") {
            add("Ошибки рантайма", errTotal() ? errLog.length + " " + t("разных") + ", " + t("всего") + " " + errTotal() : t("нет"));
            errLog.slice(-5).forEach(function (r) {
                lines.push("  " + r.where + ": " + r.msg + (r.n > 1 ? "  (x" + r.n + ")" : ""));
            });
        }
        // Резерв конфига на диске (Moon Core): переживает очистку localStorage.
        if (typeof diskBackupInfo === "function") add("Резерв конфига на диске", t(diskBackupInfo()));
        if (bad && styleFound) lines.push("", "Похоже, картинки набора не находятся. Проверь «Папка плагина» ниже: путь должен вести к папке с assets/. После правки фон появляется сразу.");
        return { lines: lines, ok: bad === 0, text: t("MoonLight custom-bg — диагностика") + "\n" + lines.join("\n") };
    }
    // UI секции «Диагностика»: кнопка «Проверить» заполняет блок-отчёт и копирует его в буфер
    // (удобно вложить в issue). Отчёт остаётся на экране, чтобы прочитать без буфера обмена.
    function makeDiagnosticsUI() {
        var box = el("div", null);
        var out = el("pre", "margin:6px 0 0; padding:8px 9px; border-radius:8px; white-space:pre-wrap; word-break:break-word; font-family:var(--vscode-editor-font-family,monospace); font-size:10.5px; line-height:1.5; color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.06); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12)); max-height:220px; overflow:auto;");
        out.hidden = true;
        out.setAttribute("role", "status"); out.setAttribute("aria-live", "polite"); out.tabIndex = 0;
        var runB = makeIoBtn("Проверить установку");
        runB.addEventListener("click", function () {
            var d = diagnostics();
            out.textContent = d.text; out.hidden = false;
            var copied = copyText(d.text);
            toast(d.ok ? (copied ? t("Всё в порядке · отчёт скопирован") : t("Всё в порядке"))
                       : t("Есть проблемы · отчёт скопирован для issue"), d.ok);
        });
        box.appendChild(runB); box.appendChild(out);
        return box;
    }

    // ===================== src/ui/quick.js =====================
    // ===== Быстрый переключатель: палитра наборов и эффектов =====
    // Панель — это «мастерская»: в ней настраивают. Но в обычной работе нужно другое — сменить
    // набор или щёлкнуть эффект, не отрывая рук от клавиатуры и не разглядывая сетку из полусотни
    // тумблеров. Здесь ровно тот приём, к которому в VS Code уже привыкли: Ctrl+Alt+P, две-три
    // буквы, стрелки, Enter. Отличие от палитры команд — ЖИВОЕ превью: пока идёшь стрелками по
    // наборам, фон меняется прямо под курсором, Esc возвращает как было.
    //
    // Порядок в сборке: после controls.js (нужны previewSet/previewEnd/previewCancel) и до panel.js.

    var QUICK_ID = "moonlight-bg-quick";
    var quickState = { items: [], view: [], sel: 0, prevFocus: null, prevMode: null };

    // Нечёткий поиск подпоследовательностью: "звпр" находит «Звёздный причал». Возвращает
    // оценку (чем меньше разрывов и чем ближе к началу — тем лучше) или -1, если не совпало.
    // Регистр и «ё/е» нормализуем: пользователь не должен думать о раскладке и точках над е.
    function quickNorm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
    function quickScore(text, q) {
        q = quickNorm(q);
        if (!q) return 0;
        var t0 = quickNorm(text), i = 0, j = 0, score = 0, last = -1;
        while (i < t0.length && j < q.length) {
            if (t0.charAt(i) === q.charAt(j)) {
                score += (last >= 0 && i === last + 1) ? 0 : 2;  // разрыв дороже, чем подряд идущие буквы
                if (i === 0 || /[\s·-]/.test(t0.charAt(i - 1))) score -= 1; // начало слова — бонус
                last = i; j++;
            }
            i++;
        }
        return j === q.length ? score : -1;
    }

    // Список того, что вообще можно сделать из палитры. Пересобирается на каждое открытие:
    // наборы и эффекты меняются (генератор наборов, переименование), кэшировать нечего.
    function quickItems() {
        var out = [], i;
        for (i = 0; i < SETS.length; i++) {
            (function (idx) {
                out.push({
                    kind: "set", idx: idx,
                    title: setName(idx) || ("#" + idx),
                    hint: t(SETS[idx].shader ? "шейдер" : SETS[idx].proc ? "процедурный" : SETS[idx].grad ? "градиент" : "фото"),
                    run: function () { previewCancel(); cfg.mode = String(idx); applyFade(); saveCfg(); }
                });
            }(i));
        }
        for (i = 0; i < FX_LIST.length; i++) {
            (function (key, label) {
                out.push({
                    kind: "fx", key: key,
                    title: t(label),
                    hint: t("эффект"),
                    state: function () { return !!cfg.fx[key]; },
                    run: function () { cfg.fx[key] = !cfg.fx[key]; apply(); toast(t(label) + ": " + (cfg.fx[key] ? t("вкл") : t("выкл"))); }
                });
            }(FX_LIST[i][0], FX_LIST[i][1]));
        }
        out.push({
            kind: "cmd", title: t("Открыть панель"), hint: t("команда"),
            run: function () { try { togglePanel({ stopPropagation: function () {} }); } catch (e) {} }
        });
        out.push({
            kind: "cmd", title: t("Фон включён"), hint: t("команда"),
            run: function () { cfg.enabled = !cfg.enabled; apply(); }
        });
        return out;
    }

    function quickClose(restore) {
        var box = document.getElementById(QUICK_ID);
        if (box) { try { box.remove(); } catch (e) {} }
        // Esc — вернуть набор, который был до захода в палитру; Enter уже применил свой.
        if (restore) { try { previewEnd(); } catch (e) {} } else { try { previewCancel(); } catch (e) {} }
        try { if (quickState.prevFocus && quickState.prevFocus.focus) quickState.prevFocus.focus(); } catch (e) {}
        quickState.prevFocus = null;
    }

    function quickRender(box, q) {
        var list = box.querySelector("[data-mlbg-list]");
        if (!list) return;
        list.textContent = "";
        var scored = [], i, sc;
        for (i = 0; i < quickState.items.length; i++) {
            sc = quickScore(quickState.items[i].title + " " + quickState.items[i].hint, q);
            if (sc >= 0) scored.push({ it: quickState.items[i], sc: sc });
        }
        scored.sort(function (a, b) { return a.sc - b.sc; });
        quickState.view = scored.slice(0, 40).map(function (x) { return x.it; });
        if (quickState.sel >= quickState.view.length) quickState.sel = 0;
        for (i = 0; i < quickState.view.length; i++) {
            (function (it, n) {
                var row = el("div", "display:flex; align-items:center; gap:8px; padding:5px 10px; border-radius:6px; cursor:pointer;" +
                    (n === quickState.sel ? " background:rgba(var(--mlbg-accent-rgb),0.20);" : ""));
                row.setAttribute("role", "option");
                row.setAttribute("aria-selected", n === quickState.sel ? "true" : "false");
                var name = el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", it.title);
                var badge = el("span", "flex:0 0 auto; font-size:10px; color:var(--mlp-muted,#a6adc8);", it.hint);
                if (it.kind === "fx") {
                    var dot = el("span", "flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:" +
                        (it.state() ? "var(--mlbg-accent)" : "rgba(205,214,244,0.25)") + ";");
                    row.appendChild(dot);
                }
                row.appendChild(name); row.appendChild(badge);
                row.addEventListener("mouseenter", function () { quickState.sel = n; quickPaint(box); quickPreview(); });
                row.addEventListener("mousedown", function (e) { e.preventDefault(); quickRun(); });
                list.appendChild(row);
            }(quickState.view[i], i));
        }
        if (!quickState.view.length) list.appendChild(el("div", "padding:8px 10px; color:var(--mlp-muted,#a6adc8);", t("Ничего не найдено")));
    }
    // Перерисовать только подсветку выбранной строки (без пересборки списка).
    function quickPaint(box) {
        var rows = box.querySelectorAll("[data-mlbg-list] > div"), i;
        for (i = 0; i < rows.length; i++) {
            rows[i].style.background = (i === quickState.sel) ? "rgba(var(--mlbg-accent-rgb),0.20)" : "transparent";
            rows[i].setAttribute("aria-selected", i === quickState.sel ? "true" : "false");
        }
        var cur = rows[quickState.sel];
        if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "nearest" }); } catch (e) {} }
    }
    // Живое превью набора под курсором выбора. Для эффектов и команд превью нет — переключать
    // их «на посмотреть» было бы неожиданно (эффект применился бы и без Enter).
    function quickPreview() {
        var it = quickState.view[quickState.sel];
        if (it && it.kind === "set") previewSet(it.idx);
        else previewEnd();
    }
    function quickRun() {
        var it = quickState.view[quickState.sel];
        if (!it) return;
        quickClose(false);
        try { it.run(); } catch (e) {}
    }

    function openQuick() {
        if (document.getElementById(QUICK_ID)) { quickClose(true); return; }
        quickState.items = quickItems();
        quickState.sel = 0;
        try { quickState.prevFocus = document.activeElement; } catch (e) {}
        var box = el("div", "position:fixed; top:12%; left:50%; transform:translateX(-50%); z-index:100002;" +
            " width:min(520px, 86vw); border-radius:10px; overflow:hidden;" +
            " background:var(--mlp-bg,rgba(30,30,46,0.97)); color:var(--mlp-fg,#cdd6f4);" +
            " border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); box-shadow:0 18px 48px rgba(0,0,0,0.55);" +
            " font-family:var(--vscode-font-family,sans-serif); font-size:12px;");
        box.id = QUICK_ID;
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", t("Быстрый переключатель"));
        var inp = el("input", fieldStyle(" display:block; width:100%; box-sizing:border-box; border:0; border-bottom:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:0; padding:9px 11px; font-size:12.5px; outline:none;"));
        inp.type = "text";
        inp.placeholder = t("Набор, эффект или команда…");
        inp.setAttribute("aria-label", t("Набор, эффект или команда…"));
        inp.setAttribute("role", "combobox");
        inp.setAttribute("aria-expanded", "true");
        var list = el("div", "max-height:46vh; overflow:auto; padding:5px;");
        list.setAttribute("data-mlbg-list", "1");
        list.setAttribute("role", "listbox");
        box.appendChild(inp); box.appendChild(list);
        document.body.appendChild(box);
        quickRender(box, "");
        inp.addEventListener("input", function () { quickState.sel = 0; quickRender(box, quickNorm(inp.value)); quickPreview(); });
        inp.addEventListener("keydown", function (e) {
            if (e.key === "ArrowDown") { e.preventDefault(); quickState.sel = Math.min(quickState.view.length - 1, quickState.sel + 1); quickPaint(box); quickPreview(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); quickState.sel = Math.max(0, quickState.sel - 1); quickPaint(box); quickPreview(); }
            else if (e.key === "Home") { e.preventDefault(); quickState.sel = 0; quickPaint(box); quickPreview(); }
            else if (e.key === "End") { e.preventDefault(); quickState.sel = Math.max(0, quickState.view.length - 1); quickPaint(box); quickPreview(); }
            else if (e.key === "Enter") { e.preventDefault(); quickRun(); }
            else if (e.key === "Escape") { e.preventDefault(); quickClose(true); }
        });
        // Клик мимо окна — закрыть с откатом превью (как Esc).
        setTimeout(function () {
            try {
                document.addEventListener("mousedown", function onOut(ev) {
                    var b = document.getElementById(QUICK_ID);
                    if (!b) { document.removeEventListener("mousedown", onOut, true); return; }
                    if (!b.contains(/** @type {Node} */ (ev.target))) { document.removeEventListener("mousedown", onOut, true); quickClose(true); }
                }, true);
            } catch (e) {}
        }, 0);
        try { inp.focus(); } catch (e) {}
    }

    // ===================== src/ui/statusbar.js =====================
    // ===== Кнопка статусбара =====
    var SB_ID = "moonlight-bg-switcher", PANEL_ID = "moonlight-bg-panel";

    // ===== Быстрое меню по правому клику на кнопке BG =====
    // Частые действия без открытия всей панели: листать наборы, вкл/выкл фон, режим чтения,
    // быстрый переключатель, отмена, открыть панель. Видимый мышиный путь к тому, что есть хоткеями. Закрывается кликом
    // мимо, Esc и после выбора. cycleSet/togglePanel/apply/toast/refreshPanel — из общей области IIFE.
    var QMENU_ID = "moonlight-bg-qmenu";
    var _presentPrev = ""; // снимок вида до «Режима презентации» (в пределах сессии)
    function closeQuickMenu() {
        var m = document.getElementById(QMENU_ID); if (m && m.remove) { m.remove(); try { previewEnd(); } catch (e) {} }
        document.removeEventListener("mousedown", _qmOutside, true);
        document.removeEventListener("keydown", _qmKey, true);
    }
    function _qmOutside(e) { var m = document.getElementById(QMENU_ID); if (m && !m.contains(e.target)) closeQuickMenu(); }
    function _qmKey(e) { if (e.key === "Escape") { e.stopPropagation(); closeQuickMenu(); } }
    function showQuickMenu(anchor) {
        if (document.getElementById(QMENU_ID)) { closeQuickMenu(); return; } // повторный вызов — закрыть
        var light = false; try { light = isLightTheme(); } catch (e) {}
        var bg = light ? "rgba(245,245,250,0.98)" : "rgba(24,24,37,0.98)";
        var fg = light ? "#1e1e2e" : "#cdd6f4";
        var m = el("div",
            "position:fixed; z-index:100005; min-width:236px; max-width:300px; padding:5px; border-radius:10px;" +
            "background:" + bg + "; color:" + fg + "; font-family:var(--vscode-font-family,sans-serif); font-size:12px;" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.4); box-shadow:0 12px 34px rgba(0,0,0,0.5);" +
            "backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);");
        m.id = QMENU_ID; m.setAttribute("role", "menu");
        try { ensurePanelCss(); } catch (e) {}
        m.addEventListener("click", function (e) { e.stopPropagation(); });
        function item(label, act, sub) {
            var r = el("div", "display:flex; align-items:center; gap:8px; padding:6px 9px; border-radius:7px; cursor:pointer;");
            r.appendChild(el("span", "flex:1 1 auto;", t(label)));
            if (sub && hotkeysOn()) r.appendChild(el("span", "flex:0 0 auto; font-size:10px; color:var(--mlbg-accent); font-family:var(--vscode-editor-font-family,monospace);", sub));
            r.addEventListener("mouseenter", function () { r.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
            r.addEventListener("mouseleave", function () { r.style.background = "transparent"; });
            r.addEventListener("click", function () { closeQuickMenu(); try { act(); } catch (e) {} });
            r.setAttribute("role", "menuitem");
            keyActivate(r, t(label));
            m.appendChild(r);
        }
        // Ряд миниатюр: любимые наборы (звёздочка на карточке), а если их нет — соседи текущего.
        // Наведение примеряет набор, клик выбирает. Так набор меняется, не открывая панель.
        (function () {
            var cur = activeIndex(), list = [];
            for (var i = 0; i < SETS.length && list.length < 6; i++) if (isFavSet(i)) list.push(i);
            if (!list.length) for (var d = -2; d <= 3 && SETS.length; d++) { var k = ((cur + d) % SETS.length + SETS.length) % SETS.length; if (list.indexOf(k) < 0) list.push(k); }
            if (!list.length) return;
            m.appendChild(el("div", "padding:4px 9px 2px; font-size:10px; font-weight:700; letter-spacing:0.5px; opacity:0.7;", t(isFavSet(list[0]) ? "Любимые наборы" : "Наборы")));
            var row = el("div", null); row.className = "mlp-qsets";
            list.forEach(function (idx) {
                var th = el("div", null); th.className = "mlp-qset" + (idx === cur ? " on" : "");
                try { paintSetPreview(th, idx); } catch (e) {}
                th.title = idx + (setName(idx) ? " · " + setName(idx) : "");
                th.addEventListener("mouseenter", function () { previewSet(idx); });
                th.addEventListener("mouseleave", function () { previewEnd(); });
                th.addEventListener("click", function () {
                    previewCancel(); closeQuickMenu();
                    cfg.mode = String(idx); applyFade();
                    if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
                });
                keyActivate(th, t("Набор ") + idx + (setName(idx) ? " — " + setName(idx) : ""));
                row.appendChild(th);
            });
            m.appendChild(row);
        })();
        function sep() { m.appendChild(el("div", "margin:4px 6px; border-top:1px solid var(--mlp-border-faint,rgba(205,214,244,0.14));")); }
        item("Следующий набор", function () { cycleSet(1); }, "Ctrl+Alt+.");
        item("Предыдущий набор", function () { cycleSet(-1); }, "Ctrl+Alt+,");
        sep();
        item(cfg.enabled ? "Выключить фон и эффекты" : "Включить фон и эффекты", function () {
            cfg.enabled = !cfg.enabled; apply();
            try { toast(cfg.enabled ? t("Фон включён") : t("Фон выключен")); } catch (e) {}
            if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
        }, "Ctrl+Alt+0");
        item(cfg.fx.reading ? "Выключить режим чтения" : "Включить режим чтения", function () {
            cfg.fx.reading = !cfg.fx.reading; apply();
            try { toast(cfg.fx.reading ? t("Режим чтения включён") : t("Режим чтения выключен")); } catch (e) {}
            if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
        }, "Ctrl+Alt+R");
        sep();
        // Закрепить текущий набор за открытым проектом — самый частый контекст в один клик.
        var wn = ""; try { wn = workspaceName() || ""; } catch (e) {}
        if (wn && DANGEROUS_KEYS.indexOf(wn) < 0) {
            var pinned = cfg.autoWorkspace && cfg.workspaceSets && cfg.workspaceSets[wn] === String(activeIndex());
            item(pinned ? "Открепить набор от проекта" : "Закрепить набор за проектом", function () {
                if (!cfg.workspaceSets) cfg.workspaceSets = {};
                if (pinned) { delete cfg.workspaceSets[wn]; toast(t("Набор больше не привязан к проекту «") + wn + "»"); }
                else {
                    cfg.autoWorkspace = true; cfg.workspaceSets[wn] = String(activeIndex());
                    toast(t("Проект «") + wn + t("» теперь всегда открывается с этим набором"));
                }
                apply();
                if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
            }, "");
        }
        // Режим презентации одной кнопкой: стиль «Презентация», повторный клик возвращает прежний вид.
        item(_presentPrev ? "Выключить режим презентации" : "Режим презентации", function () {
            if (_presentPrev) { cfg = mergeCfg(safeParse(_presentPrev)); _presentPrev = ""; syncGenSets(); apply(); toast(t("Прежний вид возвращён")); }
            else { _presentPrev = JSON.stringify(cfg); applyProfile("present"); toast(t("Режим презентации: фон тише, акценты крупнее")); }
            if (document.getElementById(PANEL_ID)) { try { refreshPanel(); } catch (e) {} }
        }, "");
        item("Быстрый переключатель…", function () { if (document.getElementById(PANEL_ID)) closePanel(); openQuick(); }, "Ctrl+Alt+P");
        item("Отменить изменение вида", function () { undo(); }, "Ctrl+Alt+Z");
        item(document.getElementById(PANEL_ID) ? "Закрыть панель" : "Открыть панель…", function () { togglePanel({ stopPropagation: function () {} }); }, "Ctrl+Alt+B");
        document.body.appendChild(m);
        // Позиционируем над кнопкой BG (правый нижний угол окна); не влезло сверху — под ней.
        try {
            var r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
            var left = Math.max(6, Math.min(r.right - mw, window.innerWidth - mw - 6));
            var top = r.top - mh - 6; if (top < 6) top = r.bottom + 6;
            m.style.left = left + "px"; m.style.top = top + "px";
        } catch (e) {}
        setTimeout(function () {
            document.addEventListener("mousedown", _qmOutside, true);
            document.addEventListener("keydown", _qmKey, true);
        }, 0);
    }
    function updateLabel() {
        var item = document.getElementById(SB_ID); if (!item) return;
        var a = item.querySelector("a"); if (!a) return;
        var idx = activeIndex(), nm = setName(idx);
        // Мастер-выключатель: когда фон выключен — короткая подпись «BG выкл», без индикаторов.
        if (!cfg.enabled) {
            a.textContent = t("BG выкл");
            var oth = item.querySelector(".mlbg-sb-thumb"); if (oth) oth.remove();
            var od = item.querySelector(".mlbg-mode-dot"); if (od) od.remove();
            var t0 = hotkeysOn() ? t("Фон и дизайн — настройки (фон выключен, Ctrl+Alt+0 — включить)") : t("Фон и дизайн — настройки (фон выключен)");
            item.title = t0; item.setAttribute("aria-label", t0);
            return;
        }
        // Миниатюра набора + имя вместо «BG N · имя»: набор узнаётся по картинке.
        a.textContent = "";
        var th = el("span", null); th.className = "mlbg-sb-thumb";
        th.style.cssText = "display:inline-block; position:relative; width:22px; height:13px; margin-right:6px; vertical-align:-2px; border-radius:3px; overflow:hidden; box-shadow:0 0 0 1px rgba(var(--mlbg-accent-rgb),0.6);";
        try { paintSetPreview(th, idx); } catch (e) {}
        a.appendChild(th);
        a.appendChild(document.createTextNode((nm || ("BG " + idx)) + (cfg.mode === "random" ? " ~" : "")));

        // Индикатор активного авто-режима: маленькая точка перед подписью.
        // авто-по-времени — кольцо (акцентная рамка), слайдшоу — залитая точка.
        // Приоритет у авто-по-времени (оно перебивает слайдшоу, см. slideTick).
        var auto = !!(cfg.autoTime && cfg.autoTime.on);
        var slide = !auto && !!(cfg.slideshow && cfg.slideshow.on);
        var dot = /** @type {HTMLElement} */ (item.querySelector(".mlbg-mode-dot"));
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

        var modeTxt = auto ? t(" · авто-набор по времени суток") : (slide ? t(" · слайдшоу вкл") : "");
        var title = t("Фон и дизайн — настройки") + (nm ? t(" (набор: ") + nm + ")" : "") + modeTxt +
            t("\nКлик — панель, колесо — листать наборы, правый клик — быстрые действия");
        item.title = title; item.setAttribute("aria-label", title);
    }
    function ensureStatusBar() {
        try {
            var right = document.querySelector(".statusbar .right-items") || document.querySelector(".right-items");
            if (!right) return;
            var item = document.getElementById(SB_ID);
            if (!item) {
                item = document.createElement("div");
                item.id = SB_ID; item.className = "statusbar-item right"; item.title = t("Фон и дизайн — настройки");
                item.setAttribute("role", "button");
                item.setAttribute("tabindex", "0");
                item.setAttribute("aria-label", t("Фон и дизайн — настройки"));
                var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px";
                item.appendChild(a);
                item.addEventListener("click", togglePanel);
                // Колесо над кнопкой — листать наборы (вниз — следующий). Троттлинг: один шаг на
                // «щелчок» колеса, а не десяток событий тачпада.
                var _wheelAt = 0;
                item.addEventListener("wheel", function (e) {
                    e.preventDefault();
                    var now = Date.now(); if (now - _wheelAt < 280) return; _wheelAt = now;
                    try { cycleSet(e.deltaY > 0 ? 1 : -1); } catch (er) {}
                }, { passive: false });
                // Правый клик — быстрое меню действий, не открывая всю панель.
                item.addEventListener("contextmenu", function (e) { e.preventDefault(); e.stopPropagation(); try { showQuickMenu(item); } catch (er) {} });
                item.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); togglePanel(e); }
                });
                right.insertBefore(item, right.firstChild);
            }
            updateLabel();
        } catch (e) {}
    }

    // ===================== src/ui/panel-fx.js =====================
    // ===== Секция «Эффекты» =====
    // Полсотни тумблеров — это уже не список, а интерфейс: поиск по названию, фильтр «только
    // включённые», группировка по смыслу, предпросмотр по наведению и пометка «отличается от
    // значения по умолчанию». Всё это здесь, отдельно от каркаса панели.

    // Состояние фильтра секции «Эффекты» (текст поиска + «только включённые»). Тоже модульное,
    // как panelTab: переживает refreshPanel в пределах сессии, поэтому фоновая пересборка панели
    // (слайдшоу/по времени) не сбрасывает набранный фильтр под руками пользователя.
    // fxOnlyOn — фильтр «только включённые» секции «Эффекты» (переживает refreshPanel в пределах
    // сессии). Отдельного текстового фильтра эффектов больше нет: его роль взял на себя единый поиск
    // над баром вкладок. fxFocusKey — эффект, к которому нужно прокрутить и подсветить
    // после перехода из поиска (одноразовый, гасится в buildEffectsSection). panelFxNodes — карта
    // key -> строка-тумблер (для прокрутки к эффекту). panelStartFocus — секция, на которой открыть
    // панель при первом запуске (онбординг); гасится после разворота.
    var fxOnlyOn = false, fxFocusKey = "", panelStartFocus = "", panelFxNodes = {};
    // Секция «Эффекты» (наполнение готового тела secFx). Вынесена из togglePanel: логика
    // разрослась (счётчик включённых, фильтры поиск/«только включённые», сетка тумблеров,
    // слайдеры «силы», стиль частиц), и держать её отдельно чище. Зависит только от secFx +
    // модульного/глобального окружения (FX_LIST, PARAMS, cfg, makeCheck/makeParamSlider,
    // makePartStyleSelect, fxOnlyOn), поэтому не тянет за собой локали togglePanel.
    // Параметры силы, принадлежащие ровно одному эффекту key.
    function inlineParams(key) {
        return PARAMS.filter(function (d) { var r = PARAM_REQUIRES[d[0]]; return r && r.length === 1 && r[0] === key; });
    }
    function buildEffectsSection(secFx) {
        // Шапка секции: счётчик включённых эффектов + быстрый фильтр «только включённые».
        // Помогает ориентироваться в полусотне тумблеров и одним кликом свернуть список
        // до активных. Счётчик пересчитывается при переключении любого тумблера (см. updateFxView).
        var onlyOn = fxOnlyOn; // восстановить состояние фильтра, переживающее refreshPanel
        var fxHead = el("div", "display:flex; align-items:center; gap:8px; margin-bottom:5px;");
        var fxCount = el("span", "flex:0 0 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);", "");
        var onlyBtn = el("div", "flex:0 0 auto; margin-left:auto; padding:3px 9px; border-radius:6px; cursor:pointer; font-size:11px;", t("только включённые"));
        function styleOnlyBtn() {
            onlyBtn.style.color = onlyOn ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)";
            onlyBtn.style.background = onlyOn ? "rgba(var(--mlbg-accent-rgb),0.18)" : "rgba(var(--mlbg-accent-rgb),0.06)";
            onlyBtn.style.border = "1px solid " + (onlyOn ? "rgba(var(--mlbg-accent-rgb),0.5)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))");
            onlyBtn.setAttribute("aria-pressed", onlyOn ? "true" : "false");
        }
        fxHead.appendChild(fxCount); fxHead.appendChild(onlyBtn);
        // Отдельного текстового фильтра эффектов больше нет: его роль взял единый поиск
        // над баром вкладок — он находит эффект по имени и прокручивает прямо к нему. Здесь остаются
        // только счётчик и «только включённые», а сами эффекты сгруппированы по категориям (ниже).
        var fxEmpty = el("div", "padding:6px 3px; font-size:11px; color:var(--mlp-faint,#6c7086);", t("Ничего не найдено."));
        fxEmpty.hidden = true;
        secFx.appendChild(fxHead);

        // Одна строка-тумблер эффекта: чекбокс (makeCheck) + маркер «изменено» + в режиме
        // «Настроить» звезда «в избранное» и кнопка «скрыть/показать» + предпросмотр при наведении.
        var fxRows = [];
        function buildFxRow(o) {
            var key = o[0];
            var isHidden = !!(cfg.ui.hiddenFx && cfg.ui.hiddenFx[key]);
            if (isHidden && !panelEditMenu) return null; // скрытый эффект не показываем (вне режима настройки)
            var node = makeCheck(key, o[1]);
            // Эффект-надстройка над выключенным эффектом ничего не делает. Не прячем (иначе его
            // не найти поиском), но показываем приглушённым и объясняем, чего не хватает.
            var need = FX_REQUIRES[key];
            if (need && !cfg.fx[need]) {
                node.style.opacity = "0.5";
                node.title = t("Нужен эффект: ") + t(fxLabel(need));
            }
            // Маркер «изменено»: точка, если состояние отличается от дефолта — так
            // видно, что эффект трогали (особенно ценно для выключенного эффекта, включённого по
            // умолчанию: по снятой галочке этого не понять).
            if (cfg.fx[key] !== DEFAULTS.fx[key]) {
                var dot = el("span", "flex:0 0 auto; width:6px; height:6px; border-radius:50%; background:var(--mlbg-accent); opacity:0.7; margin-left:2px;", "");
                dot.title = t("Отличается от значения по умолчанию");
                node.appendChild(dot);
            }
            if (panelEditMenu) {
                // Звезда «в избранное»: закрепляет эффект в блоке «Избранное» вверху панели.
                var isFav = !!(cfg.ui.favFx && cfg.ui.favFx[key]);
                var star = el("span", "flex:0 0 auto; margin-left:4px; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
                star.title = isFav ? t("Убрать из избранного") : t("В избранное");
                star.addEventListener("click", function (e) {
                    e.stopPropagation(); e.preventDefault();
                    if (!cfg.ui.favFx) cfg.ui.favFx = {};
                    if (isFav) delete cfg.ui.favFx[key]; else cfg.ui.favFx[key] = true;
                    saveCfg(); try { refreshPanel(); } catch (er) {}
                });
                keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + t(o[1]));
                node.appendChild(star);
                // Кнопка «скрыть/показать» этого эффекта (без переключения самого эффекта).
                var eb = el("span", "flex:0 0 auto; margin-left:4px; padding:0 6px; border-radius:5px; font-size:10px; cursor:pointer; " +
                    (isHidden ? "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);"
                              : "color:#f38ba8; background:rgba(243,139,168,0.14); border:1px solid rgba(243,139,168,0.3);"),
                    isHidden ? t("показать") : t("скрыть"));
                eb.addEventListener("click", function (e) {
                    e.stopPropagation(); e.preventDefault();
                    if (!cfg.ui.hiddenFx) cfg.ui.hiddenFx = {};
                    if (isHidden) delete cfg.ui.hiddenFx[key]; else cfg.ui.hiddenFx[key] = true;
                    saveCfg(); try { refreshPanel(); } catch (er) {}
                });
                keyActivate(eb, (isHidden ? t("показать") : t("скрыть")) + ": " + t(o[1]));
                node.appendChild(eb);
                if (isHidden) node.style.opacity = "0.5";
            }
            // Предпросмотр при наведении/фокусе: временно включает выключенный эффект.
            var pOn = function () { previewFx(key); }, pOff = function () { previewFxEnd(); };
            node.addEventListener("mouseenter", pOn);
            node.addEventListener("mouseleave", pOff);
            // Чекбокс — input внутри строки. Переключение фиксирует выбор (превью не откатывает) и
            // пересчитывает счётчик/фильтр без пересборки панели. Фокус/блюр — превью с клавиатуры.
            var cb = node.querySelector ? node.querySelector("input") : null;
            if (cb) {
                // Переключение фиксирует выбор (превью не откатывает) и пересчитывает счётчик. Если
                // эффект в избранном — пересобираем панель, чтобы его копия-тумблер вверху синхронизировалась.
                cb.addEventListener("change", function () { previewFxCancel(); updateFxView(); if (cfg.ui.favFx && cfg.ui.favFx[key] && !fxAffectsPanel(key)) { try { refreshPanel(); } catch (er) {} } });
                cb.addEventListener("focus", pOn);
                cb.addEventListener("blur", pOff);
            }
            panelFxNodes[key] = node; // для прокрутки к эффекту из единого поиска
            // Сила эффекта — прямо под его строкой (на всю ширину сетки), пока он включён. Раньше
            // все ползунки жили общим блоком «Сила» внизу, далеко от своих тумблеров.
            var extra = null, own = inlineParams(key);
            if (cfg.fx[key] && (own.length || (key === "particles"))) {
                extra = el("div", null); extra.className = "mlp-inl";
                own.forEach(function (d) { extra.appendChild(makeParamSlider(d)); });
                if (key === "particles") extra.appendChild(makePartStyleSelect());
                node._extra = extra;
            }
            fxRows.push({ node: node, extra: extra, key: key, label: t(o[1]).toLowerCase(), group: FX_GROUPS[key] || "other" });
            return node;
        }

        // Раскладка по группам: у каждой категории свой подзаголовок и сетка 2×N.
        // Группа без единой видимой строки (все её эффекты скрыты) не рисуется. «other» — страховка
        // для эффекта, забытого в FX_GROUPS (линтер смоука следит, чтобы такого не было).
        var groups = {};
        function buildGroup(gkey, glabel) {
            var built = [];
            FX_LIST.forEach(function (o) { if ((FX_GROUPS[o[0]] || "other") === gkey) { var n = buildFxRow(o); if (n) built.push(n); } });
            if (!built.length) return;
            // Группа — сворачиваемая карточка со счётчиком «включено N из M». Свёрнутость помнится
            // в cfg.ui.collapsed под ключом "fx:<группа>"; группу с целью перехода из поиска раскрываем.
            var ck = "fx:" + gkey;
            var open = !(cfg.ui.collapsed && cfg.ui.collapsed[ck]);
            if (fxFocusKey && (FX_GROUPS[fxFocusKey] || "other") === gkey) open = true;
            var card = el("div", null); card.className = "mlp-fxg" + (open ? " open" : "");
            var header = el("div", null); header.className = "mlp-fxg-h";
            var chev = el("span", null, "\u25B6"); chev.className = "mlp-chev";
            var cnt = el("span", null); cnt.className = "mlp-fxg-n";
            header.appendChild(chev); header.appendChild(el("span", "flex:1 1 auto;", t(glabel))); header.appendChild(cnt);
            var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;"); grid.className = "mlp-fxg-b";
            built.forEach(function (n) { grid.appendChild(n); if (n._extra) grid.appendChild(n._extra); });
            grid.hidden = !open;
            header.addEventListener("click", function () {
                var show = grid.hidden; grid.hidden = !show;
                card.classList.toggle("open", show);
                header.setAttribute("aria-expanded", show ? "true" : "false");
                if (!cfg.ui.collapsed) cfg.ui.collapsed = {};
                if (show) delete cfg.ui.collapsed[ck]; else cfg.ui.collapsed[ck] = true;
                saveCfg();
            });
            keyActivate(header, t(glabel));
            header.setAttribute("aria-expanded", open ? "true" : "false");
            card.appendChild(header); card.appendChild(grid);
            groups[gkey] = { card: card, grid: grid, count: cnt, total: built.length };
            secFx.appendChild(card);
        }
        FX_GROUP_ORDER.forEach(function (g) { buildGroup(g[0], g[1]); });
        buildGroup("other", "Прочее"); // эффекты без явной группы (обычно пусто)
        secFx.appendChild(fxEmpty);

        function updateFxView() {
            var shown = 0, on = 0, perGroup = {};
            fxRows.forEach(function (r) {
                var isOn = !!cfg.fx[r.key]; if (isOn) on++;
                var hide = (onlyOn && !isOn);
                r.node.hidden = hide; if (r.extra) r.extra.hidden = hide;
                if (!hide) { shown++; perGroup[r.group] = (perGroup[r.group] || 0) + 1; }
            });
            var onGroup = {};
            fxRows.forEach(function (r) { if (cfg.fx[r.key]) onGroup[r.group] = (onGroup[r.group] || 0) + 1; });
            for (var gk in groups) {
                var G = groups[gk];
                G.card.hidden = !(perGroup[gk] > 0);
                G.count.textContent = (onGroup[gk] || 0) + " / " + G.total;
                G.count.className = "mlp-fxg-n" + ((onGroup[gk] || 0) > 0 ? " on" : "");
            }
            fxCount.textContent = t("Включено: ") + on + " / " + fxRows.length;
            fxEmpty.hidden = shown > 0;
        }
        onlyBtn.addEventListener("click", function () { onlyOn = !onlyOn; fxOnlyOn = onlyOn; styleOnlyBtn(); updateFxView(); });
        keyActivate(onlyBtn, "Показывать только включённые эффекты");
        styleOnlyBtn(); updateFxView();

        // Параметр сразу нескольких эффектов (размытие стекла) — общим ползунком под сеткой;
        // остальные ползунки силы живут в строках своих эффектов (inlineParams).
        PARAMS.forEach(function (d) {
            if ((PARAM_REQUIRES[d[0]] || []).length < 2 || !paramNeeded(d[0])) return;
            secFx.appendChild(makeParamSlider(d));
        });

        // Сброс всей секции к дефолту: тумблеры + сила + стиль частиц. Появляется,
        // только когда есть что сбрасывать (что-то отличается от DEFAULTS) — иначе кнопка-пустышка.
        if (fxDiffersFromDefault()) {
            var resetFx = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:#f38ba8; background:rgba(243,139,168,0.12); border:1px solid rgba(243,139,168,0.3);", t("Сбросить эффекты к дефолту"));
            resetFx.addEventListener("mouseenter", function () { resetFx.style.background = "rgba(243,139,168,0.22)"; });
            resetFx.addEventListener("mouseleave", function () { resetFx.style.background = "rgba(243,139,168,0.12)"; });
            resetFx.addEventListener("click", function () {
                cfg.fx = clone(DEFAULTS.fx); cfg.fxp = clone(DEFAULTS.fxp); cfg.partStyle = DEFAULTS.partStyle;
                apply(); refreshPanel();
                toast(t("Эффекты сброшены к значениям по умолчанию"));
            });
            keyActivate(resetFx, t("Сбросить эффекты к дефолту"));
            secFx.appendChild(resetFx);
        }
        secFx.appendChild(makePerfGuardToggle()); // авто-приглушение тяжёлых эффектов при низком FPS
        secFx.appendChild(makePerfStatus());      // живой индикатор FPS/эконом-режима
    }
    // Отличается ли что-то в эффектах (тумблеры/сила/стиль частиц) от значений по умолчанию —
    // нужно, чтобы показывать кнопку «Сбросить эффекты» только когда она осмысленна.
    function fxDiffersFromDefault() {
        try {
            var k;
            for (k in DEFAULTS.fx) if (cfg.fx[k] !== DEFAULTS.fx[k]) return true;
            for (k in DEFAULTS.fxp) if (cfg.fxp[k] !== DEFAULTS.fxp[k]) return true;
            if (cfg.partStyle !== DEFAULTS.partStyle) return true;
        } catch (e) {}
        return false;
    }

    // ===================== src/ui/panel-menu.js =====================
    // ===== Настройка меню и «Избранное» =====
    // Панель разрослась до пяти вкладок и полусотни эффектов, поэтому её состав настраивается:
    // любой пункт можно скрыть (настройки при этом не теряются) или закрепить наверху. Здесь —
    // две сборки, которые делаются ПОСЛЕ создания всех секций: список видимости в «Настройке
    // меню» и блок «Избранное» в шапке.

    // ===== Менеджер «Настройка меню» =====
    // Заполняем ПОСЛЕ сборки всех секций (panelAllSections уже полон, включая скрытые):
    // чекбоксы видимости по секциям (сгруппированы по вкладкам) + по эффектам сетки + «Показать всё».
    function buildMenuManager(secMenuBody, tabPanes) {
            var body = secMenuBody; if (!body || !body.appendChild) return;
            var byPane = [];
            for (var i = 0; i < tabPanes.length; i++) byPane.push([]);
            panelAllSections.forEach(function (s) {
                if (s.title === "Настройка меню") return; // сам менеджер не прячем
                var pi = tabPanes.indexOf(s.parent); if (pi >= 0) byPane[pi].push(s);
            });
            // Строка менеджера: галочка = видно в панели; звёздочка = закреплено в «Избранное».
            // isFav/onFav необязательны (для секций/эффектов их передаём). Снятая галочка НЕ теряет
            // сами настройки пункта — он лишь исчезает из панели и возвращается галочкой обратно.
            function visRow(label, isVisible, onToggle, isFav, onFav) {
                var row = el("label", ST.toggleRow);
                var cb = el("input", ST.checkbox); cb.type = "checkbox"; cb.checked = isVisible;
                cb.addEventListener("change", function () { onToggle(cb.checked); });
                row.appendChild(cb); row.appendChild(el("span", ST.fill, label));
                if (onFav) {
                    var star = el("span", "flex:0 0 auto; width:16px; text-align:center; cursor:pointer; font-size:12px; color:" + (isFav ? "var(--mlbg-accent)" : "var(--mlp-faint,#6c7086)") + ";", isFav ? "★" : "☆");
                    star.title = isFav ? t("Убрать из избранного") : t("В избранное");
                    star.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); onFav(!isFav); });
                    keyActivate(star, (isFav ? t("Убрать из избранного") : t("В избранное")) + ": " + label);
                    row.appendChild(star);
                }
                return row;
            }
            body.appendChild(el("div", "padding:2px 3px 6px; font-size:11px; line-height:1.4; color:var(--mlp-faint,#6c7086);",
                t("Галочка — показывать пункт в панели; звёздочка — закрепить его в «Избранное» вверху. Снятая галочка ничего не теряет — пункт вернётся, если поставить её снова.")));
            body.appendChild(el("div", "padding:2px 3px 2px; font-size:11px; color:var(--mlp-muted,#a6adc8);", t("Секции")));
            byPane.forEach(function (secs, pi) {
                if (!secs.length) return;
                body.appendChild(el("div", "margin-top:4px; padding:2px 3px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--mlp-head,#bac2de);", t(TABS[pi])));
                secs.forEach(function (s) {
                    body.appendChild(visRow(s.label || s.title, !(cfg.ui.hidden && cfg.ui.hidden[s.title]), function (vis) {
                        if (!cfg.ui.hidden) cfg.ui.hidden = {};
                        if (vis) delete cfg.ui.hidden[s.title]; else cfg.ui.hidden[s.title] = true;
                        saveCfg(); refreshPanel();
                    }, !!(cfg.ui.favSec && cfg.ui.favSec[s.title]), function (fav) {
                        if (!cfg.ui.favSec) cfg.ui.favSec = {};
                        if (fav) cfg.ui.favSec[s.title] = true; else delete cfg.ui.favSec[s.title];
                        saveCfg(); refreshPanel();
                    }));
                });
            });
            body.appendChild(el("div", "margin-top:8px; padding:2px 3px 2px; font-size:11px; color:var(--mlp-muted,#a6adc8);", t("Эффекты в сетке")));
            var fxGrid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:0 10px;");
            FX_LIST.forEach(function (o) {
                fxGrid.appendChild(visRow(t(o[1]), !(cfg.ui.hiddenFx && cfg.ui.hiddenFx[o[0]]), function (vis) {
                    if (!cfg.ui.hiddenFx) cfg.ui.hiddenFx = {};
                    if (vis) delete cfg.ui.hiddenFx[o[0]]; else cfg.ui.hiddenFx[o[0]] = true;
                    saveCfg(); refreshPanel();
                }, !!(cfg.ui.favFx && cfg.ui.favFx[o[0]]), function (fav) {
                    if (!cfg.ui.favFx) cfg.ui.favFx = {};
                    if (fav) cfg.ui.favFx[o[0]] = true; else delete cfg.ui.favFx[o[0]];
                    saveCfg(); refreshPanel();
                }));
            });
            body.appendChild(fxGrid);
            var showAll = el("div", "margin-top:8px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Показать всё"));
            showAll.addEventListener("click", function () { cfg.ui.hidden = {}; cfg.ui.hiddenFx = {}; saveCfg(); refreshPanel(); });
            keyActivate(showAll, t("Показать все секции и эффекты"));
            body.appendChild(showAll);
    }

    // ===== Наполнение блока «Избранное» =====
    // Строим В КОНЦЕ: нужны и полный список секций (panelAllSections), и навигация (sectionByTitle/
    // selectTab/flashSection). Секции показываем чипами-переходами (перенести их DOM в два места
    // нельзя), а эффекты — реальными тумблерами (быстрое включение без прыжков по вкладкам).
    // nav — то, что осталось внутри togglePanel и нужно переходам по избранным секциям:
    // поиск секции по заголовку, список панелей-вкладок, переключение вкладки и подсветка.
    function buildFavorites(favBox, panelBody, nav) {
            var box = favBox; if (!box) return;
            box.textContent = ""; box.hidden = true;
            var favSecTitles = [], favFxItems = [];
            panelAllSections.forEach(function (s) {
                if (s.title === "Настройка меню") return;
                if (cfg.ui.favSec && cfg.ui.favSec[s.title] && favSecTitles.indexOf(s.title) < 0) favSecTitles.push(s.title);
            });
            FX_LIST.forEach(function (o) { if (cfg.ui.favFx && cfg.ui.favFx[o[0]]) favFxItems.push(o); });
            var has = favSecTitles.length || favFxItems.length;
            if (!has && !panelEditMenu) return; // пусто и не в режиме «Настроить» — блок скрыт целиком
            box.hidden = false;
            box.appendChild(el("div", "margin:4px 2px 2px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", t("★ Избранное")));
            if (!has) {
                box.appendChild(el("div", "padding:3px 3px 5px; font-size:11px; color:var(--mlp-faint,#6c7086);", t("Отметь звёздочкой секции и эффекты в режиме «Настроить» — они появятся здесь для быстрого доступа.")));
            } else {
                if (favSecTitles.length) {
                    var chipRow = el("div", "display:flex; flex-wrap:wrap; gap:4px; padding:2px 2px 3px;");
                    favSecTitles.forEach(function (title) {
                        var chip = el("div", "flex:0 0 auto; padding:3px 8px; border-radius:6px; cursor:pointer; font-size:10.5px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.10); border:1px solid rgba(var(--mlbg-accent-rgb),0.22);", t(title));
                        chip.addEventListener("mouseenter", function () { chip.style.background = "rgba(var(--mlbg-accent-rgb),0.2)"; });
                        chip.addEventListener("mouseleave", function () { chip.style.background = "rgba(var(--mlbg-accent-rgb),0.1)"; });
                        chip.addEventListener("click", function () {
                            var s = nav.sectionByTitle(title); if (!s) return;
                            var ti = nav.tabPanes.indexOf(s.parent); if (ti >= 0) nav.selectTab(ti);
                            try { s.expand(); } catch (e) {} try { nav.flashSection(s.head); } catch (e) {}
                        });
                        keyActivate(chip, t("Перейти к секции") + ": " + t(title));
                        chipRow.appendChild(chip);
                    });
                    box.appendChild(chipRow);
                }
                if (favFxItems.length) {
                    var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px; padding:2px 0 3px;");
                    favFxItems.forEach(function (o) {
                        var node = makeCheck(o[0], o[1]);
                        var pOn = function () { previewFx(o[0]); }, pOff = function () { previewFxEnd(); };
                        node.addEventListener("mouseenter", pOn); node.addEventListener("mouseleave", pOff);
                        var cb = node.querySelector ? node.querySelector("input") : null;
                        if (cb) {
                            cb.addEventListener("change", function () { previewFxCancel(); if (!fxAffectsPanel(o[0])) { try { refreshPanel(); } catch (e) {} } }); // иначе makeCheck уже пересобрал
                            cb.addEventListener("focus", pOn); cb.addEventListener("blur", pOff);
                        }
                        grid.appendChild(node);
                    });
                    box.appendChild(grid);
                }
            }
            box.appendChild(el("div", "margin:5px 0 0; border-bottom:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));"));
    }

    // ===================== src/ui/panel-tabs.js =====================
    // ===== Наполнение вкладок панели =====
    // Каркас панели (шапка, вкладки, поиск, перетаскивание) собирает togglePanel в
    // src/ui/panel.js, а КАКИЕ секции лежат на каждой вкладке — здесь. Каждая функция получает
    // готовую страницу-вкладку и наполняет её секциями.
    //
    // Простой режим (panelSimple(), по умолчанию) показывает только главное: наборы и своя
    // картинка, яркость и акцент, стиль эффектов, образы. Остальное строится лишь в полном режиме.

    // ===== «Что нового» =====
    // Одна карточка после обновления: три строки и «Понятно». Показывается, пока cfg.ui.news не
    // равен NEWS_ID; следующий выпуск — новый NEWS_ID и новый текст.
    var NEWS_ID = "2026-09-27";
    var NEWS_TEXT = [
        "Простой режим: на виду только главное, остальное — «Все настройки».",
        "Своя картинка или целая папка — кнопками ниже или перетаскиванием в панель.",
        "Стили эффектов в один клик и копии настроек по дням."
    ];
    function makeNewsCard() {
        if (cfg.ui.news === NEWS_ID) return null;
        var card = el("div", null); card.className = "mlp-news";
        var ic = uiIcon("tab-fx", 28); if (ic) card.appendChild(ic);
        var body = el("div", "flex:1 1 auto; min-width:0;");
        body.appendChild(el("b", null, t("Что нового")));
        NEWS_TEXT.forEach(function (s) { body.appendChild(el("div", null, t(s))); });
        card.appendChild(body);
        var ok = el("div", null, t("Понятно")); ok.className = "mlp-hbtn";
        ok.addEventListener("click", function () { cfg.ui.news = NEWS_ID; saveCfg(); refreshPanel(); });
        keyActivate(ok, t("Понятно"));
        card.appendChild(ok);
        return card;
    }

    // ===== Один совет за раз =====
    // Панель сама замечает типичную проблему и предлагает одно действие. Не больше одного совета
    // одновременно; «Не показывать» запоминается (cfg.ui.tipsOff). Совет исчезает, как только
    // проблема решена.
    function currentTip() {
        var off = cfg.ui.tipsOff || {};
        try {
            var r = readability();
            if (!off.readable && r && !r.off && r.worstRatio < 4.5)
                return { id: "readable", text: "Код местами читается хуже: картинка слишком яркая под текстом.", btn: "Приглушить фон",
                    act: function () { fixReadability(4.5); apply(); toast(t("Фон приглушён ровно настолько, чтобы код читался")); } };
            var st = probeImage(zoneUrl(activeIndex(), "editor"));
            if (!off.autodim && !cfg.autoDim && st && typeof st.luma === "number" && st.luma > 0.55)
                return { id: "autodim", text: "Картинка светлая — включить авто-яркость, чтобы код не терялся?", btn: "Включить",
                    act: function () { cfg.autoDim = true; apply(); } };
        } catch (e) {}
        return null;
    }
    function makeTipCard() {
        var tip = currentTip(); if (!tip) return null;
        var card = el("div", null); card.className = "mlp-tip";
        card.appendChild(el("span", "flex:1 1 auto;", t(tip.text)));
        var go = el("div", null, t(tip.btn)); go.className = "mlp-hbtn on";
        go.addEventListener("click", function () { tip.act(); refreshPanel(); });
        keyActivate(go, t(tip.btn));
        var no = el("div", null, "\u2715"); no.className = "mlp-hbtn"; no.title = t("Не показывать этот совет");
        no.addEventListener("click", function () { if (!cfg.ui.tipsOff) cfg.ui.tipsOff = {}; cfg.ui.tipsOff[tip.id] = true; saveCfg(); refreshPanel(); });
        keyActivate(no, t("Не показывать этот совет"));
        card.appendChild(go); card.appendChild(no);
        return card;
    }

    // Вкладка «Набор»: какой фон показывать и откуда он берётся.
    function buildTabSets(tSet) {
        var simple = panelSimple();
        var news = makeNewsCard(); if (news) tSet.appendChild(news);
        var secSet = collapsible(tSet, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске. Свою картинку можно выбрать кнопкой или перетащить в панель.");
        // Фильтр «Все / Любимые»: наборов 25+, любимые (звёздочка на карточке) удобно держать отдельно.
        // Активный набор показываем всегда — чтобы было видно, что выбрано.
        var favN = 0; for (var fi = 0; fi < SETS.length; fi++) if (isFavSet(fi)) favN++;
        var onlyFav = !!cfg.ui.favOnly;
        secSet.appendChild(makeSeg("", [["all", "Все"], ["fav", t("Любимые") + (favN ? " · " + favN : "")]],
            function () { return onlyFav ? "fav" : "all"; },
            function (v) {
                cfg.ui.favOnly = v === "fav"; saveCfg(); refreshPanel();
            }));
        var chips = el("div", null); chips.className = "mlp-sets";
        for (var i = 0; i < SETS.length; i++) {
            if (onlyFav && !isFavSet(i) && cfg.mode !== String(i)) continue;
            chips.appendChild(makeChip(String(i), String(i)));
        }
        if (onlyFav && !favN) secSet.appendChild(emptyState("Отметь наборы звёздочкой на карточке — они появятся здесь"));
        chips.appendChild(makeChip("random", "случайно"));
        secSet.appendChild(chips);
        secSet.appendChild(makeOwnImageRow()); // своя картинка / папка картинок
        if (!simple) secSet.appendChild(makeSetNameEdit()); // переименование активного набора

        if (simple) return;
        // Генератор набора по seed/палитре: бесконечные согласованные фоны без ассетов.
        var secGen = collapsible(tSet, "Генератор", "Создать согласованный набор из seed-строки или базового цвета (#rrggbb): тёмная подложка + акцент + гармоничный спутник. Один seed всегда даёт один и тот же набор — им можно делиться. Наборы сохраняются и добавляются в конец списка.");
        secGen.appendChild(makeGenerator());

        // Библиотека своих картинок: список локальных путей, крутится в редакторе по таймеру слайдшоу.
        var secLib = collapsible(tSet, "Библиотека", "Свои картинки списком: когда «Крутить библиотеку» включено, они по очереди показываются в редакторе и сменяются по таймеру слайдшоу (интервал — на вкладке «Авто-смена»). Пути локальные: file:/// или vscode-file://.");
        secLib.appendChild(makeLibraryUI());

        // Свой шейдер: тоже «свой источник фона», только считаемый на GPU.
        var secShader = collapsible(tSet, "Шейдер", "Свой GLSL-фон для набора «Свой шейдер»: тело функции render(vec2 p). Ошибка компиляции не ломает редактор — фон откатится на встроенный.");
        secShader.appendChild(makeShaderSrcUI());
    }

    // Карточка «Сейчас работает»: какой набор на экране и какое правило его выбрало.
    function makeActiveRuleCard() {
        var r = activeRule();
        var card = el("div", null); card.className = "mlp-now";
        var pv = el("div", null); pv.className = "mlp-now-pv";
        try { paintSetPreview(pv, r.idx); } catch (e) {}
        card.appendChild(pv);
        var txt = el("div", null); txt.className = "mlp-now-t";
        var nm = setName(r.idx);
        txt.appendChild(el("b", null, t("Сейчас: набор ") + r.idx + (nm ? " · " + nm : "")));
        var WHY = {
            workspace: t("по проекту") + (r.key ? " «" + r.key + "»" : ""),
            remote: t("по репозиторию") + (r.key ? " «" + r.key + "»" : ""),
            branch: t("по ветке") + (r.key ? " «" + r.key + "»" : ""),
            lang: t("по языку файла") + (r.key ? " «" + r.key + "»" : ""),
            random: t("случайный при каждом запуске"),
            time: t("по времени суток"),
            slide: t("слайдшоу"),
            manual: t("выбран вручную — авто-смена выключена")
        };
        var why = WHY[r.why] || "";
        if (cfg.librarySlideshow) why += t("; в редакторе крутится библиотека");
        txt.appendChild(el("span", null, t("Правило: ") + why));
        card.appendChild(txt);
        return card;
    }

    // Вкладка «Авто-смена»: правила выбора набора в порядке старшинства (как в activeIndex):
    // сработает верхнее включённое. Номер и «вкл» — прямо в заголовке секции.
    function buildTabAuto(tAuto) {
        tAuto.appendChild(makeActiveRuleCard());
        tAuto.appendChild(el("div", "padding:6px 3px 0; font-size:11px; color:var(--mlp-faint);",
            t("Правила ниже — по старшинству: срабатывает верхнее включённое.")));
        function rule(n, title, on, info) { return collapsible(tAuto, title, info, { num: n, on: !!on }); }

        var secWs = rule(1, "По проекту", cfg.autoWorkspace, "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.");
        secWs.appendChild(makeWorkspaceUI());
        secWs.appendChild(makeAmbientBranchToggle());

        var secRemote = rule(2, "По репозиторию", cfg.autoRemote, "Набор под удалённый репозиторий (владелец/имя): один и тот же проект, склонированный в разные папки, получает один фон. Адрес репозитория берётся из git через компаньон-расширение — из вёрстки редактора его не достать.");
        secRemote.appendChild(makeRemoteAutoUI());

        var secBranch = rule(3, "По ветке", cfg.autoBranch, "Набор под текущую git-ветку: main/master — один, фиче-ветки — другой. Приоритетнее слайдшоу и времени суток, но уступает «по проекту». Ветка читается из статусбара VS Code.");
        secBranch.appendChild(makeBranchAutoUI());

        var secLang = rule(4, "По языку", cfg.autoLang, "Набор под язык активного файла (по расширению): напр. .py — один набор, .md — другой. Самый частый контекст (низший приоритет). Расширение читается из подписи активной вкладки.");
        secLang.appendChild(makeLangAutoUI());

        var secTime = rule(5, "По времени суток", cfg.autoTime && cfg.autoTime.on, "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
        secTime.appendChild(makeAutoTimeToggle());
        secTime.appendChild(makeSetPicker("day", "Дневной"));
        secTime.appendChild(makeSetPicker("night", "Ночной"));
        secTime.appendChild(makeAutoTimeMode());
        if (cfg.autoTime && cfg.autoTime.mode === "sun") {
            secTime.appendChild(makeObjSlider(cfg.autoTime, "lat", "Широта", -90, 90, 1, 0, INFO.autotime_lat, DEFAULTS.autoTime.lat));
            secTime.appendChild(makeObjSlider(cfg.autoTime, "lon", "Долгота", -180, 180, 1, 0, INFO.autotime_lon, DEFAULTS.autoTime.lon));
        } else {
            secTime.appendChild(makeObjSlider(cfg.autoTime, "from", "День с, ч", 0, 23, 1, 0, INFO.autotime_from, DEFAULTS.autoTime.from));
            secTime.appendChild(makeObjSlider(cfg.autoTime, "to", "День до, ч", 0, 23, 1, 0, INFO.autotime_to, DEFAULTS.autoTime.to));
        }

        var secSlide = rule(6, "Слайдшоу", cfg.slideshow && cfg.slideshow.on, "Автоматическая смена набора по кругу через заданный интервал.");
        secSlide.appendChild(makeSlideToggle());
        if (cfg.slideshow.on) secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min, DEFAULTS.slideshow.min));
    }

    // Вкладка «Вид»: как этот фон выглядит и не мешает ли он читать код.
    function buildTabView(tView) {
        var simple = panelSimple();
        // Одна «Яркость фона» + раскрытие «по зонам»; авто-яркость и метр читаемости рядом.
        var secOp = collapsible(tView, "Яркость набора", "Насколько ярко проступает фон. Один ползунок двигает все зоны сразу; «по зонам» — тонкая настройка редактора, сайдбара и панели.");
        secOp.appendChild(makeOpMaster());
        if (!simple) secOp.appendChild(makeAutoDim());
        secOp.appendChild(makeReadabilityUI());

        // Картинка: акцент (+ палитры) и в полном режиме — точка фокуса и фильтры картинки.
        var secImg = collapsible(tView, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
        secImg.appendChild(makeAccentColor());
        secImg.appendChild(makeAccentSafeUI());
        secImg.appendChild(makeImgLook());
        if (simple) return;
        secImg.appendChild(makeFocusPoint());
        secImg.appendChild(makeImgFilters());

        // Витрина/скринсейвер: после простоя — крупные часы и имя набора поверх экрана.
        var secSaver = collapsible(tView, "Витрина", "После нескольких минут простоя показывает крупные часы, дату и имя набора поверх экрана; любое действие возвращает редактор. Удобно для стрима и «настроения» рабочего стола.");
        secSaver.appendChild(makeScreensaverToggle());
        if (cfg.screensaver.on) secSaver.appendChild(makeObjSlider(cfg.screensaver, "min", "Простой, мин", 1, 60, 1, 0, INFO.screensaver_min, DEFAULTS.screensaver.min));
    }

    // Вкладка «Эффекты»: сверху стили (готовые профили — один клик вместо полусотни тумблеров),
    // ниже в полном режиме — тонкая настройка каждого эффекта.
    function buildTabFx(tFx) {
        var secStyle = collapsible(tFx, "Стили", "Готовые стили вида: спокойный, фокус, презентация, минимал, максимум. Один клик настраивает фон и эффекты целиком. Наведи — примерка без применения.");
        secStyle.appendChild(makeProfilesUI());
        if (panelSimple()) {
            var more = makeIoBtn("Тонкая настройка эффектов");
            more.style.marginTop = "10px";
            more.addEventListener("click", function () { cfg.ui.simple = false; cfg.ui.tab = tabIndex("Эффекты"); saveCfg(); refreshPanel(); });
            tFx.appendChild(more);
            return;
        }
        var secFx = collapsible(tFx, "Эффекты", "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — пояснение и живой предпросмотр. Эффекты сгруппированы по смыслу; «только включённые» прячет выключенные. Конкретный эффект ищи полем поиска вверху панели.");
        buildEffectsSection(secFx);
    }

    // Образец терминала для вкладки «Терминал». _sync() перечитывает cfg.term.
    function makeTermSample() {
        var box = el("div", null); box.className = "mlp-term";
        var l1 = el("div", null);
        l1.appendChild(el("span", "color:#a6e3a1;", "~/project"));
        l1.appendChild(el("span", "color:var(--mlbg-accent);", " git:(main) "));
        l1.appendChild(el("span", null, "npm run build"));
        var l2 = el("div", null);
        l2.appendChild(el("span", "color:#89b4fa;", "=> "));
        l2.appendChild(el("span", null, "const ok = a !== b && x >= 0;"));
        var l3 = el("div", null);
        l3.appendChild(el("span", "color:#f9e2af;", "$ "));
        var sel = el("span", null, "echo done"); l3.appendChild(sel);
        l3.appendChild(el("span", null, " "));
        var cur = el("span", null); cur.className = "mlp-term-cur"; l3.appendChild(cur);
        box.appendChild(l1); box.appendChild(l2); box.appendChild(l3);
        box._sync = function () {
            try {
                var tm = cfg.term, g = Number(tm.glow) || 0, cc = effTermColor("cursorColor");
                box.style.fontFamily = "'" + tm.font + "', var(--vscode-editor-font-family, monospace), monospace";
                box.style.fontWeight = String(tm.weight || 400);
                box.style.fontVariantLigatures = tm.ligatures ? "normal" : "none";
                box.style.fontFeatureSettings = tm.ligatures ? "normal" : "'liga' 0, 'calt' 0";
                box.style.textShadow = g > 0 ? "0 0 " + g + "px rgba(var(--mlbg-accent-rgb)," + Math.min(g * 0.1, 0.6).toFixed(2) + ")" : "none";
                sel.style.background = effTermColor("selColor"); sel.style.borderRadius = "2px";
                var cw = Math.max(1, Math.round(2 + (Number(tm.cursorSize) || 1) * 3)), ch = Math.max(0.6, Math.min(1.4, 0.6 + (Number(tm.cursorHeight) || 1) * 0.35));
                cur.style.width = cw + "px"; cur.style.height = ch.toFixed(2) + "em";
                cur.style.background = cc;
                cur.style.boxShadow = tm.cursorGlow ? "0 0 8px " + cc : "none";
            } catch (e) {}
        };
        box._sync();
        return box;
    }

    // Вкладка «Терминал»: типографика встроенного терминала.
    function buildTabTerm(tTerm) {
        var secTerm = collapsible(tTerm, "Терминал", "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение. Цвета курсора и выделения, пока их не меняли, следуют за акцентом набора.");
        // Живой образец: контролы секции меняют cfg.term без пересборки панели, поэтому образец
        // слушает их события сам (как образец текста в настройках cpp-docs-panel).
        var sample = makeTermSample();
        secTerm.appendChild(sample);
        ["input", "change", "click"].forEach(function (ev) { secTerm.addEventListener(ev, function () { setTimeout(sample._sync, 0); }); });
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
    }

    // Что-то не так с установкой: картинка активного набора не грузится или не пишется резерв
    // на диск. Тогда технические секции «Системы» показываются сами.
    function installProblem() {
        try {
            var idx = activeIndex(), Z = ["editor", "sidebar", "panel"];
            for (var i = 0; i < Z.length; i++) {
                var u = zoneUrl(idx, Z[i]); if (!u) continue;
                var st = probeImage(u);
                if (st && st.resolved && !st.ok && !st.none) return true;
            }
            if (typeof _disk === "object" && _disk.lastErr) return true;
        } catch (e) {}
        return false;
    }

    // Вкладка «Система»: язык, горячие клавиши, знакомство; технические секции — по нужде.
    function buildTabSys(tSys) {
        tSys.appendChild(makeLangSelect());
        // Горячие клавиши целиком: выключены — не перехватываются и не упоминаются в интерфейсе.
        tSys.appendChild(makeToggle(hotkeysOn, function (v) {
            cfg.ui.keys = v; saveCfg(); try { updateLabel(); } catch (e) {} refreshPanel();
        }, "Горячие клавиши", INFO.hotkeys));

        var btns = el("div", "display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;");
        var tourB = makeIoBtn("Показать знакомство с панелью");
        tourB.addEventListener("click", function () { try { startTour(); } catch (e) {} });
        btns.appendChild(tourB);
        var problem = installProblem();
        if (!panelShowTech && !problem) {
            // Всё работает — диагностика, загрузчик и папка плагина не нужны. Кнопка раскрывает их.
            var techB = makeIoBtn("Проблемы с фоном? Проверить установку");
            techB.addEventListener("click", function () { panelShowTech = true; refreshPanel(); });
            btns.appendChild(techB);
        }
        tSys.appendChild(btns);

        if (panelShowTech || problem) {
            if (problem) tSys.appendChild(el("div", "margin-top:8px; padding:7px 10px; border-radius:10px; font-size:11.5px; color:#f38ba8; background:rgba(243,139,168,0.10); border:1px solid rgba(243,139,168,0.3);",
                t("Похоже, картинки набора не грузятся — проверь «Папку плагина» и диагностику ниже.")));
            var secDiag = collapsible(tSys, "Диагностика", "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, найден ли стиль). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.");
            secDiag.appendChild(makeDiagnosticsUI());
            var secLoader = collapsible(tSys, "Загрузчик", "Каким путём внедрён плагин (Moon Core, Custom UI Style или Custom CSS and JS) и готово ли окно к настоящей прозрачности. Кнопки кладут в буфер нужные строки для settings.json.");
            secLoader.appendChild(makeLoaderUI());
            var secBase = collapsible(tSys, "Папка плагина", "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.");
            secBase.appendChild(makeImgBaseField());
            secBase.appendChild(makeRemoteImagesToggle());
        }

        // Справка по горячим клавишам — только когда они включены (сами хоткеи — boot.js, onHotkey).
        if (hotkeysOn()) {
            var secKeys = collapsible(tSys, "Горячие клавиши", "Быстрые действия без открытия панели. Работают на любой раскладке (RU/EN).");
            [
                ["Ctrl+Alt+B", "Открыть / закрыть панель"],
                ["Ctrl+Alt+P", "Быстрый переключатель (наборы, эффекты, команды)"],
                ["Ctrl+Alt+.", "Следующий набор"],
                ["Ctrl+Alt+,", "Предыдущий набор"],
                ["Ctrl+Alt+0", "Фон и эффекты вкл / выкл"],
                ["Ctrl+Alt+R", "Режим чтения вкл / выкл"],
                ["Ctrl+Alt+Z", "Отменить изменение вида"],
                ["Ctrl+Alt+Y", "Повторить отменённое"]
            ].forEach(function (k) {
                var row = el("div", "display:flex; align-items:center; gap:8px; padding:2px 3px;");
                row.appendChild(el("kbd", "flex:0 0 92px; font-family:var(--vscode-editor-font-family,monospace); font-size:10px; text-align:center; padding:2px 4px; border-radius:6px; background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3); color:var(--mlbg-accent);", k[0]));
                row.appendChild(el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted);", t(k[1])));
                secKeys.appendChild(row);
            });
        }

        // Настройка меню: тело заполняет buildMenuManager, когда созданы все секции всех вкладок.
        var secMenuBody = collapsible(tSys, "Настройка меню", "Показать/скрыть секции и эффекты панели, чтобы меню не разрасталось. Сними галочку — пункт исчезнет из панели (настройки не теряются), «Показать всё» вернёт всё. Быстро скрыть прямо в панели — кнопка «Настроить» в шапке.");
        return secMenuBody;
    }

    // Подзаголовок внутри секции (для «Образов», где под одной крышей несколько блоков).
    function subHead(text) {
        return el("div", "margin:10px 2px 4px; font-size:11px; font-weight:700; color:var(--mlp-head);", t(text));
    }

    // Копии настроек за последние дни (Moon Core пишет по одной в день): клик — вернуть.
    function makeDailyCopiesUI() {
        var list = dailyList();
        if (!list.length) return null;
        var box = el("div", null);
        box.appendChild(subHead("Копии настроек по дням"));
        var row = el("div", "display:flex; flex-wrap:wrap; gap:5px;");
        list.forEach(function (x) {
            var b = el("div", null, x.day.slice(5).split("-").reverse().join(".")); b.className = "mlp-chip";
            b.title = t("Вернуть настройки на ") + x.day;
            b.addEventListener("click", function () {
                backupCfg();
                var keepUi = cfg.ui;
                cfg = mergeCfg(x.cfg); cfg.ui = keepUi;
                syncGenSets(); apply(); refreshPanel();
                toast(t("Настройки возвращены на ") + x.day + t(" — отменить: «Восстановить прежние настройки»"));
            });
            keyActivate(b, b.title);
            row.appendChild(b);
        });
        box.appendChild(row);
        return box;
    }

    // Вкладка «Данные»: образы вида, обмен и управление конфигом.
    function buildTabData(tData) {
        var simple = panelSimple();
        // «Образы»: сохранённые виды, обмен кодом и синхронизация — одна секция вместо четырёх.
        var secLooks = collapsible(tData, "Образы", "Сохранённые образы вида: весь вид под именем, переключение одним кликом (наведи — примерка). Ниже — обмен коротким кодом и перенос на другие машины.");
        secLooks.appendChild(makePresetsUI());
        secLooks.appendChild(subHead("Поделиться кодом"));
        secLooks.appendChild(makeShareUI());
        if (!simple) {
            secLooks.appendChild(subHead("Между машинами"));
            secLooks.appendChild(makeSyncUI());

            var secStats = collapsible(tData, "Статистика", "Сводка текущей сессии: время, тронутые файлы, нажатия, суммарное время в потоке и лучший стрик непрерывной печати. Копится, пока включён тумблер «Статистика» (вкладка «Эффекты»). Данные живут только в этой сессии.");
            secStats.appendChild(makeStatsUI());

            var secTheme = collapsible(tData, "Экспорт темы", "Собрать настоящую VS Code-тему (color-theme.json) из палитры активного набора: цвета интерфейса + подсветка синтаксиса. Работает там, где custom-фон недоступен. Как применить — в пояснении: задержи курсор на кнопке.");
            secTheme.appendChild(makeThemeExportUI());
        }

        // экспорт / импорт
        var io = el("div", "display:flex; gap:8px; margin-top:12px;");
        var expB = makeIoBtn("Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
        var impB = makeIoBtn("Импорт"); impB.addEventListener("click", function () { importCfg(); });
        io.appendChild(expB); io.appendChild(impB);
        tData.appendChild(io);
        if (!simple) tData.appendChild(makeHistoryUI()); // те же кнопки есть в шапке панели

        // Опасная зона: копии по дням, восстановление из резерва и полный сброс (со второго клика).
        var danger = el("div", null); danger.className = "mlp-danger";
        var drow = el("div", "display:flex; gap:8px; flex-wrap:wrap;");
        if (hasBackup()) {
            var restB = makeIoBtn("Восстановить прежние настройки");
            restB.addEventListener("click", function () { restoreBackup(); });
            drow.appendChild(restB);
        }
        var reset = makeIoBtn("Сбросить к дефолту"), armed = 0;
        reset.addEventListener("click", function () {
            if (!armed) {
                reset.textContent = t("Точно сбросить? Нажми ещё раз");
                armed = setTimeout(function () { armed = 0; try { reset.textContent = t("Сбросить к дефолту"); } catch (e) {} }, 3500);
                return;
            }
            clearTimeout(armed); armed = 0;
            var keepMode = cfg.mode, keepUi = cfg.ui; // сброс дизайна, но не положения/свёрнутости панели
            backupCfg();                              // прежние настройки -> резерв (сброс можно откатить)
            cfg = clone(DEFAULTS); cfg.mode = keepMode; cfg.ui = keepUi;
            syncGenSets(); // дефолт без ген-наборов -> обрезать хвост SETS; keepMode на ген-набор зажмётся на 0
            apply(); refreshPanel();
        });
        drow.appendChild(reset);
        danger.appendChild(drow);
        var daily = makeDailyCopiesUI(); if (daily) danger.appendChild(daily);
        tData.appendChild(danger);
    }

    // Какая функция наполняет какую вкладку (ключ — имя из TABS в panel.js).
    var PANEL_TAB_BUILDERS = {
        "Набор": buildTabSets, "Авто-смена": buildTabAuto, "Вид": buildTabView, "Эффекты": buildTabFx,
        "Терминал": buildTabTerm, "Данные": buildTabData, "Система": buildTabSys
    };

    // ===================== src/ui/panel.js =====================


    // ===== Панель настроек =====
    // Централизованное закрытие: снимает документные слушатели (Esc/клик-мимо), прячет «?»,
    // удаляет саму панель. panelCleanup хранит отписку слушателей текущей панели.
    var panelCleanup = null, panelPrevFocus = null;
    // Категории панели. Порядок = порядок вкладок и порядок функций наполнения в
    // src/ui/panel-tabs.js; на эти же имена опирается менеджер «Настройка меню».
    // TAB_META[i] = [значок из UI_ICONS, подпись под заголовком страницы].
    var TABS = ["Набор", "Авто-смена", "Вид", "Эффекты", "Терминал", "Данные", "Система"];
    var TAB_META = [
        ["tab-set", "Какой фон показывать и откуда он берётся"],
        ["tab-auto", "Когда и по какому поводу фон меняется сам"],
        ["tab-view", "Яркость, акцент и фильтры картинки"],
        ["tab-fx", "Анимации, стекло, частицы и виджеты"],
        ["tab-term", "Шрифт, курсор и свечение терминала"],
        ["tab-data", "Профили, пресеты, обмен и резервные копии"],
        ["tab-sys", "Язык, загрузчик, диагностика и состав меню"]
    ];
    function tabIndex(name) { return TABS.indexOf(name); }
    // Простой режим (cfg.ui.simple, по умолчанию): только главное — набор, яркость и акцент,
    // стиль эффектов, образы. Остальные вкладки и секции появляются по кнопке «Все настройки».
    // Раньше всё было видно сразу, и полсотни контролов отпугивали с первого взгляда.
    var SIMPLE_TABS = ["Набор", "Вид", "Эффекты", "Данные"];
    function panelSimple() { return !(cfg.ui && cfg.ui.simple === false); }
    function tabVisible(name) { return !panelSimple() || SIMPLE_TABS.indexOf(name) >= 0; }
    // Технические секции «Системы» (диагностика, загрузчик, папка) видны, только когда с фоном
    // что-то не так, или по кнопке «Проверить установку». Флаг живёт до закрытия панели.
    var panelShowTech = false;
    // Поиск на неправильной раскладке: «yf,jh» -> «набор», «ыуеы» -> «sets».
    var KB_EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,." + String.fromCharCode(96), KB_RU = "йцукенгшщзхъфывапролджэячсмитьбюё";
    function swapLayout(s) {
        var out = "";
        for (var i = 0; i < s.length; i++) {
            var ch = s[i], a = KB_EN.indexOf(ch), b = KB_RU.indexOf(ch);
            out += a >= 0 ? KB_RU[a] : (b >= 0 ? KB_EN[b] : ch);
        }
        return out;
    }
    // Горячие клавиши можно выключить целиком (cfg.ui.keys): тогда они не перехватываются,
    // а их подписи и справка пропадают из интерфейса.
    function hotkeysOn() { return !(cfg.ui && cfg.ui.keys === false); }
    // Активная вкладка-категория панели (см. TABS в togglePanel). Модульная переменная, а не
    // поле cfg: переживает refreshPanel (пересборку панели таймерами/действиями) в пределах
    // сессии, но не тянет за собой миграцию схемы конфига. Индекс валидируется при выборе.
    var panelTab = 0;
    // Индекс секций для поиска по панели: collapsible() регистрирует сюда каждую свою секцию
    // ({title, parent-вкладка, head, expand}). Обнуляется в начале togglePanel (панель строится
    // заново), наполняется по мере создания секций, читается обработчиком поиска над баром вкладок.
    var panelSections = [];
    // Все секции текущей сборки, включая СКРЫТЫЕ (для менеджера «Настройка меню»). Наполняется
    // collapsible(), обнуляется в начале togglePanel. panelEditMenu — режим настройки меню (кнопки
    // «скрыть» у секций и эффектов); модульный, переживает refreshPanel в пределах сессии.
    var panelAllSections = [], panelEditMenu = false;
    // ===== Каталог для глубокого поиска =====
    // Поиск по панели раньше знал только заголовки секций и имена эффектов — отдельные контролы
    // («язык», «курсор», «яркость», «интервал») не находились. Этот каталог добавляет их в индекс:
    // [подпись, индекс вкладки, заголовок секции ("" — контрол вне секции), синонимы (RU+EN)].
    // Совпадение по подписи ИЛИ синониму ведёт к секции (разворот+подсветка) или просто к вкладке.
    /** @type {Array<[string, number, string, string]>} подпись, вкладка, секция, синонимы */
    var PANEL_SEARCH_CATALOG = [
        ["Яркость: редактор", 2, "Яркость набора", "прозрачность opacity фон код editor brightness"],
        ["Яркость: сайдбар", 2, "Яркость набора", "прозрачность opacity sidebar проводник"],
        ["Яркость: панель", 2, "Яркость набора", "прозрачность opacity panel терминал"],
        ["Авто-яркость", 2, "Яркость набора", "autodim читаемость светлая картинка"],
        ["Акцентный цвет", 2, "Картинка", "accent цвет hex палитра из картинки"],
        ["Читаемость кода", 2, "Яркость набора", "контраст wcag читаемость скрим адаптивный исправить"],
        ["Загрузчик", 6, "Загрузчик", "custom-css custom-ui-style прозрачность mica vibrancy импорт settings"],
        ["Свой шейдер", 0, "Шейдер", "glsl webgl шейдер фон gpu"],
        ["Безопасные акценты", 2, "Картинка", "дальтоник контраст wcag colorblind окабэ"],
        ["Фильтры картинки", 2, "Картинка", "размытие blur яркость brightness насыщенность saturate вписывание fit путь"],
        ["Сила эффектов", 3, "Эффекты", "размытие стекла ken burns виньетка помидор aurora спот тон strength ползунок"],
        ["Стиль частиц", 3, "Эффекты", "particles форма снег сакура дождь конфетти звёзды"],
        ["Сброс эффектов", 3, "Эффекты", "reset дефолт по умолчанию"],
        ["Шрифт терминала", 4, "Терминал", "font nerd jetbrains моноширинный"],
        ["Лигатуры", 4, "Терминал", "ligatures слитные символы"],
        ["Курсор терминала", 4, "Терминал", "cursor цвет ширина высота"],
        ["Выделение терминала", 4, "Терминал", "selection цвет"],
        ["Свечение терминала", 4, "Терминал", "glow тень"],
        ["Интервал слайдшоу", 1, "Слайдшоу", "минуты interval таймер смена"],
        ["Границы дня", 1, "По времени суток", "рассвет закат часы sun день ночь"],
        ["Язык панели", 6, "", "language ru en english русский интерфейс"],
        ["Экспорт настроек", 5, "", "export json файл сохранить бэкап"],
        ["Импорт настроек", 5, "", "import json файл загрузить"],
        ["Отменить / Повторить", 5, "", "undo redo история отменить повторить"],
        ["Сбросить к дефолту", 5, "", "reset сброс всё по умолчанию"]
    ];
    var _panelRebuilding = false; // refreshPanel: закрытие ради пересборки не гасит знакомство
    function closePanel() {
        hideInfo();
        if (!_panelRebuilding) { try { endTour(false); } catch (e) {} panelShowTech = false; }
        try { previewEnd(); } catch (e) {} // снять «залипшее» превью и вернуть реальный набор: удалённый чип может не прислать mouseleave
        try { previewFxEnd(); } catch (e) {} // снять «залипшее» превью эффекта (строка могла не прислать mouseleave)
        try { endLookPreview(); } catch (e) {} // снять «залипшее» превью образа (профиль/пресет мог не прислать mouseleave)
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
    // Прокручиваемая область панели: страница справа от вкладок (сама панель не скроллится).
    function panelScroller(p) {
        try { var sc = p && p.querySelector && p.querySelector(".mlp-pages"); if (sc) return sc; } catch (e) {}
        return p;
    }
    function togglePanel(ev) {
        ev.stopPropagation();
        if (document.getElementById(PANEL_ID)) { closePanel(); return; }
        try { closeQuickMenu(); } catch (e) {}
        ensurePanelCss();

        panelSections = []; // индекс секций для поиска — заново под текущую сборку панели
        panelAllSections = []; // полный список секций (в т.ч. скрытых) для менеджера «Настройка меню»
        panelFxNodes = {}; // карта key -> строка-тумблер эффекта (для прокрутки к эффекту из поиска)
        panelPrevFocus = document.activeElement; // куда вернуть фокус при закрытии
        var p = el("div", null);
        p.id = PANEL_ID;
        p.setAttribute("role", "dialog");
        p.setAttribute("aria-modal", cfg.ui.pinned ? "false" : "true");
        p.setAttribute("aria-label", t("Фон и дизайн — настройки"));
        p.tabIndex = -1; // чтобы можно было сфокусировать сам диалог при открытии
        // Ширина: запомненная (cfg.ui.width) или 560 — под колонку вкладок слева. Тянется за
        // левый край (ручка ниже). Уже 470 px вкладки сворачиваются до значков (.mlp-narrow).
        var PANEL_W_MIN = 320, PANEL_W_MAX = 760, panelW = 580, NARROW_W = 480;
        if (typeof cfg.ui.width === "number") panelW = Math.max(PANEL_W_MIN, Math.min(PANEL_W_MAX, cfg.ui.width));
        try { panelW = Math.min(panelW, (window.innerWidth || 800) - 16); } catch (e) {}
        function syncNarrow(w) { try { p.classList.toggle("mlp-narrow", w < NARROW_W); } catch (e) {} }
        // Высота фиксированная: при смене вкладки окно не прыгает (оно привязано к кнопке BG снизу).
        p.style.cssText =
            "position:fixed; z-index:100000; width:" + panelW + "px; height:min(640px, 82vh); box-sizing:border-box;" +
            "background:var(--mlp-bg); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.35); font-size:12px; line-height:1.35; color:var(--mlp-fg);" +
            "font-family:var(--vscode-font-family, sans-serif);";
        syncNarrow(panelW);
        // Палитра панели как CSS-переменные на её корне: контролы и panel-css.js читают --mlp-*.
        // На светлой теме значения светлые, иначе панель оставалась тёмной поверх светлого VS Code.
        // --mlp-tint — RGB нейтрального оттенка для полупрозрачных подложек (карточки, треки).
        (function () {
            var V = isLightTheme() ? {
                fg: "#1e1e2e", muted: "#5c5f77", faint: "#6b6e85", field: "rgba(255,255,255,0.75)",
                border: "rgba(30,30,46,0.22)", borderSoft: "rgba(30,30,46,0.16)", borderFaint: "rgba(30,30,46,0.12)",
                head: "#4c4f69", bg: "rgba(245,245,250,0.98)", tint: "30,30,46"
            } : {
                fg: "#cdd6f4", muted: "#a6adc8", faint: "#8b93ad", field: "rgba(30,30,46,0.6)",
                border: "rgba(205,214,244,0.2)", borderSoft: "rgba(205,214,244,0.16)", borderFaint: "rgba(205,214,244,0.12)",
                head: "#bac2de", bg: "rgba(24,24,37,0.97)", tint: "205,214,244"
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
                p.style.setProperty("--mlp-tint", V.tint);
                // Светлая тема: пастельный акцент набора как цвет текста/рамок на светлом фоне не
                // читается. Внутри панели подменяем его затемнённым до контраста 4.5:1 (оттенок тот же).
                if (isLightTheme()) {
                    var dark = accentForContrast(safeColor(getAccent(), DEFAULTS.accent), "#f5f5fa", 4.5);
                    p.style.setProperty("--mlbg-accent", dark);
                    p.style.setProperty("--mlbg-accent-rgb", hexToRgbArr(dark).join(","));
                    p.style.setProperty("--mlp-on-accent", "#ffffff"); // текст на затемнённом акценте
                }
            } catch (e) {}
        })();
        p.addEventListener("click", function (e) { e.stopPropagation(); });
        // Перетащить картинку (из проводника VS Code) в панель — она станет фоном активного набора.
        p.addEventListener("dragover", function (e) {
            var dt = e.dataTransfer; if (!dt) return;
            e.preventDefault(); try { dt.dropEffect = "copy"; } catch (er) {}
            p.classList.add("mlp-drop");
        });
        p.addEventListener("dragleave", function (e) { if (!p.contains(/** @type {Node} */ (e.relatedTarget))) p.classList.remove("mlp-drop"); });
        p.addEventListener("drop", function (e) {
            e.preventDefault(); p.classList.remove("mlp-drop");
            var url = droppedImageUrl(e.dataTransfer);
            if (url) setUserImage(url);
            else toast(t("Перетащи картинку из проводника VS Code или нажми «Своя картинка…»"), false);
        });

        // ===== Шапка: значок, заголовок с подписью, кнопки действий. Она же — ручка перетаскивания =====
        var head = el("div", null); head.className = "mlp-head";
        var hic = el("div", null); hic.className = "mlp-hic";
        var logo = uiIcon("logo", 26); if (logo) hic.appendChild(logo);
        head.appendChild(hic);
        var ht = el("div", null); ht.className = "mlp-ht";
        ht.appendChild(el("b", null, t("Фон и дизайн")));
        ht.appendChild(el("span", null, t("Всё меняется сразу — сохранять не нужно")));
        head.appendChild(ht);
        var hbtns = [];
        function hbtn(text, title, onClick, extraCls) {
            var b = el("div", null, text); b.className = "mlp-hbtn" + (extraCls ? " " + extraCls : "");
            b.title = title;
            b.addEventListener("click", function (e) { e.stopPropagation(); onClick(); });
            keyActivate(b, title);
            hbtns.push(b); head.appendChild(b);
            return b;
        }
        // Быстрый переключатель (наборы, эффекты, команды) — раньше только по Ctrl+Alt+P.
        hbtn("⌕", t("Быстрый переключатель: наборы, эффекты, команды"), function () { closePanel(); try { openQuick(); } catch (e) {} });
        hbtn("↶", t("Отменить изменение вида"), function () { undo(); }, canUndo() ? "" : "off");
        hbtn("↷", t("Повторить отменённое"), function () { redo(); }, canRedo() ? "" : "off");
        // Простой / полный режим панели.
        hbtn(panelSimple() ? t("Все настройки") : t("Проще"),
            panelSimple() ? t("Показать все вкладки и настройки") : t("Оставить только главное"),
            function () { cfg.ui.simple = !panelSimple(); panelEditMenu = false; saveCfg(); try { refreshPanel(); } catch (er) {} });
        // «Настроить» — режим настройки меню: у секций и эффектов появляются «скрыть» и звёздочка.
        // В простом режиме прятать нечего — кнопки нет.
        if (!panelSimple()) hbtn(t("Настроить"), t("Настроить меню: показать кнопки «скрыть» у секций и эффектов"),
            function () { panelEditMenu = !panelEditMenu; try { refreshPanel(); } catch (er) {} }, panelEditMenu ? "on" : "");
        // Закрепить: панель не закрывается кликом мимо и не ловит клавиши вне себя — можно
        // крутить настройки и параллельно работать в редакторе.
        var pinB = hbtn("", cfg.ui.pinned ? t("Открепить панель") : t("Закрепить панель: не закрывать кликом мимо"),
            function () { cfg.ui.pinned = !cfg.ui.pinned; saveCfg(); try { refreshPanel(); } catch (e) {} }, cfg.ui.pinned ? "on" : "");
        var pinIco = uiIcon("pin", 16); if (pinIco) pinB.appendChild(pinIco); else pinB.textContent = "◉";
        var close = hbtn("✕", t("Закрыть"), function () { closePanel(); });
        p.appendChild(head);

        // Перетаскивание за шапку (в пределах окна)
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
            if (e.button !== 0) return;
            for (var hb = 0; hb < hbtns.length; hb++) if (hbtns[hb].contains(e.target)) return;
            hideInfo();
            var r = p.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            p.style.left = r.left + "px"; p.style.top = r.top + "px";
            p.style.right = "auto"; p.style.bottom = "auto";
            e.preventDefault();
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
        // Двойной клик по шапке — вернуть панель к кнопке BG (забыть перетащенную позицию).
        head.addEventListener("dblclick", function (e) {
            for (var hb = 0; hb < hbtns.length; hb++) if (hbtns[hb].contains(e.target)) return;
            cfg.ui.posX = null; cfg.ui.posY = null; saveCfg(); try { refreshPanel(); } catch (er) {}
        });

        // Ручка изменения ширины: тонкая полоса у левого края. Правый край закреплён (рост влево).
        var grip = el("div", "position:absolute; left:0; top:0; bottom:0; width:6px; cursor:ew-resize; z-index:5;");
        grip.title = t("Потянуть — ширина панели");
        grip.setAttribute("aria-hidden", "true");
        var rz = null;
        function onRz(e) {
            if (!rz) return;
            var w = Math.max(PANEL_W_MIN, Math.min(PANEL_W_MAX, rz.w + (rz.x - e.clientX)));
            try { w = Math.min(w, (window.innerWidth || 800) - 16); } catch (er) {}
            p.style.width = w + "px"; syncNarrow(w);
        }
        function onRzUp() {
            if (!rz) return;
            rz = null;
            document.removeEventListener("mousemove", onRz);
            document.removeEventListener("mouseup", onRzUp);
            var r = p.getBoundingClientRect();
            cfg.ui.width = Math.round(r.width); saveCfg();
        }
        grip.addEventListener("mousedown", function (e) {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            hideInfo();
            var r = p.getBoundingClientRect();
            rz = { x: e.clientX, w: r.width };
            p.style.left = "auto"; p.style.right = Math.max(0, (window.innerWidth || 800) - r.right) + "px";
            document.addEventListener("mousemove", onRz);
            document.addEventListener("mouseup", onRzUp);
        });
        p.appendChild(grip);

        // ===== Верхняя полоса: мастер-выключатель + поиск по настройкам =====
        var top = el("div", null); top.className = "mlp-top";
        top.appendChild(makeMasterToggle());
        p.appendChild(top);

        // Блок «Избранное»: закреплённые секции и эффекты. Позицию фиксируем здесь, наполняем в
        // конце (buildFavorites), когда известны все секции и навигация. Пуст — скрыт целиком.
        // Совет — над избранным: одна строка с действием, если панель заметила проблему.
        try { var tipCard = makeTipCard(); if (tipCard) { var tipWrap = el("div", "padding:0 14px 8px;"); tipWrap.appendChild(tipCard); p.appendChild(tipWrap); } } catch (e) {}
        var favBox = el("div", null); favBox.className = "mlp-fav"; favBox.hidden = true;
        p.appendChild(favBox);

        // ===== Вкладки колонкой слева + страница справа =====
        // Активная вкладка помнится между сессиями в cfg.ui.tab; клампим под текущее число вкладок.
        if (typeof cfg.ui.tab === "number") panelTab = cfg.ui.tab;
        if (panelTab < 0 || panelTab >= TABS.length || !tabVisible(TABS[panelTab])) panelTab = 0;
        var body = el("div", null); body.className = "mlp-body";
        var nav = el("div", null); nav.className = "mlp-nav";
        nav.setAttribute("role", "tablist"); nav.setAttribute("aria-orientation", "vertical");
        nav.setAttribute("aria-label", t("Категории настроек"));
        var pages = el("div", null); pages.className = "mlp-pages";
        body.appendChild(nav); body.appendChild(pages);
        var tabPanes = [], tabBtns = [];
        function styleTabBtn(btn, active) {
            btn.className = "mlp-tab" + (active ? " on" : "");
            btn.setAttribute("aria-selected", active ? "true" : "false");
            btn.tabIndex = active ? 0 : -1; // роуминг-tabindex: Tab заходит на активную вкладку, стрелки ходят между ними
        }
        function selectTab(ti, focusBtn) {
            if (ti < 0 || ti >= tabPanes.length) return;
            if (!tabVisible(TABS[ti])) { cfg.ui.simple = false; cfg.ui.tab = ti; saveCfg(); try { refreshPanel(); } catch (e) {} return; }
            panelTab = ti;
            cfg.ui.tab = ti; saveCfg(); // запомнить вкладку между сессиями
            for (var i = 0; i < tabPanes.length; i++) tabPanes[i].hidden = (i !== ti);
            for (var b = 0; b < tabBtns.length; b++) styleTabBtn(tabBtns[b], b === ti);
            if (focusBtn) { try { tabBtns[ti].focus(); } catch (e) {} }
            try { pages.scrollTop = 0; } catch (e) {}
        }
        // Бейдж вкладки: сколько там включено/изменено — видно, где что настроено, не открывая.
        function tabBadgeCount(name) {
            try {
                if (name === "Авто-смена") { // включённые режимы авто-смены набора
                    var n = 0;
                    if (cfg.slideshow && cfg.slideshow.on) n++;
                    if (cfg.autoTime && cfg.autoTime.on) n++;
                    if (cfg.autoWorkspace) n++;
                    if (cfg.autoBranch) n++;
                    if (cfg.autoLang) n++;
                    if (cfg.autoRemote) n++;
                    return n;
                }
                if (name === "Набор") return cfg.librarySlideshow ? 1 : 0; // крутится своя библиотека
                if (name === "Эффекты") { var c = 0, k; for (k in cfg.fx) if (cfg.fx[k]) c++; return c; }
                if (name === "Терминал") { var d = 0, t2; for (t2 in DEFAULTS.term) if (cfg.term[t2] !== DEFAULTS.term[t2]) d++; return d; }
                if (name === "Данные") { try { return Object.keys(loadPresets()).length; } catch (e) { return 0; } }
            } catch (e) {}
            return 0;
        }
        TABS.forEach(function (tabName, ti) {
            var meta = TAB_META[ti] || ["", ""];
            var btn = el("div", null);
            btn.id = PANEL_ID + "-tab-" + ti;
            var tic = el("span", null); tic.className = "mlp-tic";
            var ico = uiIcon(meta[0], 21); if (ico) tic.appendChild(ico);
            btn.appendChild(tic);
            var tl = el("span", null, t(tabName)); tl.className = "mlp-tl"; btn.appendChild(tl);
            var cnt = tabBadgeCount(tabName);
            if (cnt > 0) {
                var badge = el("span", null, String(cnt)); badge.className = "mlp-badge";
                badge.setAttribute("aria-hidden", "true");
                btn.appendChild(badge);
            }
            keyActivate(btn, t(tabName) + (cnt ? " (" + cnt + ")" : ""));
            btn.setAttribute("role", "tab");
            btn.title = t(tabName);
            styleTabBtn(btn, ti === panelTab);
            btn.addEventListener("click", function () { selectTab(ti); });
            tabBtns.push(btn);
            if (tabVisible(tabName)) nav.appendChild(btn); // скрытая вкладка простого режима: кнопки нет, индексы те же
            var pane = el("div", null); pane.className = "mlp-page"; pane.setAttribute("role", "tabpanel");
            pane.id = PANEL_ID + "-pane-" + ti;
            pane.setAttribute("aria-labelledby", btn.id);
            btn.setAttribute("aria-controls", pane.id);
            pane.hidden = (ti !== panelTab);
            var ph = el("div", null); ph.className = "mlp-ph";
            ph.appendChild(el("b", null, t(tabName)));
            ph.appendChild(el("span", null, t(meta[1])));
            pane.appendChild(ph);
            tabPanes.push(pane); pages.appendChild(pane);
        });
        // ===== Поиск по панели =====
        // Быстрый переход к любой секции на любой вкладке: набери часть названия («терм», «пресет»,
        // «виньет») — в выпадающем списке появятся совпадения (секции + эффекты + отдельные контролы).
        var searchWrap = el("div", null); searchWrap.className = "mlp-search";
        var searchInp = el("input", fieldStyle(" width:100%; box-sizing:border-box; font-size:11.5px;"));
        searchInp.type = "text"; searchInp.placeholder = t("Поиск настроек…"); searchInp.maxLength = 40;
        searchInp.setAttribute("aria-label", t("Поиск настроек…"));
        var searchRes = el("div",
            "position:absolute; left:0; right:0; top:100%; z-index:6; margin-top:4px; max-height:260px; overflow-y:auto; padding:4px;" +
            "background:var(--mlp-bg); border:1px solid rgba(var(--mlbg-accent-rgb),0.35); border-radius:11px;" +
            "box-shadow:0 12px 30px rgba(0,0,0,0.5);");
        searchRes.hidden = true;
        searchWrap.appendChild(searchInp); searchWrap.appendChild(searchRes);
        top.appendChild(searchWrap);
        function flashSection(head) {
            try {
                if (head.scrollIntoView) head.scrollIntoView({ block: "nearest" });
                var prev = head.style.boxShadow;
                head.style.boxShadow = "0 0 0 2px var(--mlbg-accent)";
                setTimeout(function () { try { head.style.boxShadow = prev; } catch (e) {} }, 1200);
            } catch (e) {}
        }
        function goSection(entry) {
            var ti = tabPanes.indexOf(entry.parent);
            if (ti >= 0) selectTab(ti);
            try { entry.expand(); } catch (e) {}
            searchRes.hidden = true; searchInp.value = "";
            flashSection(entry.head);
        }
        // Переход к КОНКРЕТНОМУ эффекту: вкладка «Эффекты», секция развёрнута, фильтр «только
        // включённые» снят; после пересборки блок фокуса (в конце togglePanel) прокрутит к нему.
        function goEffect(key) {
            fxFocusKey = key; fxOnlyOn = false; cfg.ui.simple = false; // сетка эффектов — в полном режиме
            if (cfg.ui.collapsed) delete cfg.ui.collapsed["Эффекты"];
            cfg.ui.tab = tabIndex("Эффекты");
            searchRes.hidden = true; searchInp.value = "";
            saveCfg(); try { refreshPanel(); } catch (e) {}
        }
        function sectionByTitle(t) {
            for (var si = 0; si < panelSections.length; si++) if (panelSections[si].title === t) return panelSections[si];
            return null;
        }
        function runSearch() {
            var q = (searchInp.value || "").trim().toLowerCase();
            searchRes.textContent = "";
            if (!q) { searchRes.hidden = true; return; }
            var q2 = swapLayout(q);
            function hit(s) { s = String(s || "").toLowerCase(); return s.indexOf(q) >= 0 || s.indexOf(q2) >= 0; }
            var rows = [], seen = {};
            panelSections.forEach(function (s) { // секции по названию (совпадение по переводу или по русскому ключу)
                var disp = s.label || s.title;
                if ((hit(disp) || hit(s.title)) && !seen["s:" + s.title]) {
                    seen["s:" + s.title] = 1; seen["l:" + disp] = 1;
                    var ti = tabPanes.indexOf(s.parent);
                    rows.push({ label: disp, sub: ti >= 0 ? t(TABS[ti]) : "", act: (function (sec) { return function () { goSection(sec); }; })(s) });
                }
            });
            FX_LIST.forEach(function (o) { // отдельные эффекты -> переход прямо к их тумблеру (goEffect)
                var disp = t(o[1]);
                if ((hit(disp) || hit(o[1])) && !seen["f:" + o[0]]) {
                    seen["f:" + o[0]] = 1;
                    rows.push({ label: t("Эффект: ") + disp, sub: t("Эффекты"), act: (function (key) { return function () { goEffect(key); }; })(o[0]) });
                }
            });
            // Глубокий поиск: отдельные контролы из каталога (по подписи ИЛИ синониму RU/EN).
            PANEL_SEARCH_CATALOG.forEach(function (c) {
                var label = c[0], tab = c[1], secTitle = c[2], syn = c[3] || "";
                var disp = t(label);
                if (!hit(disp + " " + label + " " + syn)) return;
                if (seen["c:" + label] || seen["l:" + disp]) return;
                seen["c:" + label] = 1;
                rows.push({
                    label: disp, sub: (tab >= 0 && tab < TABS.length) ? t(TABS[tab]) : "",
                    act: (function (tb, st) {
                        return function () {
                            var sec = st ? sectionByTitle(st) : null;
                            if (sec) { goSection(sec); return; }
                            // Секции нет в текущей сборке (простой режим или техническая секция) —
                            // открываем полный режим на нужной вкладке и разворачиваем её там.
                            if (st) {
                                cfg.ui.simple = false; panelShowTech = true; cfg.ui.tab = tb; panelStartFocus = st;
                                if (cfg.ui.collapsed) delete cfg.ui.collapsed[st];
                                saveCfg(); try { refreshPanel(); } catch (e) {} return;
                            }
                            selectTab(tb); searchRes.hidden = true; searchInp.value = "";
                        };
                    })(tab, secTitle)
                });
            });
            searchRes.hidden = false;
            if (!rows.length) { searchRes.appendChild(emptyState("Ничего не найдено", "noresult")); return; }
            rows.slice(0, 10).forEach(function (r) {
                var row = el("div", "display:flex; align-items:center; gap:8px; padding:6px 9px; border-radius:8px; cursor:pointer; font-size:11.5px;");
                row.appendChild(el("span", "flex:1 1 auto; color:var(--mlp-fg);", r.label));
                if (r.sub) row.appendChild(el("span", "flex:0 0 auto; font-size:10px; color:var(--mlbg-accent);", r.sub));
                row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
                row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
                row.addEventListener("click", r.act);
                keyActivate(row, r.label);
                searchRes.appendChild(row);
            });
        }
        searchInp.addEventListener("input", runSearch);
        searchInp.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && searchInp.value) { e.stopPropagation(); searchInp.value = ""; searchRes.hidden = true; }
            else if (e.key === "Enter") { var first = searchRes.firstChild; if (first && first.click) { e.preventDefault(); first.click(); } }
        });

        p.appendChild(body);

        // Секции вкладок живут в src/ui/panel-tabs.js. «Система» возвращает тело секции
        // «Настройка меню» — его наполняет менеджер ниже, когда все секции уже созданы.
        var secMenuBody = null;
        TABS.forEach(function (name, ti) {
            var fill = PANEL_TAB_BUILDERS[name];
            if (!fill || !tabVisible(name)) return;
            var r = fill(tabPanes[ti]);
            if (name === "Система") secMenuBody = r;
        });

        buildMenuManager(secMenuBody, tabPanes);

        buildFavorites(favBox, p, {
            tabPanes: tabPanes, sectionByTitle: sectionByTitle, selectTab: selectTab, flashSection: flashSection
        });

        document.body.appendChild(p);
        try { wireInfoHovers(p); } catch (e) {} // пояснения — наведением на строку, без кружков «?»
        try { labelInputs(p); } catch (e) {}     // имена полям без подписи (скринридер)

        // Esc и клик мимо панели — закрыть. onOutside вешаем через setTimeout,
        // чтобы клик, которым панель открыли, её же не закрыл.
        function onKey(e) {
            // Закреплённая панель не перехватывает клавиши, набранные вне её (редактор, терминал).
            if (cfg.ui.pinned && !p.contains(/** @type {Node} */ (e.target))) return;
            if (e.key === "Escape" && tourActive()) { e.stopPropagation(); endTour(true); return; } // Esc сначала гасит знакомство
            if (e.key === "Escape") { e.stopPropagation(); closePanel(); return; }
            // Ускорители внутри панели (когда фокус не в поле ввода): цифры 1..N — вкладки, «/» — поиск.
            // Выключаются вместе с горячими клавишами (cfg.ui.keys).
            if (hotkeysOn() && !e.ctrlKey && !e.altKey && !e.metaKey) {
                var ae = document.activeElement, tag = ae && ae.tagName;
                var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
                if (!typing) {
                    if (e.key >= "1" && e.key <= String(Math.min(9, tabBtns.length))) { e.preventDefault(); selectTab(parseInt(e.key, 10) - 1, true); return; }
                    if (e.key === "/") { e.preventDefault(); try { searchInp.focus(); } catch (er) {} return; }
                }
            }
            // Стрелки/Home/End на колонке вкладок (ARIA tablist): ↑/↓ (и ←/→) ходят по кругу.
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
                var vis = tabBtns.filter(function (b, i) { return tabVisible(TABS[i]); });
                var ai = vis.indexOf(document.activeElement);
                if (ai >= 0) {
                    e.preventDefault();
                    var ni = ai;
                    if (e.key === "ArrowUp" || e.key === "ArrowLeft") ni = (ai - 1 + vis.length) % vis.length;
                    else if (e.key === "ArrowDown" || e.key === "ArrowRight") ni = (ai + 1) % vis.length;
                    else if (e.key === "Home") ni = 0;
                    else ni = vis.length - 1;
                    selectTab(tabBtns.indexOf(vis[ni]), true);
                    return;
                }
            }
            // Ловушка фокуса: Tab не выпускает фокус за пределы диалога (заворачиваем по кругу).
            if (e.key === "Tab") {
                var f = panelFocusables(p); if (!f.length) return;
                var first = f[0], last = f[f.length - 1], act = document.activeElement;
                if (e.shiftKey && (act === first || act === p)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
            }
        }
        function onOutside(e) {
            if (cfg.ui.pinned) return; // закреплена — клик мимо её не закрывает
            var tr = document.getElementById(TOUR_ID);
            if (tr && tr.contains(e.target)) return; // подсказка знакомства
            if (p.contains(e.target)) return;
            var btn = document.getElementById(SB_ID);
            if (btn && btn.contains(e.target)) return; // клик по кнопке BG обработает togglePanel
            var qm = document.getElementById(QMENU_ID);
            if (qm && qm.contains(e.target)) return;   // пункт быстрого меню сам решит, что делать с панелью
            if (_infoPop && _infoPop.contains(e.target)) return; // попап «?» может жить вне панели
            closePanel();
        }
        document.addEventListener("keydown", onKey, true);
        setTimeout(function () { document.addEventListener("mousedown", onOutside, true); }, 0);
        panelCleanup = function () {
            document.removeEventListener("keydown", onKey, true);
            document.removeEventListener("mousedown", onOutside, true);
            try { document.removeEventListener("mousemove", onRz); document.removeEventListener("mouseup", onRzUp); } catch (e) {} // если закрыли во время ресайза
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

        // Онбординг: открыть панель сразу на нужной секции (panelStartFocus задаёт boot.js).
        if (panelStartFocus) {
            var sf = sectionByTitle(panelStartFocus); panelStartFocus = "";
            if (sf) {
                var sfi = tabPanes.indexOf(sf.parent); if (sfi >= 0) selectTab(sfi);
                try { sf.expand(); } catch (e) {}
                setTimeout(function () { try { flashSection(sf.head); } catch (e) {} }, 90);
            }
        }
        // Переход к конкретному эффекту из поиска: прокрутить к его строке и подсветить.
        if (fxFocusKey) {
            var fk = fxFocusKey; fxFocusKey = "";
            setTimeout(function () {
                var n = panelFxNodes[fk]; if (!n) return;
                try { if (n.scrollIntoView) n.scrollIntoView({ block: "center" }); } catch (e) {}
                try {
                    var prev = n.style.boxShadow;
                    n.style.boxShadow = "0 0 0 2px var(--mlbg-accent)"; n.style.borderRadius = "6px";
                    setTimeout(function () { try { n.style.boxShadow = prev; } catch (e) {} }, 1400);
                } catch (e) {}
            }, 60);
        }

        // Стартовый фокус: сам диалог (screen reader объявит role="dialog"), дальше Tab ходит внутри.
        try { p.focus(); } catch (e) {}
        // Знакомство в 3 шага при первом открытии (tour.js). Через таймер — панель уже на месте.
        if (!cfg.ui.tour && !tourActive()) setTimeout(function () { try { startTour(); } catch (e) {} }, 350);
    }

    // Пересобрать открытую панель, СОХРАНИВ прокрутку страницы и фокус. Фокус восстанавливаем по
    // порядковому номеру в списке фокусируемых (структура панели детерминирована) и ДО scrollTop:
    // .focus() сам подкручивает элемент в видимую область, поэтому scrollTop побеждает последним.
    function refreshPanel() {
        var old = document.getElementById(PANEL_ID);
        if (!old) return;
        _refreshPending = false;
        var scroll = 0, focusIdx = -1;
        try { scroll = panelScroller(old).scrollTop; } catch (e) {}
        try {
            var f = panelFocusables(old), act = document.activeElement;
            for (var i = 0; i < f.length; i++) if (f[i] === act) { focusIdx = i; break; }
        } catch (e) {}
        _panelRebuilding = true;
        try { closePanel(); togglePanel({ stopPropagation: function () {} }); } finally { _panelRebuilding = false; }
        var np = document.getElementById(PANEL_ID);
        if (tourActive()) { try { showTourStep(); } catch (e) {} } // цели пересобраны — переставить рамку
        if (!np) return;
        try { np.style.animation = "none"; } catch (e) {} // пересборка — не открытие: без «прыжка»
        if (focusIdx >= 0) {
            try { var nf = panelFocusables(np); if (nf[focusIdx] && nf[focusIdx].focus) nf[focusIdx].focus(); } catch (e) {}
        }
        try { panelScroller(np).scrollTop = scroll; } catch (e) {}
    }
    // Пересборка по ТАЙМЕРУ (слайдшоу, время суток): если пользователь сейчас печатает в поле
    // панели (seed, путь, поиск) или раскрыл список, откладываем её до ухода фокуса из поля —
    // иначе набранный текст пропадал бы, а открытый список закрывался.
    var _refreshPending = false;
    function refreshPanelSoon() {
        var p = document.getElementById(PANEL_ID); if (!p) return;
        var ae = /** @type {HTMLInputElement} */ (document.activeElement), tag = ae && ae.tagName;
        var busy = p.contains(ae) && (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && ae.type !== "checkbox" && ae.type !== "range"));
        if (!busy) { refreshPanel(); return; }
        if (_refreshPending) return;
        _refreshPending = true;
        ae.addEventListener("blur", function () {
            setTimeout(function () { if (_refreshPending) refreshPanel(); }, 0);
        }, { once: true });
    }

    // ===================== src/ui/tour.js =====================
    // ===== Знакомство с панелью в 3 шага =====
    // Как тур в cpp-docs-panel: подсвечиваем НАСТОЯЩИЕ элементы (а не картинки с ними) —
    // затемнение вокруг, рамка и подсказка рядом. «Дальше» / «Пропустить» / Esc. Показывается
    // при первом открытии панели (cfg.ui.tour), повторить — кнопкой во вкладке «Система».
    // Слой не ловит мышь (pointer-events:none), кроме самой подсказки: панель под ним работает.
    var TOUR_ID = "moonlight-bg-tour";
    var TOUR_STEPS = [
        { sel: "#" + "moonlight-bg-panel .mlp-nav", title: "1. Вкладки",
          text: "Здесь только главное. Число на вкладке — сколько там включено. Кнопка «Все настройки» в шапке открывает остальное, а поиск вверху находит любой пункт." },
        { sel: "#" + "moonlight-bg-panel .mlp-hbtn", all: true, title: "2. Кнопки в шапке",
          text: "Быстрый переключатель наборов и эффектов, отмена и повтор, «Все настройки» и булавка: закреплённая панель не закрывается кликом мимо. Свою картинку можно просто перетащить в панель." },
        { sel: "#" + "moonlight-bg-switcher", title: "3. Кнопка BG",
          text: "Клик — эта панель. Колесо мыши над кнопкой листает наборы. Правый клик — любимые наборы, закрепление набора за проектом и частые действия." }
    ];
    var _tourI = 0;
    function tourActive() { return !!document.getElementById(TOUR_ID); }
    function startTour() {
        if (window.__MLBG_NO_TOUR__ === true) return; // тесты: снимки не должны ловить затемнение
        if (!document.getElementById(PANEL_ID)) return;
        endTour(false);
        _tourI = 0;
        var light = false; try { light = isLightTheme(); } catch (e) {}
        var root = /** @type {any} */ (el("div", "position:fixed; inset:0; z-index:100003; pointer-events:none;"));
        root.id = TOUR_ID;
        var hole = el("div", "position:fixed; border-radius:12px; border:2px solid var(--mlbg-accent); box-shadow:0 0 0 9999px rgba(0,0,0,0.5); transition:all .18s ease;");
        hole.className = "mlbg-tour-hole";
        var tip = el("div",
            "position:fixed; width:290px; box-sizing:border-box; padding:12px 14px; border-radius:14px; pointer-events:auto;" +
            "font-family:var(--vscode-font-family,sans-serif); font-size:12px; line-height:1.45;" +
            "background:" + (light ? "rgba(245,245,250,0.99)" : "rgba(24,24,37,0.99)") + "; color:" + (light ? "#1e1e2e" : "#cdd6f4") + ";" +
            "border:1px solid rgba(var(--mlbg-accent-rgb),0.45); box-shadow:0 16px 40px rgba(0,0,0,0.5);");
        tip.className = "mlbg-tour-tip";
        tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
        var tt = el("div", "font-weight:700; font-size:13px; margin-bottom:4px; color:var(--mlbg-accent);");
        var tx = el("div", null);
        var nav = el("div", "display:flex; align-items:center; gap:8px; margin-top:10px;");
        var num = el("span", "flex:1 1 auto; font-size:11px; opacity:0.65;");
        var skip = el("div", "padding:4px 10px; border-radius:8px; cursor:pointer; font-size:11.5px; opacity:0.8;", t("Пропустить"));
        var next = el("div", "padding:4px 12px; border-radius:8px; cursor:pointer; font-size:11.5px; font-weight:600; color:#1e1e2e; background:var(--mlbg-accent);", t("Дальше"));
        keyActivate(skip, t("Пропустить")); keyActivate(next, t("Дальше"));
        skip.addEventListener("click", function (e) { e.stopPropagation(); endTour(true); });
        next.addEventListener("click", function (e) { e.stopPropagation(); _tourI++; showTourStep(); });
        tip.addEventListener("mousedown", function (e) { e.stopPropagation(); }, true); // не «клик мимо» панели
        tip.addEventListener("click", function (e) { e.stopPropagation(); });
        tip.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); endTour(true); } });
        nav.appendChild(num); nav.appendChild(skip); nav.appendChild(next);
        tip.appendChild(tt); tip.appendChild(tx); tip.appendChild(nav);
        root.appendChild(hole); root.appendChild(tip);
        root._p = { hole: hole, tip: tip, tt: tt, tx: tx, num: num, next: next };
        document.body.appendChild(root);
        showTourStep();
    }
    // Рамка цели: для all — общий прямоугольник всех совпавших элементов (ряд кнопок шапки).
    function _tourRect(st) {
        var nodes = st.all ? document.querySelectorAll(st.sel) : [document.querySelector(st.sel)];
        var r = null;
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i]; if (!n || !n.getBoundingClientRect) continue;
            var b = n.getBoundingClientRect(); if (!b.width && !b.height) continue;
            r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
                  : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
        }
        return r;
    }
    function showTourStep() {
        var root = /** @type {any} */ (document.getElementById(TOUR_ID)); if (!root) return;
        var P = root._p, st = null, r = null;
        // шаг, чья цель не видна (панель узкая, кнопки BG нет), пропускаем
        while (_tourI < TOUR_STEPS.length) {
            st = TOUR_STEPS[_tourI]; r = _tourRect(st);
            if (r) break;
            _tourI++;
        }
        if (_tourI >= TOUR_STEPS.length || !r) { endTour(true); return; }
        var pad = 5, W = window.innerWidth || 800, H = window.innerHeight || 600;
        P.hole.style.left = (r.left - pad) + "px"; P.hole.style.top = (r.top - pad) + "px";
        P.hole.style.width = (r.right - r.left + pad * 2) + "px"; P.hole.style.height = (r.bottom - r.top + pad * 2) + "px";
        P.tt.textContent = t(st.title); P.tx.textContent = t(st.text);
        P.num.textContent = (_tourI + 1) + " " + t("из") + " " + TOUR_STEPS.length;
        P.next.textContent = _tourI === TOUR_STEPS.length - 1 ? t("Понятно") : t("Дальше");
        // Подсказка: слева от цели, если там есть место (панель прижата к правому краю), иначе
        // над/под целью. По краям окна — зажимаем.
        var tw = 290, th = P.tip.offsetHeight || 150, x, y;
        if (r.left - tw - 16 > 8) { x = r.left - tw - 16; y = Math.min(Math.max(8, r.top), H - th - 8); }
        else {
            x = Math.min(Math.max(8, r.left), W - tw - 8);
            y = (r.top - th - 14 > 8) ? r.top - th - 14 : Math.min(r.bottom + 14, H - th - 8);
        }
        P.tip.style.left = x + "px"; P.tip.style.top = y + "px";
        try { P.next.focus(); } catch (e) {}
    }
    // done=true — пройдено/пропущено (больше сам не покажется); false — просто убрать слой.
    function endTour(done) {
        var root = document.getElementById(TOUR_ID); if (root && root.remove) root.remove();
        if (done) { cfg.ui.tour = true; try { saveCfg(); } catch (e) {} }
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
        var d = new Date(), days = uiLang() === "en"
            ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
            : ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
        a.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "  " + days[d.getDay()] + " " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
    }

    var pomo = { running: false, remaining: null };
    function pomoDur() { return Math.round((cfg.fxp.pomoMin || 25) * 60); }
    // Фокус-сессия: класс body.mlbg-focus включает правила фокуса (см. FX_BLOCKS.focusSession в
    // css.js). Держим класс = «эффект включён И «Помидор» включён И идёт (running)». На паузе/
    // сбросе/завершении и при выключенном эффекте класс снимается — фокус плавно спадает (у правил
    // есть transition). Зовётся из всех точек смены состояния таймера + из syncWidgets (apply).
    function syncFocusClass() {
        try {
            var on = !!(cfg.fx.focusSession && cfg.fx.pomodoro && pomo.running);
            document.body.classList[on ? "add" : "remove"]("mlbg-focus");
        } catch (e) {}
    }
    function ensurePomodoro() {
        var right = statusRight(); if (!right) return;
        var e0 = document.getElementById("mlbg-pomo");
        if (cfg.fx.pomodoro) {
            if (!e0) {
                e0 = document.createElement("div"); e0.id = "mlbg-pomo"; e0.className = "statusbar-item right";
                e0.title = t("Помидор: клик — старт/пауза, Alt+клик — сброс");
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
        } else if (e0) { e0.remove(); syncFocusClass(); } else { syncFocusClass(); }
    }
    function paintPomo() {
        var e0 = document.getElementById("mlbg-pomo"); if (!e0) return;
        var a = e0.querySelector("a"); if (!a) return;
        var r = pomo.remaining != null ? pomo.remaining : pomoDur();
        a.textContent = (pomo.running ? "" : "|| ") + pad2(Math.floor(r / 60)) + ":" + pad2(r % 60);
        e0.style.background = pomo.running ? "rgba(var(--mlbg-accent-rgb),0.22)" : "transparent";
        syncFocusClass(); // старт/пауза/сброс/тик проходят через paintPomo — отсюда и держим класс
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
            var note = document.createElement("div"); // не «t»: имя t занято функцией перевода (i18n)
            note.textContent = t("Помидор готов — перерыв!");
            note.style.cssText = "position:fixed; bottom:42px; right:16px; z-index:100001; background:rgba(var(--mlbg-accent-rgb),0.96); color:#181825; font-weight:700; padding:10px 14px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:var(--vscode-font-family,sans-serif);";
            document.body.appendChild(note); setTimeout(function () { note.remove(); }, 6000);
        } catch (e) {}
        try {
            var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
            var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.06;
            o.start(); setTimeout(function () { o.stop(); ctx.close(); }, 260);
        } catch (e) {}
    }

    // ===== Статистика сессии (fx.stats) =====
    // Лёгкий сессионный счётчик (в памяти, не localStorage — как история Undo): время в сессии,
    // нажатия, число тронутых файлов, суммарное «время в потоке» и лучший стрик непрерывной печати.
    // Данные копят boot.js (statsOnType на ввод) и heal (statsTrackFile — активный файл). Виджет
    // статусбара показывает компактную сводку, а секция «Статистика» в панели — полную. Без эмодзи.
    var statsState = { start: Date.now(), keys: 0, files: {}, fileCount: 0, lastType: 0, streakStart: 0, streakMs: 0, bestMs: 0, flowMs: 0 };
    function statsReset() { statsState = { start: Date.now(), keys: 0, files: {}, fileCount: 0, lastType: 0, streakStart: 0, streakMs: 0, bestMs: 0, flowMs: 0 }; }
    function statsOnType() {
        var now = Date.now(); statsState.keys++;
        if (statsState.lastType && now - statsState.lastType < 3000) { // пауза < 3с — стрик продолжается
            statsState.flowMs += (now - statsState.lastType);
            statsState.streakMs = now - statsState.streakStart;
        } else { statsState.streakStart = now; statsState.streakMs = 0; } // новая серия
        if (statsState.streakMs > statsState.bestMs) statsState.bestMs = statsState.streakMs;
        statsState.lastType = now;
    }
    function statsTrackFile() {
        try {
            var wb = document.querySelector(".monaco-workbench"); if (!wb) return;
            var tab = wb.querySelector(".editor-group-container.active .tab.active .tab-label")
                   || wb.querySelector(".tab.active .tab-label") || wb.querySelector(".tab.active");
            var name = String((tab && tab.getAttribute && tab.getAttribute("aria-label")) || (tab && tab.textContent) || "").trim().split(/[\s,]/)[0];
            if (name && !statsState.files[name]) { statsState.files[name] = 1; statsState.fileCount++; }
        } catch (e) {}
    }
    function fmtDur(ms) {
        var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
        return (h ? h + ":" + pad2(m) : m) + ":" + pad2(ss);
    }
    function ensureStats() {
        var right = statusRight(); if (!right) return;
        var e0 = document.getElementById("mlbg-stats");
        if (cfg.enabled && cfg.fx.stats) {
            if (!e0) {
                e0 = document.createElement("div"); e0.id = "mlbg-stats"; e0.className = "statusbar-item right";
                e0.title = t("Статистика сессии");
                var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; e0.appendChild(a);
                right.insertBefore(e0, right.firstChild);
            }
            paintStats();
        } else if (e0) { e0.remove(); }
    }
    function paintStats() {
        var e0 = document.getElementById("mlbg-stats"); if (!e0) return; var a = e0.querySelector("a"); if (!a) return;
        var en = uiLang() === "en";
        a.textContent = fmtDur(Date.now() - statsState.start) + " · " + statsState.fileCount + (en ? "f" : "ф") + " · " + statsState.keys + (en ? "k" : "к");
    }

    function syncWidgets() {
        // Виджеты живут в <body>; до его появления (ранний запуск в <head> через Moon Core)
        // делать нечего — heal повторит вызов после DOMContentLoaded.
        if (!document.body) return;
        try { ensureClock(); } catch (e) { logErr("виджеты: ensureClock", e); }
        try { ensurePomodoro(); } catch (e) { logErr("виджеты: ensurePomodoro", e); }
        try { ensureParticles(); } catch (e) { logErr("виджеты: ensureParticles", e); }
        try { ensureCursorTrail(); } catch (e) { logErr("виджеты: ensureCursorTrail", e); } // шлейф курсора (создать/убрать canvas под настройку)
        try { ensurePet(); } catch (e) { logErr("виджеты: ensurePet", e); }         // питомец-компаньон (создать/убрать canvas под настройку)
        try { screensaverSync(); } catch (e) { logErr("виджеты: screensaverSync", e); }   // убрать витрину сразу, если её выключили в панели
        try { ensureStats(); } catch (e) { logErr("виджеты: ensureStats", e); }       // виджет статистики сессии в статусбаре
        try { syncFocusClass(); } catch (e) { logErr("виджеты: syncFocusClass", e); } // отразить вкл/выкл эффекта фокуса без ожидания тика
        try { perfSync(); } catch (e) { logErr("виджеты: perfSync", e); }       // запустить/остановить авто-бюджет FPS под текущие настройки
    }

    // ===================== src/widgets/particles.js =====================
    // ===== Частицы и шлейф курсора =====
    // Два canvas-слоя поверх интерфейса: летящие частицы (снег, сакура, светлячки, дождь…) и
    // тающий след за указателем. Оба останавливаются, когда окно скрыто, уважают системное
    // «уменьшить движение» и подчиняются авто-бюджету FPS.

    var part = { canvas: null, ctx: null, raf: 0, list: [], style: null };
    // Кол-во частиц: 0 — легитимное значение («частиц нет»), поэтому НЕ используем
    // "partCount || 40" (0 — falsy и молча превращался бы в 40). Откат к 40 только
    // если значение вообще не число (сломанный конфиг).
    function partCount() {
        var n = cfg.fxp.partCount;
        return typeof n === "number" && isFinite(n) ? Math.round(n) : 40;
    }
    function resizeParticles() { if (part.canvas) { part.canvas.width = window.innerWidth; part.canvas.height = window.innerHeight; } }
    // Сезонный авто-стиль: если выбран "seasonal", форма подбирается по месяцу — зима (дек/янв/фев)
    // снег, весна (мар/апр/май) сакура, лето (июн/июл/авг) светлячки, осень (сен/окт/ноя) дождь.
    // Возвращает ВСЕГДА конкретный стиль из белого списка (никогда "seasonal"), поэтому вся
    // отрисовка (partFalls/loopParticles) работает с ним как с обычным стилем.
    function seasonStyle() {
        var m; try { m = new Date().getMonth(); } catch (e) { m = 0; } // 0..11
        if (m === 11 || m === 0 || m === 1) return "snow";
        if (m >= 2 && m <= 4) return "sakura";
        if (m >= 5 && m <= 7) return "firefly";
        return "rain"; // 8..10 — осень
    }
    // Стиль частиц (санитизированный). "seasonal" разворачивается в сезонный стиль. Падают
    // сверху вниз: снег, сакура, дождь, конфетти; остальные (точки, звёзды, пузыри, светлячки)
    // всплывают снизу вверх.
    function partStyleNow() {
        var s = safePartStyle(cfg.partStyle);
        return s === "seasonal" ? seasonStyle() : s;
    }
    function partFalls() {
        var s = partStyleNow();
        return s === "snow" || s === "sakura" || s === "rain" || s === "confetti";
    }
    // Задать/сбросить поля частицы НА МЕСТЕ (без аллокации нового объекта). Раньше уход за
    // край делал part.list[i] = newPart(...) — по объекту на каждую переработку, то есть
    // заметный мусор для GC при большом числе частиц. Теперь при рождении и при переработке
    // зовём resetPart(p) и переиспользуем ту же ячейку. anyY=true — стартовая раскладка по
    // всему экрану (первый кадр), иначе рождение у края по направлению стиля.
    function resetPart(p, anyY) {
        var W = window.innerWidth, H = window.innerHeight, fall = partFalls();
        // ac — «частица акцентного цвета?». Сам цвет НЕ вшиваем в частицу: он берётся при
        // отрисовке (см. loopParticles), поэтому смена акцента перекрашивает уже летящие
        // частицы вживую. y-старт: падающие рождаются над верхом, всплывающие — под низом.
        p.x = Math.random() * W;
        p.y = anyY ? Math.random() * H : (fall ? -8 : H + 8);
        var big = fall ? 1.4 : 1;                  // падающие крупнее и заметнее
        p.r = (0.6 + Math.random() * 1.8) * big;
        p.sp = 0.12 + Math.random() * 0.45;
        p.dr = (Math.random() - 0.5) * 0.3;
        p.a = 0.15 + Math.random() * 0.45;
        p.ac = Math.random() < 0.5;
        p.rot = Math.random() * 6.283;             // фаза поворота (звёзды/сакура/конфетти) и пульса (светлячки)
        p.rs = (Math.random() - 0.5) * 0.05;       // скорость поворота
        p.ci = (Math.random() * 3) | 0;            // индекс цвета в палитре (конфетти: 0..2)
        return p;
    }
    function newPart(anyY) { return resetPart({}, anyY); }
    function initParticles() {
        var n = effPartCount(); part.list = [];
        for (var i = 0; i < n; i++) part.list.push(newPart(true));
    }
    // системная настройка «уменьшить движение» — гасим частицы (и CSS-анимации, см. css.js)
    function reduceMotion() {
        try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
    }
    // Круглые/точечные стили (dots, snow, firefly, bubbles) — рисуем в АБСОЛЮТНЫХ координатах
    // (cx, cy), без ctx.save/translate/rotate: поворот у круга не виден, а save/restore на каждую
    // частицу каждый кадр — заметный оверхед при большом числе частиц. col — "r,g,b".
    function drawRound(ctx, style, cx, cy, r, col, a) {
        ctx.fillStyle = "rgba(" + col + "," + a + ")";
        if (style === "bubbles") {
            // Пузырь: контур + лёгкий блик.
            ctx.strokeStyle = "rgba(" + col + "," + a + ")";
            ctx.lineWidth = Math.max(0.6, r * 0.35);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, 6.283); ctx.fill();
        } else {
            // dots / snow / firefly: сплошной кружок (яркость/цвет заданы выше).
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
        }
    }
    // Фигурные стили (stars, sakura, confetti) — центрируются на (0,0) ПОСЛЕ translate/rotate
    // в loopParticles, поэтому здесь координаты локальные (радиус r).
    function drawShaped(ctx, style, r, col, a) {
        ctx.fillStyle = "rgba(" + col + "," + a + ")";
        if (style === "stars") {
            // Искра-звёздочка: четырёхлучевая, лучи вытянуты по осям (тонкие ромбы).
            var L = r * 2.4, w = r * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -L); ctx.lineTo(w, 0); ctx.lineTo(0, L); ctx.lineTo(-w, 0); ctx.closePath();
            ctx.moveTo(-L, 0); ctx.lineTo(0, w); ctx.lineTo(L, 0); ctx.lineTo(0, -w); ctx.closePath();
            ctx.fill();
        } else if (style === "sakura") {
            // Лепесток: вытянутый эллипс — простой мазок-лепесток.
            ctx.beginPath();
            if (ctx.ellipse) ctx.ellipse(0, 0, r * 0.8, r * 1.6, 0, 0, 6.283);
            else ctx.arc(0, 0, r, 0, 6.283);
            ctx.fill();
        } else if (style === "confetti") {
            // Конфетти: маленький прямоугольник (вращается через p.rot -> живой «переворот»).
            var cw = r * 1.9, ch = r * 0.85;
            ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
        }
    }
    // Струя дождя: линия вдоль локальной оси Y (после поворота по вектору скорости в loopParticles).
    function drawStreak(ctx, r, col, a) {
        ctx.strokeStyle = "rgba(" + col + "," + a + ")";
        ctx.lineWidth = Math.max(0.8, r * 0.7);
        if ("lineCap" in ctx) ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 6); ctx.stroke();
    }
    function loopParticles() {
        if (!part.canvas || !part.ctx) { part.raf = 0; return; }
        if (document.hidden) { part.raf = 0; return; } // окно скрыто/свёрнуто — стоп до возврата (экономия CPU/батареи)
        var ctx = part.ctx, W = part.canvas.width, H = part.canvas.height, i, p;
        var acc = accentRGB(); // считаем акцент один раз за кадр, а не на каждую частицу
        var style = partStyleNow(), fall = partFalls();
        // Конфетти многоцветное: палитра из трио (акцент + два спутника, повороты оттенка) —
        // считаем «r,g,b»-строки один раз за кадр, частица берёт свой цвет по p.ci.
        var confPal = null;
        if (style === "confetti") {
            var acHex = safeColor(getAccent(), DEFAULTS.accent);
            confPal = [acc, hexToRgbArr(rotateHue(acHex, 0.33)).join(","), hexToRgbArr(rotateHue(acHex, -0.33)).join(",")];
        }
        var round = (style === "dots" || style === "snow" || style === "firefly" || style === "bubbles");
        ctx.clearRect(0, 0, W, H);
        for (i = 0; i < part.list.length; i++) {
            p = part.list[i];
            if (fall) { p.y += p.sp; p.x += p.dr; if (p.y > H + 12) { resetPart(p, false); continue; } }
            else { p.y -= p.sp; p.x += p.dr; if (p.y < -12) { resetPart(p, false); continue; } }
            p.rot += p.rs;
            // Цвет и яркость по стилю. Светлячки пульсируют прозрачностью через фазу p.rot.
            var col, a = p.a;
            if (style === "snow") col = "235,235,255";
            else if (style === "sakura") col = acc;
            else if (style === "confetti") col = confPal[p.ci % 3];
            else if (style === "firefly") { col = acc; a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(p.rot * 6))); }
            else col = p.ac ? acc : "255,255,255";
            if (round) {
                drawRound(ctx, style, p.x, p.y, p.r, col, a);
            } else if (style === "rain") {
                // Поворот струи по вектору скорости (dr, sp): локальная +Y на угол движения.
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.sp, p.dr) - Math.PI / 2);
                drawStreak(ctx, p.r, col, a); ctx.restore();
            } else {
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                drawShaped(ctx, style, p.r, col, a); ctx.restore();
            }
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
            // Пересоздаём набор при смене числа ИЛИ стиля частиц (у падающих стилей другое
            // направление и стартовые координаты — иначе снег «полетел бы» снизу вверх).
            // Число берём эффективное (effPartCount) — под эконом-режимом оно ниже, поэтому
            // включение/выключение mlbg-perfsave само пересоздаёт частиц в нужном количестве.
            var st = partStyleNow();
            if (part.list.length !== effPartCount() || part.style !== st) { part.style = st; initParticles(); }
            if (!part.raf && !document.hidden) loopParticles(); // (пере)запуск, если стоим и окно видно
        } else {
            if (part.raf) { cancelAnimationFrame(part.raf); part.raf = 0; }
            if (part.canvas) { part.canvas.remove(); part.canvas = null; part.ctx = null; }
        }
    }

    // ===== Шлейф курсора (fx.cursorTrail) =====
    // Тающий след акцентного цвета за указателем мыши. Точки добавляет обработчик mousemove
    // (boot.js -> pushTrail), а луп сам стартует по первой точке и останавливается, когда все
    // точки погасли, — CPU тратится только при движении мыши. Уважает reduced-motion (эффект не
    // создаётся), эконом-режим (быстрее гаснет) и document.hidden (стоп).
    var trail = { canvas: null, ctx: null, raf: 0, pts: [] };
    function resizeTrail() { if (trail.canvas) { trail.canvas.width = window.innerWidth; trail.canvas.height = window.innerHeight; } }
    function ensureCursorTrail() {
        if (cfg.enabled && cfg.fx.cursorTrail && !reduceMotion()) {
            if (!trail.canvas || !document.body.contains(trail.canvas)) {
                var cv = document.createElement("canvas"); cv.id = "mlbg-cursor-trail";
                cv.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:99990;";
                document.body.appendChild(cv);
                trail.canvas = cv; trail.ctx = cv.getContext("2d"); resizeTrail();
            }
        } else {
            if (trail.raf) { cancelAnimationFrame(trail.raf); trail.raf = 0; }
            if (trail.canvas) { trail.canvas.remove(); trail.canvas = null; trail.ctx = null; trail.pts = []; }
        }
    }
    function pushTrail(x, y) {
        if (!trail.canvas) return;
        trail.pts.push({ x: x, y: y, t: 1 });
        if (trail.pts.length > 64) trail.pts.shift();
        if (!trail.raf && !document.hidden) trail.raf = requestAnimationFrame(loopTrail);
    }
    function loopTrail() {
        if (!trail.canvas || !trail.ctx) { trail.raf = 0; return; }
        if (document.hidden) { trail.raf = 0; return; }
        var ctx = trail.ctx, W = trail.canvas.width, H = trail.canvas.height, acc = accentRGB();
        var decay = perf.save ? 0.13 : 0.07, alive = 0, i, p;
        ctx.clearRect(0, 0, W, H);
        for (i = 0; i < trail.pts.length; i++) {
            p = trail.pts[i]; p.t -= decay; if (p.t <= 0) continue; alive++;
            ctx.fillStyle = "rgba(" + acc + "," + (0.5 * p.t).toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(p.x, p.y, 7 * p.t + 1, 0, 6.283); ctx.fill();
        }
        while (trail.pts.length && trail.pts[0].t <= 0) trail.pts.shift();
        trail.raf = alive > 0 ? requestAnimationFrame(loopTrail) : 0;
    }

    // ===================== src/widgets/perf.js =====================
    // ===== Бюджет производительности =====
    // Плагин не знает, на какой машине он запущен, — и выясняет это сам: считает реальный FPS,
    // пока включены дорогие эффекты, и переходит в эконом-режим при устойчивой просадке или при
    // работе от батареи. Возврат к полному виду — когда кадры восстановились.

    // ===== Авто-бюджет производительности =====
    // custom-css-плагин не знает мощности машины: на слабом железе живой фон + частицы + Aurora
    // могут просаживать FPS редактора. Здесь — лёгкий rAF-семплер: пока включены тяжёлые эффекты
    // и окно видно, раз в секунду считаем реальный FPS. Устойчиво низкий FPS -> «эконом-режим»
    // (класс body.mlbg-perfsave гасит дорогие CSS-анимации, а число частиц падает через
    // effPartCount). Когда FPS восстанавливается — режим снимается. Всё под cfg.perfGuard.
    var perf = { raf: 0, t0: 0, frames: 0, low: 0, high: 0, save: false, fps: 60, battery: false };
    var PERF_CAP = 18;        // потолок числа частиц в эконом-режиме
    var PERF_LOW = 42, PERF_OK = 52; // пороги «плохо»/«снова хорошо» по FPS (гистерезис против дёрганья)
    // Эффективное число частиц: обычное, а в эконом-режиме — не больше PERF_CAP.
    function effPartCount() { var n = partCount(); return perf.save ? Math.min(n, PERF_CAP) : n; }
    // Включены ли эффекты, которые вообще есть смысл «бюджетировать» (стоят кадров непрерывно).
    function heavyFxOn() {
        return !!(cfg.enabled && (cfg.fx.aurora || cfg.fx.particles || cfg.fx.spotlight || cfg.fx.kenburns ||
            cfg.fx.typingPulse || cfg.fx.flow || cfg.fx.cursorTrail || cfg.fx.pet || cfg.fx.liveBg));
    }
    // Стоит ли сейчас мерить FPS: гвард включён, есть что бюджетировать, окно видно, и система не
    // в «уменьшить движение» (там тяжёлые анимации и так выключены — мерить нечего).
    function perfShouldRun() { return !!(cfg.perfGuard !== false && heavyFxOn() && !document.hidden && !reduceMotion()); }
    function setPerfSave(on) {
        if (perf.save === on) return;
        perf.save = on;
        try { if (document.body && document.body.classList) document.body.classList[on ? "add" : "remove"]("mlbg-perfsave"); } catch (e) {}
        try { ensureParticles(); } catch (e) {} // пересоздать частиц под новый лимит (effPartCount)
        if (on) { try { toast(t("Экономия ресурсов активна: часть эффектов приглушена")); } catch (e) {} }
    }
    function perfLoop(ts) {
        if (!perfShouldRun()) { perf.raf = 0; return; } // условия отпали — тихо останавливаемся
        if (!perf.t0) { perf.t0 = ts; perf.frames = 0; perf.raf = requestAnimationFrame(perfLoop); return; }
        perf.frames++;
        var dt = ts - perf.t0;
        if (dt >= 1000) {
            perf.fps = perf.frames * 1000 / dt;
            perf.t0 = ts; perf.frames = 0;
            if (perf.fps < PERF_LOW) { perf.low++; perf.high = 0; if (perf.low >= 3) setPerfSave(true); }        // 3 плохих секунды подряд -> экономим
            else if (perf.fps >= PERF_OK) { perf.high++; perf.low = 0; if (perf.high >= 5) setPerfSave(false); } // 5 хороших секунд -> отпускаем
        }
        perf.raf = requestAnimationFrame(perfLoop);
    }
    function perfStart() { if (!perf.raf && perfShouldRun()) { perf.t0 = 0; perf.low = 0; perf.high = 0; perf.raf = requestAnimationFrame(perfLoop); } }
    // Держим состояние в согласии с настройками: если мерить надо — запускаем семплер; если
    // эконом-режим стоит, но бюджетировать уже нечего (гвард выкл или тяжёлые эффекты сняты) —
    // снимаем эконом-класс, чтобы приглушение не «залипло». Зовётся из syncWidgets (apply).
    function perfSync() {
        // От батареи экономим независимо от FPS — но только если есть что экономить: без тяжёлых
        // эффектов «эконом-режим» ничего не даёт, а тост про экономию выглядел бы шумом.
        if (perf.battery && heavyFxOn()) { setPerfSave(true); return; }
        if (perfShouldRun()) perfStart();
        else if (perf.save) setPerfSave(false);
    }

    // ===== Питание: экономим не только по FPS, но и по батарее =====
    // Авто-бюджет реагировал только на просадку кадров. Но на ноутбуке проблема обратная:
    // кадров хватает, а батарея садится — непрерывная анимация фона на автономном питании
    // просто не нужна. Battery Status API в Electron доступен (в вебе он частично урезан),
    // поэтому мягко: отключили зарядку — включаем тот же эконом-режим, что и при низком FPS;
    // воткнули провод — отпускаем. Всё под общим тумблером cfg.perfGuard.
    function initBattery() {
        try {
            if (cfg.perfGuard === false || !navigator.getBattery) return;
            navigator.getBattery().then(function (b) {
                function upd() {
                    var onBattery = (b.charging === false);
                    if (perf.battery === onBattery) return;
                    perf.battery = onBattery;
                    if (!onBattery) { perf.low = 0; perf.high = 0; setPerfSave(false); }
                    perfSync();
                }
                try { b.addEventListener("chargingchange", upd); } catch (e) {}
                upd();
            })["catch"](function () {});
        } catch (e) {}
    }

    // ===================== src/widgets/pet.js =====================
    // ===== Питомец-компаньон =====
    // Процедурный кот в углу над статусбаром: ноль ассетов, всё рисуется на canvas. Моргает,
    // водит хвостом, оживляется при печати и настораживается, когда в коде появляются ошибки.

    // ===== Питомец-компаньон (fx.pet) =====
    // Небольшой канвас-маскот (кот) в правом нижнем углу над статусбаром, нарисованный процедурно
    // акцентным цветом (ноль ассетов). Состояния (petMood): «покой» (моргает, лениво водит хвостом),
    // «печатаешь» (уши торчком, хвост быстрее — данные о печати шлёт boot.js в petState.typedAt),
    // «ошибки» (насторожен, «!» — счётчик ошибок кладёт heal в petState.errors). Уважает
    // reduced-motion (сидит неподвижно — один кадр без лупа), эконом-режим (кадры реже) и
    // document.hidden (стоп). ~24 к/с — маскоту не нужен полный rAF.
    var petState = { typedAt: 0, errors: 0 };
    var pet = { canvas: null, ctx: null, raf: 0, t: 0, blink: 0, nextBlink: 70, last: 0, twitch: 0, nextTwitch: 120,
                accHex: "", colBody: "205,214,244", colDark: "120,120,150", colLite: "230,230,250" };
    var PET_W = 72, PET_H = 64;
    // Кэш цветов маскота: «r,g,b»-строки (тело / тёмный для ушей-лап / светлый для мордочки-животика)
    // пересчитываем, только когда акцент сменился, а не на каждом кадре лупа — мелкая честная экономия.
    function petColors() {
        var acc = safeColor(getAccent(), DEFAULTS.accent);
        if (pet.accHex !== acc) {
            pet.accHex = acc;
            pet.colBody = hexToRgbArr(acc).join(",");
            pet.colDark = hexToRgbArr(shadeHex(acc, -0.45)).join(",");
            pet.colLite = hexToRgbArr(shadeHex(acc, 0.40)).join(",");
        }
    }
    function ensurePet() {
        if (cfg.enabled && cfg.fx.pet) {
            if (!pet.canvas || !document.body.contains(pet.canvas)) {
                var cv = document.createElement("canvas"); cv.id = "mlbg-pet"; cv.width = PET_W; cv.height = PET_H;
                cv.style.cssText = "position:fixed; right:12px; bottom:26px; width:" + PET_W + "px; height:" + PET_H + "px; pointer-events:none; z-index:99991;";
                cv.setAttribute("aria-hidden", "true");
                document.body.appendChild(cv);
                pet.canvas = cv; pet.ctx = cv.getContext("2d");
            }
            if (reduceMotion()) { if (pet.raf) { cancelAnimationFrame(pet.raf); pet.raf = 0; } drawPet(0); } // статичный кадр
            else if (!pet.raf && !document.hidden) { pet.last = 0; pet.raf = requestAnimationFrame(loopPet); }
        } else {
            if (pet.raf) { cancelAnimationFrame(pet.raf); pet.raf = 0; }
            if (pet.canvas) { pet.canvas.remove(); pet.canvas = null; pet.ctx = null; }
        }
    }
    function petMood() {
        if (petState.errors > 0) return "alert";
        if (Date.now() - petState.typedAt < 1200) return "type";
        // Дремлет после минуты без активности (мышь/клавиши/колесо обновляют saver.lastAct).
        var la = 0; try { if (typeof saver !== "undefined" && saver.lastAct) la = saver.lastAct; } catch (e) {}
        if (la && Date.now() - la > 60000) return "sleep";
        return "idle";
    }
    function loopPet(ts) {
        if (!pet.canvas || !pet.ctx) { pet.raf = 0; return; }
        if (document.hidden || reduceMotion()) { pet.raf = 0; return; }
        var mood = petMood();
        // Кадры по настроению (оптимизация): печать — живее (~25 к/с), покой — реже (~15), сон —
        // совсем редко (~7); в эконом-режиме реже всего. Меньше перерисовок в простое = меньше CPU.
        var minDt = perf.save ? 130 : (mood === "type" ? 40 : mood === "sleep" ? 150 : 66);
        if (!pet.last || ts - pet.last >= minDt) {
            pet.last = ts; pet.t++;
            if (--pet.nextBlink <= 0) { pet.blink = 4; pet.nextBlink = 80 + Math.floor(Math.random() * 130); }
            if (pet.blink > 0) pet.blink--;
            if (--pet.nextTwitch <= 0) { pet.twitch = 6; pet.nextTwitch = 150 + Math.floor(Math.random() * 260); } // редкое подёргивание уха
            if (pet.twitch > 0) pet.twitch--;
            drawPet(pet.t);
        }
        pet.raf = requestAnimationFrame(loopPet);
    }
    function drawPet(t) {
        var ctx = pet.ctx; if (!ctx) return;
        petColors();
        var W = PET_W, H = PET_H;
        var body = "rgba(" + pet.colBody + ",", dark = "rgba(" + pet.colDark + ",", lite = "rgba(" + pet.colLite + ",", ink = "rgba(24,24,37,";
        var mood = petMood();
        ctx.clearRect(0, 0, W, H);
        var cx = W / 2, baseY = H - 5;
        var bob = mood === "sleep" ? Math.sin(t * 0.06) * 0.7 : mood === "type" ? Math.sin(t * 0.5) * 1.3 : Math.sin(t * 0.11) * 0.6;
        var hy = baseY - 30 + bob, eyeY = hy - 1;

        // Взгляд к курсору: лёгкое смещение зрачков к указателю. Экранную позицию питомца считаем
        // из фиксированных отступов + размера окна — БЕЗ getBoundingClientRect (не дёргаем layout).
        var lookX = 0, lookY = 0;
        if (mood !== "sleep" && typeof _lastMouse !== "undefined" && _lastMouse) {
            var eScrX = (window.innerWidth || 800) - 12 - W + cx;
            var eScrY = (window.innerHeight || 600) - 26 - H + eyeY;
            lookX = Math.max(-1.2, Math.min(1.2, (_lastMouse.x - eScrX) / 55));
            lookY = Math.max(-1.0, Math.min(1.1, (_lastMouse.y - eScrY) / 70));
        }

        // ── Хвост: покачивается (быстрее при печати), распушён при тревоге, обёрнут вокруг лап во сне ──
        var tailSpeed = mood === "type" ? 0.45 : mood === "alert" ? 0.6 : mood === "sleep" ? 0.05 : 0.13;
        var tailA = Math.sin(t * tailSpeed);
        ctx.strokeStyle = body + "0.95)"; ctx.lineWidth = mood === "alert" ? 6 : 4.5;
        if ("lineCap" in ctx) ctx.lineCap = "round"; if ("lineJoin" in ctx) ctx.lineJoin = "round";
        ctx.beginPath();
        if (mood === "sleep") {
            ctx.moveTo(cx + 13, baseY - 3 + bob);
            ctx.quadraticCurveTo(cx + 19, baseY + 3 + bob, cx, baseY + 2 + bob);
            ctx.quadraticCurveTo(cx - 17, baseY + 1 + bob, cx - 14, baseY - 5 + bob);
        } else {
            ctx.moveTo(cx + 13, baseY - 4 + bob);
            ctx.quadraticCurveTo(cx + 30 + tailA * 4, baseY - 12 + bob, cx + 26 + tailA * 9, baseY - 30 + bob - Math.abs(tailA) * 4);
        }
        ctx.stroke();

        // ── Тело (сидящий силуэт) + светлый животик + передние лапки ──
        ctx.fillStyle = body + "0.95)";
        ctx.beginPath();
        ctx.moveTo(cx - 16, baseY + bob);
        ctx.quadraticCurveTo(cx - 19, baseY - 26 + bob, cx, baseY - 27 + bob);
        ctx.quadraticCurveTo(cx + 19, baseY - 26 + bob, cx + 16, baseY + bob);
        ctx.closePath(); ctx.fill();
        if (ctx.ellipse) {
            ctx.fillStyle = lite + "0.5)";
            ctx.beginPath(); ctx.ellipse(cx, baseY - 9 + bob, 7.5, 12, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = body + "0.97)";
            ctx.beginPath(); ctx.ellipse(cx - 7, baseY - 1 + bob, 5, 4, 0, 0, 6.283); ctx.ellipse(cx + 7, baseY - 1 + bob, 5, 4, 0, 0, 6.283); ctx.fill();
        }
        ctx.strokeStyle = dark + "0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, baseY - 3 + bob); ctx.lineTo(cx, baseY + 1 + bob); ctx.stroke();

        // ── Уши: внешние (акцент) + внутренние (тёмные); торчком при печати, назад при тревоге, редкий твич ──
        var earUp = (mood === "type") ? -3 : (mood === "alert") ? 2 : (mood === "sleep") ? 3 : 0;
        var tw = (mood === "idle" && pet.twitch > 0) ? 2 : 0;
        ctx.fillStyle = body + "0.97)";
        ctx.beginPath();
        ctx.moveTo(cx - 12, hy - 6); ctx.lineTo(cx - 8, hy - 17 + earUp - tw); ctx.lineTo(cx - 2, hy - 8); ctx.closePath();
        ctx.moveTo(cx + 12, hy - 6); ctx.lineTo(cx + 8, hy - 17 + earUp); ctx.lineTo(cx + 2, hy - 8); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = dark + "0.6)";
        ctx.beginPath();
        ctx.moveTo(cx - 10, hy - 8); ctx.lineTo(cx - 8, hy - 14 + earUp - tw); ctx.lineTo(cx - 5, hy - 8); ctx.closePath();
        ctx.moveTo(cx + 10, hy - 8); ctx.lineTo(cx + 8, hy - 14 + earUp); ctx.lineTo(cx + 5, hy - 8); ctx.closePath();
        ctx.fill();

        // ── Голова + светлая мордочка ──
        ctx.fillStyle = body + "0.97)";
        ctx.beginPath(); ctx.arc(cx, hy, 13, 0, 6.283); ctx.fill();
        ctx.fillStyle = lite + "0.55)";
        ctx.beginPath(); ctx.arc(cx, hy + 4, 8, 0, 6.283); ctx.fill();

        // ── Глаза: закрыты (моргание/сон) дугами-улыбкой, иначе белок + акцентная радужка + зрачок + блик ──
        if (pet.blink > 0 || mood === "sleep") {
            ctx.strokeStyle = ink + "0.85)"; ctx.lineWidth = 1.6; if ("lineCap" in ctx) ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(cx - 5, eyeY + 1, 3, 1.15 * Math.PI, 1.85 * Math.PI);
            ctx.arc(cx + 5, eyeY + 1, 3, 1.15 * Math.PI, 1.85 * Math.PI);
            ctx.stroke();
        } else {
            var er = (mood === "alert") ? 3.3 : 2.9;
            ctx.fillStyle = "rgba(255,255,255,0.92)";
            ctx.beginPath(); ctx.arc(cx - 5, eyeY, er, 0, 6.283); ctx.arc(cx + 5, eyeY, er, 0, 6.283); ctx.fill();
            ctx.fillStyle = body + "0.85)"; // радужка акцентом
            ctx.beginPath(); ctx.arc(cx - 5 + lookX, eyeY + lookY, er - 0.9, 0, 6.283); ctx.arc(cx + 5 + lookX, eyeY + lookY, er - 0.9, 0, 6.283); ctx.fill();
            ctx.fillStyle = ink + "0.92)";
            var prad = (mood === "type") ? 1.3 : 1.7;
            ctx.beginPath(); ctx.arc(cx - 5 + lookX, eyeY + lookY, prad, 0, 6.283); ctx.arc(cx + 5 + lookX, eyeY + lookY, prad, 0, 6.283); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.beginPath(); ctx.arc(cx - 6 + lookX, eyeY - 1 + lookY, 0.7, 0, 6.283); ctx.arc(cx + 4 + lookX, eyeY - 1 + lookY, 0.7, 0, 6.283); ctx.fill();
        }

        // ── Нос + ротик + усы ──
        var noseY = hy + 4;
        ctx.fillStyle = "rgba(245,160,181,0.95)";
        ctx.beginPath(); ctx.moveTo(cx - 2, noseY); ctx.lineTo(cx + 2, noseY); ctx.lineTo(cx, noseY + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ink + "0.5)"; ctx.lineWidth = 1; if ("lineCap" in ctx) ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, noseY + 2); ctx.lineTo(cx, noseY + 3.5);
        ctx.arc(cx - 2, noseY + 3.5, 2, 0, Math.PI); ctx.moveTo(cx, noseY + 3.5); ctx.arc(cx + 2, noseY + 3.5, 2, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = body + "0.45)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 4, noseY); ctx.lineTo(cx - 13, noseY - 1);
        ctx.moveTo(cx - 4, noseY + 1.5); ctx.lineTo(cx - 13, noseY + 3);
        ctx.moveTo(cx + 4, noseY); ctx.lineTo(cx + 13, noseY - 1);
        ctx.moveTo(cx + 4, noseY + 1.5); ctx.lineTo(cx + 13, noseY + 3);
        ctx.stroke();

        // ── Экстра по настроению: «!» при тревоге, всплывающие «z» во сне, искорка радости при печати ──
        if (mood === "alert") {
            ctx.fillStyle = "rgba(243,139,168,0.95)";
            ctx.fillRect(cx + 15, hy - 21, 2.6, 7); ctx.fillRect(cx + 15, hy - 12, 2.6, 2.6);
        } else if (mood === "sleep" && ctx.fillText) {
            ctx.fillStyle = body + "0.8)"; ctx.font = "bold 8px sans-serif"; if ("textAlign" in ctx) ctx.textAlign = "left";
            var zt = (t % 60) / 60;
            try { ctx.globalAlpha = 1 - zt; ctx.fillText("z", cx + 10, hy - 9 - zt * 9);
                  ctx.globalAlpha = Math.max(0, 0.7 - zt); ctx.fillText("z", cx + 15, hy - 15 - zt * 11); }
            finally { ctx.globalAlpha = 1; }
        } else if (mood === "type" && Math.sin(t * 0.5) > 0.7) {
            ctx.fillStyle = body + "0.7)";
            ctx.beginPath(); ctx.arc(cx + 14, hy - 16, 1.4, 0, 6.283); ctx.fill();
        }
    }

    // ===================== src/widgets/auto.js =====================
    // ===== Автоматическая смена фона =====
    // Набор может меняться сам: по таймеру слайд-шоу, по времени суток (в том числе по реальному
    // рассвету/закату для заданных координат) и по кругу личной библиотеки картинок. Сюда же
    // относится витрина — крупные часы поверх редактора после простоя.

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

    // ===== Библиотека картинок (своя папка / список) =====
    // Пользователь ведёт личный список локальных картинок (cfg.library); компаньон-расширение
    // может дополнить его содержимым папки через глобал window.__MLBG_LIBRARY__ (массив путей).
    // Когда «Крутить библиотеку» включено, картинки из библиотеки показываются в зоне редактора
    // и сменяются по таймеру слайдшоу (libraryTick), а buildCSS берёт текущую через libraryEditorUrl.
    var libSlide = { last: Date.now() }, sessionLibIndex = 0;
    function libraryAll() {
        var arr = Array.isArray(cfg.library) ? cfg.library.slice() : [];
        try { var g = window.__MLBG_LIBRARY__; if (Array.isArray(g)) for (var i = 0; i < g.length; i++) if (typeof g[i] === "string") arr.push(g[i]); } catch (e) {}
        return arr.filter(function (u) { return typeof u === "string" && u && imgAllowed(u); }); // только локальные/согласованные
    }
    function libraryActive() { return !!(cfg.enabled && cfg.librarySlideshow && libraryAll().length); }
    function libraryEditorUrl() {
        var all = libraryAll(); if (!all.length) return null;
        var i = ((sessionLibIndex % all.length) + all.length) % all.length;
        return imgUrl(all[i]);
    }
    function libraryReset() { libSlide.last = Date.now(); }
    function libraryTick() {
        if (!libraryActive() || libraryAll().length < 2) { libSlide.last = Date.now(); return; }
        var period = Math.max(1, cfg.slideshow.min) * 60000;
        if (Date.now() - libSlide.last < period) return;
        libSlide.last = Date.now();
        sessionLibIndex++;
        // Смена картинки — только когда следующая уже загружена и разобрана: иначе fade показывал
        // пустую подложку, пока большой файл декодируется. Смена — не шаг истории Undo.
        var nowUrl = libraryEditorUrl();
        onImage(nowUrl, function () {
            if (libraryEditorUrl() !== nowUrl) return; // пока ждали, успели сменить
            var go = function () { _histSuppress++; try { applyFade(); } finally { _histSuppress--; } };
            try { var im = new Image(); im.src = nowUrl; if (im.decode) im.decode().then(go, go); else go(); } catch (e) { go(); }
        });
        // Следующую картинку — заранее (и её пробу: метрики и уменьшенная копия будут готовы).
        try { var all = libraryAll(); var nx = imgUrl(all[(sessionLibIndex + 1) % all.length]); preloadOne(nx); probeImage(nx); } catch (e) {}
    }

    // ===== Скринсейвер / витрина при простое (cfg.screensaver) =====
    // После N минут без ввода показываем полноэкранную «витрину»: крупные часы, дата и имя
    // активного набора на тёмном акцентном фоне. Любое действие (движение мыши/клик/клавиша)
    // её убирает (см. boot.js: activity-слушатели + гашение первой клавиши, чтобы она не попала
    // в редактор). Простой считаем от saver.lastAct (обновляет screensaverBump). Учитывает
    // reduced-motion (без плавного проявления) и document.hidden (не показываем в фоне).
    var saver = { el: null, active: false, lastAct: Date.now(), _clock: null, _date: null, _setn: null };
    function screensaverBump() { saver.lastAct = Date.now(); if (saver.active) screensaverHide(); }
    function screensaverHide() { if (!saver.active) return; saver.active = false; if (saver.el && saver.el.remove) saver.el.remove(); saver.el = null; }
    function screensaverShow() {
        if (saver.active) return; saver.active = true;
        var reduce = reduceMotion();
        var wrap = el("div", "position:fixed; inset:0; z-index:100050; pointer-events:auto; cursor:none;" +
            "display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;" +
            "background:radial-gradient(60% 60% at 50% 45%, rgba(var(--mlbg-accent-rgb),0.12), rgba(10,10,16,0.96) 70%), #0a0a10;" +
            "font-family:var(--vscode-font-family,sans-serif); color:#e8e8f0;" + (reduce ? "" : " transition:opacity 0.6s ease; opacity:0;"));
        wrap.id = "mlbg-screensaver";
        var clock = el("div", "font-size:13vw; font-weight:800; letter-spacing:2px; color:var(--mlbg-accent); text-shadow:0 4px 40px rgba(var(--mlbg-accent-rgb),0.4);", "");
        var date = el("div", "font-size:2.2vw; color:#c8c8d8; opacity:0.85;", "");
        var setn = el("div", "font-size:1.3vw; color:#8b93ad; letter-spacing:1px;", "");
        var hint = el("div", "position:fixed; bottom:24px; font-size:12px; color:#6c7086;", t("Любое действие — вернуться"));
        wrap.appendChild(clock); wrap.appendChild(date); wrap.appendChild(setn); wrap.appendChild(hint);
        ["mousedown", "mousemove", "wheel"].forEach(function (ev) { wrap.addEventListener(ev, screensaverHide); });
        document.body.appendChild(wrap);
        saver.el = wrap; saver._clock = clock; saver._date = date; saver._setn = setn;
        paintSaverClock();
        if (!reduce) requestAnimationFrame(function () { try { wrap.style.opacity = "1"; } catch (e) {} });
    }
    function paintSaverClock() {
        if (!saver.el || !saver._clock) return;
        var d = new Date();
        var days = uiLang() === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            : ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
        saver._clock.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
        saver._date.textContent = days[d.getDay()] + ", " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
        try { var i = activeIndex(), nm = setName(i); saver._setn.textContent = nm ? (t("Набор ") + i + " · " + nm) : ""; } catch (e) {}
    }
    function screensaverTick() {
        if (!cfg.enabled || !cfg.screensaver || !cfg.screensaver.on || document.hidden) { if (saver.active) screensaverHide(); return; }
        var period = Math.max(1, cfg.screensaver.min) * 60000;
        if (!saver.active) { if (Date.now() - saver.lastAct >= period) screensaverShow(); }
        else paintSaverClock();
    }
    // Мгновенно убрать витрину, если её выключили в панели (тик показал бы это лишь через секунду).
    function screensaverSync() { if ((!cfg.enabled || !cfg.screensaver || !cfg.screensaver.on) && saver.active) screensaverHide(); }

    // ===== Авто-набор по времени суток =====
    // Днём (8:00–20:00) — cfg.autoTime.day, ночью — cfg.autoTime.night. Переиспользует
    // applyFade (как слайдшоу). Не трогает режим «случайно». Проверяется каждую секунду,
    // но переключает только при реальной смене нужного набора (idempotent).
    // Рассвет/закат для координат (локальные дробные часы), без сети — стандартная аппроксимация
    // «Sunrise equation» (склонение Солнца + часовой угол при зените 90.833°). Возвращает
    // { rise, set } в часах местного времени или null (полярный день/ночь либо ошибка -> откат на
    // фиксированные часы). Локальное время получаем из UT со сдвигом getTimezoneOffset().
    function sunTimes(lat, lon, date) {
        try {
            var rad = Math.PI / 180, deg = 180 / Math.PI;
            var start = new Date(date.getFullYear(), 0, 0);
            var day = Math.floor((date.getTime() - start.getTime()) / 86400000); // день года (1..366)
            var lngHour = lon / 15, off = -date.getTimezoneOffset() / 60;
            function calc(isRise) {
                var tt = day + ((isRise ? 6 : 18) - lngHour) / 24;
                var M = 0.9856 * tt - 3.289;
                var L = (M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634 + 360) % 360;
                var RA = (deg * Math.atan(0.91764 * Math.tan(L * rad)) + 360) % 360;
                RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90); RA /= 15;
                var sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
                var cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
                if (cosH > 1 || cosH < -1) return null; // полярная ночь (>1) / полярный день (<-1)
                var H = (isRise ? 360 - deg * Math.acos(cosH) : deg * Math.acos(cosH)) / 15;
                var T = H + RA - 0.06571 * tt - 6.622;
                var UT = ((T - lngHour) % 24 + 24) % 24;
                var local = (UT + off) % 24; if (local < 0) local += 24;
                return local;
            }
            var r = calc(true), s = calc(false);
            return (r === null || s === null) ? null : { rise: r, set: s };
        } catch (e) { return null; }
    }
    function isDaytime() {
        var at = cfg.autoTime || {}, now = new Date();
        // Режим «рассвет/закат»: сравниваем текущий момент с вычисленными восходом/закатом.
        if (at.mode === "sun") {
            var st = sunTimes(typeof at.lat === "number" ? at.lat : 0, typeof at.lon === "number" ? at.lon : 0, now);
            if (st) {
                var hf = now.getHours() + now.getMinutes() / 60;
                if (st.rise === st.set) return true;
                return st.set > st.rise ? (hf >= st.rise && hf < st.set) : (hf >= st.rise || hf < st.set);
            }
            // полярный день/ночь или сбой -> тихий откат на фиксированные часы ниже
        }
        var h = now.getHours();
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
        // Авто-смена по времени — не шаг истории Undo (сдвигаем базу через _histSuppress).
        cfg.mode = ws; _histSuppress++; try { applyFade(); } finally { _histSuppress--; }
        if (document.getElementById(PANEL_ID)) refreshPanelSoon();
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
        // Тик слайдшоу — не шаг истории Undo (сдвигаем базу через _histSuppress).
        _histSuppress++; try { applyFade(); } finally { _histSuppress--; }
        preloadNext();                                          // подготовить следующий заранее
        if (document.getElementById(PANEL_ID)) refreshPanelSoon(); // подсветить активный чип в открытой панели
    }

    // ===================== src/boot.js =====================
    // ===== Старт + самолечение =====
    // Самолечение (интервал + observer) регистрируем ДО виджетов и всё оборачиваем в try,
    // чтобы ошибка любого виджета не убивала возврат кнопки BG после перестройки DOM.
    function heal() {
        try { if (!_themeWatched) _themeWatched = watchTheme(); } catch (e) { logErr("самолечение: watchTheme", e); }
        try { ensureStyle(); } catch (e) { logErr("самолечение: ensureStyle", e); }
        try { ensureStatusBar(); } catch (e) { logErr("самолечение: ensureStatusBar", e); }
        try { ensureBranchStrip(); } catch (e) { logErr("самолечение: ensureBranchStrip", e); }
        try { ensureErrorClass(); } catch (e) { logErr("самолечение: ensureErrorClass", e); }
        // Питомец: раз в цикл heal (≈3с) обновляем счётчик ошибок для его «настороженного» настроения —
        // читаем DOM только когда питомец включён (иначе нулевой оверхед), как и errorReact.
        try { if (cfg.fx.pet) petState.errors = problemsCount(); } catch (e) { logErr("самолечение: питомец", e); }
        // Статистика: раз в цикл heal отмечаем активный файл в множестве тронутых за сессию.
        try { if (cfg.fx.stats) statsTrackFile(); } catch (e) { logErr("самолечение: statsTrackFile", e); }
        // Шейдерный фон: холст живёт внутри части «редактор», а VS Code пересоздаёт её
        // при смене раскладки/групп — поэтому проверяем и возвращаем его в том же цикле heal.
        try { ensureShader(); } catch (e) { logErr("самолечение: ensureShader", e); }
        syncWidgets();
    }
    // ===== Реакция на ошибки в коде (fx.errorReact) =====
    // Счётчик ошибок читаем из статусбара VS Code (иконка codicon-error + число рядом) — API
    // для диагностик в custom-css нет, поэтому DOM, как и с git-веткой. Читаем ТОЛЬКО когда
    // эффект включён (короткое замыкание) — иначе нулевой оверхед. Класс body.mlbg-errors
    // включает CSS-подсветку статусбара (buildCSS, блок errorReact).
    function problemsCount() {
        try {
            // Чтение статусбара вынесено в scrapeStatusItem (scrape.js) + учёт «здоровья»
            // селектора: если у нового VS Code иконка ошибок переедет, диагностика это покажет.
            // Компаньон отдаёт счётчик из languages.getDiagnostics — это ровно то число, что
            // показывает редактор, без разбора текста статусбара.
            var liveErrors = liveNum("errors");
            if (liveErrors !== null) { scrapeMark("problems", true); return liveErrors; }
            var txt = scrapeStatusItem("codicon-error").replace(/\s+/g, " ");
            var m = txt.match(/\d+/); // первое число у иконки ошибок = количество ошибок
            scrapeMark("problems", !!txt); // «нашли элемент», даже если ошибок 0 (сам виджет на месте)
            return m ? parseInt(m[0], 10) : 0;
        } catch (e) { return 0; }
    }
    function ensureErrorClass() {
        var on = false;
        try { on = !!(cfg.enabled && cfg.fx.errorReact && problemsCount() > 0); } catch (e) {}
        try { var cl = document.body && document.body.classList; if (cl) cl[on ? "add" : "remove"]("mlbg-errors"); } catch (e) {}
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
            ensureStatusBar(); ensureClock(); ensurePomodoro(); ensureStats(); // дешёвые проверки наличия (ensureStats заодно обновляет время в сессии)
            tickClock(); tickPomo(); timeTick(); slideTick(); libraryTick(); screensaverTick(); // обновления по времени
            // Индикатор git-ветки НЕ трогаем ежесекундно: gitBranch() лазит по DOM
            // (querySelector+closest+textContent+regex), а ветка меняется редко — обновляем
            // его в heal раз в 3с (ensureBranchStrip там же). Экономия на постоянном чтении DOM.
            if (_tick % 3 === 0) heal();                         // самолечение раз в 3с
        } catch (e) { logErr("секундный тикер", e); }
    }, 1000);
    window.addEventListener("resize", function () { try { resizeParticles(); } catch (e) {} try { resizeTrail(); } catch (e) {} try { shaderResize(); } catch (e) {} });

    // Через Moon Core среда (прозрачность окна и пр.) приходит по мосту уже после старта —
    // пересобираем стиль, когда она пришла или поменялась.
    if (_viaMoonCore) {
        try {
            var _mcMod = mooncoreModule();
            if (_mcMod) _mcMod.on("env", function () { try { bumpStyle(); ensureStyle(); } catch (e) { logErr("среда", e); } });
        } catch (e) { logErr("подписка на среду", e); }
    }
    // Живые данные (ветка, ошибки, язык файла): сразу прогоняем самолечение — фон по ветке или
    // языку переключится без ожидания трёхсекундного цикла.
    liveSubscribe(heal);
    // Образ фона — часть профилей вида Moon Core (сохраняется и применяется вместе с ними).
    try { registerMoonCoreProfile(); } catch (e) { logErr("профили Moon Core", e); }
    // Резерв конфига на диске: при старте сверяем его с текущим конфигом и дописываем, если
    // отличается (первый запуск через Moon Core, правки прошлой сессии без Moon Core).
    try {
        var _disk0 = diskCfg();
        if (_viaMoonCore && (!_disk0 || JSON.stringify(_disk0) !== JSON.stringify(cfg))) scheduleDiskSave();
    } catch (e) { logErr("резерв конфига", e); }

    // Папка-источник фона (cfg.libraryDir): при старте перечитываем её через компаньона, чтобы
    // новые картинки в папке подхватились без повторного выбора. Нет Moon Core — тихо пропускаем.
    if (cfg.libraryDir && _viaMoonCore) {
        setTimeout(function () {
            mlbgRpc("listFolder", { dir: cfg.libraryDir }).then(function (r) {
                if (!r || !Array.isArray(r.images) || !r.images.length) return;
                if (JSON.stringify(r.images) === JSON.stringify(cfg.library)) return;
                cfg.library = r.images.slice(0, 64); saveCfg(); apply();
            }, function () {});
        }, 5000);
    }

    // Синхронизация между машинами: при старте подтянуть более новый вид (тихо).
    if (cfg.ui && cfg.ui.sync && _viaMoonCore) setTimeout(function () { syncPull(true).then(null, function () {}); }, 4000);

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
        try { toast(t("Набор ") + next + (setName(next) ? " · " + setName(next) : "")); } catch (e) {}
    }
    function onHotkey(e) {
        try {
            // Скринсейвер/витрина: активную гасим первой же клавишей и ГЛОТАЕМ эту клавишу
            // (иначе символ «просочился» бы в редактор); любая клавиша сбрасывает счётчик простоя.
            try {
                if (typeof saver !== "undefined" && saver.active) { e.preventDefault(); e.stopPropagation(); screensaverHide(); return; }
                screensaverBump();
            } catch (er) {}
            if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return;
            if (!hotkeysOn()) return; // выключены в «Системе» — сочетания не перехватываем (AltGr-раскладки)
            if (e.code === "Period") { e.preventDefault(); cycleSet(1); }
            else if (e.code === "Comma") { e.preventDefault(); cycleSet(-1); }
            else if (e.code === "KeyB") { e.preventDefault(); togglePanel({ stopPropagation: function () {} }); }
            else if (e.code === "Digit0" || e.code === "Numpad0") { // мастер-выключатель фона
                e.preventDefault();
                cfg.enabled = !cfg.enabled; apply();
                try { toast(cfg.enabled ? t("Фон включён") : t("Фон выключен")); } catch (er) {}
                if (document.getElementById(PANEL_ID)) refreshPanel();
            }
            else if (e.code === "KeyR") { // режим чтения: фон редактора почти гаснет ради читаемости кода
                e.preventDefault();
                cfg.fx.reading = !cfg.fx.reading; apply();
                try { toast(cfg.fx.reading ? t("Режим чтения включён") : t("Режим чтения выключен")); } catch (er) {}
                if (document.getElementById(PANEL_ID)) refreshPanel();
            }
            else if (e.code === "KeyP") { e.preventDefault(); try { openQuick(); } catch (er) {} } // быстрый переключатель наборов/эффектов
            else if (e.code === "KeyZ") { e.preventDefault(); try { undo(); } catch (er) {} } // отменить изменение вида
            else if (e.code === "KeyY") { e.preventDefault(); try { redo(); } catch (er) {} } // повторить отменённое
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
            if (!cfg.enabled || (!cfg.fx.dimOnType && !cfg.fx.flow && !cfg.fx.typingPulse && !cfg.fx.pet && !cfg.fx.stats)) return;
            var t = e.target;
            if (!t || !t.classList || !t.classList.contains("inputarea")) return;
            // Питомец оживляется от печати; статистика считает нажатия/стрик потока.
            if (cfg.fx.pet) { try { petState.typedAt = Date.now(); } catch (er) {} }
            if (cfg.fx.stats) { try { statsOnType(); } catch (er) {} }
            var cl = document.body && document.body.classList;
            // Класс mlbg-typing нужен и приглушению фона (dimOnType), и пульсу вкладки (typingPulse).
            if (cl && (cfg.fx.dimOnType || cfg.fx.typingPulse)) cl.add("mlbg-typing");
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

    // ===== Курсорные эффекты: параллакс фона (fx.parallax) + спотлайт (fx.spotlight) =====
    // Один обработчик mousemove на оба эффекта (меньше слушателей, один rAF-кадр на оба).
    // Параллакс двигает --mlbg-par-x/y (CSS смещает background-position оверлея редактора,
    // создавая глубину) — уважает «уменьшить движение». Спотлайт двигает --mlbg-mx/my (центр
    // радиального затемнения в body::after) — это не авто-анимация, а слежение за курсором по
    // явному желанию, поэтому reduced-motion его не гасит. Оба коалесцируем в один кадр (rAF).
    var _mfxRaf = 0, _parX = 0, _parY = 0, _spotX = 0, _spotY = 0, _lastMouse = null;
    function _reduceMotion() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
    function onMouseFx(e) {
        try { screensaverBump(); } catch (er) {}   // движение мыши всегда сбрасывает простой скринсейвера
        if (!cfg.enabled || document.hidden) return;
        // Позиция курсора для «взгляда» питомца-кота (drawPet). Пишем ДО ранних выходов ниже,
        // чтобы работало и когда включён только «Питомец» (без параллакса/спотлайта/шлейфа).
        if (cfg.fx.pet) { if (!_lastMouse) _lastMouse = { x: 0, y: 0 }; _lastMouse.x = e.clientX; _lastMouse.y = e.clientY; }
        // Курсор для шейдерного фона (uniform u_mouse): нормализованные 0..1, без rAF —
        // это просто две записи в объект, шейдер прочитает их на своём кадре.
        try {
            mouseNorm.x = e.clientX / (window.innerWidth || 1);
            mouseNorm.y = 1 - e.clientY / (window.innerHeight || 1);
        } catch (er) {}
        var par = cfg.fx.parallax && !_reduceMotion();
        var spot = cfg.fx.spotlight;
        var trailOn = cfg.fx.cursorTrail && !_reduceMotion();
        if (!par && !spot && !trailOn) return; // ни один курсорный эффект не включён — ничего не считаем
        if (trailOn) { try { pushTrail(e.clientX, e.clientY); } catch (er) {} } // точка шлейфа (луп сам стартует)
        if (par) {
            var w = window.innerWidth || 1, h = window.innerHeight || 1;
            _parX = (0.5 - e.clientX / w) * 16; // ±8px «навстречу» курсору — ощущение глубины
            _parY = (0.5 - e.clientY / h) * 16;
        }
        if (spot) { _spotX = e.clientX; _spotY = e.clientY; }
        if (_mfxRaf) return;
        _mfxRaf = requestAnimationFrame(function () {
            _mfxRaf = 0;
            try {
                var s = document.documentElement.style;
                if (par) { s.setProperty("--mlbg-par-x", _parX.toFixed(1) + "px"); s.setProperty("--mlbg-par-y", _parY.toFixed(1) + "px"); }
                if (spot) { s.setProperty("--mlbg-mx", _spotX + "px"); s.setProperty("--mlbg-my", _spotY + "px"); }
            } catch (er) {}
        });
    }
    document.addEventListener("mousemove", onMouseFx, true);
    // Прочая активность (клик/колесо/тач) тоже сбрасывает простой скринсейвера (клавиши — в onHotkey).
    ["mousedown", "wheel", "touchstart"].forEach(function (ev) {
        try { document.addEventListener(ev, function () { try { screensaverBump(); } catch (e) {} }, true); } catch (e) {}
    });

    // ===== Индикатор git-ветки (ambientBranch) =====
    // Тонкая полоска у верхнего края окна: на main/master — красноватая (ты на основной ветке),
    // на прочих — зеленоватая. Имя ветки берём из статусбара (иконка git-branch) — API для этого
    // в custom-css нет, поэтому читаем DOM; если индикатора git нет, полоски тоже нет.
    var BRANCH_ID = "moonlight-branch";
    function gitBranch() {
        try {
            // Точные данные от компаньона важнее: они из git API, а не из вёрстки статусбара.
            var liveVal = liveStr("branch");
            if (liveVal) { scrapeMark("gitBranch", true); return liveVal; }
            var txt = scrapeStatusItem("codicon-git-branch").replace(/\s+/g, " ").trim().slice(0, 80);
            scrapeMark("gitBranch", !!txt);
            return txt;
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
        if (!document.hidden) { try { heal(); tickClock(); tickPomo(); timeTick(); slideTick(); libraryTick(); screensaverTick(); } catch (e) {} }
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
    // Наблюдаем childList самого <head>: если VS Code выбросит наш <style> (STYLE_ID),
    // список детей head изменится — и heal тут же вернёт стиль, не дожидаясь 3-сек тикера.
    // Раньше наблюдали documentElement: его childList меняется лишь при замене head/body
    // (почти никогда), а удаление <style> ВНУТРИ head он не ловил. Без subtree — дёшево:
    // у head немного детей, они меняются редко (никакой реакции на набор текста в редакторе).
    try {
        new MutationObserver(healSoon).observe(document.head || document.documentElement, { childList: true });
    } catch (e) {}
    heal();
    // Через Moon Core скрипт исполняется в <head>, когда <body> ещё нет: стиль уже встал, а
    // виджеты (холсты частиц, шлейфа, питомца) ждут body. Не ждём трёхсекундного тикера —
    // повторяем самолечение, как только документ разобран.
    if (!document.body) {
        try { document.addEventListener("DOMContentLoaded", function () { heal(); }, { once: true }); } catch (e) {}
    }

    // ===== Мост для интеграционного теста =====
    // Модули живут внутри IIFE, поэтому снаружи (из Playwright) до них не дотянуться. В обычном
    // VS Code это правильно — плагин ничего не вешает в глобальную область. Но тест должен уметь
    // проверить ровно то, что делает панель (сдвинуть ползунок, спросить здоровье селекторов),
    // поэтому открываем узкий мост, и только когда страница явно им помечена (фикстура ставит
    // window.__MLBG_TEST_HOOKS__ = true). На реальном воркбенче этого флага нет.
    try {
        if (window.__MLBG_TEST_HOOKS__ === true) {
            window.__mlbgTest = {
                setBlur: function (v) { cfg.fxp.blur = v; applyThrottledLive(); ensureVars(); },
                selectorHealth: function () { return selectorHealthSummary(); },
                readability: function () { return readability(); },
                loader: function () { return loaderKind(); },
                live: function () { var d = mlbgLive(); return { branch: d && d.branch, source: liveSource() }; }
            };
        }
    } catch (e) {}

    // ===== Синхронизация окон VS Code =====
    // Каждое окно VS Code — отдельный рантайм со своей копией cfg, но localStorage у них общий.
    // Раньше правка в одном окне доезжала до второго только со следующим циклом heal (до 3 с) —
    // а слайд-шоу в двух окнах вообще шло вразнобой и они перезаписывали друг другу набор.
    // Теперь окно, сохранившее конфиг, коротко сообщает об этом остальным; те перечитывают
    // хранилище и перерисовываются. BroadcastChannel есть в Electron; если его нет, работает
    // запасной путь — событие storage (оно как раз и приходит в ДРУГИЕ окна того же origin).
    var BC_NAME = "moonlight-custom-bg";
    var _bc = null, _bcApplying = false;
    function _applyExternalCfg() {
        if (_bcApplying) return;
        _bcApplying = true;
        try {
            cfg = loadCfg();          // перечитываем из общего хранилища (mergeCfg санитизирует)
            bumpStyle(); ensureStyle(); updateLabel(); syncWidgets();
            try { slideReset(); } catch (e) {}   // таймер слайд-шоу — от момента чужой смены: окна не «спорят»
            try { refreshPanelSoon(); } catch (e) {} // панель открыта — пересобираем под новый конфиг
        } catch (e) {}
        _bcApplying = false;
    }
    function broadcastCfg() {
        if (_bcApplying) return;      // изменение приехало извне — не рассылаем его обратно
        try { if (_bc) _bc.postMessage({ t: "cfg" }); } catch (e) {}
    }
    try {
        if (typeof BroadcastChannel === "function") {
            _bc = new BroadcastChannel(BC_NAME);
            _bc.onmessage = function (ev) { if (ev && ev.data && ev.data.t === "cfg") _applyExternalCfg(); };
        }
    } catch (e) { _bc = null; }
    try {
        window.addEventListener("storage", function (e) {
            if (!e || e.key !== CFG_KEY) return;
            if (_bc) return;          // BroadcastChannel уже доставил — второй раз не перерисовываем
            _applyExternalCfg();
        });
    } catch (e) {}
    // Экономия по батарее: подписка ставится один раз на старте.
    try { initBattery(); } catch (e) {}

    // ===== Онбординг первого запуска =====
    // Один раз (флаг в localStorage) мягко подсказываем, как открыть панель и что есть готовые
    // профили — иначе три десятка эффектов встречают новичка стеной. Показываем с задержкой,
    // чтобы UI VS Code успел собраться (и наш тост не потерялся среди стартовой возни).
    var ONBOARD_KEY = "moonlight-bg-onboarded";
    try {
        var _seen = false;
        try { _seen = !!localStorage.getItem(ONBOARD_KEY); } catch (e) {}
        if (!_seen) {
            try { localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) {}
            setTimeout(function () {
                try {
                    if (document.hidden) return;
                    // Открываем панель сразу на «Профили»: готовые профили — лучший старт,
                    // а превью по наведению даёт их примерить, ничего не ломая. panelStartFocus гасится в togglePanel.
                    // ВАЖНО: togglePanel именно ПЕРЕКЛЮЧАЕТ. Если пользователь успел открыть панель
                    // сам за эти 4 секунды, вызов закрыл бы её прямо под руками — поэтому открываем
                    // только когда панели нет.
                    try {
                        if (!document.getElementById(PANEL_ID)) {
                            panelStartFocus = "Стили";
                            togglePanel({ stopPropagation: function () {} });
                        }
                    } catch (e2) {}
                    toast(t("MoonLight BG: открой панель кнопкой BG в статусбаре. Быстрый старт — «Данные → Профили»; колесо над кнопкой листает наборы, правый клик — быстрые действия."));
                } catch (e) {}
            }, 4000);
        }
    } catch (e) {}

    console.log("[MoonLight custom-bg] " + APP_VERSION + " installed (v20: adaptive readability scrim, OKLab palette, CSS-variable pipeline, dual loader + true transparency, workbench selector health, WebGL shader sets, master-frame sets, quick switcher Ctrl+Alt+P, cross-window sync), enabled:", cfg.enabled, "sets:", SETS.length, "mode:", cfg.mode, "loader:", (typeof loaderKind === "function" ? loaderKind().id : "?"), "lang:", uiLang(), "theme:", themeKind());

})();
