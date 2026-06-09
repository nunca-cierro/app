"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";
type AnimationMode = "fade" | "stagger" | "stagger-item";

type AnimatedWrapperProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  mode?: AnimationMode;
  duration?: number;
};

const directionOffset: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
  none: { y: 0 },
};

function AnimatedFade({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 0.5,
}: AnimatedWrapperProps) {
  const offset = directionOffset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function AnimatedStagger({
  children,
  className,
}: AnimatedWrapperProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedWrapper(props: AnimatedWrapperProps) {
  if (props.mode === "stagger") {
    return <AnimatedStagger {...props} />;
  }

  return <AnimatedFade {...props} />;
}

export { itemVariants };
