'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/validation'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

interface Participant {
  participant_id: string
  display_name: string
  is_placeholder: boolean
}

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  participants: Participant[]
  onExpenseAdded: () => void
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  billId,
  participants,
  onExpenseAdded
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'shares'>('equal')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [shares, setShares] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (participants.length > 0 && !payerId) {
      setPayerId(participants[0].participant_id)
      // Select all participants by default for equal split
      setSelectedParticipants(new Set(participants.map(p => p.participant_id)))
    }
  }, [participants, payerId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      toast.error('Por favor, adicione uma descrição')
      return
    }

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Por favor, insira um valor válido')
      return
    }

    // Build splits based on split type
    let splits: any[] = []
    
    if (splitType === 'equal') {
      if (selectedParticipants.size === 0) {
        toast.error('Selecione pelo menos um participante')
        return
      }
      splits = Array.from(selectedParticipants).map(participantId => ({
        participantId
      }))
    } else if (splitType === 'percentage') {
      const totalPercentage = Object.values(percentages).reduce((sum, p) => sum + parseFloat(p || '0'), 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error('As porcentagens devem somar 100%')
        return
      }
      splits = Object.entries(percentages)
        .filter(([_, p]) => parseFloat(p) > 0)
        .map(([participantId, percentage]) => ({
          participantId,
          percentage: parseFloat(percentage)
        }))
    } else if (splitType === 'shares') {
      const hasShares = Object.values(shares).some(s => parseInt(s) > 0)
      if (!hasShares) {
        toast.error('Adicione pelo menos uma parte')
        return
      }
      splits = Object.entries(shares)
        .filter(([_, s]) => parseInt(s) > 0)
        .map(([participantId, shareValue]) => ({
          participantId,
          shares: parseInt(shareValue)
        }))
    }

    // Ensure payer is included in splits
    const payerInSplits = splits.some(s => s.participantId === payerId)
    if (!payerInSplits) {
      toast.error('O pagador deve estar incluído na divisão')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await api.post(`/bills/${billId}/expenses`, {
        payerParticipantId: payerId,
        amountCents,
        description: description.trim(),
        spentAt: new Date().toISOString(),
        splitType,
        splits
      })

      toast.success('Gasto adicionado com sucesso!')
      onExpenseAdded()
      handleClose()
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setDescription('')
    setAmount('')
    setSelectedParticipants(new Set(participants.map(p => p.participant_id)))
    setPercentages({})
    setShares({})
    setSplitType('equal')
    onClose()
  }

  const handleParticipantToggle = (participantId: string) => {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId)
    } else {
      newSelected.add(participantId)
    }
    setSelectedParticipants(newSelected)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-float">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
              Adicionar Gasto
            </h2>
            <button
              onClick={handleClose}
              className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 glass-card bg-white/5 text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))]"
                placeholder="Ex: Carne para o churrasco"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--foreground-muted))]">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 glass-card bg-white/5 text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))]"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Payer */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Quem pagou?
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-4 py-2 glass-card bg-white/5 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))]"
                required
              >
                {participants.map(participant => (
                  <option key={participant.participant_id} value={participant.participant_id}>
                    {participant.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Type */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Como dividir?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`px-4 py-2 glass-card transition-all ${
                    splitType === 'equal' 
                      ? 'bg-[hsl(var(--pix-primary))] text-white' 
                      : 'bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10'
                  }`}
                >
                  Igual
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('percentage')}
                  className={`px-4 py-2 glass-card transition-all ${
                    splitType === 'percentage' 
                      ? 'bg-[hsl(var(--pix-primary))] text-white' 
                      : 'bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10'
                  }`}
                >
                  Porcentagem
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('shares')}
                  className={`px-4 py-2 glass-card transition-all ${
                    splitType === 'shares' 
                      ? 'bg-[hsl(var(--pix-primary))] text-white' 
                      : 'bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10'
                  }`}
                >
                  Partes
                </button>
              </div>
            </div>

            {/* Include myself option */}
            <div>
              <label className="flex items-center p-3 glass-card bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={participants.length > 0 && selectedParticipants.has(participants[0].participant_id)}
                  onChange={() => participants.length > 0 && handleParticipantToggle(participants[0].participant_id)}
                  className="mr-3 w-4 h-4 text-[hsl(var(--pix-primary))] rounded focus:ring-[hsl(var(--pix-primary))]"
                />
                <span className="text-[hsl(var(--foreground))] font-medium">
                  Me incluir nesta despesa
                </span>
              </label>
            </div>

            {/* Participants Selection based on split type */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Dividir entre outros participantes
              </label>
              <div className="space-y-2">
                {participants.slice(1).map(participant => (
                  <div key={participant.participant_id} className="flex items-center justify-between p-3 glass-card bg-white/5">
                    <div className="flex items-center">
                      {splitType === 'equal' && (
                        <input
                          type="checkbox"
                          checked={selectedParticipants.has(participant.participant_id)}
                          onChange={() => handleParticipantToggle(participant.participant_id)}
                          className="mr-3 w-4 h-4 text-[hsl(var(--pix-primary))] rounded focus:ring-[hsl(var(--pix-primary))]"
                        />
                      )}
                      <span className="text-[hsl(var(--foreground))]">
                        {participant.display_name}
                      </span>
                    </div>
                    
                    {splitType === 'percentage' && (
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={percentages[participant.participant_id] || ''}
                          onChange={(e) => setPercentages({
                            ...percentages,
                            [participant.participant_id]: e.target.value
                          })}
                          className="w-20 px-2 py-1 glass-card bg-white/5 text-[hsl(var(--foreground))] text-right"
                          placeholder="0"
                        />
                        <span className="ml-2 text-[hsl(var(--foreground-muted))]">%</span>
                      </div>
                    )}
                    
                    {splitType === 'shares' && (
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={shares[participant.participant_id] || ''}
                        onChange={(e) => setShares({
                          ...shares,
                          [participant.participant_id]: e.target.value
                        })}
                        className="w-20 px-2 py-1 glass-card bg-white/5 text-[hsl(var(--foreground))] text-right"
                        placeholder="0"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 glass-card bg-white/10 text-[hsl(var(--foreground-muted))] hover:bg-white/20 transition-all"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 glass-card bg-[hsl(var(--pix-primary))] text-white hover:glow transition-all disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adicionando...' : 'Adicionar Gasto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}