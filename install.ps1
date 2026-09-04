# Тонкая обёртка над install.js (Windows PowerShell). Требует Node.js.
# Прописывает путь к custom-bg.js в settings.json найденных редакторов.
# Примеры:  ./install.ps1            (все найденные)
#           ./install.ps1 --app code
#           ./install.ps1 --dry
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Нужен Node.js (node не найден в PATH). Установи Node и повтори."
    exit 1
}
node "$PSScriptRoot/install.js" @args
