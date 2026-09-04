# MoonLight custom-bg — расширение авто-настройки (заготовка)

Тонкая обёртка, чтобы не править `settings.json` руками. При активации прописывает путь к
`custom-bg.js` в `vscode_custom_css.imports` и предлагает включить Custom CSS.

> Это **заготовка** (v0.1.0), а не опубликованное расширение. Сам фон рисует
> [`be5invis.vscode-custom-css`](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css)
> — оно указано в `extensionDependencies` и ставится вместе с этим расширением.

## Что делает
- Команда **«MoonLight BG: прописать импорт в настройки»** (`moonlightBg.setup`) — добавляет
  `file:///…/custom-bg.js` в `vscode_custom_css.imports` (глобально) и предлагает вызвать
  включение Custom CSS.
- Команда **«MoonLight BG: убрать импорт из настроек»** (`moonlightBg.remove`) — обратное.
- На первом запуске настройка предлагается автоматически (один раз, помечается в `globalState`).

## Запуск из исходников (без упаковки)
1. Открой папку `extension/` в VS Code.
2. `npm i -g @vscode/vsce` не нужен для отладки — просто нажми **F5** (Run Extension).
   В отладочном окне расширение найдёт `custom-bg.js` на уровень выше (в корне репозитория).

## Упаковка в .vsix
Чтобы фон работал у конечного пользователя, рядом с расширением должны лежать собранный
`custom-bg.js` и папка `assets/`. Перед `vsce package` скопируй их из корня репозитория:

```bash
# из корня репозитория
node build.js
cp custom-bg.js extension/
cp -r assets extension/
cd extension
npx @vscode/vsce package
```

Получится `moonlight-custom-bg-setup-0.1.0.vsix` — его можно поставить через
«Install from VSIX…» или опубликовать (решение об авторстве/публикации — за тобой).

## Ограничения
- Команда включения Custom CSS у `be5invis` называется `extension.installCustomCSS`; если она
  переименуется, обёртка мягко попросит включить вручную.
- Custom CSS патчит файлы редактора — после обновления VS Code его нужно включать заново
  (ограничение самого механизма, не этой обёртки).
