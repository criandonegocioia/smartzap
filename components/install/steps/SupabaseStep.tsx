'use client';

import { useState, useCallback } from 'react';
import { ExternalLink, ChevronDown, Loader2 } from 'lucide-react';
import { StepCard } from '../StepCard';
import { ServiceIcon } from '../ServiceIcon';
import { TokenInput } from '../TokenInput';
import { SuccessCheckmark } from '../SuccessCheckmark';

interface SupabaseProject {
  id: string;
  name: string;
  ref: string;
  region: string;
  status: string;
}

interface SupabaseStepProps {
  onComplete: (data: { pat: string; projectUrl: string; projectRef: string }) => void;
}

/**
 * Step 3: Coleta do Supabase Personal Access Token e seleção de projeto.
 *
 * Comportamento:
 * - Valida formato: deve começar com "sbp_"
 * - Mínimo 30 caracteres
 * - Após validação, lista projetos e pede seleção
 * - Salva URL do projeto selecionado
 */
export function SupabaseStep({ onComplete }: SupabaseStepProps) {
  const [pat, setPat] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Estados de fase
  const [phase, setPhase] = useState<'token' | 'loading' | 'projects' | 'success'>('token');
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SupabaseProject | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleValidateToken = useCallback(async () => {
    const trimmed = pat.trim();

    if (!trimmed.startsWith('sbp_')) {
      setError('Token deve começar com "sbp_"');
      return;
    }

    if (trimmed.length < 30) {
      setError('Token muito curto');
      return;
    }

    setError(null);
    setPhase('loading');

    try {
      const response = await fetch('/api/installer/supabase-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao validar token');
        setPhase('token');
        return;
      }

      if (!data.projects || data.projects.length === 0) {
        setError('Nenhum projeto encontrado. Crie um projeto em supabase.com primeiro.');
        setPhase('token');
        return;
      }

      setProjects(data.projects);

      // Se só tem um projeto, seleciona automaticamente
      if (data.projects.length === 1) {
        setSelectedProject(data.projects[0]);
      }

      setPhase('projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão');
      setPhase('token');
    }
  }, [pat]);

  const handleSelectProject = (project: SupabaseProject) => {
    setSelectedProject(project);
    setDropdownOpen(false);
  };

  const handleConfirmProject = () => {
    if (!selectedProject) return;

    setPhase('success');
  };

  const handleSuccessComplete = () => {
    if (!selectedProject) return;

    // Monta a URL do projeto Supabase
    const projectUrl = `https://${selectedProject.ref}.supabase.co`;

    onComplete({
      pat: pat.trim(),
      projectUrl,
      projectRef: selectedProject.ref,
    });
  };

  // Status badges
  const statusColor = (status: string) => {
    if (status === 'ACTIVE_HEALTHY') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'COMING_UP' || status === 'RESTARTING') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (status === 'PAUSED') return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const statusLabel = (status: string) => {
    if (status === 'ACTIVE_HEALTHY') return 'Ativo';
    if (status === 'COMING_UP') return 'Iniciando';
    if (status === 'RESTARTING') return 'Reiniciando';
    if (status === 'PAUSED') return 'Pausado';
    return status;
  };

  // Show success state
  if (phase === 'success') {
    return (
      <StepCard glowColor="emerald">
        <SuccessCheckmark
          message="Projeto selecionado!"
          onComplete={handleSuccessComplete}
        />
      </StepCard>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <StepCard glowColor="emerald">
        <div className="flex flex-col items-center text-center py-8">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="mt-4 text-sm text-zinc-400">Buscando seus projetos...</p>
        </div>
      </StepCard>
    );
  }

  // Project selection state
  if (phase === 'projects') {
    return (
      <StepCard glowColor="emerald">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <ServiceIcon service="supabase" size="lg" />

          {/* Title */}
          <h2 className="mt-4 text-xl font-semibold text-zinc-100">
            Selecione o projeto
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Escolha qual projeto Supabase usar
          </p>

          {/* Project selector */}
          <div className="w-full mt-6 relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-left hover:border-emerald-500/50 transition-colors flex items-center justify-between"
            >
              {selectedProject ? (
                <div className="flex items-center gap-3">
                  <span className="text-zinc-100">{selectedProject.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor(selectedProject.status)}`}>
                    {statusLabel(selectedProject.status)}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-500">Selecione um projeto...</span>
              )}
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-10 max-h-60 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project)}
                    className={`w-full px-4 py-3 text-left hover:bg-zinc-700/50 transition-colors flex items-center justify-between ${selectedProject?.id === project.id ? 'bg-emerald-500/10' : ''
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-zinc-100">{project.name}</span>
                      <span className="text-xs text-zinc-500">{project.ref} • {project.region}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor(project.status)}`}>
                      {statusLabel(project.status)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Warning for paused projects */}
          {selectedProject?.status === 'PAUSED' && (
            <p className="mt-3 text-xs text-yellow-500">
              ⚠️ Este projeto está pausado. Ative-o no dashboard do Supabase antes de continuar.
            </p>
          )}

          {/* Confirm button */}
          <button
            type="button"
            disabled={!selectedProject || selectedProject.status === 'PAUSED'}
            onClick={handleConfirmProject}
            className="w-full mt-6 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar projeto
          </button>

          {/* Back link */}
          <button
            type="button"
            onClick={() => {
              setPhase('token');
              setProjects([]);
              setSelectedProject(null);
            }}
            className="mt-4 text-sm text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            Usar outro token
          </button>
        </div>
      </StepCard>
    );
  }

  // Token input state (default)
  return (
    <StepCard glowColor="emerald">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <ServiceIcon service="supabase" size="lg" />

        {/* Title */}
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">
          Configure o banco de dados
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Cole seu Personal Access Token do Supabase
        </p>

        {/* Input */}
        <div className="w-full mt-6">
          <TokenInput
            value={pat}
            onChange={(v) => {
              setPat(v);
              setError(null);
            }}
            placeholder="sbp_xxxxxxxxxxxxxxxx"
            error={error || undefined}
            minLength={30}
            autoSubmitLength={40}
            onAutoSubmit={handleValidateToken}
            accentColor="emerald"
          />
        </div>

        {/* Help link */}
        <a
          href="https://supabase.com/dashboard/account/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Como criar um Personal Access Token?
        </a>
      </div>
    </StepCard>
  );
}
