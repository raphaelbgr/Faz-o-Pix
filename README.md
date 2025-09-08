# Faz-o-Pix 🇧🇷

**Divisor de contas 100% brasileiro com suporte nativo ao PIX e total conformidade com a LGPD.**

## 🔒 **CONFORMIDADE LGPD - LEI 13.709/2018**

✅ **Dados no Brasil** - Todos os dados ficam em servidores brasileiros  
✅ **Criptografia total** - Identificadores PIX e senhas criptografados  
✅ **Base legal transparente** - Consentimento explícito do usuário  
✅ **Direitos garantidos** - Acesso, correção, portabilidade e eliminação  
✅ **Política clara** - Aviso de privacidade detalhado na interface  
✅ **Minimização de dados** - Coletamos apenas o essencial para o serviço  

## 🚀 Recursos

- ✅ **Autenticação brasileira** - CPF, CNPJ, email, telefone PIX
- ✅ **Criação de contas** - Adicione participantes facilmente
- ✅ **Divisão inteligente** - Igual, porcentagem, shares customizadas
- ✅ **Cálculo preciso** - Balanços automáticos até o centavo
- ✅ **Simplificação de dívidas** - Algoritmo otimizado para menos transações
- ✅ **Liquidações PIX** - Registro com referência de pagamento
- ✅ **Mobile-first** - Interface responsiva 100% em português
- ✅ **Validação rigorosa** - CPF/CNPJ com checksum, telefones E.164
- ✅ **Tempo real** - WebSocket para atualizações instantâneas
- ✅ **Histórico de alterações** - Log persistente de todas as mudanças
- ✅ **Notificações** - Avisos quando alguém edita a conta

## 🛠 Tecnologias

### Backend
- **Framework**: Fastify + TypeScript
- **Banco de dados**: PostgreSQL + Prisma ORM
- **Autenticação**: JWT + Argon2id
- **Validação**: Zod schemas
- **Documentação**: OpenAPI/Swagger

### Frontend
- **Framework**: Next.js 14 + React 18
- **Styling**: Tailwind CSS
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast

### Infraestrutura
- **Containerização**: Docker + Docker Compose com health checks
- **Database**: PostgreSQL 14+ com volumes persistentes
- **Cache**: Redis 7+ para sessões e performance
- **Desenvolvimento**: Hot reload completo com monitoramento
- **Produção**: Supabase PostgreSQL + Redis gerenciados
- **Monitoramento**: Health checks integrados com métricas

## 🚀 Como executar

### Configuração em 3 passos (Single-Command Setup)

```bash
# 1. Clone o repositório
git clone <repo-url>
cd Faz-o-Pix

# 2. Copie a configuração de ambiente
cp .env.example .env

# 3. Inicie toda a infraestrutura
docker-compose up --build
```

**Pronto! 🎉** A aplicação estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001  
- **API Docs**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/health

### Pré-requisitos

- **Docker**: Version 20.10+ com Docker Compose
- **Memória**: Mínimo 4GB RAM (recomendado 8GB)
- **Portas**: 3000, 3001, 5432, 6379 devem estar livres

### Configurações de Banco de Dados

O projeto suporta três modos de configuração de banco:

#### 🐳 **Modo Docker (Padrão)**
- PostgreSQL e Redis em containers
- Configuração automática com volumes persistentes
- Ideal para desenvolvimento local

#### 🌐 **Modo Externo**
- PostgreSQL externo (192.168.7.101)
- Para desenvolvimento com banco compartilhado
- Descomente `DATABASE_URL` no `.env`

#### ☁️ **Modo Produção (Supabase)**
- PostgreSQL gerenciado na nuvem
- Para staging/produção
- Configure credenciais do Supabase

### Verificação da Instalação

Após `docker-compose up`, verifique se todos os serviços estão saudáveis:

```bash
# Status dos containers
docker-compose ps

# Health check da aplicação  
curl http://localhost:3001/health

# Logs em tempo real
docker-compose logs -f
```

**Resposta esperada do health check:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "version": "1.0.0",
  "uptime": 12345
}
```

### Primeira Execução

O sistema configurará automaticamente:
- ✅ **Database**: PostgreSQL 14 com dados iniciais
- ✅ **Cache**: Redis 7 para sessões e performance
- ✅ **Migrations**: Schema aplicado automaticamente  
- ✅ **Seeds**: Dados de teste carregados
- ✅ **Health Checks**: Monitoramento ativo de todos os serviços

### Contas de teste

Use estas credenciais para testar:

- **João**: `joao@example.com` / `senha123`
- **Maria**: `maria@example.com` / `senha123`  
- **Pedro**: `pedro@example.com` / `senha123`

Você também pode fazer login com CPF ou telefone:
- João: `11111111111` ou `+5511999999999`
- Maria: `22222222222` ou `+5511888888888`

## 📊 Dados de exemplo

O seed cria os seguintes dados:

### Churrasco do Fim de Semana
- 4 participantes (João, Maria, Pedro, Ana)
- 3 gastos com diferentes tipos de divisão
- 1 liquidação via PIX
- Simplificação de dívidas habilitada

### Despesas do Apartamento  
- 2 participantes (Maria, João)
- 1 gasto com divisão customizada (60/40)

## 🔧 Desenvolvimento

### Executar sem Docker

1. **Backend**:
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

2. **Frontend**:
```bash
cd frontend  
npm install
npm run dev
```

3. **Banco PostgreSQL** (deve estar rodando em localhost:5432):
```bash
# Com PostgreSQL local
createdb fazopix
```

### Scripts úteis

```bash
# Gerenciamento de serviços
docker-compose ps                    # Status de todos os serviços
docker-compose logs -f              # Logs em tempo real
docker-compose logs postgres        # Logs específicos do PostgreSQL
docker-compose logs redis           # Logs específicos do Redis

# Health checks e monitoramento
curl http://localhost:3001/health           # Health check básico
curl http://localhost:3001/health/detailed  # Health check detalhado
curl http://localhost:3001/health/ready     # Readiness probe

# Banco de dados
docker-compose exec backend npx prisma studio    # Interface visual do banco
docker-compose exec backend npx prisma migrate reset  # Reset completo
docker-compose exec postgres psql -U postgres    # Acesso direto ao PostgreSQL

# Cache Redis
docker-compose exec redis redis-cli         # Redis CLI
docker-compose exec redis redis-cli ping    # Teste de conectividade

# Desenvolvimento
docker-compose restart backend      # Reiniciar apenas o backend
docker-compose restart frontend     # Reiniciar apenas o frontend
docker-compose down -v             # Parar e remover volumes
```

### Estrutura do projeto

```
Faz-o-Pix/
├── backend/                    # API Fastify + Prisma
│   ├── src/
│   │   ├── routes/            # Rotas da API (auth, bills, health)
│   │   ├── services/          # Lógica de negócio
│   │   ├── schemas/           # Validações Zod
│   │   ├── utils/             # Utilitários (validação PIX)
│   │   └── plugins/           # Plugins Fastify
│   ├── prisma/
│   │   ├── schema.prisma      # Schema do banco
│   │   └── seed.ts            # Dados iniciais
│   └── Dockerfile.dev         # Container de desenvolvimento
├── frontend/                   # App Next.js
│   ├── src/
│   │   ├── app/              # App Router (Next.js 14)
│   │   ├── components/       # Componentes React
│   │   ├── lib/              # Utilitários (API client)
│   │   └── utils/            # Validações e formatações
│   └── Dockerfile.dev        # Container de desenvolvimento
├── shared/                     # Tipos compartilhados (monorepo)
│   ├── types/
│   │   ├── common.ts         # Tipos comuns
│   │   ├── api.ts            # Tipos da API
│   │   └── index.ts          # Barrel exports
│   └── package.json          # Configuração do módulo
├── docker/                     # Configurações de container
│   └── postgres/
│       └── init.sql          # Script de inicialização
├── docs/                       # Documentação completa
│   ├── SETUP.md              # Guia de instalação
│   ├── TROUBLESHOOTING.md    # Resolução de problemas
│   └── story.md              # Stories de desenvolvimento
├── docker-compose.yml         # Orquestração completa
├── .env.example               # Configuração de ambiente
└── README.md                  # Este arquivo
```

## 🧪 Como testar

1. **Registro**: Crie uma conta com CPF válido
2. **Login**: Entre com qualquer identificador cadastrado
3. **Criar conta**: Nova conta compartilhada
4. **Adicionar participantes**: Use CPF/email/telefone
5. **Registrar gastos**: Com diferentes divisões
6. **Ver balanços**: Com simplificação opcional
7. **Liquidar dívidas**: Registrar pagamentos PIX

## ⚡ Funcionalidades principais

### Autenticação PIX-nativa
- Suporte a todos os tipos de chave PIX
- Validação de CPF/CNPJ com checksum
- Normalização de telefones para E.164
- Contas placeholder para não-cadastrados

### Divisão inteligente  
- **Igual**: Divide igualmente entre participantes
- **Porcentagem**: Divisão percentual customizada
- **Shares**: Divisão proporcional por cotas

### Cálculo de balanços
- Algoritmo preciso até o centavo
- Simplificação de dívidas opcional
- Sugestões de pagamento otimizadas
- Histórico completo de liquidações

## 🐛 Problemas conhecidos

- A simplificação de dívidas é um algoritmo greedy, não necessariamente ótimo
- Placeholder participants não recebem notificações
- Interface apenas em português brasileiro

## 📝 Próximos passos

- [ ] Notificações push/email
- [ ] Export para PDF/Excel  
- [ ] Gastos recorrentes
- [ ] App mobile nativo
- [ ] Integração PIX real (APIs bancárias)
- [ ] Análises e relatórios

## 📄 Licença

MIT License - veja [LICENSE](LICENSE)

---

**Faz-o-Pix** - Porque dividir conta não precisa ser complicado! 🚀