/* Browser save persistence (IndexedDB). Hooks createRednukemModule. */
(function (global) {
  'use strict';

  var DB_NAME = 'ww2pl-saves-v1';
  var STORE = 'files';

  var savCache = null;
  var prefetchPromise = null;

  function isSaveName(name) {
    return /^save\d+\.esv$/i.test(name);
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
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
          if (!cur) {
            resolve(out);
            return;
          }
          out[cur.key] = new Uint8Array(cur.value);
          cur.continue();
        };
        req.onerror = function () { resolve(out); };
      });
    });
  }

  function prefetchSaves() {
    if (prefetchPromise) return prefetchPromise;
    prefetchPromise = readAllFromDb()
      .then(function (out) {
        savCache = out;
        return out;
      })
      .catch(function (e) {
        console.warn('[WW2GI] prefetch saves failed:', e);
        savCache = savCache || {};
        return savCache;
      });
    return prefetchPromise;
  }

  function restoreCacheToFs(Module) {
    if (!Module || typeof Module.FS === 'undefined' || !savCache) return;
    for (var key in savCache) {
      if (!Object.prototype.hasOwnProperty.call(savCache, key)) continue;
      try {
        Module.FS.writeFile('/' + key, savCache[key]);
      } catch (e) {
        console.warn('[WW2GI] restore save:', key, e);
      }
    }
  }

  function refreshMenuLabels(Module) {
    if (!Module) return;
    try {
      if (typeof Module._ReadSaveGameHeaders === 'function') {
        Module._ReadSaveGameHeaders();
      }
    } catch (e) { /* optional export */ }
  }

  function loadIntoFs(Module, done) {
    if (!Module || typeof Module.FS === 'undefined') {
      done();
      return;
    }
    readAllFromDb().then(function (out) {
      savCache = out;
      restoreCacheToFs(Module);
      refreshMenuLabels(Module);
      done();
    }).catch(function (e) {
      console.warn('[WW2GI] IndexedDB load failed:', e);
      done();
    });
  }

  function persistFromFs(Module, done) {
    if (!Module || typeof Module.FS === 'undefined') {
      done();
      return;
    }
    var names;
    try { names = Module.FS.readdir('/'); } catch (e) {
      done();
      return;
    }
    if (!savCache) savCache = {};
    openDb().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      var store = tx.objectStore(STORE);
      var left = 0;
      var called = false;
      function finish() {
        if (called) return;
        called = true;
        done();
      }
      for (var i = 0; i < names.length; i++) {
        if (!isSaveName(names[i])) continue;
        left++;
        (function (n) {
          try {
            var raw = Module.FS.readFile('/' + n);
            store.put(raw, n);
            savCache[n] = raw;
          } catch (e) {
            console.warn('[WW2GI] persist save:', n, e);
          }
          left--;
          if (left <= 0) finish();
        })(names[i]);
      }
      if (left === 0) finish();
      tx.oncomplete = function () { finish(); };
    }).catch(function (e) {
      console.warn('[WW2GI] IndexedDB save failed:', e);
      done();
    });
  }

  function attach(Module) {
    Module.syncSavesToDB = function (populate, cb) {
      if (populate) {
        loadIntoFs(Module, function () { if (cb) cb(null); });
      } else {
        persistFromFs(Module, function () { if (cb) cb(null); });
      }
    };
    Module.refreshSaveMenuLabels = function () { refreshMenuLabels(Module); };
    if (global.__rrSaveTimer) clearInterval(global.__rrSaveTimer);
    global.__rrSaveTimer = setInterval(function () {
      if (Module.syncSavesToDB) Module.syncSavesToDB(false);
    }, 20000);
    if (!global.__rrSavePagehide) {
      global.__rrSavePagehide = true;
      global.addEventListener('pagehide', function () {
        if (Module.syncSavesToDB) Module.syncSavesToDB(false);
      });
    }
  }

  function whenReady(Module, userInit) {
    loadIntoFs(Module, function () {
      attach(Module);
      if (typeof userInit === 'function') userInit.call(Module);
    });
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
    var orig = global.createRednukemModule;
    if (typeof orig !== 'function') return false;
    global.__rrCreateHooked = true;
    global.createRednukemModule = function (opts) {
      opts = wrapModuleOpts(opts || {});
      var ret = prefetchSaves().then(function () {
        return orig(opts);
      });
      if (ret && typeof ret.then === 'function') {
        return ret.then(function (M) {
          attach(M);
          return M;
        });
      }
      return ret;
    };
    return true;
  }

  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && t.src && /rednukem\.js/i.test(t.src)) {
      installCreateHook();
    }
  }, true);

  function pollCreateHook() {
    if (!installCreateHook()) setTimeout(pollCreateHook, 0);
  }
  pollCreateHook();
  prefetchSaves();

  global.RRSaves = {
    attach: attach,
    whenReady: whenReady,
    loadIntoFs: loadIntoFs,
    persistFromFs: persistFromFs,
    refreshMenuLabels: refreshMenuLabels,
    prefetch: prefetchSaves
  };
})(typeof window !== 'undefined' ? window : globalThis);
