/* Inject user-provided game data from launcher (IndexedDB, same origin). */
(function (global) {
  'use strict';

  var DB_NAME = 'begw-showcase-v1';
  var STORE = 'payload';

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

  function readPayload() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get('active');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function normalizeMountPath(relPath) {
    var norm = relPath.replace(/\\/g, '/');
    var leaf = norm.split('/').pop() || '';
    if (leaf.toUpperCase() === 'VACATION.GRP') {
      return norm.slice(0, norm.length - leaf.length) + 'vacation.grp';
    }
    if (leaf.toUpperCase() === 'LIQUID.PAK' || leaf.toUpperCase() === 'LIQUID.GRP') {
      return norm.slice(0, norm.length - leaf.length) + 'liquid.grp';
    }
    // Loose-file ports (Witchaven, TekWar, …) use lowercase paths in the Emscripten VFS.
    var parts = norm.split('/');
    for (var i = 0; i < parts.length; i++) {
      if (/\.(art|map|dat|snd|cfg|ini|bat|nfo|pal)$/i.test(parts[i]))
        parts[i] = parts[i].toLowerCase();
    }
    return parts.join('/');
  }

  function writeFile(Module, relPath, bytes) {
    relPath = normalizeMountPath(relPath);
    var parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);
    var name = parts.pop();
    var dir = '/';
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      var probe = dir === '/' ? '/' + seg : dir + '/' + seg;
      try { Module.FS.lookupPath(probe); }
      catch (e) {
        try { Module.FS.mkdir(probe); } catch (e2) {}
      }
      dir = probe;
    }
    var out = dir === '/' ? '/' + name : dir + '/' + name;
    try { Module.FS.unlink(out); } catch (e3) {}
    Module.FS.writeFile(out, bytes);
    return out;
  }

  var pending = null;
  var mounted = false;

  function prepare() {
    if (!/usergrp=1/.test(location.search)) {
      return Promise.resolve(null);
    }
    return readPayload().then(function (payload) {
      if (!payload || !payload.files || !payload.files.length) {
        var hint = 'Open the launcher at http://127.0.0.1:8760/ on the SAME port, select files, then Launch.';
        if (location.port && location.port !== '8760') {
          hint = 'Wrong server port (' + location.port + '). Use one server: start-servers.ps1 → http://127.0.0.1:8760/';
        }
        throw new Error('No game files in launcher storage. ' + hint);
      }
      if (payload.gameId && /[?&]game=/.test(location.search) === false) {
        var qGame = new URLSearchParams(location.search).get('game');
        if (qGame && qGame !== payload.gameId) {
          console.warn('[BEGW] Launcher saved data for ' + payload.gameId + ' but opening ' + qGame);
        }
      }
      pending = payload;
      mounted = false;
      return payload;
    });
  }

  function mount(Module) {
    if (!pending || !Module || !Module.FS || mounted) return;
    var n = 0;
    for (var i = 0; i < pending.files.length; i++) {
      var f = pending.files[i];
      if (!f || !f.name || !f.data) continue;
      try {
        writeFile(Module, f.name, new Uint8Array(f.data));
        n++;
      } catch (e) {
        console.warn('[BEGW] write failed:', f.name, e);
      }
    }
    mounted = true;
    console.log('[BEGW] Installed ' + n + ' user file(s) for ' + (pending.gameId || 'game'));
  }

  function wrapArgs(args, payload) {
    if (!payload || !payload.gamegrpArg) return args;
    var out = args.slice();
    var has = false;
    for (var i = 0; i < out.length; i++) {
      if (out[i] === '-gamegrp' || out[i] === '-g') { has = true; break; }
    }
    if (!has) out.push('-gamegrp', payload.gamegrpArg);
    return out;
  }

  function patchModuleOptions(opts) {
    if (!pending) return opts;
    opts = opts || {};
    var pre = function () { mount(this); };
    if (Array.isArray(opts.preRun)) opts.preRun.push(pre);
    else if (opts.preRun) opts.preRun = [opts.preRun, pre];
    else opts.preRun = [pre];

    var origInit = opts.onRuntimeInitialized;
    opts.onRuntimeInitialized = function () {
      mount(this);
      if (typeof origInit === 'function') origInit.call(this);
    };
    return opts;
  }

  global.BEGW_UserGrp = {
    prepare: prepare,
    mount: mount,
    wrapArgs: wrapArgs,
    patchModuleOptions: patchModuleOptions,
    getPending: function () { return pending; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
