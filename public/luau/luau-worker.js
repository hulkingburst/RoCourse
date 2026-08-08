// Luau execution worker.
//
// Runs Luau in a dedicated Web Worker via the Emscripten build at /luau/luau.js
// (Roblox's Luau compiler + VM compiled to WASM). Running inside a worker keeps
// the main thread responsive and lets the page kill infinite loops by calling
// terminate() on this worker.
//
// Protocol:
//   in:  { id, code }
//   out: { id, output, elapsed }            (success)
//   out: { id, error, elapsed }             (compile/runtime error)
//
// `createLuau` and `locateFile` come from luau.js (Emscripten MODULARIZE
// output). importScripts is synchronous, so the handler is registered first to
// avoid dropping messages during startup.

self.onmessage = async (event) => {
  const { id, code } = event.data;

  try {
    const Module = await createLuau({
      locateFile: (path) => "/luau/" + path,
    });
    const executeScript = Module.cwrap("executeScript", "string", ["string"]);

    const started = performance.now();
    let result;
    try {
      result = executeScript(code);
    } catch (err) {
      result = "ERROR:" + (err && err.message ? err.message : String(err));
    }
    const elapsed = performance.now() - started;

    if (typeof result === "string" && result.indexOf("ERROR:") === 0) {
      self.postMessage({ id, error: result.slice(6), elapsed });
    } else {
      self.postMessage({ id, output: result || "", elapsed });
    }
  } catch (err) {
    self.postMessage({
      id,
      error: err && err.message ? err.message : String(err),
    });
  }
};

self.importScripts("/luau/luau.js");
