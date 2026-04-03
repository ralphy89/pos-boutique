#!/usr/bin/env python3
"""Helpers: clone/update install, run start-local.bat, open the browser."""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

DEFAULT_PUBLIC_REPO_URL = "https://github.com/ralphy89/pos-boutique.git"

# Vite dev server and FastAPI default ports (match scripts/start-local.ps1 unless you change both).
DEFAULT_UI_PORT = 8089
DEFAULT_API_PORT = 8090


def _script_dir() -> Path:
    return Path(__file__).resolve().parent


def _valid_pos_install(path: Path) -> bool:
    return (path / "scripts" / "start-local.ps1").is_file()


def _program_files_pos_root() -> Path:
    """%USERPROFILE%\\POS-Boutique, or POS_BOUTIQUE_HOME when set."""
    if custom := os.environ.get("POS_BOUTIQUE_HOME", "").strip():
        p = Path(os.path.expandvars(custom)).expanduser().resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    profile = os.environ.get("USERPROFILE", "").strip()
    base = Path(profile) if profile else Path.home()
    install = base / "POS-Boutique"
    try:
        install.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"Cannot create {install}: {e}. Set POS_BOUTIQUE_HOME to a writable folder.", file=sys.stderr)
        raise SystemExit(2) from e
    return install.resolve()


def _git_origin_url(repo: Path) -> str | None:
    git = shutil.which("git")
    if not git:
        return None
    try:
        cp = subprocess.run(
            [git, "-C", str(repo), "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        return (cp.stdout or "").strip() or None
    except (subprocess.CalledProcessError, OSError, subprocess.TimeoutExpired):
        return None


def _resolve_clone_url(explicit: str | None) -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    if env := os.environ.get("POS_BOUTIQUE_REPO_URL", "").strip():
        return env
    return _git_origin_url(_script_dir()) or DEFAULT_PUBLIC_REPO_URL


def _internet_reachable(*, timeout: float = 3.0) -> bool:
    """Return True if a short TCP connect to a public host succeeds (best-effort; no DNS)."""
    for host, port in (("1.1.1.1", 443), ("8.8.8.8", 53), ("9.9.9.9", 443)):
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False


def prepare_pos_boutique_install_or_update(
    *,
    repo_url: str | None = None,
    shallow: bool = True,
) -> Path:
    """
    If the network looks available: clone or git pull (via clone_or_update_pos_boutique_in_program_files).
    If offline: return the install root only when a valid checkout already exists; otherwise exit.
    """
    if _internet_reachable():
        return clone_or_update_pos_boutique_in_program_files(repo_url=repo_url, shallow=shallow)
    root = _program_files_pos_root()
    if _valid_pos_install(root):
        print("No internet connection; using existing install without update.")
        return root
    print(
        "No internet connection and POS Boutique is not installed in this folder yet. "
        "Connect once to download the app, then you can start offline.",
        file=sys.stderr,
    )
    raise SystemExit(6)


def clone_or_update_pos_boutique_in_program_files(
    *,
    repo_url: str | None = None,
    shallow: bool = True,
) -> Path:
    """
    Clone or update under %USERPROFILE%\\POS-Boutique (or POS_BOUTIQUE_HOME). Uses git pull when a valid
    install with .git exists; else git clone. Returns the install directory.
    """
    root = _program_files_pos_root()

    url = _resolve_clone_url(repo_url)
    if _valid_pos_install(root):
        if not (root / ".git").is_dir():
            return root
        git = shutil.which("git")
        if not git:
            print("git not on PATH; skipping pull.", file=sys.stderr)
            return root
        print(f"Updating {root} …")
        try:
            subprocess.run(
                [git, "-C", str(root), "pull", "--ff-only"],
                check=True,
                timeout=600,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            print(f"git pull failed (continuing): {e}", file=sys.stderr)
        return root

    git = shutil.which("git")
    if not git:
        print("Git is required for clone. Install Git for Windows.", file=sys.stderr)
        raise SystemExit(3)

    if root.exists() and any(root.iterdir()):
        print(f"{root} is not empty and not a valid POS install; clear it or set POS_BOUTIQUE_HOME.", file=sys.stderr)
        raise SystemExit(4)

    root.parent.mkdir(parents=True, exist_ok=True)
    print(f"Cloning {url} → {root} …")
    cmd = [git, "clone"] + (["--depth", "1"] if shallow else []) + [url, str(root)]
    subprocess.run(cmd, check=True, timeout=1800)

    if not _valid_pos_install(root):
        print("Clone finished but scripts/start-local.ps1 is missing.", file=sys.stderr)
        raise SystemExit(5)

    return root


def run_start_local_bat(
    *args: str,
    host: str = "localhost",
    ui_port: int = DEFAULT_UI_PORT,
    api_port: int = DEFAULT_API_PORT,
    path: str = "/",
) -> None:
    """Run start-local.bat from the same install root as clone/update (%USERPROFILE%\\POS-Boutique by default)."""
   
    if tcp_port_listening(host, ui_port) and tcp_port_listening(host, api_port):
        print(f"Ports {ui_port} and {api_port} are listening, opening browser...")
        open_pos_boutique_browser(port=ui_port, host=host, path=path)
        print(f"Browser opened for http://{host}:{ui_port}{path}")
        return True
    
    root = _program_files_pos_root()
    bat = root / "start-local.bat"
    if not bat.is_file():
        print(
            f"Missing {bat}. Run clone_or_update_pos_boutique_in_program_files() first, "
            f"or set POS_BOUTIQUE_HOME to a checkout that contains start-local.bat.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    subprocess.Popen(
        ["cmd.exe", "/c", str(bat), *args],
        cwd=str(root),
        close_fds=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Running start-local.bat from {root}")


def tcp_port_listening(host: str, port: int, *, connect_timeout: float = 2.0) -> bool:
    """Return True if something accepts TCP on host:port."""
    try:
        with socket.create_connection((host, port), timeout=connect_timeout):
            return True
    except OSError:
        return False


def open_pos_boutique_browser(*, port: int = DEFAULT_UI_PORT, host: str = "localhost", path: str = "/") -> None:
    """Open the Vite dev URL (default port DEFAULT_UI_PORT) in the system default browser."""
    p = path if path.startswith("/") else f"/{path}"
    webbrowser.open(f"http://{host}:{port}{p}")


def open_pos_boutique_browser_when_ready(
    *,
    ui_port: int = DEFAULT_UI_PORT,
    api_port: int = DEFAULT_API_PORT,
    host: str = "localhost",
    path: str = "/",
    wait_seconds: float = 120.0,
) -> bool:
    """
    Every 5 seconds, check UI and API ports on host; when both listen, open the browser.
    Uses time.sleep(5) between checks. Returns False on timeout.
    """
    deadline = time.monotonic() + wait_seconds
    print(f"Waiting for http://{host}:{ui_port} and :{api_port} for {wait_seconds} seconds...")
    while time.monotonic() < deadline:
        if tcp_port_listening(host, ui_port) and tcp_port_listening(host, api_port):
            open_pos_boutique_browser(port=ui_port, host=host, path=path)
            return True
        time.sleep(5.0)
    print(f"Timed out waiting for http://{host}:{ui_port} and :{api_port}.", file=sys.stderr)
    return False


if __name__ == "__main__":
    prepare_pos_boutique_install_or_update()

    if run_start_local_bat(*sys.argv[1:]):
        print(f"start-local.bat started, browser opened for http://localhost:{DEFAULT_UI_PORT}/")
    else:
        open_pos_boutique_browser_when_ready()