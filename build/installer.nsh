!macro customUnInstall
  DetailPrint "Stopping System Storage & Port Inspector processes..."
  nsExec::Exec 'cmd.exe /c taskkill /F /IM "System Storage & Port Inspector.exe" /T'
  Sleep 1000
!macroend
