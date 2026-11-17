# Apaga el servidor de la app y la base de datos local (los datos se conservan).
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'next.+start.+3210' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Push-Location $Root
node node_modules/supabase/dist/supabase.js stop
Pop-Location
