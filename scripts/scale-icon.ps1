Add-Type -AssemblyName System.Drawing

$srcIcoPath = (Get-Item "pc_system_port_inspector.ico").FullName
$srcIcon = New-Object System.Drawing.Icon ($srcIcoPath)
$srcBmp = $srcIcon.ToBitmap()

Write-Output "Source icon dimensions: $($srcBmp.Width)x$($srcBmp.Height)"

# Create a 256x256 high quality bitmap
$destBmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Calculate aspect ratio to fit inside 256x256 with nice margin
$scale = [Math]::Min(240.0 / $srcBmp.Width, 240.0 / $srcBmp.Height)
$newW = [int]($srcBmp.Width * $scale)
$newH = [int]($srcBmp.Height * $scale)
$posX = [int]((256 - $newW) / 2)
$posY = [int]((256 - $newH) / 2)

$g.DrawImage($srcBmp, $posX, $posY, $newW, $newH)
$g.Dispose()

# Save PNG 256x256
$pngPath = (Get-Item "build").FullName + "\icon_256.png"
$destBmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Save((Get-Item "build").FullName + "\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Save((Get-Item "public").FullName + "\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Save((Get-Item "electron\assets").FullName + "\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Successfully saved 256x256 PNG at $pngPath"

$destBmp.Dispose()
$srcBmp.Dispose()
$srcIcon.Dispose()
