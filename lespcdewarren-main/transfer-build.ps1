# Script PowerShell pour transférer le build sur le VPS
# Usage: .\transfer-build.ps1

$VPS_USER = "ubuntu"
$VPS_HOST = "51.38.236.183"
$VPS_PATH = "/var/www/lespcdewarren/lespcdewarren"

Write-Host "=== TRANSFERT DU BUILD VERS LE VPS ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier que .next existe
if (-not (Test-Path ".next")) {
    Write-Host "❌ Erreur: Dossier .next non trouvé" -ForegroundColor Red
    Write-Host "   Lancez d'abord: npm run build" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Dossier .next trouvé" -ForegroundColor Green
Write-Host ""

# Créer une archive
Write-Host "📦 Création de l'archive..." -ForegroundColor Cyan
$archiveName = ".next.tar.gz"

# Supprimer l'archive existante si elle existe
if (Test-Path $archiveName) {
    Remove-Item $archiveName -Force
}

# Créer l'archive avec tar (nécessite Git Bash ou WSL)
$tarCommand = "tar -czf $archiveName .next"
Write-Host "   Exécution: $tarCommand" -ForegroundColor Gray

# Essayer avec tar de Git Bash
$gitBashPath = "${env:ProgramFiles}\Git\bin\bash.exe"
if (Test-Path $gitBashPath) {
    & $gitBashPath -c "cd '$PWD' && tar -czf $archiveName .next"
} else {
    # Essayer avec WSL
    wsl bash -c "cd '$PWD' && tar -czf $archiveName .next"
}

if (-not (Test-Path $archiveName)) {
    Write-Host "❌ Erreur: Impossible de créer l'archive" -ForegroundColor Red
    Write-Host "   Installez Git Bash ou WSL pour utiliser tar" -ForegroundColor Yellow
    exit 1
}

$archiveSize = (Get-Item $archiveName).Length / 1MB
Write-Host "✅ Archive créée: $archiveName ($([math]::Round($archiveSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Transférer sur le VPS
Write-Host "📤 Transfert vers le VPS..." -ForegroundColor Cyan
Write-Host "   Serveur: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Gray
Write-Host "   Chemin: ${VPS_PATH}" -ForegroundColor Gray
Write-Host ""

scp $archiveName "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du transfert" -ForegroundColor Red
    Remove-Item $archiveName -Force
    exit 1
}

Write-Host "✅ Transfert réussi!" -ForegroundColor Green
Write-Host ""

# Extraire sur le VPS
Write-Host "📦 Extraction sur le VPS..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && rm -rf .next && tar -xzf $archiveName && rm -f $archiveName && echo '✅ Dossier .next transféré avec succès!' && ls -lh .next | head -5"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ TRANSFERT RÉUSSI! ✅✅✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Sur le VPS, vous pouvez maintenant démarrer l'application:" -ForegroundColor Cyan
    Write-Host "  pm2 start npm --name lespcdewarren -- start" -ForegroundColor Yellow
} else {
    Write-Host "❌ Erreur lors de l'extraction sur le VPS" -ForegroundColor Red
}

# Nettoyer l'archive locale
Remove-Item $archiveName -Force
Write-Host ""
Write-Host "=== TERMINÉ ===" -ForegroundColor Cyan
