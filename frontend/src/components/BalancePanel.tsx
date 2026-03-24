'use client'

import { formatCurrency } from '@/utils/validation'

interface ParticipantBalance {
  participantId: string
  participant: {
    id: string
    displayName: string
  }
  totalPaid: number
  totalOwed: number
  netBalance: number
}

interface Debt {
  fromParticipantId: string
  fromParticipant: { displayName: string }
  toParticipantId: string
  toParticipant: { displayName: string }
  amountCents: number
}

interface BalanceData {
  raw: {
    participants: ParticipantBalance[]
    debts: Debt[]
  }
  simplified: {
    participants: ParticipantBalance[]
    debts: Debt[]
  } | null
  simplifyEnabled: boolean
}

export function BalancePanel({ data }: { data: BalanceData }) {
  const activeDebts = data.simplifyEnabled && data.simplified
    ? data.simplified.debts
    : data.raw.debts

  const participants = data.raw.participants

  return (
    <div className="glass-card p-6 animate-float">
      <h2 className="text-lg font-medium text-[hsl(var(--foreground))] mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-[hsl(var(--pix-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
        Saldos
        {data.simplifyEnabled && (
          <span className="ml-2 glass-card text-xs bg-[hsl(var(--pix-primary))]/15 text-[hsl(var(--pix-primary))] px-2.5 py-1 rounded-full border border-[hsl(var(--pix-primary))]/30">
            Simplificado
          </span>
        )}
      </h2>

      {/* Per-participant balances */}
      <div className="space-y-3 mb-6">
        {participants.map((p) => (
          <div key={p.participantId} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                p.netBalance > 0
                  ? 'bg-gradient-to-br from-green-400 to-green-600'
                  : p.netBalance < 0
                  ? 'bg-gradient-to-br from-red-400 to-red-600'
                  : 'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>
                {p.participant.displayName?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-[hsl(var(--foreground))]">
                {p.participant.displayName}
              </span>
            </div>
            <span className={`text-sm font-medium ${
              p.netBalance > 0
                ? 'text-green-600 dark:text-green-400'
                : p.netBalance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-[hsl(var(--foreground-muted))]'
            }`}>
              {p.netBalance > 0 ? '+' : ''}{formatCurrency(p.netBalance)}
            </span>
          </div>
        ))}
      </div>

      {/* Payment suggestions */}
      {activeDebts.length > 0 ? (
        <>
          <h3 className="text-sm font-medium text-[hsl(var(--foreground-muted))] mb-3">
            Pagamentos sugeridos
          </h3>
          <div className="space-y-3">
            {activeDebts.map((debt, index) => (
              <div
                key={index}
                className="glass-card p-3 bg-[hsl(var(--pix-primary))]/5 border border-[hsl(var(--pix-primary))]/20 hover:glow transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {debt.fromParticipant.displayName}
                    </span>
                    <svg className="w-4 h-4 text-[hsl(var(--pix-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {debt.toParticipant.displayName}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[hsl(var(--pix-primary))]">
                    {formatCurrency(debt.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Tudo quitado!
          </p>
        </div>
      )}

      {/* Simplification comparison */}
      {data.simplifyEnabled && data.simplified && data.raw.debts.length > data.simplified.debts.length && (
        <p className="text-xs text-[hsl(var(--foreground-muted))] mt-4 text-center">
          {data.raw.debts.length} pagamentos reduzidos para {data.simplified.debts.length}
        </p>
      )}
    </div>
  )
}
