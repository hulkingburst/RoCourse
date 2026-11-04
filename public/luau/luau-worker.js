// Luau execution worker.
//
// Runs Luau in a dedicated Web Worker via the Emscripten build at /luau/luau.js
// (Roblox's Luau compiler + VM compiled to WASM). Running inside a worker keeps
// the main thread responsive and lets the page kill infinite loops by calling
// terminate() on this worker.
//
// Protocol:
//   in:  { id, code }
//   out: { id, started: true }              (engine ready, execution begins now)
//   out: { id, output, elapsed }            (success)
//   out: { id, error, elapsed }             (compile/runtime error)
//   out: { id, error, engineFailure: true } (engine never started)
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

    // The engine is loaded and the runtime is ready. Only now does the
    // script's own time budget start (see src/lib/luau-runtime.ts): fetching
    // and compiling the ~680 KB wasm on a cold connection must not be
    // reported as the learner's code hanging.
    self.postMessage({ id, started: true });

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
    // Keep the detail in the console for debugging; the learner gets one
    // actionable sentence, the same one the main thread uses for a failed
    // worker.
    console.error("[luau-worker] engine failed to start", err);
    self.postMessage({
      id,
      error: "The code runner couldn't start. Check your connection and try again.",
      engineFailure: true,
    });
  }
};

self.importScripts("/luau/luau.js");
