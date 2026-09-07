// ===== Как строится тема =====
// Палитра активного набора -> настоящий color-theme.json. Нужен там, где фон недоступен
// (веб, Codespaces, чужая машина): цвета интерфейса и подсветка синтаксиса переносятся,
// даже когда картинку показать нельзя.

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
