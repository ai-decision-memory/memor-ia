"use client";

import { motion } from "motion/react";

export function TextShimmer({
  children,
  className,
  duration = 1.8,
}: {
  children: string;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={`inline-block text-transparent ${className ?? ""}`}
      style={{
        backgroundClip: "text",
        backgroundImage:
          "linear-gradient(110deg, var(--color-text-muted) 40%, var(--color-text-primary) 50%, var(--color-text-muted) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
      }}
      animate={{
        backgroundPosition: ["100% 0%", "-100% 0%"],
      }}
      transition={{
        duration,
        ease: "linear",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.span>
  );
}
