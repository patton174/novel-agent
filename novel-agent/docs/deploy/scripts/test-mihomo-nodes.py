#!/usr/bin/env python3
import json
import subprocess
import urllib.request

API = "http://127.0.0.1:9090"
PROXY = "http://127.0.0.1:7890"


def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read().decode())


def put_json(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="PUT", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read().decode()


def ip_via_proxy():
    try:
        return subprocess.check_output(
            ["curl", "-fsS", "-x", PROXY, "--max-time", "12", "https://api.ip.sb/ip"],
            stderr=subprocess.STDOUT,
        ).decode().strip()
    except subprocess.CalledProcessError:
        return "fail"


def site_code(url):
    try:
        return subprocess.check_output(
            [
                "curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}",
                "-x", PROXY, "--max-time", "15",
                "-H", "User-Agent: Mozilla/5.0",
                url,
            ],
            stderr=subprocess.STDOUT,
        ).decode().strip()
    except subprocess.CalledProcessError:
        return "000"


def main():
    allp = get_json(API + "/proxies")
    selectors = []
    for name, meta in allp.get("proxies", {}).items():
        if meta.get("type") in ("Selector", "URLTest", "Fallback"):
            selectors.append(name)
    print("selectors:", selectors[:10])

    group = "GLOBAL"
    for cand in ("GLOBAL", "Proxy", "PROXY", "节点选择", "🚀 节点选择"):
        if cand in selectors:
            group = cand
            break
    print("using group:", group)

    data = get_json(API + "/proxies/" + urllib.request.quote(group, safe=""))
    nodes = [n for n in data.get("all", []) if n not in ("DIRECT", "REJECT") and not n.startswith("⚠")]
    print("now:", data.get("now"))
    for node in nodes[:8]:
        try:
            put_json(API + "/proxies/" + urllib.request.quote(group, safe=""), {"name": node})
        except Exception as e:
            print("select err", node[:40], e)
            continue
        ip = ip_via_proxy()
        qx = site_code("https://www.qishuxia.com/")
        sy = site_code("https://www.shuyous.com/")
        print(f"node={node[:45]} ip={ip} qishuxia={qx} shuyous={sy}")


if __name__ == "__main__":
    main()
