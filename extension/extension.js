// ============================================================
//  MoonLight custom-bg — тонкое расширение авто-настройки.
//  Задача: избавить от ручной правки settings.json. При активации оно прописывает путь к
//  custom-bg.js в vscode_custom_css.imports (глобальные настройки) и, если Custom CSS ещё не
//  включён, предлагает включить. Сам фон рисует be5invis.vscode-custom-css (в зависимостях).
//
//  ВАЖНО (упаковка): при сборке .vsix в папку расширения нужно положить рядом собранный
//  custom-bg.js и папку assets/ (например, скопировать из корня репозитория). Тогда путь
//  ниже (context.extensionPath/custom-bg.js) укажет на файл внутри установленного расширения.
//  Для запуска из исходников (F5) есть откат на custom-bg.js в родительской папке репозитория.
// ============================================================
"use strict";
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const IMPORTS_KEY = "vscode_custom_css.imports";

// file:///-URL к custom-bg.js: прямые слэши, на Windows — третий слэш перед буквой диска.
function fileUrl(p) {
    const abs = path.resolve(p).replace(/\\/g, "/");
    return "file:///" + abs.replace(/^\/+/, "");
}

// Путь к собранному custom-bg.js: сначала внутри расширения (упакованный), иначе — в корне
// репозитория на уровень выше (запуск из исходников через F5).
function resolveScript(context) {
    const packed = path.join(context.extensionPath, "custom-bg.js");
    if (fs.existsSync(packed)) return packed;
    const repo = path.join(context.extensionPath, "..", "custom-bg.js");
    if (fs.existsSync(repo)) return repo;
    return packed; // покажем в сообщении, даже если файла нет — подскажет, что не собрано
}

async function ensureImport(context) {
    const script = resolveScript(context);
    if (!fs.existsSync(script)) {
        vscode.window.showErrorMessage("MoonLight BG: не найден custom-bg.js. Собери проект (node build.js) и положи его рядом с расширением.");
        return;
    }
    const url = fileUrl(script);
    const cfg = vscode.workspace.getConfiguration();
    const cur = cfg.get(IMPORTS_KEY);
    const arr = Array.isArray(cur) ? cur.slice() : [];
    const exists = arr.some((u) => typeof u === "string" && u.toLowerCase() === url.toLowerCase());
    if (!exists) {
        arr.push(url);
        await cfg.update(IMPORTS_KEY, arr, vscode.ConfigurationTarget.Global);
    }
    // Подсказка включить Custom CSS (команда самого be5invis.vscode-custom-css).
    const pick = await vscode.window.showInformationMessage(
        exists ? "MoonLight BG уже прописан. Включить Custom CSS и перезапустить?"
               : "MoonLight BG прописан в настройки. Включить Custom CSS и перезапустить?",
        "Включить Custom CSS", "Позже"
    );
    if (pick === "Включить Custom CSS") {
        try { await vscode.commands.executeCommand("extension.installCustomCSS"); }
        catch (e) { vscode.window.showWarningMessage("Не удалось вызвать команду включения. Открой палитру и запусти «Enable Custom CSS and JS» вручную."); }
    }
}

async function removeImport(context) {
    const url = fileUrl(resolveScript(context));
    const cfg = vscode.workspace.getConfiguration();
    const cur = cfg.get(IMPORTS_KEY);
    if (!Array.isArray(cur)) { vscode.window.showInformationMessage("MoonLight BG: импортов нет."); return; }
    const next = cur.filter((u) => !(typeof u === "string" && u.toLowerCase() === url.toLowerCase()));
    await cfg.update(IMPORTS_KEY, next, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage("MoonLight BG: импорт убран. Отключи Custom CSS и перезапусти, чтобы вернуть обычный вид.");
}

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand("moonlightBg.setup", () => ensureImport(context)),
        vscode.commands.registerCommand("moonlightBg.remove", () => removeImport(context))
    );
    // На первом запуске (пока не отмечали) — предложить настройку автоматически.
    const KEY = "moonlightBg.didSetup";
    if (!context.globalState.get(KEY)) {
        context.globalState.update(KEY, true);
        ensureImport(context).catch(() => {});
    }
}

function deactivate() {}

module.exports = { activate, deactivate };
