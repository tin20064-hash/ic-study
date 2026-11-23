param([string]$Subject='DGT302',[int]$Limit=0)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await($op,$type){$task=$asTask.MakeGenericMethod($type).Invoke($null,@($op));$task.Wait();$task.Result}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
$root=Split-Path $PSScriptRoot -Parent
$writer=[IO.StreamWriter]::new((Join-Path $root "data/ocr-text-$Subject.jsonl"),$false,[Text.UTF8Encoding]::new($false))
$files=Get-ChildItem -LiteralPath (Join-Path $root 'data/text-crops') -Filter "$Subject-*.png" | Sort-Object {[int]([regex]::Match($_.Name,'-(\d+)').Groups[1].Value)}
if($Limit -gt 0){$files=$files | Select-Object -First $Limit}
$n=0
try{foreach($file in $files){
 $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new();$dw=[Windows.Storage.Streams.DataWriter]::new($stream)
 $dw.WriteBytes([IO.File]::ReadAllBytes($file.FullName));$null=Await ($dw.StoreAsync()) ([uint32]);$null=$dw.DetachStream();$dw.Dispose();$stream.Seek(0)
 $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $result=Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $lines=@($result.Lines | ForEach-Object {@{text=$_.Text;words=@($_.Words | ForEach-Object {@{text=$_.Text;x=[math]::Round($_.BoundingRect.X/2,1);y=[math]::Round($_.BoundingRect.Y/2,1);w=[math]::Round($_.BoundingRect.Width/2,1);h=[math]::Round($_.BoundingRect.Height/2,1)}})}})
 $writer.WriteLine((@{id=$file.BaseName;lines=$lines} | ConvertTo-Json -Compress -Depth 7));$writer.Flush()
 $bitmap.Dispose();$stream.Dispose();$n++;if($n%50 -eq 0){Write-Output "$Subject $n/$($files.Count)"}
}}finally{$writer.Dispose()}
Write-Output "$Subject DONE $n"
