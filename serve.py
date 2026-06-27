#!/usr/bin/env python3
"""Unified HTTP server — launcher + all games on one port (same origin for IndexedDB)."""
import http.server
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', ''):
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    port = int(os.environ.get('BEGW_PORT', '8760'))
    print('Build Engine Games Web — unified server')
    print('Root:', ROOT)
    print('Launcher:  http://127.0.0.1:%d/' % port)
    print('Games:     http://127.0.0.1:%d/<game-dir>/run.html' % port)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
