$src = "C:\Users\user\Desktop\랜덤 카드깡"
$dst = "C:\Users\user\Desktop\카드깡\images"
for ($i = 1; $i -le 21; $i++) {
    Copy-Item (Join-Path $src "$i.png") (Join-Path $dst "$i.png") -Force
}
Write-Host "Done"
