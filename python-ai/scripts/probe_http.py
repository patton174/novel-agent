#!/usr/bin/env python3
import sys
import urllib.error
import urllib.request

url = sys.argv[1] if len(sys.argv) > 1 else "http://172.24.0.1:9090/version"
try:
    with urllib.request.urlopen(url, timeout=5) as r:
        print("OK", r.status, r.read()[:80])
except Exception as e:
    print("FAIL", e)
