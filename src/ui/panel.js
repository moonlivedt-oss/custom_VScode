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

    // Мастер-выключатель фона/эффектов (вверху, до секций)
    p.appendChild(makeMasterToggle());

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
