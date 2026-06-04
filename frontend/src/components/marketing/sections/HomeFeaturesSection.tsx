import {
  CursorFeatureBody,
  CursorFeatureTag,
} from '../../../styles/surfaces/cursorLanding'
import styled from 'styled-components'
import { cursorTheme } from '../../../styles/surfaces/cursorLanding'

const FeaturesSection = styled.section`
  width: 100%;
  background: ${cursorTheme.bg};
  scroll-margin-top: 72px;
`

const FeaturesWrap = styled.div`
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  text-align: center;
`

const StepRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-top: 2rem;
  text-align: left;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const FeaturesTitle = styled.h2`
  margin: 0 auto 0.75rem;
  max-width: 20rem;
  font-size: clamp(1.35rem, 2.8vw, 1.85rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  color: ${cursorTheme.text};
`

const StepItem = styled.div`
  padding: 1.15rem 1.2rem;
  border-radius: 12px;
  background: ${cursorTheme.cardElevated};
  border: 1px solid ${cursorTheme.border};
  box-shadow: ${cursorTheme.shadowSm};

  .num {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: ${cursorTheme.textFaint};
    margin-bottom: 0.45rem;
  }

  h4 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
    font-weight: 600;
    color: ${cursorTheme.text};
  }

  p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    color: ${cursorTheme.textMuted};
  }
`

/** 与滚动分镜统一的浅色步骤说明（无终端黑窗） */
export function HomeFeaturesSection() {
  return (
    <FeaturesSection id="features">
      <FeaturesWrap>
        <CursorFeatureTag>创作流程</CursorFeatureTag>
        <FeaturesTitle>三步开始，即刻成稿</FeaturesTitle>
        <CursorFeatureBody style={{ maxWidth: '28rem', margin: '0 auto', textAlign: 'center' }}>
          上方两幕演示对应真实 Agent 面板；日常创作按世界观 → 情节 → 续写推进即可。
        </CursorFeatureBody>

        <StepRow>
          <StepItem>
            <div className="num">01</div>
            <h4>创建世界观</h4>
            <p>设定背景、角色与长期记忆</p>
          </StepItem>
          <StepItem>
            <div className="num">02</div>
            <h4>描述情节</h4>
            <p>用自然语言说明本章目标</p>
          </StepItem>
          <StepItem>
            <div className="num">03</div>
            <h4>AI 续写成章</h4>
            <p>编排工具链输出正文</p>
          </StepItem>
        </StepRow>
      </FeaturesWrap>
    </FeaturesSection>
  )
}
