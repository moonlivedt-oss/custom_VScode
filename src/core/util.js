// ===== Общие утилиты и санитизация значений =====
// Всё внешнее (localStorage, импортированный файл, код «Поделиться», настройка компаньона)
// проходит через эти проверки, прежде чем попасть в конфиг или в CSS: значение принимается,
// только если оно нужного типа и в известном диапазоне. Иначе подменённый JSON мог бы
// вырваться из font-family:'...' и дописать в стиль свои правила.
// Запасной акцент: используется и как значение по умолчанию в конфиге, и при санитизации
// набора без своего цвета. Отдельной константой, потому что каталог наборов собирается
// раньше, чем объявлены DEFAULTS.
var DEFAULT_ACCENT = "#cba6f7";
var COLOR_RE = /^#[0-9a-fA-F]{6}$/;
function isColor(s) { return typeof s === "string" && COLOR_RE.test(s); }
function clampNum(v, min, max, def) {
    v = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(v)) return def;
    return Math.min(max, Math.max(min, v));
}
function safeColor(c, fallback) { return isColor(c) ? c : fallback; }
// База картинок (папка плагина). Уходит в url('...') через cssUrl (кавычки/слэши/переводы
// строк экранируются — CSS-инъекция невозможна), поэтому здесь только приводим к единому
// виду: убираем переводы строк, ограничиваем длину, дописываем завершающий слэш. Пусто
// (или не строка) -> "" — тогда imgBase() возьмёт авто-определённый IMG.
function safeBase(s) {
    if (typeof s !== "string") return "";
    var b = s.trim().replace(/[\r\n]/g, "").slice(0, 512);
    if (!b) return "";
    // Путь к папке не содержит кавычек, скобок, точек с запятой и фигурных скобок. Если они
    // есть — это не путь, а попытка дописать что-то в CSS: отбрасываем целиком. Вырваться из
    // url('...') не даёт экранирование в cssUrl, это второй рубеж (подсказал фаззер конфига).
    if (/["'();{}<>]/.test(b)) return "";
    return /\/$/.test(b) ? b : b + "/";
}
// ===== Безопасность источников картинок =====
// Картинка из конфига уходит в CSS url() и в new Image().src. Если разрешить любой URL,
// то ИМПОРТИРОВАННЫЙ или применённый чужой конфиг сможет указать http(s)-адрес — и редактор
// молча сходит в сеть за картинкой: утечка IP, факт использования плагина, потенциальный
// маячок-трекер. Поэтому по умолчанию пускаем только ЛОКАЛЬНЫЕ схемы; сеть — лишь когда
// пользователь сам включил cfg.allowRemoteImages.
var LOCAL_IMG_SCHEME = /^(?:vscode-file|vscode-resource|vscode-webview-resource|file|data):/i;
// file://ХОСТ/share на Windows разворачивается в UNC-путь \\ХОСТ\share — а это сетевой
// SMB-запрос (утечка факта использования, IP и NetNTLM-хеша, тот же класс, что CVE-2025-24054
// и утечка через обои Windows Themes), НЕ «локальная картинка». Локальными считаем только
// file:/// (пустой хост) и file://localhost|127.0.0.1/… ; любой другой хост в file:// уводит
// в сеть так же, как http, — и должен блокироваться (imgAllowed) без явного согласия.
var FILE_UNC_RE = /^file:\/\/(?!\/|localhost[:/]|127\.0\.0\.1[:/])[^/]/i;
// Удалённый источник: абсолютный URL с не-локальной схемой, протокол-относительный «//host»
// ИЛИ file:// с непустым хостом (UNC). Обратные слэши приводим к прямым — иначе
// file:\\host\share (браузер сам нормализует \ в /) проскользнул бы мимо проверки.
function isRemoteUrl(u) {
    if (typeof u !== "string") return false;
    var s = u.replace(/\\/g, "/");
    if (/^\/\//.test(s)) return true;                        // //host/x — тянет из сети
    if (FILE_UNC_RE.test(s)) return true;                    // file://host/… — UNC/SMB на Windows
    return /^[a-z][a-z0-9+.-]*:/i.test(s) && !LOCAL_IMG_SCHEME.test(s);
}
// Разрешена ли картинка к загрузке: относительные и локальные — да; удалённые — только по
// явному согласию (cfg.allowRemoteImages). typeof-страховка: cfg может ещё не быть.
function imgAllowed(u) {
    if (typeof u !== "string" || !u) return false;
    if (typeof cfg !== "undefined" && cfg && cfg.allowRemoteImages) return true;
    return !isRemoteUrl(u);
}
// Безопасная сборка CSS url('...'). Путь установки плагина (IMG) приходит из
// document.currentScript.src и вставляется в CSS как есть. Если путь содержит
// одинарную кавычку, обратный слэш или перевод строки (напр. C:\Users\O'Brien\…),
// он вырвется из url('...') и сломает — или подменит — CSS. Экранируем спецсимволы
// по правилам CSS-строк (\ и ' — через escape, переводы строк убираем).
function cssUrl(u) {
    var s = String(u).replace(/[\r\n]/g, "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return "url('" + s + "')";
}
// Акцент -> "r,g,b" для rgba() в CSS и на canvas (там var() недоступен).
// getAccent() определён в state.js; вызывается в рантайме, когда всё уже есть.
function accentRGB() {
    var ac = safeColor(getAccent(), DEFAULTS.accent);
    return parseInt(ac.substr(1, 2), 16) + "," + parseInt(ac.substr(3, 2), 16) + "," + parseInt(ac.substr(5, 2), 16);
}

// ===== Конфиг: слияние с дефолтами + санитизация =====
var CFG_KEY = "moonlight-bg-config", LAST_KEY = "moonlight-bg-last", BACKUP_KEY = "moonlight-bg-backup";
function clone(x) { return JSON.parse(JSON.stringify(x)); }

// Безопасный разбор JSON. Reviver выбрасывает ключи-«отравители» прототипа
// ещё до того, как объект попадёт в mergeCfg — защита от prototype pollution
// из подменённого localStorage или импортированного файла (defense-in-depth).
var DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
function safeParse(text) {
    return JSON.parse(text, function (key, value) {
        return DANGEROUS_KEYS.indexOf(key) >= 0 ? undefined : value;
    });
}
