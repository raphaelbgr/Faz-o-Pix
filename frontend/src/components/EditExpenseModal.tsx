'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/utils/validation'

interface Participant {
  id: string
  displayName: string
}

interface ExpenseSplit {
  participant: { id?: string; displayName: string }
  participantId?: string
  amountCents: number
}

interface Expense {
  id: string
  description?: string
  amountCents: number
  spentAt: string
  payer: { id?: string; displayName: string }
  payerParticipantId?: string
  splits: ExpenseSplit[]
}

interface EditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  participants: Participant[]
  expense: Expense | null
}

export function EditExpenseModal({ isOpen, onClose, billId, participants, expense }: EditExpenseModalProps) {
  const queryClient = useQueryClient()
  const [payerParticipantId, setPayerParticipantId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [spentAt, setSpentAt] = useState('')
  const [splitType, setSplitType] = useState<'EQUAL' | 'PERCENT'>('EQUAL')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  useEffect(() => {
    if (expense && isOpen) {
      setPayerParticipantId(expense.payerParticipantId || '')
      setAmountStr((expense.amountCents / 100).toFixed(2).replace('.', ','))
      setDescription(expense.description || '')
      setSpentAt(new Date(expense.spentAt).toISOString().split('T')[0] || '')
      setSelectedParticipants(expense.splits.map(s => s.participantId || s.participant.id || '').filter(Boolean))
      setSplitType('EQUAL')
    }
  }, [expense, isOpen])

  const amountCents = Math.round(parseFloat(amountStr.replace(',', '.') || '0') * 100)

  const updateExpense = useMutation({
    mutationFn: async () => {
      const splits = selectedParticipants.map(pid => ({
        shareType: splitType,
        participantId: pid,
        ...(splitType === 'PERCENT' ? { shareValue: 100 / selectedParticipants.length } : {}),
      }))

      const response = await api.put(`/bills/${billId}/expenses/${expense!.id}`, {
        payerParticipantId,
        amountCents,
        description: description || undefined,
        spentAt: new Date(spentAt).toISOString(),
        splits,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      queryClient.invalidateQueries({ queryKey: ['balances', billId] })
      toast.success('Gasto atualizado!')
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao atualizar gasto'
      toast.error(msg)
    },
  })

  if (!isOpen || !expense) return null

  const toggleParticipant = (pid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-modal w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Editar Gasto</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateExpense.mutate()
          }}
          className="space-y-4"
        >
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço, Uber, Hotel..."
              className="input-field"
              maxLength={1000}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9,\.]/g, ''))}
                placeholder="0,00"
                className="input-field pl-12 text-lg font-semibold"
                required
              />
            </div>
            {amountCents > 0 && (
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(amountCents)}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
            <input
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Payer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quem pagou? *</label>
            <select
              value={payerParticipantId}
              onChange={(e) => setPayerParticipantId(e.target.value)}
              className="input-field"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* Split Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dividir entre *</label>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleParticipant(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedParticipants.includes(p.id)
                      ? 'bg-pix-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
            {selectedParticipants.length > 0 && amountCents > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {formatCurrency(Math.floor(amountCents / selectedParticipants.length))} por pessoa
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={amountCents <= 0 || selectedParticipants.length === 0 || updateExpense.isPending}
              className="flex-1 btn-primary"
            >
              {updateExpense.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
