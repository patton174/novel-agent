import {
  CursorAgentCol,
  CursorAgentList,
  CursorAgentNarrative,
  CursorAgentScroll,
  CursorComposer,
  CursorDocPane,
  CursorFileChip,
  CursorStatusLine,
  CursorSummaryCard,
  CursorTab,
  CursorTabs,
  CursorTaskBtn,
  CursorTaskCol,
  CursorThinking,
  CursorUserPrompt,
  CursorWin,
  CursorWinBar,
  CursorWinBody,
} from '../../../styles/surfaces/cursorLanding'

export type NovelCursorMockVariant = 'hero' | 'prd' | 'parallel' | 'stream'

function WinDots() {
  return (
    <div className="dots" aria-hidden>
      <span className="dot r" />
      <span className="dot y" />
      <span className="dot g" />
    </div>
  )
}

function AgentComposer() {
  return (
    <CursorComposer>
      <span className="input">规划、续写、检索一切…</span>
      <span className="pill">Agent</span>
      <span className="pill">Composer</span>
      <span className="send" aria-hidden />
    </CursorComposer>
  )
}

/** 主窗：左侧任务列表 + 右侧 Agent（对齐 Cursor Desktop） */
export function CursorDesktopMock({
  className,
  variant = 'hero',
}: {
  className?: string
  variant?: NovelCursorMockVariant
}) {
  const isParallel = variant === 'parallel'

  return (
    <CursorWin className={className} data-cursor-mock="desktop">
      <CursorWinBar>
        <WinDots />
        <span className="title">Novel AI · 编辑器</span>
      </CursorWinBar>
      <CursorWinBody>
        <CursorTaskCol>
          <CursorTaskBtn className="cursor-task" $state="done" data-step="task-0">
            <div className="row">
              <span className="name">续写第二章</span>
              <span className="time">12m</span>
            </div>
            <span className="diff">
              <span className="add">+1840</span> <span className="del">-12</span>
            </span>
          </CursorTaskBtn>
          <CursorTaskBtn className="cursor-task" $state="active" data-step="task-1">
            <div className="row">
              <span className="name">分析角色一致性</span>
              <span className="time">进行中</span>
            </div>
          </CursorTaskBtn>
          <CursorTaskBtn className="cursor-task" $state="idle" data-step="task-2">
            <div className="row">
              <span className="name">规划第三章结构</span>
              <span className="time">队列</span>
            </div>
          </CursorTaskBtn>
          {isParallel ? (
            <CursorTaskBtn className="cursor-task" $state="idle" data-step="task-3">
              <div className="row">
                <span className="name">子代理 · 世界观校对</span>
                <span className="time">并行</span>
              </div>
            </CursorTaskBtn>
          ) : null}
        </CursorTaskCol>

        <CursorAgentCol data-demo-agent-pane>
          <CursorAgentScroll>
            <CursorUserPrompt className="cursor-user-prompt" data-step="prompt">
              {variant === 'prd'
                ? '根据大纲续写第二章，银月森林首战要有掉宝爽点，人设对齐 Tang_Yun。'
                : variant === 'parallel'
                  ? '同时校对角色卡并生成第二章正文，完成后更新记忆。'
                  : '继续写第二章，衔接银月森林首战。'}
            </CursorUserPrompt>

            <CursorThinking className="cursor-thinking" data-step="thinking">
              <span className="dot" />
              Thinking 6s
            </CursorThinking>

            <CursorAgentList className="cursor-agent-list">
              <li className="cursor-step" data-step="step-0">
                读取 chapter_01.md · 世界观记忆
              </li>
              <li className="cursor-step" data-step="step-1">
                检索角色库 Tang_Yun、势力格局
              </li>
              <li className="cursor-step" data-step="step-2">
                生成 plan：首战 → 掉宝 → 章末钩子
              </li>
              {variant === 'parallel' ? (
                <li className="cursor-step" data-step="step-3">
                  启动子代理 memory_update · 角色校对
                </li>
              ) : null}
            </CursorAgentList>

            <CursorAgentNarrative className="cursor-narrative" data-step="narrative">
              将先以 5 只小怪验证 100% 掉宝节奏，再抛出「全服唯一」强化石；正文流式写入编辑器，记忆自动回写。
            </CursorAgentNarrative>

            <CursorFileChip className="cursor-chip" data-step="chip-0">
              <span className="badge">MD</span>
              <span>chapters/02_银月森林.md</span>
              <span className="add">+520</span>
              <span className="del">-0</span>
            </CursorFileChip>

            {variant !== 'hero' ? (
              <CursorFileChip className="cursor-chip" data-step="chip-1">
                <span className="badge">MEM</span>
                <span>memory/characters/Tang_Yun</span>
                <span className="add">+48</span>
                <span className="del">-3</span>
              </CursorFileChip>
            ) : null}

            {variant === 'parallel' ? (
              <CursorStatusLine className="cursor-status" data-step="status">
                <span className="ok">✓</span>
                子代理已完成 · 2 个工具 · 14s
              </CursorStatusLine>
            ) : null}

            {variant === 'stream' ? (
              <CursorSummaryCard className="cursor-summary" data-step="summary">
                <div className="label">Summary</div>
                <div className="text">
                  第二章正文已流式写入，共 1840 字；掉宝段落与大纲一致，已同步章节记忆。
                </div>
              </CursorSummaryCard>
            ) : null}
          </CursorAgentScroll>
          <AgentComposer />
        </CursorAgentCol>
      </CursorWinBody>
    </CursorWin>
  )
}

/** 预览窗：章节阅读 + 高亮（对齐 Cursor localhost 预览） */
export function CursorPreviewMock({ className }: { className?: string }) {
  return (
    <CursorWin className={className} data-cursor-mock="preview">
      <CursorWinBar>
        <WinDots />
        <span className="url">localhost:3000 · 阅读</span>
      </CursorWinBar>
      <CursorDocPane>
        <h4>诸天神祇有价 · 第二章</h4>
        <p>唐云踏入银月森林，雨水顺着发梢滑落。</p>
        <p>
          每一滴都像是敲打在心上的钟声。他深吸一口气，握紧了拳头——
          <span className="hl cursor-preview-hl" data-step="preview-hl">
            背包里那件从未在数据库中出现过的装备，在雨中泛着幽光。
          </span>
        </p>
        <p className="cursor-stream-line" data-step="stream-line-0" style={{ opacity: 0.4 }}>
          剑尖挑起一道寒芒，直指苍穹。
        </p>
      </CursorDocPane>
    </CursorWin>
  )
}

/** 小浮窗：精简 Agent 状态（对齐 Cursor CLI 卡片） */
export function CursorFloatCardMock({ className }: { className?: string }) {
  return (
    <CursorWin className={className} data-cursor-mock="float">
      <CursorWinBar>
        <WinDots />
        <span className="title">Novel Agent</span>
      </CursorWinBar>
      <CursorAgentScroll style={{ padding: '0.55rem 0.65rem' }}>
        <CursorUserPrompt className="cursor-user-prompt" data-step="float-prompt">
          继续第二章，要有掉宝爽点
        </CursorUserPrompt>
        <CursorThinking className="cursor-thinking" data-step="float-think">
          <span className="dot" />
          Thinking 4s
        </CursorThinking>
        <CursorAgentList className="cursor-agent-list">
          <li className="cursor-step" data-step="float-step-0">
            memory_read · 角色库
          </li>
          <li className="cursor-step" data-step="float-step-1">
            chapter_create · 流式输出
          </li>
        </CursorAgentList>
        <CursorFileChip className="cursor-chip" data-step="float-chip">
          <span className="badge">MD</span>
          <span>02_银月森林.md</span>
          <span className="add">+1840</span>
        </CursorFileChip>
      </CursorAgentScroll>
    </CursorWin>
  )
}

/** Feature 卡内：带 Tab 的 PRD + Agent（对齐 Cursor feature-prd） */
export function CursorPrdFeatureMock() {
  return (
    <div className="demo-app-mock demo-agent-console" data-variant="prd" style={{ height: '100%' }}>
      <CursorWin data-cursor-mock="prd" style={{ position: 'relative', width: '100%', height: '100%', boxShadow: 'none' }}>
        <CursorTabs>
          <CursorTab $active>outline.md</CursorTab>
          <CursorTab>chapter_02.md</CursorTab>
          <CursorTab>memory/Tang_Yun</CursorTab>
        </CursorTabs>
        <CursorWinBody style={{ minHeight: 360 }}>
          <CursorDocPane style={{ width: '42%', borderRight: `1px solid rgba(0,0,0,0.08)` }}>
            <h4>第二章大纲</h4>
            <p>1. 银月森林入口 · 氛围铺垫</p>
            <p>2. 首战小怪 · 100% 掉宝验证</p>
            <p>3. 全服唯一装备 · 章末钩子</p>
          </CursorDocPane>
          <CursorAgentCol data-demo-agent-pane style={{ flex: 1 }}>
            <CursorAgentScroll>
              <CursorUserPrompt className="cursor-user-prompt" data-step="prompt">
                根据大纲续写第二章，银月森林首战要有掉宝爽点。
              </CursorUserPrompt>
              <CursorThinking className="cursor-thinking" data-step="thinking">
                <span className="dot" />
                Thinking 5s
              </CursorThinking>
              <CursorAgentList className="cursor-agent-list">
                <li className="cursor-step" data-step="step-0">
                  读取 outline.md
                </li>
                <li className="cursor-step" data-step="step-1">
                  调用 plan 生成步骤
                </li>
                <li className="cursor-step" data-step="step-2">
                  chapter_create 流式写入
                </li>
              </CursorAgentList>
              <CursorFileChip className="cursor-chip" data-step="chip-0">
                <span className="badge">MD</span>
                <span>chapter_02.md</span>
                <span className="add">+520</span>
              </CursorFileChip>
            </CursorAgentScroll>
            <AgentComposer />
          </CursorAgentCol>
        </CursorWinBody>
      </CursorWin>
    </div>
  )
}

export function NovelCursorMock({ variant }: { variant: NovelCursorMockVariant }) {
  if (variant === 'prd') {
    return <CursorPrdFeatureMock />
  }
  if (variant === 'parallel') {
    return (
      <div className="demo-app-mock demo-agent-console" data-variant={variant} style={{ padding: '1.25rem' }}>
        <CursorDesktopMock variant="parallel" style={{ position: 'relative', width: '100%', boxShadow: 'none' }} />
      </div>
    )
  }
  if (variant === 'stream') {
    return (
      <div
        className="demo-app-mock demo-agent-console"
        data-variant={variant}
        style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
      >
        <CursorDesktopMock variant="stream" style={{ position: 'relative', width: '100%', boxShadow: 'none' }} />
        <CursorPreviewMock style={{ position: 'relative', width: '100%', boxShadow: 'none' }} />
      </div>
    )
  }
  return <CursorDesktopMock variant="hero" />
}
