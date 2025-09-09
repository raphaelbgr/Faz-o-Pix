'use client'

import { formatCurrency } from '@/utils/validation'
import { ChangelogEntry } from '@/hooks/useWebSocket'

interface ChangelogPanelProps {
  changelog: ChangelogEntry[]
  isConnected: boolean
}

export function ChangelogPanel({ changelog, isConnected }: ChangelogPanelProps) {
  if (changelog.length === 0) {
    return (
      <div className="glass-card p-6 animate-float">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">Histórico de Alterações</h3>
          <div className="flex items-center">
            <div 
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-[hsl(var(--foreground-muted))]">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="glass-card mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[hsl(var(--foreground-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-[hsl(var(--foreground-muted))]">
            Nenhuma alteração ainda. As mudanças aparecerão aqui em tempo real.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 animate-float">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">
          Histórico de Alterações
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--pix-primary))]/20 text-[hsl(var(--pix-primary))]">
            Tempo Real
          </span>
        </h3>
        <div className="flex items-center">
          <div 
            className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-[hsl(var(--foreground-muted))]">
            {isConnected ? 'Conectado' : 'Reconectando...'}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {changelog.map((entry) => (
          <div
            key={entry.id}
            className="glass-card p-4 hover:glow transition-all duration-300"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getActionIcon(entry.action)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {entry.user.fullName}
                  </p>
                  <time className="text-xs text-[hsl(var(--foreground-muted))]">
                    {formatTime(entry.createdAt)}
                  </time>
                </div>
                
                <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">
                  {entry.description}
                </p>
                
                {entry.metadata && entry.metadata.amount && (
                  <p className="text-sm font-medium text-[hsl(var(--pix-primary))] mt-1">
                    {formatCurrency(entry.metadata.amount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getActionIcon(action: string) {
  switch (action) {
    case 'EXPENSE_ADDED':
      return (
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )
    case 'EXPENSE_UPDATED':
      return (
        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      )
    case 'EXPENSE_DELETED':
      return (
        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      )
    case 'MEMBER_ADDED':
      return (
        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      )
    case 'SETTLEMENT_ADDED':
      return (
        <div className="w-8 h-8 bg-[hsl(var(--pix-primary))]/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-[hsl(var(--pix-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-8 h-8 bg-[hsl(var(--foreground-muted))]/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-[hsl(var(--foreground-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Agora'
  if (diffMinutes < 60) return `${diffMinutes}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}