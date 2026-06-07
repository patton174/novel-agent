#!/usr/bin/env python3
"""Worker 上探测 mihomo 各节点访问 qishuxia 是否可用。"""
import json
import subprocess
import sys
import urllib.parse
import urllib.request

API = "http://127.0.0.1:9090"
PROXY = "http://127.0.0.1:7890"
GROUP = "🚀 节点选择"
TARGET = "https://www.qishuxia.com/"
MAX_NODES = int(sys.argv[1]) if len(sys.argv) > 1 else 10


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read().decode())


def put_json(url: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, method="PUT", headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read().decode()


def curl_code(url: str) -> str:
    try:
        out = subprocess.check_output(
            [
                "curl",
                "-sS",
                "-o",
                "/dev/null",
                "-w",
                "%{http_code}",
                "-x",
                PROXY,
                "--max-time",
                "20",
                "-H",
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
                url,
            ],
            stderr=subprocess.STDOUT,
            timeout=25,
        )
        return out.decode().strip()
    except subprocess.CalledProcessError as e:
        msg = e.output.decode(errors="replace")[:100] if e.output else str(e)
        return "ERR:" + msg.replace("\n", " ")


def curl_tls_ok(url: str) -> str:
    try:
        subprocess.check_output(
            ["curl", "-sS", "-I", "-x", PROXY, "--max-time", "15", url],
            stderr=subprocess.STDOUT,
            timeout=20,
        )
        return "TLS_OK"
    except subprocess.CalledProcessError as e:
        msg = (e.output.decode(errors="replace") if e.output else str(e))[:120]
        return "TLS_FAIL:" + msg.replace("\n", " ")


def main() -> None:
    enc = urllib.parse.quote(GROUP, safe="")
    data = get_json(API + "/proxies/" + enc)
    allp = get_json(API + "/proxies")
    proxies = allp.get("proxies", {})
    skip_types = {"Selector", "URLTest", "Fallback", "LoadBalance", "Relay"}
    nodes = [
        n
        for n in data.get("all", [])
        if n not in ("DIRECT", "REJECT")
        and not n.startswith("⚠")
        and proxies.get(n, {}).get("type") not in skip_types
    ]
    print(f"group={GROUP} now={data.get('now')} leaf_nodes={len(nodes)}")
    print("-" * 72)
    ok: list[tuple[str, str]] = []
    for node in nodes[:MAX_NODES]:
        put_json(API + "/proxies/" + enc, {"name": node})
        tls = curl_tls_ok(TARGET)
        code = curl_code(TARGET) if tls == "TLS_OK" else "000"
        print(f"{node[:52]:52} tls={tls[:22]:22} http={code}")
        if tls == "TLS_OK" and code.isdigit() and code != "000":
            ok.append((node, code))
    print("-" * 72)
    print(f"usable={len(ok)} tested={min(MAX_NODES, len(nodes))}")
    for n, c in ok:
        print(f"  OK http={c} {n}")


if __name__ == "__main__":
    main()
