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
import { ThemeToggle } from '@/components/ThemeToggle'

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
  identifierValue: z.string().min(1, 'Identificador e obrigatorio'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
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
    if (data.identifierType === 'PIX_CPF' && !validateCPF(data.identifierValue)) {
      toast.error('CPF invalido')
      return
    }

    if (data.identifierType === 'PIX_EMAIL' && !validateEmail(data.identifierValue)) {
      toast.error('Email invalido')
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/signup', {
        fullName: data.fullName,
        password: data.password,
        identifiers: [{
          type: data.identifierType,
          value: data.identifierType === 'PIX_EMAIL'
            ? data.identifierValue
            : data.identifierValue.replace(/\D/g, ''),
        }],
      })
      toast.success('Conta criada com sucesso!')
      router.push('/login')
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {showPrivacyNotice && <PrivacyNotice />}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pix-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-12 px-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Faz-o-Pix</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Crie sua conta gratuita</p>
          </div>

          <div className="glass-card p-8 shadow-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome completo</label>
                <input
                  {...register('fullName')}
                  type="text"
                  className="input-field"
                  placeholder="Joao Silva"
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de identificador PIX</label>
                <select
                  {...register('identifierType')}
                  className="input-field"
                >
                  {identifierTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {identifierType === 'PIX_CPF' ? 'CPF' : identifierType === 'PIX_EMAIL' ? 'Email' : 'Telefone'}
                </label>
                <input
                  {...register('identifierValue')}
                  type={identifierType === 'PIX_EMAIL' ? 'email' : 'text'}
                  onChange={handleIdentifierChange}
                  className="input-field"
                  placeholder={
                    identifierType === 'PIX_CPF' ? '000.000.000-00' :
                    identifierType === 'PIX_EMAIL' ? 'seu@email.com' :
                    '(11) 99999-9999'
                  }
                />
                {errors.identifierValue && <p className="mt-1 text-sm text-red-600">{errors.identifierValue.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="Minimo 8 caracteres"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar senha</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="Digite a senha novamente"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              <div className="p-3 rounded-xl bg-pix-50/60 dark:bg-pix-900/30 border border-pix-100 dark:border-pix-800/50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-pix-600 dark:text-pix-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-pix-800 dark:text-pix-200">
                    <strong>100% conforme LGPD.</strong> Seus dados sao criptografados e ficam no Brasil.{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyNotice(true)}
                      className="text-pix-600 hover:underline font-medium"
                    >
                      Ver politica de privacidade
                    </button>
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Criando conta...' : 'Criar conta gratis'}
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Ja tem conta?{' '}
                <Link href="/login" className="font-medium text-pix-600 hover:text-pix-700">
                  Faca login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
