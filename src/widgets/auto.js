// ===== Автоматическая смена фона =====
// Набор может меняться сам: по таймеру слайд-шоу, по времени суток (в том числе по реальному
// рассвету/закату для заданных координат) и по кругу личной библиотеки картинок. Сюда же
// относится витрина — крупные часы поверх редактора после простоя.

// ===== Слайдшоу: авто-смена набора по таймеру =====
var slide = { last: Date.now() };
function slideReset() { slide.last = Date.now(); preloadNext(); } // отсчёт с нуля при вкл/смене интервала
// Предзагрузка картинок СЛЕДУЮЩЕГО по кругу набора: браузер держит их в кэше, поэтому
// при смене fade-in показывает готовую картинку без «моргания». Кэш урлов — чтобы не
// плодить Image() каждый раз. В режиме «случайно» следующий индекс неизвестен заранее,
// поэтому предгружаем все наборы по одному разу (их немного).
var _preloaded = {};
function preloadOne(url) {
    if (!url || _preloaded[url]) return; _preloaded[url] = true;
    try { var im = new Image(); im.src = url; } catch (e) {}
}
function preloadNext() {
    if (!cfg.slideshow || !cfg.slideshow.on || SETS.length < 2) return;
    // индексы наборов для предзагрузки (учитывают cfg.setImg через zoneUrl)
    var idxs = cfg.mode === "random"
        ? SETS.map(function (_s, i) { return i; })
        : [(activeIndex() + 1) % SETS.length];
    idxs.forEach(function (i) { preloadOne(zoneUrl(i, "editor")); preloadOne(zoneUrl(i, "sidebar")); preloadOne(zoneUrl(i, "panel")); });
}

// ===== Библиотека картинок (своя папка / список) =====
// Пользователь ведёт личный список локальных картинок (cfg.library); компаньон-расширение
// может дополнить его содержимым папки через глобал window.__MLBG_LIBRARY__ (массив путей).
// Когда «Крутить библиотеку» включено, картинки из библиотеки показываются в зоне редактора
// и сменяются по таймеру слайдшоу (libraryTick), а buildCSS берёт текущую через libraryEditorUrl.
var libSlide = { last: Date.now() }, sessionLibIndex = 0;
function libraryAll() {
    var arr = Array.isArray(cfg.library) ? cfg.library.slice() : [];
    try { var g = window.__MLBG_LIBRARY__; if (Array.isArray(g)) for (var i = 0; i < g.length; i++) if (typeof g[i] === "string") arr.push(g[i]); } catch (e) {}
    return arr.filter(function (u) { return typeof u === "string" && u && imgAllowed(u); }); // только локальные/согласованные
}
function libraryActive() { return !!(cfg.enabled && cfg.librarySlideshow && libraryAll().length); }
function libraryEditorUrl() {
    var all = libraryAll(); if (!all.length) return null;
    var i = ((sessionLibIndex % all.length) + all.length) % all.length;
    return imgUrl(all[i]);
}
function libraryReset() { libSlide.last = Date.now(); }
function libraryTick() {
    if (!libraryActive() || libraryAll().length < 2) { libSlide.last = Date.now(); return; }
    var period = Math.max(1, cfg.slideshow.min) * 60000;
    if (Date.now() - libSlide.last < period) return;
    libSlide.last = Date.now();
    sessionLibIndex++;
    // Смена картинки библиотеки — не шаг истории Undo (как тик слайдшоу).
    _histSuppress++; try { applyFade(); } finally { _histSuppress--; }
}

// ===== Скринсейвер / витрина при простое (cfg.screensaver) =====
// После N минут без ввода показываем полноэкранную «витрину»: крупные часы, дата и имя
// активного набора на тёмном акцентном фоне. Любое действие (движение мыши/клик/клавиша)
// её убирает (см. boot.js: activity-слушатели + гашение первой клавиши, чтобы она не попала
// в редактор). Простой считаем от saver.lastAct (обновляет screensaverBump). Учитывает
// reduced-motion (без плавного проявления) и document.hidden (не показываем в фоне).
var saver = { el: null, active: false, lastAct: Date.now(), _clock: null, _date: null, _setn: null };
function screensaverBump() { saver.lastAct = Date.now(); if (saver.active) screensaverHide(); }
function screensaverHide() { if (!saver.active) return; saver.active = false; if (saver.el && saver.el.remove) saver.el.remove(); saver.el = null; }
function screensaverShow() {
    if (saver.active) return; saver.active = true;
    var reduce = reduceMotion();
    var wrap = el("div", "position:fixed; inset:0; z-index:100050; pointer-events:auto; cursor:none;" +
        "display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;" +
        "background:radial-gradient(60% 60% at 50% 45%, rgba(var(--mlbg-accent-rgb),0.12), rgba(10,10,16,0.96) 70%), #0a0a10;" +
        "font-family:var(--vscode-font-family,sans-serif); color:#e8e8f0;" + (reduce ? "" : " transition:opacity 0.6s ease; opacity:0;"));
    wrap.id = "mlbg-screensaver";
    var clock = el("div", "font-size:13vw; font-weight:800; letter-spacing:2px; color:var(--mlbg-accent); text-shadow:0 4px 40px rgba(var(--mlbg-accent-rgb),0.4);", "");
    var date = el("div", "font-size:2.2vw; color:#c8c8d8; opacity:0.85;", "");
    var setn = el("div", "font-size:1.3vw; color:#8b93ad; letter-spacing:1px;", "");
    var hint = el("div", "position:fixed; bottom:24px; font-size:12px; color:#6c7086;", t("Любое действие — вернуться"));
    wrap.appendChild(clock); wrap.appendChild(date); wrap.appendChild(setn); wrap.appendChild(hint);
    ["mousedown", "mousemove", "wheel"].forEach(function (ev) { wrap.addEventListener(ev, screensaverHide); });
    document.body.appendChild(wrap);
    saver.el = wrap; saver._clock = clock; saver._date = date; saver._setn = setn;
    paintSaverClock();
    if (!reduce) requestAnimationFrame(function () { try { wrap.style.opacity = "1"; } catch (e) {} });
}
function paintSaverClock() {
    if (!saver.el || !saver._clock) return;
    var d = new Date();
    var days = uiLang() === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
    saver._clock.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    saver._date.textContent = days[d.getDay()] + ", " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
    try { var i = activeIndex(), nm = setName(i); saver._setn.textContent = nm ? (t("Набор ") + i + " · " + nm) : ""; } catch (e) {}
}
function screensaverTick() {
    if (!cfg.enabled || !cfg.screensaver || !cfg.screensaver.on || document.hidden) { if (saver.active) screensaverHide(); return; }
    var period = Math.max(1, cfg.screensaver.min) * 60000;
    if (!saver.active) { if (Date.now() - saver.lastAct >= period) screensaverShow(); }
    else paintSaverClock();
}
// Мгновенно убрать витрину, если её выключили в панели (тик показал бы это лишь через секунду).
function screensaverSync() { if ((!cfg.enabled || !cfg.screensaver || !cfg.screensaver.on) && saver.active) screensaverHide(); }

// ===== Авто-набор по времени суток =====
// Днём (8:00–20:00) — cfg.autoTime.day, ночью — cfg.autoTime.night. Переиспользует
// applyFade (как слайдшоу). Не трогает режим «случайно». Проверяется каждую секунду,
// но переключает только при реальной смене нужного набора (idempotent).
// Рассвет/закат для координат (локальные дробные часы), без сети — стандартная аппроксимация
// «Sunrise equation» (склонение Солнца + часовой угол при зените 90.833°). Возвращает
// { rise, set } в часах местного времени или null (полярный день/ночь либо ошибка -> откат на
// фиксированные часы). Локальное время получаем из UT со сдвигом getTimezoneOffset().
function sunTimes(lat, lon, date) {
    try {
        var rad = Math.PI / 180, deg = 180 / Math.PI;
        var start = new Date(date.getFullYear(), 0, 0);
        var day = Math.floor((date - start) / 86400000); // день года (1..366)
        var lngHour = lon / 15, off = -date.getTimezoneOffset() / 60;
        function calc(isRise) {
            var tt = day + ((isRise ? 6 : 18) - lngHour) / 24;
            var M = 0.9856 * tt - 3.289;
            var L = (M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634 + 360) % 360;
            var RA = (deg * Math.atan(0.91764 * Math.tan(L * rad)) + 360) % 360;
            RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90); RA /= 15;
            var sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
            var cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
            if (cosH > 1 || cosH < -1) return null; // полярная ночь (>1) / полярный день (<-1)
            var H = (isRise ? 360 - deg * Math.acos(cosH) : deg * Math.acos(cosH)) / 15;
            var T = H + RA - 0.06571 * tt - 6.622;
            var UT = ((T - lngHour) % 24 + 24) % 24;
            var local = (UT + off) % 24; if (local < 0) local += 24;
            return local;
        }
        var r = calc(true), s = calc(false);
        return (r === null || s === null) ? null : { rise: r, set: s };
    } catch (e) { return null; }
}
function isDaytime() {
    var at = cfg.autoTime || {}, now = new Date();
    // Режим «рассвет/закат»: сравниваем текущий момент с вычисленными восходом/закатом.
    if (at.mode === "sun") {
        var st = sunTimes(typeof at.lat === "number" ? at.lat : 0, typeof at.lon === "number" ? at.lon : 0, now);
        if (st) {
            var hf = now.getHours() + now.getMinutes() / 60;
            if (st.rise === st.set) return true;
            return st.set > st.rise ? (hf >= st.rise && hf < st.set) : (hf >= st.rise || hf < st.set);
        }
        // полярный день/ночь или сбой -> тихий откат на фиксированные часы ниже
    }
    var h = now.getHours();
    var f = (typeof at.from === "number") ? at.from : 8;
    var t = (typeof at.to === "number") ? at.to : 20;
    if (f === t) return true;                       // границы совпали — считаем всегда день
    return t > f ? (h >= f && h < t) : (h >= f || h < t); // t < f — интервал «через полночь»
}
function timeTick() {
    if (!cfg.autoTime || !cfg.autoTime.on || SETS.length < 1) return;
    if (cfg.mode === "random") return; // ручной «случайно» не перебиваем
    var want = isDaytime() ? cfg.autoTime.day : cfg.autoTime.night;
    if (typeof want !== "number" || want < 0 || want >= SETS.length) return;
    var ws = String(want);
    if (cfg.mode === ws) return; // уже нужный набор
    // Авто-смена по времени — не шаг истории Undo (сдвигаем базу через _histSuppress).
    cfg.mode = ws; _histSuppress++; try { applyFade(); } finally { _histSuppress--; }
    if (document.getElementById(PANEL_ID)) refreshPanel();
}

function slideTick() {
    // Авто-набор по времени имеет приоритет над слайдшоу: чтобы они не «дрались»
    // за cfg.mode, при включённом autoTime слайдшоу простаивает.
    if (cfg.autoTime && cfg.autoTime.on) { slide.last = Date.now(); return; }
    if (!cfg.slideshow || !cfg.slideshow.on || SETS.length < 2) { slide.last = Date.now(); return; }
    var period = Math.max(1, cfg.slideshow.min) * 60000;
    if (Date.now() - slide.last < period) return;
    slide.last = Date.now();
    // Не терять режим «случайно»: в нём двигаем сессионный индекс (pickRandom избегает
    // повтора), а не превращаем mode в фиксированный. Иначе слайдшоу молча гасило random.
    if (cfg.mode === "random") sessionRandomIndex = pickRandom();
    else cfg.mode = String((activeIndex() + 1) % SETS.length); // следующий набор по кругу
    // Тик слайдшоу — не шаг истории Undo (сдвигаем базу через _histSuppress).
    _histSuppress++; try { applyFade(); } finally { _histSuppress--; }
    preloadNext();                                          // подготовить следующий заранее
    if (document.getElementById(PANEL_ID)) refreshPanel(); // подсветить активный чип в открытой панели
}
