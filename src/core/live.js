// ===== Живые данные из хоста расширений =====
// Скрипт фона живёт в окне редактора: у него нет ни API расширений, ни git. Всё, что ему
// нужно знать о работе — ветка, ошибки, язык открытого файла, папка проекта, — до сих пор
// добывалось скрейпингом DOM. Это работает, но держится на чужой вёрстке и ломается на
// обновлениях редактора; ради этого пришлось завести целую систему здоровья селекторов.
//
// Компаньон-расширение живёт там, где эти данные точные (см. extension/live.js), и кладёт их
// в маленький JS-файл, который выставляет window.__MLBG_LIVE__. Рантайм переподключает файл
// на своём цикле самолечения — отдельного таймера не нужно, а цена одного цикла измерена и
// составляет доли миллисекунды (создание и удаление одного <script>).
//
// Данных может не быть вовсе: компаньон не установлен, git выключен, окно без папки. Поэтому
// живые данные — это ПРЕДПОЧТЕНИЕ, а не требование: где их нет, работает прежний скрейпинг.

// Санитизация: файл лежит на диске и в теории может быть подменён, а значения уходят в UI и
// в ключи конфига. Пропускаем только известные поля известных типов и ограничиваем длину.
function mlbgLive() {
    try {
        var d = (typeof window !== "undefined") ? window.__MLBG_LIVE__ : null;
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
// Есть ли вообще живой источник (компаньон прописал адрес файла в пролог).
function liveUrl() {
    var e = (typeof mlbgEnv === "function") ? mlbgEnv() : null;
    return (e && typeof e.live === "string" && e.live) ? e.live : "";
}

// Переподключение файла: адрес один и тот же, поэтому браузер отдал бы его из кэша —
// добавляем метку. Старый тег снимаем сразу после загрузки, чтобы в <head> не копились сотни
// элементов за сессию. Ошибка загрузки (файла ещё нет) — нормальная ситуация, молчим.
var _liveBusy = false;
function liveRefresh() {
    var url = liveUrl();
    if (!url || _liveBusy) return;
    try {
        _liveBusy = true;
        var s = document.createElement("script");
        s.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "r=" + Date.now();
        s.async = true;
        var done = function () { _liveBusy = false; try { s.remove(); } catch (e) {} };
        s.onload = done;
        s.onerror = done;
        document.head.appendChild(s);
    } catch (e) { _liveBusy = false; }
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
    if (!liveUrl()) return "DOM (компаньон не подключён)";
    return mlbgLive() ? "хост расширений" : "DOM (данные ещё не пришли)";
}
