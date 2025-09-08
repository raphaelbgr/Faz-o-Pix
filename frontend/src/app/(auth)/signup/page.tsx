'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatCPF, formatPhone, validateCPF, validateEmail } from '@/utils/validation'
import { PrivacyNotice } from '@/components/PrivacyNotice'

const identifierTypes = [
  { value: 'PIX_CPF', label: 'CPF' },
  { value: 'PIX_EMAIL', label: 'Email' },
  { value: 'PIX_PHONE', label: 'Telefone' },
] as const

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  identifierType: z.enum(['PIX_CPF', 'PIX_EMAIL', 'PIX_PHONE']),
  identifierValue: z.string().min(1, 'Identificador é obrigatório'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      identifierType: 'PIX_EMAIL',
    },
  })

  const identifierType = watch('identifierType')

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    if (identifierType === 'PIX_CPF') {
      value = formatCPF(value)
    } else if (identifierType === 'PIX_PHONE') {
      value = formatPhone(value)
    }
    
    setValue('identifierValue', value)
  }

  const onSubmit = async (data: SignupForm) => {
    // Additional validation
    if (data.identifierType === 'PIX_CPF' && !validateCPF(data.identifierValue)) {
      toast.error('CPF inválido')
      return
    }
    
    if (data.identifierType === 'PIX_EMAIL' && !validateEmail(data.identifierValue)) {
      toast.error('Email inválido')
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/signup', {
        fullName: data.fullName,
        password: data.password,
        identifiers: [{
          type: data.identifierType,
          value: data.identifierValue.replace(/\D/g, ''), // Clean for CPF/phone
        }],
      })
      toast.success('Conta criada com sucesso!')
      router.push('/bills')
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {showPrivacyNotice && <PrivacyNotice />}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Faz-o-Pix
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Crie sua conta gratuita
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder="João Silva"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="identifierType" className="block text-sm font-medium text-gray-700">
                Tipo de identificador PIX
              </label>
              <select
                {...register('identifierType')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pix-500 focus:border-pix-500 sm:text-sm"
              >
                {identifierTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="identifierValue" className="block text-sm font-medium text-gray-700">
                {identifierType === 'PIX_CPF' && 'CPF'}
                {identifierType === 'PIX_EMAIL' && 'Email'}
                {identifierType === 'PIX_PHONE' && 'Telefone'}
              </label>
              <input
                {...register('identifierValue')}
                type={identifierType === 'PIX_EMAIL' ? 'email' : 'text'}
                onChange={handleIdentifierChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder={
                  identifierType === 'PIX_CPF' ? '000.000.000-00' :
                  identifierType === 'PIX_EMAIL' ? 'seu@email.com' :
                  '(11) 99999-9999'
                }
              />
              {errors.identifierValue && (
                <p className="mt-1 text-sm text-red-600">{errors.identifierValue.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar senha
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder="Digite a senha novamente"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-pix-50 border border-pix-200 p-3 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-pix-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-xs text-pix-800">
                    <strong>100% conforme LGPD.</strong> Seus dados são criptografados e ficam no Brasil.
                    <br />
                    <button
                      type="button"
                      onClick={() => setShowPrivacyNotice(true)}
                      className="text-pix-600 hover:underline font-medium"
                    >
                      Ver política de privacidade →
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pix-600 hover:bg-pix-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pix-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-pix-600 hover:text-pix-500"
            >
              Já tem conta? Faça login
            </Link>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}