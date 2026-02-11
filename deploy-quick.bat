@echo off
REM Script de déploiement rapide pour Windows
REM Usage: deploy-quick.bat [user]

echo.
echo ========================================
echo   Deploiement sur VPS
echo ========================================
echo   Serveur: ubuntu@51.38.236.183
echo   Chemin: /var/www/lespcdewarren/lespcdewarren
echo.

echo [1/3] Transfert du schema Prisma...
scp prisma\schema.prisma ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/prisma/schema.prisma
if errorlevel 1 (
    echo ERREUR: Echec du transfert du schema
    pause
    exit /b 1
)

echo [2/2] Transfert de package.json...
scp package.json ubuntu@51.38.236.183:/var/www/lespcdewarren/lespcdewarren/package.json
if errorlevel 1 (
    echo ERREUR: Echec du transfert de package.json
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Fichiers transferes avec succes!
echo ========================================
echo.
echo Maintenant, connectez-vous au VPS et executez:
echo.
echo   ssh ubuntu@51.38.236.183
echo   cd /var/www/lespcdewarren/lespcdewarren
echo   npm install
echo   npx prisma generate
echo   npx prisma generate
echo   npm run build
echo   pm2 restart lespcdewarren
echo.
pause

