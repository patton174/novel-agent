import { useCallback, useEffect, useRef } from 'react'
import type { EditorMessage } from '../../types/editor'

const SCROLL_DEBOUNCE_MS = 80
const PIN_THRESHOLD_PX = 96

export function useEditorScroll(
  messages: EditorMessage[],
  isLoading: boolean,
  activeCenterTab: 'chat' | 'story',
) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesAreaRef = useRef<HTMLDivElement | null>(null)
  const userPinnedScrollRef = useRef(false)
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRafRef = useRef<number | null>(null)

  const scrollMessagesToBottom = useCallback((force = false) => {
    if (!force && userPinnedScrollRef.current) {
      return
    }

    const run = () => {
      const el = messagesAreaRef.current
      if (!el) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
        return
      }
      el.scrollTop = el.scrollHeight
    }

    if (force) {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current)
        scrollDebounceRef.current = null
      }
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
      scrollRafRef.current = requestAnimationFrame(run)
      return
    }

    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current)
    }
    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
      scrollRafRef.current = requestAnimationFrame(run)
    }, SCROLL_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    const el = messagesAreaRef.current
    if (!el) {
      return
    }
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      userPinnedScrollRef.current = distance > PIN_THRESHOLD_PX
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [messages.length, activeCenterTab])

  useEffect(() => {
    if (activeCenterTab !== 'chat') {
      return
    }
    scrollMessagesToBottom(isLoading)
  }, [messages, isLoading, activeCenterTab, scrollMessagesToBottom])

  useEffect(() => {
    if (activeCenterTab !== 'chat') {
      return
    }
    const area = messagesAreaRef.current
    if (!area) {
      return
    }
    const inner = area.firstElementChild
    const onResize = () => {
      if (!userPinnedScrollRef.current) {
        scrollMessagesToBottom(isLoading)
      }
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(area)
    if (inner instanceof HTMLElement) {
      observer.observe(inner)
    }
    return () => observer.disconnect()
  }, [isLoading, activeCenterTab, scrollMessagesToBottom])

  useEffect(
    () => () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current)
      }
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    },
    [],
  )

  return { messagesEndRef, messagesAreaRef, scrollMessagesToBottom }
}
