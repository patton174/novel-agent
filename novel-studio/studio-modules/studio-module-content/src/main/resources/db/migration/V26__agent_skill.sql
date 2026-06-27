CREATE TABLE IF NOT EXISTS agent_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         BIGINT,
    name            VARCHAR(64) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    description     VARCHAR(512),
    content         TEXT NOT NULL,
    tools_json      JSONB NOT NULL DEFAULT '[]',
    locale          VARCHAR(8) NOT NULL DEFAULT 'zh',
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_skill_user_name
    ON agent_skill (COALESCE(user_id, 0), name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_skill_user_id ON agent_skill (user_id);

-- Bundled system skills (content aligned with python-ai/skills/bundled/)

INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'fanqie-chapter-hook', 1,
       '番茄短篇章末钩子写法',
       $skill_fanqie$
# 番茄短篇章末钩子

番茄、七猫等平台短篇的留存核心在「章末是否让人点下一章」。本章正文可以温和推进，但**最后 150–200 字必须完成一次情绪抬升或信息反转**，禁止用总结、感慨、睡觉、明日再说等平铺收束。

## 适用场景

- 免费段落在卡点处截断，引导继续阅读
- 付费章在上章末尾预埋强钩子
- 连载日更章节维持追读黏性

## 章末结构（建议倒推写）

1. **收束句**（1–2 句）：定格画面或动作，勿解释含义
2. **钩子句**（1–3 句）：抛出未闭合问题
3. **禁写**：作者旁白剧透、角色内心把谜题说破、「他不知道的是…」

## 三类钩子

### 危机钩

主角或其在意的人陷入**具体、可感**的险境：倒计时、围堵、证据被夺、身体失控。要写**正在发生**的动作，而非「很危险」的形容。

### 揭秘钩

抛出一条**可验证但不完整**的信息：指纹、录音片段、陌生人一句暧昧话、账本上一行数字。只给证据，不给结论；下章再解读。

### 情感抉择钩

关系来到**必须选边**的瞬间：误会现场、第三者登场、秘密被部分撞见、告白被打断。读者应清楚「选 A 还是选 B 会改写关系」，而非 vague 的难过。

## 节奏与字数

- 全章 1500–2500 字时，钩子区约占 8–12%
- 钩子前 **至少 300 字** 有具体事件，避免空中楼阁
- 与下章开头预留 1 个可衔接的物理锚点（地点、物品、未完对话）

## 平台向禁忌

- 钩子后不要写「欲知后事如何」类破第四墙
- 同一钩子类型连续三章重复（如章章「被抓」）
- 假死、假背叛无铺垫（需前文埋至少 1 个解释性细节）

## 输出前自检

- [ ] 末 200 字内是否有**一句**让读者必须问「然后呢」
- [ ] 是否避免了总结式、说教式收束
- [ ] 钩子信息是否**展示**而非**告知**
- [ ] 本章核心冲突是否在钩子处升级而非完结
- [ ] 是否与记忆、人设一致，无 OOC 极端行为
- [ ] 下章是否能从钩子场景的**下一秒**直接接上
$skill_fanqie$,
       '["ReadChapter", "WriteChapter", "SearchKnowledge"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'fanqie-chapter-hook' AND is_system = TRUE AND deleted_at IS NULL
);

INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'sweet-romance-beat', 1,
       '甜宠感情线四节拍',
       $skill_sweet$
# 甜宠感情线四节拍

甜宠文的感情推进宜**慢热但有台阶**：相识 → 试探 → 确认 → 危机修复。每一节拍只完成一小步亲密升级，让读者感到「又近了一点」，而非跳跃式定终身。

## 四节拍定义

### 1. 相识（吸引建立）

用**具体事件**制造第一印象：帮一个小忙、一句恰到好处的吐槽、意外撞见的反差萌。此阶段禁止直球表白；好感应来自行为，而非作者旁白盖章「他很心动」。

### 2. 试探（推拉与误读）

双方开始在意对方，但仍有顾虑：试探性关心、半开玩笑的暧昧、第三方或工作造成的距离感。对话要有**进一寸、退半寸**的张力；一个眼神、一次欲言又止，比大段心理独白更有效。

### 3. 确认（关系落地）

给出**双向、可验证**的确认信号：明确的选择、在他人面前的维护、共同完成一件小事后的默契。确认不等于立刻同居或见家长；可以是「我们算在一起了吧」被正面回应，或一个被接受的、带有承诺意味的动作。

### 4. 危机修复（考验与加深）

外部误会、价值观摩擦、旧情干扰或家庭压力制造裂痕；解决方式须**尊重人设**：一方主动沟通、另一方给出可观察的改变，而非「霸道总裁一吻定音」。修复后亲密度应高于危机前，形成新的稳定基线。

## 对话张力写法

- **推拉**：问句接回避，关心接打趣，真心话包在玩笑里
- **细节**：记住对方随口提过的小偏好，比送贵重礼物更甜
- **节奏**：高糖场景后留 1–2 段日常缓冲，避免糖齁
- **视角**：双视角或有限第三人称时，勿让一方全知另一方心思

## 误写禁忌

- **无铺垫的极端行为**：跟踪、囚禁、当众羞辱后以爱之名洗白
- **OOC 冷漠**：为制造误会让人设突然变哑巴或消失数章
- **工具人配角**：闺蜜/兄弟只负责传话、无自身动机
- **一次性表白收束**：试探节拍未写足就「我爱你」闭环
- **雌竞/雄竞硬造**：第三者出场只为打脸，无独立人格
- **职业/身份悬浮**：总裁、顶流等设定与日常互动脱节

## 与记忆、章节的配合

写前先 `ReadMemory` 确认双方关系阶段与已发生的关键事件；写后检查是否**只推进一个节拍**内的小目标，避免一章内从相识跳到危机修复。

## 输出前自检

- [ ] 本段明确推进了哪一个节拍（相识/试探/确认/危机修复）
- [ ] 情绪变化是否有**具体事件**支撑，而非形容词堆叠
- [ ] 对话是否存在至少一处有效的推拉或潜台词
- [ ] 双方行为是否符合已建立的人设与关系史
- [ ] 是否避免了上述误写禁忌
- [ ] 读者能否感受到「关系比章初更近一步」
$skill_sweet$,
       '["ReadChapter", "WriteChapter", "ReadMemory"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'sweet-romance-beat' AND is_system = TRUE AND deleted_at IS NULL
);

INSERT INTO agent_skill (user_id, name, version, description, content, tools_json, locale, is_system)
SELECT NULL, 'mystery-cold-open', 1,
       '悬疑冷开场写法',
       $skill_mystery$
# 悬疑冷开场

悬疑、推理、灵异向章节的开篇宜**冷启动**：前 300 字内让读者抓住一个**可复述的核心疑问**，用感官细节与异常事实入场，避免背景综述或作者概述世界观。

## 冷开场原则

1. **先异常后解释**：读者先看到「不对劲」，再慢慢知道「哪里不对」
2. **具体优于抽象**：写血痕形状、时钟停摆、重复出现的号码，不写「气氛诡异」
3. **一个主谜题**：开篇只抛**一条**主轴疑问，支线线索稍后投放
4. **视角有限**：跟随 POV 角色只知道其能感知的信息，勿上帝视角揭底

## 300 字内必达

- **锚点场景**：时间、地点、POV 人物在做什么（越日常越好，反差越强）
- **触发事件**：打破正常的单一事实（人不见了、物证错位、证词矛盾）
- **核心疑问**：读者能一句话问出「到底发生了什么 / 谁是 / 为什么」

示例结构（勿照搬）：平静日常动作 → 微小违和 → 违和升级 → 定格在未解瞬间。

## 线索投放节奏

| 阶段 | 篇幅建议 | 任务 |
|------|----------|------|
| 开篇 | 0–300 字 | 主谜题 + 1 条硬线索（可被验证的事实） |
| 推进 | 300–1200 字 | 再投 1–2 条线索，可含 1 条红鲱鱼 |
| 章末 | 最后 200 字 | 升级疑问或反转认知，**不揭底** |

**硬线索**：物证、时间戳、第三方可核对的说法。**软氛围**：天气、音乐、梦——仅作烘托，不能代替谜题。

## 避免过早揭底

- 开篇 500 字内不要安排「真相大白」式对话或回忆杀全说破
- 不要让配角当说明员，一次性交代全部背景
- 真凶/核心机制在前 30% 篇幅只许**暗示**，不许**坐实**
- 若需回溯，用**碎片**而非完整前传；每块碎片应制造新问题

## 子类型微调

- **本格推理**：公平展示 1 个可被留意的物理细节
- **社会派**：异常来自制度或关系，而非纯血腥奇观
- **灵异**：规则型恐怖写「第一次破规的后果」，勿先写规则全文

## 输出前自检

- [ ] 读者能否用一句话复述「本章核心疑问」
- [ ] 前 300 字是否已进入**具体场景**而非总述
- [ ] 是否至少保留一条**未解**硬线索到章末
- [ ] 线索之间是否存在逻辑关联，而非随机堆叠
- [ ] 是否避免了过早揭底与说明式旁白
- [ ] 章末钩子是否与主谜题同向升级（可参考章末钩子技能）
$skill_mystery$,
       '["ReadChapter", "WriteChapter", "SearchKnowledge"]'::jsonb,
       'zh', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM agent_skill
    WHERE name = 'mystery-cold-open' AND is_system = TRUE AND deleted_at IS NULL
);
