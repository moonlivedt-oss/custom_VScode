// ============================================================
//  MoonLight custom-bg — веб-точка входа (vscode.dev / GitHub Codespaces / SSH-веб).
//  В браузерном VS Code расширение be5invis.vscode-custom-css не работает (нельзя патчить
//  файлы веб-воркбенча), поэтому КАСТОМНЫЙ ФОН в вебе невозможен в принципе. Но цветовые
//  ТЕМЫ MoonLight — обычные color-theme.json — контрибьютятся декларативно из package.json и
//  прекрасно работают и в вебе. Чтобы эти темы были доступны в vscode.dev/Codespaces, у
//  расширения должна быть веб-точка входа (иначе VS Code считает его desktop-only и в вебе
//  не грузит). Эта точка ничего не патчит: только регистрирует команду-подсказку.
//
//  Здесь НЕТ Node-модулей (fs/path) — веб-хост расширений их не предоставляет.
// ============================================================
"use strict";
const vscode = require("vscode");

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand("moonlightBg.webInfo", () => {
            vscode.window.showInformationMessage(
                "MoonLight BG: в браузерном VS Code кастомный фон недоступен (ограничение custom-css). " +
                "Зато работают темы MoonLight — открой палитру команд → «Color Theme» и выбери любую «MoonLight …». " +
                "Полный фон и панель настроек доступны в десктопном VS Code."
            );
        })
    );
    // Мягкая одноразовая подсказка про темы в вебе (флаг в globalState).
    const KEY = "moonlightBg.webHintShown";
    if (!context.globalState.get(KEY)) {
        context.globalState.update(KEY, true);
        setTimeout(() => {
            vscode.window.showInformationMessage(
                "MoonLight BG: здесь (в вебе) доступны темы MoonLight — «Color Theme» → «MoonLight …». Кастомный фон работает только в десктопном VS Code.",
                "Выбрать тему"
            ).then((pick) => {
                if (pick === "Выбрать тему") { vscode.commands.executeCommand("workbench.action.selectTheme").then(undefined, () => {}); }
            }, () => {});
        }, 4000);
    }
}

function deactivate() {}

module.exports = { activate, deactivate };
