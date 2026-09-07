// ===== Среда: чем внедрён скрипт и что умеет окно =====
// Загрузчиков два. be5invis.vscode-custom-css теряет инжект после каждого обновления
// редактора; subframe7536.custom-ui-style бэкапит оригиналы, переживает обновления и умеет
// опции Electron — то есть настоящую прозрачность окна, недостижимую средствами CSS.
// От того, какой из них активен, зависят и диагностика, и доступность «настоящего стекла».
//
// Сам скрипт не видит ни settings.json, ни API расширений, поэтому среда приходит извне:
// точно — глобалом window.__MLBG_ENV__ от компаньона, косвенно — по следам в DOM.

// Точные данные от компаньон-расширения. Глобала может не быть (плагин подключён вручную) —
// тогда null. Санитизируем: это внешний объект, он попадает в отчёты и в UI.
function mlbgEnv() {
    try {
        var e = (typeof window !== "undefined") ? window.__MLBG_ENV__ : null;
        if (!e || typeof e !== "object") return null;
        var loader = (e.loader === "custom-ui-style" || e.loader === "custom-css") ? e.loader : null;
        return {
            loader: loader,
            version: (typeof e.version === "string") ? e.version.replace(/[^0-9a-z.\-]/gi, "").slice(0, 24) : "",
            vscode: (typeof e.vscode === "string") ? e.vscode.replace(/[^0-9a-z.\-]/gi, "").slice(0, 24) : "",
            transparent: e.transparent === true,   // окно создано прозрачным (опции Electron заданы)
            script: (typeof e.script === "string") ? e.script.slice(0, 512) : "",
            // Адрес файла живых данных. Пускаем только локальные схемы: этот URL уходит в
            // src подключаемого <script>, и сетевой адрес отсюда означал бы, что подменённый
            // пролог заставил редактор исполнять чужой код.
            live: (typeof e.live === "string" && /^(?:file|vscode-file|vscode-resource|https?):\/\//i.test(e.live) && !isRemoteUrl(e.live)) ? e.live.slice(0, 1024) : ""
        };
    } catch (e) { return null; }
}
// Косвенный признак custom-ui-style: он объявляет свои CSS-переменные шрифтов на :root.
// Признака у be5invis нет никакого, поэтому его считаем «загрузчиком по умолчанию».
function _cusMarker() {
    try {
        var v = getComputedStyle(document.documentElement).getPropertyValue("--cus-mono");
        return !!(v && v.trim());
    } catch (e) { return false; }
}
// Что за загрузчик: { id, title, version, sure }. sure=false — определено косвенно.
function loaderKind() {
    var e = mlbgEnv();
    if (e && e.loader) {
        return {
            id: e.loader, sure: true, version: e.version,
            title: e.loader === "custom-ui-style" ? "Custom UI Style" : "Custom CSS and JS (be5invis)"
        };
    }
    if (_cusMarker()) return { id: "custom-ui-style", sure: false, version: "", title: "Custom UI Style" };
    return { id: "custom-css", sure: false, version: "", title: "Custom CSS and JS (be5invis)" };
}
// Готово ли окно к настоящей прозрачности: это знает только компаньон (он видит опции
// Electron в settings.json). Без компаньона считаем, что нет, — и честно говорим об этом
// в подсказке, вместо того чтобы включить «стекло в никуда» и получить чёрное окно.
function trueGlassReady() {
    var e = mlbgEnv();
    return !!(e && e.transparent);
}
// Готовый кусок settings.json для включения настоящей прозрачности через custom-ui-style.
// Пользователь копирует его кнопкой в панели — плагин сам в настройки писать не может.
// backgroundMaterial: "mica" — материал Windows 11; на macOS работает vibrancy, поэтому
// отдаём оба ключа: лишний будет проигнорирован Electron.
function trueGlassSnippet() {
    return [
        '"custom-ui-style.electron": {',
        '  "transparent": true,',
        '  "backgroundMaterial": "mica",',
        '  "vibrancy": "under-window"',
        '}'
    ].join("\n");
}
// Кусок settings.json с импортом самого плагина — под тот загрузчик, который стоит.
// url берём из адреса текущего скрипта (IMG + имя файла), если он известен.
function loaderImportSnippet() {
    var url = "";
    try { url = (/** @type {HTMLScriptElement} */ (document.currentScript) || {}).src || ""; } catch (e) {}
    if (!url) url = (typeof IMG === "string" && IMG ? IMG : "file:///path/to/") + "custom-bg.js";
    if (loaderKind().id === "custom-ui-style") {
        return '"custom-ui-style.external.imports": [\n  { "type": "js", "url": "' + url + '" }\n]';
    }
    return '"vscode_custom_css.imports": [\n  "' + url + '"\n]';
}
