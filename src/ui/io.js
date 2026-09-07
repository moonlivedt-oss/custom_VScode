

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
    toast(saved && copied ? t("Экспорт: файл сохранён + в буфере обмена")
        : saved ? t("Экспорт: файл сохранён") : copied ? t("Экспорт: скопировано в буфер") : t("Не удалось выгрузить"), (saved || copied));
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
        if (Array.isArray(p.library)) for (var li = 0; li < p.library.length; li++) if (typeof p.library[li] === "string" && isRemoteUrl(p.library[li])) n++;
    } catch (e) {}
    return n;
}
function importCfg() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
    inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
        // Конфиг весит килобайты — отсекаем заведомо чужие/огромные файлы до чтения в память.
        if (f.size > 256 * 1024) { toast(t("Файл слишком большой (>256 КБ)"), false); inp.remove(); return; }
        var rd = new FileReader();
        rd.onload = function () {
            try {
                var parsed = safeParse(String(rd.result));
                var remote = countRemoteImgs(parsed); // считаем ДО санитизации (сырой файл)
                backupCfg(); // текущие настройки -> резерв, чтобы неудачный импорт можно было откатить
                cfg = mergeForeign(parsed); // санитизация + сетевые картинки принудительно выкл (чужой файл сам их не включит)
                syncGenSets(); // импортированные ген-наборы -> в список сразу (иначе видны только после перезапуска)
                // Вернуть активный набор, если файл ссылался на свой ген-набор: mergeCfg зажал mode
                // до syncGenSets (SETS ещё не был расширен), поэтому индекс ген-набора сбросился бы на 0.
                if (parsed && typeof parsed.mode === "string" && /^\d+$/.test(parsed.mode) && parseInt(parsed.mode, 10) < SETS.length) cfg.mode = parsed.mode;
                sessionRandomIndex = null; // сбросить выбор random из прошлой сессии — переберётся под новый конфиг
                apply(); refreshPanel();
                // Предупреждаем о сетевых ссылках на картинки в импортированном файле. Они
                // всегда заблокированы (mergeForeign выключил «Разрешить сетевые картинки»),
                // но пользователь должен знать, что кто-то пытался увести редактор в сеть.
                if (remote > 0) {
                    toast(t("Импортировано. Заблокировано ") + remote + t(" сетевых ссылок на картинки — редактор в сеть не пойдёт. Сетевые картинки остаются выключены; включи их вручную, только если доверяешь источнику."), false);
                } else {
                    toast(t("Настройки импортированы"));
                }
            } catch (e) { toast(t("Ошибка: файл не читается как JSON"), false); }
            inp.remove();
        };
        rd.onerror = function () { toast(t("Не удалось прочитать файл"), false); inp.remove(); };
        rd.readAsText(f);
    });
    document.body.appendChild(inp); inp.click();
}
// Тёмная подложка набора: у grad — первый цвет палитры, у proc — base, у фото-набора
// (картинку в тему не затащить) — выводим тёмный тон из оттенка акцента.
function _setBaseBg(idx, ac) {
    var s = SETS[idx];
    if (s && s.grad && s.grad.length && isColor(s.grad[0])) return s.grad[0];
    if (s && s.proc && isColor(s.base)) return s.base;
    return hslToHex(_hueOf(ac), 0.28, 0.09);
}
// Транслитерация для ASCII-имени файла (имена наборов кириллические). Не идеал по ГОСТ —
// достаточно для читаемого и портируемого имени; пусто -> вызывающий подставит индекс.
var _TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
};
function _slug(s) {
    s = String(s).toLowerCase(); var o = "";
    for (var i = 0; i < s.length; i++) { var c = s[i]; o += (_TRANSLIT[c] != null ? _TRANSLIT[c] : c); }
    return o.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// ===== История изменений (Undo / Redo) =====
// Лёгкий сессионный стек снимков cfg (в памяти, не localStorage — это удобство сессии,
// как panelTab/fxFilter). Снимок делаем по «осевшему» изменению: любое сохранение конфига
// (saveCfg — единая точка и для apply, и для applyFade) дёргает scheduleHistory, а тот
// с небольшой задержкой фиксирует состояние. Дребезг слайдера при перетаскивании в историю
// не идёт (applyNoSave не сохраняет), поэтому одно движение ползунка = один шаг отмены.
// Авто-смены набора (слайдшоу / по времени) в историю НЕ пишутся: _histSuppress лишь
// сдвигает базовую точку, не создавая шага (иначе Undo откатывал бы тик слайдшоу).
var _histUndo = [], _histRedo = [], _histLast = null, _histTimer = 0, _histSuppress = 0;
var HIST_MAX = 50;
function _histNow() { try { return JSON.stringify(cfg); } catch (e) { return null; } }
function scheduleHistory() {
    var snap = _histNow();
    if (snap === null) return;
    if (_histLast === null || _histSuppress) { _histLast = snap; return; } // база / авто-смена — без шага
    if (_histTimer) { clearTimeout(_histTimer); _histTimer = 0; }
    _histTimer = setTimeout(commitHistory, 450);
}
function commitHistory() {
    _histTimer = 0;
    var snap = _histNow();
    if (snap === null || snap === _histLast) return; // ничего не изменилось с прошлой фиксации
    _histUndo.push(_histLast);
    if (_histUndo.length > HIST_MAX) _histUndo.shift();
    _histRedo.length = 0; // новая ветка правок — «повторить» сбрасывается
    _histLast = snap;
}
// Есть ли что отменять/повторять. Используются и в UI (вид кнопок), и в смоук-тесте.
function canUndo() { return _histUndo.length > 0; }
function canRedo() { return _histRedo.length > 0; }
// Восстановить снимок: через ту же санитизацию, что и импорт (defense-in-depth), и подавляя
// запись собственного apply() в историю (иначе восстановление плодило бы новый шаг).
function _histApply(json) {
    cfg = mergeCfg(safeParse(json));
    _histLast = _histNow();
    if (_histTimer) { clearTimeout(_histTimer); _histTimer = 0; }
    _histSuppress++;
    try { apply(); } finally { _histSuppress--; }
    try { if (document.getElementById(PANEL_ID)) refreshPanel(); } catch (e) {}
}
function undo() {
    if (_histTimer) commitHistory();          // зафиксировать «осевшее» изменение перед отменой
    if (!_histUndo.length) { toast(t("Нечего отменять"), false); return; }
    _histRedo.push(_histLast);
    _histApply(_histUndo.pop());
    toast(t("Отменено"));
}
function redo() {
    if (!_histRedo.length) { toast(t("Нечего повторить"), false); return; }
    _histUndo.push(_histLast);
    _histApply(_histRedo.pop());
    toast(t("Повторено"));
}
// Кнопки «Отменить / Повторить» для вкладки «Система». Всегда активны: если стек пуст,
// действие мягко сообщает тостом (проще, чем держать их вид в актуальном состоянии без
// пересборки панели на каждый шаг). Хоткеи — Ctrl+Alt+Z / Ctrl+Alt+Y (boot.js).
function makeHistoryUI() {
    var row = el("div", "display:flex; gap:8px; margin-top:8px;");
    // Отражаем доступность: счётчик шагов в подписи + приглушение пустой кнопки.
    // Панель пересобирается после undo/redo (см. _histApply -> refreshPanel), поэтому счётчики
    // всегда актуальны на момент открытия/после действия. Клик по пустой мягко тостит.
    var uN = _histUndo.length, rN = _histRedo.length;
    var uB = makeIoBtn("↶ Отменить" + (uN ? " (" + uN + ")" : ""));
    var rB = makeIoBtn("↷ Повторить" + (rN ? " (" + rN + ")" : ""));
    if (!canUndo()) { uB.style.opacity = "0.45"; uB.style.cursor = "default"; }
    if (!canRedo()) { rB.style.opacity = "0.45"; rB.style.cursor = "default"; }
    uB.addEventListener("click", function () { undo(); });
    rB.addEventListener("click", function () { redo(); });
    row.appendChild(uB); row.appendChild(rB);
    return row;
}

// Кнопка экспорта/импорта (одинаковый вид, разный обработчик навешивается снаружи).
function makeIoBtn(text) {
    var b = el("div", "flex:1 1 0; padding:7px; text-align:center; border-radius:8px; cursor:pointer; font-weight:600; color:#89b4fa; background:rgba(137,180,250,0.14); border:1px solid rgba(137,180,250,0.32);", t(text));
    b.addEventListener("mouseenter", function () { b.style.background = "rgba(137,180,250,0.26)"; });
    b.addEventListener("mouseleave", function () { b.style.background = "rgba(137,180,250,0.14)"; });
    keyActivate(b, t(text));
    return b;
}

// Базовая точка истории = состояние на момент загрузки (cfg уже создан в config.js).
// Без этого первое же изменение стало бы «базой» и не попало бы в Undo. saveCfg на старте
// не вызывается, поэтому инициализируем явно здесь.
try { _histLast = JSON.stringify(cfg); } catch (e) {}
