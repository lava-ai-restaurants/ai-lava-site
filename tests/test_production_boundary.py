"""Whole-deploy policy and static-route regression tests."""

from __future__ import annotations

import base64
import contextlib
import functools
import http.server
import json
import subprocess
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCANNER = ROOT / "scripts" / "scan_deploy_manifest.py"
ENCODED_ROOT = "Y2xpdmV1bmk="
ENCODED_EMPLOYER = "Y2xpdmU="


def decoded(value: str) -> str:
    return base64.b64decode(value).decode("utf-8")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


class ProductionBoundaryTests(unittest.TestCase):
    def test_whole_tracked_manifest_passes(self):
        with tempfile.TemporaryDirectory() as tempdir:
            output = Path(tempdir) / "manifest.json"
            subprocess.run(
                ["python3", str(SCANNER), "--output", str(output)],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            manifest = json.loads(output.read_text(encoding="utf-8"))
            tracked = subprocess.run(
                ["git", "ls-files"], cwd=ROOT, check=True, capture_output=True, text=True
            ).stdout.splitlines()
            self.assertTrue(manifest["clean"])
            self.assertEqual(manifest["tracked_artifact_count"], len(tracked))
            self.assertEqual(
                {item["path"] for item in manifest["artifacts"]}, set(tracked)
            )

    def test_protected_tree_is_absent(self):
        self.assertFalse((ROOT / decoded(ENCODED_ROOT)).exists())
        for item in ROOT.iterdir():
            self.assertNotIn(decoded(ENCODED_EMPLOYER), item.name.lower())

    def test_positive_and_negative_static_routes(self):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            for route in ("/", "/operator-opportunity-scan.html", "/operations.html"):
                with contextlib.closing(urllib.request.urlopen(base + route)) as response:
                    self.assertEqual(response.status, 200, route)

            protected_root = decoded(ENCODED_ROOT)
            for route in (
                f"/{protected_root}/",
                f"/{protected_root}/index.html",
                f"/{protected_root}/courses.json",
                f"/contracts/{protected_root}-topic-tutor-v1.json",
            ):
                with self.assertRaises(urllib.error.HTTPError) as raised:
                    urllib.request.urlopen(base + route)
                error = raised.exception
                self.assertEqual(error.code, 404, route)
                body = error.read().decode("utf-8", errors="replace").lower()
                error.close()
                self.assertNotIn(decoded(ENCODED_EMPLOYER), body)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

    def test_custom_not_found_page_is_safe(self):
        page = (ROOT / "404.html").read_text(encoding="utf-8").lower()
        self.assertIn("page is not available", page)
        self.assertNotIn(decoded(ENCODED_EMPLOYER), page)


if __name__ == "__main__":
    unittest.main()
