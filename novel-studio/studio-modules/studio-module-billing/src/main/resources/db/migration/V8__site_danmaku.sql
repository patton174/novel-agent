CREATE TABLE IF NOT EXISTS site_danmaku (
    id          BIGSERIAL PRIMARY KEY,
    message     VARCHAR(120) NOT NULL,
    author_name VARCHAR(64) NOT NULL,
    region      VARCHAR(64),
    user_id     BIGINT,
    client_ip   VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_danmaku_created ON site_danmaku(created_at DESC);

INSERT INTO site_danmaku (message, author_name, region)
VALUES
    ('续写一章只要说清楚目标，Agent 自己就懂该怎么铺垫。', '墨染青衫', '上海'),
    ('世界观记忆真的救了我，写到三百章还没崩。', '夜雨听风', '广州'),
    ('子代理并行改稿，比我自己来回切窗口快多了。', '云中笔', '成都'),
    ('流式输出看着字一个个出来，特别有在写的感觉。', '半盏茶', '杭州'),
    ('长任务后台跑，断线回来进度还在，很稳。', '北辰', '北京'),
    ('设定检索召回很准，不用自己翻几十章找细节。', '浅夏', '深圳');
