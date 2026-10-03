@echo off
REM ===========================================================================
REM  GROUPE 1 - Gestion de taches / Synchronisation RH
REM  Demarre les 3 briques necessaires :
REM     1. MongoDB           (port 27017)
REM     2. legacy-hr-system  (port 8080) - serveur SOAP Spring Boot
REM     3. GTPweb Node.js    (port 5000) - application REST qui consomme le SOAP
REM
REM  Usage : double-cliquer sur ce fichier, OU  demarrer-tout.bat  dans cmd.
REM  (Ne pas lancer depuis PowerShell : "timeout" y echoue sur stdin redirige.)
REM ===========================================================================
setlocal
cd /d "%~dp0"

set MONGOD=D:\MongoDB\mongodb-win32-x86_64-windows-8.3.11\bin\mongod.exe
set DB_PATH=D:\MongoDB\data
set JAVA=C:\Program Files\Java\jdk-21.0.12\bin\java.exe
set MVN=D:\apache-maven-3.9.16\bin\mvn.cmd
set SOAP_DIR=D:\Projet\ApiSOAPProject
set SOAP_JAR=%SOAP_DIR%\legacy-hr-system\target\legacy-hr-system-1.0.0.jar
set WEB_DIR=D:\Projet\GTP WEB(Projet de gestion taches en mongo)\GTPweb
set LOGS=%~dp0logs

if not exist "%LOGS%" mkdir "%LOGS%"

echo.
echo ==========================================================
echo   GROUPE 1 - Demarrage de la pile complete
echo ==========================================================
echo.

REM ---------------------------------------------------------------- 1. MongoDB
echo [1/3] MongoDB (port 27017)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":27017" ^| findstr "LISTENING"') do (
  echo      deja en ecoute ^(PID %%p^).
  goto :skipMongo
)
start "MongoDB" /min "%MONGOD%" --dbpath "%DB_PATH%" --port 27017
set /a t=0
:waitMongo
timeout /t 2 /nobreak >nul
set /a t+=1
netstat -ano ^| findstr ":27017" ^| findstr "LISTENING" >nul
if %t% lss 30 (goto :waitMongo) else (goto :mongoKo)
:mongoOk
echo      demarre.
goto :skipMongo
:mongoKo
echo      [KO] MongoDB n'a pas demarre. Verifiez %DB_PATH%.
pause
exit /b 1
:skipMongo

REM ------------------------------------------------------- 2. legacy-hr-system
echo [2/3] legacy-hr-system - serveur SOAP (port 8080)...
if not exist "%SOAP_JAR%" (
  echo      JAR absent, compilation Maven...
  pushd "%SOAP_DIR%\legacy-hr-system"
  call "%MVN%" -q clean package -DskipTests
  if errorlevel 1 (
    echo      [KO] La compilation Maven a echoue.
    popd
    pause
    exit /b 1
  )
  popd
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  echo      deja en ecoute ^(PID %%p^).
  goto :skipSoap
)
start "legacy-hr-system" /min cmd /c ""%JAVA%" -jar "%SOAP_JAR%" > "%LOGS%\legacy-hr.log" 2>&1"
set /a t=0
:waitSoap
timeout /t 2 /nobreak >nul
set /a t+=1
curl -s -o NUL "http://localhost:8080/ws/hr-service.wsdl" 2>nul
if %t% lss 45 (goto :waitSoap) else (goto :soapKo)
:soapOk
echo      demarre - WSDL : http://localhost:8080/ws/hr-service.wsdl
goto :skipSoap
:soapKo
echo      [KO] Le WSDL ne repond pas. Journal : %LOGS%\legacy-hr.log
pause
exit /b 1
:skipSoap

REM ------------------------------------------------------------- 3. Node.js
echo [3/3] GTPweb Node.js (port 5000)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
  echo      deja en ecoute ^(PID %%p^).
  goto :skipNode
)
pushd "%WEB_DIR%"
start "GTPweb Node.js" /min cmd /c "node server.js > "%LOGS%\node.log" 2>&1"
popd
set /a t=0
:waitNode
timeout /t 2 /nobreak >nul
set /a t+=1
curl -s -o NUL "http://localhost:5000/api/health" 2>nul
if %t% lss 30 (goto :waitNode) else (goto :nodeKo)
:nodeOk
echo      demarre - API : http://localhost:5000
goto :skipNode
:nodeKo
echo      [KO] L'API Node.js ne repond pas. Journal : %LOGS%\node.log
pause
exit /b 1
:skipNode

echo.
echo ==========================================================
echo   [OK] Toute la pile est demarree.
echo.
echo   Application      : http://localhost:5000
echo   WSDL du legacy   : http://localhost:8080/ws/hr-service.wsdl
echo   MongoDB          : localhost:27017
echo   Journaux         : %LOGS%
echo ==========================================================
echo.
echo Pour arreter : fermer les fenetres "MongoDB", "legacy-hr-system",
echo "GTPweb Node.js", ouCtrl+Shift+Esc ^> onglet Details.
echo.
pause
endlocal
