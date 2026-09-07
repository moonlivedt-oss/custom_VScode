// ===== Быстрый переключатель: палитра наборов и эффектов =====
// Панель — это «мастерская»: в ней настраивают. Но в обычной работе нужно другое — сменить
// набор или щёлкнуть эффект, не отрывая рук от клавиатуры и не разглядывая сетку из полусотни
// тумблеров. Здесь ровно тот приём, к которому в VS Code уже привыкли: Ctrl+Alt+P, две-три
// буквы, стрелки, Enter. Отличие от палитры команд — ЖИВОЕ превью: пока идёшь стрелками по
// наборам, фон меняется прямо под курсором, Esc возвращает как было.
//
// Порядок в сборке: после controls.js (нужны previewSet/previewEnd/previewCancel) и до panel.js.

var QUICK_ID = "moonlight-bg-quick";
var quickState = { items: [], view: [], sel: 0, prevFocus: null, prevMode: null };

// Нечёткий поиск подпоследовательностью: "звпр" находит «Звёздный причал». Возвращает
// оценку (чем меньше разрывов и чем ближе к началу — тем лучше) или -1, если не совпало.
// Регистр и «ё/е» нормализуем: пользователь не должен думать о раскладке и точках над е.
function quickNorm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
function quickScore(text, q) {
    q = quickNorm(q);
    if (!q) return 0;
    var t0 = quickNorm(text), i = 0, j = 0, score = 0, last = -1;
    while (i < t0.length && j < q.length) {
        if (t0.charAt(i) === q.charAt(j)) {
            score += (last >= 0 && i === last + 1) ? 0 : 2;  // разрыв дороже, чем подряд идущие буквы
            if (i === 0 || /[\s·-]/.test(t0.charAt(i - 1))) score -= 1; // начало слова — бонус
            last = i; j++;
        }
        i++;
    }
    return j === q.length ? score : -1;
}

// Список того, что вообще можно сделать из палитры. Пересобирается на каждое открытие:
// наборы и эффекты меняются (генератор наборов, переименование), кэшировать нечего.
function quickItems() {
    var out = [], i;
    for (i = 0; i < SETS.length; i++) {
        (function (idx) {
            out.push({
                kind: "set", idx: idx,
                title: setName(idx) || ("#" + idx),
                hint: t(SETS[idx].shader ? "шейдер" : SETS[idx].proc ? "процедурный" : SETS[idx].grad ? "градиент" : "фото"),
                run: function () { previewCancel(); cfg.mode = String(idx); applyFade(); saveCfg(); }
            });
        }(i));
    }
    for (i = 0; i < FX_LIST.length; i++) {
        (function (key, label) {
            out.push({
                kind: "fx", key: key,
                title: t(label),
                hint: t("эффект"),
                state: function () { return !!cfg.fx[key]; },
                run: function () { cfg.fx[key] = !cfg.fx[key]; apply(); toast(t(label) + ": " + (cfg.fx[key] ? t("вкл") : t("выкл"))); }
            });
        }(FX_LIST[i][0], FX_LIST[i][1]));
    }
    out.push({
        kind: "cmd", title: t("Открыть панель"), hint: t("команда"),
        run: function () { try { togglePanel({ stopPropagation: function () {} }); } catch (e) {} }
    });
    out.push({
        kind: "cmd", title: t("Фон включён"), hint: t("команда"),
        run: function () { cfg.enabled = !cfg.enabled; apply(); }
    });
    return out;
}

function quickClose(restore) {
    var box = document.getElementById(QUICK_ID);
    if (box) { try { box.remove(); } catch (e) {} }
    // Esc — вернуть набор, который был до захода в палитру; Enter уже применил свой.
    if (restore) { try { previewEnd(); } catch (e) {} } else { try { previewCancel(); } catch (e) {} }
    try { if (quickState.prevFocus && quickState.prevFocus.focus) quickState.prevFocus.focus(); } catch (e) {}
    quickState.prevFocus = null;
}

function quickRender(box, q) {
    var list = box.querySelector("[data-mlbg-list]");
    if (!list) return;
    list.textContent = "";
    var scored = [], i, sc;
    for (i = 0; i < quickState.items.length; i++) {
        sc = quickScore(quickState.items[i].title + " " + quickState.items[i].hint, q);
        if (sc >= 0) scored.push({ it: quickState.items[i], sc: sc });
    }
    scored.sort(function (a, b) { return a.sc - b.sc; });
    quickState.view = scored.slice(0, 40).map(function (x) { return x.it; });
    if (quickState.sel >= quickState.view.length) quickState.sel = 0;
    for (i = 0; i < quickState.view.length; i++) {
        (function (it, n) {
            var row = el("div", "display:flex; align-items:center; gap:8px; padding:5px 10px; border-radius:6px; cursor:pointer;" +
                (n === quickState.sel ? " background:rgba(var(--mlbg-accent-rgb),0.20);" : ""));
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", n === quickState.sel ? "true" : "false");
            var name = el("span", "flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", it.title);
            var badge = el("span", "flex:0 0 auto; font-size:10px; color:var(--mlp-muted,#a6adc8);", it.hint);
            if (it.kind === "fx") {
                var dot = el("span", "flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:" +
                    (it.state() ? "var(--mlbg-accent)" : "rgba(205,214,244,0.25)") + ";");
                row.appendChild(dot);
            }
            row.appendChild(name); row.appendChild(badge);
            row.addEventListener("mouseenter", function () { quickState.sel = n; quickPaint(box); quickPreview(); });
            row.addEventListener("mousedown", function (e) { e.preventDefault(); quickRun(); });
            list.appendChild(row);
        }(quickState.view[i], i));
    }
    if (!quickState.view.length) list.appendChild(el("div", "padding:8px 10px; color:var(--mlp-muted,#a6adc8);", t("Ничего не найдено")));
}
// Перерисовать только подсветку выбранной строки (без пересборки списка).
function quickPaint(box) {
    var rows = box.querySelectorAll("[data-mlbg-list] > div"), i;
    for (i = 0; i < rows.length; i++) {
        rows[i].style.background = (i === quickState.sel) ? "rgba(var(--mlbg-accent-rgb),0.20)" : "transparent";
        rows[i].setAttribute("aria-selected", i === quickState.sel ? "true" : "false");
    }
    var cur = rows[quickState.sel];
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: "nearest" }); } catch (e) {} }
}
// Живое превью набора под курсором выбора. Для эффектов и команд превью нет — переключать
// их «на посмотреть» было бы неожиданно (эффект применился бы и без Enter).
function quickPreview() {
    var it = quickState.view[quickState.sel];
    if (it && it.kind === "set") previewSet(it.idx);
    else previewEnd();
}
function quickRun() {
    var it = quickState.view[quickState.sel];
    if (!it) return;
    quickClose(false);
    try { it.run(); } catch (e) {}
}

function openQuick() {
    if (document.getElementById(QUICK_ID)) { quickClose(true); return; }
    quickState.items = quickItems();
    quickState.sel = 0;
    try { quickState.prevFocus = document.activeElement; } catch (e) {}
    var box = el("div", "position:fixed; top:12%; left:50%; transform:translateX(-50%); z-index:100002;" +
        " width:min(520px, 86vw); border-radius:10px; overflow:hidden;" +
        " background:var(--mlp-bg,rgba(30,30,46,0.97)); color:var(--mlp-fg,#cdd6f4);" +
        " border:1px solid var(--mlp-border,rgba(205,214,244,0.2)); box-shadow:0 18px 48px rgba(0,0,0,0.55);" +
        " font-family:var(--vscode-font-family,sans-serif); font-size:12px;");
    box.id = QUICK_ID;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", t("Быстрый переключатель"));
    var inp = el("input", fieldStyle(" display:block; width:100%; box-sizing:border-box; border:0; border-bottom:1px solid var(--mlp-border,rgba(205,214,244,0.2)); border-radius:0; padding:9px 11px; font-size:12.5px; outline:none;"));
    inp.type = "text";
    inp.placeholder = t("Набор, эффект или команда…");
    inp.setAttribute("aria-label", t("Набор, эффект или команда…"));
    inp.setAttribute("role", "combobox");
    inp.setAttribute("aria-expanded", "true");
    var list = el("div", "max-height:46vh; overflow:auto; padding:5px;");
    list.setAttribute("data-mlbg-list", "1");
    list.setAttribute("role", "listbox");
    box.appendChild(inp); box.appendChild(list);
    document.body.appendChild(box);
    quickRender(box, "");
    inp.addEventListener("input", function () { quickState.sel = 0; quickRender(box, quickNorm(inp.value)); quickPreview(); });
    inp.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); quickState.sel = Math.min(quickState.view.length - 1, quickState.sel + 1); quickPaint(box); quickPreview(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); quickState.sel = Math.max(0, quickState.sel - 1); quickPaint(box); quickPreview(); }
        else if (e.key === "Home") { e.preventDefault(); quickState.sel = 0; quickPaint(box); quickPreview(); }
        else if (e.key === "End") { e.preventDefault(); quickState.sel = Math.max(0, quickState.view.length - 1); quickPaint(box); quickPreview(); }
        else if (e.key === "Enter") { e.preventDefault(); quickRun(); }
        else if (e.key === "Escape") { e.preventDefault(); quickClose(true); }
    });
    // Клик мимо окна — закрыть с откатом превью (как Esc).
    setTimeout(function () {
        try {
            document.addEventListener("mousedown", function onOut(ev) {
                var b = document.getElementById(QUICK_ID);
                if (!b) { document.removeEventListener("mousedown", onOut, true); return; }
                if (!b.contains(ev.target)) { document.removeEventListener("mousedown", onOut, true); quickClose(true); }
            }, true);
        } catch (e) {}
    }, 0);
    try { inp.focus(); } catch (e) {}
}
