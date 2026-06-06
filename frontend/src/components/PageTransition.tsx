import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full flex flex-col"
    >
      {children}
    </motion.div>
  )
}
