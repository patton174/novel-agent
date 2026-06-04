import React from 'react'
import styled from 'styled-components'
import { font, palette, radius, shadow, transition } from '../styles/theme'

interface InputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const SearchInput: React.FC<InputProps> = ({
  placeholder = '描述你的故事...',
  value,
  onChange,
  onKeyDown,
}) => {
  return (
    <Wrapper>
      <input
        className="input"
        name="story-prompt"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </Wrapper>
  )
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;

  .input {
    width: 100%;
    height: 56px;
    padding: 0 1.25rem;
    font-size: 1.05rem;
    font-family: ${font.body};
    color: ${palette.text};
    background: ${palette.bg};
    border: 1px solid ${palette.border};
    border-radius: ${radius.lg};
    outline: none;
    box-sizing: border-box;
    box-shadow: ${shadow.inSoft};
    transition: box-shadow ${transition.base}, border-color ${transition.base},
      transform ${transition.base};
  }

  .input::placeholder {
    color: ${palette.textMuted};
  }

  .input:hover {
    box-shadow: ${shadow.outSoft};
    transform: translateY(-1px);
  }

  .input:focus {
    border-color: ${palette.accent};
    box-shadow: ${shadow.outSoft}, 0 0 0 3px ${palette.accentMuted};
  }
`

export default SearchInput
