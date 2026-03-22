'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatCPF, formatCNPJ, formatPhone, validateCPF, validateCNPJ, validateEmail } from '@/utils/validation'
import { PrivacyNotice } from '@/components/PrivacyNotice'
import { ThemeToggle } from '@/components/ThemeToggle'

const identifierTypes = [
  { value: 'PIX_CPF', label: 'CPF', displayType: 'cpf' },
  { value: 'PIX_EMAIL', label: 'Email', displayType: 'email' },
  { value: 'PIX_PHONE', label: 'Telefone', displayType: 'phone' },
  { value: 'PIX_CNPJ', label: 'CNPJ', displayType: 'cnpj' },
  { value: 'PIX_EVP', label: 'Chave Aleatória', displayType: 'evp' },
] as const

const identifierSchema = z.object({
  type: z.enum(['PIX_CPF', 'PIX_EMAIL', 'PIX_PHONE', 'PIX_CNPJ', 'PIX_EVP']),
  value: z.string().min(1, 'Identificador é obrigatório'),
})

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  identifiers: z.array(identifierSchema).min(1, 'Pelo menos uma chave PIX é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      identifiers: [{ type: 'PIX_EMAIL', value: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'identifiers',
  })

  const watchedIdentifiers = watch('identifiers')

  const handleIdentifierChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    const identifierType = watchedIdentifiers[index]?.type
    
    if (identifierType === 'PIX_CPF') {
      // Limit CPF to 11 digits + formatting
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 11) {
        value = formatCPF(value)
      } else {
        return // Don't update if exceeds 11 digits
      }
    } else if (identifierType === 'PIX_CNPJ') {
      // Limit CNPJ to 14 digits + formatting
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 14) {
        value = formatCNPJ(value)
      } else {
        return // Don't update if exceeds 14 digits
      }
    } else if (identifierType === 'PIX_PHONE') {
      // Limit phone to 11 digits + formatting
      const numbers = value.replace(/\D/g, '')
      if (numbers.length <= 11) {
        value = formatPhone(value)
      } else {
        return // Don't update if exceeds 11 digits
      }
    }
    
    setValue(`identifiers.${index}.value`, value)
  }

  const handleIdentifierTypeChange = (index: number, newType: string) => {
    // Clear the value when type changes
    setValue(`identifiers.${index}.value`, '')
    setValue(`identifiers.${index}.type`, newType)
  }

  const onSubmit = async (data: SignupForm) => {
    // Additional validation for each identifier
    for (const identifier of data.identifiers) {
      if (identifier.type === 'PIX_CPF' && !validateCPF(identifier.value)) {
        toast.error('CPF inválido')
        return
      }
      
      if (identifier.type === 'PIX_CNPJ' && !validateCNPJ(identifier.value)) {
        toast.error('CNPJ inválido')
        return
      }
      
      if (identifier.type === 'PIX_EMAIL' && !validateEmail(identifier.value)) {
        toast.error('Email inválido')
        return
      }
    }

    setIsLoading(true)
    try {
      const cleanedIdentifiers = data.identifiers.map(identifier => ({
        type: identifier.type,
        value: identifier.type === 'PIX_CPF' || identifier.type === 'PIX_PHONE' || identifier.type === 'PIX_CNPJ' 
          ? identifier.value.replace(/\D/g, '') 
          : identifier.value,
      }))

      await api.post('/auth/signup', {
        fullName: data.fullName,
        password: data.password,
        identifiers: cleanedIdentifiers,
        lgpdConsent: {
          accepted: true,
          timestamp: new Date().toISOString(),
          ipAddress: '', // Will be filled by the backend
        }
      })
      toast.success('Conta criada com sucesso!')
      router.push('/bills')
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('Erro ao criar conta. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <ThemeToggle />
      {showPrivacyNotice && <PrivacyNotice onClose={() => setShowPrivacyNotice(false)} />}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background-secondary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground animate-float">
              Faz-o-Pix 🇧🇷
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--foreground-muted))]">
              Crie sua conta gratuita com chaves PIX
            </p>
          </div>
          <div className="glass-card p-8 rounded-2xl">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Nome completo
                  </label>
                  <input
                    {...register('fullName')}
                    type="text"
                    className="input-glass w-full px-4 py-3 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                    placeholder="João Silva"
                  />
                  {errors.fullName && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">{errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                      Chaves PIX (pelo menos 1 é obrigatória)
                    </label>
                    <button
                      type="button"
                      onClick={() => append({ type: 'PIX_EMAIL', value: '' })}
                      className="flex items-center gap-1 text-sm text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] font-medium transition-colors duration-200 whitespace-nowrap"
                    >
                      <Plus size={16} />
                      Adicionar chave PIX
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="glass-card p-4 rounded-xl transition-all duration-300">
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <select
                              {...register(`identifiers.${index}.type`)}
                              onChange={(e) => handleIdentifierTypeChange(index, e.target.value)}
                              className="input-glass w-full px-3 py-2 rounded-lg text-[hsl(var(--foreground))] focus:outline-none"
                            >
                              {identifierTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-[2]">
                            <input
                              {...register(`identifiers.${index}.value`)}
                              type={watchedIdentifiers[index]?.type === 'PIX_EMAIL' ? 'email' : 'text'}
                              onChange={(e) => handleIdentifierChange(index, e)}
                              className="input-glass w-full px-3 py-2 rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                              placeholder={
                                watchedIdentifiers[index]?.type === 'PIX_CPF' ? '000.000.000-00' :
                                watchedIdentifiers[index]?.type === 'PIX_CNPJ' ? '00.000.000/0001-00' :
                                watchedIdentifiers[index]?.type === 'PIX_EMAIL' ? 'seu@email.com' :
                                watchedIdentifiers[index]?.type === 'PIX_PHONE' ? '(11) 99999-9999' :
                                watchedIdentifiers[index]?.type === 'PIX_EVP' ? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' :
                                'Valor da chave PIX'
                              }
                            />
                            {errors.identifiers?.[index]?.value && (
                              <p className="mt-1 text-sm text-red-500 animate-pulse">
                                {errors.identifiers[index]?.value?.message}
                              </p>
                            )}
                          </div>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {errors.identifiers && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">
                      Pelo menos uma chave PIX é obrigatória
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-glass w-full px-4 py-3 pr-12 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-glass w-full px-4 py-3 pr-12 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                      placeholder="Digite a senha novamente"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors duration-200"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4 rounded-xl bg-[hsl(var(--pix-primary)_/_0.05)] border-[hsl(var(--pix-primary)_/_0.2)]">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-[hsl(var(--pix-primary))]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--foreground-secondary))]">
                        <strong className="text-[hsl(var(--pix-primary))]">100% conforme LGPD.</strong> Seus dados são criptografados e ficam no Brasil.
                        <br />
                        <button
                          type="button"
                          onClick={() => setShowPrivacyNotice(true)}
                          className="text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] hover:underline font-medium transition-colors duration-200 mt-1 inline-block"
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
                  className="w-full bg-gradient-to-r from-[hsl(var(--pix-primary))] to-[hsl(var(--pix-hover))] 
                           text-white font-medium py-4 px-6 rounded-xl
                           hover:from-[hsl(var(--pix-hover))] hover:to-[hsl(var(--pix-primary))]
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))] focus:ring-offset-2"
                >
                  {isLoading ? 'Criando conta...' : 'Criar conta grátis 🚀'}
                </button>
              </div>

              <div className="text-center pt-4">
                <Link
                  href="/login"
                  className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--pix-primary))] transition-colors duration-200 font-medium"
                >
                  Já tem conta? Faça login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}