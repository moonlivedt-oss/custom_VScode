// ===== Частицы и шлейф курсора =====
// Два canvas-слоя поверх интерфейса: летящие частицы (снег, сакура, светлячки, дождь…) и
// тающий след за указателем. Оба останавливаются, когда окно скрыто, уважают системное
// «уменьшить движение» и подчиняются авто-бюджету FPS.

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
    var n = effPartCount(); part.list = [];
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
        // Число берём эффективное (effPartCount) — под эконом-режимом оно ниже, поэтому
        // включение/выключение mlbg-perfsave само пересоздаёт частиц в нужном количестве.
        var st = partStyleNow();
        if (part.list.length !== effPartCount() || part.style !== st) { part.style = st; initParticles(); }
        if (!part.raf && !document.hidden) loopParticles(); // (пере)запуск, если стоим и окно видно
    } else {
        if (part.raf) { cancelAnimationFrame(part.raf); part.raf = 0; }
        if (part.canvas) { part.canvas.remove(); part.canvas = null; part.ctx = null; }
    }
}

// ===== Шлейф курсора (fx.cursorTrail) =====
// Тающий след акцентного цвета за указателем мыши. Точки добавляет обработчик mousemove
// (boot.js -> pushTrail), а луп сам стартует по первой точке и останавливается, когда все
// точки погасли, — CPU тратится только при движении мыши. Уважает reduced-motion (эффект не
// создаётся), эконом-режим (быстрее гаснет) и document.hidden (стоп).
var trail = { canvas: null, ctx: null, raf: 0, pts: [] };
function resizeTrail() { if (trail.canvas) { trail.canvas.width = window.innerWidth; trail.canvas.height = window.innerHeight; } }
function ensureCursorTrail() {
    if (cfg.enabled && cfg.fx.cursorTrail && !reduceMotion()) {
        if (!trail.canvas || !document.body.contains(trail.canvas)) {
            var cv = document.createElement("canvas"); cv.id = "mlbg-cursor-trail";
            cv.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:99990;";
            document.body.appendChild(cv);
            trail.canvas = cv; trail.ctx = cv.getContext("2d"); resizeTrail();
        }
    } else {
        if (trail.raf) { cancelAnimationFrame(trail.raf); trail.raf = 0; }
        if (trail.canvas) { trail.canvas.remove(); trail.canvas = null; trail.ctx = null; trail.pts = []; }
    }
}
function pushTrail(x, y) {
    if (!trail.canvas) return;
    trail.pts.push({ x: x, y: y, t: 1 });
    if (trail.pts.length > 64) trail.pts.shift();
    if (!trail.raf && !document.hidden) trail.raf = requestAnimationFrame(loopTrail);
}
function loopTrail() {
    if (!trail.canvas || !trail.ctx) { trail.raf = 0; return; }
    if (document.hidden) { trail.raf = 0; return; }
    var ctx = trail.ctx, W = trail.canvas.width, H = trail.canvas.height, acc = accentRGB();
    var decay = perf.save ? 0.13 : 0.07, alive = 0, i, p;
    ctx.clearRect(0, 0, W, H);
    for (i = 0; i < trail.pts.length; i++) {
        p = trail.pts[i]; p.t -= decay; if (p.t <= 0) continue; alive++;
        ctx.fillStyle = "rgba(" + acc + "," + (0.5 * p.t).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, 7 * p.t + 1, 0, 6.283); ctx.fill();
    }
    while (trail.pts.length && trail.pts[0].t <= 0) trail.pts.shift();
    trail.raf = alive > 0 ? requestAnimationFrame(loopTrail) : 0;
}
