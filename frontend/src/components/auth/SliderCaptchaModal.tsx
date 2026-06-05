import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { fetchSliderCaptcha, verifySliderCaptcha } from '../../utils/authApi'
import type { SliderCaptchaChallenge } from '../../utils/authApi'
import { palette } from '../../styles/theme'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Panel = styled.div`
  width: min(360px, 92vw);
  background: ${palette.bgElevated};
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
`

const Title = styled.h3`
  margin: 0 0 12px;
  font-size: 16px;
  color: ${palette.text};
`

const ImageWrap = styled.div<{ $width: number; $height: number }>`
  position: relative;
  width: ${(p) => p.$width}px;
  max-width: 100%;
  height: ${(p) => p.$height}px;
  margin: 0 auto 12px;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
`

const BgImg = styled.img`
  width: 100%;
  height: 100%;
  display: block;
`

const PuzzleImg = styled.img<{ $x: number; $y: number }>`
  position: absolute;
  left: ${(p) => p.$x}px;
  top: ${(p) => p.$y}px;
  width: 44px;
  height: 44px;
  pointer-events: none;
`

const Track = styled.div`
  position: relative;
  height: 42px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 21px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`

const Handle = styled.div<{ $x: number }>`
  position: absolute;
  left: ${(p) => p.$x}px;
  top: 3px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${palette.accent};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: grab;
  touch-action: none;
`

const Hint = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  color: ${palette.textSecondary};
  text-align: center;
`

const ErrorText = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: #f87171;
  text-align: center;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
`

const Btn = styled.button`
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
`

const SLIDER_HEIGHT = 150
const PUZZLE_SIZE = 44

interface Props {
  open: boolean
  onClose: () => void
  onVerified: (captchaToken: string) => void
}

export const SliderCaptchaModal: React.FC<Props> = ({ open, onClose, onVerified }) => {
  const [challenge, setChallenge] = useState<SliderCaptchaChallenge | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const loadChallenge = useCallback(async () => {
    setLoading(true)
    setError('')
    setOffsetX(0)
    try {
      const data = await fetchSliderCaptcha()
      setChallenge(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadChallenge()
    }
  }, [open, loadChallenge])

  const maxOffset = challenge ? Math.max(0, challenge.sliderWidth - PUZZLE_SIZE - 4) : 0

  const updateOffset = (clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left - 18
    setOffsetX(Math.min(maxOffset, Math.max(0, x)))
  }

  const finishDrag = async () => {
    if (!dragging.current || !challenge) return
    dragging.current = false
    setLoading(true)
    setError('')
    try {
      const token = await verifySliderCaptcha(challenge.captchaId, Math.round(offsetX))
      onVerified(token)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
      void loadChallenge()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Title>安全验证</Title>
        {challenge ? (
          <ImageWrap $width={challenge.sliderWidth} $height={SLIDER_HEIGHT}>
            <BgImg src={`data:image/png;base64,${challenge.backgroundImage}`} alt="" draggable={false} />
            <PuzzleImg
              src={`data:image/png;base64,${challenge.puzzleImage}`}
              alt=""
              $x={offsetX}
              $y={challenge.puzzleY}
              draggable={false}
            />
          </ImageWrap>
        ) : null}
        <Track
          ref={trackRef}
          onPointerDown={(e) => {
            dragging.current = true
            updateOffset(e.clientX)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (dragging.current) updateOffset(e.clientX)
          }}
          onPointerUp={() => void finishDrag()}
          onPointerCancel={() => {
            dragging.current = false
          }}
        >
          <Handle $x={offsetX} />
        </Track>
        <Hint>拖动滑块，将拼图移至缺口位置</Hint>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Actions>
          <Btn type="button" onClick={onClose}>取消</Btn>
          <Btn type="button" onClick={() => void loadChallenge()} disabled={loading}>
            刷新
          </Btn>
        </Actions>
      </Panel>
    </Overlay>
  )
}

export default SliderCaptchaModal
