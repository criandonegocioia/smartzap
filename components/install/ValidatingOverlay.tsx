'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidatingOverlayProps {
  isVisible: boolean;
  message: string;
  subMessage?: string;
  className?: string;
}

/**
 * Overlay que aparece durante validação de tokens.
 *
 * Características:
 * - Backdrop blur
 * - Spinner animado
 * - Mensagens contextuais
 * - Dots pulsantes
 */
export function ValidatingOverlay({
  isVisible,
  message,
  subMessage,
  className,
}: ValidatingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute inset-0 z-20',
            'flex flex-col items-center justify-center',
            'bg-zinc-900/90 backdrop-blur-sm',
            'rounded-2xl',
            className
          )}
        >
          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="mb-4"
          >
            <Loader2 className="w-10 h-10 text-emerald-500" />
          </motion.div>

          {/* Main message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-100 font-medium text-center"
          >
            {message}
          </motion.p>

          {/* Sub message */}
          {subMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-zinc-400 mt-1 text-center"
            >
              {subMessage}
            </motion.p>
          )}

          {/* Pulsing dots */}
          <div className="flex gap-1.5 mt-5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
