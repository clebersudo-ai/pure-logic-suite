param(
  [string]$Destination = "G:\Meu Drive\GESTOR DOC\pure-logic-suite-main"
)

$ErrorActionPreference = "Stop"

$source = Resolve-Path "$PSScriptRoot\.."
$excludeDirs = @(".git", "node_modules", "dist", ".vite")
$excludeFiles = @(".env", ".dev.vars")

robocopy $source.Path $Destination /E /XD $excludeDirs /XF $excludeFiles /NFL /NDL /NJH /NJS /NP
$exitCode = $LASTEXITCODE

if ($exitCode -gt 7) {
  throw "Robocopy failed with exit code $exitCode"
}

Write-Host "Projeto sincronizado em: $Destination"
