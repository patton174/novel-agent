import styled from 'styled-components'
import { palette, radius, shadow, transition } from '../theme'
import { textStyle } from '../typography'

export const AuthPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${palette.bgPage};
  position: relative;
  overflow: hidden;
`

export const AuthBackgroundPattern = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(233, 181, 11, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(233, 181, 11, 0.08) 0%, transparent 50%);
`

export const AuthCard = styled.div`
  width: 100%;
  max-width: 480px;
  padding: 20px;
  position: relative;
  z-index: 1;
`

export const AuthCardInner = styled.div`
  background: ${palette.bgSidebar};
  border-radius: 20px;
  padding: 2.25rem 2rem;
  box-shadow: ${shadow.cardAuth};
  border: 1px solid rgba(0, 0, 0, 0.06);
`

export const AuthTitleSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.75rem;

  .title {
    ${textStyle('title')}
    color: ${palette.text};
    margin: 0;
    font-size: 1.35rem;
  }

  .subtitle {
    margin: 0;
    font-size: 0.9rem;
    color: ${palette.textMuted};
    text-align: center;
  }
`

export const AuthLogoIcon = styled.div`
  width: 64px;
  height: 64px;
  background: ${palette.bg};
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${shadow.outMd};
`

export const AuthProgressBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 1rem;

  .progress-dot {
    width: 12px;
    height: 12px;
    border-radius: ${radius.round};
    background: ${palette.bgInset};
    box-shadow: ${shadow.inDot};
    transition: all 0.3s ease;
  }

  .progress-dot.active {
    background: ${palette.accent};
    box-shadow:
      0 0 10px ${palette.accentGlow},
      inset 2px 2px 4px rgba(0, 0, 0, 0.1);
  }
`

export const AuthFooterSection = styled.div`
  margin-top: 2rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;

  .footer-text {
    color: ${palette.textMuted};
    font-size: 0.9rem;
  }

  .footer-link {
    color: ${palette.accent};
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: color ${transition.fast};

    &:hover {
      color: ${palette.accentHover};
    }
  }
`

export const AuthErrorText = styled.p`
  margin: 0 0 0.5rem;
  text-align: center;
  color: ${palette.errorBright};
  font-size: 0.85rem;
`

export const AuthTermsNote = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: ${palette.textFaint};

  a {
    color: ${palette.textMuted};
    text-decoration: none;
    transition: color ${transition.fast};

    &:hover {
      color: ${palette.accent};
    }
  }
`
export const AuthFormSection = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
`

export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`

export const AuthFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

export const AuthLabel = styled.label`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${palette.textMuted};
`

export const AuthField = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem 0.85rem;
  border: 1px solid ${palette.bgInset};
  border-radius: 10px;
  background: ${palette.bg};
  font-size: 0.92rem;
  color: ${palette.text};
  outline: none;
  transition: border-color ${transition.fast}, box-shadow ${transition.fast};

  &::placeholder {
    color: ${palette.textFaint};
  }

  &:focus {
    border-color: ${palette.accent};
    box-shadow: 0 0 0 3px ${palette.accentGlow};
  }
`

export const AuthSubmitButton = styled.button`
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.72rem 1rem;
  border: none;
  border-radius: 10px;
  background: ${palette.accent};
  color: ${palette.text};
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background ${transition.fast}, opacity ${transition.fast};

  &:hover:not(:disabled) {
    background: ${palette.accentHover};
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`

export const AuthInputWrapper = styled.div`
  display: flex;
  justify-content: center;
`

export const AuthActionSection = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
`

export const AuthDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${palette.bgInset}, transparent);
  }

  span {
    color: ${palette.textFaint};
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
`

export const AuthSocialSection = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`

export const AuthRegisterTerms = styled.div`
  text-align: center;
  font-size: 0.75rem;
  color: ${palette.textMuted};
  margin-top: 1rem;

  a {
    color: ${palette.accent};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: ${palette.accentHover};
    }
  }
`
