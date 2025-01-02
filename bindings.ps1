$bindings = ""

if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#")) {
            $name, $value = $line -split "=", 2
            $value = $value -replace '^"(.*)"$', '$1'
            $bindings += "-b ${name}=${value} "
        }
    }
}

$bindings = $bindings.TrimEnd()
Write-Output $bindings
