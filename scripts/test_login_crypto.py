#!/usr/bin/env python3
"""
复现线上登录加密请求（crypto-config → 路由脱敏 /g/ → AES body → 签名）。

用法:
  python scripts/test_login_crypto.py --username YOUR_USER --password YOUR_PASS
  python scripts/test_login_crypto.py --base https://www.novel-agent.cn --mode compare
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    print("缺少依赖: pip install cryptography", file=sys.stderr)
    sys.exit(1)

ENC_CONTENT_TYPE = "application/vnd.novel-agent.enc+json"
DEFAULT_BASE = os.environ.get("NOVEL_AGENT_BASE", "https://www.novel-agent.cn")


@dataclass
class CryptoRuntime:
    key_id: str
    aes_key_b64: str
    version: int
    expires_at_ms: int
    api_path_prefix: str | None = None


@dataclass
class HttpResult:
    url: str
    status: int
    headers: dict[str, str]
    body: str

    def summary(self) -> str:
        preview = self.body[:500].replace("\n", " ")
        return f"HTTP {self.status}  {preview}"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_from_std(std_b64: str) -> str:
    return std_b64.replace("+", "-").replace("/", "_").rstrip("=")


def aes_encrypt_combined(plaintext: str, aes_key_b64: str) -> str:
    """与 Java AesGcmCodec.encryptToBase64 / 前端 encryptFieldPartWithKey 对齐：iv(12)+ct → std base64"""
    key = base64.b64decode(aes_key_b64)
    if len(key) != 32:
        raise ValueError(f"AES key must be 32 bytes, got {len(key)}")
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, plaintext.encode("utf-8"), None)
    return base64.b64encode(iv + ct).decode("ascii")


def aes_encrypt_iv_ct(plaintext: str, aes_key_b64: str) -> tuple[str, str]:
    """请求 body envelope：iv / ct 分开 base64"""
    key = base64.b64decode(aes_key_b64)
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, plaintext.encode("utf-8"), None)
    return base64.b64encode(iv).decode("ascii"), base64.b64encode(ct).decode("ascii")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_sign(
    method: str,
    logical_path: str,
    body_bytes: bytes,
    aes_key_b64: str,
    ts: int,
    nonce: str,
) -> str:
    path = logical_path if logical_path.startswith("/") else f"/{logical_path}"
    canonical = f"{method.upper()}|{path}|{ts}|{nonce}|{sha256_hex(body_bytes)}"
    key = base64.b64decode(aes_key_b64)
    sig = hmac.new(key, canonical.encode("utf-8"), hashlib.sha256).digest()
    return b64url(sig)


def fetch_crypto_runtime(base: str, timeout: float = 15.0) -> CryptoRuntime:
    url = f"{base.rstrip('/')}/api/auth/crypto-config"
    res = http_request("GET", url, timeout=timeout)
    if res.status != 200:
        raise RuntimeError(f"crypto-config failed: {res.summary()}")
    data = json.loads(res.body)
    return CryptoRuntime(
        key_id=data["keyId"],
        aes_key_b64=data["aesKeyB64"],
        version=int(data.get("version", 0)),
        expires_at_ms=int(data.get("expiresAtEpochMs", 0)),
        api_path_prefix=data.get("apiPathPrefix"),
    )


def build_encrypted_route(logical_url: str, method: str, runtime: CryptoRuntime) -> str:
    if not runtime.api_path_prefix:
        return logical_url
    normalized = logical_url if logical_url.startswith("/") else f"/{logical_url}"
    payload = f"{method.upper()}|{normalized}"
    cipher = b64url_from_std(aes_encrypt_combined(payload, runtime.aes_key_b64))
    prefix = runtime.api_path_prefix.lstrip("/")
    return f"/{prefix}/{cipher}"


def build_login_envelope(
    login_json: dict[str, Any],
    runtime: CryptoRuntime,
    *,
    ts: int | None = None,
    nonce: str | None = None,
) -> tuple[bytes, dict[str, str]]:
    """与 frontend secureFetch 对齐：body.sign 用 envelope 内 ts/nonce；query 签名另起一组 ts/nonce。"""
    plaintext = json.dumps(login_json, ensure_ascii=True, separators=(",", ":"))
    iv, ct = aes_encrypt_iv_ct(plaintext, runtime.aes_key_b64)
    body_ts = ts if ts is not None else int(time.time() * 1000)
    body_nonce = nonce or str(uuid.uuid4())
    unsigned = {
        "v": 1,
        "kid": runtime.key_id,
        "ts": body_ts,
        "nonce": body_nonce,
        "iv": iv,
        "ct": ct,
    }
    unsigned_bytes = json.dumps(unsigned, separators=(",", ":")).encode("utf-8")
    body_sign = compute_sign(
        "POST",
        "/api/auth/api/login",
        unsigned_bytes,
        runtime.aes_key_b64,
        body_ts,
        body_nonce,
    )
    signed = {**unsigned, "sign": body_sign}
    body_bytes = json.dumps(signed, separators=(",", ":")).encode("utf-8")
    query_ts = int(time.time() * 1000)
    query_nonce = str(uuid.uuid4())
    query = {
        "_na_t": str(query_ts),
        "_na_n": query_nonce,
        "_na_k": runtime.key_id,
        "_na_s": compute_sign(
            "POST",
            "/api/auth/api/login",
            body_bytes,
            runtime.aes_key_b64,
            query_ts,
            query_nonce,
        ),
    }
    return body_bytes, query


def http_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 20.0,
) -> HttpResult:
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("User-Agent", "NovelAgent-LoginTest/1.0")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read()
            return HttpResult(
                url=url,
                status=resp.status,
                headers={k.lower(): v for k, v in resp.headers.items()},
                body=raw.decode("utf-8", errors="replace"),
            )
    except urllib.error.HTTPError as e:
        raw = e.read() if e.fp else b""
        return HttpResult(
            url=url,
            status=e.code,
            headers={k.lower(): v for k, v in (e.headers.items() if e.headers else [])},
            body=raw.decode("utf-8", errors="replace"),
        )


def post_login(
    base: str,
    runtime: CryptoRuntime,
    username: str,
    password: str,
    *,
    use_encrypted_route: bool,
    fingerprint: str = "py-test-fingerprint-sha256-placeholder",
) -> HttpResult:
    logical_path = "/api/auth/api/login"
    login_payload = {
        "username": username,
        "password": password,
        "fingerprint": fingerprint,
        "envSnapshot": {"source": "test_login_crypto.py"},
    }
    body_bytes, sign_query = build_login_envelope(login_payload, runtime)
    path = build_encrypted_route(logical_path, "POST", runtime) if use_encrypted_route else logical_path
    qs = urllib.parse.urlencode(sign_query)
    url = f"{base.rstrip('/')}{path}?{qs}"
    headers = {
        "Content-Type": ENC_CONTENT_TYPE,
        "X-Fingerprint": fingerprint,
        "X-Trace-Id": uuid.uuid4().hex,
    }
    return http_request("POST", url, headers=headers, body=body_bytes)


def decode_route_cipher(cipher_b64url: str, runtime: CryptoRuntime) -> str:
    """本地解密 /g/ 路由段，确认映射到哪个 API"""
    b64 = cipher_b64url.replace("-", "+").replace("_", "/")
    pad = (4 - len(b64) % 4) % 4
    raw = base64.b64decode(b64 + "=" * pad)
    key = base64.b64decode(runtime.aes_key_b64)
    iv, ct = raw[:12], raw[12:]
    plain = AESGCM(key).decrypt(iv, ct, None).decode("utf-8")
    return plain


def print_diagnosis(res: HttpResult, *, label: str) -> None:
    print(f"\n=== {label} ===")
    print(f"URL: {res.url[:120]}{'...' if len(res.url) > 120 else ''}")
    print(res.summary())
    try:
        parsed = json.loads(res.body)
        print(f"  code={parsed.get('code')}  msg/message={parsed.get('msg') or parsed.get('message')}")
    except json.JSONDecodeError:
        pass

    if res.status == 401:
        msg = res.body
        if "未登录或登录已过期" in msg and "/g/" in res.url:
            print(
                "\n  诊断: AuthUserIdInjectFilter 把 /g/... 当成受保护路径（路由未还原为 /api/auth/api/login）。"
                "\n  常见原因: 服务端 EncryptedRouteServletFilter 未生效，或 apiPathPrefix 与 crypto-config 不一致。"
            )
        elif '"code":1002' in msg or "用户名或密码错误" in msg:
            print("  诊断: 加密链路正常，仅账号密码错误。")


def replay_captured_request(base: str) -> None:
    """复现用户抓包：同一 body 分别打 /g/ 与 /api/ 路径。"""
    body = (
        b'{"v":1,"kid":"bf_8d1efba4cb0048b0","ts":1782109369896,'
        b'"nonce":"ea0babd2-74a8-4e18-be81-a15536e19e04","iv":"9+zCCE7wanFRWbmt",'
        b'"ct":"0Op5J+JffVVSIeBq62kc9F3cYcHLDA/KXYYAKFJaUM7FMFzzU6xxIHe981MaRJF8z/pwg5FB9taT72nVrE7t1U1m67nySq0xKcRROPNl6oakaKjQsSN7A0B41kVBmJKcqUwUfef6wI2jfryNS4R4PtZqICbWonL+oQZoFLTYq/vXrjd/XQj8DZZdSfvu4cMGuLekUD3xd80oboUGraxv57TYc5aC7Qb+6RZaxGqyjOSmR6nynYFJ0Nbko5artt30/4knGJgHFgyZ7QHsrJZmCJk48dEZe2ANmicIK2l80YDVND0z16RyjaJb8I3YvnN3PABlz/9+lWC4+vNbKWq/woDui8Z9gC2nZz8l9I+mImZ3C0tubLMfNK3cB7+lznZiLM73IUnN+1DTbKyReyiiZsUNArRoHVVTdy1WEJvfJndd2noE11ASaeJOO244kw6mprodCGFhB8enhfgTDIfw+FcZQ0UYoO2C7XxB2eUQulGCgOuwbvJiUrPFM9E0QmyvDKNHrL262H1R9Ob4MCA78UYXvhY5vA2uF2Vt+Z7XhvE9rf7unTF7o36WjUzH7t8h1znMoLSoPeiYCch6oHZZJmCWNt/PhdLiHAv3/F4x6MVzNpr+yjBYRbMNgE19ZAJcIApMV8BCeaFSEoCEub77U/ue5eHOZS2hPWXqc4PdCGJRou0vd9/5QKPgESV/Yun8CNDBhw9Fz8bfKS3sm+iXPgSr4kQtMebC4NxqZ4JSNqQmFSl8TKZoSdAPgcJRvP/Edl87Y5RWfBkQYwvVJnsf4qXqn9JBN1i7xk+NtLHi2vbzCIoFfxnn5FiFSIL2h52Nm4LOJnEbuIg/ANT7OipZYDO59XwpdfdAYoFjOBaDnnma+IQM6R3y2lNGPvVsLVRSfuIvgcbalT3hw/pFXh8aec2FbkrdApYPTg+6lH09mZ3igqVxY9M6KPJJs+JpT6cHOgzvu/K3Gzlyx0GVh3UBCJziMDdGghn1wmSbVLRhVIfmuA1GkpO3fNkvrSd0CFkvCcsfj6DNGZ5B/7Xi3/Fp038RWKS4uCEuSj0bLwx9E2q1CAVzKEHx4Xn1t0lfgnhvEZjS789RKUCIb6YD3wF4W1u04D8V3gp1p4iyf8B0FT/1Ik4aI7CJ5zJIFYXrz6ujehdyTLnAtbiMzzFrDGo07cu7JaOHb7AVlXcZRn4wDacnoVDAx3sS4uC14Ibwr9sydKrrDkqzFWPlajxgw9D8/32EeoMEWXRswGXmrGjccEoEDt9fg4XRX81eN1G/QeYEJTD9DSqXfl569H+7ZZQ/ttys59jwTrsoVeDaS8dAY3vv3PgozDuCkZpk85B+B6s4kjOv309MwmHa0xRktPfXVcyrek5ThqbB6e96zjKojtnlxQIRG8XnnLnv0H1NFM9N8ZgR8ROLkta+YYwzK8E3lCb9c4M/dzyVeCItJrHo//Hf",'
        b'"sign":"_RZm425TtDGFRSqcbkynFTXsZrh41VabVSSIS9VqTdo"}'
    )
    qs = (
        "_na_t=1782109369896&_na_n=72514807-45cd-49b8-98a2-b3ebcfad6725"
        "&_na_k=bf_8d1efba4cb0048b0&_na_s=lrQ3rptf-IGd4xTy-ATplYov_D6gBJjWErHPqOdLa1U"
    )
    headers = {
        "Content-Type": ENC_CONTENT_TYPE,
        "X-Fingerprint": "fp",
    }
    paths = {
        "抓包 /g/ 路由": (
            f"{base.rstrip('/')}/g/307534ed/"
            "rwXCfduoKk9ebItRvsrn7y24PT5RQ_X1DgEoN8ICvPd-MKw39DArw4uSNHOv58beoeuzWg"
        ),
        "同等 body → /api/auth/api/login": f"{base.rstrip('/')}/api/auth/api/login",
    }
    for label, path in paths.items():
        res = http_request("POST", f"{path}?{qs}", headers=headers, body=body)
        print_diagnosis(res, label=label)


def main() -> int:
    parser = argparse.ArgumentParser(description="测试 novel-agent 加密登录链路")
    parser.add_argument("--base", default=DEFAULT_BASE, help="站点根 URL（默认 www）")
    parser.add_argument("--username", default=os.environ.get("NOVEL_AGENT_USER", "test_user"))
    parser.add_argument("--password", default=os.environ.get("NOVEL_AGENT_PASS", "wrong_password"))
    parser.add_argument(
        "--mode",
        choices=("compare", "plain", "encrypted", "replay"),
        default="compare",
        help="compare=明文路径与 /g/ 路由对比；plain/encrypted=只测一种；replay=复现浏览器抓包",
    )
    args = parser.parse_args()

    if args.mode == "replay":
        print(f"Base: {args.base}")
        replay_captured_request(args.base)
        return 0

    print(f"Base: {args.base}")
    runtime = fetch_crypto_runtime(args.base)
    print(
        f"crypto-config: keyId={runtime.key_id}  version={runtime.version}  "
        f"apiPathPrefix={runtime.api_path_prefix}"
    )

    if runtime.api_path_prefix:
        sample_path = build_encrypted_route("/api/auth/api/login", "POST", runtime)
        cipher = sample_path.split("/")[-1].split("?")[0]
        try:
            decoded = decode_route_cipher(cipher, runtime)
            print(f"本地解密路由样例: {decoded}")
        except Exception as ex:
            print(f"本地解密路由失败: {ex}")

    modes: list[tuple[str, bool]] = []
    if args.mode == "compare":
        modes = [("明文 /api/auth/api/login", False), ("加密 /g/... 路由", True)]
    elif args.mode == "plain":
        modes = [("明文 /api/auth/api/login", False)]
    else:
        modes = [("加密 /g/... 路由", True)]

    exit_code = 0
    for label, encrypted in modes:
        res = post_login(
            args.base,
            runtime,
            args.username,
            args.password,
            use_encrypted_route=encrypted,
        )
        print_diagnosis(res, label=label)
        if res.status not in (200, 401) or (res.status == 401 and "1002" not in res.body):
            exit_code = 1

    print("\n期望结果:")
    print("  - 链路正常 + 密码错误 → HTTP 401, code=1002, msg=用户名或密码错误")
    print("  - 链路正常 + 密码正确 → HTTP 200, data.token 存在")
    print("  - 路由未还原 bug   → HTTP 401, msg=未登录或登录已过期（与浏览器一致）")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
