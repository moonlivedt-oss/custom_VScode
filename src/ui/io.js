// ===== Экспорт / импорт настроек + тосты =====
// toast — короткое уведомление внизу справа (зелёное/красное). Экспорт выгружает cfg в
// JSON-файл и в буфер; импорт читает файл и прогоняет его через mergeCfg (санитизация).

function toast(msg, ok) {
    var t = el("div",
        "position:fixed; bottom:44px; right:16px; z-index:100004; padding:9px 13px; border-radius:9px;" +
        "font-weight:600; font-family:var(--vscode-font-family,sans-serif); box-shadow:0 8px 24px rgba(0,0,0,0.5);", msg);
    t.style.background = ok === false ? "rgba(243,139,168,0.96)" : "rgba(166,227,161,0.96)";
    t.style.color = "#181825";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
}
function copyText(s) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s); return true; } } catch (e) {}
    try {
        var ta = document.createElement("textarea"); ta.value = s; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
}
function exportCfg() {
    var json = JSON.stringify(cfg, null, 2);
    var saved = false;
    try {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = url; a.download = "moonlight-bg-config.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        saved = true;
    } catch (e) {}
    var copied = copyText(json);
    toast(saved && copied ? "Экспорт: файл сохранён + в буфере обмена"
        : saved ? "Экспорт: файл сохранён" : copied ? "Экспорт: скопировано в буфер" : "Не удалось выгрузить", (saved || copied));
}
function importCfg() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
    inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
        // Конфиг весит килобайты — отсекаем заведомо чужие/огромные файлы до чтения в память.
        if (f.size > 256 * 1024) { toast("Файл слишком большой (>256 КБ)", false); inp.remove(); return; }
        var rd = new FileReader();
        rd.onload = function () {
            try {
                var parsed = safeParse(String(rd.result));
                cfg = mergeCfg(parsed); // mergeCfg санитизирует всё содержимое
                sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                apply(); refreshPanel();
                toast("Настройки импортированы");
            } catch (e) { toast("Ошибка: файл не читается как JSON", false); }
            inp.remove();
        };
        rd.onerror = function () { toast("Не удалось прочитать файл", false); inp.remove(); };
        rd.readAsText(f);
    });
    document.body.appendChild(inp); inp.click();
}
// Кнопка экспорта/импорта (одинаковый вид, разный обработчик навешивается снаружи).
function makeIoBtn(text) {
    var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", text);
    b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
    b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
    keyActivate(b, text);
    return b;
}
