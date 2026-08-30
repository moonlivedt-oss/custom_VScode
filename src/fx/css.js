// ===== Проба картинок: загрузка (404) + средняя яркость (для авто-дима) =====
// Одна загрузка на URL обслуживает и фолбэк при 404 (ok), и авто-яркость (luma).
// Картинки лежат на vscode-file://vscode-app/… — тот же origin, что и воркбенч,
// поэтому canvas не «портится» (getImageData не бросает security-ошибку).
// Результат кэшируется; по готовности дёргаем пересборку стиля (bumpStyle+ensureStyle).
// url -> { ok: bool, luma: 0..1|null, accent: "#rrggbb"|null, resolved: bool }.
// Одна загрузка на URL обслуживает 404-фолбэк (ok), авто-яркость (luma), «акцент из
// картинки» (accent) и health-check чипов (через onImage) — картинки больше не грузятся дважды.
var _imgState = {};
var _imgListeners = {}; // url -> [cb], вызываются один раз по готовности (или ошибке)
function _fireImg(url, st) {
    var ls = _imgListeners[url]; if (!ls) return;
    _imgListeners[url] = null;
    for (var i = 0; i < ls.length; i++) { try { ls[i](st); } catch (e) {} }
}
function probeImage(url) {
    if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
    var st = { ok: true, luma: null, accent: null, palette: null, resolved: false }; // до загрузки: «ок, метрики неизвестны»
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
                st.accent = dominantAccent(d); // доминирующий цвет -> готовый акцент
                st.palette = dominantPalette(d); // гармоничная палитра (для «Палитры из картинки»)
            } catch (e) { st.luma = 1; st.accent = null; st.palette = null; } // canvas «испорчен»/ошибка — не димим
            st.resolved = true; _fireImg(url, st); bumpStyle(); ensureStyle();
        };
        im.onerror = function () { st.ok = false; st.resolved = true; _fireImg(url, st); bumpStyle(); ensureStyle(); };
        im.src = url;
    } catch (e) {}
    return st;
}
// Подписка на готовность пробы URL: если уже загружено/сломано — колбэк сразу, иначе в очередь.
// Используется чипами наборов (health-check) вместо собственной второй загрузки картинки.
function onImage(url, cb) {
    var st = probeImage(url);
    if (st.resolved) { try { cb(st); } catch (e) {} return; }
    (_imgListeners[url] || (_imgListeners[url] = [])).push(cb);
}

// ===== Цвет из картинки (для «Акцент из картинки») =====
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [h, s, l];
}
function _hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}
function hslToHex(h, s, l) {
    var r, g, b;
    if (!s) { r = g = b = l; }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        r = _hue2rgb(p, q, h + 1 / 3); g = _hue2rgb(p, q, h); b = _hue2rgb(p, q, h - 1 / 3);
    }
    function hx(v) { var t = Math.round(v * 255).toString(16); return t.length < 2 ? "0" + t : t; }
    return "#" + hx(r) + hx(g) + hx(b);
}
// Доминирующий цвет как готовый акцент: круговое среднее оттенка с весом по насыщенности^2
// (серые пиксели почти не влияют на оттенок), затем нормировка S/L в «читаемый акцент».
// Почти серая картинка -> берём среднее RGB и поднимаем насыщенность.
function dominantAccent(d) {
    var n = d.length / 4; if (!n) return null;
    var sx = 0, sy = 0, sw = 0, sS = 0, sL = 0, rr = 0, gg = 0, bb = 0, i, hsl, w, ang;
    for (i = 0; i < d.length; i += 4) {
        rr += d[i]; gg += d[i + 1]; bb += d[i + 2];
        hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        w = hsl[1] * hsl[1]; ang = hsl[0] * 2 * Math.PI;
        sx += Math.cos(ang) * w; sy += Math.sin(ang) * w; sS += hsl[1] * w; sL += hsl[2] * w; sw += w;
    }
    var H, S, L;
    if (sw < 1e-4) { var m = rgbToHsl(rr / n, gg / n, bb / n); H = m[0]; S = Math.max(0.5, m[1]); L = m[2]; }
    else { H = Math.atan2(sy, sx) / (2 * Math.PI); if (H < 0) H += 1; S = sS / sw; L = sL / sw; }
    S = Math.min(0.85, Math.max(0.55, S));
    L = Math.min(0.70, Math.max(0.55, L));
    return hslToHex(H, S, L);
}
// ===== Палитра из картинки («wallust для VS Code») =====
// Гистограмма по 12 корзинам оттенка (вес — насыщенность^2, серые почти не влияют),
// топ-корзины -> до 3 гармоничных акцентов. Нормируем S/L в «читаемый» диапазон, как
// dominantAccent. Возвращает [] для почти серой картинки (тогда buildCSS берёт поворот
// оттенка основного акцента). Считается один раз на загрузку картинки (в probeImage).
function _normAccent(h, s, l) {
    s = Math.min(0.85, Math.max(0.55, s)); l = Math.min(0.70, Math.max(0.55, l));
    return hslToHex(h, s, l);
}
function dominantPalette(d) {
    var BINS = 12, acc = [], i;
    for (i = 0; i < BINS; i++) acc.push({ x: 0, y: 0, s: 0, w: 0, l: 0 });
    for (i = 0; i < d.length; i += 4) {
        var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]), w = hsl[1] * hsl[1];
        var b = Math.min(BINS - 1, Math.floor(hsl[0] * BINS)), a = acc[b], ang = hsl[0] * 2 * Math.PI;
        a.x += Math.cos(ang) * w; a.y += Math.sin(ang) * w; a.s += hsl[1] * w; a.l += hsl[2] * w; a.w += w;
    }
    acc.sort(function (A, B) { return B.w - A.w; });
    var out = [];
    for (i = 0; i < acc.length && out.length < 3; i++) {
        var g = acc[i]; if (g.w < 1e-4) continue;
        var H = Math.atan2(g.y, g.x) / (2 * Math.PI); if (H < 0) H += 1;
        out.push(_normAccent(H, g.s / g.w, g.l / g.w));
    }
    return out;
}
// hex -> "r,g,b" массив и поворот оттенка (запасные accent2/accent3, когда палитры из
// картинки нет: почти серая картинка, набор-градиент или картинка ещё не загрузилась).
function hexToRgbArr(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function rotateHue(hex, dh) {
    var c = hexToRgbArr(hex), hsl = rgbToHsl(c[0], c[1], c[2]);
    var h = hsl[0] + dh; h -= Math.floor(h);
    return hslToHex(h, Math.max(0.5, hsl[1]), Math.min(0.70, Math.max(0.55, hsl[2])));
}
// Три акцента для эффектов: основной (getAccent) + два спутника. При включённой «Палитре
// из картинки» и готовой пробе — из картинки; иначе повороты оттенка основного акцента.
function accentTrio(ac, edUrl) {
    var pal = null;
    if (cfg.fx && cfg.fx.paletteSync && edUrl) { var st = probeImage(edUrl); if (st && st.palette && st.palette.length) pal = st.palette; }
    return [ac, (pal && pal[1]) || rotateHue(ac, 0.33), (pal && pal[2]) || rotateHue(ac, -0.33)];
}
// ===== Генеративные наборы (без картинок) =====
// Набор с массивом grad рисуется CSS-градиентом из палитры вместо фото. Ноль ассетов,
// грузится мгновенно, не зависит от путей (работает на любой машине). Пользовательская
// картинка зоны (cfg.setImg) всё равно перекрывает градиент — см. isGrad.
function isGradSet(idx) { var s = SETS[idx]; return !!(s && s.grad && s.grad.length); }
function hasUserImg(idx, zone) { var o = cfg.setImg && cfg.setImg[idx]; return !!(o && typeof o[zone] === "string" && o[zone]); }
function isGrad(idx, zone) { return isGradSet(idx) && !hasUserImg(idx, zone); }
// Градиент зоны: разный угол по зонам, чтобы редактор/сайдбар/панель не были одинаковыми.
// Палитра берётся из SETS (код, не пользовательский ввод) — CSS-инъекция невозможна.
function gradFor(idx, zone) {
    var s = SETS[idx], pal = (s && s.grad) ? s.grad : [safeColor(cfg.accent, DEFAULTS.accent)];
    var ang = zone === "editor" ? "135deg" : zone === "sidebar" ? "160deg" : "110deg";
    return "linear-gradient(" + ang + ", " + pal.join(", ") + ")";
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

// Стили самой кнопки «BG» и видимого фокуса — нужны всегда (в т.ч. когда фон выключен),
// иначе панель/кнопка теряют hover и обводку фокуса. Вынесены отдельно для мастер-выключателя.
function switcherCSS() {
    return [
        "#moonlight-bg-switcher { cursor: pointer; }",
        "#moonlight-bg-switcher:hover { background: rgba(var(--mlbg-accent-rgb),0.18); }",
        // видимый фокус для клавиатуры (кнопка BG и все div-«кнопки» панели)
        "#moonlight-bg-switcher:focus-visible, #moonlight-bg-panel [role=button]:focus-visible {",
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
        if (!probeImage(url).ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
        var fit = (cfg.fit && cfg.fit[fitZone] === "contain") ? "contain" : "cover";
        return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
    }
    // Фон зоны: генеративный набор -> градиент (SETS zone-ключ), иначе картинка (zoneBg).
    // zone — ключ SETS ("editor"|"sidebar"|"panel"); fitZone — ключ cfg.fit ("side" у сайдбара).
    function bgFor(zone, fitZone, position) {
        return isGrad(idx, zone) ? gradFor(idx, zone) : zoneBg(zoneUrl(idx, zone), fitZone, position);
    }
    var edUrl = zoneUrl(idx, "editor");
    var edIsGrad = isGrad(idx, "editor");
    var BG_ED = bgFor("editor", "editor", "center");
    var BG_SB = bgFor("sidebar", "side", "center bottom");
    var BG_PN = bgFor("panel", "panel", "right bottom");
    // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
    // Для градиента яркость не измерить (нет пикселей) — множитель 1.
    var edDim = (!edIsGrad && cfg.autoDim) ? lumaDimFactor(probeImage(edUrl).luma) : 1;
    // Трио акцентов для эффектов: основной + два спутника (палитра из картинки редактора
    // при включённой «Палитре из картинки», иначе повороты оттенка). ac2/ac3 — hex.
    var trio = accentTrio(ac, edIsGrad ? null : edUrl), ac2 = trio[1], ac3 = trio[2];
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

    // Акцентный цвет (ac/acRGB уже посчитаны выше) — все эффекты ниже используют
    // var(--mlbg-accent) / rgba(var(--mlbg-accent-rgb), a).
    add(rootVar);
    // Спутники акцента как переменные (палитра эффектов). Пока их читает «живой контур»
    // при «Палитре из картинки»; вынесены в :root для переиспользования другими эффектами.
    add(":root { --mlbg-accent2: " + ac2 + "; --mlbg-accent3: " + ac3 + "; }");

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
        // Параллакс: смещаем background-position за курсором (переменные ставит boot.js).
        // Longhand после shorthand background перекрывает его позицию. Только картинка
        // (у градиента позиции нет). cover уже с запасом перекрытия — сдвиг в ~8px не оголяет край.
        (fx.parallax && !edIsGrad ? "  background-position: calc(50% + var(--mlbg-par-x,0px)) calc(50% + var(--mlbg-par-y,0px));" : ""),
        (fx.kenburns ? "  animation: mlbg-kenburns " + fxp.kbSpeed + "s ease-in-out infinite alternate; transform-origin:center; will-change:transform;" : ""),
        "}"
    );
    if (fx.kenburns) add("@keyframes mlbg-kenburns { from { transform: scale(1); } to { transform: scale(" + fxp.kbScale + "); } }");
    // Приглушение фона при печати: пока на body висит класс mlbg-typing (навешивается
    // в boot.js на набор текста и снимается после паузы), опускаем прозрачность оверлея
    // редактора до ~30% от текущей. У оверлея уже есть transition:opacity — переход плавный.
    if (fx.dimOnType) add(
        "body.mlbg-typing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: " + (op.editor * switchMul * edDim * 0.3) + " !important;",
        "}"
    );
    // Приглушение фона при потере фокуса окном: класс body.mlbg-unfocused навешивается в
    // boot.js на window blur и снимается на focus. Опускаем прозрачность оверлея редактора
    // до ~35% (у оверлея уже есть transition:opacity — переход плавный).
    if (fx.dimOnBlur) add(
        "body.mlbg-unfocused .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: " + (op.editor * switchMul * edDim * 0.35) + " !important;",
        "}"
    );
    // «Поток»: при долгой непрерывной печати boot.js вешает body.mlbg-flowing — фон
    // редактора гаснет сильнее, чем при обычном dim-on-type (~15% от текущего), и плавно
    // (у оверлея есть transition:opacity). Снимается на паузе для чтения.
    if (fx.flow) add(
        "body.mlbg-flowing .monaco-editor .overflow-guard > .monaco-scrollable-element::after {",
        "  opacity: " + (op.editor * switchMul * edDim * 0.15) + " !important;",
        "}"
    );

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
        // оба стопа — акцент набора (разная прозрачность даёт глубину градиента),
        // раньше второй стоп был зашит синим и не следовал за палитрой набора
        "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.32), rgba(var(--mlbg-accent-rgb),0.16)) !important; border-radius: 2px;",
        "}"
    );
    if (fx.groupBorder) add(
        ".editor-group-container.active::before {",
        "  content:''; position:absolute; inset:0; z-index:6; pointer-events:none; padding:2px; border-radius:4px;",
        // По умолчанию — радужный перелив; groupBorderMono даёт «дыхание» одним акцентом.
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
    );
    if (fx.titlebar) add(
        ".part.titlebar, .titlebar {",
        // подложка титлбара — цвет темы var(--vscode-titleBar-activeBackground) с запасной
        // тема-зависимой константой; поверх — акцентный градиент, гаснущий к прозрачному.
        "  background: linear-gradient(90deg, rgba(var(--mlbg-accent-rgb),0.30), rgba(var(--mlbg-accent-rgb),0.14) 45%, rgba(" + surfRGB + ",0) 78%), var(--vscode-titleBar-activeBackground, " + titleSolid + ") !important;",
        "}"
    );
    if (fx.splash) add(
        ".editor-group-container.empty { position: relative; }",
        ".editor-group-container.empty::after {",
        "  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;",
        // заставка = картинка редактора, всегда «contain»; градиент -> сам градиент; 404 -> акцентная подложка
        "  background: " + (edIsGrad ? gradFor(idx, "editor") : (probeImage(edUrl).ok ? cssUrl(edUrl) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)")) + "; opacity: " + (0.12 * switchMul * edDim) + ";", TR, IMGF_ED,
        "}"
    );

    add(switcherCSS());

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
