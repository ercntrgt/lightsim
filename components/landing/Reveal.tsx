"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  /** Stagger için gecikme (sn). */
  delay?: number;
  /** Hover'da hafif yükselme (kartlar için). */
  hover?: boolean;
  className?: string;
}

/**
 * Scroll ile (viewport'a girince) bir kez çalışan, yumuşak fade + slide-up.
 * Yalnız transform/opacity → GPU, CLS yok. prefers-reduced-motion'da
 * animasyon yok; içerik anında ve statik görünür.
 */
export function Reveal({ children, delay = 0, hover, className }: Props) {
  const reduce = useReducedMotion();

  if (reduce)
    return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        hover ? { y: -5, transition: { duration: 0.22 } } : undefined
      }
    >
      {children}
    </motion.div>
  );
}
