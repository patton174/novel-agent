import { cn } from '@/lib/utils'
import { MarketingEditorAppDemo } from '../demo/MarketingEditorAppDemo'
import {
  STORY_PIN,
  STORY_SCENE,
  STORY_SCENE_BODY,
  STORY_SCENE_COPY,
  STORY_SCENE_INNER,
  STORY_SCENE_LIST,
  STORY_SCENE_TAG,
  STORY_SCENE_TITLE,
  STORY_VISUAL_STAGE,
} from '@/lib/marketingScrollClasses'

function SceneCopy({
  tag,
  title,
  body,
  bullets,
}: {
  tag: string
  title: string
  body: string
  bullets: string[]
}) {
  return (
    <div className={cn(STORY_SCENE_COPY, 'story-copy')}>
      <span className={STORY_SCENE_TAG}>{tag}</span>
      <h2 className={STORY_SCENE_TITLE}>{title}</h2>
      <p className={STORY_SCENE_BODY}>{body}</p>
      <ul className={STORY_SCENE_LIST}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** 第一幕：思维链滚动书写 */
export function ThinkScene() {
  return (
    <section id="story-think" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy
            tag="第一幕 · 思维链"
            title="思考过程透明，像对话一样可见"
            body="续写前先推演剧情走向：意图识别、上下文对齐、节奏与爽点布局——全部在思考面板中流式呈现。"
            bullets={[
              'think 工具独立展示，不挤占正文区',
              'Markdown 结构化输出，扫读成本低',
              '完成后自动收起，聚焦编排与成稿',
            ]}
          />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="think" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第二幕：编排与工具链 */
export function OrchestrationScene() {
  return (
    <section id="story-orchestrate" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy
            tag="第二幕 · 智能编排"
            title="Plan 拆解步骤，工具依次就位"
            body="从 ReadMemory 到 plan、WriteChapter，整条链路在编排层内一镜展开——滚动即分镜，创作即成片。"
            bullets={[
              '工具状态实时：进行中 / 已完成',
              '参数与摘要同屏，可追溯可复盘',
              '长任务可托管，断线后继续同步',
            ]}
          />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="orchestrate" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第三幕：子代理 */
export function SubagentScene() {
  return (
    <section id="story-subagent" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy
            tag="第三幕 · 子代理"
            title="复杂任务拆分，子代理优雅执行"
            body="角色校对、记忆回写等专项由子代理在嵌套面板中完成，主会话保持清晰，不互相刷屏。"
            bullets={[
              '独立编排轮次与工具树',
              '摘要去重，避免重复信息',
              '失败可定位到具体子任务',
            ]}
          />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="subagent" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** 第四幕：流式成稿 */
export function StreamScene() {
  return (
    <section id="story-stream" className={STORY_SCENE}>
      <div className={cn(STORY_PIN, 'story-pin')}>
        <div className={STORY_SCENE_INNER}>
          <SceneCopy
            tag="第四幕 · 流式成稿"
            title="章节正文丝滑流出，所见即所得"
            body="WriteChapter 将长篇正文以流式写入编辑器：字句逐行生长，可随时暂停、追问或改写。"
            bullets={[
              'SSE 推送，低延迟可见输出',
              '支持 diff 对比与一键采纳',
              '成稿后自动回写章节记忆',
            ]}
          />
          <div className={cn(STORY_VISUAL_STAGE, 'story-visual')}>
            <MarketingEditorAppDemo variant="stream" />
          </div>
        </div>
      </div>
    </section>
  )
}
