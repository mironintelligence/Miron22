import json
import subprocess
import sys


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return {"cmd": cmd, "code": p.returncode, "stdout": p.stdout, "stderr": p.stderr}


def main() -> int:
    out = {}
    out["radon_cc"] = run(["python3", "-m", "radon", "cc", "backend", "-s", "-a"])
    out["radon_mi"] = run(["python3", "-m", "radon", "mi", "backend", "-s"])
    out["pytest_cov"] = run(["python3", "-m", "pytest", "-q", "--cov=.", "--cov-report=term-missing"])
    print(json.dumps(out, ensure_ascii=False, indent=2))
    if out["pytest_cov"]["code"] != 0:
        return out["pytest_cov"]["code"]
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
