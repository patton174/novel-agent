import styled, { css, keyframes } from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { motionTransition } from '../../styles/motion'
import type { EditorButtonSize, EditorButtonVariant } from './EditorButton'

export const sendMorph = editorTheme.transitionMorph

const iconFadeIn = keyframes`
  from { opacity: 0; transform: scale(0.72) rotate(-8deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
`

const iconFadeOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.72); }
`

export const EditorSendIconLayer = styled.span<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: ${({ $visible }) => ($visible ? iconFadeIn : iconFadeOut)} 0.32s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
`

export const EditorButtonRoot = styled.button<{
  $variant: EditorButtonVariant
  $size: EditorButtonSize
  $active: boolean
  $fullWidth: boolean
  $streaming: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  transition:
    ${motionTransition.interactive},
    width ${sendMorph},
    height ${sendMorph},
    border-radius ${sendMorph};

  svg {
    width: ${({ $size, $variant }) =>
      $variant === 'send' ? '16px' : $size === 'sm' ? '14px' : '16px'};
    height: ${({ $size, $variant }) =>
      $variant === 'send' ? '16px' : $size === 'sm' ? '14px' : '16px'};
    flex-shrink: 0;
  }

  ${({ $variant, $size }) =>
    $variant === 'send' || $variant === 'toggle' || $variant === 'close' || $variant === 'icon'
      ? ''
      : $size === 'sm'
        ? css`
            padding: 0.35rem 0.7rem;
            font-size: 0.74rem;
            border-radius: 8px;
          `
        : css`
            padding: 0.45rem 0.85rem;
            font-size: 0.82rem;
            border-radius: 10px;
          `}

  ${({ $variant, $active, $streaming, $size }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${palette.ink};
          color: ${palette.white};
          box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.18);
          &:hover:not(:disabled) {
            background: ${palette.chrome};
            transform: translateY(-1px);
          }
        `
      case 'accent':
        return css`
          background: ${editorTheme.accent};
          color: ${palette.text};
          box-shadow: 2px 2px 6px rgba(79, 70, 229, 0.25);
          &:hover:not(:disabled) {
            filter: brightness(1.05);
            transform: translateY(-1px);
          }
        `
      case 'danger':
        return css`
          background: ${editorTheme.errorBg};
          color: ${editorTheme.error};
          &:hover:not(:disabled) {
            background: rgba(196, 92, 92, 0.2);
          }
        `
      case 'ghost':
        return css`
          background: transparent;
          color: ${editorTheme.textMuted};
          box-shadow: none;
          &:hover:not(:disabled) {
            color: ${editorTheme.text};
            background: rgba(0, 0, 0, 0.04);
          }
        `
      case 'icon':
        return css`
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 8px;
          background: ${editorTheme.bgElevated};
          border: 1px solid ${editorTheme.border};
          color: ${editorTheme.textSecondary};
          box-shadow: none;
          &:hover:not(:disabled) {
            background: ${editorTheme.accentMuted};
            border-color: ${palette.accentBorderLight};
            color: ${editorTheme.text};
          }
        `
      case 'nav':
        return css`
          width: 100%;
          justify-content: flex-start;
          padding: 0.55rem 0.75rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: ${$active ? 600 : 400};
          background: ${$active ? editorTheme.activeBg : 'transparent'};
          color: ${$active ? editorTheme.text : editorTheme.textSecondary};
          box-shadow: none;
          &:hover:not(:disabled) {
            background: ${editorTheme.accentMuted};
            color: ${editorTheme.text};
          }
        `
      case 'tab':
        return css`
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          background: ${$active ? editorTheme.activeBg : 'transparent'};
          color: ${$active ? editorTheme.text : editorTheme.textSecondary};
          box-shadow: none;
          &:hover:not(:disabled) {
            background: ${$active ? editorTheme.activeBg : editorTheme.accentMuted};
            color: ${editorTheme.text};
          }
        `
      case 'toggle':
        return css`
          width: 30px;
          height: 30px;
          padding: 0;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.04);
          color: ${palette.textDim};
          box-shadow: none;
          &:hover:not(:disabled) {
            background: ${editorTheme.accentMuted};
            color: ${editorTheme.text};
          }
        `
      case 'close':
        return css`
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.05);
          color: ${palette.textSecondary};
          font-size: 1.35rem;
          line-height: 1;
          box-shadow: none;
          flex-shrink: 0;
          &:hover:not(:disabled) {
            background: rgba(0, 0, 0, 0.09);
            color: ${editorTheme.text};
          }
        `
      case 'dashed':
        return css`
          width: 100%;
          padding: ${$size === 'sm' ? '0.45rem' : '0.55rem 0.65rem'};
          border: ${$size === 'sm' ? '1px' : '2px'} dashed ${palette.divider};
          border-radius: ${$size === 'sm' ? '8px' : '10px'};
          background: transparent;
          color: ${editorTheme.textMuted};
          font-size: ${$size === 'sm' ? '0.72rem' : '0.8rem'};
          box-shadow: none;
          &:hover:not(:disabled) {
            border-color: ${editorTheme.accent};
            color: ${editorTheme.accent};
          }
          svg {
            width: ${$size === 'sm' ? '12px' : '14px'};
            height: ${$size === 'sm' ? '12px' : '14px'};
          }
        `
      case 'choice':
        return css`
          width: 100%;
          justify-content: flex-start;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
          padding: 0.55rem 0.75rem;
          text-align: left;
          border: 1px solid ${palette.accentBorderLight};
          border-radius: 10px;
          background: ${$active ? palette.activeBg : palette.toolLoadingBg};
          color: ${editorTheme.text};
          box-shadow: none;
          font-weight: 500;
          &:hover:not(:disabled) {
            border-color: ${palette.accentLine};
            background: ${palette.accentSoft};
          }
          strong {
            font-size: 0.88rem;
            font-weight: 600;
          }
          span {
            font-size: 0.8rem;
            color: ${palette.textDim};
            font-weight: 400;
          }
        `
      case 'panel':
        return css`
          width: 100%;
          justify-content: space-between;
          padding: 0.55rem 0.75rem;
          background: transparent;
          color: ${palette.textMuted};
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: none;
          border-radius: 0;
          &:hover:not(:disabled) {
            color: ${editorTheme.text};
          }
        `
      case 'tool':
        return css`
          padding: 0.3rem 0.55rem;
          font-size: 0.72rem;
          border: 1px solid ${palette.accentLineSoft};
          border-radius: 8px;
          background: ${palette.accentSoft};
          color: ${palette.accentDark};
          box-shadow: none;
          &:hover:not(:disabled) {
            background: ${palette.accentMuted};
          }
        `
      case 'chapter':
        return css`
          flex: 1;
          flex-direction: column;
          align-items: flex-start;
          padding: 0.6rem 0.75rem;
          background: transparent;
          text-align: left;
          border-radius: 10px;
          box-shadow: none;
          font-weight: 600;
          &:hover:not(:disabled) {
            transform: translateX(3px);
          }
          .chapter-num {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: ${$active ? palette.text : palette.textFaint};
          }
          .chapter-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: ${$active ? palette.text : palette.textDim};
            margin-top: 2px;
          }
          .chapter-status {
            font-size: 0.65rem;
            color: ${$active ? palette.text : palette.textPlaceholder};
            margin-top: 3px;
          }
        `
      case 'segment':
        return css`
          width: 100%;
          justify-content: space-between;
          padding: 0.55rem 0.65rem;
          border: 1px solid ${$active ? palette.accentLineSoft : 'transparent'};
          border-radius: 10px;
          background: ${$active ? palette.activeBg : 'transparent'};
          color: ${$active ? editorTheme.text : editorTheme.textSecondary};
          box-shadow: none;
          font-size: 0.78rem;
          &:hover:not(:disabled) {
            background: ${palette.accentSoft};
            color: ${editorTheme.text};
          }
        `
      case 'volume':
        return css`
          flex: 1;
          justify-content: flex-start;
          gap: 0.35rem;
          padding: 0.25rem 0.15rem;
          background: transparent;
          color: ${palette.inkHover};
          text-align: left;
          border-radius: 0;
          box-shadow: none;
          font-size: 0.82rem;
          .title {
            flex: 1;
            font-size: 0.82rem;
            font-weight: 700;
            color: ${palette.inkHover};
          }
          .meta {
            font-size: 0.68rem;
            color: ${palette.textFaint};
            font-weight: 400;
          }
        `
      case 'send': {
        const sendSize = `${editorTheme.composerControlHeight}px`
        return css`
          position: relative;
          overflow: hidden;
          color: ${palette.white};
          flex-shrink: 0;
          width: ${sendSize};
          height: ${sendSize};
          min-width: ${sendSize};
          min-height: ${sendSize};
          padding: 0;
          border-radius: ${$streaming ? '10px' : '50%'};
          background: ${$streaming ? editorTheme.error : palette.ink};
          box-shadow: ${$streaming
            ? '2px 2px 6px rgba(196, 92, 92, 0.3)'
            : '2px 2px 8px rgba(0, 0, 0, 0.2)'};
          &:hover:not(:disabled) {
            transform: scale(1.05);
          }
          &:active:not(:disabled) {
            transform: scale(0.96);
          }
        `
      }
      default:
        return css`
          background: ${editorTheme.bgElevated};
          color: ${editorTheme.textSecondary};
          box-shadow: ${editorTheme.shadowOutSoft};
          &:hover:not(:disabled) {
            background: ${editorTheme.accentMuted};
            color: ${editorTheme.text};
            border-color: rgba(79, 70, 229, 0.25);
            transform: translateY(-1px);
          }
        `
    }
  }}

  &:active:not(:disabled) {
    ${({ $variant }) =>
      $variant === 'send' ? '' : 'transform: translateY(0);'}
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`