/** 编辑器 UI 过渡曲线与时长（Tab / 下拉 / 开关等共用） */
export const motion = {
  duration: {
    fast: 160,
    normal: 280,
    slow: 380,
    pop: 220,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    morph: 'cubic-bezier(0.34, 1.15, 0.64, 1)',
    spring: 'cubic-bezier(0.34, 1.25, 0.64, 1)',
  },
} as const

export const motionMs = (key: keyof typeof motion.duration) => `${motion.duration[key]}ms`

export const motionTransition = {
  interactive: [
    `background ${motionMs('normal')} ${motion.easing.standard}`,
    `color ${motionMs('normal')} ${motion.easing.standard}`,
    `border-color ${motionMs('normal')} ${motion.easing.standard}`,
    `box-shadow ${motionMs('normal')} ${motion.easing.standard}`,
    `opacity ${motionMs('fast')} ${motion.easing.standard}`,
    `transform ${motionMs('normal')} ${motion.easing.morph}`,
  ].join(', '),
  morph: `all ${motionMs('slow')} ${motion.easing.morph}`,
  pop: [
    `opacity ${motionMs('pop')} ${motion.easing.standard}`,
    `transform ${motionMs('pop')} ${motion.easing.morph}`,
  ].join(', '),
  indicator: [
    `left ${motionMs('slow')} ${motion.easing.morph}`,
    `top ${motionMs('slow')} ${motion.easing.morph}`,
    `width ${motionMs('slow')} ${motion.easing.morph}`,
    `height ${motionMs('slow')} ${motion.easing.morph}`,
    `border-radius ${motionMs('normal')} ${motion.easing.morph}`,
  ].join(', '),
} as const
