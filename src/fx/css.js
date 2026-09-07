// ===== Сборка таблицы стилей =====
// Один <style> на весь плагин. Здесь собираются правила, зависящие от НАБОРА ПРАВИЛ:
// активный набор, тема редактора, включённые эффекты. Числовые параметры сюда не попадают —
// они уходят в CSS-переменные (см. src/fx/style.js).

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

// Стили самой кнопки «BG» и видимого фокуса — нужны всегда (в т.ч. когда фон выключен),
// иначе панель/кнопка теряют hover и обводку фокуса. Вынесены отдельно для мастер-выключателя.
function switcherCSS() {
    return [
        "#moonlight-bg-switcher { cursor: pointer; }",
        "#moonlight-bg-switcher:hover { background: rgba(var(--mlbg-accent-rgb),0.18); }",
        // видимый фокус для клавиатуры: кнопка BG, все div-«кнопки» панели И нативные
        // контролы (поля, ползунки, селекты, чекбоксы, цвет) — иначе с клавиатуры не видно,
        // где ты находишься. Обводка акцентом, чуть отступя, поверх любого фона панели.
        "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible,",
        "#moonlight-bg-panel input:focus-visible, #moonlight-bg-panel select:focus-visible,",
        "#moonlight-bg-panel textarea:focus-visible {",
        "  outline: 2px solid var(--mlbg-accent); outline-offset: 1px;",
        "}",
        // Скроллбар панели «Фон и дизайн»: по умолчанию Electron рисует широкий светлый
        // трек с серым ползунком — на тёмной панели он выбивается. Делаем тонкий, трек
        // прозрачный, ползунок акцентного цвета (border+background-clip дают воздух вокруг).
        // Firefox-свойства (scrollbar-*) — на случай не-Chromium движка; в VS Code работает
        // именно ::-webkit-scrollbar. Нужен всегда, даже когда фон выключен, — панель живёт.
        "#moonlight-bg-panel { scrollbar-width: thin; scrollbar-color: rgba(var(--mlbg-accent-rgb),0.45) transparent; }",
        "#moonlight-bg-panel::-webkit-scrollbar { width: 10px; }",
        "#moonlight-bg-panel::-webkit-scrollbar-track { background: transparent; }",
        "#moonlight-bg-panel::-webkit-scrollbar-thumb {",
        "  background: rgba(var(--mlbg-accent-rgb),0.35); border-radius: 8px;",
        "  border: 2px solid transparent; background-clip: padding-box;",
        "}",
        "#moonlight-bg-panel::-webkit-scrollbar-thumb:hover {",
        "  background: rgba(var(--mlbg-accent-rgb),0.6); border: 2px solid transparent; background-clip: padding-box;",
        "}"
    ].join("\n");
}

// ===== Сборка CSS =====
function buildCSS() {
    // Акцент нужен и в выключенном режиме (для стилей кнопки/фокуса), считаем первым.
    var ac = safeColor(getAccent(), DEFAULTS.accent);
    var acRGB = accentRGB();
    var rootVar = ":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + acRGB + "; }";
    // Мастер-выключатель: фон и эффекты выключены — отдаём только переменную акцента и
    // стили кнопки/фокуса. Никаких фоновых картинок, стекла, фильтров — «ванильный» VS Code,
    // но кнопка BG и панель остаются рабочими, чтобы включить обратно.
    if (!cfg.enabled) return rootVar + "\n" + switcherCSS();

    var idx = activeIndex(), s = SETS[idx], fx = cfg.fx, fxp = cfg.fxp, op = getOp();
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
    // rel уже разрешён в абсолютный URL (zoneUrl учёл cfg.setImg). zone: editor|side|panel
    // здесь — ключ cfg.fit (вписывание), поэтому "side", а не "sidebar".
    function zoneBg(url, fitZone, position) {
        var st = probeImage(url);
        if (!st.ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
        var fit = (cfg.fit && cfg.fit[fitZone] === "contain") ? "contain" : "cover";
        // LQIP: полная картинка ещё декодируется, но в кэше есть мини-превью
        // прошлой сессии — показываем его, чтобы первый кадр был не пустым. Как только
        // придёт настоящая картинка, probeImage дёрнет пересборку и превью сменится.
        if (!st.resolved && st.thumb) return cssUrl(st.thumb) + " " + position + " / " + fit + " no-repeat";
        return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
    }
    // Вырез из мастер-картинки. crop = [x, y, w, h] в процентах исходника.
    // Формула стандартная для background: масштаб 100/w, позиция x/(100-w) — так в окно
    // зоны попадает ровно указанный прямоугольник кадра.
    function cropBg(url, crop) {
        var st = probeImage(url);
        if (!st.ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
        var x = clampNum(crop[0], 0, 100, 0), y = clampNum(crop[1], 0, 100, 0);
        var w = clampNum(crop[2], 1, 100, 100), h = clampNum(crop[3], 1, 100, 100);
        var px = w >= 100 ? 50 : (x / (100 - w)) * 100;
        var py = h >= 100 ? 50 : (y / (100 - h)) * 100;
        var src = (!st.resolved && st.thumb) ? st.thumb : url;
        return cssUrl(src) + " " + px.toFixed(2) + "% " + py.toFixed(2) + "% / " +
               (10000 / w).toFixed(2) + "% " + (10000 / h).toFixed(2) + "% no-repeat";
    }
    // Фон зоны: генеративный набор -> градиент (SETS zone-ключ), иначе картинка (zoneBg).
    // zone — ключ SETS ("editor"|"sidebar"|"panel"); fitZone — ключ cfg.fit ("side" у сайдбара).
    function bgFor(zone, fitZone, position) {
        if (typeof isShader === "function" && isShader(idx, zone)) return shaderBg(idx, zone);
        if (isProc(idx, zone)) return procBg(idx, zone);
        if (isGrad(idx, zone)) return gradFor(idx, zone);
        var cr = cropFor(idx, zone), u = zoneUrl(idx, zone);
        // Адаптивный скрим идёт ПЕРВЫМИ слоями фона — поверх картинки.
        return adaptiveLayers(u, cr, light) + (cr ? cropBg(u, cr) : zoneBg(u, fitZone, position));
    }
    // Библиотека картинок: если «Крутить библиотеку» включено, зона редактора показывает
    // текущую картинку из личной библиотеки (libraryEditorUrl определён в extras.js — доступен из
    // рантайма через область IIFE) вместо картинки/градиента набора. Остальные зоны и акцент —
    // как у активного набора. libEd — уже разрешённый абсолютный URL или null.
    var libEd = null;
    try { if (typeof libraryActive === "function" && libraryActive()) libEd = libraryEditorUrl(); } catch (e) {}
    var edUrl = libEd || zoneUrl(idx, "editor");
    // «Не фото» редактора: градиент ИЛИ процедурная текстура — у обоих нет измеримой светлоты
    // и своего URL-фото, поэтому авто-дим и трио-акцент из картинки для них выключаются.
    // Картинка библиотеки — это фото, поэтому при libEd считаем зону «фото» (edIsGrad=false).
    // «Не фото» в редакторе: градиент, процедурная текстура ИЛИ шейдер — ни у одного нет
    // измеримой светлоты и URL-фото, поэтому авто-дим, параллакс и трио-акцент из картинки
    // для них выключаются, а заставка берёт градиент набора вместо url().
    var edIsGrad = !libEd && (isGrad(idx, "editor") || isProc(idx, "editor") ||
                              (typeof isShader === "function" && isShader(idx, "editor")));
    var BG_ED = libEd ? (adaptiveLayers(libEd, null, light) + zoneBg(libEd, "editor", "center")) : bgFor("editor", "editor", "center");
    var BG_SB = bgFor("sidebar", "side", "center bottom");
    var BG_PN = bgFor("panel", "panel", "right bottom");
    // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
    // Для градиента яркость не измерить (нет пикселей) — множитель 1.
    if (!edIsGrad && cfg.autoDim) probeImage(edUrl); // запускаем пробу: яркость нужна editorOpFactor()
    // Режим чтения: постоянно и сильно гасим фон редактора (не как flow — тот по печати),
    // чтобы код читался максимально чётко; сайдбар/панель/эффекты не трогаем.
    // Режим чтения и авто-дим учтены в переменной --mlbg-op-editor (editorOpFactor).
    // Трио акцентов для эффектов: основной + два спутника (палитра из картинки редактора
    // при включённой «Палитре из картинки», иначе повороты оттенка). ac2/ac3 — hex.
    var trio = accentTrio(ac, edIsGrad ? null : edUrl), ac2 = trio[1], ac3 = trio[2];
    // rgb-формы спутников ("r,g,b") — для rgba() в градиентах Aurora (там нужен альфа-канал).
    var ac2RGB = hexToRgbArr(ac2).join(","), ac3RGB = hexToRgbArr(ac3).join(",");
    var out = [];
    function add() { for (var i = 0; i < arguments.length; i++) out.push(arguments[i]); }
    var TR = "  transition: opacity 0.5s ease;";
    // Поверхность «матового стекла»: точный цвет темы через var(--vscode-*) с нужной
    // прозрачностью (color-mix), плюс запасная строка rgba() под старые движки без
    // color-mix. Порядок важен: сначала fallback, затем color-mix (если поддержан —
    // побеждает как более поздняя валидная декларация; если нет — остаётся rgba).
    // База rgba — тема-зависимая surfRGB; a — прозрачность 0..1. ВОЗВРАЩАЕТ пару строк
    // (а не пишет в out): блоки эффектов собираются в таблицу FX_BLOCKS и сами складывают
    // свои строки, поэтому примитивам поверхности/размытия удобнее отдавать строки.
    function surfaceLines(cssVar, a) {
        var pct = Math.round(a * 100);
        return [
            "  background-color: rgba(" + surfRGB + "," + a + ") !important;",
            "  background-color: color-mix(in srgb, var(" + cssVar + ") " + pct + "%, transparent) !important;"
        ];
    }
    function blurLines(px) { return "  backdrop-filter: blur(" + px + "); -webkit-backdrop-filter: blur(" + px + ");"; }

    // Акцентный цвет (ac/acRGB уже посчитаны выше) — все эффекты ниже используют
    // var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
    add(rootVar);
    // Спутники акцента как переменные (палитра эффектов). Пока их читает «живой контур»
    // при «Палитре из картинки»; вынесены в :root для переиспользования другими эффектами.
    add(":root { --mlbg-accent2: " + ac2 + "; --mlbg-accent3: " + ac3 + "; }");

    // Фильтры самой фоновой картинки (яркость/насыщенность/размытие) — своя строка на зону.
    // Числа зажаты в mergeCfg, здесь клампим повторно (defense-in-depth). Пустая строка,
    // если зона на дефолте, — тогда filter не добавляется (нулевой оверхед).
    // Значения едут через CSS-переменные (см. buildVars): при перетаскивании ползунка
    // меняется только переменная, текст стиля остаётся прежним и не переразбирается.
    function imgFilter(z) {
        return "  filter: brightness(var(--mlbg-br-" + z + ")) saturate(var(--mlbg-sa-" + z + ")) blur(var(--mlbg-bl-" + z + "));";
    }
    // актив-бар делит картинку с сайдбаром, заставка — с редактором, поэтому фильтры общие.
    var IMGF_ED = imgFilter("editor"), IMGF_SB = imgFilter("side"), IMGF_PN = imgFilter("panel");

    // РЕДАКТОР
    add(
        ".monaco-editor .overflow-guard > .monaco-scrollable-element > .monaco-editor-background { background: none; }",
        ".monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
        "  background: " + BG_ED + ";",
        "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch));", TR, IMGF_ED,
        // Параллакс: смещаем background-position за курсором (переменные ставит boot.js).
        // Longhand после shorthand background перекрывает его позицию. Только картинка
        // (у градиента позиции нет). cover уже с запасом перекрытия — сдвиг в ~8px не оголяет край.
        (fx.parallax && !edIsGrad ? "  background-position: calc(50% + var(--mlbg-par-x,0px)) calc(50% + var(--mlbg-par-y,0px));" : ""),
        (fx.kenburns ? "  animation: mlbg-kenburns var(--mlbg-kb-speed) ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
        "}"
    );
    if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(var(--mlbg-kb-scale)); } }");
    // Приглушение фона при печати: пока на body висит класс mlbg-typing (навешивается
    // в boot.js на набор текста и снимается после паузы), опускаем прозрачность оверлея
    // редактора до ~30% от текущей. У оверлея уже есть transition:opacity — переход плавный.
    if (fx.dimOnType) add(
        "body.mlbg-typing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.3) !important;",
        "}"
    );
    // Приглушение фона при потере фокуса окном: класс body.mlbg-unfocused навешивается в
    // boot.js на window blur и снимается на focus. Опускаем прозрачность оверлея редактора
    // до ~35% (у оверлея уже есть transition:opacity — переход плавный).
    if (fx.dimOnBlur) add(
        "body.mlbg-unfocused .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.35) !important;",
        "}"
    );
    // «Поток»: при долгой непрерывной печати boot.js вешает body.mlbg-flowing — фон
    // редактора гаснет сильнее, чем при обычном dim-on-type (~15% от текущего), и плавно
    // (у оверлея есть transition:opacity). Снимается на паузе для чтения.
    if (fx.flow) add(
        "body.mlbg-flowing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: calc(var(--mlbg-op-editor) * var(--mlbg-switch) * 0.15) !important;",
        "}"
    );

    // САЙДБАР / ПАНЕЛЬ
    add(
        ".part.sidebar::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
        "  background: " + BG_SB + "; opacity: calc(var(--mlbg-op-side) * var(--mlbg-switch));", TR, IMGF_SB,
        "}",
        ".part.panel::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 1000; pointer-events: none;",
        "  background: " + BG_PN + "; opacity: calc(var(--mlbg-op-panel) * var(--mlbg-switch));", TR, IMGF_PN,
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

    // Блоки эффектов живут в src/fx/blocks.js — сюда приходит только их таблица.
    var FX_BLOCKS = fxBlocks({
        ac: ac, ac2: ac2, ac3: ac3, acRGB: acRGB, ac2RGB: ac2RGB, ac3RGB: ac3RGB,
        light: light, surfRGB: surfRGB, scrimRGB: scrimRGB, shadowRGB: shadowRGB, titleSolid: titleSolid,
        surfaceLines: surfaceLines, blurLines: blurLines,
        idx: idx, set: s, edUrl: edUrl, edIsGrad: edIsGrad, fx: fx, fxp: fxp, TR: TR,
        BG_SB: BG_SB, IMGF_ED: IMGF_ED, IMGF_SB: IMGF_SB
    });
    for (var bi = 0; bi < FX_BLOCKS.length; bi++) {
        if (fx[FX_BLOCKS[bi][0]]) add.apply(null, FX_BLOCKS[bi][1]());
    }

    add(switcherCSS());

    // Доступность/батарея: при системной «уменьшить движение» гасим CSS-анимации
    // (Ken Burns, живая рамка, Aurora, пульс печати). Частицы (canvas/JS) выключаются
    // отдельно в ensureParticles. Спотлайт — не авто-анимация (следует за курсором по
    // явному желанию пользователя), поэтому его тут не трогаем. Селекторы Aurora/пульса
    // добавляем в список ТОЛЬКО когда эффект включён — иначе их правила всё равно нет,
    // а лишний селектор зря «маячил» бы в CSS (и путал бы точечные проверки).
    var rmSel = [
        "  .monaco-editor .overflow-guard > .monaco-scrollable-element::after",
        "  .editor-group-container.active::before"
    ];
    if (fx.aurora) rmSel.push("  .monaco-editor .overflow-guard > .monaco-scrollable-element::before");
    if (fx.typingPulse) rmSel.push("  body.mlbg-typing .tabs-container > .tab.active");
    if (fx.errorReact) rmSel.push("  body.mlbg-errors .monaco-workbench .part.statusbar");
    // «Живой фон»: пан сайдбара/панели (редактор ::after уже в списке выше). «Анимации UI»:
    // keyframes-появления палитры/подсказок/тостов (тонкие transition при этом остаются).
    if (fx.liveBg) { rmSel.push("  .part.sidebar::after"); rmSel.push("  .part.panel::after"); }
    if (fx.uiAnim) {
        rmSel.push("  .quick-input-widget", "  .suggest-widget", "  .monaco-hover",
            "  .parameter-hints-widget", "  .editor-widget.find-widget",
            "  .notifications-toasts .notification-toast");
    }
    add(
        "@media (prefers-reduced-motion: reduce) {",
        rmSel.join(",\n") + " { animation: none !important; }",
        "}"
    );
    // Доступность: при системной «уменьшить прозрачность» убираем размытие «матового стекла»
    // с наших поверхностей (backdrop-filter — источник полупрозрачности, тяжёлой для чтения и
    // для восприятия при вестибулярных/зрительных особенностях). Сам фон/цвета остаются; уходит
    // только blur. Всегда в CSS (не зависит от эффектов) — активируется только при системном флаге.
    add(
        "@media (prefers-reduced-transparency: reduce) {",
        "  #moonlight-bg-panel, .quick-input-widget, .suggest-widget, .monaco-hover,",
        "  .monaco-workbench .part.sidebar, .monaco-workbench .part.panel, .monaco-workbench .part.statusbar,",
        "  .monaco-workbench .part.titlebar, .monaco-workbench .part.activitybar, .monaco-workbench .part.auxiliarybar,",
        "  .tabs-container {",
        "    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;",
        "  }",
        "}"
    );
    // Авто-бюджет производительности: класс body.mlbg-perfsave навешивается
    // рантаймом (perf.js в widgets), когда FPS устойчиво низкий. Гасим самые дорогие по кадрам
    // непрерывные эффекты — анимированный градиент Aurora, пульс печати, «поток» и «живой
    // контур» группы — и приглушаем слой частиц (их число рантайм тоже снижает). Правило есть
    // в CSS всегда, но действует лишь при наличии класса (нулевая цена, пока FPS в норме).
    add(
        "body.mlbg-perfsave .monaco-editor .overflow-guard > .monaco-scrollable-element::before,",
        "body.mlbg-perfsave .editor-group-container.active::before,",
        "body.mlbg-perfsave .tabs-container > .tab.active { animation: none !important; }",
        "body.mlbg-perfsave #mlbg-particles { opacity: 0.25 !important; }"
    );
    // «Живой фон» — тоже непрерывная анимация (пан зон), поэтому под эконом-режимом гасим её.
    if (fx.liveBg) add(
        "body.mlbg-perfsave .monaco-editor .overflow-guard > .monaco-scrollable-element::after,",
        "body.mlbg-perfsave .part.sidebar::after, body.mlbg-perfsave .part.panel::after { animation: none !important; }"
    );
    return out.join("\n");
}
