'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency } from '@/utils/validation'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Bill {
  id: string
  name: string
  description?: string
  simplifyDebts: boolean
  createdAt: string
  _count: {
    members: number
    expenses: number
  }
}

export default function BillsPage() {
  const router = useRouter()

  const { data: bills, isLoading, error } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: async () => {
      const response = await api.get('/bills')
      return response.data
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pix-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando suas contas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar contas</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-pix-600 text-white rounded-md hover:bg-pix-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faz-o-Pix 🇧🇷</h1>
            <p className="text-gray-600">Suas contas compartilhadas</p>
            <div className="flex items-center mt-1">
              <svg className="w-4 h-4 text-pix-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-pix-600 font-medium">Protegido pela LGPD</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sair
          </button>
        </div>

        {/* Bills Grid */}
        {bills && bills.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                href={`/bills/${bill.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 pr-2">
                    {bill.name}
                  </h3>
                  {bill.simplifyDebts && (
                    <span className="bg-pix-100 text-pix-800 text-xs px-2 py-1 rounded-full">
                      Simplificado
                    </span>
                  )}
                </div>
                
                {bill.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {bill.description}
                  </p>
                )}
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{bill._count.members} participantes</span>
                  <span>{bill._count.expenses} gastos</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Criada em {new Date(bill.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
            <p className="text-gray-600 mb-6">
              Comece criando sua primeira conta compartilhada
            </p>
            <button className="px-4 py-2 bg-pix-600 text-white rounded-md hover:bg-pix-700 transition-colors">
              Criar primeira conta
            </button>
          </div>
        )}

        {/* Floating Action Button */}
        {bills && bills.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <button className="w-14 h-14 bg-pix-600 text-white rounded-full shadow-lg hover:bg-pix-700 transition-colors flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}