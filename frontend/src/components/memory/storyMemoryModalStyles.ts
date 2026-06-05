import styled from 'styled-components'
import { palette } from '../../styles/theme'

export const EntryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`

export const EntryCard = styled.div<{ $nested?: boolean }>`
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin-left: ${({ $nested }) => ($nested ? '0.35rem' : '0')};
`

export const EntryKey = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  color: ${palette.accentDark};
  margin-bottom: 0.35rem;
`

export const EntryBody = styled.div`
  font-size: 0.8rem;
  color: ${palette.inkHover};
  line-height: 1.55;
`

export const GroupCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.65rem 0.7rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.07);
`

export const GroupHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-bottom: 0.15rem;
`

export const GroupTitle = styled.div`
  font-size: 0.92rem;
  font-weight: 800;
  color: ${palette.text};
`

export const GroupMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
`

export const RoleBadge = styled.span`
  display: inline-flex;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  color: ${palette.memoryBrown};
  background: ${palette.accentMuted};
  border: 1px solid ${palette.accentBorderLight};
`

export const GroupSummary = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.72rem;
  color: ${palette.textDim};
`

export const PlainValue = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`

export const EmptyState = styled.div`
  padding: 2.5rem 1rem;
  text-align: center;
  color: ${palette.textFaint};
  font-size: 0.78rem;
  border: 1px dashed rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
`
