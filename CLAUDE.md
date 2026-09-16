# CLAUDE.md — Sindicato Rural de Terra Roxa

## Projeto

Site institucional do **Sindicato Rural de Terra Roxa** (Paraná, Brasil). Plataforma pública com cursos agrícolas, notícias e informações institucionais, mais área admin interna completa.

## Stack

| Ferramenta | Versão | Uso |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5 | Tipagem |
| Vite | 6 | Build/dev server |
| TanStack Router | 1.x | Roteamento file-based |
| TanStack Query | 5.x | Data fetching e cache |
| Tailwind CSS | 4.x | Estilos |
| shadcn/ui (Radix Nova) | — | Componentes base |
| React Hook Form | 7.x | Formulários |
| Zod | 4.x | Validação de schemas |
| Lucide React | — | Ícones |
| Embla Carousel | 8.x | Carrossel |
| @uiw/react-md-editor | 4.x | Editor markdown (descrições de cursos) |
| React Markdown | 10.x | Renderização markdown |
| react-i18next | 15.x | Internacionalização (pt-BR / en) |
| i18next-browser-languagedetector | 8.x | Detecção de idioma via localStorage |

## Estrutura de Rotas

```
/                           → _public/index.tsx (HomePage)
/cursos                     → _public/cursos/index.tsx
/cursos/$id                 → _public/cursos/$id.tsx (detalhe + inscrição)
/noticias                   → _public/noticias/index.tsx
/noticias/$id               → _public/noticias/$id.tsx
/sobre                      → _public/sobre.tsx
/contato                    → _public/contato.tsx
/convenios                  → _public/convenios/index.tsx (cartões dos convênios ativos)
/convenios/$slug            → _public/convenios/$slug.tsx (tabela de valores, documentos, sobre)
/login                      → login.tsx
/admin                      → _admin/admin/index.tsx (redirect → /admin/cursos)
/admin/cursos               → _admin/admin/cursos/index.tsx (CRUD completo)
/admin/cursos/novo          → _admin/admin/cursos/novo.tsx (form criação)
/admin/noticias             → _admin/admin/noticias/index.tsx
/admin/usuarios             → _admin/admin/usuarios/index.tsx
/admin/usuarios/$id         → _admin/admin/usuarios/$id.tsx (detalhe completo)
/admin/banners              → _admin/admin/banners.tsx
/admin/mensagens            → _admin/admin/mensagens.tsx
/admin/salas                → _admin/admin/salas/index.tsx
/admin/administradores      → _admin/admin/administradores/index.tsx
/admin/cotacoes             → _admin/admin/cotacoes/index.tsx (cotações da home)
/admin/convenios            → _admin/admin/convenios/index.tsx (lista de convênios)
/admin/convenios/novo       → _admin/admin/convenios/novo.tsx (editor, criação)
/admin/convenios/$id        → _admin/admin/convenios/$id.tsx (editor com pré-visualização)
/admin/auditoria            → _admin/admin/auditoria/index.tsx (trilha de auditoria)
/admin/financeiro           → _admin/admin/financeiro/index.tsx (Financeiro: dashboard, lançamentos, categorias, caixas)
/admin/dashboard            → _admin/admin/dashboard.tsx (painel: stats + calendário de cursos + cadastros incompletos)
/convite/:token             → convite/$token.tsx (público: ativar acesso de admin por convite)
```

Layouts pai:
- `_public.tsx` — Header + Footer público
- `_admin.tsx` — Sidebar admin (AdminSideBar), token-gated (valida JWT + expiração)

`routeTree.gen.ts` é **gerado automaticamente** pelo TanStack Router — não editar manualmente.

## Estrutura de Arquivos

```
src/
├── @types/
│   └── course.ts                    # Tipos Course, ApiCourse, CourseInstructor + mapCourse()
├── components/
│   ├── ui/                          # shadcn/ui + pagination.tsx (PaginatedResponse)
│   ├── PublicHeader.tsx             # Nav pública responsiva (sticky, mobile menu) — usa logo-full.png
│   ├── public-footer.tsx            # Footer
│   ├── adminSideBar.tsx             # Sidebar admin — usa logo-icon.png; link perfil via userDataId
│   ├── nav-user.tsx                 # Dropdown do usuário (logout)
│   ├── home-hero-section.tsx        # Banner hero
│   ├── home-static-section.tsx      # Stats (StatsSection)
│   ├── home-courses-section.tsx     # Carrossel de cursos (CoursesSection)
│   ├── home-news-section.tsx        # Seção de notícias na home
│   ├── course-card.tsx              # CourseCard + CourseCardSimple (carousel-aware)
│   ├── StatusBadge.tsx              # Badge PUBLICO | PRIVADO | NAO_PUBLICADO
│   ├── LanguageToggle.tsx           # Toggle 🇧🇷 PT / 🇺🇸 EN (i18n)
│   ├── ImageCropDialog.tsx          # Dialog de crop de imagem (avatar/upload)
│   ├── PermissionButton.tsx         # Botão condicional baseado em permissão
│   ├── confirm-close-dialog.tsx     # Dialog de confirmação de descarte
│   ├── ErrorAlert.tsx               # Alerta de erro
│   └── EmptyState.tsx               # Placeholder estado vazio
├── context/
│   └── AuthContext.tsx              # Token em localStorage; expõe token, baseUrl='/api', login(), logout()
├── hooks/
│   ├── useCourse.ts                 # useAdminCourses, useCourses, useCourse, useCreateCourse,
│   │                                #   useUpdateCourse, useDeleteCourse, useUploadBanner,
│   │                                #   useUploadGalleryPhoto, useRegisterCourse, useDeleteGalleryPhoto
│   ├── useAdmin.ts                  # Ver seção "Hooks — useAdmin.ts" abaixo
│   ├── useNews.ts                   # Hooks de notícias (admin + público)
│   ├── useBanner.ts                 # Hooks de banners
│   ├── useRooms.ts                  # useRooms, useCreateRoom
│   ├── usePermissions.ts            # Hook de permissões do usuário logado
│   ├── use-users.ts                 # authenticateUser(username, password) → POST /api/auth/login
│   └── use-mobile.ts               # useIsMobile (breakpoint hook)
├── lib/
│   ├── api.ts                       # ApiError class (com status: number); apiFetch() e apiUpload()
│   │                                #   injetam Bearer token; 401 → limpa token + redireciona /login
│   ├── query-client.ts              # QueryClient: staleTime 60s, gcTime 5min, retry false, refetchOnWindowFocus false
│   ├── auth-guard.ts                # Guard de rota admin
│   ├── schemas.ts                   # Schemas Zod: pessoaSchema, roomSchema, adminSchema, courseBaseSchema
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
├── routes/                          # File-based routing
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD → DD/MM/YYYY)
│   └── masks.ts                     # maskCPF, maskPhone
└── main.tsx                         # Entry: QueryClientProvider → AuthProvider → RouterProvider
```

## Hooks — useAdmin.ts

Exporta todos os tipos de dados admin e hooks de data fetching/mutation:

**Tipos principais:**
```typescript
PaginatedResponse<T>    // { data: T[], total, page, totalPages, limit }
AdminMe                 // { adminId, userDataId, username, role }
UserData                // shape completo do usuário
UserAddress             // endereço do usuário
UserProperty            // propriedade rural vinculada
UserRelation            // relacionamento (dependente/cônjuge)
UserInstructor          // { id, bio, linkedin, instagram, facebook }
UserDataDetail          // UserData & { address, userInstructor }
InstructorItem          // { id, bio, linkedin, instagram, facebook, userData: { id, name } }
PublicContactItem       // { publicTitle, userData: { name, email, phone } }
ContactMessage          // mensagem de contato recebida
```

**Hooks disponíveis:**
```
useMe                       → GET /api/admin/me
useAdminStats               → GET /api/admin/dashboard/stats
useAdminUsers               → GET /api/admin/users (paginado + filtros)
useAdminAdmins              → GET /api/admin/users/admins
useAdminRules               → GET /api/admin/rules (paginado)
useCreateRule / useUpdateRule
useCreateAdmin / useUpdateAdmin / useDeleteAdmin
useCreateWorker / useUpdateWorker / useDeleteWorker
useCourseRegistrations      → GET /api/admin/courses/:id/registrations (paginado)
useCancelRegistration       → DELETE /api/admin/registrations/:id
useAdminUser                → GET /api/admin/users/:id  (inclui userInstructor)
useUpdateUserAddress        → PUT /api/admin/users/:id/address
useUserProperties           → GET /api/admin/users/:id/properties (paginado)
useCreateUserProperty / useDeleteUserProperty
useUploadAvatar             → POST /api/admin/users/:id/avatar
useUploadPartnerLogo / useReorderPartners
useUserRelations            → GET /api/admin/users/:id/relations (paginado)
useCreateUserRelation / useDeleteUserRelation
useInstructors              → GET /api/admin/instructors
usePromoteInstructor        → POST /api/admin/users/:id/promote-instructor
useUpdateInstructor         → PATCH /api/admin/users/:id/instructor
useRemoveInstructor         → DELETE /api/admin/users/:id/instructor
useCEPLookup                → GET /api/address/cep/:cep (ViaCEP + cache)
usePublicContacts           → GET /api/contacts (público)
usePartners                 → GET /api/partners (público)
useContactMessages          → GET /api/admin/contacts/messages (paginado + filtros)
useMarkContactMessageRead / useDeleteContactMessage / useSendContactMessage
```

## Internacionalização (i18n)

- **Biblioteca**: `react-i18next` + `i18next-browser-languagedetector`
- **Config**: `src/i18n/index.ts`
- **Locales**: `src/i18n/locales/pt-BR.ts` (default) e `src/i18n/locales/en.ts`
- **Persistência**: `localStorage` key `sindicato-lang`
- **Toggle**: componente `src/components/LanguageToggle.tsx` — exibe 🇧🇷 PT / 🇺🇸 EN
  - Presente no `PublicHeader` (desktop + mobile) e no `AdminSideBar` (footer)
- **Padrão**: `pt-BR`; fallback: `pt-BR`

## Tipo Principal: `Course`

Definido em `src/@types/course.ts`. Dois tipos:

**`ApiCourse`** — shape do backend (campos em português):
```typescript
titulo, modulo, numeroEvento, dataInicio, dataTermino, horarioInicio,
horarioFim, inscricoesAte, local, instrutorId, instrutorNome,
cargaHoraria, descricaoBreve, descricaoCompleta, status, valor,
minimoAlunos, maximoAlunos, observacoes, imagemCapa, galeriaFotos[],
inscritos, preInscritos, listaEspera, instructors: CourseInstructor[]
```

**`Course`** — shape do frontend (campos em inglês), usado em toda a UI:
```typescript
id, title, module, eventNumber, startDate, endDate, startTime, endTime,
registrationDeadline, location, workloadHours, shortDescription, fullDescription,
status: "PUBLICO" | "PRIVADO" | "NAO_PUBLICADO",
price, minStudents, maxStudents, notes, coverImage,
gallery: { id, url, caption }[], enrolled, preEnrolled, waitingList,
instructors: CourseInstructor[]
```

**`CourseInstructor`** — shape plano retornado pelo backend:
```typescript
{ id, userDataId, title, category, name, bio, avatar,
  linkedin, instagram, facebook }
```
`id` = assignment ID (usado em DELETE); `userDataId` = ID do userData do instrutor.

**Mapeamento** feito em `src/@types/course.ts`:
```typescript
mapCourse(api: ApiCourse): Course
mapCourses(list: ApiCourse[]): Course[]
```

## Auth

- **`AuthContext`** — token JWT persiste em `localStorage`. Expõe `token`, `baseUrl`, `login(token)`, `logout()`.
- **`AuthProvider`** wrapa toda a app em `main.tsx`.
- **`authenticateUser(username, password)`** em `use-users.ts` — POST `/api/auth/login`, retorna JWT.
- Layout `_admin.tsx` faz parse do JWT e valida expiração; redireciona para `/login` se inválido.
- `apiFetch()` / `apiUpload()` em `lib/api.ts` injetam `Authorization: Bearer {token}` em toda chamada.
- Resposta 401 em qualquer chamada → limpa token + redireciona para `/login`.
- Erro HTTP é lançado como `ApiError` (com `status: number`) — permite `catch (e) { if (e instanceof ApiError && e.status === 409) ... }`.
- Login redireciona para `/admin/cursos`. Logout redireciona para `/`.

## Backend / Proxy

- **Dev**: backend em `http://2.24.80.138:3000`. Vite proxy: `/api/*` → `http://2.24.80.138:3000/*` (strip `/api`).
- **Prod**: nginx proxy: `/api/*` → `BACKEND_URL/*` (strip `/api`). Mesma semântica do Vite dev proxy.
- `baseUrl` no contexto é `/api`.

## API — Endpoints

**Auth**
- `POST /api/auth/login` — `{ username, password }` → JWT string

**Cursos (público)**
- `GET /api/courses` — lista cursos públicos
- `GET /api/courses/:id` — detalhe
- `POST /api/courses/:id/register` — inscrição `{ nome, email, telefone, cpf }`

**Cursos (admin)**
- `GET /api/admin/courses` — lista admin
- `POST /api/courses` — criar
- `PATCH /api/courses/:id` — atualizar
- `DELETE /api/courses/:id` — deletar
- `POST /api/courses/:id/banner` — upload banner (multipart)
- `POST /api/courses/:id/gallery` — upload foto (multipart)
- `DELETE /api/courses/:id/gallery/:photoId` — remover foto
- `GET /api/admin/courses/:id/registrations` — inscrições do curso (paginado)
- `DELETE /api/admin/registrations/:id` — cancelar inscrição

**Usuários (admin)**
- `GET /api/admin/users` — lista (paginado + filtros)
- `GET /api/admin/users/:id` — detalhe (inclui `userInstructor`)
- `GET /api/admin/users/admins` — lista admins
- `PUT /api/admin/users/:id/address` — atualizar endereço
- `GET /api/admin/users/:id/properties` — propriedades rurais (paginado)
- `POST /api/admin/users/:id/properties` — adicionar propriedade
- `DELETE /api/admin/users/:id/properties/:propId` — remover propriedade
- `GET /api/admin/users/:id/relations` — relacionamentos (paginado)
- `POST /api/admin/users/:id/relations` — adicionar relacionamento
- `DELETE /api/admin/users/:id/relations/:relId` — remover relacionamento
- `POST /api/admin/users/:id/avatar` — upload avatar (multipart)
- `POST /api/admin/users` — criar admin/funcionário
- `PATCH /api/admin/users/:id` — atualizar admin/funcionário

**Instrutores (admin)**
- `GET /api/admin/instructors` — lista instrutores
- `POST /api/admin/users/:id/promote-instructor` — promover a instrutor
- `PATCH /api/admin/users/:id/instructor` — atualizar dados de instrutor
- `DELETE /api/admin/users/:id/instructor` — rebaixar instrutor

**Admin geral**
- `GET /api/admin/me` — dados do admin logado
- `GET /api/admin/dashboard/stats` — stats do dashboard
- `GET /api/admin/rules` — regras (paginado)
- `POST /api/rules` — criar regra
- `PATCH /api/rules/:id` — atualizar regra
- `GET /api/partners` — parceiros/sócios (público)
- `POST /api/admin/users/:id/partner-logo` — upload logo parceiro (multipart)
- `PATCH /api/admin/partners/reorder` — reordenar parceiros
- `GET /api/admin/contacts/messages` — mensagens de contato (paginado + filtros)
- `PATCH /api/admin/contacts/messages/:id` — marcar mensagem como lida
- `DELETE /api/admin/contacts/messages/:id` — deletar mensagem

**Contato (público)**
- `GET /api/contacts` — lista contatos públicos
- `POST /api/contact` — enviar mensagem de contato

**Salas**
- `GET /api/rooms` — lista
- `POST /api/rooms` — criar

**Convênios** — gated por `*_CONVENIO`; preço em centavos (Int); listas em JSON
- `GET /api/convenios` — menu público (ativos: id, slug, name, subtitle, logoUrl, order)
- `GET /api/convenios/:slug` — página pública (inativo/inexistente → 404)
- `GET /api/admin/convenios` · `GET /api/admin/convenios/:id`
- `POST /api/admin/convenios` · `PATCH /api/admin/convenios/:id` (`logoUrl: null` remove o logo) · `DELETE /api/admin/convenios/:id`
- `POST /api/admin/convenios/:id/logo` — multipart (reduzido para caber em 480×240, PNG)

**Cotações (home)**
- `GET /api/market-quotes` — cotações ativas (público)
- `GET /api/admin/market-quotes` — todas (admin)
- `POST /api/market-quotes` · `PATCH /api/market-quotes/:id` · `DELETE /api/market-quotes/:id`

**Auditoria**
- `GET /api/admin/audit-logs` — trilha de auditoria (paginado)

**Convites de admin**
- `POST /api/admin/invites` — gera convite (pessoa + regra → token)
- `GET /api/invites/:token` — dados do convite (público)
- `POST /api/invites/:token/accept` — ativa acesso (define username/senha)

**Financeiro (admin)** — gated por `*_FINANCE`; valor sempre em centavos (Int)
- `GET /api/admin/finance/categories` (?all=true inclui inativas) · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET /api/admin/finance/accounts` (caixas; ?all=true) · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET /api/admin/finance/transactions` — paginado + filtros (from, to, type, categoryId, accountId, search)
- `GET /api/admin/finance/transactions/export` — CSV (respeita filtros)
- `POST /api/admin/finance/transactions` · `PATCH /:id` · `DELETE /:id`
- `POST /api/admin/finance/transfers` — transferência entre caixas (2 lançamentos ligados)
- `POST /api/admin/finance/transactions/:id/attachments` — comprovante (multipart)
- `GET /api/admin/finance/attachments/:id` (download inline) · `DELETE /api/admin/finance/attachments/:id`
- `GET /api/admin/finance/summary?from=&to=` — KPIs + por categoria + por mês + saldo por caixa

**Utilitário**
- `GET /api/address/cep/:cep` — lookup CEP (ViaCEP + cache local)

## Estado Atual (julho/2026)

- Auth **funcional** — login/logout integrados com backend real.
- Cursos **integrados com API real** — CRUD completo (criar, editar, deletar, banner, galeria, instrutores, inscrições).
- Usuários admin: detalhe completo com propriedades/relacionamentos paginados, upload de avatar, promoção a instrutor.
- Banners e mensagens de contato implementados.
- Notícias, salas, admins e parceiros implementados.
- Dashboard admin **implementado** — stats + calendário de cursos + lista de cadastros incompletos (não é mais stub).
- Cotações da home, trilha de auditoria e convites de admin implementados.
- **Convênios**: dropdown "Convênios" no header público lista os convênios ativos; cada um tem página em `/convenios/$slug` (tabela de valores por faixa, documentos para adesão, destaques e texto). Conteúdo 100% editável em `/admin/convenios` (`ConvenioEditor` + `ConvenioPageView` compartilhado com a pré-visualização). Hooks em `useConvenios.ts`. Unimed semeado com os dados da página antiga (`ruraltr.com.br/pgs/print_unimed.php`). Regras com `UPDATE_BANNER` receberam as permissões `*_CONVENIO` na migration.
- **Financeiro** (admin): lançamentos de caixa (valor em centavos Int), categorias, dashboard, comprovantes (anexo em Bytes no banco), export CSV, multi-caixa e transferência entre caixas, relatório PDF do período. Gated por `READ/CREATE/UPDATE/DELETE_FINANCE`. Filtros dos lançamentos vivem na URL (search params).
- Deploy em produção via Docker (Dockerfile + docker-compose.prod.yml + nginx).

## Comandos

```bash
# Desenvolvimento
npm run dev      # dev server (Vite) → http://localhost:5173
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # preview do build
npm run lint     # ESLint

# Produção (manual VPS)
cp .env.production.example .env.production
# editar .env.production com BACKEND_URL real
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Convenções

- Alias `@/` aponta para `src/`
- Componentes shadcn ficam em `src/components/ui/`
- Rotas públicas sob `_public/`, admin sob `_admin/`
- `routeTree.gen.ts` regenerado automaticamente ao salvar rotas — **nunca editar manualmente**
- Todas chamadas API usam prefixo `/api/` (proxy Vite em dev, nginx em prod)
- Datas ISO da API → `formatDateFromString()` para exibição
- Máscaras de input em `src/utils/masks.ts` (CPF, telefone)
- Formulários: React Hook Form + Zod schemas centralizados em `src/lib/schemas.ts`
- Erros HTTP: `apiFetch` lança `ApiError` (de `@/lib/api`) — sempre usar `instanceof ApiError` no catch para acessar `e.status`
- Dados paginados: shape `PaginatedResponse<T>` de `useAdmin.ts` — `{ data, total, page, totalPages, limit }`
