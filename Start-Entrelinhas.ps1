$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$entrelinhasPnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if ($entrelinhasPnpm) {
    & $entrelinhasPnpm.Source run dev
} else {
    $entrelinhasBundledPnpm = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd'
    if (Test-Path -LiteralPath $entrelinhasBundledPnpm) {
        & $entrelinhasBundledPnpm run dev
    } else {
        throw 'Instale Node.js 20.9+ e pnpm. Depois execute pnpm install e pnpm dev nesta pasta.'
    }
}
