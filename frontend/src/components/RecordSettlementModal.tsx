'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/utils/validation'

interface Participant {
  participant_id: string
  display_name: string
}

interface Debt {
  fromParticipantId: string
  fromParticipant: { displayName: string }
  toParticipantId: string
  toParticipant: { displayName: string }
  amountCents: number
}

interface RecordSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  participants: Participant[]
  suggestedDebts: Debt[]
  onSettlementRecorded: () => void
}

export default function RecordSettlementModal({
  isOpen,
  onClose,
  billId,
  participants,
  suggestedDebts,
  onSettlementRecorded,
}: RecordSettlementModalProps) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('PIX')
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSuggestedDebt = (debt: Debt) => {
    setFromId(debt.fromParticipantId)
    setToId(debt.toParticipantId)
    setAmount((debt.amountCents / 100).toFixed(2).replace('.', ','))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fromId || !toId || !amount) {
      toast.error('Preencha todos os campos obrigatorios')
      return
    }

    if (fromId === toId) {
      toast.error('Pagador e recebedor devem ser diferentes')
      return
    }

    const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post(`/bills/${billId}/settlements`, {
        fromParticipantId: fromId,
        toParticipantId: toId,
        amountCents,
        method,
        reference: reference || undefined,
      })
      toast.success('Pagamento registrado!')
      onSettlementRecorded()
      onClose()
      // Reset form
      setFromId('')
      setToId('')
      setAmount('')
      setReference('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar pagamento')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 rounded-2xl relative animate-float">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[hsl(var(--foreground))] mb-6">
          Registrar Pagamento
        </h2>

        {/* Quick fill from suggested debts */}
        {suggestedDebts.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-[hsl(var(--foreground-muted))] mb-2 font-medium">
              Pagamentos sugeridos (clique para preencher):
            </p>
            <div className="space-y-2">
              {suggestedDebts.map((debt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestedDebt(debt)}
                  className="w-full glass-card p-3 text-left text-sm bg-[hsl(var(--pix-primary))]/5 border border-[hsl(var(--pix-primary))]/20 hover:bg-[hsl(var(--pix-primary))]/15 transition-all duration-200 rounded-xl"
                >
                  <span className="font-medium">{debt.fromParticipant.displayName}</span>
                  {' → '}
                  <span className="font-medium">{debt.toParticipant.displayName}</span>
                  <span className="float-right text-[hsl(var(--pix-primary))] font-bold">
                    {formatCurrency(debt.amountCents)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Quem pagou
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="input-glass w-full px-3 py-2 rounded-xl text-[hsl(var(--foreground))]"
            >
              <option value="">Selecione...</option>
              {participants.map((p) => (
                <option key={p.participant_id} value={p.participant_id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Quem recebeu
            </label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="input-glass w-full px-3 py-2 rounded-xl text-[hsl(var(--foreground))]"
            >
              <option value="">Selecione...</option>
              {participants.filter((p) => p.participant_id !== fromId).map((p) => (
                <option key={p.participant_id} value={p.participant_id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Valor (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="input-glass w-full px-3 py-2 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
              Metodo
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="input-glass w-full px-3 py-2 rounded-xl text-[hsl(var(--foreground))]"
            >
              <option value="PIX">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          {method === 'PIX' && (
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Referencia PIX (opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ID da transacao"
                className="input-glass w-full px-3 py-2 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-500 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02]"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Pagamento'}
          </button>
        </form>
      </div>
    </div>
  )
}
