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

interface SplitParticipant {
  participantId: string
  displayName: string
  isSelected: boolean
  customAmount?: number
  pixKey?: string
  isTemporary?: boolean
}

export default function AddExpenseModalV2({
  isOpen,
  onClose,
  billId,
  participants,
  onExpenseAdded
}: AddExpenseModalProps) {
  const [step, setStep] = useState<'details' | 'split'>('details')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState('')
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (participants.length > 0) {
      // Initialize split participants with everyone selected by default
      setSplitParticipants(
        participants.map(p => ({
          participantId: p.participant_id,
          displayName: p.display_name,
          isSelected: true,
          customAmount: undefined
        }))
      )
    }
  }, [participants])

  if (!isOpen) return null

  const handleNextStep = () => {
    if (!description.trim()) {
      toast.error('Por favor, adicione uma descrição')
      return
    }

    const amountValue = parseFloat(amount.replace(',', '.'))
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Por favor, insira um valor válido')
      return
    }

    setStep('split')
  }

  const handleParticipantToggle = (participantId: string) => {
    setSplitParticipants(prev => 
      prev.map(p => 
        p.participantId === participantId 
          ? { ...p, isSelected: !p.isSelected }
          : p
      )
    )
  }

  const handleCustomAmountChange = (participantId: string, value: string) => {
    const numValue = parseFloat(value.replace(',', '.'))
    setSplitParticipants(prev =>
      prev.map(p =>
        p.participantId === participantId
          ? { ...p, customAmount: isNaN(numValue) ? 0 : numValue }
          : p
      )
    )
  }

  const searchPixKey = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // TEMPORARY: Using auth route for participants search
      const response = await api.get(`/auth/participants-search?pixKey=${encodeURIComponent(query)}`)
      setSearchResults(response.data)
    } catch (error) {
      console.error('Error searching PIX key:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addPersonFromSearch = (person: any) => {
    const newParticipant: SplitParticipant = {
      participantId: person.id || `temp_${Date.now()}`,
      displayName: person.displayName || person.name,
      isSelected: true,
      pixKey: person.pixKey,
      isTemporary: !person.id
    }
    
    setSplitParticipants(prev => [...prev, newParticipant])
    setShowAddPerson(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const addPersonManually = (name: string) => {
    if (!name.trim()) return
    
    const newParticipant: SplitParticipant = {
      participantId: `temp_${Date.now()}`,
      displayName: name.trim(),
      isSelected: true,
      isTemporary: true
    }
    
    setSplitParticipants(prev => [...prev, newParticipant])
    setShowAddPerson(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const removeParticipant = (participantId: string) => {
    setSplitParticipants(prev => prev.filter(p => p.participantId !== participantId))
  }

  const calculateSplitPreview = () => {
    const selectedParticipants = splitParticipants.filter(p => p.isSelected)
    const totalAmount = parseFloat(amount.replace(',', '.'))
    
    if (splitMode === 'equal') {
      const perPerson = totalAmount / selectedParticipants.length
      return selectedParticipants.map(p => ({
        ...p,
        amount: perPerson
      }))
    } else {
      // Custom split - use the amounts entered
      return selectedParticipants.map(p => ({
        ...p,
        amount: p.customAmount || 0
      }))
    }
  }

  const createTemporaryParticipant = async (participantData: SplitParticipant) => {
    
    // Determine identifier type and value for temporary participants
    let identifierType = 'EMAIL'  // Default fallback
    let identifierValue = `${participantData.displayName.toLowerCase().replace(/\s+/g, '')}@temp.placeholder`
    
    // If PIX key is provided, try to determine the type
    if (participantData.pixKey) {
      const pixKey = participantData.pixKey
      if (/^\d{11}$/.test(pixKey)) {
        // 11 digits = CPF
        identifierType = 'CPF'
        identifierValue = pixKey
      } else if (/^\d{10,11}$/.test(pixKey.replace(/\D/g, ''))) {
        // Phone number
        identifierType = 'PHONE'  
        identifierValue = pixKey
      } else if (pixKey.includes('@')) {
        // Email
        identifierType = 'EMAIL'
        identifierValue = pixKey
      } else {
        // Default to email with provided PIX key
        identifierType = 'EMAIL'
        identifierValue = pixKey.includes('@') ? pixKey : `${pixKey}@temp.placeholder`
      }
    }
    
    // Create participant using correct API format
    const response = await api.post(`/bills/${billId}/members`, {
      identifierType,
      identifierValue,
      displayName: participantData.displayName
    })

    const result = response.data
    // API returns: { success: true, data: { participant_id: "..." } }
    return result.data?.participant_id || result.participantId || result.participant?.id
  }

  const handleSubmit = async () => {
    const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    const selectedParticipants = splitParticipants.filter(p => p.isSelected)

    if (selectedParticipants.length === 0) {
      toast.error('Selecione pelo menos uma pessoa para dividir')
      return
    }



    setIsSubmitting(true)

    try {
      // First, handle temporary participants - create them as real participants
      const processedParticipants = []
      
      for (const participant of selectedParticipants) {
        if (participant.isTemporary && participant.participantId.startsWith('temp_')) {
          // Create temporary participant as real participant and add to bill
          console.log('Creating temporary participant:', participant.displayName)
          const realParticipantId = await createTemporaryParticipant(participant)
          console.log('Created participant with ID:', realParticipantId)
          
          if (!realParticipantId) {
            throw new Error(`Failed to create participant ${participant.displayName} - no ID returned`)
          }
          
          processedParticipants.push({
            ...participant,
            participantId: realParticipantId
          })
        } else {
          processedParticipants.push(participant)
        }
      }

      // Add a small delay to ensure database consistency
      if (processedParticipants.some(p => p.participantId !== selectedParticipants.find(sp => sp.displayName === p.displayName)?.participantId)) {
        console.log('Waiting for database consistency...')
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Update payer ID if it was temporary
      console.log('Initial payerId:', payerId)
      let finalPayerId = payerId || participants[0]?.participant_id
      if (finalPayerId && finalPayerId.startsWith('temp_')) {
        // First try to find payer in split participants
        const payerInSplits = splitParticipants.find(sp => sp.participantId === finalPayerId)
        if (payerInSplits) {
          const payerParticipant = processedParticipants.find(p => 
            p.displayName === payerInSplits.displayName
          )
          if (payerParticipant) {
            finalPayerId = payerParticipant.participantId
          }
        } else {
          // If payer is not in splits, find the payer from participants list
          const payerParticipant = participants.find(p => p.participant_id === finalPayerId)
          if (payerParticipant) {
            // If payer is an existing participant, use their ID
            finalPayerId = payerParticipant.participant_id
          } else {
            // This shouldn't happen with existing participants, but handle gracefully
            console.warn('Payer participant not found in participants list')
            finalPayerId = finalPayerId // Use as-is and let backend validate
          }
        }
      }

      // Build splits for API with real participant IDs
      const splits = processedParticipants.map(p => ({
        participantId: p.participantId
      }))

      console.log('Final payerId for API:', finalPayerId)
      console.log('Splits for API:', splits)

      // Create the expense
      const expenseData = Object.fromEntries(
        Object.entries({
          payerParticipantId: finalPayerId,
          amountCents,
          description: description.trim(),
          spentAt: new Date().toISOString(),
          splitType: 'equal', // Always use equal for simplicity
          splits
        }).filter(([key, value]) => value !== undefined && value !== null && value !== '')
      )

      const response = await api.post(`/bills/${billId}/expenses`, expenseData)

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
    setStep('details')
    setSplitMode('equal')
    setSplitParticipants(
      participants.map(p => ({
        participantId: p.participant_id,
        displayName: p.display_name,
        isSelected: true,
        customAmount: undefined,
        isTemporary: false
      }))
    )
    setShowAddPerson(false)
    setSearchQuery('')
    setSearchResults([])
    onClose()
  }

  const totalAmount = parseFloat(amount.replace(',', '.')) || 0
  const splitPreview = calculateSplitPreview()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-md w-full animate-float">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--pix-primary))]/20 flex items-center justify-center">
                <span className="text-[hsl(var(--pix-primary))] font-bold">
                  {step === 'details' ? '1' : '2'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                {step === 'details' ? 'Detalhes do Gasto' : 'Dividir com Quem?'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step 1: Details */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* What was bought? */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  O que foi comprado?
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 glass-card bg-white/5 text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))] text-base"
                  placeholder="Ex: Pizza, Uber, Ingresso..."
                  autoFocus
                />
              </div>

              {/* How much? */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Quanto foi?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--foreground-muted))] text-lg font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      // Allow only numbers and comma/dot
                      const value = e.target.value.replace(/[^0-9.,]/g, '')
                      setAmount(value)
                    }}
                    className="w-full pl-14 pr-4 py-3 glass-card bg-white/5 text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))] text-2xl font-bold"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Who paid? */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Quem pagou? <span className="text-[hsl(var(--foreground-muted))] font-normal">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayerId('')}
                    className={`px-4 py-3 glass-card transition-all text-sm font-medium ${
                      !payerId
                        ? 'bg-[hsl(var(--pix-primary))] text-white shadow-lg'
                        : 'bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10'
                    }`}
                  >
                    Sem pagador
                  </button>
                  {participants.map(participant => (
                    <button
                      key={participant.participant_id}
                      onClick={() => setPayerId(participant.participant_id)}
                      className={`px-4 py-3 glass-card transition-all text-sm font-medium ${
                        payerId === participant.participant_id
                          ? 'bg-[hsl(var(--pix-primary))] text-white shadow-lg'
                          : 'bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10'
                      }`}
                    >
                      {participant.display_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextStep}
                className="w-full py-3 glass-card bg-[hsl(var(--pix-primary))] text-white font-medium hover:glow transition-all text-base"
              >
                Próximo: Dividir com Quem?
              </button>
            </div>
          )}

          {/* Step 2: Split */}
          {step === 'split' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="glass-card bg-[hsl(var(--pix-primary))]/10 p-4 border border-[hsl(var(--pix-primary))]/20">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-[hsl(var(--foreground-muted))]">{description}</p>
                    <p className="text-2xl font-bold text-[hsl(var(--pix-primary))]">
                      R$ {totalAmount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('details')}
                    className="text-[hsl(var(--pix-primary))] hover:underline text-sm"
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* Split Options */}
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">
                  Dividir com quem?
                </p>
                
                {/* Participant Selection */}
                <div className="space-y-2">
                  {splitParticipants.map(participant => (
                    <div
                      key={participant.participantId}
                      className={`flex items-center justify-between p-3 glass-card transition-all cursor-pointer ${
                        participant.isSelected 
                          ? 'bg-[hsl(var(--pix-primary))]/10 border border-[hsl(var(--pix-primary))]/30' 
                          : 'bg-white/5 opacity-60'
                      }`}
                      onClick={() => handleParticipantToggle(participant.participantId)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          participant.isSelected
                            ? 'bg-[hsl(var(--pix-primary))] border-[hsl(var(--pix-primary))]'
                            : 'border-[hsl(var(--foreground-muted))]'
                        }`}>
                          {participant.isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[hsl(var(--foreground))] font-medium">
                              {participant.displayName}
                            </span>
                            {participant.participantId === payerId && (
                              <span className="text-xs glass-card px-2 py-1 bg-[hsl(var(--pix-primary))]/20 text-[hsl(var(--pix-primary))]">
                                Pagou
                              </span>
                            )}
                            {participant.isTemporary && (
                              <span className="text-xs glass-card px-2 py-1 bg-orange-500/20 text-orange-500">
                                Temporário
                              </span>
                            )}
                          </div>
                          {participant.pixKey && (
                            <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                              PIX: {participant.pixKey}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {participant.isSelected && splitMode === 'equal' && (
                            <span className="text-sm text-[hsl(var(--foreground-muted))]">
                              R$ {(totalAmount / splitParticipants.filter(p => p.isSelected).length).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                          {participant.isTemporary && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeParticipant(participant.participantId)
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Person Button */}
                <button 
                  onClick={() => setShowAddPerson(true)}
                  className="w-full mt-3 py-3 glass-card bg-white/5 text-[hsl(var(--foreground-muted))] hover:bg-white/10 transition-all text-sm border-2 border-dashed border-[hsl(var(--foreground-muted))]/30"
                >
                  + Adicionar Pessoa
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 glass-card bg-white/10 text-[hsl(var(--foreground-muted))] hover:bg-white/20 transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || splitParticipants.filter(p => p.isSelected).length === 0}
                  className="flex-1 py-3 glass-card bg-[hsl(var(--pix-primary))] text-white font-medium hover:glow transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Gasto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* PIX Key Search Modal */}
      {showAddPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="glass-card max-w-md w-full animate-float">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
                  Adicionar Pessoa
                </h3>
                <button
                  onClick={() => {
                    setShowAddPerson(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Buscar por Chave PIX ou Nome
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      searchPixKey(e.target.value)
                    }}
                    className="w-full px-4 py-3 glass-card bg-white/5 text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))] text-base"
                    placeholder="Digite CPF, email, telefone ou nome..."
                    autoFocus
                  />
                  {isSearching && (
                    <p className="text-xs text-[hsl(var(--foreground-muted))] mt-2 flex items-center">
                      <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </p>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Pessoas encontradas:
                    </p>
                    {searchResults.map((person, index) => (
                      <button
                        key={index}
                        onClick={() => addPersonFromSearch(person)}
                        className="w-full p-3 glass-card bg-white/5 hover:bg-[hsl(var(--pix-primary))]/10 text-left transition-all border border-transparent hover:border-[hsl(var(--pix-primary))]/30"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[hsl(var(--pix-primary))]/20 flex items-center justify-center">
                            <span className="text-[hsl(var(--pix-primary))] font-bold">
                              {person.displayName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[hsl(var(--foreground))]">
                              {person.displayName || person.name}
                            </p>
                            <p className="text-xs text-[hsl(var(--foreground-muted))]">
                              PIX: {person.pixKey}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results Found */}
                {searchQuery && !isSearching && searchResults.length === 0 && (
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <p className="text-sm text-[hsl(var(--foreground-muted))]">
                        Nenhuma pessoa encontrada com essa chave PIX
                      </p>
                    </div>
                    <div className="glass-card p-3 bg-orange-500/10 border border-orange-500/20">
                      <p className="text-sm text-orange-600 mb-2">
                        Quer adicionar &quot;{searchQuery}&quot; mesmo assim?
                      </p>
                      <button
                        onClick={() => addPersonManually(searchQuery)}
                        className="w-full py-2 glass-card bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 transition-all text-sm"
                      >
                        Adicionar como participante temporário
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Add Instructions */}
                {!searchQuery && (
                  <div className="glass-card p-4 bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">
                          Como funciona:
                        </p>
                        <ul className="text-xs text-blue-600 space-y-1">
                          <li>• Digite uma chave PIX (CPF, email, telefone)</li>
                          <li>• Se encontrarmos, você pode adicionar a pessoa</li>
                          <li>• Se não encontrarmos, você pode adicionar um nome temporário</li>
                          <li>• Pessoas temporárias podem ser editadas depois</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}