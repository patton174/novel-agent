#!/usr/bin/env python3
"""检查本机 PG / Redis / RabbitMQ 连通性（与 infra/.env 或环境变量一致）。"""
import os
import socket
import sys

PG_HOST = os.getenv("DB_HOST", "127.0.0.1")
PG_PORT = int(os.getenv("DB_PORT", os.getenv("POSTGRES_PORT", "5432")))
PG_USER = os.getenv("DB_USERNAME", os.getenv("POSTGRES_USER", "postgres"))
PG_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "changeme"))
PG_DB = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "novel_agent"))

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "changeme")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "127.0.0.1")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_MGMT_PORT = int(os.getenv("RABBITMQ_MGMT_PORT", "15672"))


def check_port(host: str, port: int, name: str) -> bool:
    sock = socket.socket()
    sock.settimeout(3)
    try:
        sock.connect((host, port))
        print(f"[OK] {name} {host}:{port} 端口可达")
        return True
    except OSError as exc:
        print(f"[FAIL] {name} {host}:{port} {exc}")
        return False
    finally:
        sock.close()


def check_pg() -> None:
    try:
        import psycopg2
    except ImportError:
        print("[SKIP] 未安装 psycopg2，跳过 PG 登录验证 (pip install psycopg2-binary)")
        return
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname="postgres",
            connect_timeout=5,
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1")
        print(f"[OK] PostgreSQL 登录成功 (database=postgres)")
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (PG_DB,))
        if cur.fetchone():
            print(f"[OK] 数据库 {PG_DB} 已存在")
        else:
            cur.execute(f'CREATE DATABASE "{PG_DB}"')
            print(f"[OK] 已创建数据库 {PG_DB}")
        conn.close()
    except Exception as exc:
        print(f"[FAIL] PostgreSQL {exc}")


def check_redis() -> None:
    try:
        import redis
    except ImportError:
        print("[SKIP] 未安装 redis 包，仅做端口检测 (pip install redis)")
        return
    try:
        client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            socket_connect_timeout=5,
        )
        print("[OK] Redis PING", client.ping())
    except Exception as exc:
        print(f"[FAIL] Redis {exc}")


def check_rabbitmq_mgmt() -> None:
    """管理端口可达即认为 RabbitMQ 已起来（AMQP 已在 check_port 测过）。"""
    if check_port(RABBITMQ_HOST, RABBITMQ_MGMT_PORT, "RabbitMQ 管理台"):
        print(f"      浏览器: http://{RABBITMQ_HOST}:{RABBITMQ_MGMT_PORT}/")


if __name__ == "__main__":
    pg_up = check_port(PG_HOST, PG_PORT, "PostgreSQL")
    redis_up = check_port(REDIS_HOST, REDIS_PORT, "Redis")
    rabbit_up = check_port(RABBITMQ_HOST, RABBITMQ_PORT, "RabbitMQ AMQP")
    if pg_up:
        check_pg()
    if redis_up:
        check_redis()
    if rabbit_up:
        check_rabbitmq_mgmt()
    ok = pg_up and redis_up and rabbit_up
    sys.exit(0 if ok else 1)
