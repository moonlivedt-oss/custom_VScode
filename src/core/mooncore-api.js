// ===== Новое API Moon Core: жизненный цикл, общая шина, команды =====
// Всё здесь — только под Moon Core и только если ядро это умеет (старое ядро без
// mc.onDispose / mc.share / mc.commands просто ничего не получает — фон работает как раньше).
//
// Жизненный цикл. Moon Core умеет выключить модуль без перезагрузки окна и снова включить его
// (тот же файл выполняется заново). Поэтому всё глобальное, что заводит фон — подписки на
// окно и документ, секундный тикер, наблюдатели, циклы анимации, свои элементы и классы, —
// должно сниматься в mlbgStop(). Подписки заводятся через onGlobal / trackOff.

var _mlbgStopped = false;
var _mlbgOff = [];            // функции снятия глобальных подписок и таймеров

// addEventListener, который снимется при выключении модуля.
function onGlobal(target, ev, fn, opt) {
    try {
        target.addEventListener(ev, fn, opt);
        _mlbgOff.push(function () { try { target.removeEventListener(ev, fn, opt); } catch (e) {} });
    } catch (e) {}
}
function trackOff(fn) { if (typeof fn === "function") _mlbgOff.push(fn); }
// setTimeout, который снимется при выключении модуля и не сработает после него. Без этого,
// например, знакомство через 4 с открывало панель уже выключенного фона.
function later(fn, ms) {
    var id = setTimeout(function () { if (!_mlbgStopped) fn(); }, ms);
    trackOff(function () { clearTimeout(id); });
    return id;
}

// Всё, что фон кладёт в DOM по id (стиль, кнопка статусбара, панель, виджеты, холсты).
function mlbgOwnIds() {
    return [STYLE_ID, SB_ID, PANEL_ID, PANEL_CSS_ID, QUICK_ID, QMENU_ID, TOUR_ID, BRANCH_ID, CONFIRM_ID,
        "mlbg-clock", "mlbg-pomo", "mlbg-stats", "mlbg-particles", "mlbg-cursor-trail", "mlbg-pet", "mlbg-shader", "mlbg-screensaver"];
}

// Полная остановка: Moon Core выключил модуль (или перезапускает его). Настройки не трогаем —
// включат снова, и фон встанет как был.
function mlbgStop() {
    if (_mlbgStopped) return;
    // Открытые окна снимают свои слушатели документа сами (панель, быстрое меню, переключатель,
    // попап «?», знакомство, «что изменится») — закрываем их до того, как узлы просто удалятся.
    [function () { confirmCancel(); }, function () { closePanel(); }, function () { closeQuickMenu(); },
        function () { quickClose(true); }, function () { hideInfo(); }, function () { endTour(false); },
        function () { screensaverHide(); }].forEach(function (f) { try { f(); } catch (e) {} });
    // Несохранённый резерв на диске — дописать сейчас, остальные отложенные таймеры — снять.
    try { if (_disk.timer) { clearTimeout(_disk.timer); diskSaveNow(); } } catch (e) {}
    try { if (_imgCacheTimer) { clearTimeout(_imgCacheTimer); imgCacheFlush(); } } catch (e) {}
    [function () { return _syncTimer; }, function () { return _liveFullTimer; }, function () { return _typingTimer; },
        function () { return _histTimer; }].forEach(function (g) { try { var id = g(); if (id) clearTimeout(id); } catch (e) {} });
    _mlbgStopped = true;
    var off = _mlbgOff.splice(0);
    for (var i = off.length - 1; i >= 0; i--) { try { off[i](); } catch (e) {} }
    [part, trail, perf, pet, shd].forEach(function (o) {
        try { if (o && o.raf) { cancelAnimationFrame(o.raf); o.raf = 0; } } catch (e) {}
    });
    mlbgOwnIds().forEach(function (id) {
        try { var n = document.getElementById(id); if (n) n.remove(); } catch (e) {}
    });
    try { Array.prototype.slice.call(document.querySelectorAll(".mlbg-toast")).forEach(function (n) { n.remove(); }); } catch (e) {}
    try {
        var cl = document.body && document.body.classList;
        if (cl) Array.prototype.slice.call(cl).forEach(function (c) { if (/^mlbg-/.test(c)) cl.remove(c); });
    } catch (e) {}
    // CSS-переменные фона на <html> (buildVars): без них чужие стили с var(--mlbg-*) вернутся к своим значениям.
    try {
        var st = document.documentElement.style, names = [];
        for (var j = 0; j < st.length; j++) if (/^--mlbg-/.test(st[j])) names.push(st[j]);
        names.forEach(function (n) { st.removeProperty(n); });
    } catch (e) {}
    try { if (_bc) { _bc.close(); _bc = null; } } catch (e) {}
    try { shareValue("mlbg.accent", undefined); shareValue("mlbg.set", undefined); } catch (e) {}
    try { delete window.__MLBG_RUNNING__; } catch (e) { window.__MLBG_RUNNING__ = undefined; }
}

// ---- общая шина модулей: акцент и набор для соседей (окно «Документация C++») ----
function shareValue(key, value) {
    if (!_viaMoonCore) return false;
    var m = mooncoreModule();
    if (!m || typeof m.share !== "function") return false;
    try { return m.share(key, value); } catch (e) { return false; }
}
var _sharedSet = "";
function shareLook(accentHex) {
    if (typeof accentHex === "string" && /^#[0-9a-f]{6}$/i.test(accentHex)) shareValue("mlbg.accent", { hex: accentHex, rgb: hexToRgbArr(accentHex) });
    try {
        var idx = activeIndex(), sig = idx + "|" + (setName(idx) || "");
        // Запоминаем только принятое: до появления шины (или без неё) попробуем снова в следующий раз.
        if (sig !== _sharedSet && shareValue("mlbg.set", { index: idx, name: String(setName(idx) || "") })) _sharedSet = sig;
    } catch (e) {}
}

// ---- команды фона в «Moon Core: Команды модулей» ----
// Объявлены и в манифесте модуля (mooncore-module.json): ядро знает их ещё до запуска окна.
var MLBG_COMMANDS = [
    { id: "next", title: "Фон: следующий набор" },
    { id: "prev", title: "Фон: предыдущий набор" },
    { id: "panel", title: "Фон: открыть панель «Фон и дизайн»" },
    { id: "quick", title: "Фон: быстрый переключатель" },
    { id: "toggle", title: "Фон: включить / выключить" }
];
function mlbgCommand(id) {
    if (id === "next") cycleSet(1);
    else if (id === "prev") cycleSet(-1);
    else if (id === "panel") { if (!document.getElementById(PANEL_ID)) togglePanel({ stopPropagation: function () {} }); }
    else if (id === "quick") openQuick();
    else if (id === "toggle") { cfg.enabled = !cfg.enabled; apply(); try { toast(cfg.enabled ? t("Фон включён") : t("Фон выключен")); } catch (e) {} }
}
function registerMoonCoreCommands() {
    if (!_viaMoonCore) return false;
    var m = mooncoreModule();
    if (!m || !m.commands || typeof m.commands.on !== "function") return false;
    try { m.commands.register(MLBG_COMMANDS); } catch (e) {}
    MLBG_COMMANDS.forEach(function (c) {
        m.commands.on(c.id, function () { try { mlbgCommand(c.id); } catch (e) { logErr("команда " + c.id, e); } });
    });
    return true;
}

// Подключиться к жизненному циклу Moon Core: выключение модуля — mlbgStop.
function registerMoonCoreLifecycle() {
    if (!_viaMoonCore) return false;
    var m = mooncoreModule();
    if (!m || typeof m.onDispose !== "function") return false;
    m.onDispose(mlbgStop);
    return true;
}
