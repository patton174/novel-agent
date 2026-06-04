import React, { ButtonHTMLAttributes } from 'react'
import styled from 'styled-components'
import { brandAccent, palette, shadow, transition } from '../../../styles/theme'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string
  subtitle?: string
  accentColor?: string
  icon?: React.ReactNode
}

const Icons: Record<string, React.ReactNode> = {
  Google: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  ),
  Github: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#24292e">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  登录: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
  注册: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
  下一步: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
    </svg>
  ),
  上一步: (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  ),
}

const getIconByTitle = (title: string): React.ReactNode => Icons[title] || Icons['登录']

const Button: React.FC<ButtonProps> = ({
  title,
  subtitle,
  accentColor = brandAccent.yellow,
  icon,
  ...props
}) => {
  return (
    <StyledButton {...props}>
      <IconBox $accentColor={accentColor}>{icon || getIconByTitle(title)}</IconBox>
      <TextBox>
        {subtitle && <span className="text-sub">{subtitle}</span>}
        <span className="text-main">{title}</span>
      </TextBox>
    </StyledButton>
  )
}

const StyledButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  background: ${palette.bg};
  border: none;
  border-radius: 14px;
  padding: 6px;
  box-shadow: ${shadow.out};
  transition: all ${transition.base};

  &:hover {
    box-shadow: 6px 6px 14px ${palette.divider}, -6px -6px 14px ${palette.white};
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: ${shadow.inPressed};
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  }
`

const IconBox = styled.span<{ $accentColor?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: ${(props) => props.$accentColor || palette.accent};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 4px ${palette.divider}, -2px -2px 4px ${palette.white};

  svg {
    fill: ${palette.ink};
  }
`

const TextBox = styled.span`
  display: flex;
  flex-direction: column;
  padding-right: 10px;

  .text-sub {
    font-size: 0.65rem;
    color: ${palette.textFaint};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.2;
  }

  .text-main {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${palette.text};
    white-space: nowrap;
  }
`

export default Button
export { brandAccent as ButtonAccentColors }
