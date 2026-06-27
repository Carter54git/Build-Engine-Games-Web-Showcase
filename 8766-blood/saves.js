/* Browser save persistence (IndexedDB). Hooks createNBloodModule — no run.html changes. */
(function (global) {
  'use strict';

  var DB_NAME = 'nblood-saves-v1';
  var STORE = 'files';
  var SAV_MAGIC = 0x5653424e; /* 'VSBN' */
  var GO_OFF = 6;
  var GO_ZLEVEL = 12;
  var GO_ZUSER = 784;
  var GO_MIN = 1042;

  var savCache = null;
  var prefetchPromise = null;

  function isSaveName(name) {
    return /^game\d+\.sav(_tmp)?$/i.test(name);
  }

  function readCString(u8, off, maxLen) {
    var s = '';
    for (var i = 0; i < maxLen; i++) {
      var c = u8[off + i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  /** If szUserGameName is empty/<Empty>, copy zLevelName for LoadSavedInfo after reload. */
  function patchSavLabelBytes(u8) {
    if (u8.length < GO_MIN) return u8;
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (dv.getUint32(0, true) !== SAV_MAGIC) return u8;
    var user = readCString(u8, GO_OFF + GO_ZUSER, 256);
    if (user && user !== '<Empty>') return u8;
    var level = readCString(u8, GO_OFF + GO_ZLEVEL, 256).trim();
    if (!level) return u8;
    var out = new Uint8Array(u8);
    var label = level.substring(0, 15);
    var base = GO_OFF + GO_ZUSER;
    for (var i = 0; i < 256; i++) out[base + i] = 0;
    for (var j = 0; j < label.length; j++) out[base + j] = label.charCodeAt(j);
    return out;
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
          out[cur.key] = patchSavLabelBytes(new Uint8Array(cur.value));
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
        console.warn('[NBlood] prefetch saves failed:', e);
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
        console.warn('[NBlood] restore save:', key, e);
      }
    }
  }

  function refreshMenuLabels(Module) {
    if (!Module || typeof Module.ccall !== 'function') return;
    try {
      Module.ccall('LoadSavedInfo', 'void', [], []);
    } catch (e) { /* not exported in reference wasm */ }
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
      console.warn('[NBlood] IndexedDB load failed:', e);
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
            var raw = patchSavLabelBytes(Module.FS.readFile('/' + n));
            store.put(raw, n);
            savCache[n] = raw;
          } catch (e) {
            console.warn('[NBlood] persist save:', n, e);
          }
          left--;
          if (left <= 0) finish();
        })(names[i]);
      }
      if (left === 0) finish();
      tx.oncomplete = function () { finish(); };
    }).catch(function (e) {
      console.warn('[NBlood] IndexedDB save failed:', e);
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
    if (global.__nbSaveTimer) clearInterval(global.__nbSaveTimer);
    global.__nbSaveTimer = setInterval(function () {
      if (Module.syncSavesToDB) Module.syncSavesToDB(false);
    }, 20000);
    if (!global.__nbSavePagehide) {
      global.__nbSavePagehide = true;
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

  function installCreateNBloodHook() {
    if (global.__nbCreateHooked) return true;
    var orig = global.createNBloodModule;
    if (typeof orig !== 'function') return false;
    global.__nbCreateHooked = true;
    global.createNBloodModule = function (opts) {
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
    if (t && t.tagName === 'SCRIPT' && t.src && /nblood\.js/i.test(t.src)) {
      installCreateNBloodHook();
    }
  }, true);

  function pollCreateNBloodHook() {
    if (!installCreateNBloodHook()) setTimeout(pollCreateNBloodHook, 0);
  }
  pollCreateNBloodHook();
  prefetchSaves();

  global.NBSaves = {
    attach: attach,
    whenReady: whenReady,
    loadIntoFs: loadIntoFs,
    persistFromFs: persistFromFs,
    refreshMenuLabels: refreshMenuLabels,
    prefetch: prefetchSaves
  };
})(typeof window !== 'undefined' ? window : globalThis);
