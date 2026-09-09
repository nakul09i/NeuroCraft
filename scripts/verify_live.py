import json
import sys
import urllib.error
import urllib.request
import uuid

BASE = "https://neurocraft-psi.vercel.app"


def test_endpoint(path, method="GET", payload=None):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, method=method)  # noqa: S310
    if payload is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(payload).encode("utf-8")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = resp.read().decode("utf-8")
            print(f"[PASS] {method} {path} -> HTTP {resp.status} ({len(data)} bytes)")
            if path != "/":
                parsed = json.loads(data)
                keys = list(parsed.keys()) if isinstance(parsed, dict) else f"{len(parsed)} items"
                print(f"       Response summary: {keys}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[FAIL] {method} {path} -> HTTP {e.code}: {err_body[:200]}")
        return False
    except Exception as e:
        print(f"[ERROR] {method} {path} -> {e}")
        return False

def test_file_upload():
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    content = b"print('Hello, NeuroCraft! Clean benign test file for analysis.')\n"
    filename = "test_script.py"

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: text/x-python\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(f"{BASE}/api/v1/scans", data=body, method="POST")  # noqa: S310
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = resp.read().decode("utf-8")
            print(f"[PASS] POST /api/v1/scans (Upload) -> HTTP {resp.status} ({len(data)} bytes)")
            parsed = json.loads(data)
            print(f"       File: {parsed.get('file', {}).get('name')}, Score: {parsed.get('verdict', {}).get('score')}, Verdict: {parsed.get('verdict', {}).get('level')}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[FAIL] POST /api/v1/scans -> HTTP {e.code}: {err_body[:200]}")
        return False
    except Exception as e:
        print(f"[ERROR] POST /api/v1/scans -> {e}")
        return False

def main():
    print(f"Testing live production deployment: {BASE}\n" + "="*50)
    results = [
        test_endpoint("/"),
        test_endpoint("/api/v1/health"),
        test_endpoint("/api/v1/dashboard/stats"),
        test_file_upload(),
        test_endpoint("/api/v1/recon", method="POST", payload={"target": "github.com"}),
        test_endpoint("/api/v1/quantum/simulations", method="POST", payload={"scenario": "LEGITIMATE", "shots": 512, "noise_level": 0.0}),
        test_endpoint("/api/v1/reports", method="POST", payload={"report_type": "EXECUTIVE_AUDIT", "title": "Live Verification Report"}),
    ]

    print("="*50)
    if all(results):
        print("ALL 7 LIVE PRODUCTION ENDPOINTS (INCLUDING FILE UPLOAD) PASSED!")
        sys.exit(0)
    else:
        print("SOME ENDPOINTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
