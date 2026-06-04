import { MarketingEditorAppDemo } from '../demo/MarketingEditorAppDemo'
import {
  StoryScene,
  StorySceneBody,
  StorySceneCopy,
  StorySceneInner,
  StorySceneList,
  StoryPin,
  StorySceneTag,
  StorySceneTitle,
  StoryVisualStage,
} from '../../../styles/surfaces/marketingScroll'

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
    <StorySceneCopy className="story-copy">
      <StorySceneTag>{tag}</StorySceneTag>
      <StorySceneTitle>{title}</StorySceneTitle>
      <StorySceneBody>{body}</StorySceneBody>
      <StorySceneList>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </StorySceneList>
    </StorySceneCopy>
  )
}

/** 第一幕：思维链滚动书写 */
export function ThinkScene() {
  return (
    <StoryScene id="story-think">
      <StoryPin className="story-pin">
        <StorySceneInner>
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
          <StoryVisualStage className="story-visual">
            <MarketingEditorAppDemo variant="think" />
          </StoryVisualStage>
        </StorySceneInner>
      </StoryPin>
    </StoryScene>
  )
}

/** 第二幕：编排与工具链 */
export function OrchestrationScene() {
  return (
    <StoryScene id="story-orchestrate">
      <StoryPin className="story-pin">
        <StorySceneInner>
          <SceneCopy
            tag="第二幕 · 智能编排"
            title="Plan 拆解步骤，工具依次就位"
            body="从 memory_read 到 plan、chapter_create，整条链路在编排层内一镜展开——滚动即分镜，创作即成片。"
            bullets={[
              '工具状态实时：进行中 / 已完成',
              '参数与摘要同屏，可追溯可复盘',
              '长任务可托管，断线后继续同步',
            ]}
          />
          <StoryVisualStage className="story-visual">
            <MarketingEditorAppDemo variant="orchestrate" />
          </StoryVisualStage>
        </StorySceneInner>
      </StoryPin>
    </StoryScene>
  )
}

/** 第三幕：子代理 */
export function SubagentScene() {
  return (
    <StoryScene id="story-subagent">
      <StoryPin className="story-pin">
        <StorySceneInner>
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
          <StoryVisualStage className="story-visual">
            <MarketingEditorAppDemo variant="subagent" />
          </StoryVisualStage>
        </StorySceneInner>
      </StoryPin>
    </StoryScene>
  )
}

/** 第四幕：流式成稿 */
export function StreamScene() {
  return (
    <StoryScene id="story-stream">
      <StoryPin className="story-pin">
        <StorySceneInner>
          <SceneCopy
            tag="第四幕 · 流式成稿"
            title="章节正文丝滑流出，所见即所得"
            body="chapter_create 将长篇正文以流式写入编辑器：字句逐行生长，可随时暂停、追问或改写。"
            bullets={[
              'SSE 推送，低延迟可见输出',
              '支持 diff 对比与一键采纳',
              '成稿后自动回写章节记忆',
            ]}
          />
          <StoryVisualStage className="story-visual">
            <MarketingEditorAppDemo variant="stream" />
          </StoryVisualStage>
        </StorySceneInner>
      </StoryPin>
    </StoryScene>
  )
}
