from functools import partial
from http.server import ThreadingHTTPServer
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen, Request

from start import APP_DIRECTORY, CourseHandler


class QuietHandler(CourseHandler):
    def log_message(self, *args):
        pass


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(APP_DIRECTORY)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_app_and_assets(self):
        for path, expected in [('/', b'OSINT'), ('/core.js', b'CourseCore'), ('/data.js', b'COURSE_DATA')]:
            with self.subTest(path=path), urlopen(self.url + path, timeout=3) as response:
                self.assertEqual(response.status, 200)
                self.assertIn(expected, response.read())
                self.assertEqual(response.headers['X-Content-Type-Options'], 'nosniff')

    def test_does_not_serve_project_sources_or_private_archive(self):
        for path in ['/content/LOCAL_MATERIALS.md', '/content/local_inventory.json', '/.git/config', '/../start.py', '/%2e%2e/start.py']:
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.url + path, timeout=3)
                self.assertEqual(error.exception.code, 404)

    def test_no_directory_listing(self):
        for method in ['GET', 'HEAD']:
            with self.subTest(method=method):
                with self.assertRaises(HTTPError) as error:
                    urlopen(Request(self.url + '/not-a-directory/', method=method), timeout=3)
                self.assertEqual(error.exception.code, 404)


if __name__ == '__main__':
    unittest.main()
