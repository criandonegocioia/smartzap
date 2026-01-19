'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StepDotsProps {
  current: number;
  total: number;
  completedSteps?: number[];
  className?: string;
}

/**
 * Indicador de progresso com dots animados.
 *
 * Estados:
 * - Pendente: zinc-700, escala 1x
 * - Atual: emerald-500, escala 1.3x com pulse ring
 * - Completado: emerald-500/50, escala 1x
 */
export function StepDots({
  current,
  total,
  completedSteps = [],
  className,
}: StepDotsProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isCompleted = completedSteps.includes(stepNum) || stepNum < current;

        return (
          <motion.div
            key={i}
            className="relative"
            animate={{ scale: isActive ? 1.3 : 1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
          >
            {/* Pulse ring para step ativo */}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            {/* Dot */}
            <motion.div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors duration-300 relative z-10',
                isActive && 'bg-emerald-500',
                isCompleted && !isActive && 'bg-emerald-500/50',
                !isActive && !isCompleted && 'bg-zinc-700'
              )}
              initial={false}
              animate={{
                backgroundColor: isActive
                  ? 'rgb(16 185 129)'
                  : isCompleted
                  ? 'rgb(16 185 129 / 0.5)'
                  : 'rgb(63 63 70)',
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
