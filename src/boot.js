// ===== Старт + самолечение =====
// Самолечение (интервал + observer) регистрируем ДО виджетов и всё оборачиваем в try,
// чтобы ошибка любого виджета не убивала возврат кнопки BG после перестройки DOM.
function heal() {
    try { if (!_themeWatched) _themeWatched = watchTheme(); } catch (e) {}
    try { ensureStyle(); } catch (e) {}
    try { ensureStatusBar(); } catch (e) {}
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
        ensureStatusBar(); ensureClock(); ensurePomodoro(); // дешёвые проверки наличия
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

console.log("[MoonLight custom-bg] v14 installed (master on/off + hotkeys), enabled:", cfg.enabled, "sets:", SETS.length, "mode:", cfg.mode, "term:", cfg.term.font, "theme:", themeKind());
