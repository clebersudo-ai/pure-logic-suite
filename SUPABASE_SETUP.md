# Configuração Supabase - Pure Logic Suite

## ✅ Chaves Configuradas no Repositório

Foram adicionadas as seguintes variáveis:

### 🔑 Chaves de Produção (GitHub Secrets)

| Secret | Status |
|--------|--------|
| `SUPABASE_URL` | ✅ Configurada |
| `SUPABASE_ANON_KEY` | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Configurada |

### 📍 Onde Estão os Secrets

**GitHub → Settings → Secrets and variables → Actions**

## 🏗️ Estrutura de Migrações

```
supabase/
├── migrations/
│   ├── 20260621000001_create_initial_schema.sql
│   ├── 20260621000002_add_laboratory_table.sql
│   └── ...
└── config.toml
```

## 🚀 Como Usar

### Local (Desenvolvimento)

```bash
# Instalar dependências
npm install

# Você já tem o .env.local configurado com as chaves
# Apenas execute seu projeto normalmente
npm run dev
```

### Criando Migrações

1. Crie um arquivo em `supabase/migrations/` com padrão:
   - Nome: `YYYYMMDDHHMMSS_descricao.sql`
   - Exemplo: `20260621120000_create_laboratories_table.sql`

2. Escreva o SQL:

```sql
-- Create laboratories table
CREATE TABLE IF NOT EXISTS laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read" ON laboratories
  FOR SELECT USING (true);
```

3. Faça push para `main` e o GitHub Actions vai executar automaticamente ✅

## 🔒 Segurança

⚠️ **IMPORTANTE:**

- ✅ `SUPABASE_ANON_KEY` - Seguro para frontend (público)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - **NUNCA** compartilhe ou exponha em código
- ⚠️ Nunca commite `.env.local` com chaves reais (adicione ao `.gitignore`)

### .gitignore

```
.env.local
.env.production.local
.env.*.local
.venv
```

## ✨ Agora Está Tudo Pronto Para:

✅ ChatGPT/Copilot criar e alterar tabelas automaticamente  
✅ Migrações serem executadas automaticamente no push  
✅ Sem mais erros de credenciais incorretas  
✅ Tudo sincronizado com Supabase  

## 🆘 Troubleshooting

### Erro: "DATABASE_URL inválido"
- Verifique se `SUPABASE_URL` está correto em `Settings → Secrets`
- URL correta: `https://kydwpwckgkxpdesoppcs.supabase.co`

### Erro: "Migração não aplicada"
- Verifique se o arquivo está em `supabase/migrations/`
- Nomes devem seguir padrão ISO: `YYYYMMDDHHMMSS_nome.sql`

### Erro: "Chave de serviço inválida"
- Reconfigure `SUPABASE_SERVICE_ROLE_KEY` em Settings → Secrets
- Copie do Supabase Dashboard → Settings → API → Service Role

## 📚 Referências

- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [Migrations Guide](https://supabase.com/docs/reference/cli/supabase-migration-list)
- [Getting Started](https://supabase.com/docs/guides/getting-started)

---

**Configuração realizada em:** 21/06/2026  
**Projeto:** pure-logic-suite  
**Status:** ✅ Pronto para usar
