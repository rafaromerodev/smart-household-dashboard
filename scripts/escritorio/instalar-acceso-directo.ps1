# Crea los accesos directos "Nuestro Hogar" en el Escritorio y en el menú Inicio.
$here = $PSScriptRoot
$ico = Join-Path $here "a-r-hogar.ico"
$launcher = Join-Path $here "abrir-app.ps1"
$shell = New-Object -ComObject WScript.Shell

$places = @(
  [Environment]::GetFolderPath("Desktop"),
  (Join-Path ([Environment]::GetFolderPath("Programs")) "")
)
foreach ($dir in $places) {
  $lnk = $shell.CreateShortcut((Join-Path $dir "Nuestro Hogar.lnk"))
  $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
  $lnk.WorkingDirectory = $here
  $lnk.IconLocation = "$ico,0"
  $lnk.Description = "Nuestro Hogar"
  $lnk.WindowStyle = 7   # minimizada: no muestra la consola
  $lnk.Save()
  Write-Output "Creado: $(Join-Path $dir 'Nuestro Hogar.lnk')"
}
