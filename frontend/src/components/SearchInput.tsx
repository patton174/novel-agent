import React from 'react'

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
    <div className="relative w-full max-w-[500px]">
      <input
        className="box-border h-14 w-full rounded-xl border border-border bg-background px-5 text-[1.05rem] text-foreground shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.05)] outline-none transition-[box-shadow,border-color,transform] duration-[250ms] ease-out placeholder:text-slate-500 hover:-translate-y-px hover:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] focus:border-primary focus:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_0_0_3px_rgba(79,70,229,0.1)]"
        name="story-prompt"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

export default SearchInput
