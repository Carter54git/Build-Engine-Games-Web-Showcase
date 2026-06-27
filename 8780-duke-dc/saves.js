/* Browser save persistence. Hooks createEDuke32Module. */
(function (global) {
  'use strict';
  var CREATE = 'createEDuke32Module';
  var SCRIPT_RE = /eduke32\.js/i;
  var DB_NAME = 'eduke32-saves-v1';
  var STORE = 'files';
  var savCache = null;
  var prefetchPromise = null;
  function isSaveName(name) { return /^save\d+\.esv$/i.test(name); }
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function readAllFromDb() {
    return openDb().then(function (db) {
      var out = {};
      return new Promise(function (resolve) {
        var req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        req.onsuccess = function () {
          var cur = req.result;
          if (!cur) { resolve(out); return; }
          out[cur.key] = new Uint8Array(cur.value);
          cur.continue();
        };
        req.onerror = function () { resolve(out); };
      });
    });
  }
  function prefetchSaves() {
    if (prefetchPromise) return prefetchPromise;
    prefetchPromise = readAllFromDb().then(function (out) { savCache = out; return out; })
      .catch(function () { savCache = savCache || {}; return savCache; });
    return prefetchPromise;
  }
  function restoreCacheToFs(Module) {
    if (!Module || !Module.FS || !savCache) return;
    for (var key in savCache) {
      if (!Object.prototype.hasOwnProperty.call(savCache, key)) continue;
      try { Module.FS.writeFile('/' + key, savCache[key]); } catch (e) {}
    }
  }
  function loadIntoFs(Module, done) {
    if (!Module || !Module.FS) { done(); return; }
    readAllFromDb().then(function (out) {
      savCache = out; restoreCacheToFs(Module); done();
    }).catch(function () { done(); });
  }
  function persistFromFs(Module, done) {
    if (!Module || !Module.FS) { done(); return; }
    var names;
    try { names = Module.FS.readdir('/'); } catch (e) { done(); return; }
    if (!savCache) savCache = {};
    openDb().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      var store = tx.objectStore(STORE);
      var left = 0, called = false;
      function finish() { if (!called) { called = true; done(); } }
      for (var i = 0; i < names.length; i++) {
        if (!isSaveName(names[i])) continue;
        left++;
        (function (n) {
          try { var raw = Module.FS.readFile('/' + n); store.put(raw, n); savCache[n] = raw; } catch (e) {}
          left--; if (left <= 0) finish();
        })(names[i]);
      }
      if (left === 0) finish();
      tx.oncomplete = function () { finish(); };
    }).catch(function () { done(); });
  }
  function attach(Module) {
    Module.syncSavesToDB = function (populate, cb) {
      if (populate) loadIntoFs(Module, function () { if (cb) cb(null); });
      else persistFromFs(Module, function () { if (cb) cb(null); });
    };
    if (global.__rrSaveTimer) clearInterval(global.__rrSaveTimer);
    global.__rrSaveTimer = setInterval(function () {
      if (Module.syncSavesToDB) Module.syncSavesToDB(false);
    }, 20000);
  }
  function wrapModuleOpts(opts) {
    opts = opts || {};
    var userOri = opts.onRuntimeInitialized;
    opts.onRuntimeInitialized = function () {
      restoreCacheToFs(this);
      if (typeof userOri === 'function') userOri.call(this);
    };
    return opts;
  }
  function installCreateHook() {
    if (global.__rrCreateHooked) return true;
    var orig = global[CREATE];
    if (typeof orig !== 'function') return false;
    global.__rrCreateHooked = true;
    global[CREATE] = function (opts) {
      opts = wrapModuleOpts(opts || {});
      var ret = prefetchSaves().then(function () { return orig(opts); });
      if (ret && typeof ret.then === 'function') {
        return ret.then(function (M) { attach(M); return M; });
      }
      return ret;
    };
    return true;
  }
  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && t.src && SCRIPT_RE.test(t.src)) installCreateHook();
  }, true);
  function poll() { if (!installCreateHook()) setTimeout(poll, 0); }
  poll();
  prefetchSaves();
  global.RRSaves = { attach: attach, loadIntoFs: loadIntoFs, prefetch: prefetchSaves };
})(typeof window !== 'undefined' ? window : globalThis);
