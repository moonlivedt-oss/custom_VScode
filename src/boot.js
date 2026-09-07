// ===== Старт + самолечение =====
// Самолечение (интервал + observer) регистрируем ДО виджетов и всё оборачиваем в try,
// чтобы ошибка любого виджета не убивала возврат кнопки BG после перестройки DOM.
function heal() {
    try { if (!_themeWatched) _themeWatched = watchTheme(); } catch (e) {}
    try { ensureStyle(); } catch (e) {}
    try { ensureStatusBar(); } catch (e) {}
    try { ensureBranchStrip(); } catch (e) {}
    try { ensureErrorClass(); } catch (e) {}
    // Питомец: раз в цикл heal (≈3с) обновляем счётчик ошибок для его «настороженного» настроения —
    // читаем DOM только когда питомец включён (иначе нулевой оверхед), как и errorReact.
    try { if (cfg.fx.pet) petState.errors = problemsCount(); } catch (e) {}
    // Статистика: раз в цикл heal отмечаем активный файл в множестве тронутых за сессию.
    try { if (cfg.fx.stats) statsTrackFile(); } catch (e) {}
    // Шейдерный фон: холст живёт внутри части «редактор», а VS Code пересоздаёт её
    // при смене раскладки/групп — поэтому проверяем и возвращаем его в том же цикле heal.
    try { ensureShader(); } catch (e) {}
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
    } catch (e) {}
}, 1000);
window.addEventListener("resize", function () { try { resizeParticles(); } catch (e) {} try { resizeTrail(); } catch (e) {} try { shaderResize(); } catch (e) {} });

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
        // Имя ветки берём из статусбара через общий scrapeStatusItem + учёт «здоровья»:
        // если git-виджет статусбара сменит разметку в новой версии, это всплывёт в диагностике.
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
            loader: function () { return loaderKind(); }
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
        try { refreshPanel(); } catch (e) {} // панель открыта — пересобираем под новый конфиг
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
                        panelStartFocus = "Профили";
                        togglePanel({ stopPropagation: function () {} });
                    }
                } catch (e2) {}
                toast(t("MoonLight BG: открой панель кнопкой BG в статусбаре (Ctrl+Alt+B). Быстрый старт — «Данные → Профили»; правый клик по кнопке BG — быстрые действия."));
            } catch (e) {}
        }, 4000);
    }
} catch (e) {}

console.log("[MoonLight custom-bg] " + APP_VERSION + " installed (v20: adaptive readability scrim, OKLab palette, CSS-variable pipeline, dual loader + true transparency, workbench selector health, WebGL shader sets, master-frame sets, quick switcher Ctrl+Alt+P, cross-window sync), enabled:", cfg.enabled, "sets:", SETS.length, "mode:", cfg.mode, "loader:", (typeof loaderKind === "function" ? loaderKind().id : "?"), "lang:", uiLang(), "theme:", themeKind());
