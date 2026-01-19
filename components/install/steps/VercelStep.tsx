'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { StepCard } from '../StepCard';
import { ServiceIcon } from '../ServiceIcon';
import { TokenInput } from '../TokenInput';
import { ValidatingOverlay } from '../ValidatingOverlay';
import { SuccessCheckmark } from '../SuccessCheckmark';

interface VercelProject {
  id: string;
  name: string;
  teamId?: string;
  url?: string;
}

interface VercelStepProps {
  onComplete: (data: { token: string; project: VercelProject }) => void;
}

/**
 * Step 2: Coleta do token Vercel com auto-submit.
 *
 * Comportamento:
 * 1. Usuário cola o token
 * 2. Após 24+ chars, aguarda 800ms
 * 3. Valida automaticamente via API
 * 4. Mostra sucesso e avança
 */
export function VercelStep({ onComplete }: VercelStepProps) {
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<VercelProject | null>(null);

  const handleValidate = async () => {
    if (token.trim().length < 24) {
      setError('Token muito curto');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const res = await fetch('/api/installer/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          domain: window.location.hostname,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Token inválido');
      }

      setProject(data.project);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar token');
    } finally {
      setValidating(false);
    }
  };

  const handleSuccessComplete = () => {
    if (project) {
      onComplete({ token: token.trim(), project });
    }
  };

  // Show success state
  if (success && project) {
    return (
      <StepCard>
        <SuccessCheckmark
          message={`Projeto "${project.name}" encontrado!`}
          onComplete={handleSuccessComplete}
        />
      </StepCard>
    );
  }

  return (
    <StepCard className="relative">
      <ValidatingOverlay
        isVisible={validating}
        message="Verificando token..."
        subMessage="Procurando seu projeto na Vercel"
      />

      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <ServiceIcon service="vercel" size="lg" />

        {/* Title */}
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">
          Conecte sua conta Vercel
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Cole seu token de acesso
        </p>

        {/* Input */}
        <div className="w-full mt-6">
          <TokenInput
            value={token}
            onChange={setToken}
            placeholder="Vercel Access Token"
            validating={validating}
            error={error || undefined}
            minLength={24}
            autoSubmitLength={24}
            onAutoSubmit={handleValidate}
            accentColor="emerald"
          />
        </div>

        {/* Help link */}
        <a
          href="https://vercel.com/account/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Onde encontrar meu token?
        </a>
      </div>
    </StepCard>
  );
}
