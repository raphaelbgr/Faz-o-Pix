'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pix-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Política de Privacidade</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Faz-o-Pix - Conforme LGPD (Lei 13.709/2018)
              </p>
            </div>

            <div className="space-y-8 text-sm text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Compromisso com a Proteção de Dados</h2>
                <p>
                  O Faz-o-Pix está em <strong>total conformidade com a LGPD</strong> (Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018).
                  Seus dados pessoais são tratados com máximo cuidado e segurança.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Dados Coletados</h2>
                <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="font-medium mb-2">Coletamos apenas dados essenciais:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Dados de identificação:</strong> Nome completo</li>
                    <li><strong>Identificadores PIX:</strong> CPF, CNPJ, email, telefone ou chave aleatória</li>
                    <li><strong>Dados de autenticação:</strong> Senha (criptografada com Argon2id)</li>
                    <li><strong>Dados de uso:</strong> Informações sobre gastos e divisões de contas</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Finalidades do Tratamento</h2>
                <div className="bg-pix-50 dark:bg-pix-900/20 p-4 rounded-xl border border-pix-200 dark:border-pix-800/30">
                  <p className="font-medium mb-2">Seus dados são usados exclusivamente para:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Autenticação e acesso à plataforma</li>
                    <li>Criação e gestão de contas compartilhadas</li>
                    <li>Cálculo de divisões de gastos e balanços</li>
                    <li>Registro de liquidações entre participantes</li>
                    <li>Comunicação entre participantes da mesma conta</li>
                  </ul>
                  <p className="mt-2 text-pix-800 dark:text-pix-300">
                    <strong>Nunca</strong> vendemos, alugamos ou compartilhamos seus dados com terceiros.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">4. Base Legal</h2>
                <p>
                  O tratamento dos seus dados pessoais está fundamentado no <strong>consentimento</strong> (Art. 7º, I da LGPD),
                  fornecido de forma livre, informada e inequívoca no momento do cadastro.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5. Segurança dos Dados</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <h3 className="font-medium text-green-900 dark:text-green-300 mb-2">Criptografia</h3>
                    <ul className="text-sm space-y-1">
                      <li>Senhas: Argon2id</li>
                      <li>Dados em trânsito: HTTPS/TLS</li>
                      <li>Dados em repouso: AES-256</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Infraestrutura</h3>
                    <ul className="text-sm space-y-1">
                      <li>Servidores no Brasil</li>
                      <li>Backup automatizado</li>
                      <li>Monitoramento 24/7</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">6. Seus Direitos (Arts. 17 a 22 da LGPD)</h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                  <p className="font-medium mb-2 text-yellow-900 dark:text-yellow-200">Você tem direito a:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Confirmação</strong> da existência de tratamento</li>
                    <li><strong>Acesso</strong> aos dados pessoais</li>
                    <li><strong>Correção</strong> de dados incompletos ou inexatos</li>
                    <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados</li>
                    <li><strong>Portabilidade</strong> dos dados</li>
                    <li><strong>Eliminação</strong> dos dados tratados com consentimento</li>
                    <li><strong>Informação</strong> sobre compartilhamento</li>
                    <li><strong>Revogação</strong> do consentimento</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">7. Retenção de Dados</h2>
                <p>
                  Seus dados são mantidos pelo tempo necessário para as finalidades descritas ou conforme exigido por lei.
                  Você pode solicitar a eliminação a qualquer momento através do email: <strong>privacidade@fazopix.com.br</strong>
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">8. Localização dos Dados</h2>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                  <p className="font-medium text-green-900 dark:text-green-300">
                    Todos os seus dados ficam no Brasil, em conformidade com a LGPD.
                  </p>
                  <p className="text-green-800 dark:text-green-400 mt-1">
                    Não transferimos dados pessoais para outros países.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">9. Contato - Encarregado de Dados (DPO)</h2>
                <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p>
                    Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li><strong>Email:</strong> privacidade@fazopix.com.br</li>
                    <li><strong>Prazo de resposta:</strong> até 15 dias corridos</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">10. Autoridade Nacional</h2>
                <p>
                  Você também pode registrar reclamações junto à <strong>ANPD</strong> (Autoridade Nacional de Proteção de Dados)
                  através do site <span className="text-pix-600 dark:text-pix-400">www.gov.br/anpd</span>.
                </p>
              </section>

              <section className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  <strong>Última atualização:</strong> Janeiro de 2025<br />
                  Esta política pode ser atualizada periodicamente. Alterações serão comunicadas por email.
                </p>
              </section>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="btn-primary inline-flex items-center text-sm"
              >
                Voltar ao Faz-o-Pix
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
