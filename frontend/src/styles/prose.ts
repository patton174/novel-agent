import { css } from 'styled-components'
import { font, palette } from './theme'

const proseBase = css`
  & > *:first-child {
    margin-top: 0;
  }
  & > *:last-child {
    margin-bottom: 0;
  }

  p {
    margin: 0 0 0.55rem;
    line-height: 1.65;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 700;
    line-height: 1.35;
    color: ${palette.inkSoft};
  }

  h1 {
    margin: 0.85rem 0 0.55rem;
    font-size: 1.05rem;
  }

  h2 {
    margin: 0.75rem 0 0.45rem;
    font-size: 0.96rem;
    padding-left: 0.55rem;
    border-left: 3px solid ${palette.accentLine};
  }

  h3 {
    margin: 0.65rem 0 0.4rem;
    font-size: 0.88rem;
    color: ${palette.inkHover};
  }

  h4 {
    margin: 0.55rem 0 0.35rem;
    font-size: 0.82rem;
    color: ${palette.proseMuted};
  }

  hr {
    border: none;
    border-top: 1px solid ${palette.border};
    margin: 0.75rem 0;
  }

  ul,
  ol {
    margin: 0.25rem 0 0.55rem;
    padding-left: 1.35rem;
  }

  li {
    margin: 0.22rem 0;
    line-height: 1.6;
  }

  li > p {
    margin: 0;
  }

  strong {
    font-weight: 700;
    color: ${palette.text};
  }

  em {
    font-style: italic;
    color: ${palette.proseMuted};
  }

  blockquote {
    margin: 0.45rem 0;
    padding: 0.35rem 0.65rem;
    border-left: 3px solid ${palette.accentLineFaint};
    background: ${palette.proseBlockquoteBg};
    color: ${palette.textSecondary};
    border-radius: 0 6px 6px 0;
  }

  code {
    font-family: ${font.mono};
    font-size: 0.88em;
    padding: 0.08rem 0.32rem;
    border-radius: 4px;
    background: ${palette.proseCodeBg};
  }

  pre {
    margin: 0.45rem 0;
    padding: 0.55rem 0.65rem;
    border-radius: ${'8px'};
    background: ${palette.proseCodeBgBlock};
    overflow-x: auto;

    code {
      padding: 0;
      background: none;
      font-size: 0.78rem;
    }
  }

  a {
    color: ${palette.accentDark};
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 0.65rem;
    font-size: 0.84em;
    line-height: 1.5;
  }

  thead th {
    background: ${palette.proseTableHead};
    font-weight: 600;
    color: ${palette.inkHover};
  }

  th,
  td {
    border: 1px solid ${palette.borderTable};
    padding: 0.4rem 0.55rem;
    text-align: left;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: ${palette.proseTableStripe};
  }
`

export const chatProseCss = css`
  ${proseBase}
  font-family: ${font.body};
  font-size: 0.875rem;
  line-height: 1.72;
  letter-spacing: 0.01em;
  color: ${palette.textBody};

  h2 {
    border-left: none;
    padding-left: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: ${palette.inkHover};
  }

  h3,
  h4 {
    font-weight: 600;
  }

  p {
    margin: 0 0 0.65rem;
  }
`

export const memoryProseCss = css`
  ${proseBase}
  font-family: ${font.body};
  font-size: 0.8rem;
  color: ${palette.inkHover};

  h2 {
    font-size: 0.9rem;
    border-left-color: ${palette.accentLineSoft};
  }

  h3 {
    font-size: 0.84rem;
  }
`

export const thinkProseCss = css`
  ${proseBase}
  font-family: ${font.body};
  font-size: 0.78rem;
  line-height: 1.68;
  color: ${palette.textThink};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-size: 0.8rem;
    font-weight: 600;
    border-left: none;
    padding-left: 0;
    color: ${palette.textThinkHeading};
    margin: 0.5rem 0 0.35rem;
  }

  p {
    margin: 0 0 0.5rem;
  }

  strong {
    font-weight: 600;
    color: ${palette.textDim};
  }

  blockquote {
    border-left-color: ${palette.border};
    background: ${palette.proseThinkBg};
    color: ${palette.textSubtle};
  }
`

export const novelProseCss = css`
  ${proseBase}
  font-family: ${font.display};
  font-size: 1.05rem;
  line-height: 2;
  letter-spacing: 0.04em;
  color: ${palette.text};

  p {
    margin: 0 0 0.85rem;
    text-indent: 2em;
  }

  h1,
  h2,
  h3 {
    text-indent: 0;
    font-weight: 700;
    border-left: none;
    padding-left: 0;
  }

  h2 {
    font-size: 1.15rem;
    margin: 1.2rem 0 0.75rem;
  }
`
