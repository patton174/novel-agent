#!/usr/bin/env bash
echo "=== 9848 listen ==="
ss -tlnp | grep 9848 || true
echo "=== iptables 9848 ==="
iptables -L INPUT -n 2>/dev/null | grep -E "9848|8848|DROP|REJECT" | head -15 || true
echo "=== try open 9848 for Worker ==="
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=9848/tcp 2>/dev/null && firewall-cmd --reload 2>/dev/null && echo "firewalld: 9848 opened"
elif command -v ufw >/dev/null 2>&1; then
  ufw allow 9848/tcp 2>/dev/null && echo "ufw: 9848 opened"
else
  iptables -I INPUT -p tcp --dport 9848 -j ACCEPT 2>/dev/null && echo "iptables: 9848 ACCEPT added" || echo "manual: open TCP 9848 in 宝塔/云安全组"
fi
