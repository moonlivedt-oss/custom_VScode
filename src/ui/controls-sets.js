// ===== Контролы вкладки «Набор» =====
// Всё, что относится к выбору и источнику фона: плитки наборов с превью, переименование,
// генератор по seed, слайд-шоу, библиотека своих картинок, контекстные привязки (проект,
// ветка, язык файла), время суток, витрина и поле своего шейдера.

// ===== Предпросмотр набора при наведении =====
// Наведение на чип «примеряет» его набор к фону и акценту, не сохраняя cfg. Работает
// через previewMode (см. state.js): activeIndex начинает возвращать превью-набор, поэтому
// сохранённый cfg.mode не трогается, а превью работает и в «случайно», и при «фоне по
// проекту». Смена мягкая (fadeSwap — фон проступает плавно, не прыгает).
//
// Наведение дебаунсим (_previewDelay): пока курсор просто проезжает по ряду чипов, превью
// не дёргается на каждом; оно включается, только если задержаться на чипе. previewCancel
// снимает и отложенное, и активное превью (нужно на клике и при закрытии панели, т.к.
// удалённый из DOM чип не всегда шлёт mouseleave — иначе превью «залипло» бы).
var _previewTimer = 0, _previewDelay = 70;
function previewSet(idx) {
    if (!cfg.enabled) return;                 // фон выключен — превью не видно, не дёргаем CSS
    if (previewMode === idx) return;          // уже показываем этот набор
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(function () {
        _previewTimer = 0; previewMode = idx; fadeSwap();
    }, _previewDelay);
}
function previewEnd() {
    if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
    if (previewMode === null) return;
    previewMode = null; fadeSwap();
}
// Снять превью без плавного возврата (курсор ушёл с чипа насовсем): используется на
// клике (фиксируем выбор — mouseleave после клика не должен ничего откатывать) и при
// закрытии панели. applyFade/refreshPanel далее сами перерисуют фон под выбранный набор.
function previewCancel() {
    if (_previewTimer) { clearTimeout(_previewTimer); _previewTimer = 0; }
    previewMode = null;
}

// health-check: помечаем чип, если картинка набора не грузится. Не грузим картинки сами —
// подписываемся на общую пробу (onImage), которую использует и генерация CSS: один Image на URL.
function probeSet(idx, chip) {
    ["editor", "sidebar", "panel"].forEach(function (zone) {
        var u = zoneUrl(idx, zone);
        if (!u) return;                       // у зоны нет картинки по замыслу набора — проверять нечего
        onImage(u, function (st) {
            if (st.ok || st.none) return;
            chip.style.border = "1px solid #f38ba8";
            chip.style.boxShadow = "inset 0 0 0 1px rgba(243,139,168,0.55)";
            chip.title = t("Не грузится: ") + setImage(idx, zone);
            var b = chip.querySelector(".mlbg-bad"); if (!b) { b = el("span", "position:absolute; top:1px; left:3px; color:#f38ba8; font-weight:700;", "!"); b.className = "mlbg-bad"; chip.appendChild(b); }
        });
    });
}

// чип набора с превью-миниатюрой (мини-триптих зон)
function makeChip(mode, label) {
    var active = cfg.mode === mode, isSet = mode !== "random";
    var css = isSet
        ? "position:relative; width:48px; height:32px; border-radius:7px; overflow:hidden; cursor:pointer;" +
          "background-position:center; background-size:cover;" +
          "border:2px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
          (active ? "box-shadow:0 0 0 2px rgba(var(--mlbg-accent-rgb),0.35);" : "")
        : "min-width:24px; padding:4px 10px; border-radius:7px; cursor:pointer; user-select:none; text-align:center;" +
          "font-weight:" + (active ? "600" : "400") + ";" +
          "border:1px solid " + (active ? "var(--mlbg-accent)" : "var(--mlp-border-soft,rgba(205,214,244,0.16))") + ";" +
          "background:" + (active ? "rgba(var(--mlbg-accent-rgb),0.28)" : "transparent") + "; color:" + (active ? "#f2e6ff" : "var(--mlp-fg,#cdd6f4)") + ";";
    var c = el("div", css, isSet ? null : label);
    if (isSet) {
        var idx = parseInt(mode, 10);
        var s = SETS[idx];
        // Мини-триптих: три вертикальные полоски с превью зон (редактор / сайдбар / панель),
        // чтобы собирать наборы на глаз. Полоски — фон chip как запасной вариант (editor).
        // Генеративный набор — рисуем полоски градиентом (нет картинок и 404-проверки).
        var grad = isGradSet(idx), proc = isProcSet(idx);
        // Шейдерный набор: картинок нет, кадр считает GPU. На чипе показываем ту же запасную
        // палитру, которой набор рисуется без WebGL, — так плитка выглядит как набор, а не
        // как «сломанная картинка».
        var shader = (typeof isShaderSet === "function") && isShaderSet(idx);
        // Процедурный набор: одна текстура на все зоны — красим ей и чип, и полоски (или
        // запасным градиентом, если текстуру не удалось нарисовать).
        var procCss = proc ? (function () { var u = procTexture(idx); return u ? cssUrl(u) + " center / cover no-repeat" : procFallback(idx, "editor"); })() : null;
        var ZK = ["editor", "sidebar", "panel"];
        // Чип 48×32 не должен держать полноразмерный JPEG фоновым слоем (100–250 КБ × зоны ×
        // наборы = мегабайты, и всё заново при каждой пересборке панели). Кладём акцентный
        // плейсхолдер, а как только проба картинки готова — подставляем компактный data-URL
        // из probeImage.thumb (второй загрузки нет). Сетевая/битая картинка -> остаётся плейсхолдер.
        function paintZone(node, zone) {
            var url = zoneUrl(idx, zone);
            node.style.background = "rgba(var(--mlbg-accent-rgb),0.14)";
            node.style.backgroundPosition = "center"; node.style.backgroundSize = "cover";
            onImage(url, function (st) { if (st && st.thumb) node.style.backgroundImage = cssUrl(st.thumb); });
        }
        if (proc) c.style.background = procCss;
        else if (grad) c.style.background = gradFor(idx, "editor");
        else if (shader) c.style.background = shaderBg(idx, "editor");
        else paintZone(c, "editor");
        for (var zi = 0; zi < 3; zi++) {
            var strip = el("div",
                "position:absolute; top:0; bottom:0; width:33.34%; left:" + (zi * 33.33) + "%;" +
                "background-position:center; background-size:cover;" +
                (zi ? "box-shadow:inset 1px 0 0 rgba(0,0,0,0.35);" : ""));
            if (proc) strip.style.background = procCss;
            else if (grad) strip.style.background = gradFor(idx, ZK[zi]);
            else if (shader) strip.style.background = shaderBg(idx, ZK[zi]);
            else paintZone(strip, ZK[zi]);
            c.appendChild(strip);
        }
        var num = el("span", "position:absolute; right:3px; bottom:1px; z-index:2; font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.95);", label);
        c.appendChild(num);
        var nm = setName(idx); if (nm) c.title = idx + " · " + nm + t(" (редактор · сайдбар · панель)");
        if (!grad && !proc && !shader) probeSet(idx, c);
        if (!active) {
            // Превью набора и по мыши (mouseenter/leave), и с клавиатуры (focus/blur) —
            // паритет доступности: пользователь, идущий по чипам с Tab, тоже «примеряет»
            // набор, а не выбирает вслепую. previewSet дебаунсит, previewEnd мягко возвращает.
            var hoverOn = function () { c.style.borderColor = "rgba(var(--mlbg-accent-rgb),0.6)"; previewSet(idx); };
            var hoverOff = function () { c.style.borderColor = "var(--mlp-border-soft,rgba(205,214,244,0.16))"; previewEnd(); };
            c.addEventListener("mouseenter", hoverOn);
            c.addEventListener("mouseleave", hoverOff);
            c.addEventListener("focus", hoverOn);
            c.addEventListener("blur", hoverOff);
        }
    } else if (!active) {
        c.addEventListener("mouseenter", function () { c.style.background = "rgba(var(--mlbg-accent-rgb),0.14)"; });
        c.addEventListener("mouseleave", function () { c.style.background = "transparent"; });
    }
    c.addEventListener("click", function () {
        previewCancel(); // фиксируем выбор: mouseleave после клика не откатит фон обратно
        if (mode === "random") sessionRandomIndex = pickRandom();
        cfg.mode = mode;
        // «Фон по проекту» включён и выбран конкретный набор — закрепляем его за текущей папкой,
        // чтобы этот проект и дальше открывался с этим набором.
        if (cfg.autoWorkspace && /^\d+$/.test(mode)) {
            var wn = workspaceName();
            if (wn && DANGEROUS_KEYS.indexOf(wn) < 0) { if (!cfg.workspaceSets) cfg.workspaceSets = {}; cfg.workspaceSets[wn] = mode; }
        }
        applyFade(); refreshPanel();
    });
    keyActivate(c, isSet ? (t("Набор ") + label + (setName(parseInt(mode, 10)) ? " — " + setName(parseInt(mode, 10)) : "")) : t("Случайный набор"));
    c.setAttribute("aria-pressed", active ? "true" : "false"); // какой набор выбран — для скринридера
    return c;
}

// Переименование АКТИВНОГО набора (cfg.setName[idx]). Имя уходит в textContent/title
// (кнопка BG, чипы, списки), поэтому CSS-инъекция не грозит — только ограничение длины.
function makeSetNameEdit() {
    var wrap = el("div", ST.row + " margin-top:6px;");
    wrap.appendChild(el("span", mutedLabel(56), t("Имя")));
    var ip = el("input", fieldStyle(" padding:3px 6px;"));
    ip.type = "text"; ip.maxLength = 40;
    var idx = activeIndex();
    ip.value = setName(idx);
    ip.placeholder = t("Набор ") + idx;
    function commit() {
        var v = ip.value.trim().slice(0, 40);
        var i = activeIndex();
        if (!cfg.setName) cfg.setName = {};
        if (v) cfg.setName[i] = v; else delete cfg.setName[i]; // пусто -> вернуть родное имя
        apply();
        // Обновляем только зависимые подписи, панель не пересобираем — иначе поле
        // потеряет фокус на каждом Enter. Чипы обновятся при следующем открытии панели.
    }
    ip.addEventListener("change", commit);
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(); ip.blur(); } });
    wrap.appendChild(ip);
    var d = infoDot(INFO.set_name); if (d) wrap.appendChild(d);
    return wrap;
}

// ===== Генератор набора по seed/палитре =====
// Поле «seed или #rrggbb» + кнопки «Сгенерировать» / «Случайный». Из ввода строим
// согласованный градиентный набор (genSetFromSeed), кладём его в хвост наборов (addGenSet:
// правит cfg.genSets + SETS, сохраняется в localStorage) и сразу делаем активным. Пока есть
// сгенерированные наборы — доступна «Очистить» (removeGenSets убирает их из хвоста и чистит
// висячие привязки). Один seed всегда даёт один и тот же набор — им можно делиться текстом.
function makeGenerator() {
    var wrap = el("div");
    // маленькая кнопка в стиле «из картинки»
    function btn(label, title) {
        var b = el("div", "flex:0 0 auto; padding:3px 9px; border-radius:6px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.14); border:1px solid rgba(var(--mlbg-accent-rgb),0.3);", label);
        if (title) b.title = title;
        keyActivate(b, title || label);
        return b;
    }
    var row = el("div", ST.row);
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.maxLength = 40; ip.placeholder = "seed / #rrggbb";
    ip.setAttribute("aria-label", t("Seed или базовый цвет набора"));
    row.appendChild(ip);
    wrap.appendChild(row);

    // Применить сгенерированный набор: добавить в хвост и сделать активным.
    function makeAndApply(seed) {
        var idx = addGenSet(genSetFromSeed(seed));
        if (idx === -2) { toast(t("Достигнут предел сгенерированных наборов (") + GEN_MAX + ")", false); return; }
        if (idx < 0) { toast(t("Не удалось создать набор"), false); return; }
        cfg.mode = String(idx);
        applyFade(); refreshPanel();
        toast(t("Набор создан: ") + setName(idx));
    }

    var gen = btn(t("Сгенерировать"), t("Создать набор из seed/цвета в поле"));
    gen.addEventListener("click", function () { makeAndApply(ip.value); });
    var rnd = btn(t("Случайный"), t("Случайный согласованный набор"));
    rnd.addEventListener("click", function () { ip.value = ""; makeAndApply(""); });
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); makeAndApply(ip.value); } });

    var btns = el("div", "display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;");
    btns.appendChild(gen); btns.appendChild(rnd);
    if (cfg.genSets && cfg.genSets.length) {
        var clr = btn(t("Очистить (") + cfg.genSets.length + ")", t("Убрать все сгенерированные наборы"));
        clr.style.color = "#f38ba8"; clr.style.background = "rgba(243,139,168,0.14)"; clr.style.borderColor = "rgba(243,139,168,0.3)";
        clr.addEventListener("click", function () {
            backupCfg();          // на случай «ой, не то» — «Восстановить» в «Система» вернёт
            removeGenSets();
            applyFade(); refreshPanel();
            toast(t("Сгенерированные наборы убраны"));
        });
        btns.appendChild(clr);
    }
    wrap.appendChild(btns);
    return wrap;
}

// ==== Витрина / скринсейвер при простое (cfg.screensaver) ====
function makeScreensaverToggle() {
    return makeToggle(
        function () { return !!(cfg.screensaver && cfg.screensaver.on); },
        function (v) {
            if (!cfg.screensaver) cfg.screensaver = { on: false, min: 5 };
            cfg.screensaver.on = v; try { screensaverBump(); } catch (e) {} apply();
            try { refreshPanel(); } catch (e) {} // «Простой, мин» есть только при включённой витрине
        }, "Включить", INFO.screensaver);
}

function makeSlideToggle() {
    // Ползунок интервала показывается только при включённом слайд-шоу, поэтому после
    // переключения пересобираем панель — иначе он появился бы лишь при следующем открытии.
    return makeToggle(function () { return cfg.slideshow.on; }, function (v) {
        cfg.slideshow.on = v; slideReset(); apply();
        try { refreshPanel(); } catch (e) {}
    }, "Включить", INFO.slide_on);
}

// ==== Библиотека картинок (cfg.library / cfg.librarySlideshow) ====
// Тумблер «крутить библиотеку в редакторе» + добавление локальных путей + список с удалением.
// Смена картинок идёт по таймеру слайдшоу (libraryTick). Пути уходят в url('...') через cssUrl.
function makeLibraryUI() {
    var box = el("div", null);
    box.appendChild(makeToggle(function () { return !!cfg.librarySlideshow; },
        function (v) { cfg.librarySlideshow = v; try { libraryReset(); } catch (e) {} apply(); refreshPanel(); },
        "Крутить библиотеку в редакторе", INFO.library));
    var row = el("div", ST.row);
    var ip = el("input", fieldStyle(" padding:3px 6px; font-size:11px;"));
    ip.type = "text"; ip.maxLength = 1024; ip.placeholder = "file:///… , vscode-file://…"; ip.setAttribute("aria-label", t("Путь картинки"));
    var addB = el("div", "flex:0 0 auto; padding:5px 10px; border-radius:7px; cursor:pointer; font-weight:600; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Добавить"));
    function addPath() {
        var v = ip.value.trim().slice(0, 1024); if (!v) return;
        if (!Array.isArray(cfg.library)) cfg.library = [];
        if (cfg.library.length >= 64) { toast(t("Слишком много картинок (макс. 64)"), false); return; }
        cfg.library.push(v); ip.value = ""; apply(); refreshPanel();
    }
    addB.addEventListener("click", addPath); keyActivate(addB, t("Добавить"));
    ip.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addPath(); } });
    row.appendChild(ip); row.appendChild(addB);
    box.appendChild(row);
    var lib = Array.isArray(cfg.library) ? cfg.library : [];
    if (!lib.length) {
        box.appendChild(el("div", "padding:6px 3px 2px; color:var(--mlp-faint,#6c7086); font-size:11px;", t("Список пуст — добавь пути к своим картинкам.")));
    } else {
        var list = el("div", "display:flex; flex-direction:column; gap:4px; margin-top:6px;");
        lib.forEach(function (u, i) {
            var r = el("div", "display:flex; align-items:center; gap:6px; padding:4px 7px; border-radius:6px; background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
            r.appendChild(el("div", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; direction:rtl; text-align:left; color:var(--mlp-fg,#cdd6f4); font-size:11px;", u));
            var del = el("div", "flex:0 0 auto; width:18px; height:18px; line-height:16px; text-align:center; border-radius:5px; color:var(--mlp-muted,#a6adc8); cursor:pointer;", "×");
            del.addEventListener("click", function () { cfg.library.splice(i, 1); apply(); refreshPanel(); });
            keyActivate(del, t("Удалить"));
            r.appendChild(del); list.appendChild(r);
        });
        box.appendChild(list);
    }
    return box;
}

// ==== Фон по проекту (cfg.autoWorkspace / cfg.workspaceSets) ====
// Тумблер + имя текущего проекта + возможность «забыть» закрепление. Само закрепление
// набора за проектом происходит кликом по набору, когда режим включён (см. makeChip).
function makeWorkspaceUI() {
    var box = el("div", null);
    box.appendChild(makeToggle(function () { return !!cfg.autoWorkspace; },
        function (v) { cfg.autoWorkspace = v; apply(); refreshPanel(); }, "Включить", INFO.workspace_on));
    var name = workspaceName();
    box.appendChild(el("div", "padding:4px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
        name ? (t("Проект: ") + name) : t("Проект не определён — открыта ли папка?")));
    var pinned = (name && cfg.workspaceSets) ? cfg.workspaceSets[name] : null;
    if (name && pinned != null) {
        box.appendChild(el("div", "padding:2px 3px 4px; color:var(--mlp-muted,#a6adc8); font-size:11px;",
            t("Закреплён набор ") + pinned + (setName(parseInt(pinned, 10)) ? " · " + setName(parseInt(pinned, 10)) : "")));
        var forget = el("div", "margin-top:2px; padding:6px; text-align:center; border-radius:7px; cursor:pointer; font-size:11px; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.12); border:1px solid rgba(var(--mlbg-accent-rgb),0.28);", t("Забыть закрепление за проектом"));
        forget.addEventListener("click", function () { if (cfg.workspaceSets) delete cfg.workspaceSets[name]; apply(); refreshPanel(); });
        keyActivate(forget, t("Забыть закрепление набора за проектом"));
        box.appendChild(forget);
    } else if (name && cfg.autoWorkspace) {
        box.appendChild(el("div", "padding:2px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
            t("Выбери набор выше — он закрепится за этим проектом.")));
    }
    return box;
}
// ==== Фон по контексту (git-ветка / язык файла) — общий построитель ====
// Тумблер + текущий ключ (имя ветки или расширение файла) + выбор набора для этого ключа
// («—» = не закреплять / забыть). Ветка/расширение читаются из DOM (gitBranch/editorFileExt);
// без них показываем подсказку и прячем выбор набора. opts: flag (поле-флаг cfg), map (поле-
// карта cfg), read() -> текущий ключ, info, toggle/detected/none/pin — метки (переводятся).
function makeCtxAutoUI(opts) {
    var box = el("div", null);
    box.appendChild(makeToggle(
        function () { return !!cfg[opts.flag]; },
        function (v) { cfg[opts.flag] = v; apply(); refreshPanel(); },
        opts.toggle, opts.info));
    var key = ""; try { key = opts.read() || ""; } catch (e) {}
    box.appendChild(el("div", "padding:4px 3px; color:var(--mlp-faint,#6c7086); font-size:11px;",
        key ? (t(opts.detected) + key) : t(opts.none)));
    if (key && cfg[opts.flag]) {
        var wrap = el("div", ST.row);
        wrap.appendChild(el("span", mutedLabel(96, true), t(opts.pin)));
        var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
        var cur = (cfg[opts.map] && cfg[opts.map][key] != null) ? String(cfg[opts.map][key]) : "";
        var none = el("option", null, "—"); none.value = ""; sel.appendChild(none);
        for (var i = 0; i < SETS.length; i++) {
            var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
            if (o.value === cur) o.selected = true; sel.appendChild(o);
        }
        sel.addEventListener("change", function () {
            if (!cfg[opts.map]) cfg[opts.map] = {};
            if (sel.value === "") delete cfg[opts.map][key]; else cfg[opts.map][key] = sel.value;
            applyFade(); refreshPanel();
        });
        wrap.appendChild(sel);
        box.appendChild(wrap);
    }
    return box;
}
function makeBranchAutoUI() {
    return makeCtxAutoUI({
        flag: "autoBranch", map: "branchSets", info: INFO.auto_branch,
        read: function () { return (typeof gitBranch === "function") ? gitBranch() : ""; },
        toggle: "Фон по ветке", detected: "Ветка: ", none: "Ветка не определена — открыт ли git-репозиторий?",
        pin: "Набор для ветки"
    });
}
function makeLangAutoUI() {
    return makeCtxAutoUI({
        flag: "autoLang", map: "langSets", info: INFO.auto_lang,
        read: function () { return (typeof editorFileExt === "function") ? editorFileExt() : ""; },
        toggle: "Фон по языку файла", detected: "Расширение: .", none: "Файл не определён — открыт ли редактор?",
        pin: "Набор для расширения"
    });
}
// Режим границ дня для авто-набора по времени: по фиксированным часам или по рассвету/закату.
function makeAutoTimeMode() {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t("Границы дня")));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    var cur = (cfg.autoTime && cfg.autoTime.mode === "sun") ? "sun" : "hours";
    [["hours", "Часы"], ["sun", "Рассвет/закат"]].forEach(function (o) {
        var op = el("option", null, t(o[1])); op.value = o[0]; if (o[0] === cur) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener("change", function () {
        if (!cfg.autoTime) cfg.autoTime = clone(DEFAULTS.autoTime);
        cfg.autoTime.mode = (sel.value === "sun") ? "sun" : "hours";
        apply(); if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} } refreshPanel();
    });
    wrap.appendChild(sel);
    var d = infoDot(INFO.autotime_mode); if (d) wrap.appendChild(d);
    return wrap;
}

// ===== Свой GLSL для шейдерного набора =====
// Набор «Свой шейдер» рисует то, что здесь написано: тело фрагментного шейдера с функцией
// vec3 render(vec2 p). Доступны uniform-ы u_time, u_res, u_accent, u_base, u_mouse.
// Ошибка компиляции не ломает редактор — слой молча откатывается на встроенное «Сияние».
function makeShaderSrcUI() {
    var box = el("div", "padding:2px 4px;");
    var hint = el("div", "font-size:10.5px; color:var(--mlp-muted,#a6adc8); line-height:1.5; margin-bottom:4px;",
        t("Тело фрагментного шейдера: функция vec3 render(vec2 p). Доступны u_time, u_res, u_accent, u_base, u_mouse. Выбери набор «Свой шейдер», чтобы увидеть результат."));
    // Секция относится к одному конкретному набору. Если сейчас выбран другой, поле выглядит
    // так, будто ничего не делает, — поэтому прямо говорим об этом и даём переключиться.
    var customIdx = -1;
    for (var ci = 0; ci < SETS.length; ci++) if (SETS[ci].shader === "custom") { customIdx = ci; break; }
    if (customIdx >= 0 && activeIndex() !== customIdx) {
        var note = el("div", "display:flex; align-items:center; gap:8px; margin-bottom:6px; padding:5px 8px; border-radius:7px; font-size:11px; color:var(--mlp-muted,#a6adc8); background:rgba(var(--mlbg-accent-rgb),0.08); border:1px solid var(--mlp-border-faint,rgba(205,214,244,0.12));");
        note.appendChild(el("span", ST.fill, t("Шейдер рисуется только в наборе «Свой шейдер» — сейчас выбран другой.")));
        var go = el("span", "flex:0 0 auto; padding:2px 8px; border-radius:6px; cursor:pointer; color:var(--mlbg-accent); background:rgba(var(--mlbg-accent-rgb),0.16); border:1px solid rgba(var(--mlbg-accent-rgb),0.32);", t("Выбрать"));
        go.addEventListener("click", function () {
            previewCancel(); cfg.mode = String(customIdx); applyFade(); saveCfg();
            try { refreshPanel(); } catch (e) {}
        });
        keyActivate(go, t("Выбрать набор «Свой шейдер»"));
        note.appendChild(go);
        box.appendChild(note);
    }
    var ta = el("textarea", fieldStyle(" display:block; width:100%; box-sizing:border-box; padding:6px 8px; font-family:var(--vscode-editor-font-family,monospace); font-size:10.5px; min-height:96px; resize:vertical;"));
    ta.value = typeof cfg.shaderSrc === "string" ? cfg.shaderSrc : "";
    ta.placeholder = "vec3 render(vec2 p){ return mix(u_base, u_accent, 0.5 + 0.5*sin(p.x*3.0 + u_time)); }";
    ta.setAttribute("aria-label", t("Свой GLSL-шейдер"));
    var row = el("div", "display:flex; gap:6px; margin-top:6px;");
    var save = makeIoBtn(t("Применить шейдер"));
    save.addEventListener("click", function () {
        cfg.shaderSrc = String(ta.value || "").slice(0, 8000);
        saveCfg();
        try { shd.failed = false; shaderStop(); ensureShader(); } catch (e) {}
        toast(cfg.shaderSrc ? t("Шейдер применён") : t("Шейдер сброшен на встроенный"));
    });
    var reset = makeIoBtn(t("Очистить"));
    reset.addEventListener("click", function () {
        ta.value = ""; cfg.shaderSrc = ""; saveCfg();
        try { shd.failed = false; shaderStop(); ensureShader(); } catch (e) {}
        toast(t("Шейдер сброшен на встроенный"));
    });
    row.appendChild(save); row.appendChild(reset);
    box.appendChild(hint); box.appendChild(ta); box.appendChild(row);
    return box;
}


// ==== Авто-набор по времени суток (cfg.autoTime) ====
// Тумблер «включить» + два выпадающих списка: набор для дня и для ночи.
// Днём (8:00–20:00) активируется дневной набор, ночью — ночной (см. timeTick).
function makeAutoTimeToggle() {
    return makeToggle(
        function () { return !!(cfg.autoTime && cfg.autoTime.on); },
        function (v) {
            if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
            cfg.autoTime.on = v; apply();
            if (v) { try { timeTick(); } catch (e) {} } // сразу применить нужный набор
        },
        "Включить", INFO.autotime_on
    );
}
// Выпадающий список наборов (для выбора дневного/ночного). which — "day" | "night".
function makeSetPicker(which, label) {
    var wrap = el("div", ST.row);
    wrap.appendChild(el("span", mutedLabel(92), t(label)));
    var sel = el("select", fieldStyle(" padding:3px 4px; cursor:pointer;"));
    for (var i = 0; i < SETS.length; i++) {
        var o = el("option", null, i + " · " + setName(i)); o.value = String(i);
        if (cfg.autoTime && cfg.autoTime[which] === i) o.selected = true;
        sel.appendChild(o);
    }
    sel.addEventListener("change", function () {
        if (!cfg.autoTime) cfg.autoTime = { on: false, day: 0, night: 4, from: 8, to: 20 };
        cfg.autoTime[which] = parseInt(sel.value, 10); apply();
        if (cfg.autoTime.on) { try { timeTick(); } catch (e) {} }
    });
    wrap.appendChild(sel);
    return wrap;
}
