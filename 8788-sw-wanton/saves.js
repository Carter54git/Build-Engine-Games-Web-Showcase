/* Browser save persistence for Shadow Warrior (gameN.sav). Pattern from NAM/Rednukem. */
(function (global) {
  'use strict';

  var CREATE = 'createVoidswModule';
  var SCRIPT_RE = /voidsw\.js/i;
  var DB_NAME = 'sw-wanton-saves-v1';
  var STORE = 'files';

  var savCache = null;
  var prefetchPromise = null;

  function isSaveName(name) {
    return /^game\d+\.sav$/i.test(name);
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
        console.warn('[VoidSW] prefetch saves failed:', e);
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
        console.warn('[VoidSW] restore save:', key, e);
      }
    }
  }

  function refreshMenuLabels(Module) {
    if (!Module) return;
    var fn = Module._SW_ReadSaveGameHeaders;
    if (typeof fn !== 'function') return;
    setTimeout(function () {
      try {
        fn();
      } catch (e) {
        console.warn('[VoidSW] refresh save headers:', e);
      }
    }, 0);
  }

  function loadIntoFs(Module, done) {
    if (!Module || typeof Module.FS === 'undefined') {
      done();
      return;
    }
    readAllFromDb().then(function (out) {
      savCache = out;
      restoreCacheToFs(Module);
      setTimeout(function () { refreshMenuLabels(Module); }, 0);
      done();
    }).catch(function (e) {
      console.warn('[VoidSW] IndexedDB load failed:', e);
      done();
    });
  }

  function persistFromFs(Module, done) {
    if (!Module || typeof Module.FS === 'undefined') {
      done();
      return;
    }
    if (persistInFlight) {
      done();
      return;
    }
    persistInFlight = true;
    var names;
    try {
      names = Module.FS.readdir('/');
    } catch (e) {
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
        persistInFlight = false;
        refreshMenuLabels(Module);
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
            console.warn('[VoidSW] persist save:', n, e);
          }
          left--;
          if (left <= 0) finish();
        })(names[i]);
      }
      if (left === 0) finish();
      tx.oncomplete = function () { finish(); };
    }).catch(function (e) {
      console.warn('[VoidSW] IndexedDB save failed:', e);
      persistInFlight = false;
      done();
    });
  }

  var persistInFlight = false;

  function attach(Module) {
    Module.syncSavesToDB = function (populate, cb) {
      if (populate) {
        loadIntoFs(Module, function () { if (cb) cb(null); });
      } else {
        persistFromFs(Module, function () { if (cb) cb(null); });
      }
    };
    Module.refreshSaveMenuLabels = function () {
      refreshMenuLabels(Module);
    };
    Module.flushSavesNow = function (cb) {
      persistFromFs(Module, function () { if (cb) cb(null); });
    };
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
    if (t && t.tagName === 'SCRIPT' && t.src && SCRIPT_RE.test(t.src)) {
      installCreateHook();
    }
  }, true);

  function poll() {
    if (!installCreateHook()) setTimeout(poll, 0);
  }
  poll();
  prefetchSaves();

  global.RRSaves = {
    attach: attach,
    loadIntoFs: loadIntoFs,
    persistFromFs: persistFromFs,
    refreshMenuLabels: refreshMenuLabels,
    prefetch: prefetchSaves
  };
})(typeof window !== 'undefined' ? window : globalThis);
