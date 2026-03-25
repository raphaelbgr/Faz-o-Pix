'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatCurrency } from '@/utils/validation'
import { useState } from 'react'

interface ParticipantBalance {
  participantId: string
  participant: { id: string; displayName: string }
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

interface BalancesResponse {
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

interface BalanceViewProps {
  billId: string
  onRecordSettlement?: () => void
}

export function BalanceView({ billId, onRecordSettlement }: BalanceViewProps) {
  const [showSimplified, setShowSimplified] = useState(true)

  const { data, isLoading, error } = useQuery<BalancesResponse>({
    queryKey: ['balances', billId],
    queryFn: async () => {
      const response = await api.get(`/bills/${billId}/balances`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-6">
        <p className="text-red-500 text-sm">Erro ao carregar saldos</p>
      </div>
    )
  }

  const balanceData = showSimplified && data.simplified ? data.simplified : data.raw
  const { participants, debts } = balanceData

  return (
    <div className="space-y-6">
      {/* Participant Balances */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Saldos</h3>
          {data.simplifyEnabled && data.simplified && (
            <button
              onClick={() => setShowSimplified(!showSimplified)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                showSimplified
                  ? 'bg-pix-100 text-pix-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {showSimplified ? 'Simplificado' : 'Original'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {participants
            .sort((a, b) => b.netBalance - a.netBalance)
            .map((p) => (
              <div
                key={p.participantId}
                className={`flex items-center justify-between p-3 rounded-xl transition ${
                  p.netBalance > 0
                    ? 'bg-green-50/80 border border-green-100'
                    : p.netBalance < 0
                      ? 'bg-red-50/80 border border-red-100'
                      : 'bg-gray-50/80 border border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      p.netBalance > 0
                        ? 'bg-green-500'
                        : p.netBalance < 0
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                    }`}
                  >
                    {p.participant.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.participant.displayName}</p>
                    <p className="text-xs text-gray-500">
                      Pagou {formatCurrency(p.totalPaid)} | Deve {formatCurrency(p.totalOwed)}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-sm ${
                    p.netBalance > 0
                      ? 'text-green-700'
                      : p.netBalance < 0
                        ? 'text-red-700'
                        : 'text-gray-500'
                  }`}
                >
                  {p.netBalance > 0 ? '+' : ''}{formatCurrency(p.netBalance)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Debts / Payment Suggestions */}
      {debts.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {showSimplified && data.simplified ? 'Pagamentos Sugeridos' : 'Dividas'}
            </h3>
            {data.simplifyEnabled && data.simplified && showSimplified && (
              <span className="text-xs text-pix-600 font-medium bg-pix-50 px-2 py-1 rounded-full">
                {data.simplified.debts.length} pagamento{data.simplified.debts.length !== 1 ? 's' : ''}
                {data.raw.debts.length > data.simplified.debts.length && (
                  <> (era {data.raw.debts.length})</>
                )}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {debts.map((debt, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-800">
                    {debt.fromParticipant.displayName}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="font-medium text-gray-800">
                    {debt.toParticipant.displayName}
                  </span>
                </div>
                <span className="font-bold text-amber-700 text-sm">
                  {formatCurrency(debt.amountCents)}
                </span>
              </div>
            ))}
          </div>

          {onRecordSettlement && (
            <button
              onClick={onRecordSettlement}
              className="w-full mt-4 px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium text-sm"
            >
              Registrar Pagamento
            </button>
          )}
        </div>
      )}

      {/* All settled */}
      {debts.length === 0 && participants.some((p) => p.totalPaid > 0) && (
        <div className="bg-green-50/80 backdrop-blur-xl rounded-2xl shadow-sm border border-green-100 p-6 text-center">
          <div className="text-3xl mb-2">&#10003;</div>
          <p className="font-semibold text-green-800">Tudo acertado!</p>
          <p className="text-sm text-green-600 mt-1">Nao ha dividas pendentes nesta conta</p>
        </div>
      )}
    </div>
  )
}
