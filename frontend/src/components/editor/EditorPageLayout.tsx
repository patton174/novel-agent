import styled from 'styled-components'
import { editorLayout, editorTheme } from '../../styles/editorTheme'

export const EditorPageWrapper = styled.div`
  height: 100vh;
  display: flex;
  background: ${editorTheme.bg};
  overflow: hidden;
`

export const EditorMainContainer = styled.main`
  flex: 1;
  min-width: 0;
  height: 100vh;
  margin-left: ${editorLayout.sidebarWidthPx}px;
  margin-right: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;

  @media (max-width: 767px) {
    margin-left: 0;
  }
`
