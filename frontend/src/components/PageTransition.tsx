import { motion } from 'framer-motion'

/** 营销页过渡；管理端/仪表盘在 App.tsx 中跳过此组件 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full w-full flex-col"
    >
      {children}
    </motion.div>
  )
}
