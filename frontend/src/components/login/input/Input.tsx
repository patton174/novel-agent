import React, { InputHTMLAttributes } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { font, palette, shadow } from '../../../styles/theme'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  inputType?: 'text' | 'password' | 'email' | 'tel' | 'number'
  hasError?: boolean
}

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
`

const Input: React.FC<InputProps> = ({
  inputType = 'text',
  placeholder,
  hasError = false,
  ...props
}) => {
  return (
    <StyledWrapper>
      <InputContainer $hasError={hasError}>
        <IconWrapper $hasError={hasError}>
          {inputType === 'password' ? (
            <svg viewBox="0 0 24 24" fill={palette.ink} width="18" height="18">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill={palette.ink} width="18" height="18">
              <path d="M0 0h24v24H0z" fill="none" />
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </IconWrapper>

        <StyledInput
          type={inputType}
          placeholder={placeholder}
          $hasError={hasError}
          {...props}
        />
      </InputContainer>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 320px;
`

const InputContainer = styled.div<{ $hasError?: boolean }>`
  display: flex;
  align-items: center;
  background: ${palette.bg};
  border-radius: ${'16px'};
  padding: 8px;
  box-shadow: ${shadow.inInput};
  transition: all 0.3s ease;

  ${(props) =>
    props.$hasError &&
    css`
      animation: ${shake} 0.5s ease-in-out;
      box-shadow: inset 4px 4px 8px ${palette.errorInput}40, inset -4px -4px 8px ${palette.white},
        0 0 0 2px ${palette.errorInput};
    `}

  &:focus-within {
    box-shadow: ${shadow.inInputFocus};
  }
`

const IconWrapper = styled.div<{ $hasError?: boolean }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  background: ${(props) => (props.$hasError ? palette.errorInput : palette.accent)};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${shadow.outSm};
  transition: all 0.3s ease;
`

const StyledInput = styled.input<{ $hasError?: boolean }>`
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 12px;
  font-size: 1.05rem;
  font-family: ${font.monoAlt};
  color: ${palette.text};
  outline: none;
  caret-color: ${(props) => (props.$hasError ? palette.errorInput : palette.accent)};

  &::placeholder {
    color: ${palette.textPlaceholder};
    font-style: italic;
  }
`

export default Input
