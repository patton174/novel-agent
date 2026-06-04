import styled from 'styled-components'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'
import { CapabilitiesGrid, CapabilityCard } from '../../../styles/surfaces/marketingScroll'
import { ScrollReveal } from '../scroll/ScrollReveal'

const CapSection = styled.section`
  width: 100%;
  padding: 4rem 1.5rem 5rem;
  background: ${cursorTheme.bg};
  scroll-margin-top: 72px;
`

const CapInner = styled.div`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
`

const CapTitle = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;

  h2 {
    margin: 0 0 0.65rem;
    font-size: clamp(1.35rem, 2.8vw, 1.85rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: ${cursorTheme.text};
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: ${cursorTheme.textMuted};
  }
`

const CAPABILITIES = [
  {
    icon: '✍️',
    title: '章节续写',
    desc: '按你的指令与文风续写正文，支持目标字数与节奏控制。',
  },
  {
    icon: '🧠',
    title: '世界观记忆',
    desc: '角色、势力、设定分层沉淀，长程创作不跑偏。',
  },
  {
    icon: '📋',
    title: '智能编排',
    desc: 'Think / Plan 透明执行，工具链自动串联。',
  },
  {
    icon: '🔍',
    title: '向量检索',
    desc: '基于语义召回相关章节与设定片段。',
  },
  {
    icon: '⚡',
    title: '流式输出',
    desc: '字句实时生成，所见即所得进入编辑器。',
  },
  {
    icon: '🛡️',
    title: '托管续跑',
    desc: '长任务后台执行，断线后仍可同步进度。',
  },
] as const

export function HomeCapabilitiesSection() {
  return (
    <CapSection id="capabilities">
      <CapInner>
        <ScrollReveal variant="up">
          <CapTitle>
            <h2>为长篇创作而生的能力矩阵</h2>
            <p>从灵感到成稿，覆盖网文作者日常所需的 AI 协作能力</p>
          </CapTitle>
        </ScrollReveal>

        <CapabilitiesGrid className="marketing-reveal-batch">
          {CAPABILITIES.map((cap) => (
            <CapabilityCard key={cap.title}>
              <div className="cap-icon" style={{ background: cursorTheme.card }}>
                {cap.icon}
              </div>
              <h3>{cap.title}</h3>
              <p>{cap.desc}</p>
            </CapabilityCard>
          ))}
        </CapabilitiesGrid>
      </CapInner>
    </CapSection>
  )
}
