# UNIQUE Portal - cPanel Deployment Preparation Script
# Bu script standalone build olusturur ve deploy klasorunu hazirlar.
#
# Kullanim:
#   cd R:\0_Yazilim\UniqueMusteri\uniqueportal
#   powershell -ExecutionPolicy Bypass -File deploy\prepare.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DeployDir = Join-Path $ProjectRoot "deploy\output"

Write-Host "`n=== UNIQUE Portal - Deploy Hazirlik ===" -ForegroundColor Cyan

# 1. Temizlik
if (Test-Path $DeployDir) {
    Write-Host "[1/5] Eski deploy klasoru temizleniyor..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $DeployDir
}

# 2. Build
Write-Host "[2/5] Next.js standalone build baslatiliyor..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD BASARISIZ!" -ForegroundColor Red
    exit 1
}

# 3. Standalone klasorunu deploy/output'a kopyala
$StandaloneDir = Join-Path $ProjectRoot ".next\standalone"
if (-not (Test-Path $StandaloneDir)) {
    Write-Host "HATA: .next/standalone klasoru bulunamadi!" -ForegroundColor Red
    exit 1
}

Write-Host "[3/5] Standalone build kopyalaniyor..." -ForegroundColor Yellow
Copy-Item -Recurse -Force $StandaloneDir $DeployDir

# 4. Static assets ve public klasorunu kopyala
Write-Host "[4/5] Static assets kopyalaniyor..." -ForegroundColor Yellow

$StaticSrc = Join-Path $ProjectRoot ".next\static"
$StaticDest = Join-Path $DeployDir ".next\static"
if (Test-Path $StaticSrc) {
    Copy-Item -Recurse -Force $StaticSrc $StaticDest
}

$PublicSrc = Join-Path $ProjectRoot "public"
$PublicDest = Join-Path $DeployDir "public"
if (Test-Path $PublicSrc) {
    Copy-Item -Recurse -Force $PublicSrc $PublicDest
}

# 5. .env.production sablonu olustur (yoksa)
$EnvFile = Join-Path $DeployDir ".env"
if (-not (Test-Path $EnvFile)) {
    $EnvTemplate = Join-Path $ProjectRoot "deploy\.env.production"
    if (Test-Path $EnvTemplate) {
        Copy-Item $EnvTemplate $EnvFile
        Write-Host "  .env.production sablonu kopyalandi" -ForegroundColor DarkGray
    }
}

Write-Host "`n[5/5] Deploy klasoru hazir!" -ForegroundColor Green
Write-Host "  Konum: $DeployDir" -ForegroundColor White
Write-Host "  Boyut: $([math]::Round((Get-ChildItem -Recurse $DeployDir | Measure-Object -Property Length -Sum).Sum / 1MB, 1)) MB" -ForegroundColor White

Write-Host "`n=== Sonraki Adimlar ===" -ForegroundColor Cyan
Write-Host "1. deploy\output\ klasorunun TAMAMINI cPanel'e yukleyin"
Write-Host "2. cPanel > Setup Node.js App > Ayarlari yapin"
Write-Host "3. .env dosyasindaki degerleri guncelleyin"
Write-Host "4. Detayli rehber: deploy\CPANEL-DEPLOY.md`n"
