#!/usr/bin/env python3
"""Static server for Blood: Lenin First Blood web testing."""
import http.server
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith(('.js', '.wasm', '.html', '.data')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(os.environ.get('FBLOOD_PORT', '8770'))
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
