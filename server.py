#!/usr/bin/env python3
"""Local-only web server for PyThermal AI."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, fmt, *args):
        print('[PyThermal]', fmt % args)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PyThermal AI local camera web app')
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('port must be between 1 and 65535')
    handler = partial(Handler, directory=str(ROOT))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Open http://localhost:{args.port} in Chrome')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nStopped')
