// ===== Рантайм-виджеты и авто-переключатели =====
// Виджеты статусбара (часы, помидор, летящие частицы) + авто-смена набора:
// слайдшоу по таймеру (slideTick) и авто-набор по времени суток (timeTick).
function statusRight() { return document.querySelector(".statusbar .right-items") || document.querySelector(".right-items"); }
function pad2(n) { return (n < 10 ? "0" : "") + n; }

function ensureClock() {
    var right = statusRight(); if (!right) return;
    var c = document.getElementById("mlbg-clock");
    if (cfg.fx.clock) {
        if (!c) {
            c = document.createElement("div"); c.id = "mlbg-clock"; c.className = "statusbar-item right"; c.title = "Часы";
            var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; c.appendChild(a);
            right.insertBefore(c, right.firstChild); tickClock();
        }
    } else if (c) { c.remove(); }
}
function tickClock() {
    var c = document.getElementById("mlbg-clock"); if (!c) return;
    var a = c.querySelector("a"); if (!a) return;
    var d = new Date(), days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    a.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "  " + days[d.getDay()] + " " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
}

var pomo = { running: false, remaining: null };
function pomoDur() { return Math.round((cfg.fxp.pomoMin || 25) * 60); }
function ensurePomodoro() {
    var right = statusRight(); if (!right) return;
    var e0 = document.getElementById("mlbg-pomo");
    if (cfg.fx.pomodoro) {
        if (!e0) {
            e0 = document.createElement("div"); e0.id = "mlbg-pomo"; e0.className = "statusbar-item right";
            e0.title = "Помидор: клик — старт/пауза, Alt+клик — сброс";
            var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; e0.appendChild(a);
            e0.addEventListener("click", function (ev) {
                if (ev.altKey) { pomo.running = false; pomo.remaining = pomoDur(); }
                else { if (pomo.remaining == null) pomo.remaining = pomoDur(); pomo.running = !pomo.running; }
                paintPomo();
            });
            right.insertBefore(e0, right.firstChild);
        }
        if (pomo.remaining == null) pomo.remaining = pomoDur();
        paintPomo();
    } else if (e0) { e0.remove(); }
}
function paintPomo() {
    var e0 = document.getElementById("mlbg-pomo"); if (!e0) return;
    var a = e0.querySelector("a"); if (!a) return;
    var r = pomo.remaining != null ? pomo.remaining : pomoDur();
    a.textContent = (pomo.running ? "" : "|| ") + pad2(Math.floor(r / 60)) + ":" + pad2(r % 60);
    e0.style.background = pomo.running ? "rgba(var(--mlbg-accent-rgb),0.22)" : "transparent";
}
function tickPomo() {
    if (!cfg.fx.pomodoro || !pomo.running) return;
    if (pomo.remaining == null) pomo.remaining = pomoDur();
    pomo.remaining--;
    if (pomo.remaining <= 0) { pomo.running = false; pomo.remaining = pomoDur(); pomoDone(); }
    paintPomo();
}
function pomoDone() {
    try {
        var t = document.createElement("div");
        t.textContent = "Помидор готов — перерыв!";
        t.style.cssText = "position:fixed; bottom:42px; right:16px; z-index:100001; background:rgba(var(--mlbg-accent-rgb),0.96); color:#181825; font-weight:700; padding:10px 14px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:var(--vscode-font-family,sans-serif);";
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
    } catch (e) {}
    try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.06;
        o.start(); setTimeout(function () { o.stop(); ctx.close(); }, 260);
    } catch (e) {}
}

var part = { canvas: null, ctx: null, raf: 0, list: [], style: null };
// Кол-во частиц: 0 — легитимное значение («частиц нет»), поэтому НЕ используем
// "partCount || 40" (0 — falsy и молча превращался бы в 40). Откат к 40 только
// если значение вообще не число (сломанный конфиг).
function partCount() {
    var n = cfg.fxp.partCount;
    return typeof n === "number" && isFinite(n) ? Math.round(n) : 40;
}
function resizeParticles() { if (part.canvas) { part.canvas.width = window.innerWidth; part.canvas.height = window.innerHeight; } }
// Сезонный авто-стиль: если выбран "seasonal", форма подбирается по месяцу — зима (дек/янв/фев)
// снег, весна (мар/апр/май) сакура, лето (июн/июл/авг) светлячки, осень (сен/окт/ноя) дождь.
// Возвращает ВСЕГДА конкретный стиль из белого списка (никогда "seasonal"), поэтому вся
// отрисовка (partFalls/loopParticles) работает с ним как с обычным стилем.
function seasonStyle() {
    var m; try { m = new Date().getMonth(); } catch (e) { m = 0; } // 0..11
    if (m === 11 || m === 0 || m === 1) return "snow";
    if (m >= 2 && m <= 4) return "sakura";
    if (m >= 5 && m <= 7) return "firefly";
    return "rain"; // 8..10 — осень
}
// Стиль частиц (санитизированный). "seasonal" разворачивается в сезонный стиль. Падают
// сверху вниз: снег, сакура, дождь, конфетти; остальные (точки, звёзды, пузыри, светлячки)
// всплывают снизу вверх.
function partStyleNow() {
    var s = safePartStyle(cfg.partStyle);
    return s === "seasonal" ? seasonStyle() : s;
}
function partFalls() {
    var s = partStyleNow();
    return s === "snow" || s === "sakura" || s === "rain" || s === "confetti";
}
// Задать/сбросить поля частицы НА МЕСТЕ (без аллокации нового объекта). Раньше уход за
// край делал part.list[i] = newPart(...) — по объекту на каждую переработку, то есть
// заметный мусор для GC при большом числе частиц. Теперь при рождении и при переработке
// зовём resetPart(p) и переиспользуем ту же ячейку. anyY=true — стартовая раскладка по
// всему экрану (первый кадр), иначе рождение у края по направлению стиля.
function resetPart(p, anyY) {
    var W = window.innerWidth, H = window.innerHeight, fall = partFalls();
    // ac — «частица акцентного цвета?». Сам цвет НЕ вшиваем в частицу: он берётся при
    // отрисовке (см. loopParticles), поэтому смена акцента перекрашивает уже летящие
    // частицы вживую. y-старт: падающие рождаются над верхом, всплывающие — под низом.
    p.x = Math.random() * W;
    p.y = anyY ? Math.random() * H : (fall ? -8 : H + 8);
    var big = fall ? 1.4 : 1;                  // падающие крупнее и заметнее
    p.r = (0.6 + Math.random() * 1.8) * big;
    p.sp = 0.12 + Math.random() * 0.45;
    p.dr = (Math.random() - 0.5) * 0.3;
    p.a = 0.15 + Math.random() * 0.45;
    p.ac = Math.random() < 0.5;
    p.rot = Math.random() * 6.283;             // фаза поворота (звёзды/сакура/конфетти) и пульса (светлячки)
    p.rs = (Math.random() - 0.5) * 0.05;       // скорость поворота
    p.ci = (Math.random() * 3) | 0;            // индекс цвета в палитре (конфетти: 0..2)
    return p;
}
function newPart(anyY) { return resetPart({}, anyY); }
function initParticles() {
    var n = partCount(); part.list = [];
    for (var i = 0; i < n; i++) part.list.push(newPart(true));
}
// системная настройка «уменьшить движение» — гасим частицы (и CSS-анимации, см. css.js)
function reduceMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
}
// Круглые/точечные стили (dots, snow, firefly, bubbles) — рисуем в АБСОЛЮТНЫХ координатах
// (cx, cy), без ctx.save/translate/rotate: поворот у круга не виден, а save/restore на каждую
// частицу каждый кадр — заметный оверхед при большом числе частиц. col — "r,g,b".
function drawRound(ctx, style, cx, cy, r, col, a) {
    ctx.fillStyle = "rgba(" + col + "," + a + ")";
    if (style === "bubbles") {
        // Пузырь: контур + лёгкий блик.
        ctx.strokeStyle = "rgba(" + col + "," + a + ")";
        ctx.lineWidth = Math.max(0.6, r * 0.35);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, 6.283); ctx.fill();
    } else {
        // dots / snow / firefly: сплошной кружок (яркость/цвет заданы выше).
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
    }
}
// Фигурные стили (stars, sakura, confetti) — центрируются на (0,0) ПОСЛЕ translate/rotate
// в loopParticles, поэтому здесь координаты локальные (радиус r).
function drawShaped(ctx, style, r, col, a) {
    ctx.fillStyle = "rgba(" + col + "," + a + ")";
    if (style === "stars") {
        // Искра-звёздочка: четырёхлучевая, лучи вытянуты по осям (тонкие ромбы).
        var L = r * 2.4, w = r * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -L); ctx.lineTo(w, 0); ctx.lineTo(0, L); ctx.lineTo(-w, 0); ctx.closePath();
        ctx.moveTo(-L, 0); ctx.lineTo(0, w); ctx.lineTo(L, 0); ctx.lineTo(0, -w); ctx.closePath();
        ctx.fill();
    } else if (style === "sakura") {
        // Лепесток: вытянутый эллипс — простой мазок-лепесток.
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(0, 0, r * 0.8, r * 1.6, 0, 0, 6.283);
        else ctx.arc(0, 0, r, 0, 6.283);
        ctx.fill();
    } else if (style === "confetti") {
        // Конфетти: маленький прямоугольник (вращается через p.rot -> живой «переворот»).
        var cw = r * 1.9, ch = r * 0.85;
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    }
}
// Струя дождя: линия вдоль локальной оси Y (после поворота по вектору скорости в loopParticles).
function drawStreak(ctx, r, col, a) {
    ctx.strokeStyle = "rgba(" + col + "," + a + ")";
    ctx.lineWidth = Math.max(0.8, r * 0.7);
    if ("lineCap" in ctx) ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 6); ctx.stroke();
}
function loopParticles() {
    if (!part.canvas || !part.ctx) { part.raf = 0; return; }
    if (document.hidden) { part.raf = 0; return; } // окно скрыто/свёрнуто — стоп до возврата (экономия CPU/батареи)
    var ctx = part.ctx, W = part.canvas.width, H = part.canvas.height, i, p;
    var acc = accentRGB(); // считаем акцент один раз за кадр, а не на каждую частицу
    var style = partStyleNow(), fall = partFalls();
    // Конфетти многоцветное: палитра из трио (акцент + два спутника, повороты оттенка) —
    // считаем «r,g,b»-строки один раз за кадр, частица берёт свой цвет по p.ci.
    var confPal = null;
    if (style === "confetti") {
        var acHex = safeColor(getAccent(), DEFAULTS.accent);
        confPal = [acc, hexToRgbArr(rotateHue(acHex, 0.33)).join(","), hexToRgbArr(rotateHue(acHex, -0.33)).join(",")];
    }
    var round = (style === "dots" || style === "snow" || style === "firefly" || style === "bubbles");
    ctx.clearRect(0, 0, W, H);
    for (i = 0; i < part.list.length; i++) {
        p = part.list[i];
        if (fall) { p.y += p.sp; p.x += p.dr; if (p.y > H + 12) { resetPart(p, false); continue; } }
        else { p.y -= p.sp; p.x += p.dr; if (p.y < -12) { resetPart(p, false); continue; } }
        p.rot += p.rs;
        // Цвет и яркость по стилю. Светлячки пульсируют прозрачностью через фазу p.rot.
        var col, a = p.a;
        if (style === "snow") col = "235,235,255";
        else if (style === "sakura") col = acc;
        else if (style === "confetti") col = confPal[p.ci % 3];
        else if (style === "firefly") { col = acc; a = p.a * (0.35 + 0.65 * Math.abs(Math.sin(p.rot * 6))); }
        else col = p.ac ? acc : "255,255,255";
        if (round) {
            drawRound(ctx, style, p.x, p.y, p.r, col, a);
        } else if (style === "rain") {
            // Поворот струи по вектору скорости (dr, sp): локальная +Y на угол движения.
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.sp, p.dr) - Math.PI / 2);
            drawStreak(ctx, p.r, col, a); ctx.restore();
        } else {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            drawShaped(ctx, style, p.r, col, a); ctx.restore();
        }
    }
    part.raf = requestAnimationFrame(loopParticles);
}
function ensureParticles() {
    // Частиц нет, если эффект выключен, включён режим «уменьшить движение» ИЛИ
    // счётчик = 0. В последнем случае раньше висел пустой canvas с работающим rAF
    // (loopParticles каждый кадр чистил пустой холст) — теперь холст убирается.
    if (cfg.enabled && cfg.fx.particles && !reduceMotion() && partCount() > 0) {
        if (!part.canvas || !document.body.contains(part.canvas)) {
            var cv = document.createElement("canvas"); cv.id = "mlbg-particles";
            cv.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:5; opacity:0.5;";
            document.body.appendChild(cv);
            part.canvas = cv; part.ctx = cv.getContext("2d");
            resizeParticles(); initParticles();
        }
        // Пересоздаём набор при смене числа ИЛИ стиля частиц (у падающих стилей другое
        // направление и стартовые координаты — иначе снег «полетел бы» снизу вверх).
        var st = partStyleNow();
        if (part.list.length !== partCount() || part.style !== st) { part.style = st; initParticles(); }
        if (!part.raf && !document.hidden) loopParticles(); // (пере)запуск, если стоим и окно видно
    } else {
        if (part.raf) { cancelAnimationFrame(part.raf); part.raf = 0; }
        if (part.canvas) { part.canvas.remove(); part.canvas = null; part.ctx = null; }
    }
}

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
// ===== Авто-набор по времени суток =====
// Днём (8:00–20:00) — cfg.autoTime.day, ночью — cfg.autoTime.night. Переиспользует
// applyFade (как слайдшоу). Не трогает режим «случайно». Проверяется каждую секунду,
// но переключает только при реальной смене нужного набора (idempotent).
function isDaytime() {
    var h = new Date().getHours(), at = cfg.autoTime || {};
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
    cfg.mode = ws; applyFade();
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
    applyFade();
    preloadNext();                                          // подготовить следующий заранее
    if (document.getElementById(PANEL_ID)) refreshPanel(); // подсветить активный чип в открытой панели
}

function syncWidgets() {
    try { ensureClock(); } catch (e) {}
    try { ensurePomodoro(); } catch (e) {}
    try { ensureParticles(); } catch (e) {}
}
