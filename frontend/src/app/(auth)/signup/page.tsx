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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-800 px-3 text-gray-500 dark:text-gray-400">ou cadastre-se com</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60 relative"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-medium">Google</span>
                  <span className="absolute right-3 text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Em breve</span>
                </button>

                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60 relative"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span className="text-sm font-medium">Apple</span>
                  <span className="absolute right-3 text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Em breve</span>
                </button>
              </div>

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
