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
const BE5_ID = "be5invis.vscode-custom-css";     // расширение, которое реально инжектит наш CSS/JS
const LAST_VER_KEY = "moonlightBg.lastVsCodeVersion"; // для детекта апдейта VS Code (инжект слетает)
const SEED_SETTING = "moonlightBg.config";       // объект-конфиг в settings.json (едет с Settings Sync)

// ===== Мост конфига в settings.json (улучшение 5) =====
// custom-bg.js хранит конфиг в localStorage конкретной машины. Чтобы вид переносился на другие
// машины и переживал переустановку, читаем объект-настройку moonlightBg.config (она в
// settings.json и синхронизируется Settings Sync) и генерируем крошечный файл, который задаёт
// window.__MLBG_SEED__ = <config>. Он импортируется ПЕРЕД custom-bg.js, и на новой машине с
// пустым localStorage становится отправным конфигом (см. loadCfg/seedConfig в custom-bg.js).
// Файл кладём в globalStorage (гарантированно доступен на запись, в отличие от папки расширения).
function seedFilePath(context) {
    const dir = (context.globalStorageUri && context.globalStorageUri.fsPath) || context.globalStoragePath;
    return path.join(dir, "mlbg-seed.js");
}
function seedUrl(context) { return fileUrl(seedFilePath(context)); }
// Синхронизировать seed-файл и его импорт с настройкой moonlightBg.config. Есть объект-конфиг —
// пишем файл и ставим его импорт ПЕРЕД custom-bg.js; нет — убираем файл и импорт. Возвращает
// массив imports без наших seed-записей (вызывающий добавит их в правильном порядке при нужде).
async function syncSeed(context) {
    const cfgObj = vscode.workspace.getConfiguration().get(SEED_SETTING);
    const seedPath = seedFilePath(context);
    const sUrlLc = seedUrl(context).toLowerCase();
    const scriptUrlLc = fileUrl(resolveScript(context)).toLowerCase();
    const conf = vscode.workspace.getConfiguration();
    let arr = conf.get(IMPORTS_KEY);
    arr = Array.isArray(arr) ? arr.slice() : [];
    arr = arr.filter((u) => typeof u === "string" && u.toLowerCase() !== sUrlLc); // выкинуть прежнюю seed-запись
    const hasConfig = cfgObj && typeof cfgObj === "object" && Object.keys(cfgObj).length > 0;
    if (hasConfig) {
        try {
            fs.mkdirSync(path.dirname(seedPath), { recursive: true });
            fs.writeFileSync(seedPath, "window.__MLBG_SEED__ = " + JSON.stringify(cfgObj) + ";\n", "utf8");
        } catch (e) { return; } // не смогли записать — тихо выходим (seed необязателен)
        const idx = arr.findIndex((u) => typeof u === "string" && u.toLowerCase() === scriptUrlLc);
        if (idx >= 0) arr.splice(idx, 0, seedUrl(context)); // seed ПЕРЕД основным скриптом
        else arr.push(seedUrl(context));
    } else {
        try { if (fs.existsSync(seedPath)) fs.unlinkSync(seedPath); } catch (e) {}
    }
    await conf.update(IMPORTS_KEY, arr, vscode.ConfigurationTarget.Global);
}

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
    // Синхронизировать seed из settings.json (улучшение 5): пишет window.__MLBG_SEED__ и ставит
    // его импорт перед custom-bg.js, если задан moonlightBg.config; иначе — чистит.
    try { await syncSeed(context); } catch (e) {}
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
    const url = fileUrl(resolveScript(context)).toLowerCase();
    const sUrl = seedUrl(context).toLowerCase();
    const cfg = vscode.workspace.getConfiguration();
    const cur = cfg.get(IMPORTS_KEY);
    if (!Array.isArray(cur)) { vscode.window.showInformationMessage("MoonLight BG: импортов нет."); return; }
    // Убираем и основной импорт, и seed-запись (улучшение 5); сам seed-файл удаляем.
    const next = cur.filter((u) => !(typeof u === "string" && (u.toLowerCase() === url || u.toLowerCase() === sUrl)));
    await cfg.update(IMPORTS_KEY, next, vscode.ConfigurationTarget.Global);
    try { const sp = seedFilePath(context); if (fs.existsSync(sp)) fs.unlinkSync(sp); } catch (e) {}
    vscode.window.showInformationMessage("MoonLight BG: импорт убран. Отключи Custom CSS и перезапусти, чтобы вернуть обычный вид.");
}

// ============================================================
//  Health-check + авто-починка (улучшение 4).
//  Главная боль custom-css-плагинов: после апдейта VS Code инжект тихо слетает («фон пропал»),
//  плюс предупреждение «Your Code installation appears corrupt» (VS Code видит правку своих
//  файлов). Расширение живёт в ext-хосте и НЕ может напрямую узнать, применился ли инжект в
//  рендерере, но может проверить всё вокруг: стоит ли be5invis, прописан ли наш импорт, есть
//  ли файл скрипта, и не обновлялся ли VS Code с прошлого запуска. По результату — понятный
//  отчёт с кнопками-действиями (включить Custom CSS, поправить импорт, открыть fix-checksums).
// ============================================================
function collectStatus(context) {
    const be5 = vscode.extensions.getExtension(BE5_ID);
    const script = resolveScript(context);
    const scriptExists = fs.existsSync(script);
    const url = fileUrl(script);
    const cur = vscode.workspace.getConfiguration().get(IMPORTS_KEY);
    const arr = Array.isArray(cur) ? cur : [];
    const importPresent = arr.some((u) => typeof u === "string" && u.toLowerCase() === url.toLowerCase());
    const curVer = vscode.version;
    const lastVer = context.globalState.get(LAST_VER_KEY) || "";
    return {
        be5installed: !!be5,
        be5active: !!(be5 && be5.isActive),
        importPresent, scriptExists, script,
        curVer, lastVer, vscodeChanged: !!lastVer && lastVer !== curVer
    };
}
// Собрать текст отчёта + список доступных действий (кнопок). ok=false — есть явная проблема.
function statusReport(s) {
    const L = [];
    const mark = (b) => (b ? "OK" : "—");
    L.push(`Расширение be5invis.vscode-custom-css: ${s.be5installed ? (s.be5active ? "установлено и активно" : "установлено (не активно)") : "НЕ установлено"}`);
    L.push(`Импорт MoonLight BG в настройках: ${s.importPresent ? "прописан" : "НЕ прописан"}`);
    L.push(`Файл custom-bg.js на месте: ${s.scriptExists ? "да" : "НЕТ (собери проект: node build.js)"}`);
    L.push(`Версия VS Code: ${s.curVer}${s.vscodeChanged ? `  (обновилась с ${s.lastVer} — инжект мог слететь)` : ""}`);
    const problems = [];
    if (!s.be5installed) problems.push("noBe5");
    if (!s.importPresent) problems.push("noImport");
    if (!s.scriptExists) problems.push("noScript");
    if (s.vscodeChanged) problems.push("updated");
    return { text: "MoonLight BG — состояние установки:\n\n• " + L.join("\n• "), ok: problems.length === 0, problems };
}
// Показать отчёт с кнопками-действиями. proactive=true — авто-показ (после апдейта): тише,
// показываем только если что-то требует внимания; иначе (по команде) показываем всегда.
async function healthCheck(context, proactive) {
    const s = collectStatus(context);
    const rep = statusReport(s);
    if (proactive && rep.ok) return; // всё в порядке и никто не просил — не мешаем
    // Набор кнопок под конкретные проблемы.
    const actions = [];
    if (s.problems && s.problems.indexOf("noBe5") >= 0) actions.push("Поставить Custom CSS");
    if (!s.importPresent || !s.scriptExists) actions.push("Прописать импорт");
    if (s.be5installed) actions.push("Включить Custom CSS");
    if (s.vscodeChanged) actions.push("Открыть fix-checksums");
    actions.push("Скопировать отчёт");
    const pick = await vscode.window.showInformationMessage(rep.text, { modal: false }, ...actions);
    if (!pick) { context.globalState.update(LAST_VER_KEY, s.curVer); return; }
    try {
        if (pick === "Поставить Custom CSS") {
            await vscode.commands.executeCommand("workbench.extensions.search", BE5_ID);
        } else if (pick === "Прописать импорт") {
            await ensureImport(context);
        } else if (pick === "Включить Custom CSS") {
            try { await vscode.commands.executeCommand("extension.installCustomCSS"); }
            catch (e) { vscode.window.showWarningMessage("Открой палитру команд и запусти «Enable Custom CSS and JS» вручную."); }
        } else if (pick === "Открыть fix-checksums") {
            // Предупреждение «installation corrupt» безвредно; тем, кому оно мешает, — расширение
            // fix-checksums молча патчит проверку. Открываем поиск по маркетплейсу (не навязываем ID).
            await vscode.commands.executeCommand("workbench.extensions.search", "fix checksums");
        } else if (pick === "Скопировать отчёт") {
            await vscode.env.clipboard.writeText(rep.text);
            vscode.window.showInformationMessage("MoonLight BG: отчёт скопирован в буфер.");
        }
    } catch (e) { /* действие недоступно — не критично */ }
    context.globalState.update(LAST_VER_KEY, s.curVer);
}

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand("moonlightBg.setup", () => ensureImport(context)),
        vscode.commands.registerCommand("moonlightBg.remove", () => removeImport(context)),
        vscode.commands.registerCommand("moonlightBg.health", () => healthCheck(context, false)),
        // Настройка moonlightBg.config менялась (в т.ч. приехала через Settings Sync) —
        // перегенерировать seed-файл и его импорт, чтобы новый образ подхватился после перезапуска.
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(SEED_SETTING)) { syncSeed(context).catch(() => {}); }
        })
    );
    // При каждом старте подтягиваем seed под текущую настройку (могла приехать с Sync между сессиями).
    syncSeed(context).catch(() => {});
    // На первом запуске (пока не отмечали) — предложить настройку автоматически.
    const KEY = "moonlightBg.didSetup";
    if (!context.globalState.get(KEY)) {
        context.globalState.update(KEY, true);
        context.globalState.update(LAST_VER_KEY, vscode.version);
        ensureImport(context).catch(() => {});
    } else {
        // Не первый запуск: если VS Code обновился с прошлого раза — инжект custom-css почти
        // наверняка слетел. Мягко и один раз на версию подсказываем перевключить (health-check
        // сам ничего не показывает, если всё в порядке). Небольшая задержка — не мешать старту.
        setTimeout(() => { healthCheck(context, true).catch(() => {}); }, 4000);
    }
}

function deactivate() {}

module.exports = { activate, deactivate };
