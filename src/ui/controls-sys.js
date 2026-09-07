// ===== Контролы вкладок «Терминал» и «Система» =====
// Типографика терминала, язык панели, загрузчик и прозрачность окна, папка с картинками,
// разрешение сетевых картинок, индикатор ветки и мастер-выключатель.

// ==== Контролы секции «Терминал» (работают с cfg.term) ====
function makeTermSelect() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(56), t("Шрифт")));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    TERM_FONTS.forEach(function (f) {
        var o = el("option", null, f); o.value = f; if (f === cfg.term.font) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { cfg.term.font = sel.value; apply(); });
    wrap.appendChild(sel);
    var d = infoDot(INFO["term_font"]); if (d) wrap.appendChild(d);
    return wrap;
}
function makeTermCheck(key, label) {
    return makeToggle(function () { return cfg.term[key]; }, function (v) { cfg.term[key] = v; apply(); }, label, INFO["term_" + key]);
}
function makeTermSlider(key, label, min, max, step, dec) {
    return makeSlider({
        label: label, min: min, max: max, step: step, dec: dec, labelW: 56, ellipsis: false,
        get: function () { return cfg.term[key]; }, onInput: function (v) { cfg.term[key] = v; }, info: INFO["term_" + key],
        def: DEFAULTS.term[key]
    });
}
function makeTermColor(key, label) {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(56), t(label)));
    var ip = el("input", "flex:0 0 auto; width:34px; height:22px; padding:0; border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:6px; background:transparent; cursor:pointer;");
    ip.type = "color"; ip.value = cfg.term[key];
    var hex = el("input", "flex:1 1 auto; min-width:0; background:transparent; border:none; padding:0; color:var(--mlp-faint,#6c7086); font-size:11px; font-family:inherit;");
    hex.type = "text"; hex.value = cfg.term[key]; hex.maxLength = 7; hex.setAttribute("aria-label", t(label) + " HEX");
    ip.addEventListener("input", function () { cfg.term[key] = ip.value; hex.value = ip.value; applyThrottledLive(); });
    ip.addEventListener("change", function () { try { saveCfg(); } catch (e) {} });
    function commitTermHex() {
        var v = hex.value.trim();
        if (isColor(v)) { cfg.term[key] = v; ip.value = v; hex.value = v; apply(); }
        else hex.value = ip.value; // невалидно -> вернуть текущий цвет
    }
    hex.addEventListener("change", commitTermHex);
    hex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commitTermHex(); hex.blur(); } });
    wrap.appendChild(ip); wrap.appendChild(hex);
    var d = infoDot(INFO["term_" + key]); if (d) wrap.appendChild(d);
    return wrap;
}

// Поле «Папка плагина» (cfg.imgBase): база для относительных путей картинок набора.
// Позволяет перенести плагин без правки исходника и пересборки. Пусто -> авто-путь (IMG),
// показанный в placeholder. Значение уходит в url('...') через cssUrl (инъекция исключена).
function makeImgBaseField() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t("Папка")));
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.maxLength = 512;
    ip.value = cfg.imgBase || "";
    ip.placeholder = IMG; // авто-определённый путь как подсказка
    function commit() {
        cfg.imgBase = safeBase(ip.value);
        ip.value = cfg.imgBase; // показать нормализованный вид (с завершающим слэшем)
        apply(); refreshPanel(); // плитки наборов перепроверят загрузку по новому пути
    }
    ip.addEventListener("change", commit);
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
    wrap.appendChild(ip);
    var d = infoDot(INFO.img_base); if (d) wrap.appendChild(d);
    return wrap;
}
// Тумблер «Разрешить сетевые картинки» (cfg.allowRemoteImages). По умолчанию выкл —
// защита от того, что импортированный/чужой конфиг заставит редактор ходить в сеть.
function makeRemoteImagesToggle() {
    return makeToggle(function () { return !!cfg.allowRemoteImages; },
        function (v) { cfg.allowRemoteImages = v; apply(); refreshPanel(); }, "Разрешить сетевые картинки", INFO.allow_remote);
}

// Тумблер полоски-индикатора git-ветки (cfg.ambientBranch). ensureBranchStrip — из boot.js
// (в общей области видимости после склейки), зовём для мгновенной реакции на переключение.
function makeAmbientBranchToggle() {
    return makeToggle(function () { return !!cfg.ambientBranch; },
        function (v) { cfg.ambientBranch = v; apply(); try { ensureBranchStrip(); } catch (e) {} }, "Полоска-индикатор ветки", INFO.ambient_branch);
}

// ==== Язык интерфейса панели (cfg.lang) ====
// Селект «Авто / Русский / English». Смена перестраивает панель (refreshPanel), чтобы все
// подписи сразу перерисовались на новом языке. «Авто» — по языку интерфейса VS Code (uiLang).
function makeLangSelect() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t("Язык панели")));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    var cur = safeLang(cfg.lang);
    LANGS.forEach(function (o) {
        var op = el("option", null, o[1]); op.value = o[0]; if (o[0] === cur) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { cfg.lang = safeLang(sel.value); saveCfg(); try { updateLabel(); } catch (e) {} refreshPanel(); });
    wrap.appendChild(sel);
    return wrap;
}


// ===== Загрузчик и настоящая прозрачность =====
// Скрипт живёт внутри чужого расширения-загрузчика и сам в settings.json писать не может.
// Поэтому здесь — честная картина («чем внедрено, готово ли окно к прозрачности») и кнопки,
// которые кладут в буфер ровно тот кусок настроек, который нужно вставить.
function makeLoaderUI() {
    var box = el("div", "padding:2px 4px;");
    var ld = { id: "custom-css", title: "Custom CSS and JS (be5invis)", sure: false, version: "" };
    try { ld = loaderKind(); } catch (e) {}
    var ready = false;
    try { ready = trueGlassReady(); } catch (e) {}
    var info = el("div", "font-size:11px; color:var(--mlp-muted,#a6adc8); line-height:1.55;");
    info.textContent = t("Загрузчик") + ": " + ld.title + (ld.version ? " " + ld.version : "") +
        (ld.sure ? "" : "  (" + t("определено косвенно") + ")");
    var glass = el("div", "font-size:11px; line-height:1.55; margin-top:2px; color:" + (ready ? "#a6e3a1" : "var(--mlp-muted,#a6adc8)") + ";");
    glass.textContent = ready
        ? t("Окно создано прозрачным — эффект «Настоящая прозрачность» покажет рабочий стол сквозь редактор.")
        : t("Окно непрозрачное. Настоящее стекло умеет только Custom UI Style: скопируй опции ниже в settings.json и перезапусти редактор.");
    var btns = el("div", "display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;");
    var b1 = makeIoBtn(t("Скопировать импорт"));
    b1.addEventListener("click", function () {
        var ok = false;
        try { ok = copyText(loaderImportSnippet()); } catch (e) {}
        toast(ok ? t("Скопировано в буфер — вставь в settings.json") : t("Не удалось скопировать"));
    });
    var b2 = makeIoBtn(t("Скопировать опции прозрачности"));
    b2.addEventListener("click", function () {
        var ok = false;
        try { ok = copyText(trueGlassSnippet()); } catch (e) {}
        toast(ok ? t("Скопировано в буфер — вставь в settings.json и перезапусти редактор") : t("Не удалось скопировать"));
    });
    btns.appendChild(b1); btns.appendChild(b2);
    box.appendChild(info); box.appendChild(glass); box.appendChild(btns);
    return box;
}

// ==== Мастер-выключатель фона и эффектов (cfg.enabled) ====
// Заметный тумблер вверху панели: выкл — «ванильный» VS Code, настройки сохранены.
function makeMasterToggle() {
    var row = el("label",
        "display:flex; align-items:center; gap:8px; padding:8px 10px; margin:2px 2px 4px; border-radius:8px; cursor:pointer;" +
        "background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);");
    var cb = el("input", "flex:0 0 auto; accent-color:var(--mlbg-accent); cursor:pointer; transform:scale(1.15);");
    cb.type = "checkbox"; cb.checked = cfg.enabled !== false;
    var txt = el("span", "flex:1 1 auto; font-weight:700; letter-spacing:0.2px;", cfg.enabled !== false ? t("Фон и эффекты включены") : t("Фон и эффекты выключены"));
    cb.addEventListener("change", function () {
        cfg.enabled = cb.checked;
        txt.textContent = cb.checked ? t("Фон и эффекты включены") : t("Фон и эффекты выключены");
        apply();
    });
    row.appendChild(cb); row.appendChild(txt);
    var d = infoDot(INFO.enabled); if (d) row.appendChild(d);
    return row;
}
