import { useCallback, useEffect, useRef } from 'react'
import type { EditorMessage } from '../../types/editor'
import type { EditorCenterTab } from '../../components/editor/EditorCenterTabs.types'

const SCROLL_DEBOUNCE_MS = 120
const RESIZE_SCROLL_DEBOUNCE_MS = 120
const PIN_THRESHOLD_PX = 96

export function useEditorScroll(
  messages: EditorMessage[],
  isLoading: boolean,
  activeCenterTab: EditorCenterTab,
) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesAreaRef = useRef<HTMLDivElement | null>(null)
  const userPinnedScrollRef = useRef(false)
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollMessagesToBottom = useCallback((force = false) => {
    if (!force && userPinnedScrollRef.current) {
      return
    }

    const run = (attempt = 0) => {
      const el = messagesAreaRef.current
      if (!el) {
        if (attempt < 10) {
          scrollRafRef.current = requestAnimationFrame(() => run(attempt + 1))
          return
        }
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
      scrollRafRef.current = requestAnimationFrame(() => run(0))
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
      scrollRafRef.current = requestAnimationFrame(() => run(0))
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
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current)
      }
      resizeDebounceRef.current = setTimeout(() => {
        resizeDebounceRef.current = null
        if (!userPinnedScrollRef.current) {
          scrollMessagesToBottom(isLoading)
        }
      }, RESIZE_SCROLL_DEBOUNCE_MS)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(area)
    if (inner instanceof HTMLElement) {
      observer.observe(inner)
    }
    return () => {
      observer.disconnect()
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current)
      }
    }
  }, [isLoading, activeCenterTab, scrollMessagesToBottom])

  useEffect(
    () => () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current)
      }
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current)
      }
    },
    [],
  )

  return { messagesEndRef, messagesAreaRef, scrollMessagesToBottom }
}
