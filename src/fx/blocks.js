// ===== Таблица CSS-блоков эффектов =====
// Каждый эффект — пара [ключ, функция, возвращающая строки правил]. buildCSS проходит по
// таблице и добавляет блоки включённых эффектов. Всё, что блокам нужно от сборки стиля
// (акценты, палитра поверхностей текущей темы, готовые примитивы «стекло» и «размытие»),
// приходит одним контекстом — так таблица не зависит от порядка объявлений внутри buildCSS
// и живёт отдельным файлом, а не тремя сотнями строк посреди сборщика.

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
