// ===== Бюджет производительности =====
// Плагин не знает, на какой машине он запущен, — и выясняет это сам: считает реальный FPS,
// пока включены дорогие эффекты, и переходит в эконом-режим при устойчивой просадке или при
// работе от батареи. Возврат к полному виду — когда кадры восстановились.

// ===== Авто-бюджет производительности =====
// custom-css-плагин не знает мощности машины: на слабом железе живой фон + частицы + Aurora
// могут просаживать FPS редактора. Здесь — лёгкий rAF-семплер: пока включены тяжёлые эффекты
// и окно видно, раз в секунду считаем реальный FPS. Устойчиво низкий FPS -> «эконом-режим»
// (класс body.mlbg-perfsave гасит дорогие CSS-анимации, а число частиц падает через
// effPartCount). Когда FPS восстанавливается — режим снимается. Всё под cfg.perfGuard.
var perf = { raf: 0, t0: 0, frames: 0, low: 0, high: 0, save: false, fps: 60, battery: false };
var PERF_CAP = 18;        // потолок числа частиц в эконом-режиме
var PERF_LOW = 42, PERF_OK = 52; // пороги «плохо»/«снова хорошо» по FPS (гистерезис против дёрганья)
// Эффективное число частиц: обычное, а в эконом-режиме — не больше PERF_CAP.
function effPartCount() { var n = partCount(); return perf.save ? Math.min(n, PERF_CAP) : n; }
// Включены ли эффекты, которые вообще есть смысл «бюджетировать» (стоят кадров непрерывно).
function heavyFxOn() {
    return !!(cfg.enabled && (cfg.fx.aurora || cfg.fx.particles || cfg.fx.spotlight || cfg.fx.kenburns ||
        cfg.fx.typingPulse || cfg.fx.flow || cfg.fx.cursorTrail || cfg.fx.pet || cfg.fx.liveBg));
}
// Стоит ли сейчас мерить FPS: гвард включён, есть что бюджетировать, окно видно, и система не
// в «уменьшить движение» (там тяжёлые анимации и так выключены — мерить нечего).
function perfShouldRun() { return !!(cfg.perfGuard !== false && heavyFxOn() && !document.hidden && !reduceMotion()); }
function setPerfSave(on) {
    if (perf.save === on) return;
    perf.save = on;
    try { if (document.body && document.body.classList) document.body.classList[on ? "add" : "remove"]("mlbg-perfsave"); } catch (e) {}
    try { ensureParticles(); } catch (e) {} // пересоздать частиц под новый лимит (effPartCount)
    if (on) { try { toast(t("Экономия ресурсов активна: часть эффектов приглушена")); } catch (e) {} }
}
function perfLoop(ts) {
    if (!perfShouldRun()) { perf.raf = 0; return; } // условия отпали — тихо останавливаемся
    if (!perf.t0) { perf.t0 = ts; perf.frames = 0; perf.raf = requestAnimationFrame(perfLoop); return; }
    perf.frames++;
    var dt = ts - perf.t0;
    if (dt >= 1000) {
        perf.fps = perf.frames * 1000 / dt;
        perf.t0 = ts; perf.frames = 0;
        if (perf.fps < PERF_LOW) { perf.low++; perf.high = 0; if (perf.low >= 3) setPerfSave(true); }        // 3 плохих секунды подряд -> экономим
        else if (perf.fps >= PERF_OK) { perf.high++; perf.low = 0; if (perf.high >= 5) setPerfSave(false); } // 5 хороших секунд -> отпускаем
    }
    perf.raf = requestAnimationFrame(perfLoop);
}
function perfStart() { if (!perf.raf && perfShouldRun()) { perf.t0 = 0; perf.low = 0; perf.high = 0; perf.raf = requestAnimationFrame(perfLoop); } }
// Держим состояние в согласии с настройками: если мерить надо — запускаем семплер; если
// эконом-режим стоит, но бюджетировать уже нечего (гвард выкл или тяжёлые эффекты сняты) —
// снимаем эконом-класс, чтобы приглушение не «залипло». Зовётся из syncWidgets (apply).
function perfSync() {
    // От батареи экономим независимо от FPS — но только если есть что экономить: без тяжёлых
    // эффектов «эконом-режим» ничего не даёт, а тост про экономию выглядел бы шумом.
    if (perf.battery && heavyFxOn()) { setPerfSave(true); return; }
    if (perfShouldRun()) perfStart();
    else if (perf.save) setPerfSave(false);
}

// ===== Питание: экономим не только по FPS, но и по батарее =====
// Авто-бюджет реагировал только на просадку кадров. Но на ноутбуке проблема обратная:
// кадров хватает, а батарея садится — непрерывная анимация фона на автономном питании
// просто не нужна. Battery Status API в Electron доступен (в вебе он частично урезан),
// поэтому мягко: отключили зарядку — включаем тот же эконом-режим, что и при низком FPS;
// воткнули провод — отпускаем. Всё под общим тумблером cfg.perfGuard.
function initBattery() {
    try {
        if (cfg.perfGuard === false || !navigator.getBattery) return;
        navigator.getBattery().then(function (b) {
            function upd() {
                var onBattery = (b.charging === false);
                if (perf.battery === onBattery) return;
                perf.battery = onBattery;
                if (!onBattery) { perf.low = 0; perf.high = 0; setPerfSave(false); }
                perfSync();
            }
            try { b.addEventListener("chargingchange", upd); } catch (e) {}
            upd();
        })["catch"](function () {});
    } catch (e) {}
}
