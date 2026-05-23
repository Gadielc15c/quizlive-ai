# QuizLive AI - deploy script
# Uso: .\deploy.ps1 "mensaje del commit"
# Si no pasas mensaje, usa "update"

param([string]$Message = "update")

$ErrorActionPreference = "Stop"

# Config
$CoolifyUrl    = "https://coolify.cascantelabs.com"
$BackendUuid   = "lo7xg3ky223xmc6i79riilfk"
$FrontendUuid  = "v13uwbs2305q85kr2vattbzi"
# Token: exporta antes con  $env:COOLIFY_TOKEN = "..."  o pega aqui
$Token = if ($env:COOLIFY_TOKEN) { $env:COOLIFY_TOKEN } else { "11|nmYtLP1JNHCsUNMpX3gybprG460NoEoOnCC06Psu282c624f" }

$headers = @{ Authorization = "Bearer $Token" }

Write-Host "==> git add + commit" -ForegroundColor Cyan
git add -A
$changes = git status --porcelain
if ($changes) {
    git commit -m $Message | Out-Null
} else {
    Write-Host "   (sin cambios para commitear)" -ForegroundColor Yellow
}

Write-Host "==> git push" -ForegroundColor Cyan
git push

Write-Host "==> deploy backend"  -ForegroundColor Cyan
Invoke-RestMethod "$CoolifyUrl/api/v1/deploy?uuid=$BackendUuid&force=false" -Headers $headers |
    ConvertTo-Json -Depth 5 | Write-Host

Write-Host "==> deploy frontend" -ForegroundColor Cyan
Invoke-RestMethod "$CoolifyUrl/api/v1/deploy?uuid=$FrontendUuid&force=false" -Headers $headers |
    ConvertTo-Json -Depth 5 | Write-Host

Write-Host ""
Write-Host "Listo. Sigue el progreso en:" -ForegroundColor Green
Write-Host "  $CoolifyUrl"
Write-Host "  Frontend:  https://quiz.cascantelabs.com"
Write-Host "  Backend:   https://quiz-bk.cascantelabs.com"
