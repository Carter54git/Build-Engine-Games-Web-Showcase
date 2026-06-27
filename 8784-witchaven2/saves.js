/* Browser save persistence (IndexedDB). */
(function (global) {
  'use strict';

  var DB_NAME = 'witchaven2-saves-v1';
  var STORE = 'files';
  var savCache = null;
  var prefetchPromise = null;

  function isSaveName(name) {
    return /^save\d+\./i.test(name) || /^whsave/i.test(name);
  }

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
    prefetchPromise = readAllFromDb().then(function (out) {
      savCache = out;
      return out;
    }).catch(function () {
      savCache = savCache || {};
      return savCache;
    });
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
      savCache = out;
      restoreCacheToFs(Module);
      done();
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
          try {
            var raw = Module.FS.readFile('/' + n);
            store.put(raw, n);
            savCache[n] = raw;
          } catch (e) {}
          left--;
          if (left <= 0) finish();
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
    if (global.__whSaveTimer) clearInterval(global.__whSaveTimer);
    global.__whSaveTimer = setInterval(function () {
      if (Module.syncSavesToDB) Module.syncSavesToDB(false);
    }, 20000);
    if (!global.__whSavePagehide) {
      global.__whSavePagehide = true;
      global.addEventListener('pagehide', function () {
        if (Module.syncSavesToDB) Module.syncSavesToDB(false);
      });
    }
  }

  function installCreateHook() {
    if (global.__whCreateHooked) return true;
    var orig = global.createEWitchavenModule;
    if (typeof orig !== 'function') return false;
    global.__whCreateHooked = true;
    global.createEWitchavenModule = function (opts) {
      var userOri = opts && opts.onRuntimeInitialized;
      if (opts) {
        opts.onRuntimeInitialized = function () {
          restoreCacheToFs(this);
          if (typeof userOri === 'function') userOri.call(this);
        };
      }
      var ret = prefetchSaves().then(function () { return orig(opts); });
      if (ret && typeof ret.then === 'function') {
        return ret.then(function (M) { attach(M); return M; });
      }
      return ret;
    };
    return true;
  }

  function pollCreateHook() {
    if (!installCreateHook()) setTimeout(pollCreateHook, 0);
  }
  pollCreateHook();
  prefetchSaves();

  global.WHSaves = { attach: attach, loadIntoFs: loadIntoFs, prefetch: prefetchSaves };
})(typeof window !== 'undefined' ? window : globalThis);
