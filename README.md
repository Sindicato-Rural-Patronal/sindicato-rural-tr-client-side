# Sindicato Rural de Terra Roxa — Frontend

Site institucional do **Sindicato Rural de Terra Roxa** (Paraná, Brasil). Plataforma pública com listagem e inscrição em cursos agrícolas, notícias e informações institucionais, mais área administrativa interna completa.

---

## Stack

| Ferramenta | Versão | Uso |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5 | Tipagem |
| Vite | 6 | Build/dev server |
| TanStack Router | 1.x | Roteamento file-based |
| TanStack Query | 5.x | Data fetching e cache |
| Tailwind CSS | 4.x | Estilos |
| shadcn/ui | — | Componentes base (Radix Nova) |
| React Hook Form | 7.x | Formulários |
| Zod | 4.x | Validação de schemas |
| Lucide React | — | Ícones |
| Embla Carousel | 8.x | Carrossel de cursos |
| @uiw/react-md-editor | 4.x | Editor markdown (descrições) |
| React Markdown | 10.x | Renderização markdown |

---

## Pré-requisitos

- Node.js 20+
- Backend rodando em `http://localhost:3000` (ver repositório do backend)

---

## Instalação e execução

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
# → http://localhost:5173

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

---

## Estrutura do Projeto

```
src/
├── @types/
│   └── course.ts                    # Tipo Curso (entidade principal)
├── components/
│   ├── ui/                          # Componentes shadcn/ui (button, card, dialog, form, table, etc.)
│   ├── PublicHeader.tsx             # Nav pública responsiva (sticky)
│   ├── public-footer.tsx            # Footer
│   ├── adminSideBar.tsx             # Sidebar do painel admin
│   ├── nav-user.tsx                 # Dropdown do usuário (logout)
│   ├── nav-main.tsx                 # Itens de nav da sidebar
│   ├── home-hero-section.tsx        # Banner hero da homepage
│   ├── home-static-section.tsx      # Seção de stats
│   ├── home-courses-section.tsx     # Carrossel de cursos
│   ├── course-card.tsx              # CourseCard e CourseCardSimple
│   ├── StatusBadge.tsx              # Badge de status do curso
│   ├── ErrorAlert.tsx               # Alerta de erro
│   └── EmptyState.tsx               # Placeholder de estado vazio
├── context/
│   └── AuthContext.tsx              # Token JWT em localStorage, login/logout, baseUrl
├── hooks/
│   ├── useCourse.ts                 # CRUD de cursos, upload de banner/galeria, inscrição
│   ├── useAdmin.ts                  # Stats, usuários, admins, regras, inscrições (admin)
│   ├── useRooms.ts                  # Listagem e criação de salas
│   ├── use-users.ts                 # Autenticação (login)
│   └── use-mobile.ts                # Hook de breakpoint mobile
├── lib/
│   ├── api.ts                       # apiFetch e apiUpload (autenticados, tratamento de erro)
│   ├── query-client.ts              # Instância do QueryClient
│   ├── schemas.ts                   # Schemas Zod (pessoaSchema, roomSchema, courseBaseSchema, etc.)
│   └── utils.ts                     # cn() helper
├── routes/                          # Rotas file-based (TanStack Router)
│   ├── __root.tsx                   # Layout raiz
│   ├── login.tsx                    # Tela de login
│   ├── _public.tsx                  # Layout público (header + footer)
│   ├── _public/
│   │   ├── index.tsx                # Homepage
│   │   ├── cursos/
│   │   │   ├── index.tsx            # Listagem de cursos
│   │   │   └── $id.tsx              # Detalhe do curso + inscrição
│   │   ├── noticias.tsx             # Listagem de notícias
│   │   ├── noticias/$id.tsx         # Detalhe da notícia
│   │   ├── sobre.tsx                # Página sobre
│   │   └── contato.tsx              # Página de contato
│   ├── _admin.tsx                   # Layout admin (token-gated + sidebar)
│   └── _admin/admin/
│       ├── index.tsx                # Redireciona → /admin/cursos
│       ├── dashboard.tsx            # Dashboard (stub)
│       ├── cursos/
│       │   ├── index.tsx            # Gerenciamento de cursos (CRUD + galeria + inscrições)
│       │   └── $id.tsx              # Upload de banner do curso
│       ├── usuarios/index.tsx       # Gerenciamento de usuários
│       ├── salas/index.tsx          # Gerenciamento de salas
│       ├── administradores/index.tsx # Gerenciamento de admins
│       └── regras/index.tsx         # Gerenciamento de regras/permissões
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD → DD/MM/YYYY)
│   └── masks.ts                     # maskCPF, maskPhone
├── main.tsx                         # Entry point
├── index.css                        # Estilos base Tailwind
└── routeTree.gen.ts                 # GERADO AUTOMATICAMENTE — não editar
```

---

## Rotas

### Públicas (`/_public` layout — header + footer)

| Rota | Arquivo | Descrição |
|---|---|---|
| `/` | `_public/index.tsx` | Homepage (hero, stats, cursos, notícias) |
| `/cursos` | `_public/cursos/index.tsx` | Listagem com busca e filtro |
| `/cursos/:id` | `_public/cursos/$id.tsx` | Detalhe do curso + formulário de inscrição |
| `/noticias` | `_public/noticias.tsx` | Listagem de notícias |
| `/noticias/:id` | `_public/noticias/$id.tsx` | Detalhe da notícia |
| `/sobre` | `_public/sobre.tsx` | Sobre o sindicato |
| `/contato` | `_public/contato.tsx` | Contato |
| `/login` | `login.tsx` | Tela de login |

### Admin (`/_admin` layout — sidebar, token-gated)

| Rota | Arquivo | Descrição |
|---|---|---|
| `/admin` | `_admin/admin/index.tsx` | Redireciona para `/admin/cursos` |
| `/admin/cursos` | `_admin/admin/cursos/index.tsx` | Gerenciamento completo de cursos |
| `/admin/cursos/:id` | `_admin/admin/cursos/$id.tsx` | Upload de banner |
| `/admin/usuarios` | `_admin/admin/usuarios/index.tsx` | Usuários |
| `/admin/salas` | `_admin/admin/salas/index.tsx` | Salas |
| `/admin/administradores` | `_admin/admin/administradores/index.tsx` | Contas admin |
| `/admin/regras` | `_admin/admin/regras/index.tsx` | Regras/permissões |
| `/admin/dashboard` | `_admin/admin/dashboard.tsx` | Dashboard (stub) |

---

## API

O Vite proxy mapeia `/api/*` → `http://localhost:3000/*` (remove o prefixo `/api`), eliminando problemas de CORS em desenvolvimento.

Todas as chamadas autenticadas passam pelo `apiFetch()` em [src/lib/api.ts](src/lib/api.ts), que injeta `Authorization: Bearer {token}` automaticamente.

### Endpoints

**Auth**
- `POST /api/auth/login` — Login com username/password, retorna JWT

**Cursos (público)**
- `GET /api/courses` — Lista cursos públicos
- `GET /api/courses/:id` — Detalhe do curso
- `POST /api/courses/:id/register` — Inscrição (nome, email, telefone, cpf)

**Cursos (admin)**
- `GET /api/admin/courses` — Lista cursos (admin)
- `POST /api/courses` — Criar curso
- `PATCH /api/courses/:id` — Atualizar curso
- `DELETE /api/courses/:id` — Deletar curso
- `POST /api/courses/:id/banner` — Upload banner
- `POST /api/courses/:id/gallery` — Upload foto galeria
- `DELETE /api/courses/:id/gallery/:photoId` — Remover foto

**Admin**
- `GET /api/admin/dashboard/stats` — Stats do dashboard
- `GET /api/admin/users` — Lista usuários
- `GET /api/admin/users/admins` — Lista admins
- `POST /api/admin/users` — Criar admin/funcionário
- `GET /api/admin/courses/:id/registrations` — Inscrições do curso
- `DELETE /api/admin/registrations/:id` — Cancelar inscrição
- `GET /api/admin/rules` — Lista regras
- `POST /api/rules` — Criar regra

**Salas**
- `GET /api/rooms` — Lista salas
- `POST /api/rooms` — Criar sala

---

## Autenticação

1. Login via `POST /api/auth/login` → JWT retornado
2. Token armazenado em `localStorage`
3. `AuthContext` expõe `token`, `login(token)`, `logout()`, `baseUrl`
4. Layout `_admin.tsx` valida o token (parse JWT + expiração) a cada navegação — redireciona para `/login` se inválido
5. `apiFetch()` inclui o token em todo request; se resposta 401 → limpa token + redireciona
6. Logout limpa `localStorage` e navega para `/`

---

## Entidade Principal: `Curso`

Definida em [src/@types/course.ts](src/@types/course.ts):

```typescript
interface Curso {
  id: string
  titulo: string
  modulo: string
  numeroEvento: string
  dataInicio: string         // ISO date
  dataTermino: string
  horarioInicio: string
  horarioFim: string
  inscricoesAte: string
  local: string
  instrutorId: string
  instrutorNome: string
  cargaHoraria: number
  descricaoBreve: string
  descricaoCompleta: string  // Markdown
  status: "PUBLICO" | "PRIVADO" | "NAO_PUBLICADO"
  valor: number
  minimoAlunos: number
  maximoAlunos: number
  observacoes: string
  imagemCapa: string         // URL
  galeriaFotos: string[]     // URLs
  inscritos: number
  preInscritos: number
  listaEspera: number
}
```

---

## Convenções

- Alias `@/` → `src/`
- Componentes shadcn em `src/components/ui/`
- Rotas públicas sob `_public/`, admin sob `_admin/`
- `routeTree.gen.ts` é regenerado automaticamente ao salvar arquivos de rota — **nunca editar manualmente**
- Todas as chamadas API usam prefixo `/api/`
- Datas vindas da API estão em formato ISO — usar `formatDateFromString()` para exibição
- Masks de CPF e telefone em `src/utils/masks.ts`
