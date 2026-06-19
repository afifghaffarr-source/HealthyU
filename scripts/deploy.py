#!/usr/bin/env python3
"""Step deploy helper — reads token from ~/.config/healthyu/cf-token, runs wrangler deploy."""
import os
import subprocess
import sys
from pathlib import Path

TOKEN_PATH = Path.home() / ".config/healthyu/cf-token"
PROJECT_DIR = Path(__file__).resolve().parent.parent

token = TOKEN_PATH.read_text().strip()
env = os.environ.copy()
env["CLOUDFLARE_API_TOKEN"] = token
env["PATH"] = f"{Path.home()}/.bun/bin:" + env.get("PATH", "")

result = subprocess.run(
    ["wrangler", "deploy"],
    cwd=str(PROJECT_DIR),
    env=env,
    check=False,
)
sys.exit(result.returncode)
