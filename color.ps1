Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('d:\GOCHOCTAPCUAHIN\TaiLieuNam4\HK2\Cong_Nghe_Moi\BAOCAO\frontend\src\assets\images\logo_tron.png')
$bmp = new-object System.Drawing.Bitmap($img)
$colors = @{}
for($x = 0; $x -lt $bmp.Width; $x += 5) {
  for($y = 0; $y -lt $bmp.Height; $y += 5) {
    if ($x -lt $bmp.Width -and $y -lt $bmp.Height) {
      $c = $bmp.GetPixel($x, $y)
      if ($c.A -gt 50 -and ($c.R -lt 240 -or $c.G -lt 240 -or $c.B -lt 240) -and ($c.R -gt 20 -or $c.G -gt 20 -or $c.B -gt 20)) {
        $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
        if (-not $colors.ContainsKey($hex)) { $colors[$hex] = 0 }
        $colors[$hex]++
      }
    }
  }
}
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
