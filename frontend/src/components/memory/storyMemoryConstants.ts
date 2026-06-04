import type { MemoryTabId } from '../../types/storyMemory'

export const MEMORY_TABS: { id: MemoryTabId; label: string; hint: string }[] = [
  { id: 'novel', label: '大纲', hint: '小说定位、主线与创作规划' },
  { id: 'world', label: '世界观', hint: '时代、规则、势力与设定' },
  { id: 'characters', label: '角色库', hint: '人物弧线、关系与性格' },
  { id: 'background', label: '背景', hint: '历史、地理与文化背景' },
  { id: 'chapters', label: '章节记忆', hint: '伏笔、章节约束与剧情节点' },
]
