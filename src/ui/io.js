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
    ip.type = "text"; ip.maxLength = 40; ip.placeholder = t("Имя пресета");
    var saveB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Сохранить"));
    function doSave() {
        var name = ip.value.trim().slice(0, 40);
        if (!name) { toast(t("Введите имя пресета"), false); return; }
        var cur = loadPresets();
        if (!(name in cur) && Object.keys(cur).length >= PRESETS_MAX) { toast(t("Слишком много пресетов (макс. ") + PRESETS_MAX + ")", false); return; }
        var snap = clone(cfg); delete snap.ui; // положение/свёрнутость панели не входят в пресет
        cur[name] = snap; savePresets(cur);
        ip.value = "";
        toast(t("Пресет «") + name + t("» сохранён"));
        refreshPanel();
    }
    saveB.addEventListener("click", doSave);
    keyActivate(saveB, t("Сохранить пресет"));
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSave(); } });
    saveRow.appendChild(ip); saveRow.appendChild(saveB);
    var sd = infoDot(INFO.presets); if (sd) saveRow.appendChild(sd);
    box.appendChild(saveRow);

    // список сохранённых пресетов: клик по строке — применить, «×» — удалить
    var presets = loadPresets(), names = Object.keys(presets);
    if (!names.length) {
        box.appendChild(el("div", "padding:6px 3px 2px; color:var(--mlp-faint,#6c7086); font-size:11px;", t("Пресетов пока нет — сохрани текущий вид под именем.")));
    } else {
        var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
        names.forEach(function (name) {
            var row = el("div", "display:flex; align-items:center; gap:6px; padding:5px 7px; border-radius:7px; cursor:pointer; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
            row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
            row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
            row.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mlp-fg,#cdd6f4);", name));
            var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8);", "×");
            del.title = t("Удалить пресет");
            row.appendChild(del);
            row.addEventListener("click", function (e) {
                if (del.contains(e.target)) return; // клик по «×» обрабатывается отдельно
                var cur = loadPresets(); if (!(name in cur)) return;
                var keepUi = cfg.ui;                // пресет меняет дизайн, не трогая положение панели
                backupCfg();                        // прежний вид -> резерв (можно откатить применение пресета)
                cfg = mergeForeign(cur[name]); cfg.ui = keepUi; // сетевые картинки не включаем из пресета
                syncGenSets();                      // ген-наборы пресета -> в список сразу
                if (typeof cur[name].mode === "string" && /^\d+$/.test(cur[name].mode) && parseInt(cur[name].mode, 10) < SETS.length) cfg.mode = cur[name].mode;
                sessionRandomIndex = null;          // random переберётся под новый конфиг
                apply(); refreshPanel();
                toast(t("Пресет «") + name + t("» применён"));
            });
            keyActivate(row, t("Применить пресет ") + name);
            del.addEventListener("click", function (e) {
                e.stopPropagation();
                var cur = loadPresets(); delete cur[name]; savePresets(cur);
                toast(t("Пресет «") + name + t("» удалён"));
                refreshPanel();
            });
            keyActivate(del, t("Удалить пресет ") + name);
            list.appendChild(row);
        });
        box.appendChild(list);
    }
    return box;
}

// ===== Профили быстрого старта (улучшение 10) =====
// Накладывает patch профиля (PROFILES из config.js) ПОВЕРХ текущего конфига: трогает только
// внешний вид, а выбранный набор/картинки/привязки/язык сохраняются. Идёт через backupCfg
// (можно откатить «Восстановить») и mergeCfg (санитизация после наложения).
function applyProfile(id) {
    var p = profileById(id); if (!p) { toast(t("Не удалось создать набор"), false); return; }
    backupCfg();                       // текущий вид -> резерв (профиль можно откатить)
    var raw = clone(cfg);              // стартуем от текущего конфига — сохраняем набор/картинки/язык/ui
    var patch = p.patch, k;
    for (k in patch) {
        if (!patch.hasOwnProperty(k)) continue;
        if ((k === "fx" || k === "fxp" || k === "baseOp") && raw[k] && typeof raw[k] === "object") {
            for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk)) raw[k][kk] = patch[k][kk]; // слить по полям
        } else raw[k] = patch[k];
    }
    cfg = mergeCfg(raw);               // санитизация после наложения (в т.ч. clamp яркостей/сил)
    syncGenSets();                     // ген-наборы текущего конфига остаются в хвосте SETS
    apply(); refreshPanel();
    toast(t("Профиль применён: ") + t(p.name));
}
// UI секции «Профили»: пять карточек-кнопок с названием и коротким описанием. Клик — применить.
function makeProfilesUI() {
    var box = el("div", null);
    box.appendChild(el("div", "padding:2px 3px 6px; color:var(--mlp-faint,#6c7086); font-size:11px;",
        t("Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.")));
    var list = el("div", "display:flex; flex-direction:column; gap:5px;");
    PROFILES.forEach(function (p) {
        var row = el("div", "padding:7px 9px; border-radius:8px; cursor:pointer; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; });
        row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; });
        row.appendChild(el("div", "font-weight:600; color:var(--mlp-fg,#cdd6f4); margin-bottom:2px;", t(p.name)));
        row.appendChild(el("div", "font-size:10.5px; line-height:1.4; color:var(--mlp-muted,#a6adc8);", t(p.desc)));
        row.addEventListener("click", function () { applyProfile(p.id); });
        keyActivate(row, t("Применить профиль") + ": " + t(p.name));
        list.appendChild(row);
    });
    box.appendChild(list);
    return box;
}

// Восстановление из авто-резерва: возвращает конфиг, бывший до последней замены
// (импорт/сброс/пресет). Текущий cfg при этом сам уходит в резерв — поэтому «Восстановить»
// работает как переключатель между «до» и «после» (нажал не туда — нажми ещё раз).
function restoreBackup() {
    var b = readBackup();
    if (!b) { toast(t("Резерва нет"), false); return; }
    backupCfg();                 // текущее -> резерв (обратный откат тем же действием)
    cfg = b; syncGenSets(); sessionRandomIndex = null; // хвост SETS под ген-наборы восстановленного конфига
    apply(); refreshPanel();
    toast(t("Восстановлены прежние настройки"));
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
// genSets тоже личные (сгенерированные пользователем наборы) и в код образа не входят (SHARE_KEYS);
// без сохранения их mergeCfg(o) обнулил бы — и генеративные наборы пропали бы при применении чужого кода.
var SHARE_KEEP = ["ui", "imgBase", "workspaceSets", "autoWorkspace", "ambientBranch", "setImg", "allowRemoteImages", "genSets"];
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
    if (!o) { toast(t("Код не распознан"), false); return false; }
    backupCfg(); // текущее -> резерв (применение чужого кода можно откатить)
    var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
    cfg = mergeCfg(o); // санитизация всего содержимого кода
    for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // вернуть машинно-зависимое (в т.ч. genSets)
    syncGenSets(); // хвост SETS под сохранённые ген-наборы (genSets вернулись из keep); заодно зажмёт mode на чужой ген-индекс
    sessionRandomIndex = null;
    apply(); refreshPanel();
    toast(t("Образ применён из кода"));
    return true;
}

// Секция «Поделиться»: копировать код текущего образа + поле для чужого кода и «Применить».
function makeShareUI() {
    var box = el("div", null);
    var copyB = makeIoBtn("Скопировать код образа");
    copyB.style.marginBottom = "6px";
    copyB.addEventListener("click", function () {
        var code = shareEncode();
        toast(code && copyText(code) ? t("Код образа скопирован в буфер") : t("Не удалось сформировать код"), !!code);
    });
    box.appendChild(copyB);
    var row = el("div", ST.row);
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.placeholder = t("Вставь код образа"); ip.maxLength = 8192;
    var applyB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Применить"));
    function doApply() { if (applyShareCode(ip.value)) ip.value = ""; }
    applyB.addEventListener("click", doApply);
    keyActivate(applyB, t("Применить код образа"));
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doApply(); } });
    row.appendChild(ip); row.appendChild(applyB);
    var d = infoDot(INFO.share_code); if (d) row.appendChild(d);
    box.appendChild(row);
    return box;
}

// ===== Синхронизация через settings.json (улучшение 5) =====
// custom-bg.js хранит конфиг в localStorage конкретной машины — он не переносится и не едет
// через Settings Sync. Мост: компаньон-расширение читает объект-настройку moonlightBg.config
// из settings.json (а он синхронизируется) и прокидывает его сюда как window.__MLBG_SEED__.
// На новой машине с пустым localStorage этот seed становится отправным конфигом (см. loadCfg).
// Здесь — две ручные операции: скопировать текущий вид как строку для settings.json и
// подтянуть синхронизированный образ на эту машину поверх текущего.
function copyConfigForSettings() {
    // Готовая строка для settings.json: ключ + компактный объект конфига. allowRemoteImages и
    // машинно-зависимые пути тоже попадут — это осознанный «полный образ» для своих машин.
    var snippet = '"moonlightBg.config": ' + JSON.stringify(cfg);
    var okc = copyText(snippet);
    toast(okc ? t("Скопировано для settings.json") : t("Не удалось скопировать"), okc);
}
function applySeed() {
    var o = seedConfig();
    if (!o) { toast(t("Базовый конфиг из settings.json не найден (нужно расширение-компаньон)"), false); return; }
    backupCfg(); // текущее -> резерв (загрузку базы можно откатить)
    var keep = {}; for (var i = 0; i < SHARE_KEEP.length; i++) keep[SHARE_KEEP[i]] = cfg[SHARE_KEEP[i]];
    cfg = mergeCfg(o);
    for (var j = 0; j < SHARE_KEEP.length; j++) cfg[SHARE_KEEP[j]] = keep[SHARE_KEEP[j]]; // машинно-зависимое оставляем своё
    syncGenSets(); sessionRandomIndex = null;
    apply(); refreshPanel();
    toast(t("Загружено из settings.json"));
}
function makeSyncUI() {
    var box = el("div", null);
    var copyB = makeIoBtn("Скопировать для settings.json");
    copyB.style.marginBottom = "6px";
    copyB.addEventListener("click", copyConfigForSettings);
    box.appendChild(copyB);
    var loadB = makeIoBtn("Загрузить базу из settings.json");
    loadB.addEventListener("click", applySeed);
    box.appendChild(loadB);
    return box;
}

// ===== Экспорт цветовой темы VS Code =====
// Из палитры активного набора (подложка + акцент) собираем НАСТОЯЩУЮ VS Code color-theme.json:
// согласованный тёмный набор цветов воркбенча + подсветка синтаксиса. Ценность — «вид живёт
// и там, где custom-css недоступен»: тема грузится в vscode.dev, по SSH/в Codespaces, находится
// поиском тем. Ничего сетевого/личного в файл не попадает: только цвета, выведенные из набора.
//
// Как использовать (см. INFO.theme_export): (1) цвета можно вставить в settings.json под
// "workbench.colorCustomizations" / "editor.tokenColorCustomizations" — применится сразу без
// упаковки; (2) сам файл — положить в themes/ своего theme-расширения (тогда тема ставится и
// находится поиском, работает там, где custom-css нет).
//
// Все цвета выводятся детерминированно из акцента набора существующими хелперами палитры
// (hexToRgbArr/rgbToHsl/hslToHex/shadeHex/rotateHue из css.js — они в общей области IIFE),
// поэтому один и тот же набор всегда даёт одну и ту же тему.

// hex + альфа (0..1) -> #rrggbbaa (VS Code принимает 8-значный hex в colors).
function _hexA(hex, a) {
    var v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16);
    return hex + (v.length < 2 ? "0" + v : v);
}
// Оттенок (0..1) акцента — основа тонированных нейтралей темы.
function _hueOf(hex) { return rgbToHsl.apply(null, hexToRgbArr(hex))[0]; }
// Акцент произвольного набора (как getAccent, но по индексу): правка пользователя ->
// «родной» акцент набора -> глобальный. Тема строится под конкретный набор.
function _setAccent(idx) {
    var o = cfg.setAccent && cfg.setAccent[idx];
    if (isColor(o)) return o;
    var s = SETS[idx];
    if (s && isColor(s.accent)) return s.accent;
    return safeColor(cfg.accent, DEFAULTS.accent);
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

// Собрать объект color-theme.json для набора idx. Возвращает { name, obj }.
function buildColorTheme(idx) {
    if (typeof idx !== "number" || idx < 0 || idx >= SETS.length) idx = activeIndex();
    var ac = _setAccent(idx);
    var bg = _setBaseBg(idx, ac);
    var h = _hueOf(ac);
    // Нейтрали, чуть тонированные в оттенок акцента (низкая насыщенность — интерфейс спокойный).
    var bgDark = shadeHex(bg, -0.28);              // актив-бар / статусбар / титлбар (темнее)
    var bgSide = shadeHex(bg, -0.12);              // сайдбар / панель / неактивные вкладки
    var bgLift = shadeHex(bg, 0.08);               // поля/дропдауны/виджеты (светлее)
    var border = shadeHex(bg, 0.16);               // границы/направляющие
    var fg = hslToHex(h, 0.14, 0.86);              // основной текст
    var fgMut = hslToHex(h, 0.10, 0.62);           // приглушённый текст
    var fgDim = hslToHex(h, 0.08, 0.44);           // номера строк / комментарии / whitespace
    // Акценты подсветки синтаксиса — повороты оттенка (rotateHue нормализует S/L в читаемые).
    var kw = ac;                                   // ключевые слова / теги
    var str = rotateHue(ac, 0.33);                 // строки
    var fn = rotateHue(ac, -0.33);                 // функции
    var typ = rotateHue(ac, -0.12);                // типы/классы
    var num = rotateHue(ac, 0.5);                  // числа/константы
    var attr = rotateHue(ac, 0.12);                // атрибуты/свойства
    var err = "#f38ba8", warn = "#f9e2af", good = "#a6e3a1"; // диагностика — фиксированные (узнаваемые)

    var colors = {
        "focusBorder": _hexA(ac, 0.5),
        "foreground": fgMut,
        "widget.shadow": "#00000066",
        "selection.background": _hexA(ac, 0.34),
        "descriptionForeground": fgMut,
        "errorForeground": err,
        "textLink.foreground": ac,
        "textLink.activeForeground": shadeHex(ac, 0.16),

        "editor.background": bg,
        "editor.foreground": fg,
        "editorLineNumber.foreground": fgDim,
        "editorLineNumber.activeForeground": ac,
        "editorCursor.foreground": ac,
        "editor.selectionBackground": _hexA(ac, 0.32),
        "editor.selectionHighlightBackground": _hexA(ac, 0.16),
        "editor.wordHighlightBackground": _hexA(ac, 0.16),
        "editor.wordHighlightStrongBackground": _hexA(ac, 0.24),
        "editor.findMatchBackground": _hexA(ac, 0.45),
        "editor.findMatchHighlightBackground": _hexA(ac, 0.22),
        "editor.lineHighlightBackground": _hexA(shadeHex(bg, 0.12), 0.4),
        "editorIndentGuide.background1": border,
        "editorIndentGuide.activeBackground1": _hexA(ac, 0.6),
        "editorWhitespace.foreground": fgDim,
        "editorBracketMatch.background": _hexA(ac, 0.16),
        "editorBracketMatch.border": _hexA(ac, 0.6),
        "editorError.foreground": err,
        "editorWarning.foreground": warn,
        "editorInfo.foreground": ac,
        "editorGutter.modifiedBackground": attr,
        "editorGutter.addedBackground": good,
        "editorGutter.deletedBackground": err,

        "editorWidget.background": bgLift,
        "editorWidget.border": border,
        "editorSuggestWidget.background": bgLift,
        "editorSuggestWidget.selectedBackground": _hexA(ac, 0.24),
        "editorHoverWidget.background": bgLift,
        "editorHoverWidget.border": border,
        "peekViewEditor.background": bg,
        "peekViewResult.background": bgSide,

        "sideBar.background": bgSide,
        "sideBar.foreground": fgMut,
        "sideBar.border": border,
        "sideBarTitle.foreground": fg,
        "sideBarSectionHeader.background": bgSide,
        "sideBarSectionHeader.foreground": fg,

        "activityBar.background": bgDark,
        "activityBar.foreground": ac,
        "activityBar.inactiveForeground": fgDim,
        "activityBar.border": border,
        "activityBarBadge.background": ac,
        "activityBarBadge.foreground": bg,
        "activityBar.activeBorder": ac,

        "titleBar.activeBackground": bgDark,
        "titleBar.activeForeground": fg,
        "titleBar.inactiveBackground": bgDark,
        "titleBar.inactiveForeground": fgDim,
        "titleBar.border": border,

        "statusBar.background": bgDark,
        "statusBar.foreground": fgMut,
        "statusBar.border": border,
        "statusBar.noFolderBackground": bgDark,
        "statusBar.debuggingBackground": ac,
        "statusBar.debuggingForeground": bg,
        "statusBarItem.remoteBackground": ac,
        "statusBarItem.remoteForeground": bg,

        "tab.activeBackground": bg,
        "tab.inactiveBackground": bgSide,
        "tab.activeForeground": fg,
        "tab.inactiveForeground": fgDim,
        "tab.activeBorderTop": ac,
        "tab.activeBorder": _hexA(ac, 0.7),
        "tab.border": bgDark,
        "editorGroupHeader.tabsBackground": bgSide,
        "editorGroupHeader.tabsBorder": border,
        "editorGroup.border": border,

        "panel.background": bgSide,
        "panel.border": border,
        "panelTitle.activeForeground": fg,
        "panelTitle.inactiveForeground": fgDim,
        "panelTitle.activeBorder": ac,

        "terminal.background": bg,
        "terminal.foreground": fg,
        "terminalCursor.foreground": ac,

        "button.background": ac,
        "button.foreground": bg,
        "button.hoverBackground": shadeHex(ac, 0.14),
        "badge.background": ac,
        "badge.foreground": bg,
        "progressBar.background": ac,

        "input.background": bgLift,
        "input.foreground": fg,
        "input.border": border,
        "input.placeholderForeground": fgDim,
        "inputOption.activeBorder": ac,
        "inputOption.activeBackground": _hexA(ac, 0.24),
        "dropdown.background": bgLift,
        "dropdown.foreground": fg,
        "dropdown.border": border,
        "quickInput.background": bgLift,
        "quickInput.foreground": fg,
        "quickInputList.focusBackground": _hexA(ac, 0.24),

        "list.activeSelectionBackground": _hexA(ac, 0.28),
        "list.activeSelectionForeground": fg,
        "list.inactiveSelectionBackground": _hexA(ac, 0.16),
        "list.hoverBackground": _hexA(shadeHex(bg, 0.14), 0.5),
        "list.focusBackground": _hexA(ac, 0.28),
        "list.highlightForeground": ac,

        "scrollbarSlider.background": _hexA(ac, 0.22),
        "scrollbarSlider.hoverBackground": _hexA(ac, 0.38),
        "scrollbarSlider.activeBackground": _hexA(ac, 0.55),

        "gitDecoration.modifiedResourceForeground": attr,
        "gitDecoration.untrackedResourceForeground": good,
        "gitDecoration.deletedResourceForeground": err,

        "minimap.selectionHighlight": _hexA(ac, 0.5),
        "breadcrumb.foreground": fgDim,
        "breadcrumb.focusForeground": fg,
        "breadcrumb.activeSelectionForeground": ac
    };

    // TextMate-подсветка: общие скоупы -> выведенные акценты. semanticHighlighting=true
    // разрешает семантическую подсветку темы (LSP-токены), поверх этих scope-правил.
    function tc(scope, color, style) {
        var s = { scope: scope, settings: { foreground: color } };
        if (style) s.settings.fontStyle = style;
        return s;
    }
    var tokenColors = [
        tc(["comment", "punctuation.definition.comment"], fgDim, "italic"),
        tc(["string", "string.quoted", "string.template"], str),
        tc(["constant.numeric", "constant.language", "constant.character", "constant.other"], num),
        tc(["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new"], kw),
        tc(["keyword.operator", "punctuation", "meta.brace"], fgMut),
        tc(["entity.name.function", "support.function", "meta.function-call.generic"], fn),
        tc(["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], typ),
        tc(["variable", "variable.other", "meta.definition.variable.name"], fg),
        tc(["variable.parameter", "variable.other.readwrite"], fg),
        tc(["variable.language", "variable.other.constant", "support.variable"], num),
        tc(["entity.name.tag", "punctuation.definition.tag"], kw),
        tc(["entity.other.attribute-name", "meta.object-literal.key", "support.type.property-name"], attr),
        tc(["markup.heading", "entity.name.section"], kw, "bold"),
        tc(["markup.bold"], num, "bold"),
        tc(["markup.italic"], str, "italic"),
        tc(["markup.inline.raw", "markup.fenced_code"], fn),
        tc(["markup.inserted"], good),
        tc(["markup.deleted"], err),
        tc(["invalid", "invalid.illegal"], err)
    ];

    var name = "MoonLight " + (setName(idx) || ("Набор " + idx));
    return {
        name: name,
        obj: {
            "$schema": "vscode://schemas/color-theme",
            name: name,
            type: "dark",
            semanticHighlighting: true,
            colors: colors,
            tokenColors: tokenColors
        }
    };
}

// Экспорт темы активного набора: скачать color-theme.json + положить в буфер (как exportCfg).
function exportTheme() {
    var idx = activeIndex();
    var th = buildColorTheme(idx); // не «t»: имя t занято функцией перевода (i18n)
    var json = JSON.stringify(th.obj, null, 2);
    var fname = "moonlight-" + (_slug(setName(idx)) || ("set-" + idx)) + "-color-theme.json";
    var saved = false;
    try {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        saved = true;
    } catch (e) {}
    var copied = copyText(json);
    toast(saved && copied ? (t("Тема «") + th.name + t("» сохранена в файл + в буфере"))
        : saved ? t("Тема сохранена в файл") : copied ? t("Тема скопирована в буфер") : t("Не удалось выгрузить тему"), (saved || copied));
}

// Секция «Экспорт темы»: одна кнопка — тема активного набора. Имя набора показываем,
// чтобы было понятно, ЧТО именно выгрузится (тема строится под текущий набор).
function makeThemeExportUI() {
    var box = el("div", null);
    box.appendChild(el("div", "padding:2px 3px 6px; font-size:11px; color:var(--mlp-muted,#a6adc8);",
        t("Тема соберётся из палитры активного набора: ") + "«" + (setName(activeIndex()) || "?") + "»"));
    var row = el("div", "display:flex; align-items:center; gap:8px;");
    var b = makeIoBtn("Экспорт VS Code-темы");
    b.addEventListener("click", function () { exportTheme(); });
    row.appendChild(b);
    var d = infoDot(INFO.theme_export); if (d) row.appendChild(d);
    box.appendChild(row);
    return box;
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
    var uB = makeIoBtn("↶ Отменить"); uB.addEventListener("click", function () { undo(); });
    var rB = makeIoBtn("↷ Повторить"); rB.addEventListener("click", function () { redo(); });
    row.appendChild(uB); row.appendChild(rB);
    return row;
}

// ===== Диагностика установки =====
// Главная боль custom-css плагинов — «поставил, а фон не появился»: чаще всего не задан путь
// к картинкам (перенос папки) либо не перезапущен VS Code. Собираем короткий отчёт о том, что
// плагин видит о себе: версия, тема, активный набор, папка картинок, загрузились ли картинки
// активного набора, найден ли наш <style> и кнопка BG. Ничего не меняет — только читает
// состояние. Возвращает { lines, ok, text }: ok=false, если есть явная проблема.
function _zoneDiag(idx, zone) {
    if (isGrad(idx, zone)) return { s: "градиент (без картинки)", bad: false };
    var url = zoneUrl(idx, zone);
    if (!url) return { s: "путь не задан", bad: false }; // зона без своей картинки — это не ошибка
    var st = probeImage(url);
    if (!st.resolved) return { s: "загружается…", bad: false };
    return st.ok ? { s: "загружена", bad: false } : { s: "НЕ загружена (проверь путь)", bad: true };
}
function diagnostics() {
    var idx = activeIndex(), lines = [], bad = 0;
    function add(k, v) { lines.push(t(k) + ": " + v); }
    add("Версия", APP_VERSION + " (схема конфига v" + CFG_VERSION + ")");
    add("Тема", themeKind());
    add("Язык интерфейса", uiLang() + (cfg.lang === "auto" ? "  [авто]" : "  [" + cfg.lang + "]"));
    add("Фон включён", cfg.enabled ? t("да") : t("нет (мастер-выключатель)"));
    add("Активный набор", idx + " · " + (setName(idx) || "?") + (isProcSet(idx) ? " (проц.)" : isGradSet(idx) ? " (град.)" : " (фото)"));
    var base = imgBase();
    add("Папка картинок", (base || "(путь не определён)") + (cfg.imgBase ? "  [задана вручную]" : "  [авто]"));
    add("Сетевые картинки", cfg.allowRemoteImages ? t("разрешены") : t("выключены"));
    var styleFound = !!document.getElementById(STYLE_ID);
    add("Стиль в DOM", styleFound ? t("найден (custom-css активен)") : t("НЕ найден"));
    if (!styleFound) bad++;
    add("Кнопка BG", document.getElementById(SB_ID) ? t("найдена") : t("нет (статусбар ещё не готов?)"));
    ["editor", "sidebar", "panel"].forEach(function (z, i) {
        var r = _zoneDiag(idx, z);
        if (r.bad) bad++;
        lines.push(t("Картинка · ") + t(["редактор", "сайдбар", "панель"][i]) + ": " + r.s);
    });
    add("Всего наборов", SETS.length + (SETS_DROPPED > 0 ? "  (отброшено битых: " + SETS_DROPPED + " — проверь правки SETS)" : ""));
    // «Здоровье» DOM-скрейпинга (git-ветка / счётчик ошибок / имя проекта): если селектор под
    // текущую версию VS Code перестал находиться, показываем это явно — вместо тихой поломки.
    // scrapeHealth живёт в scrape.js (typeof-страховка на случай сборки без модуля).
    if (typeof scrapeHealth === "function") {
        var health = scrapeHealth();
        health.forEach(function (h) {
            if (!h.ok) bad++;
            lines.push(t("Чтение из DOM · ") + t(h.name) + ": " + (h.ok ? "" : t("СБОЙ") + " · ") + t(h.note));
        });
    }
    // Подсказка, если картинки набора не грузятся — почти всегда виноват путь.
    if (bad && styleFound) lines.push("", "Похоже, картинки набора не находятся. Проверь «Папка плагина» ниже: путь должен вести к папке с assets/. После правки фон появляется сразу.");
    return { lines: lines, ok: bad === 0, text: t("MoonLight custom-bg — диагностика") + "\n" + lines.join("\n") };
}
// UI секции «Диагностика»: кнопка «Проверить» заполняет блок-отчёт и копирует его в буфер
// (удобно вложить в issue). Отчёт остаётся на экране, чтобы прочитать без буфера обмена.
function makeDiagnosticsUI() {
    var box = el("div", null);
    var out = el("pre", "margin:6px 0 0; padding:8px 9px; border-radius:8px; white-space:pre-wrap; word-break:break-word; font-family:var(--vscode-editor-font-family,monospace); font-size:10.5px; line-height:1.5; color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.06); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12)); max-height:220px; overflow:auto;");
    out.hidden = true;
    out.setAttribute("role", "status"); out.setAttribute("aria-live", "polite"); out.tabIndex = 0;
    var runB = makeIoBtn("Проверить установку");
    runB.addEventListener("click", function () {
        var d = diagnostics();
        out.textContent = d.text; out.hidden = false;
        var copied = copyText(d.text);
        toast(d.ok ? (copied ? t("Всё в порядке · отчёт скопирован") : t("Всё в порядке"))
                   : t("Есть проблемы · отчёт скопирован для issue"), d.ok);
    });
    box.appendChild(runB); box.appendChild(out);
    return box;
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
