'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency, formatDateBrazilian, formatRelativeTimeBrazilian } from '@/utils/validation'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState } from 'react'

interface Bill {
  id: string
  name: string
  description?: string
  simplify_debts: boolean
  owner_id: string
  is_owner: boolean
  created_at: string
  last_activity: string
  participant_count: number
  total_expenses: number
  my_balance: number
  is_archived: boolean
  role: 'owner' | 'participant'
}

interface BillsResponse {
  success: true
  data: {
    bills: Bill[]
    summary: {
      total_bills: number
      owned_bills: number
      participating_bills: number
      total_balance: number
      archived_bills: number
    }
  }
}

interface CreateBillData {
  name: string
  description?: string
  // simplifyDebts is always enabled automatically
}

interface CreateBillModalProps {
  onClose: () => void
  onSubmit: (data: CreateBillData) => void
}

function CreateBillModal({ onClose, onSubmit }: CreateBillModalProps) {
  const [formData, setFormData] = useState<CreateBillData>({
    name: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição deve ter no máximo 500 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description || undefined,
      })
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleOverlayClick}>
      <div className="glass-card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200/20 dark:border-slate-700/20">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nova Conta</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="bill-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome da Conta <span className="text-red-500">*</span>
            </label>
            <input
              id="bill-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Viagem para Gramado"
              maxLength={100}
              className={`w-full glass-card px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pix-500/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 ${errors.name ? 'ring-2 ring-red-500/50' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formData.name.length}/100 caracteres
            </p>
          </div>

          <div>
            <label htmlFor="bill-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              id="bill-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes sobre a conta..."
              maxLength={500}
              rows={3}
              className={`w-full glass-card px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pix-500/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 resize-none ${errors.description ? 'ring-2 ring-red-500/50' : ''}`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {(formData.description || '').length}/500 caracteres
            </p>
          </div>

          {/* Note: Debt simplification is now always enabled automatically */}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass-card px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 glass-card px-4 py-2 bg-pix-600/20 hover:bg-pix-600 text-pix-700 dark:text-pix-300 hover:text-white transition-all duration-300 hover:glow"
            >
              Criar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BillsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState<'last_activity' | 'created_at' | 'name' | 'balance'>('last_activity')
  const [filterText, setFilterText] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const { data: billsData, isLoading, error } = useQuery<BillsResponse>({
    queryKey: ['bills', { include_archived: showArchived, sort: sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({
        include_archived: showArchived.toString(),
        sort: sortBy,
        order: 'desc'
      })
      const response = await api.get(`/bills?${params}`)
      return response.data
    },
  })

  const createBillMutation = useMutation({
    mutationFn: async (data: CreateBillData) => {
      const response = await api.post('/bills', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Conta criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Erro ao criar conta'
      toast.error(message)
    },
  })

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      router.push('/login')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  // Get bills and summary data
  const bills = billsData?.data?.bills || []
  const summary = billsData?.data?.summary || {
    total_bills: 0,
    owned_bills: 0,
    participating_bills: 0,
    total_balance: 0,
    archived_bills: 0
  }

  // Filter bills based on search text
  const filteredBills = bills.filter(bill => 
    bill.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (bill.description?.toLowerCase().includes(filterText.toLowerCase()) || false)
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pix-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Carregando suas contas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Erro ao carregar contas</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-pix-600 text-white rounded-md hover:bg-pix-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Theme Toggle */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faz-o-Pix 🇧🇷</h1>
            <p className="text-slate-600 dark:text-slate-400">Suas contas compartilhadas</p>
            <div className="flex items-center mt-1">
              <svg className="w-4 h-4 text-pix-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-pix-600 font-medium">Protegido pela LGPD</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="glass-card px-6 py-2 bg-pix-600/20 hover:bg-pix-600 text-pix-700 dark:text-pix-300 hover:text-white transition-all duration-300 hover:glow"
            >
              Nova Conta
            </button>
            <button
              onClick={handleLogout}
              className="glass-card px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total_bills}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total de Contas</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-pix-600">{summary.owned_bills}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Minhas Contas</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.participating_bills}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Participando</div>
          </div>
          <div className="glass-card p-4">
            <div className={`text-2xl font-bold ${summary.total_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.total_balance)}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Saldo Total</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar contas..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="glass-card pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-pix-500/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
              />
            </div>
            {/* Show Archived Toggle */}
            <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-300 text-pix-600 focus:ring-pix-500"
              />
              <span>Mostrar arquivadas</span>
            </label>
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="glass-card px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pix-500/50 text-slate-900 dark:text-white"
          >
            <option value="last_activity">Última Atividade</option>
            <option value="created_at">Data de Criação</option>
            <option value="name">Nome</option>
            <option value="balance">Saldo</option>
          </select>
        </div>

        {/* Bills Grid */}
        {filteredBills.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBills.map((bill) => (
              <Link
                key={bill.id}
                href={`/bills/${bill.id}`}
                className={`glass-card p-6 hover:glow transition-all duration-300 cursor-pointer group ${bill.is_archived ? 'opacity-60' : ''}`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-pix-600 dark:group-hover:text-pix-400 transition-colors leading-tight mb-3">
                    {bill.name}
                    {bill.is_archived && (
                      <span className="ml-2 text-xs text-slate-400">(Arquivada)</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {bill.simplify_debts && (
                      <span className="glass-card bg-pix-500/15 dark:bg-pix-400/20 text-pix-700 dark:text-pix-300 text-xs px-2.5 py-1 rounded-full border border-pix-500/30 dark:border-pix-400/30">
                        Simplificado
                      </span>
                    )}
                    {bill.is_owner && (
                      <span className="glass-card bg-blue-500/15 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-500/30 dark:border-blue-400/30">
                        Proprietário
                      </span>
                    )}
                  </div>
                </div>
                
                {bill.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    {bill.description}
                  </p>
                )}
                
                {/* Balance Display */}
                <div className="mb-4 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Meu saldo:</span>
                    <span className={`text-lg font-semibold ${bill.my_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(bill.my_balance)}
                    </span>
                  </div>
                  {bill.my_balance > 0 && (
                    <p className="text-xs text-green-600 mt-1">Você tem dinheiro a receber</p>
                  )}
                  {bill.my_balance < 0 && (
                    <p className="text-xs text-red-600 mt-1">Você deve dinheiro</p>
                  )}
                  {bill.my_balance === 0 && (
                    <p className="text-xs text-slate-500 mt-1">Conta quitada</p>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mb-3">
                  <span>{bill.participant_count} participantes</span>
                  <span>{formatCurrency(bill.total_expenses)} total</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                  <span>Criada em {formatDateBrazilian(bill.created_at)}</span>
                  <span>Atividade: {formatRelativeTimeBrazilian(bill.last_activity)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="glass-card mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {filterText ? 'Nenhuma conta encontrada' : 'Nenhuma conta ainda'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {filterText 
                ? `Não encontramos contas com "${filterText}"`
                : 'Comece criando sua primeira conta compartilhada'
              }
            </p>
            {!filterText && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="glass-card px-6 py-3 bg-pix-600/20 hover:bg-pix-600 text-pix-700 dark:text-pix-300 hover:text-white transition-all duration-300 hover:glow"
              >
                Criar primeira conta
              </button>
            )}
          </div>
        )}

        {/* Create Bill Modal */}
        {showCreateModal && <CreateBillModal onClose={() => setShowCreateModal(false)} onSubmit={createBillMutation.mutate} />}
      </div>
    </div>
  )
}