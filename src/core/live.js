// ===== Живые данные из хоста расширений =====
// Скрипт фона живёт в окне редактора: у него нет ни API расширений, ни git. Всё, что ему
// нужно знать о работе — ветка, ошибки, язык открытого файла, папка проекта, — до сих пор
// добывалось скрейпингом DOM. Это работает, но держится на чужой вёрстке и ломается на
// обновлениях редактора; ради этого пришлось завести целую систему здоровья селекторов.
//
// Компаньон-расширение живёт там, где эти данные точные (см. extension/live.js), и присылает
// их событием "live" по мосту Moon Core — только окну своего хоста, поэтому у каждого окна
// VS Code своя ветка и свои ошибки. Раньше это был JS-файл в globalStorage, подключаемый
// через <script src>: оболочка VS Code такие внешние скрипты блокирует, и данные молча не
// доходили. Глобал window.__MLBG_LIVE__ остался как ручной/тестовый источник.
//
// Данных может не быть вовсе: нет Moon Core или компаньона, git выключен, окно без папки.
// Поэтому живые данные — это ПРЕДПОЧТЕНИЕ, а не требование: где их нет, работает скрейпинг DOM.

// Сырые данные: глобал (тесты, ручная подстановка) или последнее событие "live" от компаньона.
function _liveRaw() {
    var d = (typeof window !== "undefined") ? window.__MLBG_LIVE__ : null;
    if (d && typeof d === "object") return d;
    if (!_viaMoonCore) return null;
    var m = mooncoreModule();
    return (m && typeof m.get === "function") ? m.get("live") : null;
}

// Санитизация: данные приходят снаружи, а значения уходят в UI и в ключи конфига.
// Пропускаем только известные поля известных типов и ограничиваем длину.
function mlbgLive() {
    try {
        var d = _liveRaw();
        if (!d || typeof d !== "object") return null;
        function str(v, max) { return (typeof v === "string") ? v.slice(0, max) : ""; }
        function num(v) { return (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v) : 0; }
        return {
            rev: num(d.rev),
            branch: str(d.branch, 80),
            remote: str(d.remote, 120),
            dirty: d.dirty === true,
            errors: num(d.errors),
            warnings: num(d.warnings),
            languageId: str(d.languageId, 40).toLowerCase().replace(/[^a-z0-9_+-]/g, ""),
            fileExt: str(d.fileExt, 16).toLowerCase().replace(/[^a-z0-9_]/g, ""),
            folder: str(d.folder, 120)
        };
    } catch (e) { return null; }
}
// Подписка на свежие данные: fn зовётся, когда компаньон прислал новое событие "live"
// (ветка сменилась, появились ошибки) — не ждать цикла самолечения. Без Moon Core — ничего.
function liveSubscribe(fn) {
    if (!_viaMoonCore) return false;
    var m = mooncoreModule();
    if (!m || typeof m.on !== "function") return false;
    m.on("live", function () { try { fn(); } catch (e) { logErr("живые данные", e); } });
    return true;
}

// Значение с приоритетом живых данных: если поле есть и непустое — берём его, иначе null,
// и вызывающий сам решает, чем это заменить (обычно — скрейпингом DOM).
function liveStr(key) {
    var d = mlbgLive();
    var v = d ? d[key] : null;
    return (typeof v === "string" && v) ? v : null;
}
function liveNum(key) {
    var d = mlbgLive();
    var v = d ? d[key] : null;
    return (typeof v === "number") ? v : null;
}
// Откуда пришло значение — показываем в диагностике, чтобы было видно, работает ли мостик.
function liveSource() {
    if (mlbgLive()) return "хост расширений";
    if (!_viaMoonCore) return "DOM (без Moon Core)";
    return "DOM (данные от компаньона ещё не пришли)";
}
