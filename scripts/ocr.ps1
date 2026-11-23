param([string]$Subject='LOS201',[int]$Limit=0)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await($op,$type){$task=$asTask.MakeGenericMethod($type).Invoke($null,@($op));$task.Wait();$task.Result}
$lang=[Windows.Globalization.Language]::new('en-US')
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
$root=Split-Path $PSScriptRoot -Parent
$out=Join-Path $root "data/ocr-$Subject.jsonl"
[IO.Directory]::CreateDirectory((Split-Path $out)) | Out-Null
$writer=[IO.StreamWriter]::new($out,$false,[Text.UTF8Encoding]::new($false))
$files=Get-ChildItem -LiteralPath (Join-Path $root $Subject) -Filter '*.png' | Sort-Object {[int]([regex]::Match($_.Name,'\d+').Value)}
if($Limit -gt 0){$files=$files | Select-Object -First $Limit}
$n=0
try{foreach($file in $files){
 $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
 $dw=[Windows.Storage.Streams.DataWriter]::new($stream)
 $dw.WriteBytes([IO.File]::ReadAllBytes($file.FullName))
 $null=Await ($dw.StoreAsync()) ([uint32])
 $null=$dw.DetachStream();$dw.Dispose();$stream.Seek(0)
 $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $result=Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $lines=@($result.Lines | ForEach-Object {$l=$_;$words=@($l.Words);$x=($words | ForEach-Object {$_.BoundingRect.X} | Measure-Object -Minimum).Minimum;$y=($words | ForEach-Object {$_.BoundingRect.Y} | Measure-Object -Minimum).Minimum;@{text=$l.Text;x=[math]::Round($x);y=[math]::Round($y)}})
 $writer.WriteLine((@{file="$Subject/$($file.Name)";width=$bitmap.PixelWidth;height=$bitmap.PixelHeight;lines=$lines} | ConvertTo-Json -Compress -Depth 6));$writer.Flush()
 $bitmap.Dispose();$stream.Dispose();$n++
 if($n%25 -eq 0){Write-Output "$Subject $n/$($files.Count)"}
}
}finally{$writer.Dispose()}
Write-Output "$Subject DONE $n"
