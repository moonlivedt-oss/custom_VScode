#!/usr/bin/env node
// ============================================================
//  Сборка .vsix: расширение + сам плагин внутри одного пакета.
//
//  Зачем. Плагин и картинки едут вместе с компаньоном: расширение ставится одним кликом, а
//  Moon Core находит внутри пакета custom-bg.min.js и assets/ по объявлению модуля mlbg
//  (extension/package.json -> moonCore.modules) и встраивает фон сам.
//
//  Что делает скрипт:
//    1. собирает свежие custom-bg.js и custom-bg.min.js из src/ (артефакт не берётся «как лежит»);
//    2. копирует сжатую сборку, assets/ (без значков — они уже в сборке) и сборку Moon Core внутрь extension/;
//    3. зовёт @vscode/vsce package;
//    4. убирает копии, чтобы рабочее дерево осталось чистым.
//
//  Запуск:  npm run package         собрать .vsix в dist/
//           npm run package -- --keep   оставить скопированные файлы (для отладки упаковки)
// ============================================================
"use strict";
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var EXT = path.join(ROOT, "extension");
var DIST = path.join(ROOT, "dist");
// Имя без .vsix: vsce выкидывает вложенные .vsix из пакета. Компаньон переименует файл перед установкой.
var MOON_CORE_VSIX = path.join(EXT, "moon-core.bin");
var COPIED = [path.join(EXT, "custom-bg.min.js"), path.join(EXT, "assets"), path.join(EXT, "LICENSE"), MOON_CORE_VSIX];
// Значки панели (assets/ui) уже вшиты в сборку data-URI (scripts/embed-icons.js -> src/ui/icons.js):
// копировать их в пакет ещё раз незачем.
var SKIP_ASSETS = ["ui"];

// Ядро Moon Core едет внутри пакета: без него фон не встроится, а ставить второе расширение
// руками человеку не нужно — компаньон поставит его сам при первом запуске. Берём самую свежую
// сборку из соседнего репозитория (../moon-core/dist) или путь из MOON_CORE_VSIX.
function findMoonCoreVsix() {
    if (process.env.MOON_CORE_VSIX) return fs.existsSync(process.env.MOON_CORE_VSIX) ? process.env.MOON_CORE_VSIX : null;
    var dir = path.join(ROOT, "..", "moon-core", "dist");
    var list = [];
    try { list = fs.readdirSync(dir).filter(function (n) { return /^moon-core-[\d.]+\.vsix$/.test(n); }); } catch (e) { return null; }
    list.sort(function (a, b) { return fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs; });
    return list.length ? path.join(dir, list[0]) : null;
}

// shell:true нужен только для npx (на Windows это .cmd и напрямую не запускается). Для node
// его включать нельзя: путь с пробелами (Program Files) оболочка разрежет по первому пробелу.
function run(cmd, args, opts) {
    var o = Object.assign({ stdio: "inherit" }, opts || {});
    if (o.shell === undefined) o.shell = false;
    var r = cp.spawnSync(cmd, args, o);
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error(cmd + " вышел с кодом " + r.status);
}
function copyDir(from, to, skip) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(function (name) {
        if (skip && skip.indexOf(name) !== -1) return;
        var src = path.join(from, name), dst = path.join(to, name);
        if (fs.statSync(src).isDirectory()) copyDir(src, dst);
        else fs.copyFileSync(src, dst);
    });
}
function rm(p) {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true, force: true });
    else fs.unlinkSync(p);
}

function main() {
    var keep = process.argv.indexOf("--keep") >= 0;

    // 1. Свежий артефакт: упаковывать несобранный custom-bg.js — классический способ
    //    выпустить релиз со вчерашним кодом.
    console.log("Сборка артефакта...");
    run(process.execPath, [path.join(ROOT, "build.js")]);

    // 2. Плагин и картинки — внутрь расширения. Moon Core находит их по объявлению модуля
    //    (extension/package.json -> moonCore.modules), поэтому установленный пакет самодостаточен.
    console.log("Копирование custom-bg.min.js и assets/ в extension/...");
    fs.copyFileSync(path.join(ROOT, "custom-bg.min.js"), path.join(EXT, "custom-bg.min.js"));
    copyDir(path.join(ROOT, "assets"), path.join(EXT, "assets"), SKIP_ASSETS);
    var mcv = findMoonCoreVsix();
    if (mcv) { fs.copyFileSync(mcv, MOON_CORE_VSIX); console.log("Moon Core внутрь пакета: " + path.relative(ROOT, mcv)); }
    else console.warn("ВНИМАНИЕ: сборка Moon Core не найдена (../moon-core/dist/moon-core-*.vsix или MOON_CORE_VSIX) — пакет без ядра, его придётся ставить отдельно.");
    // Лицензию тоже кладём в пакет: маркетплейс показывает её отдельной вкладкой, а vsce
    // без неё предупреждает. Держим одну копию — корневую, сюда она попадает при упаковке.
    fs.copyFileSync(path.join(ROOT, "LICENSE"), path.join(EXT, "LICENSE"));

    try {
        fs.mkdirSync(DIST, { recursive: true });
        var pkg = JSON.parse(fs.readFileSync(path.join(EXT, "package.json"), "utf8"));
        var out = path.join(DIST, pkg.name + "-" + pkg.version + ".vsix");
        console.log("Упаковка через @vscode/vsce...");
        // --no-dependencies: у расширения нет runtime-зависимостей, а vsce иначе полезет в npm.
        // vsce зовём его собственным js-входом через node: .cmd-обёртку современный Node на
        // Windows без shell не запускает (EINVAL), а shell тянет за собой неэкранированные
        // аргументы. Пакет стоит dev-зависимостью, так что путь предсказуем.
        var vsce = require.resolve("@vscode/vsce/vsce");
        run(process.execPath, [vsce, "package", "--no-dependencies", "--out", out], { cwd: EXT });
        var size = fs.statSync(out).size;
        console.log("\nГотово: " + path.relative(ROOT, out) + "  (" + Math.round(size / 1024) + " КБ)");
        console.log("Установить локально:  code --install-extension " + path.relative(ROOT, out));
    } finally {
        if (!keep) COPIED.forEach(rm);
    }
}
main();
