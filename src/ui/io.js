// ===== Экспорт / импорт настроек + тосты =====
// toast — короткое уведомление внизу справа (зелёное/красное). Экспорт выгружает cfg в
// JSON-файл и в буфер; импорт читает файл и прогоняет его через mergeCfg (санитизация).

function toast(msg, ok) {
    var t = el("div",
        "position:fixed; bottom:44px; right:16px; z-index:100004; padding:9px 13px; border-radius:9px;" +
        "max-width:min(360px,80vw); line-height:1.4;" + // длинные предупреждения переносятся, а не уезжают за край
        "font-weight:600; font-family:var(--vscode-font-family,sans-serif); box-shadow:0 8px 24px rgba(0,0,0,0.5);", msg);
    t.style.background = ok === false ? "rgba(243,139,168,0.96)" : "rgba(166,227,161,0.96)";
    t.style.color = "#181825";
    // Скринридер озвучит текст тоста (например «Пресет сохранён»). Ошибки — настойчивее.
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", ok === false ? "assertive" : "polite");
    document.body.appendChild(t);
    // Предупреждения (ok===false) держим дольше — их успеть прочитать важнее.
    setTimeout(function () { t.remove(); }, ok === false ? 6000 : 3200);
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
// Считает удалённые (http(s)/сетевые) ссылки на картинки в СЫРОМ конфиге (до санитизации):
// база imgBase и все cfg.setImg[idx][zone]. Нужно, чтобы честно предупредить при импорте
// чужого файла — такие ссылки по умолчанию блокируются (imgAllowed), но пользователь должен
// знать, что кто-то пытался заставить редактор ходить в сеть.
function countRemoteImgs(p) {
    var n = 0;
    try {
        if (!p || typeof p !== "object") return 0;
        if (typeof p.imgBase === "string" && isRemoteUrl(p.imgBase)) n++;
        if (p.setImg && typeof p.setImg === "object") {
            for (var i in p.setImg) {
                if (!p.setImg.hasOwnProperty(i)) continue;
                var z = p.setImg[i]; if (!z || typeof z !== "object") continue;
                ["editor", "sidebar", "panel"].forEach(function (k) { if (typeof z[k] === "string" && isRemoteUrl(z[k])) n++; });
            }
        }
    } catch (e) {}
    return n;
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
                var remote = countRemoteImgs(parsed); // считаем ДО санитизации (сырой файл)
                backupCfg(); // текущие настройки -> резерв, чтобы неудачный импорт можно было откатить
                cfg = mergeForeign(parsed); // санитизация + сетевые картинки принудительно выкл (чужой файл сам их не включит)
                sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                apply(); refreshPanel();
                // Предупреждаем о сетевых ссылках на картинки в импортированном файле. Они
                // всегда заблокированы (mergeForeign выключил «Разрешить сетевые картинки»),
                // но пользователь должен знать, что кто-то пытался увести редактор в сеть.
                if (remote > 0) {
                    toast("Импортировано. Заблокировано " + remote + " сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику.", false);
                } else {
                    toast("Настройки импортированы");
                }
            } catch (e) { toast("Ошибка: файл не читается как JSON", false); }
            inp.remove();
        };
        rd.onerror = function () { toast("Не удалось прочитать файл", false); inp.remove(); };
        rd.readAsText(f);
    });
    document.body.appendChild(inp); inp.click();
}
// ===== Именованные пресеты =====
// Несколько сохранённых образов в отдельном ключе localStorage: имя -> снимок cfg.
// Применение снимка идёт через mergeCfg (та же санитизация, что и импорт файла),
// поэтому подменённое хранилище не опаснее импортированного JSON.
var PRESETS_KEY = "moonlight-bg-presets", PRESETS_MAX = 24;
function loadPresets() {
    try {
        var raw = localStorage.getItem(PRESETS_KEY);
        if (raw && raw.length <= 256 * 1024) {
            var o = safeParse(raw);
            if (o && typeof o === "object") return o;
        }
    } catch (e) {}
    return {};
}
function savePresets(obj) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(obj)); } catch (e) {} }

function makePresetsUI() {
    var box = el("div", null);

    // строка сохранения текущего вида под именем
    var saveRow = el("div", "display:flex; gap:6px; align-items:center; padding:2px 2px;");
    var ip = el("input", fieldStyle(" padding:4px 6px;"));
    ip.type = "text"; ip.maxLength = 40; ip.placeholder = "Имя пресета";
    var saveB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", "Сохранить");
    function doSave() {
        var name = ip.value.trim().slice(0, 40);
        if (!name) { toast("Введите имя пресета", false); return; }
        var cur = loadPresets();
        if (!(name in cur) && Object.keys(cur).length >= PRESETS_MAX) { toast("Слишком много пресетов (макс. " + PRESETS_MAX + ")", false); return; }
        var snap = clone(cfg); delete snap.ui; // положение/свёрнутость панели не входят в пресет
        cur[name] = snap; savePresets(cur);
        ip.value = "";
        toast("Пресет «" + name + "» сохранён");
        refreshPanel();
    }
    saveB.addEventListener("click", doSave);
    keyActivate(saveB, "Сохранить пресет");
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSave(); } });
    saveRow.appendChild(ip); saveRow.appendChild(saveB);
    var sd = infoDot(INFO.presets); if (sd) saveRow.appendChild(sd);
    box.appendChild(saveRow);

    // список сохранённых пресетов: клик по строке — применить, «×» — удалить
    var presets = loadPresets(), names = Object.keys(presets);
    if (!names.length) {
        box.appendChild(el("div", "padding:6px 3px 2px; color:var(--mlp-faint,#6c7086); font-size:11px;", "Пресетов пока нет — сохрани текущий вид под именем."));
    } else {
        var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
        names.forEach(function (name) {
            var row = el("div", "display:flex; align-items:center; gap:6px; padding:5px 7px; border-radius:7px; cursor:pointer; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
            row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
            row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
            row.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mlp-fg,#cdd6f4);", name));
            var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8);", "×");
            del.title = "Удалить пресет";
            row.appendChild(del);
            row.addEventListener("click", function (e) {
                if (del.contains(e.target)) return; // клик по «×» обрабатывается отдельно
                var cur = loadPresets(); if (!(name in cur)) return;
                var keepUi = cfg.ui;                // пресет меняет дизайн, не трогая положение панели
                backupCfg();                        // прежний вид -> резерв (можно откатить применение пресета)
                cfg = mergeForeign(cur[name]); cfg.ui = keepUi; // сетевые картинки не включаем из пресета
                sessionRandomIndex = null;          // random переберётся под новый конфиг
                apply(); refreshPanel();
                toast("Пресет «" + name + "» применён");
            });
            keyActivate(row, "Применить пресет " + name);
            del.addEventListener("click", function (e) {
                e.stopPropagation();
                var cur = loadPresets(); delete cur[name]; savePresets(cur);
                toast("Пресет «" + name + "» удалён");
                refreshPanel();
            });
            keyActivate(del, "Удалить пресет " + name);
            list.appendChild(row);
        });
        box.appendChild(list);
    }
    return box;
}

// Восстановление из авто-резерва: возвращает конфиг, бывший до последней замены
// (импорт/сброс/пресет). Текущий cfg при этом сам уходит в резерв — поэтому «Восстановить»
// работает как переключатель между «до» и «после» (нажал не туда — нажми ещё раз).
function restoreBackup() {
    var b = readBackup();
    if (!b) { toast("Резерва нет", false); return; }
    backupCfg();                 // текущее -> резерв (обратный откат тем же действием)
    cfg = b; sessionRandomIndex = null;
    apply(); refreshPanel();
    toast("Восстановлены прежние настройки");
}

// ===== Шаринг образа коротким кодом =====
// Кодируем ТОЛЬКО «внешний вид» (без картинок, путей и личных привязок) в компактный
// base64-код, которым удобно поделиться. Применение чужого кода идёт через mergeCfg (та же
// санитизация, что и импорт), а машинно-зависимое (свои картинки, путь плагина, привязки к
// проектам) сохраняется от текущего конфига — чужой код их не трогает.
var SHARE_KEYS = ["mode", "accent", "setAccent", "setName", "baseOp", "setOp",
    "fx", "fxp", "imgfx", "fit", "term", "slideshow", "autoTime", "autoDim", "enabled", "partStyle"];
// не трогаем при применении кода: машинно-зависимое (свои картинки, путь плагина, привязки к
// проектам) + согласие на сетевые картинки (allowRemoteImages) — оно личное, как setImg/imgBase;
// иначе применение чужого кода образа тихо отключало бы собственные удалённые картинки пользователя.
var SHARE_KEEP = ["ui", "imgBase", "workspaceSets", "autoWorkspace", "ambientBranch", "setImg", "allowRemoteImages"];
// UTF-8-безопасный base64 (в именах наборов бывает кириллица — «сырой» btoa на ней падает).
function b64enc(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return ""; } }
function b64dec(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return ""; } }
function shareEncode() {
    var o = {};
    for (var i = 0; i < SHARE_KEYS.length; i++) { var k = SHARE_KEYS[i]; if (k in cfg) o[k] = cfg[k]; }
    return b64enc(JSON.stringify(o));
}
function shareDecode(code) {
    var json = b64dec(String(code).trim()); if (!json) return null;
    try { var o = safeParse(json); return (o && typeof o === "object") ? o : null; } catch (e) { return null; }
}
function applyShareCode(code) {
    var o = shareDecode(code);
    if (!o) { toast("Код не распознан", false); return false; }
    backupCfg(); // текущее -> резерв (применение чужого кода можно откатить)
    var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
    cfg = mergeCfg(o); // санитизация всего содержимого кода
    for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // вернуть машинно-зависимое
    sessionRandomIndex = null;
    apply(); refreshPanel();
    toast("Образ применён из кода");
    return true;
}

// Секция «Поделиться»: копировать код текущего образа + поле для чужого кода и «Применить».
function makeShareUI() {
    var box = el("div", null);
    var copyB = makeIoBtn("Скопировать код образа");
    copyB.style.marginBottom = "6px";
    copyB.addEventListener("click", function () {
        var code = shareEncode();
        toast(code && copyText(code) ? "Код образа скопирован в буфер" : "Не удалось сформировать код", !!code);
    });
    box.appendChild(copyB);
    var row = el("div", ST.row);
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.placeholder = "Вставь код образа"; ip.maxLength = 8192;
    var applyB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", "Применить");
    function doApply() { if (applyShareCode(ip.value)) ip.value = ""; }
    applyB.addEventListener("click", doApply);
    keyActivate(applyB, "Применить код образа");
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doApply(); } });
    row.appendChild(ip); row.appendChild(applyB);
    var d = infoDot(INFO.share_code); if (d) row.appendChild(d);
    box.appendChild(row);
    return box;
}

// Кнопка экспорта/импорта (одинаковый вид, разный обработчик навешивается снаружи).
function makeIoBtn(text) {
    var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", text);
    b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
    b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
    keyActivate(b, text);
    return b;
}
