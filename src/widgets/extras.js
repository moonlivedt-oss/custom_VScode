

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
    var d = new Date(), days = uiLang() === "en"
        ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
        : ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    a.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "  " + days[d.getDay()] + " " + pad2(d.getDate()) + "." + pad2(d.getMonth() + 1);
}

var pomo = { running: false, remaining: null };
function pomoDur() { return Math.round((cfg.fxp.pomoMin || 25) * 60); }
// Фокус-сессия: класс body.mlbg-focus включает правила фокуса (см. FX_BLOCKS.focusSession в
// css.js). Держим класс = «эффект включён И «Помидор» включён И идёт (running)». На паузе/
// сбросе/завершении и при выключенном эффекте класс снимается — фокус плавно спадает (у правил
// есть transition). Зовётся из всех точек смены состояния таймера + из syncWidgets (apply).
function syncFocusClass() {
    try {
        var on = !!(cfg.fx.focusSession && cfg.fx.pomodoro && pomo.running);
        document.body.classList[on ? "add" : "remove"]("mlbg-focus");
    } catch (e) {}
}
function ensurePomodoro() {
    var right = statusRight(); if (!right) return;
    var e0 = document.getElementById("mlbg-pomo");
    if (cfg.fx.pomodoro) {
        if (!e0) {
            e0 = document.createElement("div"); e0.id = "mlbg-pomo"; e0.className = "statusbar-item right";
            e0.title = t("Помидор: клик — старт/пауза, Alt+клик — сброс");
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
    } else if (e0) { e0.remove(); syncFocusClass(); } else { syncFocusClass(); }
}
function paintPomo() {
    var e0 = document.getElementById("mlbg-pomo"); if (!e0) return;
    var a = e0.querySelector("a"); if (!a) return;
    var r = pomo.remaining != null ? pomo.remaining : pomoDur();
    a.textContent = (pomo.running ? "" : "|| ") + pad2(Math.floor(r / 60)) + ":" + pad2(r % 60);
    e0.style.background = pomo.running ? "rgba(var(--mlbg-accent-rgb),0.22)" : "transparent";
    syncFocusClass(); // старт/пауза/сброс/тик проходят через paintPomo — отсюда и держим класс
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
        var note = document.createElement("div"); // не «t»: имя t занято функцией перевода (i18n)
        note.textContent = t("Помидор готов — перерыв!");
        note.style.cssText = "position:fixed; bottom:42px; right:16px; z-index:100001; background:rgba(var(--mlbg-accent-rgb),0.96); color:#181825; font-weight:700; padding:10px 14px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:var(--vscode-font-family,sans-serif);";
        document.body.appendChild(note); setTimeout(function () { note.remove(); }, 6000);
    } catch (e) {}
    try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        var ctx = new AC(), o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.06;
        o.start(); setTimeout(function () { o.stop(); ctx.close(); }, 260);
    } catch (e) {}
}

// ===== Статистика сессии (fx.stats) =====
// Лёгкий сессионный счётчик (в памяти, не localStorage — как история Undo): время в сессии,
// нажатия, число тронутых файлов, суммарное «время в потоке» и лучший стрик непрерывной печати.
// Данные копят boot.js (statsOnType на ввод) и heal (statsTrackFile — активный файл). Виджет
// статусбара показывает компактную сводку, а секция «Статистика» в панели — полную. Без эмодзи.
var statsState = { start: Date.now(), keys: 0, files: {}, fileCount: 0, lastType: 0, streakStart: 0, streakMs: 0, bestMs: 0, flowMs: 0 };
function statsReset() { statsState = { start: Date.now(), keys: 0, files: {}, fileCount: 0, lastType: 0, streakStart: 0, streakMs: 0, bestMs: 0, flowMs: 0 }; }
function statsOnType() {
    var now = Date.now(); statsState.keys++;
    if (statsState.lastType && now - statsState.lastType < 3000) { // пауза < 3с — стрик продолжается
        statsState.flowMs += (now - statsState.lastType);
        statsState.streakMs = now - statsState.streakStart;
    } else { statsState.streakStart = now; statsState.streakMs = 0; } // новая серия
    if (statsState.streakMs > statsState.bestMs) statsState.bestMs = statsState.streakMs;
    statsState.lastType = now;
}
function statsTrackFile() {
    try {
        var wb = document.querySelector(".monaco-workbench"); if (!wb) return;
        var tab = wb.querySelector(".editor-group-container.active .tab.active .tab-label")
               || wb.querySelector(".tab.active .tab-label") || wb.querySelector(".tab.active");
        var name = String((tab && tab.getAttribute && tab.getAttribute("aria-label")) || (tab && tab.textContent) || "").trim().split(/[\s,]/)[0];
        if (name && !statsState.files[name]) { statsState.files[name] = 1; statsState.fileCount++; }
    } catch (e) {}
}
function fmtDur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ":" + pad2(m) : m) + ":" + pad2(ss);
}
function ensureStats() {
    var right = statusRight(); if (!right) return;
    var e0 = document.getElementById("mlbg-stats");
    if (cfg.enabled && cfg.fx.stats) {
        if (!e0) {
            e0 = document.createElement("div"); e0.id = "mlbg-stats"; e0.className = "statusbar-item right";
            e0.title = t("Статистика сессии");
            var a = document.createElement("a"); a.className = "statusbar-item-label"; a.style.padding = "0 6px"; e0.appendChild(a);
            right.insertBefore(e0, right.firstChild);
        }
        paintStats();
    } else if (e0) { e0.remove(); }
}
function paintStats() {
    var e0 = document.getElementById("mlbg-stats"); if (!e0) return; var a = e0.querySelector("a"); if (!a) return;
    var en = uiLang() === "en";
    a.textContent = fmtDur(Date.now() - statsState.start) + " · " + statsState.fileCount + (en ? "f" : "ф") + " · " + statsState.keys + (en ? "k" : "к");
}

function syncWidgets() {
    try { ensureClock(); } catch (e) {}
    try { ensurePomodoro(); } catch (e) {}
    try { ensureParticles(); } catch (e) {}
    try { ensureCursorTrail(); } catch (e) {} // шлейф курсора (создать/убрать canvas под настройку)
    try { ensurePet(); } catch (e) {}         // питомец-компаньон (создать/убрать canvas под настройку)
    try { screensaverSync(); } catch (e) {}   // убрать витрину сразу, если её выключили в панели
    try { ensureStats(); } catch (e) {}       // виджет статистики сессии в статусбаре
    try { syncFocusClass(); } catch (e) {} // отразить вкл/выкл эффекта фокуса без ожидания тика
    try { perfSync(); } catch (e) {}       // запустить/остановить авто-бюджет FPS под текущие настройки
}
