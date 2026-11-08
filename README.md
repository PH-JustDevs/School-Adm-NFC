# Riachuelo-NFC
Um Sistema de NFC para os Administradores do Centro Escola Riachuelo terem total autonomia sobre os dados dos alunos e funcionários.

MVP: cadastro feito somente pelo administrador no dashboard, importação de CSV/XLSX, QR Code por cadastro e exportação em CSV, XLSX e PDF.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL com Prisma (Supabase ou Neon, ambos com plano gratuito)
- Hospedagem sugerida: Vercel (plano gratuito), com upgrade simples depois
- Login de administrador único, senha em hash bcrypt, sessão em cookie JWT assinado (HttpOnly)

## Rodando localmente

Requisitos: Node.js 20.9+ (recomendado LTS 22 ou 24) e uma URL de PostgreSQL.

```bash
npm install
cp .env.example .env        # preencha as variáveis
PASSWORD='uma-senha-com-12+-caracteres' npm run hash-password   # copie o hash para ADMIN_PASSWORD_HASH
npm run db:push             # cria as tabelas
npm run dev                 # http://localhost:3000
```

Variáveis de ambiente (ver `.env.example`):

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Conexão do app (pode ser o pooler do provedor) |
| `DIRECT_URL` | Conexão direta, usada só pelo `db:push` (Supabase: porta 5432) |
| `ADMIN_EMAIL` | E-mail do administrador |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt da senha, entre aspas duplas com cada `$` escapado como `\$` (o `hash-password` já imprime nesse formato) |
| `SESSION_SECRET` | Segredo com 32+ caracteres (`openssl rand -base64 48`) |
| `APP_URL` | URL pública do app, gravada nos QR Codes |

## Desenvolvimento no Windows (drive F:)

No ambiente de desenvolvimento usado até aqui, `npm run build` falha no drive F: com `EISDIR ... readlink` (o drive não reporta `EINVAL` para arquivos comuns, como o Next espera). O `npm run dev` funciona normalmente. O build passou em uma cópia do projeto em outro drive (C:). Na Vercel (Linux), o problema não deve ocorrer, mas ainda não foi testado lá. Se o build local for necessário, mova o projeto para um drive NTFS padrão.

## Testes

```bash
npm test                    # lógica de importação, exportação, sessão
DATABASE_URL=... npm test   # também roda os testes de integração das ações contra o banco
```

## Formato de importação

CSV (separador `;` ou `,`, detectado automaticamente) ou XLSX, até 5 MB e 5000 linhas.

- Obrigatórias: **nome**, **tipo** (`Aluno` ou `Funcionário`)
- Opcionais: matrícula/registro, turma/setor, responsável, telefone, e-mail, observações, ativo (`Sim`/`Não`)
- Se a matrícula já existir, o cadastro é **atualizado** com os valores da planilha (campos vazios ficam vazios).
- Sem coluna “Ativo” na planilha, a situação (ativo/inativo) atual do cadastro não é alterada na reimportação.
- A importação é tudo-ou-nada: se uma gravação falhar, nenhuma linha é salva. Use "Apenas validar" antes de gravar.

## Exportação

Pela lista de cadastros (a lista em PDF sai em paisagem): XLSX, CSV (com `;` e BOM, abre direto no Excel em português e importa no Google Sheets) ou PDF. Cada ficha também tem download em PDF, e cada cadastro tem o QR Code em PNG.

## QR Code

O QR aponta para `APP_URL/e/<id>`. Ele não contém dados pessoais. Ao escanear, o administrador precisa estar logado e é levado ao cadastro.

## Segurança

- Todas as rotas de dados e exportação exigem sessão (middleware + verificação em cada ação).
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) e `robots: noindex`.
- Células de CSV que começam com `=`, `@`, tab, ou `+`/`-` seguido de letra são neutralizadas contra injeção de fórmula (telefones como `+5511…` não são alterados). Consequência: no Excel, um valor como `+5511…` pode ser convertido em número ao abrir o CSV; o XLSX não tem esse problema.
- Dados de menores: mantenha o acesso restrito, use senha forte e considere um backup periódico do banco.

## Limitações do MVP (próximos passos)

- Um único administrador (via variáveis de ambiente). Múltiplos usuários exigem tabela de usuários.
- Sem limite de tentativas no login. Antes de produção, adicionar rate limit.
- Sem registro de auditoria das alterações.
- Sem leitura de NFC: as etiquetas, quando chegarem, podem gravar a mesma URL `APP_URL/e/<id>` (NDEF). No iPhone, a leitura cai no app nativo de NFC do sistema, que abre o link.
