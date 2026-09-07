// ===== Картинки набора: загрузка, метрики, кэш =====
// Одна проба на URL обслуживает всё сразу: факт загрузки (404 -> зона откатывается на
// акцентную подложку), среднюю яркость (авто-дим), доминирующий акцент и палитру, карту
// яркости 8x8 (адаптивный скрим) и мини-превью для чипов. Результат кэшируется в памяти и в
// localStorage, поэтому следующий запуск рисует фон сразу, не дожидаясь декодирования JPEG.

var _imgState = {};
var _imgListeners = {}; // url -> [cb], вызываются один раз по готовности (или ошибке)

// ===== Карта яркости 8x8 (движок читаемости) =====
// Средняя яркость картинки (st.luma) не отвечает на главный вопрос: «мешает ли фон читать
// код ИМЕННО ЗДЕСЬ». Тёмный кадр с одним ярким окном в углу по среднему выглядит спокойным,
// а код поверх этого окна не читается. Поэтому считаем яркость по сетке 8x8 (WCAG-яркость,
// а не Rec.601: она нужна для расчёта контраста). Дальше по ней работает адаптивный скрим
// (src/fx/readability.js). Данные снимаются с той же ImageData, второй загрузки нет.
function lumaGrid(d, N) {
    var G = 8, cell = N / G, out = [], gx, gy, x, y, i, sum, cnt, v, o;
    for (gy = 0; gy < G; gy++) {
        for (gx = 0; gx < G; gx++) {
            sum = 0; cnt = 0;
            for (y = gy * cell; y < (gy + 1) * cell; y++) {
                for (x = gx * cell; x < (gx + 1) * cell; x++) {
                    i = (y * N + x) * 4;
                    o = 0;
                    v = d[i] / 255;     o += 0.2126 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                    v = d[i + 1] / 255; o += 0.7152 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                    v = d[i + 2] / 255; o += 0.0722 * (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                    sum += o; cnt++;
                }
            }
            out.push(cnt ? Math.round((sum / cnt) * 1000) / 1000 : 0);
        }
    }
    return out;
}

// ===== Кэш метрик картинок в localStorage (мгновенный первый кадр) =====
// Декодировать 200-килобайтный JPEG, посчитать палитру и нарисовать превью — это десятки
// миллисекунд ПОСЛЕ того, как файл дойдёт с диска. На старте это видно: секунда пустого
// редактора, затем вспышка фона и смена акцента. Кэшируем результат (яркость, акцент,
// палитра, карта 8x8 и мини-превью 96x64) по URL: следующий запуск сразу рисует превью
// нужным цветом, а полная картинка тихо подменяет его, когда догрузится.
var IMGC_KEY = "moonlight-bg-imgcache-v1";
var IMGC_MAX = 96;                 // записей: 37 наборов (у фото-наборов по 3 зоны) + библиотека
var IMGC_LIMIT = 1200 * 1024;      // потолок сериализованного кэша, чтобы не пухнуть в localStorage
var _imgCache = null, _imgCacheDirty = false, _imgCacheTimer = 0;
function imgCacheAll() {
    if (_imgCache) return _imgCache;
    _imgCache = {};
    try {
        var raw = localStorage.getItem(IMGC_KEY);
        if (raw && raw.length <= IMGC_LIMIT) {
            var o = JSON.parse(raw);
            if (o && typeof o === "object") _imgCache = o;
        }
    } catch (e) { _imgCache = {}; }
    return _imgCache;
}
function imgCacheGet(url) {
    try {
        var e = imgCacheAll()[url];
        if (!e || typeof e !== "object") return null;
        // Санитизация: кэш лежит в localStorage, его мог подменить кто угодно, а thumb уходит
        // в CSS url(). Пропускаем только ожидаемые типы и только data:image-превью.
        return {
            luma: typeof e.luma === "number" ? e.luma : null,
            accent: isColor(e.accent) ? e.accent : null,
            palette: Object.prototype.toString.call(e.palette) === "[object Array]" ? e.palette.filter(isColor).slice(0, 3) : null,
            grid: (Object.prototype.toString.call(e.grid) === "[object Array]" && e.grid.length === 64) ? e.grid : null,
            thumb: (typeof e.thumb === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.thumb)) ? e.thumb : null
        };
    } catch (e) { return null; }
}
function imgCacheSet(url, st) {
    try {
        var all = imgCacheAll();
        all[url] = { luma: st.luma, accent: st.accent, palette: st.palette, grid: st.grid, thumb: st.thumb, t: Date.now() };
        _imgCacheDirty = true;
        if (_imgCacheTimer) return;
        // Пишем пачкой: на старте метрики приходят по 3-6 картинок подряд, и каждая
        // отдельная запись в localStorage — синхронный I/O в кадре отрисовки.
        _imgCacheTimer = setTimeout(imgCacheFlush, 1500);
    } catch (e) {}
}
function imgCacheFlush() {
    _imgCacheTimer = 0;
    if (!_imgCacheDirty) return;
    _imgCacheDirty = false;
    try {
        var all = imgCacheAll(), keys = Object.keys(all), i;
        if (keys.length > IMGC_MAX) { // вытесняем самые старые записи
            keys.sort(function (a, b) { return (all[a].t || 0) - (all[b].t || 0); });
            for (i = 0; i < keys.length - IMGC_MAX; i++) delete all[keys[i]];
        }
        var s = JSON.stringify(all);
        if (s.length > IMGC_LIMIT) { // не влезли — начинаем кэш заново, чем ронять квоту
            _imgCache = {}; try { localStorage.removeItem(IMGC_KEY); } catch (e2) {}
            return;
        }
        localStorage.setItem(IMGC_KEY, s);
    } catch (e) { try { localStorage.removeItem(IMGC_KEY); } catch (e2) {} }
}
function _fireImg(url, st) {
    var ls = _imgListeners[url]; if (!ls) return;
    _imgListeners[url] = null;
    for (var i = 0; i < ls.length; i++) { try { ls[i](st); } catch (e) {} }
}
function probeImage(url) {
    if (Object.prototype.hasOwnProperty.call(_imgState, url)) return _imgState[url];
    // «Картинки нет» — это не «картинка сломана»: у шейдерных и генеративных наборов зоны
    // рисуются без файла. Отвечаем сразу, ничего не загружая, и помечаем none, чтобы UI
    // (чипы наборов, диагностика) отличал отсутствие картинки от битого пути.
    if (!url) {
        _imgState[url] = { ok: false, none: true, luma: null, accent: null, palette: null, thumb: null, grid: null, resolved: true };
        return _imgState[url];
    }
    var st = { ok: true, luma: null, accent: null, palette: null, thumb: null, grid: null, resolved: false }; // до загрузки: «ок, метрики неизвестны»
    // Кэш метрик прошлых сессий (localStorage): пока полноразмерный JPEG декодируется,
    // зона уже показывает мини-превью (thumb) и красится верным акцентом — без «пустого
    // кадра» и без прыжка цвета на старте. resolved остаётся false: реальная загрузка всё
    // равно идёт и перезапишет метрики (картинку могли подменить на диске).
    var cached = imgCacheGet(url);
    if (cached) {
        st.luma = cached.luma; st.accent = cached.accent;
        st.palette = cached.palette; st.thumb = cached.thumb; st.grid = cached.grid;
    }
    _imgState[url] = st;
    try {
        var im = new Image();
        im.onload = function () {
            st.ok = true;
            try {
                // 32x32: хватает и для палитры (1024 пикселя), и для карты яркости 8x8
                // (каждая ячейка — блок 4x4). Раньше было 16x16 только под средний цвет.
                var N = 32, c = document.createElement("canvas"); c.width = N; c.height = N;
                var cx = c.getContext("2d"); cx.drawImage(im, 0, 0, N, N);
                var d = cx.getImageData(0, 0, N, N).data, sum = 0, n = 0;
                for (var i = 0; i < d.length; i += 4) {
                    sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; // Rec.601, 0..1
                }
                st.luma = n ? sum / n : 1;
                st.accent = dominantAccent(d); // доминирующий цвет -> готовый акцент
                st.palette = dominantPalette(d); // гармоничная палитра (для «Палитры из картинки»)
                st.grid = lumaGrid(d, N);      // карта яркости 8x8 (адаптивный скрим)
            } catch (e) { st.luma = 1; st.accent = null; st.palette = null; st.grid = null; } // canvas «испорчен»/ошибка — не димим
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
            imgCacheSet(url, st); // метрики и мини-превью — в кэш, чтобы следующий старт был мгновенным
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
