#!/usr/bin/env python3
"""Prepare a source-only staging copy. No environment credentials or network."""

import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "generated-artifacts" / "geit-energy-dt-staging-source"
ARCHIVE = OUTPUT.with_suffix(".zip")
ROOT_FILES = {
    ".gitignore", ".npmrc", ".replitignore", "package.json",
    "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json", "tsconfig.base.json",
}
# Include these new files before their first commit, not arbitrary untracked
# uploads, local databases, credentials, approvals or customer exports.
PREPARATION_FILES = {
    "scripts/prepare-staging-source.py",
    "config/staging.replit.example",
    "config/staging.env.example",
    "config/staging-approval.example.json",
    "config/staging-post-merge.sh.example",
    "docs/staging-isolation.md",
    "docs/staging-setup-guide.md",
    "artifacts/api-server/scripts/staging-preflight.mjs",
    "artifacts/api-server/src/lib/staging-isolation.ts",
    "artifacts/api-server/tests/staging-isolation.test.ts",
}
SKIP_PARTS = {
    ".git", ".agents", ".local", "node_modules", "dist", "coverage",
    "generated-artifacts", "attached_assets", "screenshots", ".cache",
    "uploads", "backups",
}
SKIP_SUFFIXES = {
    ".csv", ".xlsx", ".xls", ".pdf", ".log", ".dump", ".sqlite",
    ".sqlite3", ".db", ".zip", ".gz", ".pem", ".key", ".p12",
    ".tsbuildinfo",
}
SECRET_PATTERNS = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}"),
    re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"(?im)^\s*//[^\n]*:_authToken\s*=\s*(?!\$\{)\S+"),
]
DATABASE_LITERAL = re.compile(r"postgres(?:ql)?://[^\s/:@]+:([^\s@]+)@[^\s\"'`]+")
TEXT_SUFFIXES = {
    ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".yaml", ".yml",
    ".toml", ".md", ".html", ".css", ".sql", ".sh", ".py", ".example",
}


def selected(relative):
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts or any(p in SKIP_PARTS for p in path.parts):
        return False
    if path.suffix.lower() in SKIP_SUFFIXES or path.name.startswith(".env"):
        return False
    if path.name == "staging-approval.json":
        return False
    if path.suffix == ".sql" and path.parts[:3] != ("artifacts", "api-server", "migrations"):
        return False
    if relative in ROOT_FILES or relative in PREPARATION_FILES:
        return True
    if path.parts[0] in {"artifacts", "lib", "scripts"}:
        return True
    return path.parts[0] == "docs" and path.suffix == ".md"


def reject_embedded_credentials(relative, contents):
    if Path(relative).suffix not in TEXT_SUFFIXES and relative != ".npmrc":
        return
    text = contents.decode("utf-8")
    if any(pattern.search(text) for pattern in SECRET_PATTERNS):
        raise ValueError(f"Potential embedded credential; export stopped at {relative}. Values withheld.")
    for match in DATABASE_LITERAL.finditer(text):
        password = match.group(1)
        # Preserve the existing offline test inputs, not actual connection URIs.
        synthetic_test = (
            "/tests/" in relative
            and password in {"synthetic", "different-synthetic"}
        )
        if not synthetic_test:
            raise ValueError(f"Credential-shaped database literal; export stopped at {relative}. Values withheld.")


def main():
    if OUTPUT.exists() or ARCHIVE.exists():
        raise ValueError("Staging output already exists; refusing to overwrite it.")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT,
    ).decode("utf-8").split("\0")
    paths = sorted(set(filter(None, tracked)) | PREPARATION_FILES)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".staging-source-", dir=OUTPUT.parent) as temporary:
        stage = Path(temporary) / OUTPUT.name
        stage.mkdir()
        for relative in paths:
            if not selected(relative):
                continue
            source = ROOT / relative
            if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(ROOT):
                raise ValueError("A selected source file is missing or unsafe; export stopped.")
            for parent in source.parents:
                if parent == ROOT:
                    break
                if parent.is_symlink():
                    raise ValueError("Symlinked source directory; export stopped.")
            contents = source.read_bytes()
            reject_embedded_credentials(relative, contents)
            target = stage / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            target.chmod(0o644)

        # Only the COPY receives these replacements. Never edit active config.
        shutil.copyfile(ROOT / "config/staging.replit.example", stage / ".replit")
        shutil.copyfile(
            ROOT / "config/staging-post-merge.sh.example", stage / "scripts/post-merge.sh",
        )
        (stage / "replit.md").write_text(
            "# Unverified GEIT Energy DT staging source copy\n\n"
            "Read docs/staging-setup-guide.md before configuring or running this copy.\n"
            "Never copy production credentials or customer data. Fixture writes are disabled.\n"
            "Do not deploy, apply schema changes, or run fixtures without separate approval.\n"
            "No environment isolation or production readiness has been established.\n",
            encoding="utf-8",
        )
        (stage / "STAGING-IMPORT-README.md").write_text(
            "# Import only into a new staging application\n\n"
            "This source package contains no environment configuration values, local approvals,\n"
            "dependencies, generated app build, database dumps or test-account fixtures.\n"
            "No application has been deployed or independently verified.\n\n"
            "Follow docs/staging-setup-guide.md. Do not start this copy in the current workspace:\n"
            "a subdirectory is NOT an isolated process environment and can inherit live secrets.\n",
            encoding="utf-8",
        )
        inventory = {}
        for file in sorted(stage.rglob("*")):
            if file.is_file():
                inventory[file.relative_to(stage).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
        manifest = {
            "format": 1,
            "purpose": "unverified staging source preparation only",
            "fixtureWrites": "disabled",
            "environmentVerified": False,
            "fileCount": len(inventory),
            "replacements": {
                ".replit": "config/staging.replit.example",
                "scripts/post-merge.sh": "config/staging-post-merge.sh.example",
                "replit.md": "staging-only safety instructions",
            },
            "excluded": [
                "Secrets and environment-variable values (not read)",
                "environment files and local staging approvals",
                "Git history, agent memory, raw attachments and screenshots",
                "untracked files except the explicit staging preparation list",
                "customer exports, database dumps, dependencies and app builds",
            ],
            "credentialScan": "Known-pattern source scan only; not an exhaustive security certification.",
            "sha256": inventory,
        }
        (stage / "STAGING-SOURCE-MANIFEST.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8",
        )
        temporary_zip = Path(temporary) / ARCHIVE.name
        with zipfile.ZipFile(temporary_zip, "x", compression=zipfile.ZIP_DEFLATED) as archive:
            for file in sorted(stage.rglob("*")):
                if file.is_file():
                    archive.write(file, (Path(OUTPUT.name) / file.relative_to(stage)).as_posix())
        stage.rename(OUTPUT)
        temporary_zip.rename(ARCHIVE)
    print(json.dumps({
        "sourceDirectory": OUTPUT.relative_to(ROOT).as_posix(),
        "archive": ARCHIVE.relative_to(ROOT).as_posix(),
        "archiveSha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
        "sourceFiles": len(inventory),
        "configuration": "UNVERIFIED; no credentials configured",
        "networkOrDatabaseConnections": 0,
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, UnicodeError, subprocess.SubprocessError):
        # Avoid propagating data or connection-shaped text from exception objects.
        raise SystemExit("Staging source preparation stopped safely. Check source selection or credential-shaped literals; no values displayed.")
