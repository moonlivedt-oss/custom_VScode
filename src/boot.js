// ===== Старт + самолечение =====
// Самолечение (интервал + observer) регистрируем ДО виджетов и всё оборачиваем в try,
// чтобы ошибка любого виджета не убивала возврат кнопки BG после перестройки DOM.
function heal() {
    try { ensureStyle(); } catch (e) {}
    try { ensureStatusBar(); } catch (e) {}
    syncWidgets();
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
        tickClock(); tickPomo(); slideTick();               // обновления по времени
        if (_tick % 3 === 0) heal();                         // самолечение раз в 3с
    } catch (e) {}
}, 1000);
window.addEventListener("resize", function () { try { resizeParticles(); } catch (e) {} });
// Возврат окна из скрытого/свёрнутого состояния — сразу лечим всё (стиль, статусбар,
// виджеты, частицы) и обновляем время/слайдшоу, не дожидаясь следующего тика.
document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { try { heal(); tickClock(); tickPomo(); slideTick(); } catch (e) {} }
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

console.log("[MoonLight custom-bg] v10 installed (perf + a11y), sets:", SETS.length, "mode:", cfg.mode, "term:", cfg.term.font);
