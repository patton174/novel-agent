"""Parse agent-llm-trace.log for subagent visible vs thinking split."""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

TRACE = Path(__file__).resolve().parents[1] / "python-ai" / ".dev-logs" / "agent-llm-trace.log"


def parse_blocks(raw: str) -> list[tuple[str, str, str, str]]:
    parts = raw.split("=" * 72)
    entries: list[tuple[str, str, str, str]] = []
    for part in parts:
        if "agent_llm_trace" not in part:
            continue
        m = re.search(r"run_id=([^\s]+)", part)
        if not m:
            continue
        run_id = m.group(1)
        meta = re.search(r'"has_tool_calls": (true|false)', part)
        ht = meta.group(1) if meta else "?"
        vis = ""
        think = ""
        if "--- response (visible text) ---" in part:
            seg = part.split("--- response (visible text) ---", 1)[1]
            if "--- response (with thinking) ---" in seg:
                vis, rest = seg.split("--- response (with thinking) ---", 1)
                think = rest.split("--- parsed ---")[0]
            else:
                vis = seg.split("--- parsed ---")[0]
        entries.append((run_id, ht, vis.strip(), think.strip()))
    return entries


def main() -> None:
    if not TRACE.is_file():
        print(f"missing trace: {TRACE}")
        sys.exit(1)
    raw = TRACE.read_text(encoding="utf-8", errors="replace")
    entries = parse_blocks(raw)
    subs = [e for e in entries if "-sub-" in e[0]]
    print(f"trace file: {TRACE}")
    print(f"total blocks: {len(entries)}, sub-agent blocks: {len(subs)}")

    by_run: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for run_id, ht, vis, think in subs:
        by_run[run_id].append((ht, vis, think))

    print("\n--- last 2 sub runs ---")
    for run_id in list(by_run.keys())[-2:]:
        print("\n" + "=" * 60)
        print("RUN", run_id)
        for i, (ht, vis, think) in enumerate(by_run[run_id][-10:], 1):
            print(f"  [{i}] has_tool_calls={ht} vis_len={len(vis)} think_len={len(think)}")
            if vis:
                print("      V:", vis[:200].replace("\n", " / "))
            if think:
                print("      T:", think[:200].replace("\n", " / "))

    print("\n--- blocks containing 已经成功读取 or 两章内容汇总 ---")
    found = 0
    for run_id, ht, vis, think in entries:
        blob = vis + think
        if "已经成功读取" not in blob and "两章内容汇总" not in blob:
            continue
        found += 1
        print(f"\nrun={run_id} has_tool_calls={ht}")
        safe = lambda s: s.encode("utf-8", "replace").decode("utf-8")
        print("VISIBLE:", safe(vis[:500].replace("\n", " / ")) if vis else "(empty)")
        print("THINKING:", safe(think[:500].replace("\n", " / ")) if think else "(empty)")
    if not found:
        print("(none in structured response sections; may only appear in request/tool blobs)")


if __name__ == "__main__":
    main()
