"""Run the course on loopback. Python standard library only."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import webbrowser

APP_DIRECTORY = Path(__file__).resolve().parent / "app"


class CourseHandler(SimpleHTTPRequestHandler):
    """Serve the app directory only, never the project or source library."""

    def do_GET(self):
        candidate = Path(self.translate_path(self.path)).resolve()
        if not candidate.is_relative_to(APP_DIRECTORY.resolve()):
            self.send_error(403)
            return
        if candidate.is_dir() and not (candidate / "index.html").exists():
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-cache")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' blob: data:; connect-src 'self'; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description="OSINT Практика — локальный курс")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Port must be between 1 and 65535")
    handler = partial(CourseHandler, directory=str(APP_DIRECTORY))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as exc:
        print(f"Не удалось запустить приложение: {exc}")
        print("Закройте предыдущий запуск или выберите другой порт: python start.py --port 8766")
        return 1
    url = f"http://127.0.0.1:{args.port}/"
    print(f"OSINT Практика: {url}")
    print("Для остановки нажмите Ctrl+C. Прогресс хранится в этом браузере.")
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nПриложение остановлено.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
