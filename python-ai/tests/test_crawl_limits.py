from app.crawl.agent.limits import batch_save_count, effective_chapter_cap, slice_chapters


def test_unlimited_chapters():
    assert effective_chapter_cap(0) is None
    assert len(slice_chapters(list(range(500)), 0)) == 500
    assert batch_save_count(0) == 20
    assert batch_save_count(100, 5) == 5


def test_limited_chapters():
    assert effective_chapter_cap(200) == 200
    assert len(slice_chapters(list(range(300)), 200)) == 200
    assert batch_save_count(200) == 20
