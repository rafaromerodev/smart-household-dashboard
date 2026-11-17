# Lanzador de escritorio de Nuestro Hogar (Windows).
# Abre la app en su propia ventana y, en segundo plano y sin ventanas,
# arranca lo que haga falta: Docker Desktop, la base de datos (Supabase local) y el servidor.
# Lo usa el acceso directo del escritorio que crea instalar-acceso-directo.ps1.

$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # carpeta nuestro-hogar
$Port = 3210
$AppUrl = "http://localhost:$Port"
$Log = Join-Path $env:TEMP "nuestro-hogar.log"

function Test-Url($u) { try { $null = Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 2; $true } catch { $false } }

# 1. Ventana de la app: Edge en modo aplicación (sin pestañas ni barra de direcciones).
# La ruta puede tener espacios o "&": se codifica como URI para que no se parta.
$splash = ([Uri](Join-Path $PSScriptRoot "arrancando.html")).AbsoluteUri.Replace("&", "%26") + "?url=$AppUrl"
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$browser = if ($edge) { $edge } else { $chrome }
$target = if (Test-Url "$AppUrl/offline") { $AppUrl } else { $splash }
if ($browser) { Start-Process $browser -ArgumentList "`"--app=$target`" --window-size=1280,860" }
else { Start-Process $AppUrl }

if (Test-Url "$AppUrl/offline") { exit 0 }   # ya estaba todo en marcha

# 2. Docker Desktop
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dd) { Start-Process $dd }
  for ($i = 0; $i -lt 90; $i++) { docker info *> $null; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep 2 }
}

# 3. Base de datos (Supabase local). Los datos se conservan entre arranques.
$anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
try { $null = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:54321/auth/v1/health" -Headers @{ apikey = $anon } -TimeoutSec 3; $dbUp = $true } catch { $dbUp = $false }
if (-not $dbUp) {
  Push-Location $Root
  node node_modules/supabase/dist/supabase.js start -x studio,imgproxy,vector,logflare,supavisor,edge-runtime *>> $Log
  Pop-Location
}

# 4. Servidor de la app (versión compilada; se compila si hace falta)
if (-not (Test-Path (Join-Path $Root ".next\BUILD_ID"))) {
  Push-Location $Root; node node_modules/next/dist/bin/next build *>> $Log; Pop-Location
}
Start-Process node -ArgumentList "node_modules/next/dist/bin/next", "start", "-p", "$Port" -WorkingDirectory $Root -WindowStyle Hidden
