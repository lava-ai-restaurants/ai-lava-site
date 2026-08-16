#!/usr/bin/env python3
"""Fail closed unless every tracked artifact is approved and public-safe."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TRACKED_ALLOWLIST = {
    "_config.yml",
    "404.html",
    "CNAME",
    "accounting.html",
    "automations.html",
    "black-box-report.html",
    "bottleneck-audit.html",
    "branding.html",
    "fb-development.html",
    "index.html",
    "lava-overview.mp4",
    "lava-owner-operator-insight-poster.png",
    "lava-owner-operator-insight.mp4",
    "operations.html",
    "operator-opportunity-scan.html",
    "purchasing.html",
    "restaurant-diagnostic.html",
    "revenue-leak-screen.html",
    "reviews.html",
    "sales-events.html",
    "scan-app.js",
    "scan-styles.css",
    "scripts.js",
    "scripts/scan_deploy_manifest.py",
    "styles.css",
    "tests/test_hospitality.py",
    "tests/test_production_boundary.py",
    "training.html",
}

PUBLIC_DEPLOY_ALLOWLIST = TRACKED_ALLOWLIST - {
    "_config.yml",
    "scripts/scan_deploy_manifest.py",
    "tests/test_hospitality.py",
    "tests/test_production_boundary.py",
}

# Encoded so the policy source itself remains eligible for a byte-for-byte scan.
PROTECTED_TEXT_B64 = (
    "Y2xpdmU=",
    "d2VhcmVjbGl2ZS5jb20=",
    "Y2FsYSBzY290dHNkYWxl",
    "dGhlIGFtZXJpY2Fubw==",
    "dGVsbCB5b3VyIGZyaWVuZHM=",
    "bmVvbiBzcHVy",
    "YnVuZ2Fsb3cga2l0Y2hlbg==",
    "a3V6YQ==",
    "bWFuYWdlciBsb2cgZGlzY2lwbGluZQ==",
    "cmVzZXJ2YXRpb24gZGlzY2lwbGluZQ==",
    "c2hpZnQgYWNjb3VudGFiaWxpdHk=",
)

FORBIDDEN_PATH_PARTS_B64 = (
    "Y2xpdmV1bmk=",
    "Y29udHJhY3Rz",
    "ZG9jcy9wbGFucw==",
    "b3V0Lw==",
)

SECRET_PATTERNS = (
    re.compile(rb"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(rb"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"(?i)(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*['\"][^'\"\r\n]{8,}"),
    re.compile(b"-----BEGIN " + b"PRIVATE KEY-----"),
)


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def decode(value: str) -> bytes:
    return base64.b64decode(value)


def tracked_files() -> list[str]:
    raw = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, check=True, capture_output=True
    ).stdout
    return sorted(
        path.decode("utf-8")
        for path in raw.split(b"\0")
        if path and (ROOT / path.decode("utf-8")).is_file()
    )


def scan(require_clean: bool) -> tuple[dict, list[str]]:
    paths = tracked_files()
    actual = set(paths)
    errors: list[str] = []

    unexpected = sorted(actual - TRACKED_ALLOWLIST)
    missing = sorted(TRACKED_ALLOWLIST - actual)
    if unexpected:
        errors.append("unapproved tracked paths: " + ", ".join(unexpected))
    if missing:
        errors.append("allowlisted paths missing: " + ", ".join(missing))

    forbidden_path_parts = tuple(decode(item).decode("utf-8") for item in FORBIDDEN_PATH_PARTS_B64)
    for path in paths:
        lower_path = path.lower()
        if any(part in lower_path for part in forbidden_path_parts):
            errors.append(f"forbidden path: {path}")

    protected_terms = tuple(decode(item).lower() for item in PROTECTED_TEXT_B64)
    artifacts = []
    for path in paths:
        data = (ROOT / path).read_bytes()
        lower = data.lower()
        for index, term in enumerate(protected_terms):
            if term in lower:
                errors.append(f"protected content class {index + 1}: {path}")
        for index, pattern in enumerate(SECRET_PATTERNS):
            if pattern.search(data):
                errors.append(f"credential-shape class {index + 1}: {path}")
        artifacts.append(
            {
                "path": path,
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "deployable": path in PUBLIC_DEPLOY_ALLOWLIST,
            }
        )

    status = git("status", "--porcelain")
    if require_clean and status:
        errors.append("git worktree is not clean")

    artifact_digest = hashlib.sha256(
        json.dumps(artifacts, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    manifest = {
        "schema_version": 1,
        "commit": git("rev-parse", "HEAD"),
        "tracked_artifact_count": len(artifacts),
        "deployable_artifact_count": sum(item["deployable"] for item in artifacts),
        "artifact_manifest_sha256": artifact_digest,
        "artifacts": artifacts,
        "policy": {
            "tracked_allowlist_count": len(TRACKED_ALLOWLIST),
            "public_deploy_allowlist_count": len(PUBLIC_DEPLOY_ALLOWLIST),
            "protected_content_classes": len(PROTECTED_TEXT_B64),
            "credential_shape_classes": len(SECRET_PATTERNS),
        },
        "clean": not errors,
    }
    return manifest, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--require-clean", action="store_true")
    args = parser.parse_args()
    manifest, errors = scan(args.require_clean)
    rendered = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
