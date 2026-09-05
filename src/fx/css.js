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
    var st = { ok: true, luma: null, accent: null, palette: null, thumb: null, resolved: false }; // до загрузки: «ок, метрики неизвестны»
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
            // Мини-превью для чипов набора: чип 48×32 не нуждается в полноразмерном JPEG (100–250 КБ),
            // который иначе висел бы фоновым слоем и заново подтягивался на КАЖДОЙ пересборке панели.
            // Рисуем один раз из уже загруженной картинки (второй загрузки нет) в компактный data-URL.
            // Локальный origin (vscode-file) -> canvas не «испорчен»; для сетевых картинок toDataURL
            // может бросить (тогда чип покажет акцентный плейсхолдер) — оборачиваем отдельным try.
            try {
                var tc = document.createElement("canvas"); tc.width = 96; tc.height = 64;
                tc.getContext("2d").drawImage(im, 0, 0, 96, 64);
                st.thumb = tc.toDataURL("image/jpeg", 0.72);
            } catch (e2) { st.thumb = null; }
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
// Готовый CSS-фон проц-зоны: текстура (data-URL, cover) или запасной градиент.
function procBg(idx, zone) {
    var url = procTexture(idx);
    return url ? (cssUrl(url) + " center / cover no-repeat") : procFallback(idx, zone);
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
        if (!probeImage(url).ok) return "rgba(var(--mlbg-accent-rgb),0.14)";
        var fit = (cfg.fit && cfg.fit[fitZone] === "contain") ? "contain" : "cover";
        return cssUrl(url) + " " + position + " / " + fit + " no-repeat";
    }
    // Фон зоны: генеративный набор -> градиент (SETS zone-ключ), иначе картинка (zoneBg).
    // zone — ключ SETS ("editor"|"sidebar"|"panel"); fitZone — ключ cfg.fit ("side" у сайдбара).
    function bgFor(zone, fitZone, position) {
        if (isProc(idx, zone)) return procBg(idx, zone);
        return isGrad(idx, zone) ? gradFor(idx, zone) : zoneBg(zoneUrl(idx, zone), fitZone, position);
    }
    var edUrl = zoneUrl(idx, "editor");
    // «Не фото» редактора: градиент ИЛИ процедурная текстура — у обоих нет измеримой светлоты
    // и своего URL-фото, поэтому авто-дим и трио-акцент из картинки для них выключаются.
    var edIsGrad = isGrad(idx, "editor") || isProc(idx, "editor");
    var BG_ED = bgFor("editor", "editor", "center");
    var BG_SB = bgFor("sidebar", "side", "center bottom");
    var BG_PN = bgFor("panel", "panel", "right bottom");
    // Авто-дим editor по светлоте картинки (если включён): множитель к прозрачности.
    // Для градиента яркость не измерить (нет пикселей) — множитель 1.
    var edDim = (!edIsGrad && cfg.autoDim) ? lumaDimFactor(probeImage(edUrl).luma) : 1;
    // Режим чтения: постоянно и сильно гасим фон редактора (не как flow — тот по печати),
    // чтобы код читался максимально чётко; сайдбар/панель/эффекты не трогаем.
    var readMul = fx.reading ? 0.12 : 1;
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
        "  opacity: " + (op.editor * switchMul * edDim * readMul) + ";", TR, IMGF_ED,
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

    // ЭФФЕКТЫ (таблица). Каждый простой эффект — строка [ключ fx, fn -> массив CSS-строк].
    // fn замыкает все локальные переменные buildCSS (палитра, surfRGB, fxp, BG_/IMGF_-зоны,
    // surfaceLines/blurLines и т.д.), поэтому таблица определена ЗДЕСЬ, после их вычисления.
    // Порядок строк = порядок вывода (важен для каскада), поэтому и порядок записей сохранён
    // как был. Добавить эффект теперь = одна запись в таблице (+ тумблер в FX_LIST/DEFAULTS.fx),
    // а не ещё один if-блок в теле функции. Эффекты, вплетённые в яркость/оверлеи редактора
    // (kenburns, dimOnType/flow, reading, параллакс), остаются выше — они не самостоятельные
    // добавки, а модификаторы уже собранных правил.
    var FX_BLOCKS = [
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
        ["vignette", function () { return [".part.editor .editor-container { box-shadow: inset 0 0 140px 30px rgba(0,0,0," + fxp.vignette + "); }"]; }],
        ["scrim", function () { return [".monaco-editor .view-lines { text-shadow: 0 0 3px rgba(" + scrimRGB + ",0.85); }"]; }],
        ["glassTabs", function () { return [".part.editor > .content .editor-group-container > .title {"]
            .concat(surfaceLines("--vscode-editorGroupHeader-tabsBackground", 0.55))
            .concat([blurLines(fxp.blur), "}"]); }],
        // сайдбар и панель берут СВОИ переменные фона темы (раньше делили одну константу)
        ["glassSide", function () { return [".part.sidebar {"]
            .concat(surfaceLines("--vscode-sideBar-background", 0.60))
            .concat([blurLines(fxp.blur), "}", ".part.panel {"])
            .concat(surfaceLines("--vscode-panel-background", 0.60))
            .concat([blurLines(fxp.blur), "}"]); }],
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
            .concat([blurLines(Math.min(fxp.blur, 8)), "}"]); }],
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
            "  background: " + (edIsGrad ? gradFor(idx, "editor") : (probeImage(edUrl).ok ? cssUrl(edUrl) + " center / contain no-repeat" : "rgba(var(--mlbg-accent-rgb),0.14)")) + "; opacity: " + (0.12 * switchMul * edDim) + ";", TR, IMGF_ED,
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
            .concat([blurLines(Math.min(fxp.blur, 12)), "  border: 1px solid rgba(var(--mlbg-accent-rgb),0.25) !important;", "}"]); }],
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
            .concat([blurLines(Math.min(fxp.blur, 10)), "}"]); }],
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
            "  animation: mlbg-aurora " + fxp.auroraSpeed + "s ease-in-out infinite alternate;",
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
            var spotR = clampNum(fxp.spotRadius, 120, 600, 320);
            return [
                "body::after {",
                "  content: ''; position: fixed; inset: 0; z-index: 9000; pointer-events: none;",
                "  background: radial-gradient(circle " + (spotR + 220) + "px at var(--mlbg-mx,50%) var(--mlbg-my,50%),",
                "    transparent 0, transparent " + spotR + "px, rgba(0,0,0,0.45) 100%);",
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
            var a = clampNum(fxp.tintStrength, 0, 0.6, 0.18);
            return [
                "body::before {",
                "  content:''; position:fixed; inset:0; z-index:8000; pointer-events:none;",
                "  background: var(--mlbg-accent); opacity:" + a + "; mix-blend-mode: overlay;",
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
        ]; }]
    ];
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
        "  .monaco-workbench .part.titlebar, .tabs-container {",
        "    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;",
        "  }",
        "}"
    );
    // Авто-бюджет производительности (улучшение 8): класс body.mlbg-perfsave навешивается
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
    return out.join("\n");
}

// ===== Инъекция стиля =====
// Ревизия: bumpStyle() дёргается при любом изменении, влияющем на CSS (apply/applyFade).
// ensureStyle пересобирает CSS только когда ревизия сдвинулась ИЛИ наш <style> пропал
// (VS Code перестроил DOM). Иначе периодический heal() каждые 3 с — это дешёвая проверка
// getElementById без пересборки ~5 КБ строки.
var STYLE_ID = "moonlight-custom-bg";
var _styleRev = 0, _appliedRev = -1, _buildErrLogged = false;
function bumpStyle() { _styleRev++; }
// Безопасный минимум CSS, если основная сборка упала (обычно из-за сломанной ручной правки
// исходника): только акцент-переменная и стили кнопки BG/фокуса. Кнопка остаётся видимой, а
// панель — открываемой, где есть «Сбросить к дефолту» и диагностика, чтобы восстановиться,
// а не остаться с наглухо сломанным редактором. Сам fallback тоже под try — если и он не
// собрался, отдаём голую переменную акцента.
function safeFallbackCSS() {
    try {
        var ac = safeColor((typeof getAccent === "function" ? getAccent() : null), DEFAULTS.accent);
        return ":root { --mlbg-accent: " + ac + "; --mlbg-accent-rgb: " + accentRGB() + "; }\n" + switcherCSS();
    } catch (e) { return ":root { --mlbg-accent: " + DEFAULTS.accent + "; }"; }
}
function ensureStyle() {
    var el = null;
    try {
        el = document.getElementById(STYLE_ID);
        if (el && el.textContent && _appliedRev === _styleRev) return; // ничего не менялось, стиль на месте
        var css;
        try { css = buildCSS(); }
        catch (buildErr) {
            // Сборка CSS упала — не оставляем редактор без кнопки/панели: ставим безопасный
            // минимум и ОДИН раз громко пишем в консоль (чтобы «копавшийся» увидел причину).
            if (!_buildErrLogged) {
                _buildErrLogged = true;
                try { console.error("[MoonLight custom-bg] Сборка CSS упала — включён безопасный режим (видна только кнопка BG). Проверьте правки в src/ или откройте панель → Система → «Сбросить к дефолту».", buildErr); } catch (e2) {}
            }
            css = safeFallbackCSS();
        }
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
// «Живое» применение БЕЗ записи в localStorage — для непрерывных изменений во время
// перетаскивания слайдера или выбора цвета. Раньше каждый такой кадр звал apply() ->
// saveCfg(), то есть до ~60 синхронных записей в localStorage в секунду (джанк + износ).
// Теперь во время движения только пересобираем CSS/виджеты, а cfg пишем один раз —
// по событию change (отпускание ползунка / фиксация цвета), см. makeSlider/цветовые контролы.
function applyNoSave() { bumpStyle(); ensureStyle(); updateLabel(); syncWidgets(); }
var _applyLiveRaf = 0;
function applyThrottledLive() {
    if (_applyLiveRaf) return;
    _applyLiveRaf = requestAnimationFrame(function () { _applyLiveRaf = 0; applyNoSave(); });
}
// Плавная смена фона: гасим оверлеи зон (switchMul=0), затем в следующем кадре
// возвращаем (switchMul=1). У оверлеев есть transition:opacity, поэтому новый набор
// не «прыгает», а мягко проступает. Только CSS — без saveCfg/подписей; используется
// и сменой набора (applyFade), и предпросмотром при наведении (previewSet/previewEnd).
// switchMul влияет на CSS -> бампим ревизию на каждой фазе, иначе fade-in не пересоберётся.
function fadeSwap() {
    switchMul = 0; bumpStyle(); ensureStyle();
    requestAnimationFrame(function () { switchMul = 1; bumpStyle(); ensureStyle(); });
}
function applyFade() {
    saveCfg(); updateLabel(); syncWidgets();
    fadeSwap();
}
