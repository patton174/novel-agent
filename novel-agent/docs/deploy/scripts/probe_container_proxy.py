import httpx
proxy = "http://172.24.0.1:7890"
try:
    r = httpx.get("https://api.ip.sb/ip", proxy=proxy, timeout=15)
    print("container egress:", r.status_code, r.text.strip())
except Exception as e:
    print("container egress failed:", e)
