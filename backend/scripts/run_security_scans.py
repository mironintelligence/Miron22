import json
import subprocess
import sys


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return {"cmd": cmd, "code": p.returncode, "stdout": p.stdout, "stderr": p.stderr}


def main() -> int:
    out = {}
    out["bandit"] = run(["python3", "-m", "bandit", "-r", "backend", "-c", ".bandit", "-q"])
    out["pip_audit"] = run(["python3", "-m", "pip_audit", "--progress-spinner", "off"])
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
