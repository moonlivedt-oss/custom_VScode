// ============================================================
//  Живые данные редактора для рантайма плагина.
//
//  Скрипт фона живёт в окне редактора и не имеет доступа ни к API расширений, ни к git.
//  До сих пор он добывал ветку, счётчик ошибок и имя проекта скрейпингом DOM — это работает,
//  но ломается на каждом обновлении VS Code, потому что зависит от чужой вёрстки.
//
//  Расширение живёт в хосте расширений, где всё это есть точно: git через API расширения
//  vscode.git, ошибки через languages.getDiagnostics, язык файла через document.languageId.
//  Отдавать эти данные в окно напрямую нельзя, поэтому используем тот же канал, которым
//  плагин и так грузится: маленький JS-файл, выставляющий window.__MLBG_LIVE__. Рантайм
//  переподключает его на своём цикле самолечения (раз в 3 секунды) — отдельный таймер не нужен.
//
//  Файл переписывается ТОЛЬКО когда данные реально изменились: подписки дают события часто
//  (диагностика меняется на каждый набранный символ), а запись на диск — нет.
// ============================================================
"use strict";
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const WRITE_DEBOUNCE_MS = 400; // события сыплются пачками — пишем после паузы

let timer = null;
let lastJson = "";
let rev = 0;

function liveFilePath(context) {
    const dir = (context.globalStorageUri && context.globalStorageUri.fsPath) || context.globalStoragePath;
    return path.join(dir, "mlbg-live.js");
}

// Репозиторий, к которому относится активный файл (или первый открытый). Git-расширение
// поставляется с редактором, но может быть выключено — тогда просто нет данных о ветке.
function gitRepo() {
    try {
        const ext = vscode.extensions.getExtension("vscode.git");
        if (!ext || !ext.isActive) return null;
        const api = ext.exports.getAPI(1);
        if (!api || !api.repositories.length) return null;
        const doc = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document;
        if (doc && doc.uri && doc.uri.scheme === "file") {
            const own = api.getRepository(doc.uri);
            if (own) return own;
        }
        return api.repositories[0];
    } catch (e) { return null; }
}

// Короткое имя удалённого репозитория: "владелец/репозиторий". Из него удобно делать
// «фон под проект», который не зависит от того, как называется папка на диске.
function remoteName(repo) {
    try {
        const remotes = (repo && repo.state && repo.state.remotes) || [];
        const origin = remotes.filter((r) => r.name === "origin")[0] || remotes[0];
        const url = origin && (origin.fetchUrl || origin.pushUrl);
        if (!url) return "";
        const m = String(url).replace(/\.git$/, "").match(/[/:]([^/:]+\/[^/:]+)$/);
        return m ? m[1] : "";
    } catch (e) { return ""; }
}

function counts() {
    let errors = 0, warnings = 0;
    try {
        vscode.languages.getDiagnostics().forEach(([, list]) => {
            list.forEach((d) => {
                if (d.severity === vscode.DiagnosticSeverity.Error) errors++;
                else if (d.severity === vscode.DiagnosticSeverity.Warning) warnings++;
            });
        });
    } catch (e) { /* диагностика недоступна — отдадим нули */ }
    return { errors, warnings };
}

function collect() {
    const repo = gitRepo();
    const ed = vscode.window.activeTextEditor;
    const doc = ed && ed.document;
    const folder = (vscode.workspace.workspaceFolders || [])[0];
    const c = counts();
    return {
        branch: (repo && repo.state && repo.state.HEAD && repo.state.HEAD.name) || "",
        remote: remoteName(repo),
        dirty: !!(repo && repo.state && (repo.state.workingTreeChanges.length || repo.state.indexChanges.length)),
        errors: c.errors,
        warnings: c.warnings,
        languageId: (doc && doc.languageId) || "",
        fileExt: doc && doc.fileName ? (path.extname(doc.fileName).replace(".", "").toLowerCase() || "") : "",
        folder: (folder && folder.name) || "",
        vscode: vscode.version
    };
}

// Записать текущее состояние, если оно отличается от прошлого. rev растёт только при
// реальном изменении — рантайм по нему понимает, что данные свежие.
function writeNow(context) {
    let data;
    try { data = collect(); } catch (e) { return; }
    const json = JSON.stringify(data);
    if (json === lastJson) return;
    lastJson = json;
    rev++;
    const body = "window.__MLBG_LIVE__ = " + JSON.stringify(Object.assign({ rev, t: Date.now() }, data)) + ";\n";
    try {
        const p = liveFilePath(context);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, body, "utf8");
    } catch (e) { /* нет прав на запись — живые данные просто не появятся */ }
}

function schedule(context) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; writeNow(context); }, WRITE_DEBOUNCE_MS);
}

// Подписки на всё, от чего зависит картинка. Возвращает disposable-массив для subscriptions.
function watch(context) {
    const subs = [];
    const bump = () => schedule(context);
    try {
        subs.push(vscode.window.onDidChangeActiveTextEditor(bump));
        subs.push(vscode.languages.onDidChangeDiagnostics(bump));
        subs.push(vscode.workspace.onDidChangeWorkspaceFolders(bump));
        subs.push(vscode.workspace.onDidSaveTextDocument(bump));
    } catch (e) { /* часть API может отсутствовать в форке — не критично */ }
    // Git-расширение активируется само, но позже нас: дожидаемся и подписываемся на смену ветки.
    try {
        const ext = vscode.extensions.getExtension("vscode.git");
        if (ext) {
            const hook = () => {
                try {
                    const api = ext.exports.getAPI(1);
                    subs.push(api.onDidOpenRepository(bump));
                    subs.push(api.onDidCloseRepository(bump));
                    api.repositories.forEach((r) => subs.push(r.state.onDidChange(bump)));
                    bump();
                } catch (e) {}
            };
            if (ext.isActive) hook();
            else ext.activate().then(hook, () => {});
        }
    } catch (e) {}
    writeNow(context); // первый снимок сразу, чтобы данные были уже к первому циклу рантайма
    return subs;
}

function cleanup(context) {
    try {
        const p = liveFilePath(context);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
}

module.exports = { liveFilePath, watch, cleanup, collect };
