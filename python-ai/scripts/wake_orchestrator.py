#!/usr/bin/env python3
import os
import urllib.request

K = os.environ["INTERNAL_SERVICE_KEY"]
req = urllib.request.Request(
    "http://127.0.0.1:8000/internal/crawl/orchestrator/run-once",
    headers={"X-Internal-Service-Key": K},
    method="POST",
    data=b"",
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
