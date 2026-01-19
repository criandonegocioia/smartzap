'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { StepDots } from './StepDots';
import { cn } from '@/lib/utils';

interface InstallLayoutProps {
  children: ReactNode;
  currentStep?: number;
  totalSteps?: number;
  showLogo?: boolean;
  showDots?: boolean;
  className?: string;
}

/**
 * Layout principal do wizard de instalação.
 *
 * Características:
 * - Background com gradient diagonal (zinc → emerald)
 * - Logo animado no topo
 * - Step dots indicando progresso
 * - Centralização responsiva
 */
export function InstallLayout({
  children,
  currentStep = 1,
  totalSteps = 5,
  showLogo = true,
  showDots = true,
  className,
}: InstallLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center p-4',
        'bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20',
        'relative overflow-hidden',
        className
      )}
    >
      {/* Glow effect no fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-8 text-center"
          >
            <h1 className="text-2xl font-display font-bold text-zinc-100">
              SmartZap
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Configuração Inicial
            </p>
          </motion.div>
        )}

        {/* Step Dots */}
        {showDots && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mb-8"
          >
            <StepDots current={currentStep} total={totalSteps} />
          </motion.div>
        )}

        {/* Main Content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
