#!/usr/bin/env node
// ============================================================
//  Сборка .vsix: расширение + сам плагин внутри одного пакета.
//
//  Зачем. Сейчас установка — четыре ручных шага: клонировать репозиторий, поставить загрузчик,
//  прописать путь к custom-bg.js в settings.json, перезапустить редактор. При этом компаньон
//  уже умеет прописывать путь сам — не хватало только того, чтобы плагин и картинки ехали
//  вместе с ним. Пакет решает это целиком: расширение ставится одним кликом, находит внутри
//  себя custom-bg.js и assets/, прописывает импорт и предлагает включить загрузчик.
//
//  Что делает скрипт:
//    1. собирает свежий custom-bg.js из src/ (артефакт не берётся «как лежит»);
//    2. копирует его и assets/ внутрь extension/ — там их ждёт resolveScript();
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
var COPIED = [path.join(EXT, "custom-bg.js"), path.join(EXT, "assets"), path.join(EXT, "LICENSE")];

// shell:true нужен только для npx (на Windows это .cmd и напрямую не запускается). Для node
// его включать нельзя: путь с пробелами (Program Files) оболочка разрежет по первому пробелу.
function run(cmd, args, opts) {
    var o = Object.assign({ stdio: "inherit" }, opts || {});
    if (o.shell === undefined) o.shell = false;
    var r = cp.spawnSync(cmd, args, o);
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error(cmd + " вышел с кодом " + r.status);
}
function copyDir(from, to) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(function (name) {
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

    // 2. Плагин и картинки — внутрь расширения. resolveScript() в extension.js ищет
    //    custom-bg.js сначала рядом с собой, поэтому установленный пакет самодостаточен.
    console.log("Копирование custom-bg.js и assets/ в extension/...");
    fs.copyFileSync(path.join(ROOT, "custom-bg.js"), path.join(EXT, "custom-bg.js"));
    copyDir(path.join(ROOT, "assets"), path.join(EXT, "assets"));
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
