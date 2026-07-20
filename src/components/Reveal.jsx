// Scroll transition wrapper — sections animate in as they enter the viewport.
import React from 'react'
import { motion } from 'framer-motion'

export default function Reveal({ children, delay = 0, y = 22, className = '', once = true }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-40px 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function RevealStagger({ children, className = '', gap = 0.06 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 18 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
