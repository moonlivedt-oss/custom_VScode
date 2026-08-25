// ===== Проба картинок: загрузка (404) + средняя яркость (для авто-дима) =====
// Одна загрузка на URL обслуживает и фолбэк при 404 (ok), и авто-яркость (luma).
// Картинки лежат на vscode-file://vscode-app/… — тот же origin, что и воркбенч,
// поэтому canvas не «портится» (getImageData не бросает security-ошибку).
// Результат кэшируется; по готовности дёргаем пересборку стиля (bumpStyle+ensureStyle).
var _imgState = {}; // url -> { ok: bool, luma: 0..1|null }
function probeImage(url) {
    if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
    var st = { ok: true, luma: null }; // до загрузки считаем «ок, яркость неизвестна»
    _imgState[url] = st;
    try {
        var im = new Image();
        im.onload = function () {
            st.ok = true;
            try {
                var c = document.createElement("canvas"); c.width = 16; c.height = 16;
                var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, 16, 16);
                var d = cx.getImageData(0, 0, 16, 16).data, sum = 0, n = 0;
                for (var i = 0; i < d.length; i += 4) {
                    sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; // Rec.601, 0..1
                }
                st.luma = n ? sum / n : 1;
            } catch (e) { st.luma = 1; } // canvas «испорчен»/ошибка — не димим
            bumpStyle(); ensureStyle();
        };
        im.onerror = function () { st.ok = false; bumpStyle(); ensureStyle(); };
        im.src = url;
    } catch (e) {}
    return st;
}
// Коэффициент занижения яркости editor по средней светлоте картинки: тёмные/средние —
// как есть (1.0), почти белые — до ~0.4, чтобы код не «слепило». Плавно между.
function lumaDimFactor(luma) {
    if (luma == null || luma <= 0.55) return 1;
    var t = Math.min(1, (luma - 0.55) / 0.35); // 0.55..0.90 -> 0..1
    return 1 - 0.6 * t;                          // -> 1.0 .. 0.4
}

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

// ===== Сборка CSS =====
function buildCSS() {
    var s = SETS[activeIndex()], fx = cfg.fx, fxp = cfg.fxp, op = getOp();
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
    function zoneBg(rel, zone, position) {
        var url = IMG + rel;
        if (!probeImage(url).ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
        var fit = (cfg.fit && cfg.fit[zone] === "contain") ? "contain" : "cover";
        return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
    }
    var BG_ED = zoneBg(s.editor, "editor", "center");
    var BG_SB = zoneBg(s.sidebar, "side", "center bottom");
    var BG_PN = zoneBg(s.panel, "panel", "right bottom");
    // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
    var edDim = cfg.autoDim ? lumaDimFactor(probeImage(IMG + s.editor).luma) : 1;
    var out = [];
    function add() { for (var i = 0; i < arguments.length; i++) out.push(arguments[i]); }
    var TR = "  transition: opacity 0.5s ease;";
    // Поверхность «матового стекла»: точный цвет темы через var(--vscode-*) с нужной
    // прозрачностью (color-mix), плюс запасная строка rgba() под старые движки без
    // color-mix. Порядок важен: сначала fallback, затем color-mix (если поддержан —
    // побеждает как более поздняя валидная декларация; если нет — остаётся rgba).
    // rgb — тема-зависимая запасная база "r,g,b"; a — прозрачность 0..1.
    function addSurface(cssVar, rgb, a) {
        var pct = Math.round(a * 100);
        add("  background-color: rgba(" + rgb + "," + a + ") !important;");
        add("  background-color: color-mix(in srgb, var(" + cssVar + ") " + pct + "%, transparent) !important;");
    }
    function blurLines(px) { return "  backdrop-filter: blur(" + px + "px); -webkit-backdrop-filter: blur(" + px + "px);"; }

    // Акцентный цвет — санитизируем повторно и раскладываем на компоненты для var().
    // Все эффекты ниже используют var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
    var ac = safeColor(getAccent(), DEFAULTS.accent);
    var acRGB = accentRGB();
    add(":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + acRGB + "; }");

    // Фильтры самой фоновой картинки (яркость/насыщенность/размытие) — своя строка на зону.
    // Числа зажаты в mergeCfg, здесь клампим повторно (defense-in-depth). Пустая строка,
    // если зона на дефолте, — тогда filter не добавляется (нулевой оверхед).
    function imgFilter(z) {
        var f = cfg.imgfx[z] || {};
        var b = clampNum(f.brightness, 0.3, 1.5, 1), sa = clampNum(f.saturate, 0, 2, 1), bl = clampNum(f.blur, 0, 12, 0);
        return (b !== 1 || sa !== 1 || bl > 0) ? "  filter: brightness(" + b + ") saturate(" + sa + ") blur(" + bl + "px);" : "";
    }
    // актив-бар делит картинку с сайдбаром, заставка — с редактором, поэтому фильтры общие.
    var IMGF_ED = imgFilter("editor"), IMGF_SB = imgFilter("side"), IMGF_PN = imgFilter("panel");

    // РЕДАКТОР
    add(
        ".monaco-editor .overflow-guard > .monaco-scrollable-element > .monaco-editor-background { background: none; }",
        ".monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
        "  background: " + BG_ED + ";",
        "  opacity: " + (op.editor * switchMul * edDim) + ";", TR, IMGF_ED,
        (fx.kenburns ? "  animation: mlbg-kenburns " + fxp.kbSpeed + "s ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
        "}"
    );
    if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(" + fxp.kbScale + "); } }");

    // САЙДБАР / ПАНЕЛЬ
    add(
        ".part.sidebar::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
        "  background: " + BG_SB + "; opacity: " + (op.side * switchMul) + ";", TR, IMGF_SB,
        "}",
        ".part.panel::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
        "  background: " + BG_PN + "; opacity: " + (op.panel * switchMul) + ";", TR, IMGF_PN,
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
    var tcur = safeColor(t.cursorColor, DEFAULTS.term.cursorColor);
    var tsel = safeColor(t.selColor, DEFAULTS.term.selColor);
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

    // ЭФФЕКТЫ
    if (fx.activityBg) add(
        ".part.activitybar::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
        "  background: " + BG_SB + "; opacity: " + (0.10 * switchMul) + ";", TR, IMGF_SB,
        "}"
    );
    if (fx.rounded) add(
        ".monaco-menu .monaco-action-bar, .quick-input-widget, .monaco-hover, .suggest-widget,",
        ".editor-widget.find-widget, .notifications-toasts .notification-toast {",
        "  border-radius: 10px !important; overflow: hidden;",
        "}"
    );
    if (fx.tabAccent) add(".tabs-container > .tab.active { box-shadow: inset 0 -2px 0 0 var(--mlbg-accent); }");
    if (fx.vignette) add(".part.editor .editor-container { box-shadow: inset 0 0 140px 30px rgba(0,0,0," + fxp.vignette + "); }");
    if (fx.scrim) add(".monaco-editor .view-lines { text-shadow: 0 0 3px rgba(" + scrimRGB + ",0.85); }");
    if (fx.glassTabs) {
        add(".part.editor > .content .editor-group-container > .title {");
        addSurface("--vscode-editorGroupHeader-tabsBackground", surfRGB, 0.55);
        add(blurLines(fxp.blur), "}");
    }
    if (fx.glassSide) {
        // сайдбар и панель берут СВОИ переменные фона темы (раньше делили одну константу)
        add(".part.sidebar {");
        addSurface("--vscode-sideBar-background", surfRGB, 0.60);
        add(blurLines(fxp.blur), "}");
        add(".part.panel {");
        addSurface("--vscode-panel-background", surfRGB, 0.60);
        add(blurLines(fxp.blur), "}");
    }
    if (fx.scrollbar) add(
        ".monaco-scrollable-element > .scrollbar > .slider { background: rgba(var(--mlbg-accent-rgb),0.30) !important; border-radius: 8px; }",
        ".monaco-scrollable-element > .scrollbar > .slider:hover { background: rgba(var(--mlbg-accent-rgb),0.55) !important; }"
    );
    if (fx.groupRing) add(".editor-group-container.active { box-shadow: inset 0 0 0 1px rgba(var(--mlbg-accent-rgb),0.28), inset 0 0 24px rgba(var(--mlbg-accent-rgb),0.08); }");
    if (fx.activeLine) add(
        ".monaco-editor .view-overlays .current-line {",
        "  background: rgba(var(--mlbg-accent-rgb),0.06) !important; box-shadow: inset 2px 0 0 0 rgba(var(--mlbg-accent-rgb),0.55);",
        "}"
    );
    if (fx.glassStatus) {
        add(".part.statusbar {");
        addSurface("--vscode-statusBar-background", surfRGB, 0.55);
        add(blurLines(Math.min(fxp.blur, 8)), "}");
    }
    if (fx.cursorGlow) add(
        ".monaco-editor .cursors-layer > .cursor { box-shadow: 0 0 8px 2px rgba(var(--mlbg-accent-rgb),0.85); border-radius: 1px; }"
    );
    if (fx.selection) add(
        ".monaco-editor .view-overlays .selected-text {",
        "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.32), rgba(137,180,250,0.32)) !important; border-radius: 2px;",
        "}"
    );
    if (fx.groupBorder) add(
        ".editor-group-container.active::before {",
        "  content:''; position:absolute; inset:0; z-index:6; pointer-events:none; padding:2px; border-radius:4px;",
        "  background:linear-gradient(120deg,var(--mlbg-accent),#89b4fa,#a6e3a1,var(--mlbg-accent)); background-size:300% 300%;",
        "  animation: mlbg-flow 8s linear infinite;",
        "  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor;",
        "  mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite:exclude;",
        "}",
        "@keyframes mlbg-flow { 0%{background-position:0% 50%} 100%{background-position:300% 50%} }"
    );
    if (fx.titlebar) add(
        ".part.titlebar, .titlebar {",
        // подложка титлбара — цвет темы var(--vscode-titleBar-activeBackground) с запасной
        // тема-зависимой константой; поверх — акцентный градиент, гаснущий к прозрачному.
        "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.30), rgba(137,180,250,0.16) 45%, rgba(" + surfRGB + ",0) 78%), var(--vscode-titleBar-activeBackground, " + titleSolid + ") !important;",
        "}"
    );
    if (fx.splash) add(
        ".editor-group-container.empty { position: relative; }",
        ".editor-group-container.empty::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
        // заставка = картинка редактора, всегда «contain»; 404 -> акцентная подложка
        "  background: " + (probeImage(IMG + s.editor).ok ? cssUrl(IMG + s.editor) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)") + "; opacity: " + (0.12 * switchMul * edDim) + ";", TR, IMGF_ED,
        "}"
    );

    add(
        "#moonlight-bg-switcher { cursor: pointer; }",
        "#moonlight-bg-switcher:hover { background: rgba(var(--mlbg-accent-rgb),0.18); }",
        // видимый фокус для клавиатуры (кнопка BG и все div-«кнопки» панели)
        "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible {",
        "  outline: 2px solid var(--mlbg-accent); outline-offset: 1px;",
        "}"
    );

    // Доступность/батарея: при системной «уменьшить движение» гасим CSS-анимации
    // (Ken Burns, живая рамка). Частицы (canvas/JS) выключаются отдельно в ensureParticles.
    add(
        "@media (prefers-reduced-motion: reduce) {",
        "  .monaco-editor .overflow-guard > .monaco-scrollable-element::after,",
        "  .editor-group-container.active::before { animation: none !important; }",
        "}"
    );
    return out.join("\n");
}

// ===== Инъекция стиля =====
// Ревизия: bumpStyle() дёргается при любом изменении, влияющем на CSS (apply/applyFade).
// ensureStyle пересобирает CSS только когда ревизия сдвинулась ИЛИ наш <style> пропал
// (VS Code перестроил DOM). Иначе периодический heal() каждые 3 с — это дешёвая проверка
// getElementById без пересборки ~5 КБ строки.
var STYLE_ID = "moonlight-custom-bg";
var _styleRev = 0, _appliedRev = -1;
function bumpStyle() { _styleRev++; }
function ensureStyle() {
    try {
        var el = document.getElementById(STYLE_ID);
        if (el && el.textContent && _appliedRev === _styleRev) return; // ничего не менялось, стиль на месте
        var css = buildCSS();
        if (!el) { el = document.createElement("style"); el.id = STYLE_ID; document.head.appendChild(el); }
        if (el.textContent !== css) el.textContent = css;
        _appliedRev = _styleRev;
    } catch (e) {}
}
function apply() { saveCfg(); bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
// Троттлинг для слайдеров: коалесцируем поток input-событий в один apply за кадр
// (иначе на каждый пиксель — пересборка CSS + запись в localStorage).
var _applyRaf = 0;
function applyThrottled() {
    if (_applyRaf) return;
    _applyRaf = requestAnimationFrame(function () { _applyRaf = 0; apply(); });
}
function applyFade() {
    saveCfg(); updateLabel(); syncWidgets();
    // switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
    switchMul = 0; bumpStyle(); ensureStyle();
    requestAnimationFrame(function () { switchMul = 1; bumpStyle(); ensureStyle(); });
}
