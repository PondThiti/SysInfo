!macro customUnInstall
  DetailPrint "Stopping SysInfo processes..."
  nsExec::Exec 'cmd.exe /c taskkill /F /IM "sysinfo.exe" /T'
  nsExec::Exec 'cmd.exe /c taskkill /F /IM "SysInfo.exe" /T'
  nsExec::Exec 'cmd.exe /c taskkill /F /IM "System Storage & Port Inspector.exe" /T'
  Sleep 1000
!macroend
