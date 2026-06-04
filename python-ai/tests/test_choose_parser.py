"""Tests for choose tool output parsing."""

from app.agents.choose_parser import parse_choose_options


def test_parse_inline_title_and_description():
    text = (
        "【选项1】标题：现代都市爱情  \n"
        "描述：聚焦职场精英的情感纠葛。\n\n"
        "【选项2】标题：古代仙侠传奇  \n"
        "描述：修仙世界的门派争斗。"
    )
    options = parse_choose_options(text)
    assert len(options) == 2
    assert options[0]["title"] == "现代都市爱情"
    assert "职场精英" in options[0]["description"]
    assert options[1]["title"] == "古代仙侠传奇"


def test_filters_meta_thinking_leak_as_option():
    text = (
        "<think>用户想创作一篇爽文网游小说，需要我提供3-4个不同的创作方向选项。\n\n"
        "【选项1】标题：重生独狼  \n"
        "描述：前世被公会背叛。\n\n"
        "【选项2】标题：双穿人生  \n"
        "描述：虚拟与现实同步变强。"
    )
    options = parse_choose_options(text)
    assert len(options) == 2
    assert options[0]["title"] == "重生独狼"
    assert options[1]["title"] == "双穿人生"
