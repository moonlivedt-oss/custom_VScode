// ===== Из чего рисуется фон набора =====
// У набора четыре возможных источника: фотография (в т.ч. вырез мастер-кадра), CSS-градиент,
// процедурная текстура на canvas и шейдер на GPU (см. src/fx/shader.js). Здесь — предикаты
// «какой источник у этой зоны» и построение самого фона для градиентных и процедурных
// наборов. Пользовательская картинка зоны (cfg.setImg) перекрывает любой из них.

// Опорная тёмная подложка набора для проверки контраста акцента: у grad — первый цвет,
// у proc — base, у фото-набора — типовая тёмная поверхность редактора (#1e1e2e).
function accentContrastRef() {
    var s = SETS[activeIndex()];
    if (s && s.grad && s.grad.length && isColor(s.grad[0])) return s.grad[0];
    if (s && s.proc && isColor(s.base)) return s.base;
    return "#1e1e2e";
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
// ===== Наборы одной мастер-картинкой =====
// Набор вида { master: "assets/sets/x.jpg", crop: { editor:[x,y,w,h], sidebar:[…], panel:[…] } }
// показывает во всех трёх зонах ОДИН файл, вырезая из него разные области (проценты кадра).
// Втрое меньше ассетов и единая палитра зон. Свой файл зоны (cfg.setImg) вырез отменяет —
// пользовательская картинка показывается целиком, как и раньше.
function cropFor(idx, zone) {
    var s = SETS[idx];
    if (!s || !s.master || !s.crop || hasUserImg(idx, zone)) return null;
    var c = s.crop[zone];
    return (Object.prototype.toString.call(c) === "[object Array]" && c.length === 4) ? c : null;
}

// ===== Генерация набора по seed/палитре =====
// Из seed-строки ИЛИ базового цвета (#rrggbb) строим согласованный градиентный набор:
// тёмная подложка + акцент того же оттенка + гармоничный спутник (поворот на 150°). Всё —
// детерминировано от seed (одинаковый seed -> одинаковый набор), без ассетов, рендерится
// сразу как обычный grad-набор. Используется addGenSet (config.js) из UI-генератора.
// FNV-1a хэш строки -> целое (детерминированный «случайный» оттенок из текста).
function _seedHash(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
}
function genSetFromSeed(seed) {
    seed = (typeof seed === "string" ? seed : "").trim();
    var hue, name; // hue в долях [0,1) — как ждут rgbToHsl/hslToHex
    if (isColor(seed)) {
        var c = hexToRgbArr(seed);
        hue = rgbToHsl(c[0], c[1], c[2])[0];
        name = "Из цвета " + seed;
    } else {
        var src = seed || ("r" + Math.floor(Math.random() * 1e9)); // пусто -> случайный набор
        hue = (_seedHash(src) % 3600) / 3600;
        name = seed ? ("Seed: " + seed.slice(0, 20)) : "Случайный";
    }
    var accent = hslToHex(hue, 0.72, 0.66);
    var base = hslToHex(hue, 0.30, 0.10);
    var sat = hslToHex((hue + 150 / 360) % 1, 0.55, 0.60);
    return { name: name.slice(0, 40), grad: [base, accent, sat], accent: accent };
}
// Градиент зоны: у каждой зоны своя форма, чтобы редактор/сайдбар/панель не были
// одинаковыми — редактор идёт по диагонали, сайдбар той же палитрой в обратном порядке
// (тёмный край смещён к другому углу), панель — радиальный из нижнего правого угла.
// Палитра берётся из SETS (код, не пользовательский ввод) — CSS-инъекция невозможна.
function gradFor(idx, zone) {
    var s = SETS[idx], pal = (s && s.grad) ? s.grad : [safeColor(cfg.accent, DEFAULTS.accent)];
    if (zone === "sidebar") return "linear-gradient(160deg, " + pal.slice().reverse().join(", ") + ")";
    if (zone === "panel")   return "radial-gradient(120% 120% at 100% 100%, " + pal.join(", ") + ")";
    return "linear-gradient(135deg, " + pal.join(", ") + ")";
}

// ===== Процедурные наборы (proc) =====
// Как grad, но не плоский градиент: текстура («звёздное поле» / «волны-дюны» / «шум-грейн»)
// рисуется на canvas в data-URL — ни единого ассета. Рисуем один раз на набор (кэш _procCache),
// результат — фон для ВСЕХ зон набора (цельный вид). Если canvas/toDataURL недоступны
// (нестандартная среда, node-смоук), procTexture вернёт null и зона откатится на градиент
// из палитры набора (procFallback), поэтому набор всегда что-то показывает.
function isProcSet(idx) { var s = SETS[idx]; return !!(s && s.proc); }
function isProc(idx, zone) { return isProcSet(idx) && !hasUserImg(idx, zone); }
// Осветлить/затемнить hex на долю t (t>0 к белому, t<0 к чёрному).
function shadeHex(hex, t) {
    var c = hexToRgbArr(hex), to = t >= 0 ? 255 : 0, k = Math.abs(t);
    function f(v) { var x = Math.round(v + (to - v) * k); return (x < 16 ? "0" : "") + x.toString(16); }
    return "#" + f(c[0]) + f(c[1]) + f(c[2]);
}
var _procCache = {};
function _procStars(cx, W, H, acc) {
    var i, n = 150;
    for (i = 0; i < n; i++) {
        var x = Math.random() * W, y = Math.random() * H, r = Math.random() * 1.4 + 0.2;
        var useAcc = Math.random() < 0.35, a = 0.25 + Math.random() * 0.6;
        cx.fillStyle = useAcc ? "rgba(" + acc + "," + a + ")" : "rgba(235,235,255," + a + ")";
        cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
    }
}
function _procWaves(cx, W, H, acc) {
    var layer, x;
    for (layer = 0; layer < 6; layer++) {
        var yBase = H * (0.25 + layer * 0.12), amp = 10 + layer * 5, a = 0.05 + layer * 0.03;
        cx.strokeStyle = "rgba(" + acc + "," + a + ")"; cx.lineWidth = 1.5;
        cx.beginPath();
        for (x = 0; x <= W; x += 8) {
            var y = yBase + Math.sin((x / W) * 6.283 * (1 + layer * 0.3) + layer) * amp;
            if (x === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
        }
        cx.stroke();
    }
}
function _procNoise(cx, W, H, acc) {
    var i, n = 1400;
    for (i = 0; i < n; i++) {
        var x = Math.random() * W, y = Math.random() * H, a = Math.random() * 0.06;
        cx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255," + a + ")" : "rgba(0,0,0," + (a * 1.4) + ")";
        cx.fillRect(x, y, 1.5, 1.5);
    }
    // редкие акцентные искры поверх грейна
    for (i = 0; i < 40; i++) {
        cx.fillStyle = "rgba(" + acc + "," + (0.1 + Math.random() * 0.25) + ")";
        cx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
}
// Техно-сетка: ровные линии акцентом с редкими яркими узлами на пересечениях.
function _procGrid(cx, W, H, acc) {
    var step = 34, x, y;
    cx.strokeStyle = "rgba(" + acc + ",0.10)"; cx.lineWidth = 1;
    for (x = 0; x <= W; x += step) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (y = 0; y <= H; y += step) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    for (x = 0; x <= W; x += step) for (y = 0; y <= H; y += step) {
        if (Math.random() < 0.12) {
            cx.fillStyle = "rgba(" + acc + "," + (0.25 + Math.random() * 0.4) + ")";
            cx.beginPath(); cx.arc(x, y, 1.6, 0, 6.283); cx.fill();
        }
    }
}
// Топография: набор горизонтальных «контуров высоты» (сумма синусов), как на карте местности.
function _procTopo(cx, W, H, acc) {
    var line, x;
    cx.lineWidth = 1.2;
    for (line = 0; line < 14; line++) {
        var yBase = H * (line / 13) * 1.06 - H * 0.03;
        cx.strokeStyle = "rgba(" + acc + "," + (0.06 + (line % 3) * 0.02) + ")";
        cx.beginPath();
        for (x = 0; x <= W; x += 6) {
            var y = yBase + Math.sin((x / W) * 6.283 * 1.3 + line * 0.6) * (14 + line)
                          + Math.sin((x / W) * 6.283 * 2.7 + line) * 6;
            if (x === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
        }
        cx.stroke();
    }
}
// «Дождь матрицы»: вертикальные колонки-струи из квадратиков, голова — светлая, хвост гаснет.
function _procMatrix(cx, W, H, acc) {
    var colW = 12, col, i;
    for (col = 0; col * colW < W; col++) {
        var x = col * colW + 2, headY = Math.random() * H, len = 6 + Math.floor(Math.random() * 16);
        for (i = 0; i < len; i++) {
            var y = headY - i * 12; if (y < 0) y += H;
            cx.fillStyle = i === 0 ? "rgba(235,255,235,0.85)" : "rgba(" + acc + "," + ((1 - i / len) * 0.5) + ")";
            cx.fillRect(x, y, 6, 8);
        }
    }
}
// Клетки: сетка точек со случайным сдвигом, между соседями — грани (вороной-подобная сеть),
// часть клеток мягко залита акцентом, часть вершин — яркими точками.
function _procCells(cx, W, H, acc) {
    var cols = 8, rows = 6, gx = W / cols, gy = H / rows, r, c;
    var pts = [];
    for (r = 0; r <= rows; r++) {
        pts[r] = [];
        for (c = 0; c <= cols; c++) {
            var jx = (c === 0 || c === cols) ? 0 : (Math.random() - 0.5) * gx * 0.6;
            var jy = (r === 0 || r === rows) ? 0 : (Math.random() - 0.5) * gy * 0.6;
            pts[r][c] = [c * gx + jx, r * gy + jy];
        }
    }
    cx.strokeStyle = "rgba(" + acc + ",0.14)"; cx.lineWidth = 1;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        var p0 = pts[r][c], p1 = pts[r][c + 1], p2 = pts[r + 1][c + 1], p3 = pts[r + 1][c];
        cx.beginPath(); cx.moveTo(p0[0], p0[1]); cx.lineTo(p1[0], p1[1]); cx.lineTo(p2[0], p2[1]); cx.lineTo(p3[0], p3[1]); cx.closePath();
        if (Math.random() < 0.18) { cx.fillStyle = "rgba(" + acc + "," + (0.05 + Math.random() * 0.08) + ")"; cx.fill(); }
        cx.stroke();
    }
    for (r = 0; r <= rows; r++) for (c = 0; c <= cols; c++) {
        if (Math.random() < 0.10) { cx.fillStyle = "rgba(" + acc + ",0.5)"; cx.beginPath(); cx.arc(pts[r][c][0], pts[r][c][1], 1.4, 0, 6.283); cx.fill(); }
    }
}
// Диспетчер генераторов: ключ proc -> функция отрисовки (неизвестный ключ санитайзер не
// пропустит, но на всякий случай откатываемся на грейн).
var PROC_DRAW = { stars: _procStars, waves: _procWaves, noise: _procNoise, grid: _procGrid, topo: _procTopo, matrix: _procMatrix, cells: _procCells };
function procTexture(idx) {
    var s = SETS[idx]; if (!s || !s.proc) return null;
    var base = isColor(s.base) ? s.base : "#181825", accHex = safeColor(s.accent, DEFAULTS.accent);
    var key = s.proc + "|" + base + "|" + accHex;
    if (Object.prototype.hasOwnProperty.call(_procCache, key)) return _procCache[key];
    var url = null;
    try {
        var W = 480, H = 300, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        var cx = cv.getContext && cv.getContext("2d");
        if (!cx || !cv.toDataURL) { _procCache[key] = null; return null; }
        var g = cx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, base); g.addColorStop(1, shadeHex(base, 0.14));
        cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        var acc = hexToRgbArr(accHex).join(",");
        (PROC_DRAW[s.proc] || _procNoise)(cx, W, H, acc);
        url = cv.toDataURL("image/jpeg", 0.82);
    } catch (e) { url = null; }
    _procCache[key] = url;
    return url;
}
// Запасной градиент проц-набора (когда текстуру не удалось нарисовать): из base и акцента.
function procFallback(idx, zone) {
    var s = SETS[idx], base = (s && isColor(s.base)) ? s.base : "#181825";
    var acc = safeColor(s && s.accent, DEFAULTS.accent), pal = [base, shadeHex(acc, -0.2)];
    if (zone === "sidebar") return "linear-gradient(160deg, " + pal.slice().reverse().join(", ") + ")";
    if (zone === "panel")   return "radial-gradient(120% 120% at 100% 100%, " + pal.join(", ") + ")";
    return "linear-gradient(135deg, " + pal.join(", ") + ")";
}
// ===== Шейдерные наборы =====
// Кадр рисует WebGL-холст (см. src/fx/shader.js) и только в зоне редактора. CSS-фон здесь —
// это, во-первых, подложка для сайдбара/панели (холста там нет), во-вторых, честный запасной
// вариант, если WebGL недоступен или контекст потерян: набор всё равно выглядит как набор.
function shaderBg(idx, zone) { return procFallback(idx, zone); }

// Готовый CSS-фон проц-зоны: текстура (data-URL, cover) или запасной градиент.
function procBg(idx, zone) {
    var url = procTexture(idx);
    return url ? (cssUrl(url) + " center / cover no-repeat") : procFallback(idx, zone);
}
