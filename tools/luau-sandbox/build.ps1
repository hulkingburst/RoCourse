param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$publicDir = Join-Path $repoRoot "public\luau"
$tmp = Join-Path $env:TEMP "opencode\luau-wasm-build"
$emsdkRoot = Join-Path $env:USERPROFILE ".emsdk"

function Find-Python {
    foreach ($cand in @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        (Get-Command python -ErrorAction SilentlyContinue).Source
    )) {
        if ($cand -and (Test-Path $cand)) { return $cand }
    }
    throw "Python 3.9+ not found"
}

function Ensure-Emsdk {
    if (-not (Test-Path (Join-Path $emsdkRoot "emsdk.py"))) {
        git clone --depth 1 https://github.com/emscripten-core/emsdk.git $emsdkRoot
    }
    if (-not (Test-Path (Join-Path $emsdkRoot "upstream\emscripten\emcc.bat"))) {
        & (Find-Python) (Join-Path $emsdkRoot "emsdk.py") install latest
        & (Find-Python) (Join-Path $emsdkRoot "emsdk.py") activate latest
    }
}

function Ensure-Luau {
    $luau = Join-Path $tmp "luau"
    if ($Clean -and (Test-Path $luau)) { Remove-Item -Recurse -Force $luau }
    if (-not (Test-Path $luau)) {
        git clone --depth 1 https://github.com/luau-lang/luau.git $luau
    }
    return $luau
}

function Invoke-EmscriptenBuild {
    param([string]$LuauRoot, [string]$OutDir)

    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

    if ($Clean) {
        cmake -S $LuauRoot -B (Join-Path $LuauRoot "build-wasm") -G Ninja `
            -DCMAKE_TOOLCHAIN_FILE="$emsdkRoot\upstream\emscripten\cmake\Modules\Platform\Emscripten.cmake" `
            -DCMAKE_BUILD_TYPE=Release -DLUAU_BUILD_TESTS=OFF -DLUAU_BUILD_CLI=OFF -DLUAU_WERROR=OFF
    }
    cmake --build (Join-Path $LuauRoot "build-wasm") --target Luau.Compiler Luau.VM

    em++ (Join-Path $PSScriptRoot "execute_script.cpp") `
        "-I" (Join-Path $LuauRoot "VM\include") `
        "-I" (Join-Path $LuauRoot "Compiler\include") `
        "-I" (Join-Path $LuauRoot "Ast\include") `
        "-I" (Join-Path $LuauRoot "Bytecode\include") `
        "-I" (Join-Path $LuauRoot "Common\include") `
        -o (Join-Path $OutDir "luau.js") `
        "-Wl,--start-group" `
        (Join-Path $LuauRoot "build-wasm\libLuau.Ast.a") `
        (Join-Path $LuauRoot "build-wasm\libLuau.Bytecode.a") `
        (Join-Path $LuauRoot "build-wasm\libLuau.Common.a") `
        (Join-Path $LuauRoot "build-wasm\libLuau.Compiler.a") `
        (Join-Path $LuauRoot "build-wasm\libLuau.VM.a") `
        "-Wl,--end-group" `
        "-sMODULARIZE=1" "-sEXPORT_NAME=createLuau" `
        "-sENVIRONMENT=web,worker,node" `
        "-sALLOW_MEMORY_GROWTH=1" `
        "-sINITIAL_MEMORY=67108864" `
        "-sMAXIMUM_MEMORY=2147483648" `
        "-sSTACK_SIZE=1048576" "-sFILESYSTEM=0" "-sASSERTIONS=0" `
        "-sEXPORTED_FUNCTIONS=_executeScript,_malloc,_free" `
        "-sEXPORTED_RUNTIME_METHODS=cwrap,ccall,UTF8ToString,stringToUTF8,lengthBytesUTF8" `
        "-O2" "-fexceptions" "--no-entry"
}

# Source the Emscripten environment for em++/cmake in this shell.
& (Join-Path $emsdkRoot "emsdk_env.ps1") | Out-Null

$luauRoot = Ensure-Luau
$outDir = Join-Path $tmp "out"
Invoke-EmscriptenBuild -LuauRoot $luauRoot -OutDir $outDir

Copy-Item -Force (Join-Path $outDir "luau.js"), (Join-Path $outDir "luau.wasm") $publicDir
Write-Host "Updated $publicDir\luau.js and $publicDir\luau.wasm"