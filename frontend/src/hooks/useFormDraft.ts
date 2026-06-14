import { useState } from 'react'

/**
 * 表单草稿保存 Hook
 */
export function useFormDraft<T>(key: string, initialValue: T): [T, (val: T) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    const draft = localStorage.getItem(`draft_${key}`)
    if (draft) {
      try {
        return JSON.parse(draft)
      } catch {
        return initialValue
      }
    }
    return initialValue
  })

  const updateValue = (newVal: T) => {
    setValue(newVal)
    localStorage.setItem(`draft_${key}`, JSON.stringify(newVal))
  }

  const clearDraft = () => {
    localStorage.removeItem(`draft_${key}`)
  }

  return [value, updateValue, clearDraft]
}
