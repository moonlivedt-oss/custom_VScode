

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
