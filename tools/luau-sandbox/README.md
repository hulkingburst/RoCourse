# Builds the Luau sandbox WASM (`public/luau/luau.js` + `luau.wasm`).

The shipped sandbox is Luau (Roblox's Lua 5.1-derived language) compiled to
WebAssembly with Emscripten. It exposes a single `executeScript(source)` entry
point (see `execute_script.cpp`) that compiles the chunk, runs it in a fresh
`lua_State`, captures `print` output, and returns either the output or an
`ERROR:`-prefixed message. The worker contract lives in
`public/luau/luau-worker.js`.

Originally the sandbox shipped with a fixed, non-growable 16 MiB heap, so any
script that allocated past that ceiling aborted with
`Aborted(OOM). Build with -sASSERTIONS for more info.` This build sets
`-sALLOW_MEMORY_GROWTH=1` with a 64 MiB initial heap growing up to 2 GiB.

## Prerequisites

- Git, CMake, Ninja
- Python 3.9+ (real Python; the Windows Store alias is a stub)
- Emscripten SDK (install once):

```powershell
git clone https://github.com/emscripten-core/emsdk.git <tmp>\emsdk
python <tmp>\emsdk\emsdk.py install latest
python <tmp>\emsdk\emsdk.py activate latest
```

## Build

```powershell
.\tools\luau-sandbox\build.ps1
```

`build.ps1` by default skips re-cloning/re-building Luau when the archives
already exist; pass `-Clean` to force a full rebuild. Output overwrites
`public/luau/luau.js` and `public/luau/luau.wasm`.

## Key flags

| Flag | Value | Why |
| --- | --- | --- |
| `-sMODULARIZE=1 -sEXPORT_NAME=createLuau` | | Worker calls `createLuau()` via `importScripts` |
| `-sALLOW_MEMORY_GROWTH=1` | | Fixes the original OOM failure |
| `-sINITIAL_MEMORY` / `-sMAXIMUM_MEMORY` | 64 MiB / 2 GiB | |
| `-sEXPORTED_FUNCTIONS` | `_executeScript,_malloc,_free` | cwrap deps |
| `-sEXPORTED_RUNTIME_METHODS` | `cwrap,ccall,...` | worker uses `ccall`/`cwrap` |
| `-fexceptions` | | Luau compiler throws `CompileError` |
| `--no-entry` | | No `main`; the module only exports functions |