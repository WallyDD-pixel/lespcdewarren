@echo off
REM Script de déploiement pour corriger shippingPhone
REM Transfère tous les fichiers modifiés

set VPS_USER=ubuntu
set VPS_IP=51.38.236.183
set VPS_PATH=/var/www/lespcdewarren/lespcdewarren

echo.
echo ========================================
echo   Deploiement correction shippingPhone
echo ========================================
echo.

echo [1/4] Transfert du schema Prisma...
scp prisma\schema.prisma %VPS_USER%@%VPS_IP%:%VPS_PATH%/prisma/schema.prisma
if errorlevel 1 (
    echo ERREUR: Echec du transfert du schema
    pause
    exit /b 1
)

echo [2/4] Transfert de l'API create order...
scp src\app\api\admin\orders\create\route.ts %VPS_USER%@%VPS_IP%:%VPS_PATH%/src/app/api/admin/orders/create/
if errorlevel 1 (
    echo ERREUR: Echec du transfert
    pause
    exit /b 1
)

echo [3/4] Transfert de l'API paypal capture...
scp src\app\api\paypal\capture\route.ts %VPS_USER%@%VPS_IP%:%VPS_PATH%/src/app/api/paypal/capture/
if errorlevel 1 (
    echo ERREUR: Echec du transfert
    pause
    exit /b 1
)

echo [4/5] Transfert de l'API orders [id]...
scp src\app\api\admin\orders\[id]\route.ts %VPS_USER%@%VPS_IP%:%VPS_PATH%/src/app/api/admin/orders/[id]/
if errorlevel 1 (
    echo ERREUR: Echec du transfert
    pause
    exit /b 1
)

echo [5/5] Transfert de la page admin contest...
scp src\app\admin\contest\page.tsx %VPS_USER%@%VPS_IP%:%VPS_PATH%/src/app/admin/contest/
if errorlevel 1 (
    echo ERREUR: Echec du transfert
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Fichiers transferes avec succes!
echo ========================================
echo.
echo Maintenant, sur le VPS, executez:
echo.
echo   cd %VPS_PATH%
echo   pm2 stop lespcdewarren
echo   rm -rf .next
echo   npx prisma generate
echo   npm run build
echo   pm2 start lespcdewarren
echo.
pause

