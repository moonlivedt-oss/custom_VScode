// ===== Панель настроек =====
// Централизованное закрытие: снимает документные слушатели (Esc/клик-мимо), прячет «?»,
// удаляет саму панель. panelCleanup хранит отписку слушателей текущей панели.
var panelCleanup = null, panelPrevFocus = null;
// Активная вкладка-категория панели (см. TABS в togglePanel). Модульная переменная, а не
// поле cfg: переживает refreshPanel (пересборку панели таймерами/действиями) в пределах
// сессии, но не тянет за собой миграцию схемы конфига. Индекс валидируется при выборе.
var panelTab = 0;
// Состояние фильтра секции «Эффекты» (текст поиска + «только включённые»). Тоже модульное,
// как panelTab: переживает refreshPanel в пределах сессии, поэтому фоновая пересборка панели
// (слайдшоу/по времени) не сбрасывает набранный фильтр под руками пользователя.
var fxFilterQ = "", fxOnlyOn = false;
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
// Секция «Эффекты» (наполнение готового тела secFx). Вынесена из togglePanel: логика
// разрослась (счётчик включённых, фильтры поиск/«только включённые», сетка тумблеров,
// слайдеры «силы», стиль частиц), и держать её отдельно чище. Зависит только от secFx +
// модульного/глобального окружения (FX_LIST, PARAMS, cfg, makeCheck/makeParamSlider,
// makePartStyleSelect, fxFilterQ/fxOnlyOn), поэтому не тянет за собой локали togglePanel.
function buildEffectsSection(secFx) {
    // Шапка секции: счётчик включённых эффектов + быстрый фильтр «только включённые».
    // Помогает ориентироваться в трёх десятках тумблеров и одним кликом свернуть список
    // до активных. Счётчик пересчитывается при переключении любого тумблера (см. updateFxView).
    var onlyOn = fxOnlyOn; // восстановить состояние фильтра, переживающее refreshPanel
    var fxHead = el("div", "display:flex; align-items:center; gap:8px; margin-bottom:5px;");
    var fxCount = el("span", "flex:0 0 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);", "");
    var onlyBtn = el("div", "flex:0 0 auto; margin-left:auto; padding:3px 9px; border-radius:6px; cursor:pointer; font-size:11px;", "только включённые");
    function styleOnlyBtn() {
        onlyBtn.style.color = onlyOn ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)";
        onlyBtn.style.background = onlyOn ? "rgba(var(--mlbg-accent-rgb),0.18)" : "rgba(var(--mlbg-accent-rgb),0.06)";
        onlyBtn.style.border = "1px solid " + (onlyOn ? "rgba(var(--mlbg-accent-rgb),0.5)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))");
        onlyBtn.setAttribute("aria-pressed", onlyOn ? "true" : "false");
    }
    fxHead.appendChild(fxCount); fxHead.appendChild(onlyBtn);

    var fxSearch = el("input", fieldStyle(" padding:4px 7px; font-size:11px; margin-bottom:5px;"));
    fxSearch.type = "text"; fxSearch.placeholder = "Фильтр эффектов…"; fxSearch.setAttribute("aria-label", "Фильтр эффектов по названию");
    fxSearch.value = fxFilterQ; // восстановить набранный фильтр после пересборки панели
    var grid = el("div", "display:grid; grid-template-columns:1fr 1fr; gap:1px 10px;");
    var fxEmpty = el("div", "padding:6px 3px; font-size:11px; color:var(--mlp-faint,#6c7086);", "Ничего не найдено.");
    fxEmpty.hidden = true;
    var fxRows = FX_LIST.map(function (o) {
        var node = makeCheck(o[0], o[1]); grid.appendChild(node);
        // Чекбокс — input внутри строки-тумблера. При его переключении пересчитываем счётчик
        // и (если активен «только включённые») перефильтровываем — без пересборки панели.
        var cb = node.querySelector ? node.querySelector("input") : null;
        if (cb) cb.addEventListener("change", function () { updateFxView(); });
        return { node: node, key: o[0], label: o[1].toLowerCase() };
    });
    function updateFxView() {
        fxFilterQ = fxSearch.value || ""; // запомнить фильтр на время сессии (переживёт refresh)
        var q = fxFilterQ.trim().toLowerCase(), shown = 0, on = 0;
        fxRows.forEach(function (r) {
            var isOn = !!cfg.fx[r.key]; if (isOn) on++;
            var hide = (q && r.label.indexOf(q) < 0) || (onlyOn && !isOn);
            r.node.hidden = hide; if (!hide) shown++;
        });
        fxCount.textContent = "Включено: " + on + " / " + fxRows.length;
        fxEmpty.hidden = shown > 0;
    }
    fxSearch.addEventListener("input", updateFxView);
    onlyBtn.addEventListener("click", function () { onlyOn = !onlyOn; fxOnlyOn = onlyOn; styleOnlyBtn(); updateFxView(); });
    keyActivate(onlyBtn, "Показывать только включённые эффекты");
    styleOnlyBtn(); updateFxView();
    secFx.appendChild(fxHead);
    secFx.appendChild(fxSearch);
    secFx.appendChild(grid);
    secFx.appendChild(fxEmpty);

    // Числовая «сила» эффектов — под тумблерами. Параметры, зависящие от выключенного
    // эффекта, не показываем: «Частиц» — только когда включены «Частицы», «Помидор, мин» —
    // когда включён «Помидор» (тумблеры particles/pomodoro пересобирают панель, см. makeCheck).
    secFx.appendChild(el("div", "margin-top:8px; padding:3px 3px 1px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--mlp-head,#bac2de);", "Сила"));
    PARAMS.forEach(function (d) {
        if (d[0] === "partCount" && !cfg.fx.particles) return;
        if (d[0] === "pomoMin" && !cfg.fx.pomodoro) return;
        if (d[0] === "auroraSpeed" && !cfg.fx.aurora) return;
        if (d[0] === "spotRadius" && !cfg.fx.spotlight) return;
        secFx.appendChild(makeParamSlider(d));
    });
    if (cfg.fx.particles) secFx.appendChild(makePartStyleSelect()); // форма частиц — только когда частицы включены
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

    // Мастер-выключатель фона/эффектов (вверху, до секций и вкладок — он глобальный)
    p.appendChild(makeMasterToggle());

    // ===== Вкладки-категории =====
    // Панель разрослась до дюжины секций — раскладываем их по 4 категориям, чтобы
    // одновременно была видна ТОЛЬКО одна группа (панель короче, меньше скролла).
    // Секции внутри вкладки остаются сворачиваемыми (их свёрнутость по-прежнему копится
    // в cfg.ui.collapsed по уникальным заголовкам). Активная вкладка помнится в panelTab
    // (переживает refreshPanel). Скрытые вкладки — hidden, поэтому и ловушка Tab, и стартовый
    // фокус (panelFocusables фильтрует offsetParent===null) их не видят.
    var TABS = ["Набор", "Вид", "Терминал", "Система"];
    // Стартовая вкладка — запомненная между сессиями (cfg.ui.tab), клампим под число вкладок.
    if (typeof cfg.ui.tab === "number") panelTab = cfg.ui.tab;
    if (panelTab < 0 || panelTab >= TABS.length) panelTab = 0;
    var tabPanes = [], tabBtns = [];
    function styleTabBtn(btn, active) {
        btn.style.cssText =
            "flex:1 1 0; text-align:center; padding:6px 3px; border-radius:8px 8px 0 0; cursor:pointer;" +
            "font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" +
            "font-weight:" + (active ? "700" : "500") + ";" +
            "color:" + (active ? "var(--mlbg-accent)" : "var(--mlp-muted,#a6adc8)") + ";" +
            "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.16)" : "transparent") + ";" +
            "border-bottom:2px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))") + ";";
        btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    function selectTab(ti) {
        if (ti < 0 || ti >= tabPanes.length) return;
        panelTab = ti;
        cfg.ui.tab = ti; saveCfg(); // запомнить вкладку между сессиями
        for (var i = 0; i < tabPanes.length; i++) tabPanes[i].hidden = (i !== ti);
        for (var b = 0; b < tabBtns.length; b++) styleTabBtn(tabBtns[b], b === ti);
        try { p.scrollTop = 0; } catch (e) {}
    }
    // Бар вкладок «прилипает» к верху при прокрутке длинной вкладки (напр. «Вид» с сеткой
    // эффектов), чтобы переключаться, не мотая вверх. Фон бара = фон панели (нет просвечивания).
    var tabBar = el("div",
        "display:flex; gap:3px; margin:6px 0 2px; position:sticky; top:0; z-index:3;" +
        "background:var(--mlp-bg,rgba(24,24,37,0.98));");
    TABS.forEach(function (t, ti) {
        var btn = el("div", null, t);
        keyActivate(btn, "Вкладка " + t);
        btn.setAttribute("role", "tab");
        styleTabBtn(btn, ti === panelTab);
        btn.addEventListener("click", function () { selectTab(ti); });
        tabBtns.push(btn); tabBar.appendChild(btn);
        var pane = el("div", null); pane.setAttribute("role", "tabpanel");
        pane.hidden = (ti !== panelTab);
        tabPanes.push(pane);
    });
    p.appendChild(tabBar);
    tabPanes.forEach(function (pane) { p.appendChild(pane); });
    var tSet = tabPanes[0], tView = tabPanes[1], tTerm = tabPanes[2], tSys = tabPanes[3];

    // ===== Вкладка «Набор»: какой фон и когда =====
    // Набор (превью-чипы)
    var secSet = collapsible(tSet, "Набор", "Выбор набора фоновых картинок (редактор / сайдбар / панель). «случайно» — новый набор при каждом запуске.");
    var chips = el("div", "display:flex; flex-wrap:wrap; gap:6px; align-items:center;");
    for (var i = 0; i < SETS.length; i++) chips.appendChild(makeChip(String(i), String(i)));
    chips.appendChild(makeChip("random", "случайно"));
    secSet.appendChild(chips);
    secSet.appendChild(makeSetNameEdit()); // переименование активного набора

    // Слайдшоу
    var secSlide = collapsible(tSet, "Слайдшоу", "Автоматическая смена набора по кругу через заданный интервал.");
    secSlide.appendChild(makeSlideToggle());
    secSlide.appendChild(makeObjSlider(cfg.slideshow, "min", "Интервал, мин", 1, 120, 1, 0, INFO.slide_min, DEFAULTS.slideshow.min));

    // Авто-набор по времени суток
    var secTime = collapsible(tSet, "По времени суток", "Днём — дневной набор, ночью — ночной. Имеет приоритет над слайдшоу; не работает в режиме «случайно».");
    secTime.appendChild(makeAutoTimeToggle());
    secTime.appendChild(makeSetPicker("day", "Дневной"));
    secTime.appendChild(makeSetPicker("night", "Ночной"));
    secTime.appendChild(makeObjSlider(cfg.autoTime, "from", "День с, ч", 0, 23, 1, 0, INFO.autotime_from, DEFAULTS.autoTime.from));
    secTime.appendChild(makeObjSlider(cfg.autoTime, "to", "День до, ч", 0, 23, 1, 0, INFO.autotime_to, DEFAULTS.autoTime.to));

    // Контекст: фон под открытый проект + индикатор git-ветки (оба читают заголовок/статусбар).
    var secWs = collapsible(tSet, "По проекту", "Набор под открытый проект и полоска-индикатор git-ветки. Держатся на чтении заголовка и статусбара VS Code.");
    secWs.appendChild(makeWorkspaceUI());
    secWs.appendChild(makeAmbientBranchToggle());

    // ===== Вкладка «Вид»: как всё выглядит =====
    // Яркость набора
    var secOp = collapsible(tView, "Яркость набора", "Насколько ярко проступают фоновые картинки в каждой зоне.");
    [["editor", "Редактор"], ["side", "Сайдбар"], ["panel", "Панель"]].forEach(function (o) { secOp.appendChild(makeOpSlider(o[0], o[1])); });
    secOp.appendChild(makeAutoDim());

    // Картинка: акцентный цвет + фильтры фоновой картинки по зонам
    var secImg = collapsible(tView, "Картинка", "Акцентный цвет интерфейса и фильтры фоновой картинки по зонам.");
    secImg.appendChild(makeAccentColor());
    secImg.appendChild(makeImgFilters());

    // Эффекты (тумблеры + сила + стиль частиц — одной секцией, чтобы включение и сила
    // эффекта жили рядом). Эффектов за 30 — сверху поле-фильтр по названию (чистый UI).
    var secFx = collapsible(tView, "Эффекты", "Включение/выключение визуальных эффектов и их сила. Наведи на пункт — всплывёт пояснение. Поле поиска фильтрует тумблеры по названию, «только включённые» — прячет выключенные.");
    buildEffectsSection(secFx);

    // ===== Вкладка «Терминал» =====
    var secTerm = collapsible(tTerm, "Терминал", "Оформление интегрированного терминала: шрифт, лигатуры, свечение, курсор, выделение.");
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

    // ===== Вкладка «Система»: служебное (переносимость, сохранённые образы, данные) =====
    // Диагностика установки — первой: если фон «не появился», сюда заглядывают в первую
    // очередь. Кнопка собирает отчёт (версия, тема, набор, пути картинок, найден ли стиль)
    // и копирует его в буфер — удобно приложить к issue. Ничего не меняет.
    var secDiag = collapsible(tSys, "Диагностика", "Проверка установки: что плагин видит о себе (версия, тема, набор, папка и загрузка картинок, активен ли custom-css). Отчёт копируется в буфер для issue. Загляни сюда, если фон не появился.");
    secDiag.appendChild(makeDiagnosticsUI());

    // Горячие клавиши: сами хоткеи заданы в boot.js (onHotkey) — здесь только напоминание,
    // чтобы их можно было узнать, не заглядывая в код/README. Свёрнуто по умолчанию.
    var secKeys = collapsible(tSys, "Горячие клавиши", "Быстрые действия без открытия панели. Работают на любой раскладке (RU/EN).");
    [
        ["Ctrl+Alt+B", "Открыть / закрыть панель"],
        ["Ctrl+Alt+.", "Следующий набор"],
        ["Ctrl+Alt+,", "Предыдущий набор"],
        ["Ctrl+Alt+0", "Фон и эффекты вкл / выкл"],
        ["Ctrl+Alt+R", "Режим чтения вкл / выкл"]
    ].forEach(function (k) {
        var row = el("div", "display:flex; align-items:center; gap:8px; padding:2px 3px;");
        row.appendChild(el("kbd", "flex:0 0 92px; font-family:var(--vscode-editor-font-family,monospace); font-size:10px; text-align:center; padding:2px 4px; border-radius:5px; background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3); color:var(--mlbg-accent);", k[0]));
        row.appendChild(el("span", "flex:1 1 auto; font-size:11px; color:var(--mlp-muted,#a6adc8);", k[1]));
        secKeys.appendChild(row);
    });

    // Папка плагина: база для картинок набора. Нужна при переносе плагина (иначе фон
    // пропадает — плитки набора с «!»). Отдельная секция, чтобы не путать с путём картинки.
    var secBase = collapsible(tSys, "Папка плагина", "Откуда брать картинки наборов. Меняй, если перенёс плагин и фон пропал. Пусто — путь определяется автоматически.");
    secBase.appendChild(makeImgBaseField());
    secBase.appendChild(makeRemoteImagesToggle());

    // Пресеты (сохранённые образы)
    var secPreset = collapsible(tSys, "Пресеты", "Сохранённые образы: весь вид под именем, переключение одним кликом.");
    secPreset.appendChild(makePresetsUI());

    // Поделиться образом коротким кодом (без картинок/путей)
    var secShare = collapsible(tSys, "Поделиться", "Короткий код всего образа для обмена: скопируй свой или примени чужой. Картинки и пути не входят.");
    secShare.appendChild(makeShareUI());

    // экспорт / импорт
    var io = el("div", "display:flex; gap:8px; margin-top:12px;");
    var expB = makeIoBtn("Экспорт"); expB.addEventListener("click", function () { exportCfg(); });
    var impB = makeIoBtn("Импорт"); impB.addEventListener("click", function () { importCfg(); });
    io.appendChild(expB); io.appendChild(impB);
    tSys.appendChild(io);

    // Восстановление из авто-резерва: появляется, когда резерв есть (после импорта/сброса/
    // пресета). Возвращает конфиг, бывший до последней такой замены (можно нажать повторно).
    if (hasBackup()) {
        var restB = el("div", "margin-top:8px; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", "Восстановить прежние настройки");
        restB.addEventListener("mouseenter", function () { restB.style.background = "rgba(137,180,250,0.26)"; });
        restB.addEventListener("mouseleave", function () { restB.style.background = "rgba(137,180,250,0.14)"; });
        restB.addEventListener("click", function () { restoreBackup(); });
        keyActivate(restB, "Восстановить прежние настройки из резерва");
        tSys.appendChild(restB);
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
    tSys.appendChild(reset);

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
