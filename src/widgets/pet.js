// ===== Питомец-компаньон =====
// Процедурный кот в углу над статусбаром: ноль ассетов, всё рисуется на canvas. Моргает,
// водит хвостом, оживляется при печати и настораживается, когда в коде появляются ошибки.

// ===== Питомец-компаньон (fx.pet) =====
// Небольшой канвас-маскот (кот) в правом нижнем углу над статусбаром, нарисованный процедурно
// акцентным цветом (ноль ассетов). Состояния (petMood): «покой» (моргает, лениво водит хвостом),
// «печатаешь» (уши торчком, хвост быстрее — данные о печати шлёт boot.js в petState.typedAt),
// «ошибки» (насторожен, «!» — счётчик ошибок кладёт heal в petState.errors). Уважает
// reduced-motion (сидит неподвижно — один кадр без лупа), эконом-режим (кадры реже) и
// document.hidden (стоп). ~24 к/с — маскоту не нужен полный rAF.
var petState = { typedAt: 0, errors: 0 };
var pet = { canvas: null, ctx: null, raf: 0, t: 0, blink: 0, nextBlink: 70, last: 0, twitch: 0, nextTwitch: 120,
            accHex: "", colBody: "205,214,244", colDark: "120,120,150", colLite: "230,230,250" };
var PET_W = 72, PET_H = 64;
// Кэш цветов маскота: «r,g,b»-строки (тело / тёмный для ушей-лап / светлый для мордочки-животика)
// пересчитываем, только когда акцент сменился, а не на каждом кадре лупа — мелкая честная экономия.
function petColors() {
    var acc = safeColor(getAccent(), DEFAULTS.accent);
    if (pet.accHex !== acc) {
        pet.accHex = acc;
        pet.colBody = hexToRgbArr(acc).join(",");
        pet.colDark = hexToRgbArr(shadeHex(acc, -0.45)).join(",");
        pet.colLite = hexToRgbArr(shadeHex(acc, 0.40)).join(",");
    }
}
function ensurePet() {
    if (cfg.enabled && cfg.fx.pet) {
        if (!pet.canvas || !document.body.contains(pet.canvas)) {
            var cv = document.createElement("canvas"); cv.id = "mlbg-pet"; cv.width = PET_W; cv.height = PET_H;
            cv.style.cssText = "position:fixed; right:12px; bottom:26px; width:" + PET_W + "px; height:" + PET_H + "px; pointer-events:none; z-index:99991;";
            cv.setAttribute("aria-hidden", "true");
            document.body.appendChild(cv);
            pet.canvas = cv; pet.ctx = cv.getContext("2d");
        }
        if (reduceMotion()) { if (pet.raf) { cancelAnimationFrame(pet.raf); pet.raf = 0; } drawPet(0); } // статичный кадр
        else if (!pet.raf && !document.hidden) { pet.last = 0; pet.raf = requestAnimationFrame(loopPet); }
    } else {
        if (pet.raf) { cancelAnimationFrame(pet.raf); pet.raf = 0; }
        if (pet.canvas) { pet.canvas.remove(); pet.canvas = null; pet.ctx = null; }
    }
}
function petMood() {
    if (petState.errors > 0) return "alert";
    if (Date.now() - petState.typedAt < 1200) return "type";
    // Дремлет после минуты без активности (мышь/клавиши/колесо обновляют saver.lastAct).
    var la = 0; try { if (typeof saver !== "undefined" && saver.lastAct) la = saver.lastAct; } catch (e) {}
    if (la && Date.now() - la > 60000) return "sleep";
    return "idle";
}
function loopPet(ts) {
    if (!pet.canvas || !pet.ctx) { pet.raf = 0; return; }
    if (document.hidden || reduceMotion()) { pet.raf = 0; return; }
    var mood = petMood();
    // Кадры по настроению (оптимизация): печать — живее (~25 к/с), покой — реже (~15), сон —
    // совсем редко (~7); в эконом-режиме реже всего. Меньше перерисовок в простое = меньше CPU.
    var minDt = perf.save ? 130 : (mood === "type" ? 40 : mood === "sleep" ? 150 : 66);
    if (!pet.last || ts - pet.last >= minDt) {
        pet.last = ts; pet.t++;
        if (--pet.nextBlink <= 0) { pet.blink = 4; pet.nextBlink = 80 + Math.floor(Math.random() * 130); }
        if (pet.blink > 0) pet.blink--;
        if (--pet.nextTwitch <= 0) { pet.twitch = 6; pet.nextTwitch = 150 + Math.floor(Math.random() * 260); } // редкое подёргивание уха
        if (pet.twitch > 0) pet.twitch--;
        drawPet(pet.t);
    }
    pet.raf = requestAnimationFrame(loopPet);
}
function drawPet(t) {
    var ctx = pet.ctx; if (!ctx) return;
    petColors();
    var W = PET_W, H = PET_H;
    var body = "rgba(" + pet.colBody + ",", dark = "rgba(" + pet.colDark + ",", lite = "rgba(" + pet.colLite + ",", ink = "rgba(24,24,37,";
    var mood = petMood();
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, baseY = H - 5;
    var bob = mood === "sleep" ? Math.sin(t * 0.06) * 0.7 : mood === "type" ? Math.sin(t * 0.5) * 1.3 : Math.sin(t * 0.11) * 0.6;
    var hy = baseY - 30 + bob, eyeY = hy - 1;

    // Взгляд к курсору: лёгкое смещение зрачков к указателю. Экранную позицию питомца считаем
    // из фиксированных отступов + размера окна — БЕЗ getBoundingClientRect (не дёргаем layout).
    var lookX = 0, lookY = 0;
    if (mood !== "sleep" && typeof _lastMouse !== "undefined" && _lastMouse) {
        var eScrX = (window.innerWidth || 800) - 12 - W + cx;
        var eScrY = (window.innerHeight || 600) - 26 - H + eyeY;
        lookX = Math.max(-1.2, Math.min(1.2, (_lastMouse.x - eScrX) / 55));
        lookY = Math.max(-1.0, Math.min(1.1, (_lastMouse.y - eScrY) / 70));
    }

    // ── Хвост: покачивается (быстрее при печати), распушён при тревоге, обёрнут вокруг лап во сне ──
    var tailSpeed = mood === "type" ? 0.45 : mood === "alert" ? 0.6 : mood === "sleep" ? 0.05 : 0.13;
    var tailA = Math.sin(t * tailSpeed);
    ctx.strokeStyle = body + "0.95)"; ctx.lineWidth = mood === "alert" ? 6 : 4.5;
    if ("lineCap" in ctx) ctx.lineCap = "round"; if ("lineJoin" in ctx) ctx.lineJoin = "round";
    ctx.beginPath();
    if (mood === "sleep") {
        ctx.moveTo(cx + 13, baseY - 3 + bob);
        ctx.quadraticCurveTo(cx + 19, baseY + 3 + bob, cx, baseY + 2 + bob);
        ctx.quadraticCurveTo(cx - 17, baseY + 1 + bob, cx - 14, baseY - 5 + bob);
    } else {
        ctx.moveTo(cx + 13, baseY - 4 + bob);
        ctx.quadraticCurveTo(cx + 30 + tailA * 4, baseY - 12 + bob, cx + 26 + tailA * 9, baseY - 30 + bob - Math.abs(tailA) * 4);
    }
    ctx.stroke();

    // ── Тело (сидящий силуэт) + светлый животик + передние лапки ──
    ctx.fillStyle = body + "0.95)";
    ctx.beginPath();
    ctx.moveTo(cx - 16, baseY + bob);
    ctx.quadraticCurveTo(cx - 19, baseY - 26 + bob, cx, baseY - 27 + bob);
    ctx.quadraticCurveTo(cx + 19, baseY - 26 + bob, cx + 16, baseY + bob);
    ctx.closePath(); ctx.fill();
    if (ctx.ellipse) {
        ctx.fillStyle = lite + "0.5)";
        ctx.beginPath(); ctx.ellipse(cx, baseY - 9 + bob, 7.5, 12, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = body + "0.97)";
        ctx.beginPath(); ctx.ellipse(cx - 7, baseY - 1 + bob, 5, 4, 0, 0, 6.283); ctx.ellipse(cx + 7, baseY - 1 + bob, 5, 4, 0, 0, 6.283); ctx.fill();
    }
    ctx.strokeStyle = dark + "0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, baseY - 3 + bob); ctx.lineTo(cx, baseY + 1 + bob); ctx.stroke();

    // ── Уши: внешние (акцент) + внутренние (тёмные); торчком при печати, назад при тревоге, редкий твич ──
    var earUp = (mood === "type") ? -3 : (mood === "alert") ? 2 : (mood === "sleep") ? 3 : 0;
    var tw = (mood === "idle" && pet.twitch > 0) ? 2 : 0;
    ctx.fillStyle = body + "0.97)";
    ctx.beginPath();
    ctx.moveTo(cx - 12, hy - 6); ctx.lineTo(cx - 8, hy - 17 + earUp - tw); ctx.lineTo(cx - 2, hy - 8); ctx.closePath();
    ctx.moveTo(cx + 12, hy - 6); ctx.lineTo(cx + 8, hy - 17 + earUp); ctx.lineTo(cx + 2, hy - 8); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark + "0.6)";
    ctx.beginPath();
    ctx.moveTo(cx - 10, hy - 8); ctx.lineTo(cx - 8, hy - 14 + earUp - tw); ctx.lineTo(cx - 5, hy - 8); ctx.closePath();
    ctx.moveTo(cx + 10, hy - 8); ctx.lineTo(cx + 8, hy - 14 + earUp); ctx.lineTo(cx + 5, hy - 8); ctx.closePath();
    ctx.fill();

    // ── Голова + светлая мордочка ──
    ctx.fillStyle = body + "0.97)";
    ctx.beginPath(); ctx.arc(cx, hy, 13, 0, 6.283); ctx.fill();
    ctx.fillStyle = lite + "0.55)";
    ctx.beginPath(); ctx.arc(cx, hy + 4, 8, 0, 6.283); ctx.fill();

    // ── Глаза: закрыты (моргание/сон) дугами-улыбкой, иначе белок + акцентная радужка + зрачок + блик ──
    if (pet.blink > 0 || mood === "sleep") {
        ctx.strokeStyle = ink + "0.85)"; ctx.lineWidth = 1.6; if ("lineCap" in ctx) ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx - 5, eyeY + 1, 3, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.arc(cx + 5, eyeY + 1, 3, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
    } else {
        var er = (mood === "alert") ? 3.3 : 2.9;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath(); ctx.arc(cx - 5, eyeY, er, 0, 6.283); ctx.arc(cx + 5, eyeY, er, 0, 6.283); ctx.fill();
        ctx.fillStyle = body + "0.85)"; // радужка акцентом
        ctx.beginPath(); ctx.arc(cx - 5 + lookX, eyeY + lookY, er - 0.9, 0, 6.283); ctx.arc(cx + 5 + lookX, eyeY + lookY, er - 0.9, 0, 6.283); ctx.fill();
        ctx.fillStyle = ink + "0.92)";
        var prad = (mood === "type") ? 1.3 : 1.7;
        ctx.beginPath(); ctx.arc(cx - 5 + lookX, eyeY + lookY, prad, 0, 6.283); ctx.arc(cx + 5 + lookX, eyeY + lookY, prad, 0, 6.283); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath(); ctx.arc(cx - 6 + lookX, eyeY - 1 + lookY, 0.7, 0, 6.283); ctx.arc(cx + 4 + lookX, eyeY - 1 + lookY, 0.7, 0, 6.283); ctx.fill();
    }

    // ── Нос + ротик + усы ──
    var noseY = hy + 4;
    ctx.fillStyle = "rgba(245,160,181,0.95)";
    ctx.beginPath(); ctx.moveTo(cx - 2, noseY); ctx.lineTo(cx + 2, noseY); ctx.lineTo(cx, noseY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink + "0.5)"; ctx.lineWidth = 1; if ("lineCap" in ctx) ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, noseY + 2); ctx.lineTo(cx, noseY + 3.5);
    ctx.arc(cx - 2, noseY + 3.5, 2, 0, Math.PI); ctx.moveTo(cx, noseY + 3.5); ctx.arc(cx + 2, noseY + 3.5, 2, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = body + "0.45)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, noseY); ctx.lineTo(cx - 13, noseY - 1);
    ctx.moveTo(cx - 4, noseY + 1.5); ctx.lineTo(cx - 13, noseY + 3);
    ctx.moveTo(cx + 4, noseY); ctx.lineTo(cx + 13, noseY - 1);
    ctx.moveTo(cx + 4, noseY + 1.5); ctx.lineTo(cx + 13, noseY + 3);
    ctx.stroke();

    // ── Экстра по настроению: «!» при тревоге, всплывающие «z» во сне, искорка радости при печати ──
    if (mood === "alert") {
        ctx.fillStyle = "rgba(243,139,168,0.95)";
        ctx.fillRect(cx + 15, hy - 21, 2.6, 7); ctx.fillRect(cx + 15, hy - 12, 2.6, 2.6);
    } else if (mood === "sleep" && ctx.fillText) {
        ctx.fillStyle = body + "0.8)"; ctx.font = "bold 8px sans-serif"; if ("textAlign" in ctx) ctx.textAlign = "left";
        var zt = (t % 60) / 60;
        try { ctx.globalAlpha = 1 - zt; ctx.fillText("z", cx + 10, hy - 9 - zt * 9);
              ctx.globalAlpha = Math.max(0, 0.7 - zt); ctx.fillText("z", cx + 15, hy - 15 - zt * 11); }
        finally { ctx.globalAlpha = 1; }
    } else if (mood === "type" && Math.sin(t * 0.5) > 0.7) {
        ctx.fillStyle = body + "0.7)";
        ctx.beginPath(); ctx.arc(cx + 14, hy - 16, 1.4, 0, 6.283); ctx.fill();
    }
}
