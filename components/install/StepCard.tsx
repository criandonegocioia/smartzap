'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type GlowColor = 'emerald' | 'blue' | 'orange' | 'red' | 'purple' | 'zinc';

interface StepCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  glowColor?: GlowColor;
  showTopGradient?: boolean;
}

const glowColors: Record<GlowColor, string> = {
  emerald: 'shadow-[0_0_60px_-15px_theme(colors.emerald.500/0.25)]',
  blue: 'shadow-[0_0_60px_-15px_theme(colors.blue.500/0.25)]',
  orange: 'shadow-[0_0_60px_-15px_theme(colors.orange.500/0.25)]',
  red: 'shadow-[0_0_60px_-15px_theme(colors.red.500/0.25)]',
  purple: 'shadow-[0_0_60px_-15px_theme(colors.purple.500/0.25)]',
  zinc: 'shadow-[0_0_60px_-15px_theme(colors.zinc.500/0.15)]',
};

const focusGlowColors: Record<GlowColor, string> = {
  emerald: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.emerald.500/0.3)] focus-within:border-emerald-500/30',
  blue: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.blue.500/0.3)] focus-within:border-blue-500/30',
  orange: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.orange.500/0.3)] focus-within:border-orange-500/30',
  red: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.red.500/0.3)] focus-within:border-red-500/30',
  purple: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.purple.500/0.3)] focus-within:border-purple-500/30',
  zinc: 'focus-within:shadow-[0_0_80px_-10px_theme(colors.zinc.500/0.2)] focus-within:border-zinc-600/50',
};

/**
 * Card principal de cada step com glow effect.
 *
 * Características:
 * - Background com blur (glassmorphism)
 * - Glow colorido configurável
 * - Glow intensifica quando input dentro tem foco
 * - Gradient sutil no topo
 * - Animação de entrada/saída
 */
export const StepCard = forwardRef<HTMLDivElement, StepCardProps>(
  function StepCard(
    {
      children,
      className,
      glowColor = 'emerald',
      showTopGradient = true,
      ...props
    },
    ref
  ) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className={cn(
          // Base
          'relative p-6 sm:p-8 rounded-2xl',
          // Background
          'bg-zinc-900/70 backdrop-blur-xl',
          // Border
          'border border-zinc-800/80',
          // Glow
          glowColors[glowColor],
          // Focus glow (quando input dentro tem foco)
          focusGlowColors[glowColor],
          // Transition
          'transition-all duration-300',
          // Custom
          className
        )}
        {...props}
      >
        {/* Gradient line no topo */}
        {showTopGradient && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent rounded-t-2xl" />
        )}

        {children}
      </motion.div>
    );
  }
);
