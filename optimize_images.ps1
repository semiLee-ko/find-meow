
Add-Type -AssemblyName System.Drawing

$sourceDir = "e:\projects\find-meow\images\channels"
$targetWidth = 800

Get-ChildItem -Path $sourceDir -Filter *.png | ForEach-Object {
    $path = $_.FullName
    $image = [System.Drawing.Image]::FromFile($path)
    
    if ($image.Width -gt $targetWidth) {
        $scaleFactor = $targetWidth / $image.Width
        $newHeight = [int]($image.Height * $scaleFactor)
        
        $newImage = new-object System.Drawing.Bitmap $targetWidth, $newHeight
        $graphics = [System.Drawing.Graphics]::FromImage($newImage)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        
        $graphics.DrawImage($image, 0, 0, $targetWidth, $newHeight)
        
        $image.Dispose()

        # JPEG Encoder Setup
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]70)

        # Save as JPG
        $newPath = $path -replace "\.png$", ".jpg"
        $newImage.Save($newPath, $codec, $encoderParams)
        
        $newImage.Dispose()
        $graphics.Dispose()
        
        # Remove original PNG from destination (if working on output dir) or just keep parallel?
        # Script reads from `images/channels`. We want to REPLACE them or at least ensure `dist` uses them.
        # Ideally, we should delete the .png in the directory so `npm run build` doesn't copy mixed files?
        # Or better: The script runs on `e:\projects\find-meow\images\channels`.
        # I should delete the source PNG after successful conversion to avoid duplication in build.
        Remove-Item $path

        Write-Host "Converted to JPG: $($_.Name)"
    }
    else {
        $image.Dispose()
        Write-Host "Skipped (already small): $($_.Name)"
    }
}
