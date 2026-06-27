#!/usr/bin/env python3
"""Legacy entry — serves unified BuildWebGames root (not showcase/ subfolder)."""
import http.server
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', ''):
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def end_headers(self):
        if self.path.endswith(('.js', '.wasm', '.html', '.data', '.svg', '.cfg', '.CFG')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(os.environ.get('BEGW_PORT', os.environ.get('SHOWCASE_PORT', '8760')))
    print('Build Engine Games Web — unified server (via showcase/serve.py)')
    print('Root:', ROOT)
    print('Launcher: http://127.0.0.1:%d/' % port)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
