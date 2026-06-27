/* Showcase launcher — store user game files for web ports. */
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

  function saveActive(payload) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(payload, 'active');
        tx.oncomplete = function () { resolve(payload); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        var name = file.webkitRelativePath || file.name;
        if (name.indexOf('/') >= 0) {
          var parts = name.split('/');
          if (parts.length > 1) name = parts.slice(1).join('/');
        }
        resolve({ name: name, data: r.result });
      };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  function filesFromList(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    return Promise.all(files.map(readFile));
  }

  global.BEGW_Store = {
    saveActive: saveActive,
    filesFromList: filesFromList
  };
})(window);
