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
// ===== Второй загрузчик (улучшение 1, v20) =====
// subframe7536.custom-ui-style делает то же внедрение, но надёжнее: бэкапит оригиналы
// редактора и восстанавливает их перед каждым патчем (поэтому переживает обновления VS Code),
// гасит предупреждение «installation appears corrupt» и умеет опции Electron BrowserWindow —
// то есть настоящую прозрачность окна, недостижимую средствами CSS. Формат импорта у него
// другой: массив объектов { type, url } вместо массива строк.
const CUS_ID = "subframe7536.custom-ui-style";
const CUS_IMPORTS_KEY = "custom-ui-style.external.imports";
const CUS_ELECTRON_KEY = "custom-ui-style.electron";
// Какой загрузчик использовать: тот, что установлен; если оба — предпочитаем custom-ui-style
// (он живучее); если ни одного — считаем, что будет be5invis (исторический путь установки).
function activeLoader() {
    const cus = vscode.extensions.getExtension(CUS_ID);
    const be5 = vscode.extensions.getExtension(BE5_ID);
    if (cus) return "custom-ui-style";
    if (be5) return "custom-css";
    return "custom-css";
}
function loaderTitle(id) { return id === "custom-ui-style" ? "Custom UI Style" : "Custom CSS and JS (be5invis)"; }
// Прозрачно ли создано окно: смотрим опции Electron в настройках. Именно это значение едет
// в рантайм (window.__MLBG_ENV__.transparent) и решает, включать ли настоящее стекло —
// иначе плагин мог бы сделать окно прозрачным «в никуда» и получить чёрный редактор.
function electronTransparent() {
    const e = vscode.workspace.getConfiguration().get(CUS_ELECTRON_KEY);
    if (!e || typeof e !== "object") return false;
    return e.transparent === true || typeof e.backgroundMaterial === "string" || typeof e.vibrancy === "string";
}
// Импорт в формате конкретного загрузчика.
function importEntry(loader, url) { return loader === "custom-ui-style" ? { type: "js", url } : url; }
function entryUrl(e) {
    if (typeof e === "string") return e;
    if (e && typeof e === "object" && typeof e.url === "string") return e.url;
    return "";
}
function importsKey(loader) { return loader === "custom-ui-style" ? CUS_IMPORTS_KEY : IMPORTS_KEY; }
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
    const loader = activeLoader();
    const key = importsKey(loader);
    let arr = conf.get(key);
    arr = Array.isArray(arr) ? arr.slice() : [];
    arr = arr.filter((u) => entryUrl(u).toLowerCase() !== sUrlLc); // выкинуть прежнюю seed-запись
    const hasConfig = cfgObj && typeof cfgObj === "object" && Object.keys(cfgObj).length > 0;
    // Файл-«пролог» пишем ВСЕГДА (а не только при заданном образе конфига): кроме конфига он
    // сообщает рантайму среду — каким расширением внедрён скрипт и прозрачно ли окно. Сам
    // скрипт этого знать не может (у него нет доступа к settings.json и к API расширений),
    // а от этого зависят и диагностика, и «настоящая прозрачность».
    const env = {
        loader,
        version: (vscode.extensions.getExtension(loader === "custom-ui-style" ? CUS_ID : BE5_ID) || {}).packageJSON &&
                 (vscode.extensions.getExtension(loader === "custom-ui-style" ? CUS_ID : BE5_ID)).packageJSON.version || "",
        vscode: vscode.version,
        transparent: electronTransparent(),
        script: resolveScript(context)
    };
    let body = "window.__MLBG_ENV__ = " + JSON.stringify(env) + ";\n";
    if (hasConfig) body += "window.__MLBG_SEED__ = " + JSON.stringify(cfgObj) + ";\n";
    try {
        fs.mkdirSync(path.dirname(seedPath), { recursive: true });
        fs.writeFileSync(seedPath, body, "utf8");
    } catch (e) { return; } // не смогли записать — пролог необязателен, тихо выходим
    const idx = arr.findIndex((u) => entryUrl(u).toLowerCase() === scriptUrlLc);
    const entry = importEntry(loader, seedUrl(context));
    if (idx >= 0) arr.splice(idx, 0, entry); // пролог ПЕРЕД основным скриптом
    else arr.push(entry);
    await conf.update(key, arr, vscode.ConfigurationTarget.Global);
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
    const loader = activeLoader();
    const key = importsKey(loader);
    const cfg = vscode.workspace.getConfiguration();
    const cur = cfg.get(key);
    const arr = Array.isArray(cur) ? cur.slice() : [];
    const exists = arr.some((u) => entryUrl(u).toLowerCase() === url.toLowerCase());
    if (!exists) {
        arr.push(importEntry(loader, url));
        await cfg.update(key, arr, vscode.ConfigurationTarget.Global);
    }
    // Пролог со средой и образом конфига (улучшения 1 и 5) — ставится перед основным скриптом.
    try { await syncSeed(context); } catch (e) {}
    // Дальше нужно включить сам загрузчик. У расширений разные команды, поэтому подсказка
    // и действие зависят от того, что установлено.
    if (loader === "custom-ui-style") {
        const pick = await vscode.window.showInformationMessage(
            (exists ? "MoonLight BG уже прописан для Custom UI Style." : "MoonLight BG прописан для Custom UI Style.") +
            " Применить и перезапустить редактор?",
            "Применить", "Позже"
        );
        if (pick === "Применить") {
            try { await vscode.commands.executeCommand("custom-ui-style.reload"); }
            catch (e) { vscode.window.showWarningMessage("Открой палитру команд и запусти «Custom UI Style: Reload» вручную."); }
        }
        return;
    }
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

// ===== Настоящая прозрачность окна (улучшение 2) =====
// CSS-«акрил» размывает нашу же картинку внутри окна. Настоящее стекло — это опции Electron
// у окна редактора; их умеет передавать только custom-ui-style. Плагин сам в settings.json
// писать не может, поэтому включение живёт здесь: одна команда, с подтверждением и с
// понятным откатом (окно с прозрачностью — заметное изменение, его нужно уметь отменить).
async function toggleTrueGlass(context, on) {
    if (!vscode.extensions.getExtension(CUS_ID)) {
        const pick = await vscode.window.showWarningMessage(
            "Настоящая прозрачность работает только с расширением Custom UI Style — оно передаёт опции окна Electron.",
            "Открыть в маркетплейсе", "Отмена");
        if (pick === "Открыть в маркетплейсе") {
            try { await vscode.commands.executeCommand("workbench.extensions.search", CUS_ID); } catch (e) {}
        }
        return;
    }
    const conf = vscode.workspace.getConfiguration();
    if (!on) {
        await conf.update(CUS_ELECTRON_KEY, undefined, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage("MoonLight BG: прозрачность окна выключена. Перезапусти редактор, чтобы вернуть обычное окно.");
        try { await syncSeed(context); } catch (e) {}
        return;
    }
    const pick = await vscode.window.showWarningMessage(
        "Включить настоящую прозрачность окна? Окно будет пересоздано прозрачным (Mica на Windows 11, vibrancy на macOS). " +
        "Если результат не понравится, выключи это командой «MoonLight BG: выключить настоящую прозрачность».",
        "Включить", "Отмена");
    if (pick !== "Включить") return;
    const prev = conf.get(CUS_ELECTRON_KEY) || {};
    await conf.update(CUS_ELECTRON_KEY, Object.assign({}, prev, {
        transparent: true, backgroundMaterial: "mica", vibrancy: "under-window"
    }), vscode.ConfigurationTarget.Global);
    try { await syncSeed(context); } catch (e) {}
    const p2 = await vscode.window.showInformationMessage(
        "Готово. Нужен полный перезапуск редактора, затем включи в панели: Вид → эффект «Настоящая прозрачность».",
        "Перезапустить", "Позже");
    if (p2 === "Перезапустить") {
        try { await vscode.commands.executeCommand("workbench.action.reloadWindow"); } catch (e) {}
    }
}

async function removeImport(context) {
    const url = fileUrl(resolveScript(context)).toLowerCase();
    const sUrl = seedUrl(context).toLowerCase();
    const cfg = vscode.workspace.getConfiguration();
    let touched = false;
    // Чистим оба ключа: пользователь мог переехать с одного загрузчика на другой, и «убрать
    // импорт» должно означать «убрать везде», иначе фон вернётся при переключении обратно.
    for (const key of [IMPORTS_KEY, CUS_IMPORTS_KEY]) {
        const cur = cfg.get(key);
        if (!Array.isArray(cur)) continue;
        const next = cur.filter((u) => {
            const s2 = entryUrl(u).toLowerCase();
            return s2 !== url && s2 !== sUrl;
        });
        if (next.length !== cur.length) { await cfg.update(key, next, vscode.ConfigurationTarget.Global); touched = true; }
    }
    try { const sp = seedFilePath(context); if (fs.existsSync(sp)) fs.unlinkSync(sp); } catch (e) {}
    vscode.window.showInformationMessage(touched
        ? "MoonLight BG: импорт убран. Отключи загрузчик и перезапусти, чтобы вернуть обычный вид."
        : "MoonLight BG: импортов не найдено.");
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
    const cus = vscode.extensions.getExtension(CUS_ID);
    const loader = activeLoader();
    const script = resolveScript(context);
    const scriptExists = fs.existsSync(script);
    const url = fileUrl(script);
    const cur = vscode.workspace.getConfiguration().get(importsKey(loader));
    const arr = Array.isArray(cur) ? cur : [];
    const importPresent = arr.some((u) => entryUrl(u).toLowerCase() === url.toLowerCase());
    const curVer = vscode.version;
    const lastVer = context.globalState.get(LAST_VER_KEY) || "";
    return {
        be5installed: !!be5,
        be5active: !!(be5 && be5.isActive),
        cusInstalled: !!cus,
        loader, transparent: electronTransparent(),
        importPresent, scriptExists, script,
        curVer, lastVer, vscodeChanged: !!lastVer && lastVer !== curVer
    };
}
// Собрать текст отчёта + список доступных действий (кнопок). ok=false — есть явная проблема.
function statusReport(s) {
    const L = [];
    const mark = (b) => (b ? "OK" : "—");
    L.push(`Загрузчик: ${loaderTitle(s.loader)}${s.loader === "custom-ui-style" ? "" : ""}`);
    L.push(`Расширение be5invis.vscode-custom-css: ${s.be5installed ? (s.be5active ? "установлено и активно" : "установлено (не активно)") : "НЕ установлено"}`);
    L.push(`Расширение subframe7536.custom-ui-style: ${s.cusInstalled ? "установлено" : "НЕ установлено"}`);
    L.push(`Прозрачность окна (опции Electron): ${s.transparent ? "включена" : "выключена"}`);
    L.push(`Импорт MoonLight BG в настройках: ${s.importPresent ? "прописан" : "НЕ прописан"}`);
    L.push(`Файл custom-bg.js на месте: ${s.scriptExists ? "да" : "НЕТ (собери проект: node build.js)"}`);
    L.push(`Версия VS Code: ${s.curVer}${s.vscodeChanged ? `  (обновилась с ${s.lastVer} — инжект мог слететь)` : ""}`);
    const problems = [];
    if (!s.be5installed && !s.cusInstalled) problems.push("noBe5");
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
    if (s.problems && s.problems.indexOf("noBe5") >= 0) actions.push("Поставить загрузчик");
    if (!s.importPresent || !s.scriptExists) actions.push("Прописать импорт");
    if (s.be5installed) actions.push("Включить Custom CSS");
    if (s.vscodeChanged) actions.push("Открыть fix-checksums");
    actions.push("Скопировать отчёт");
    const pick = await vscode.window.showInformationMessage(rep.text, { modal: false }, ...actions);
    if (!pick) { context.globalState.update(LAST_VER_KEY, s.curVer); return; }
    try {
        if (pick === "Поставить загрузчик") {
            // Показываем оба варианта разом: пусть человек выберет, а не гадает, какой ставить.
            await vscode.commands.executeCommand("workbench.extensions.search", "custom css js loader OR custom ui style");
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
        vscode.commands.registerCommand("moonlightBg.trueGlassOn", () => toggleTrueGlass(context, true)),
        vscode.commands.registerCommand("moonlightBg.trueGlassOff", () => toggleTrueGlass(context, false)),
        // Настройка moonlightBg.config менялась (в т.ч. приехала через Settings Sync) —
        // перегенерировать seed-файл и его импорт, чтобы новый образ подхватился после перезапуска.
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(SEED_SETTING) || e.affectsConfiguration(CUS_ELECTRON_KEY)) { syncSeed(context).catch(() => {}); }
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
