

// ===== Панель настроек =====
// Централизованное закрытие: снимает документные слушатели (Esc/клик-мимо), прячет «?»,
// удаляет саму панель. panelCleanup хранит отписку слушателей текущей панели.
var panelCleanup = null, panelPrevFocus = null;
// Категории панели. Порядок = порядок вкладок и порядок функций наполнения в
// src/ui/panel-tabs.js; на эти же имена опирается менеджер «Настройка меню».
var TABS = ["Набор", "Вид", "Терминал", "Система", "Данные"];
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
var PANEL_SEARCH_CATALOG = [
    ["Яркость: редактор", 1, "Яркость набора", "прозрачность opacity фон код editor brightness"],
    ["Яркость: сайдбар", 1, "Яркость набора", "прозрачность opacity sidebar проводник"],
    ["Яркость: панель", 1, "Яркость набора", "прозрачность opacity panel терминал"],
    ["Авто-яркость", 1, "Яркость набора", "autodim читаемость светлая картинка"],
    ["Акцентный цвет", 1, "Картинка", "accent цвет hex палитра из картинки"],
    ["Читаемость кода", 1, "Яркость набора", "контраст wcag читаемость скрим адаптивный исправить"],
    ["Загрузчик", 3, "Загрузчик", "custom-css custom-ui-style прозрачность mica vibrancy импорт settings"],
    ["Свой шейдер", 0, "Шейдер", "glsl webgl шейдер фон gpu"],
    ["Безопасные акценты", 1, "Картинка", "дальтоник контраст wcag colorblind окабэ"],
    ["Фильтры картинки", 1, "Картинка", "размытие blur яркость brightness насыщенность saturate вписывание fit путь"],
    ["Сила эффектов", 1, "Эффекты", "размытие стекла ken burns виньетка помидор aurora спот тон strength ползунок"],
    ["Стиль частиц", 1, "Эффекты", "particles форма снег сакура дождь конфетти звёзды"],
    ["Сброс эффектов", 1, "Эффекты", "reset дефолт по умолчанию"],
    ["Шрифт терминала", 2, "Терминал", "font nerd jetbrains моноширинный"],
    ["Лигатуры", 2, "Терминал", "ligatures слитные символы"],
    ["Курсор терминала", 2, "Терминал", "cursor цвет ширина высота"],
    ["Выделение терминала", 2, "Терминал", "selection цвет"],
    ["Свечение терминала", 2, "Терминал", "glow тень"],
    ["Интервал слайдшоу", 0, "Слайдшоу", "минуты interval таймер смена"],
    ["Границы дня", 0, "По времени суток", "рассвет закат часы sun день ночь"],
    ["Язык панели", 3, "", "language ru en english русский интерфейс"],
    ["Экспорт настроек", 4, "", "export json файл сохранить бэкап"],
    ["Импорт настроек", 4, "", "import json файл загрузить"],
    ["Отменить / Повторить", 4, "", "undo redo история отменить повторить"],
    ["Сбросить к дефолту", 4, "", "reset сброс всё по умолчанию"]
];
function closePanel() {
    hideInfo();
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
function togglePanel(ev) {
    ev.stopPropagation();
    if (document.getElementById(PANEL_ID)) { closePanel(); return; }

    panelSections = []; // индекс секций для поиска — заново под текущую сборку панели
    panelAllSections = []; // полный список секций (в т.ч. скрытых) для менеджера «Настройка меню»
    panelFxNodes = {}; // карта key -> строка-тумблер эффекта (для прокрутки к эффекту из поиска)
    panelPrevFocus = document.activeElement; // куда вернуть фокус при закрытии
    var p = el("div", null);
    p.id = PANEL_ID;
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-modal", "true");
    p.setAttribute("aria-label", "Фон и дизайн — настройки");
    p.tabIndex = -1; // чтобы можно было сфокусировать сам диалог при открытии
    // Ширина панели: запомненная (cfg.ui.width) или дефолт 380, зажатая в
    // разумные пределы и под ширину окна. Тянется за левый край (ручка ниже).
    var PANEL_W_MIN = 320, PANEL_W_MAX = 760, panelW = 380;
    if (typeof cfg.ui.width === "number") panelW = Math.max(PANEL_W_MIN, Math.min(PANEL_W_MAX, cfg.ui.width));
    try { panelW = Math.min(panelW, (window.innerWidth || 800) - 16); } catch (e) {}
    p.style.cssText =
        "position:fixed; z-index:100000; width:" + panelW + "px; max-height:82vh; overflow-y:auto; overflow-x:hidden;" +
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
    head.appendChild(el("div", "font-weight:700; font-size:13px; letter-spacing:0.3px;", t("⠿  Фон и дизайн")));
    var hr = el("div", "display:flex; align-items:center; gap:5px;");
    // Кнопка «Настроить» — режим настройки меню: у секций и эффектов появляются кнопки «скрыть».
    var editB = el("div", "flex:0 0 auto; padding:2px 8px; border-radius:6px; cursor:pointer; font-size:11px; " +
        (panelEditMenu ? "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.18); border:1px solid rgba(var(--mlbg-accent-rgb),0.4);"
                       : "color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.06); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));"),
        t("Настроить"));
    editB.title = t("Настроить меню: показать кнопки «скрыть» у секций и эффектов");
    editB.addEventListener("click", function (e) { e.stopPropagation(); panelEditMenu = !panelEditMenu; try { refreshPanel(); } catch (er) {} });
    keyActivate(editB, t("Настроить меню"));
    hr.appendChild(editB);
    var infoAll = infoDot(t("Перетаскивай окно за заголовок. Секции сворачиваются кликом по названию. У настроек «?» — клик показывает пояснение. Положение и свёрнутость запоминаются."));
    if (infoAll) hr.appendChild(infoAll);
    var close = el("div", "flex:0 0 auto; width:20px; height:20px; line-height:18px; text-align:center; border-radius:6px; cursor:pointer; color:var(--mlp-muted,#a6adc8);", "×");
    close.addEventListener("mouseenter", function () { close.style.background = "rgba(var(--mlbg-accent-rgb),0.2)"; });
    close.addEventListener("mouseleave", function () { close.style.background = "transparent"; });
    close.addEventListener("click", function (e) { e.stopPropagation(); closePanel(); });
    keyActivate(close, t("Закрыть"));
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
        if (e.button !== 0 || close.contains(e.target) || (infoAll && infoAll.contains(e.target)) || (editB && editB.contains(e.target))) return;
        hideInfo();
        var r = p.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        p.style.left = r.left + "px"; p.style.top = r.top + "px";
        p.style.right = "auto"; p.style.bottom = "auto";
        e.preventDefault();
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });

    // Ручка изменения ширины: тонкая полоса у левого края панели. Тянешь влево —
    // шире, вправо — уже; правый край при этом закреплён (рост идёт влево). Ширина сохраняется.
    var grip = el("div", "position:absolute; left:0; top:0; bottom:0; width:6px; cursor:ew-resize; z-index:5;");
    grip.title = t("Потянуть — ширина панели");
    grip.setAttribute("aria-hidden", "true");
    var rz = null;
    function onRz(e) {
        if (!rz) return;
        var w = Math.max(PANEL_W_MIN, Math.min(PANEL_W_MAX, rz.w + (rz.x - e.clientX)));
        try { w = Math.min(w, (window.innerWidth || 800) - 16); } catch (er) {}
        p.style.width = w + "px";
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
        // Закрепляем правый край, чтобы панель росла/сжималась влево, а не «уползала».
        p.style.left = "auto"; p.style.right = Math.max(0, (window.innerWidth || 800) - r.right) + "px";
        document.addEventListener("mousemove", onRz);
        document.addEventListener("mouseup", onRzUp);
    });
    p.appendChild(grip);

    // Мастер-выключатель фона/эффектов (вверху, до секций и вкладок — он глобальный)
    p.appendChild(makeMasterToggle());

    // Блок «Избранное»: закреплённые секции и эффекты, поднятые наверх панели.
    // Позицию (сразу под мастер-выключателем) фиксируем здесь, а наполняем в конце (buildFavorites),
    // когда известны секции (panelAllSections) и навигация (selectTab/sectionByTitle). Пуст и не в
    // режиме «Настроить» — скрыт целиком.
    var favBox = el("div", null); favBox.hidden = true;
    p.appendChild(favBox);

    // ===== Вкладки-категории =====
    // Полтора десятка секций разложены по пяти вкладкам, чтобы одновременно была видна только
    // одна группа. Скрытые вкладки помечены hidden — их не видят ни ловушка Tab, ни стартовый
    // фокус (panelFocusables отсеивает offsetParent === null). Активная вкладка помнится между
    // сессиями в cfg.ui.tab; клампим её под текущее число вкладок.
    if (typeof cfg.ui.tab === "number") panelTab = cfg.ui.tab;
    if (panelTab < 0 || panelTab >= TABS.length) panelTab = 0;
    var tabPanes = [], tabBtns = [];
    function styleTabBtn(btn, active) {
        btn.style.cssText =
            "position:relative; flex:1 1 0; text-align:center; padding:6px 3px; border-radius:8px 8px 0 0; cursor:pointer;" +
            "font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" +
            "font-weight:" + (active ? "700" : "500") + ";" +
            "color:" + (active ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)") + ";" +
            "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.16)" : "transparent") + ";" +
            "border-bottom:2px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))") + ";";
        btn.setAttribute("aria-selected", active ? "true" : "false");
        btn.tabIndex = active ? 0 : -1; // роуминг-tabindex: Tab заходит на активную вкладку, стрелки ходят между ними
    }
    function selectTab(ti, focusBtn) {
        if (ti < 0 || ti >= tabPanes.length) return;
        panelTab = ti;
        cfg.ui.tab = ti; saveCfg(); // запомнить вкладку между сессиями
        for (var i = 0; i < tabPanes.length; i++) tabPanes[i].hidden = (i !== ti);
        for (var b = 0; b < tabBtns.length; b++) styleTabBtn(tabBtns[b], b === ti);
        if (focusBtn) { try { tabBtns[ti].focus(); } catch (e) {} }
        try { p.scrollTop = 0; } catch (e) {}
    }
    // Счётчик-бейдж вкладки: сколько на вкладке активного/не-по-умолчанию — чтобы
    // с одного взгляда понять, где что включено, не открывая каждую. 0 -> бейджа нет.
    function tabBadgeCount(ti) {
        try {
            if (ti === 0) { // Набор: включённые авто/контекст-режимы выбора набора
                var n = 0;
                if (cfg.slideshow && cfg.slideshow.on) n++;
                if (cfg.autoTime && cfg.autoTime.on) n++;
                if (cfg.autoWorkspace) n++;
                if (cfg.autoBranch) n++;
                if (cfg.autoLang) n++;
                if (cfg.librarySlideshow) n++;
                return n;
            }
            if (ti === 1) { var c = 0, k; for (k in cfg.fx) if (cfg.fx[k]) c++; return c; }          // Вид: включённые эффекты
            if (ti === 2) { var d = 0, t2; for (t2 in DEFAULTS.term) if (cfg.term[t2] !== DEFAULTS.term[t2]) d++; return d; } // Терминал: не-дефолтные настройки
            if (ti === 3) { return (cfg.ui.hidden ? Object.keys(cfg.ui.hidden).length : 0) + (cfg.ui.hiddenFx ? Object.keys(cfg.ui.hiddenFx).length : 0); } // Система: скрытые пункты меню
            if (ti === 4) { try { return Object.keys(loadPresets()).length; } catch (e) { return 0; } } // Данные: сохранённые пресеты
        } catch (e) {}
        return 0;
    }
    // Бар вкладок «прилипает» к верху при прокрутке длинной вкладки (напр. «Вид» с сеткой
    // эффектов), чтобы переключаться, не мотая вверх. Фон бара = фон панели (нет просвечивания).
    var tabBar = el("div",
        "display:flex; gap:3px; margin:6px 0 2px; position:sticky; top:0; z-index:3;" +
        "background:var(--mlp-bg,rgba(24,24,37,0.98));");
    tabBar.setAttribute("role", "tablist");
    tabBar.setAttribute("aria-label", t("Категории настроек"));
    TABS.forEach(function (tabName, ti) {
        var btn = el("div", null);
        btn.id = PANEL_ID + "-tab-" + ti;
        btn.appendChild(el("span", "vertical-align:middle;", t(tabName)));
        var cnt = tabBadgeCount(ti);
        if (cnt > 0) {
            var badge = el("span",
                "position:absolute; top:1px; right:2px; min-width:14px; height:13px; line-height:11px; padding:0 3px; box-sizing:border-box;" +
                "border-radius:7px; font-size:8px; font-weight:700; text-align:center;" +
                "color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.22); border:1px solid rgba(var(--mlbg-accent-rgb),0.5);", String(cnt));
            badge.setAttribute("aria-hidden", "true");
            btn.appendChild(badge);
        }
        keyActivate(btn, t(tabName) + (cnt ? " (" + cnt + ")" : ""));
        btn.setAttribute("role", "tab");
        styleTabBtn(btn, ti === panelTab);
        btn.addEventListener("click", function () { selectTab(ti); });
        tabBtns.push(btn); tabBar.appendChild(btn);
        var pane = el("div", null); pane.setAttribute("role", "tabpanel");
        pane.id = PANEL_ID + "-pane-" + ti;
        pane.setAttribute("aria-labelledby", btn.id);
        btn.setAttribute("aria-controls", pane.id);
        pane.hidden = (ti !== panelTab);
        tabPanes.push(pane);
    });
    // ===== Поиск по панели (над баром вкладок) =====
    // Быстрый переход к любой секции на любой вкладке: набери часть названия («терм», «пресет»,
    // «виньет») — в выпадающем списке появятся совпадения (секции + отдельные эффекты). Выбор
    // переключает вкладку, разворачивает секцию и подсвечивает её; для эффекта дополнительно
    // проставляется фильтр внутри секции «Эффекты». Индекс — panelSections (наполняется ниже).
    var searchWrap = el("div", "position:relative; margin:4px 0 2px;");
    var searchInp = el("input", fieldStyle(" padding:5px 8px; font-size:11px;"));
    searchInp.type = "text"; searchInp.placeholder = t("Поиск настроек…"); searchInp.maxLength = 40;
    searchInp.setAttribute("aria-label", t("Поиск настроек…"));
    var searchRes = el("div",
        "position:absolute; left:0; right:0; top:100%; z-index:6; margin-top:2px; max-height:240px; overflow-y:auto;" +
        "background:var(--mlp-bg,rgba(24,24,37,0.99)); border:1px solid rgba(var(--mlbg-accent-rgb),0.35); border-radius:8px;" +
        "box-shadow:0 10px 28px rgba(0,0,0,0.5);");
    searchRes.hidden = true;
    searchWrap.appendChild(searchInp); searchWrap.appendChild(searchRes);
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
    // Переход из поиска к КОНКРЕТНОМУ эффекту: открываем «Вид», разворачиваем
    // «Эффекты», снимаем «только включённые» (чтобы цель не была спрятана) и запоминаем ключ —
    // после пересборки панели блок фокуса (в конце togglePanel) прокрутит к нему и подсветит.
    function goEffect(key) {
        fxFocusKey = key; fxOnlyOn = false;
        if (cfg.ui.collapsed) delete cfg.ui.collapsed["Эффекты"]; // развернуть секцию эффектов
        cfg.ui.tab = 1; // вкладка «Вид»
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
        var rows = [], seen = {};
        panelSections.forEach(function (s) { // секции по названию (совпадение по переводу или по русскому ключу)
            var disp = s.label || s.title;
            if ((disp.toLowerCase().indexOf(q) >= 0 || s.title.toLowerCase().indexOf(q) >= 0) && !seen["s:" + s.title]) {
                seen["s:" + s.title] = 1; seen["l:" + disp] = 1;
                var ti = tabPanes.indexOf(s.parent);
                rows.push({ label: disp, sub: ti >= 0 ? t(TABS[ti]) : "", act: (function (sec) { return function () { goSection(sec); }; })(s) });
            }
        });
        FX_LIST.forEach(function (o) { // отдельные эффекты -> переход прямо к их тумблеру (goEffect)
            var disp = t(o[1]); // переведённое имя эффекта
            if ((disp.toLowerCase().indexOf(q) >= 0 || o[1].toLowerCase().indexOf(q) >= 0) && !seen["f:" + o[0]]) {
                seen["f:" + o[0]] = 1;
                rows.push({ label: t("Эффект: ") + disp, sub: t("Вид"), act: (function (key) { return function () { goEffect(key); }; })(o[0]) });
            }
        });
        // Глубокий поиск: отдельные контролы из каталога (по подписи ИЛИ синониму RU/EN).
        PANEL_SEARCH_CATALOG.forEach(function (c) {
            var label = c[0], tab = c[1], secTitle = c[2], syn = c[3] || "";
            var disp = t(label);
            if ((disp + " " + label + " " + syn).toLowerCase().indexOf(q) < 0) return;
            if (seen["c:" + label] || seen["l:" + disp]) return; // дубли с самим собой и с секцией того же имени
            seen["c:" + label] = 1;
            rows.push({
                label: disp, sub: (tab >= 0 && tab < TABS.length) ? t(TABS[tab]) : "",
                act: (function (tb, st) {
                    return function () {
                        var sec = st ? sectionByTitle(st) : null;
                        if (sec) { goSection(sec); return; }
                        selectTab(tb); searchRes.hidden = true; searchInp.value = ""; try { p.scrollTop = 0; } catch (e) {}
                    };
                })(tab, secTitle)
            });
        });
        searchRes.hidden = false;
        if (!rows.length) { searchRes.appendChild(el("div", "padding:7px 9px; font-size:11px; color:var(--mlp-faint,#6c7086);", t("Ничего не найдено"))); return; }
        rows.slice(0, 10).forEach(function (r) {
            var row = el("div", "display:flex; align-items:center; gap:8px; padding:6px 9px; cursor:pointer; font-size:11px;");
            row.appendChild(el("span", "flex:1 1 auto; color:var(--mlp-fg,#cdd6f4);", r.label));
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
    p.appendChild(searchWrap);

    p.appendChild(tabBar);
    tabPanes.forEach(function (pane) { p.appendChild(pane); });
    var tSet = tabPanes[0], tView = tabPanes[1], tTerm = tabPanes[2], tSys = tabPanes[3], tData = tabPanes[4];

    // Секции вкладок живут в src/ui/panel-tabs.js: там видно, что где лежит, без 300 строк
    // посреди сборки каркаса. «Система» возвращает тело секции «Настройка меню» — его
    // наполняет менеджер ниже, когда все секции уже созданы.
    buildTabSets(tSet);
    buildTabView(tView);
    buildTabTerm(tTerm);
    var secMenuBody = buildTabSys(tSys);
    buildTabData(tData);

    buildMenuManager(secMenuBody, tabPanes);

    buildFavorites(favBox, p);

    document.body.appendChild(p);

    // Esc и клик мимо панели — закрыть. onOutside вешаем через setTimeout,
    // чтобы клик, которым панель открыли, её же не закрыл.
    function onKey(e) {
        if (e.key === "Escape") { e.stopPropagation(); closePanel(); return; }
        // Клавиатурные ускорители, только когда фокус НЕ в поле ввода: цифры 1..N
        // переключают вкладки, «/» ставит фокус в поиск. Модификаторы не трогаем (не мешаем хоткеям).
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            var ae = document.activeElement, tag = ae && ae.tagName;
            var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
            if (!typing) {
                if (e.key >= "1" && e.key <= String(Math.min(9, tabBtns.length))) { e.preventDefault(); selectTab(parseInt(e.key, 10) - 1, true); return; }
                if (e.key === "/") { e.preventDefault(); try { searchInp.focus(); } catch (er) {} return; }
            }
        }
        // Стрелки/Home/End на баре вкладок (стандартный ARIA-паттерн tablist): когда фокус на
        // вкладке, ←/→ ходят по кругу, Home/End — к первой/последней. Переключают и фокусируют.
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
            var ai = tabBtns.indexOf(document.activeElement);
            if (ai >= 0) {
                e.preventDefault();
                var ni = ai;
                if (e.key === "ArrowLeft") ni = (ai - 1 + tabBtns.length) % tabBtns.length;
                else if (e.key === "ArrowRight") ni = (ai + 1) % tabBtns.length;
                else if (e.key === "Home") ni = 0;
                else ni = tabBtns.length - 1;
                selectTab(ni, true);
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

    // Онбординг: открыть панель сразу на нужной секции. panelStartFocus задаётся
    // из boot.js при первом запуске (напр. «Профили») — переключаем вкладку, разворачиваем, мигаем.
    if (panelStartFocus) {
        var sf = sectionByTitle(panelStartFocus); panelStartFocus = "";
        if (sf) {
            var sfi = tabPanes.indexOf(sf.parent); if (sfi >= 0) selectTab(sfi);
            try { sf.expand(); } catch (e) {}
            setTimeout(function () { try { flashSection(sf.head); } catch (e) {} }, 90);
        }
    }
    // Переход к конкретному эффекту из единого поиска: прокрутить к его строке и
    // подсветить. Ключ задан в goEffect до refreshPanel; здесь потребляем и гасим его.
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
