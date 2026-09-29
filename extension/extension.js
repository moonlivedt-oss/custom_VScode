// ============================================================
//  MoonLight custom-bg — компаньон-расширение.
//
//  Сам фон (custom-bg.min.js + assets/) встраивает в оболочку VS Code ядро Moon Core: модуль
//  "mlbg" объявлен в package.json -> moonCore.modules. Ни импорт в settings.json, ни сторонний
//  загрузчик (Custom CSS / Custom UI Style) для этого не нужны.
//
//  Компаньон делает то, чего рантайм в окне не может сам (у него нет API расширений):
//    - отдаёт по мосту Moon Core среду ("env": версия VS Code, прозрачно ли окно);
//    - отдаёт живые данные редактора ("live": git-ветка, ошибки, язык файла) — только своему
//      окну, см. live.js;
//    - переносит образ конфига из настройки moonlightBg.config (едет с Settings Sync) в резерв
//      конфига на диске, если там ещё пусто: на новой машине вид восстановится сам;
//    - проверяет состояние установки и подсказывает, что сделать;
//    - включает настоящую прозрачность окна: опции Electron умеет передавать только
//      Custom UI Style, поэтому он нужен только для этого.
//
//  ВАЖНО (упаковка): scripts/package-extension.js кладёт внутрь пакета собранный
//  custom-bg.min.js и assets/ — их и находит Moon Core по объявлению модуля.
// ============================================================
"use strict";
const vscode = require("vscode");
const live = require("./live");
const fs = require("fs");
const path = require("path");

const MC_ID = "moonlivedt.moon-core";
const MC_MODULE = "mlbg";
const CUS_ID = "subframe7536.custom-ui-style";
const CUS_ELECTRON_KEY = "custom-ui-style.electron";
const SEED_SETTING = "moonlightBg.config";          // объект-конфиг в settings.json (едет с Settings Sync)
const HEALTH_MUTE_KEY = "moonlightBg.healthMuted";   // какие проблемы попросили больше не показывать
// Импорты прежних версий (путь через загрузчики) — их предлагаем убрать, чтобы фон не
// внедрялся вторым путём.
const LEGACY_IMPORT_KEYS = ["vscode_custom_css.imports", "custom-ui-style.external.imports"];

// ===== Moon Core =====
// Вид для синхронизации между машинами: globalState с setKeysForSync переносит Settings Sync.
const SYNC_KEY = "moonlightBg.syncLook";
let extCtx = null;
let rpcSub = null; // подписка на запросы окна (выбор картинки/папки)
let mc = null;   // помощник модуля из API Moon Core (null — ядра нет или API не той версии)

async function connectMoonCore() {
    mc = null;
    const ext = vscode.extensions.getExtension(MC_ID);
    if (!ext) return null;
    try {
        const api = await ext.activate();
        if (api && api.apiVersion === 1 && typeof api.module === "function") mc = api.module(MC_MODULE);
    } catch (e) { mc = null; }
    return mc;
}

// ===== Moon Core из своего пакета =====
// Сборка ядра едет внутри .vsix компаньона (scripts/package-extension.js кладёт moon-core.bin:
// под именем .vsix вложенный пакет выкинул бы vsce). Человеку не нужно ни искать, ни ставить
// второе расширение. Сами ставим один раз — если ядро потом удалили руками, не навязываемся:
// вернуть его можно кнопкой в «Проверить установку».
const CORE_AUTO_KEY = "moonlightBg.coreAutoInstalled";
function bundledCore(context) {
    const p = path.join(context.extensionPath, "moon-core.bin");
    return fs.existsSync(p) ? p : null;
}
async function installBundledCore(context) {
    const bin = bundledCore(context);
    if (!bin) return false;
    try {
        // Установщику VS Code нужен файл .vsix — копия в своём хранилище.
        const dir = (context.globalStorageUri && context.globalStorageUri.fsPath) || context.globalStoragePath;
        fs.mkdirSync(dir, { recursive: true });
        const vsix = path.join(dir, "moon-core.vsix");
        fs.copyFileSync(bin, vsix);
        await vscode.commands.executeCommand("workbench.extensions.installExtension", vscode.Uri.file(vsix));
        return true;
    } catch (e) {
        vscode.window.showWarningMessage("MoonLight BG: не удалось поставить Moon Core из пакета (" + (e && e.message || e) + "). Поставь его вручную: Extensions → … → Install from VSIX.");
        return false;
    }
}
async function ensureCore(context) {
    if (vscode.extensions.getExtension(MC_ID) || context.globalState.get(CORE_AUTO_KEY) || !bundledCore(context)) return;
    await context.globalState.update(CORE_AUTO_KEY, true);
    // Ядро само встроится в VS Code и попросит перезагрузить окно (Moon Core: moonCore.autoInject);
    // модуль фона оно разрешит само — расширение того же издателя.
    if (await installBundledCore(context)) vscode.window.setStatusBarMessage("MoonLight BG: ядро Moon Core установлено", 6000);
}

function moonCoreVersion() {
    const ext = vscode.extensions.getExtension(MC_ID);
    return (ext && ext.packageJSON && ext.packageJSON.version) || "";
}

// ===== Среда =====
// Прозрачно ли создано окно: смотрим опции Electron в настройках. Это значение решает в
// рантайме, включать ли настоящее стекло — иначе окно стало бы прозрачным «в никуда» и
// редактор оказался бы чёрным.
function electronTransparent() {
    const e = vscode.workspace.getConfiguration().get(CUS_ELECTRON_KEY);
    if (!e || typeof e !== "object") return false;
    return e.transparent === true || typeof e.backgroundMaterial === "string" || typeof e.vibrancy === "string";
}

function publishEnv() {
    if (!mc) return;
    try {
        mc.publish("env", {
            loader: "moon-core",
            version: moonCoreVersion(),
            vscode: vscode.version,
            transparent: electronTransparent()
        });
    } catch (e) { /* Moon Core отверг событие — рантайм обойдётся без среды */ }
}

// ===== Образ конфига из settings.json -> резерв на диске =====
// Рантайм при пустом localStorage берёт конфиг из резерва на диске (файл данных модуля Moon
// Core). Если резерва ещё нет (новая машина), а в настройках есть образ — кладём его туда.
// Существующий резерв не трогаем: он новее и принадлежит самому пользователю.
function seedToDisk() {
    if (!mc || typeof mc.readData !== "function") return;
    const cfgObj = vscode.workspace.getConfiguration().get(SEED_SETTING);
    if (!cfgObj || typeof cfgObj !== "object" || Array.isArray(cfgObj) || !Object.keys(cfgObj).length) return;
    try {
        const cur = mc.readData();
        if (cur && cur.cfg && typeof cur.cfg === "object") return;
        mc.writeData({ v: 1, t: Date.now(), seed: true, cfg: cfgObj });
    } catch (e) { /* нет прав или слишком большой объект — останется ручной импорт в панели */ }
}

// ===== Уборка следов прежних версий =====
function isOurImport(u) {
    const s = String(typeof u === "string" ? u : (u && u.url) || "").toLowerCase();
    return /\/custom-bg(?:\.min)?\.js$/.test(s) || /\/mlbg-seed\.js$/.test(s);
}
function legacyImportPresent() {
    const conf = vscode.workspace.getConfiguration();
    return LEGACY_IMPORT_KEYS.some((key) => {
        const cur = conf.get(key);
        return Array.isArray(cur) && cur.some(isOurImport);
    });
}
async function removeLegacyImports() {
    const conf = vscode.workspace.getConfiguration();
    let touched = false;
    for (const key of LEGACY_IMPORT_KEYS) {
        const cur = conf.get(key);
        if (!Array.isArray(cur)) continue;
        const next = cur.filter((u) => !isOurImport(u));
        if (next.length !== cur.length) { await conf.update(key, next, vscode.ConfigurationTarget.Global); touched = true; }
    }
    vscode.window.showInformationMessage(touched
        ? "MoonLight BG: старые импорты убраны. Если сам загрузчик больше не нужен, его можно удалить; если он перезапишет оболочку VS Code, Moon Core предложит внедриться заново."
        : "MoonLight BG: старых импортов нет.");
}
// Файлы прежних версий в globalStorage компаньона: пролог со средой и файл живых данных.
function cleanupOldFiles(context) {
    const dir = (context.globalStorageUri && context.globalStorageUri.fsPath) || context.globalStoragePath;
    ["mlbg-seed.js", "mlbg-live.js"].forEach((name) => {
        try { const p = path.join(dir, name); if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
    });
}

// ===== Состояние установки =====
function collectStatus() {
    const mcExt = vscode.extensions.getExtension(MC_ID);
    return {
        moonCore: !!mcExt,
        moonCoreVersion: moonCoreVersion(),
        api: !!mc,
        active: !!(mc && mc.active),
        cus: !!vscode.extensions.getExtension(CUS_ID),
        transparent: electronTransparent(),
        legacy: legacyImportPresent(),
        vscode: vscode.version
    };
}
function statusReport(s) {
    const L = [];
    L.push("Moon Core: " + (s.moonCore ? "установлен " + s.moonCoreVersion + (s.api ? "" : " (API не отвечает — нужна версия с модулями)") : "НЕ установлен"));
    L.push("Модуль «" + MC_MODULE + "» в Moon Core: " + (s.active ? "разрешён" : "не разрешён"));
    L.push("Прозрачность окна (опции Electron): " + (s.transparent ? "включена" : "выключена") + (s.cus ? "" : " — для неё нужен Custom UI Style"));
    if (s.legacy) L.push("Старый импорт для Custom CSS / Custom UI Style: прописан (лишний, лучше убрать)");
    L.push("VS Code " + s.vscode + ". Состояние внедрения в оболочку — команда «Moon Core: Диагностика».");
    const problems = [];
    if (!s.moonCore || !s.api) problems.push("noMoonCore");
    else if (!s.active) problems.push("notAllowed");
    if (s.legacy) problems.push("legacy");
    return { text: "MoonLight BG — состояние установки:\n\n• " + L.join("\n• "), ok: problems.length === 0, problems };
}
// proactive=true — автопоказ при старте: только при проблемах и только тех, которые не просили
// больше не показывать. По команде — всегда.
async function healthCheck(context, proactive) {
    const s = collectStatus();
    const rep = statusReport(s);
    const key = rep.problems.join(",");
    if (proactive && (rep.ok || context.globalState.get(HEALTH_MUTE_KEY) === key)) return;
    const actions = [];
    if (rep.problems.indexOf("noMoonCore") >= 0) actions.push("Поставить Moon Core");
    if (rep.problems.indexOf("notAllowed") >= 0) actions.push("Разрешить модуль");
    if (rep.problems.indexOf("legacy") >= 0) actions.push("Убрать старые импорты");
    if (!proactive) actions.push("Скопировать отчёт");
    if (proactive) actions.push("Не напоминать");
    const pick = rep.ok && !proactive
        ? await vscode.window.showInformationMessage(rep.text, ...actions)
        : await vscode.window.showWarningMessage(rep.text, ...actions);
    try {
        if (pick === "Поставить Moon Core") {
            // Сборка ядра лежит в нашем пакете — ставим её. Нет (собрано без неё) — обычный выбор файла.
            if (bundledCore(context)) await installBundledCore(context);
            else {
                vscode.window.showInformationMessage("Выбери файл moon-core-*.vsix (папка moon-core/dist) и перезапусти VS Code.");
                await vscode.commands.executeCommand("workbench.extensions.action.installVSIX");
            }
        } else if (pick === "Разрешить модуль") {
            await vscode.commands.executeCommand("moonCore.modules");
        } else if (pick === "Убрать старые импорты") {
            await removeLegacyImports();
        } else if (pick === "Скопировать отчёт") {
            await vscode.env.clipboard.writeText(rep.text);
            vscode.window.showInformationMessage("MoonLight BG: отчёт скопирован в буфер.");
        } else if (pick === "Не напоминать") {
            await context.globalState.update(HEALTH_MUTE_KEY, key);
        }
    } catch (e) { /* действие недоступно в этой сборке VS Code — не критично */ }
}

// ===== Настоящая прозрачность окна =====
// CSS-«акрил» размывает нашу же картинку внутри окна. Настоящее стекло — это опции Electron у
// окна редактора; их умеет передавать только Custom UI Style. Включение — одной командой, с
// подтверждением и понятным откатом.
async function toggleTrueGlass(on) {
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
        publishEnv();
        vscode.window.showInformationMessage("MoonLight BG: прозрачность окна выключена. Перезапусти редактор, чтобы вернуть обычное окно.");
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
    publishEnv();
    const p2 = await vscode.window.showInformationMessage(
        "Готово. Нужен полный перезапуск редактора, затем включи в панели: Вид → эффект «Настоящая прозрачность».",
        "Перезапустить", "Позже");
    if (p2 === "Перезапустить") {
        try { await vscode.commands.executeCommand("workbench.action.reloadWindow"); } catch (e) {}
    }
}

// ===== Старт =====
// Всё, что зависит от Moon Core: среда, живые данные, образ конфига. Зовётся при старте и
// когда Moon Core поставили/обновили (extensions.onDidChange).
let liveSubs = null;
// ===== Запросы окна: выбор картинки и папки =====
// Сам скрипт фона живёт в оболочке и не видит диск, а выбирать картинку путём, вбитым руками,
// неудобно. Окно просит расширение показать обычный диалог; в ответ — file:///-адрес (так же
// Moon Core отдаёт окну ресурсы модулей; в vscode-file:// его переводит рантайм, appFileUrl). Папку отдаём списком картинок в ней (без подпапок).
// Только то, что VS Code отдаёт окну из любой папки (vscode-file: .png .jpg .jpeg .gif .bmp .webp);
// .avif вне папок самого VS Code он отклоняет — такую картинку окно не покажет.
const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const MAX_FOLDER_IMAGES = 64;
const { pathToFileURL } = require("url");
function fileUrl(p) { return pathToFileURL(p).href; }
// Папки, которые пользователь сам выбрал в диалоге: перечитывать можно только их. Иначе любой
// скрипт в окне VS Code мог бы попросить список картинок из произвольной папки диска.
const DIRS_KEY = "moonlightBg.pickedDirs";
function dirKey(d) { return path.resolve(String(d)).toLowerCase(); }
function pickedDirs() { const v = extCtx && extCtx.globalState.get(DIRS_KEY); return Array.isArray(v) ? v : []; }
async function rememberDir(dir) {
    if (!extCtx) return;
    const list = [dirKey(dir)].concat(pickedDirs().filter((d) => d !== dirKey(dir))).slice(0, 16);
    await extCtx.globalState.update(DIRS_KEY, list);
}
function listImages(dir) {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && IMG_EXT.test(d.name)).map((d) => d.name); }
    catch (e) { return null; }
    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return names.slice(0, MAX_FOLDER_IMAGES).map((n) => fileUrl(path.join(dir, n)));
}
async function onWindowRequest(method, body) {
    if (method === "pickImage") {
        const r = await vscode.window.showOpenDialog({
            canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
            title: "Картинка для фона", filters: { "Картинки": ["png", "jpg", "jpeg", "webp", "gif", "bmp"] },
        });
        if (!r || !r[0]) return { cancelled: true };
        return { url: fileUrl(r[0].fsPath), name: path.basename(r[0].fsPath) };
    }
    if (method === "pickFolder") {
        const r = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, title: "Папка с картинками для фона" });
        if (!r || !r[0]) return { cancelled: true };
        const dir = r[0].fsPath, images = listImages(dir) || [];
        await rememberDir(dir);
        return { dir, name: path.basename(dir), images };
    }
    if (method === "syncGet") {
        const v = extCtx && extCtx.globalState.get(SYNC_KEY);
        return v && typeof v === "object" ? v : null;
    }
    if (method === "syncSet") {
        if (!extCtx || !body || typeof body.t !== "number" || !body.cfg || typeof body.cfg !== "object") return { ok: false };
        const text = JSON.stringify(body.cfg);
        if (text.length > 256 * 1024) return { ok: false, error: "too big" };
        await extCtx.globalState.update(SYNC_KEY, { t: body.t, cfg: body.cfg });
        return { ok: true };
    }
    if (method === "listFolder") {
        const dir = body && typeof body.dir === "string" ? body.dir : "";
        if (!dir || !path.isAbsolute(dir)) return { images: null };
        if (pickedDirs().indexOf(dirKey(dir)) === -1) return { images: null, error: "папка не выбрана через диалог" };
        return { dir, images: listImages(dir) };
    }
    throw new Error("unknown method " + method);
}

function attach(context) {
    if (mc && typeof mc.onRequest === "function") {
        try { if (rpcSub) rpcSub.dispose(); } catch (e) {}
        try { rpcSub = mc.onRequest(onWindowRequest); context.subscriptions.push(rpcSub); } catch (e) { rpcSub = null; }
    }
    publishEnv();
    seedToDisk();
    if (!liveSubs) {
        try {
            liveSubs = live.watch((data) => { if (mc) { try { mc.publish("live", data, { scope: "window" }); } catch (e) {} } });
            liveSubs.forEach((d) => context.subscriptions.push(d));
        } catch (e) { liveSubs = []; }
    } else {
        live.resend();
    }
}

function activate(context) {
    extCtx = context;
    try { context.globalState.setKeysForSync([SYNC_KEY]); } catch (e) {}
    context.subscriptions.push(
        vscode.commands.registerCommand("moonlightBg.setup", () => healthCheck(context, false)),
        vscode.commands.registerCommand("moonlightBg.remove", () => removeLegacyImports()),
        vscode.commands.registerCommand("moonlightBg.health", () => healthCheck(context, false)),
        vscode.commands.registerCommand("moonlightBg.trueGlassOn", () => toggleTrueGlass(true)),
        vscode.commands.registerCommand("moonlightBg.trueGlassOff", () => toggleTrueGlass(false)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CUS_ELECTRON_KEY)) publishEnv();
            if (e.affectsConfiguration(SEED_SETTING)) seedToDisk();
        }),
        // Поставили или обновили Moon Core — переподключиться к его API.
        vscode.extensions.onDidChange(() => { connectMoonCore().then(() => attach(context)).catch(() => {}); })
    );
    cleanupOldFiles(context);
    ensureCore(context).catch(() => {});
    connectMoonCore().catch(() => null).then(() => {
        attach(context);
        // Небольшая задержка — не мешать старту редактора и дать Moon Core спросить про модуль.
        setTimeout(() => { healthCheck(context, true).catch(() => {}); }, 6000);
    });
}

function deactivate() {}

module.exports = { activate, deactivate };
