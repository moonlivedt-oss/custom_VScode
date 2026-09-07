// ===== Образы вида: профили, пресеты, обмен, синхронизация =====
// «Образ» — это весь внешний вид одним объектом. Отсюда им управляют: готовые профили для
// быстрого старта, именованные пресеты, короткий код для обмена и перенос через settings.json.
// Здесь же предпросмотр образа по наведению: примерить, ничего не сохраняя.

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
            // Превью пресета при наведении: показывает слой «эффекты + палитра».
            var doPrev = (function (nm) { return function () { previewLook(function (snap) { return presetPreviewCfg(snap, presets[nm]); }); }; })(name);
            row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.16)"; doPrev(); });
            row.addEventListener("mouseleave", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.08)"; endLookPreview(); });
            row.addEventListener("focus", doPrev);
            row.addEventListener("blur", function () { endLookPreview(); });
            row.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mlp-fg,#cdd6f4);", name));
            var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8);", "×");
            del.title = t("Удалить пресет");
            row.appendChild(del);
            row.addEventListener("click", function (e) {
                if (del.contains(e.target)) return; // клик по «×» обрабатывается отдельно
                endLookPreview();                    // снять превью, дальше — реальное применение
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

// ===== Профили быстрого старта =====
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
// Совпадает ли текущий вид с профилем: все ключи патча профиля равны текущим значениям cfg.
// Патч трогает enabled/partStyle и по-полям fx/fxp/baseOp — сравниваем ровно эти поля.
function profileMatches(p) {
    try {
        var patch = p.patch, k;
        for (k in patch) {
            if (!patch.hasOwnProperty(k)) continue;
            if (k === "fx" || k === "fxp" || k === "baseOp") {
                for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk) && cfg[k][kk] !== patch[k][kk]) return false;
            } else if (cfg[k] !== patch[k]) return false;
        }
        return true;
    } catch (e) { return false; }
}
// Какой профиль сейчас «активен» (вид точно соответствует его патчу) — или null (правили вручную).
function activeProfileId() {
    for (var i = 0; i < PROFILES.length; i++) if (profileMatches(PROFILES[i])) return PROFILES[i].id;
    return null;
}

// ===== Предпросмотр целого образа при наведении =====
// Наведение на профиль/пресет временно применяет его вид (applyNoSave — без записи в
// localStorage и без шага истории), уход курсора / потеря фокуса — откат к снимку. Так образ
// можно «примерить», не боясь потерять текущий вид. Дебаунс — как у previewSet/previewFx.
// Клик фиксирует выбор через endLookPreview ДО реального применения (иначе mouseleave откатил бы).
var _lookSnap = null, _lookTimer = 0, _lookDelay = 110;
function previewLook(build) {
    if (!cfg.enabled) return;                 // фон выключен — превью не видно, не дёргаем CSS
    if (_lookTimer) clearTimeout(_lookTimer);
    _lookTimer = setTimeout(function () {
        _lookTimer = 0;
        if (_lookSnap === null) _lookSnap = clone(cfg);
        var next; try { next = build(_lookSnap); } catch (e) { next = null; }
        if (!next) return;
        cfg = next; applyNoSave();
    }, _lookDelay);
}
function endLookPreview() {
    if (_lookTimer) { clearTimeout(_lookTimer); _lookTimer = 0; }
    if (_lookSnap === null) return;
    cfg = _lookSnap; _lookSnap = null; applyNoSave();
}
// Образ-конфиг для превью профиля: как applyProfile, но без backup/save/syncGenSets — набор,
// картинки, ui и genSets берём из снимка (превью не свапает фон и не переставляет SETS).
function profilePreviewCfg(snap, p) {
    var raw = clone(snap), patch = p.patch, k;
    for (k in patch) {
        if (!patch.hasOwnProperty(k)) continue;
        if ((k === "fx" || k === "fxp" || k === "baseOp") && raw[k] && typeof raw[k] === "object") {
            for (var kk in patch[k]) if (patch[k].hasOwnProperty(kk)) raw[k][kk] = patch[k][kk];
        } else raw[k] = patch[k];
    }
    return mergeCfg(raw);
}
// Образ-конфиг для превью пресета: применяем сохранённый вид, но НАБОР/картинки/ui/genSets
// оставляем текущими — превью показывает слой «эффекты + сила + палитра», не свапая фон
// и не трогая SETS (полное применение пресета делает клик).
function presetPreviewCfg(snap, presetObj) {
    var next = mergeForeign(presetObj);
    next.ui = snap.ui; next.genSets = snap.genSets; next.mode = snap.mode;
    next.setImg = snap.setImg; next.imgBase = snap.imgBase; next.library = snap.library;
    return next;
}
// UI секции «Профили»: пять карточек-кнопок с названием и коротким описанием. Клик — применить.
// Активный профиль подсвечен акцентной рамкой и помечен «✓ активен», чтобы было
// видно, с какого пресета начат вид; после ручных правок ни один не активен (профиль «изменён»).
function makeProfilesUI() {
    var box = el("div", null);
    var active = activeProfileId();
    box.appendChild(el("div", "padding:2px 3px 6px; color:var(--mlp-faint,#6c7086); font-size:11px;",
        t("Выбери готовый профиль — он настроит вид целиком. Потом всё можно поправить вручную.") +
        (active ? "" : "  " + t("(сейчас: изменён вручную)"))));
    var list = el("div", "display:flex; flex-direction:column; gap:5px;");
    PROFILES.forEach(function (p) {
        var on = (p.id === active);
        var baseBg = on ? "rgba(var(--mlbg-accent-rgb),0.18)" : "rgba(var(--mlbg-accent-rgb),0.08)";
        var row = el("div", "padding:7px 9px; border-radius:8px; cursor:pointer; background:" + baseBg + "; border:1px solid " + (on ? "rgba(var(--mlbg-accent-rgb),0.5)" : "var(--mlp-border-faint,rgba(205,214,244,0.12))") + ";");
        var doPrev = (function (pr) { return function () { previewLook(function (snap) { return profilePreviewCfg(snap, pr); }); }; })(p);
        row.addEventListener("mouseenter", function () { row.style.background = "rgba(var(--mlbg-accent-rgb),0.24)"; doPrev(); });
        row.addEventListener("mouseleave", function () { row.style.background = baseBg; endLookPreview(); });
        row.addEventListener("focus", doPrev);
        row.addEventListener("blur", function () { endLookPreview(); });
        var nameRow = el("div", "display:flex; align-items:center; gap:6px; margin-bottom:2px;");
        nameRow.appendChild(el("div", "flex:1 1 auto; font-weight:600; color:var(--mlp-fg,#cdd6f4);", t(p.name)));
        if (on) nameRow.appendChild(el("div", "flex:0 0 auto; font-size:10px; color:var(--mlbg-accent);", t("✓ активен")));
        row.appendChild(nameRow);
        row.appendChild(el("div", "font-size:10.5px; line-height:1.4; color:var(--mlp-muted,#a6adc8);", t(p.desc)));
        row.addEventListener("click", function () { endLookPreview(); applyProfile(p.id); }); // снять превью, затем применить набело
        keyActivate(row, t("Применить профиль") + ": " + t(p.name) + (on ? " (" + t("активен") + ")" : ""));
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
var SHARE_KEEP = ["ui", "imgBase", "workspaceSets", "autoWorkspace", "ambientBranch", "setImg", "allowRemoteImages", "genSets",
    "branchSets", "autoBranch", "langSets", "autoLang", "library", "librarySlideshow"];
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

// ===== Синхронизация через settings.json =====
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
