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
/sobre                      → _public/sobre.tsx (texto de Configurações + sede + galeria com todas as fotos em #galeria)
/cotacoes                   → _public/cotacoes.tsx (histórico: um gráfico por produto, 30/90/180/365 dias, visão tabela)
/contato                    → _public/contato.tsx
/convenios                  → _public/convenios/index.tsx (cartões dos convênios ativos)
/convenios/$slug            → _public/convenios/$slug.tsx (tabela de valores, documentos, sobre)
/login                      → login.tsx
/admin                      → _admin/admin/index.tsx (redirect → /admin/cursos)
/admin/cursos               → _admin/admin/cursos/index.tsx (CRUD completo)
/admin/cursos/novo          → _admin/admin/cursos/novo.tsx (form criação)
/admin/noticias             → _admin/admin/noticias/index.tsx
/admin/usuarios             → _admin/admin/usuarios/index.tsx (abas ?tab=associados|empresas|admins)
/admin/usuarios/$id         → _admin/admin/usuarios/$id.tsx (detalhe completo; aba "Empresas" = vínculos)
/admin/empresas/novo        → _admin/admin/empresas/novo.tsx (criar empresa)
/admin/empresas/$id         → _admin/admin/empresas/$id.tsx (abas Dados / Pessoas / Propriedades)
/admin/banners              → _admin/admin/banners.tsx
/admin/mensagens            → _admin/admin/mensagens.tsx
/admin/salas                → _admin/admin/salas/index.tsx (nome = lista fixa de salas)
/admin/administradores      → _admin/admin/administradores/index.tsx
/admin/cotacoes             → _admin/admin/cotacoes/index.tsx (lançamento do dia: produtos fixos, preço + manhã/tarde; unidade por produto; fonte)
/admin/galerias             → _admin/admin/galerias/index.tsx (redireciona p/ /admin/configuracoes?tab=galerias)
/admin/configuracoes        → _admin/admin/configuracoes.tsx (Configurações do site: ?tab=dados|redes|galerias|parceiros|contatos)
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
│   ├── cadastro/                    # Empresas: CompaniesList, CompanyForm, CompanyMembersPanel,
│   │                                #   PersonCompanies; PropertiesManager
│   │                                #   (propriedades/endereços, compartilhado por pessoa e empresa)
│   ├── PublicHeader.tsx             # Nav pública (sticky; convênios como itens próprios; menu mobile abaixo de lg) — logo-full.png
│   ├── public-footer.tsx            # Footer: 4 colunas (marca+redes, links, contato via useOrgInfo, chamada)
│   ├── adminSideBar.tsx             # Sidebar admin — usa logo-icon.png; link perfil via userDataId
│   ├── nav-user.tsx                 # Dropdown do usuário (logout)
│   ├── home-hero-section.tsx        # Banner hero
│   ├── GalleryLightbox.tsx          # Fotos de uma galeria em tela cheia (página Sobre)
│   ├── home-cotacoes-section.tsx    # Faixa de cotações (preço, unidade, dia/período, fonte, link histórico)
│   ├── cotacoes/QuoteHistoryChart.tsx # Gráfico SVG de um produto (linha, crosshair/tooltip, setas do teclado)
│   ├── export/ExportMenu.tsx        # Exportação CSV: ExportMenu (selecionados / todos com filtros / extras),
│   │                                #   ExportOneButton (um registro), SelectCheckbox, SelectionInfo
│   ├── galerias/                    # Admin: GalleryAlbumCard (fotos, legenda, ordem), GalleryAlbumDialog
│   ├── site-config/                 # Abas de Configurações do site: OrgInfoPanel (dados do sindicato +
│   │                                #   texto do Sobre), SocialLinksPanel, GalleriesPanel, PartnersPanel
│   │                                #   (+ PartnerEditDialog: logo/link), PublicContactsPanel (busca pessoa, cargo, ordem)
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
│   ├── useCompanies.ts              # Empresas: useAdminCompanies, useAdminCompany, CRUD, vínculos
│   │                                #   (members), propriedades, logo de parceira, títulos usados
│   ├── useGalleries.ts              # Galerias: pública, admin, CRUD, upload/legenda/ordem das fotos
│   ├── useMarketQuotes.ts           # Cotações: pública, admin, useSaveDailyQuotes (PUT daily), useQuoteHistory
│   ├── useSiteSettings.ts           # Configurações do site (pública/admin/salvar), useUpdateQuotesSource,
│   │                                #   useOrgInfo (dados do sindicato com fallback de lib/org-contact.ts)
│   ├── usePublicContactsAdmin.ts    # Contatos públicos no admin: listar, adicionar, cargo, tirar, reordenar
│   ├── useNews.ts                   # Hooks de notícias (admin + público)
│   ├── useBanner.ts                 # Hooks de banners
│   ├── useRooms.ts                  # useRooms, useCreateRoom
│   ├── useRowSelection.ts           # Seleção de linhas por id (continua entre páginas) para exportar
│   ├── usePermissions.ts            # Hook de permissões do usuário logado
│   ├── use-users.ts                 # authenticateUser(username, password) → POST /api/auth/login
│   └── use-mobile.ts               # useIsMobile (breakpoint hook)
├── lib/
│   ├── api.ts                       # ApiError class (com status: number); apiFetch() e apiUpload()
│   │                                #   injetam Bearer token; 401 → limpa token + redireciona /login
│   ├── query-client.ts              # QueryClient: staleTime 60s, gcTime 5min, retry false, refetchOnWindowFocus false
│   ├── auth-guard.ts                # Guard de rota admin
│   ├── schemas.ts                   # Schemas Zod: pessoaSchema, roomSchema, adminSchema, courseBaseSchema
│   ├── export.ts                    # downloadExport(dataset, params) → GET /admin/export/:dataset (CSV)
│   ├── member-types.ts              # Tipo de membro (lista fixa) + MEMBER_TYPE_OPTIONS
│   ├── membership.ts                # isActiveMember (selo "Associado" nas inscrições)
│   ├── org-contact.ts               # Dados padrão do sindicato (fallback) + phoneDigits
│   ├── room-names.ts                # Nomes fixos das salas + opções do select
│   ├── quote-utils.ts               # Cotações: período (manhã/tarde), rótulo dos produtos, unidades (QUOTE_UNIT_OPTIONS), trendOf
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
├── routes/                          # File-based routing
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD → DD/MM/YYYY)
│   ├── cnpj.ts                      # isValidCnpj
│   └── masks.ts                     # maskCPF, maskCNPJ, maskPhone
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
UserDataDetail          // UserData & { address, userInstructor, companyMemberships }
InstructorItem          // { id, bio, linkedin, instagram, facebook, userData: { id, name } }
PublicContactItem       // { publicTitle, userData: { name, email, phone, avatar } }
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
useUserRelations            → GET /api/admin/users/:id/relations (paginado)
useCreateUserRelation / useDeleteUserRelation
useInstructors              → GET /api/admin/instructors
usePromoteInstructor        → POST /api/admin/users/:id/promote-instructor
useUpdateInstructor         → PATCH /api/admin/users/:id/instructor
useRemoveInstructor         → DELETE /api/admin/users/:id/instructor
useCEPLookup                → GET /api/address/cep/:cep (ViaCEP + cache)
usePublicContacts           → GET /api/contacts (público)
usePartners                 → GET /api/partners (público; empresas parceiras)
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

**Empresas (admin)** — reusa as permissões `*_USER`; CNPJ guardado só com dígitos, único entre empresas ativas
- `GET /api/admin/companies` — lista paginada (search nome/e-mail/CNPJ, type PRIVATE|PUBLIC, isPartner)
- `GET /api/admin/companies/titles` — títulos já usados nos vínculos (sugestões)
- `GET /api/admin/companies/:id` — detalhe (members com a pessoa + properties)
- `POST /api/admin/companies` · `PATCH /api/admin/companies/:id` (inclui `tradeName`, `address` da sede — null/vazio remove —, parceria e `primaryPropertyId`) · `DELETE /api/admin/companies/:id` (soft)
- `POST /api/admin/companies/:id/members` `{ userDataId, title }` · `PATCH /members/:memberId` `{ title }` · `DELETE /members/:memberId`
- `POST /api/admin/companies/:id/properties` · `DELETE /api/admin/companies/:id/properties/:propertyId`
- `POST /api/admin/companies/:id/partner-logo` — multipart (300×150, PNG); `PATCH` com `partnerLogo: null` remove

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
- `GET /api/partners` — empresas parceiras (público; ordem por partnerOrder)
- `PATCH /api/admin/partners/reorder` — reordenar empresas parceiras `{ order: id[] }`
- `GET /api/admin/contacts/messages` — mensagens de contato (paginado + filtros)
- `PATCH /api/admin/contacts/messages/:id` — marcar mensagem como lida
- `DELETE /api/admin/contacts/messages/:id` — deletar mensagem

**Contato (público)**
- `GET /api/contacts` — contatos públicos, na ordem definida no admin
- `GET /api/site-settings` — redes sociais, dados do sindicato (`org*`), `aboutText`, `quotesSource`

**Configurações do site (admin)**
- `GET` · `PATCH /api/admin/site-settings` — `*_BANNER`; só grava os campos enviados
- `GET /api/admin/public-contacts` (READ_USER) · `POST` `{ userDataId, title }` · `PATCH /:id` `{ title }` · `DELETE /:id` · `PATCH /reorder` `{ order: id[] }` (UPDATE_USER) — qualquer pessoa do cadastro, com ou sem login
- `POST /api/contact` — enviar mensagem de contato

**Salas** — nome precisa ser da lista fixa (AUDITORIO, COZINHA, SALA DE VIDEO CONFERENCIA, SALA 1, SALA 2, SALA APL); repetido → 409
- `GET /api/rooms` — lista
- `POST /api/rooms` — criar · `PATCH /api/rooms/:id` · `DELETE /api/rooms/:id`

**Convênios** — gated por `*_CONVENIO`; preço em centavos (Int); listas em JSON
- `GET /api/convenios` — menu público (ativos: id, slug, name, subtitle, logoUrl, order)
- `GET /api/convenios/:slug` — página pública (inativo/inexistente → 404)
- `GET /api/admin/convenios` · `GET /api/admin/convenios/:id`
- `POST /api/admin/convenios` · `PATCH /api/admin/convenios/:id` (`logoUrl: null` remove o logo) · `DELETE /api/admin/convenios/:id`
- `POST /api/admin/convenios/:id/logo` — multipart (reduzido para caber em 480×240, PNG)

**Cotações (home)** — produtos fixos: SOJA, MILHO, TRIGO, MANDIOCA, DOLAR (não se cria/exclui)
- `GET /api/market-quotes` — produtos com preço lançado (público; `priceCents`, `unit`, `period`, `referenceDate`, `variation`)
- `GET /api/admin/market-quotes` — os 5 produtos
- `PUT /api/admin/market-quotes/daily` — `{ period: MORNING|AFTERNOON, prices: [{ id, priceCents }] }`; data = hoje (definida no backend)
- `GET /api/market-quotes/history?days=30|90|180|365` — `[{ id, label, unit, points: [{ date, period, priceCents }] }]` (público)
- `PUT /api/admin/market-quotes/source` — `{ source }` (UPDATE_MARKET_QUOTE); vazio esconde a fonte
- `PATCH /api/admin/market-quotes/:id` — `{ unit }` (sc 60kg, sc 50kg, sc 40kg, t, kg, @ ou null) (UPDATE_MARKET_QUOTE)

**Galerias (página Sobre)** — permissões `*_BANNER`
- `GET /api/galleries` — ativas com pelo menos uma foto (público)
- `GET /api/admin/galleries` · `POST /api/admin/galleries` · `PATCH /api/admin/galleries/:id` · `DELETE /api/admin/galleries/:id`
- `PATCH /api/admin/galleries/reorder` `{ order: id[] }`
- `POST /api/admin/galleries/:id/photos` (multipart; reduzida p/ 1600px JPEG) · `PATCH /photos/:photoId` `{ caption }` · `DELETE /photos/:photoId` · `PATCH /photos/reorder`

**Auditoria**
- `GET /api/admin/audit-logs` — trilha de auditoria (paginado; `action=create|edit|delete|export`)

**Exportação CSV** — `GET /api/admin/export/:dataset` (planilha `;` com BOM, abre no Excel; cada exportação vai para a auditoria como "Exportou")
- Datasets: `people`, `companies`, `properties` (`ownerIds`), `unimed` (READ_USER) · `admins` (READ_USER_ADMIN) · `courses`, `registrations` (`courseIds`) (READ_COURSE) · `contact-messages` (READ_CONTACT) · `audit-logs` (READ_AUDIT)
- `ids=a,b` = selecionados ou um registro; sem `ids` = mesmos filtros da listagem
- Telas: checkboxes + "Exportar" em Associados, Empresas, Administradores, Unimed, Cursos (cards), Mensagens; ícone de download por linha; "Exportar" no detalhe de pessoa/empresa/curso/mensagem; botão na Auditoria e na aba Inscrições do curso

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

## Estado Atual (setembro/2026)

- Auth **funcional** — login/logout integrados com backend real.
- Cursos **integrados com API real** — CRUD completo (criar, editar, deletar, banner, galeria, instrutores, inscrições).
- Usuários admin: detalhe completo com propriedades/relacionamentos paginados, upload de avatar, promoção a instrutor.
- Banners e mensagens de contato implementados.
- Notícias, salas, admins e parceiros implementados.
- **Empresas separadas de pessoas** (set/2026): `Company` tem vínculos N:N com pessoas (`CompanyMember`, cada um com título livre, ex.: SOCIO, CONTADOR), propriedades próprias (endereços; `Property` pertence a uma pessoa OU a uma empresa) e a parceria (antes flags em `UserData`). Lista na aba "Empresas" de `/admin/usuarios`. O CNPJ saiu do formulário de pessoa; as colunas `cnpj`/`isPartner`/`partner*` de `UserData` foram removidas (valores antigos de CNPJ e de tipo de membro fora da lista foram para as observações do associado). A migration criou uma empresa para cada pessoa ativa que era parceira ou tinha CNPJ, com a pessoa como RESPONSAVEL.
- Dashboard admin **implementado** — stats + calendário de cursos + lista de cadastros incompletos (não é mais stub).
- Trilha de auditoria e convites de admin implementados.
- **Ajustes de cadastro (set/2026)**: tipo de membro é select (Aluno, Produtor rural, Trabalhador rural assalariado/autônomo; o backend recusa valor fora da lista); CAD/PRO até 5; salas com nome de lista fixa; empresa com razão social (`name`), nome fantasia (`tradeName`, exibido quando houver — `companyDisplayName`) e endereço da sede no próprio cadastro (CEP com busca).
- **Cotações**: produtos fixos; o admin só lança preço (centavos) e período manhã/tarde; a data é a do dia; a unidade de cada produto é escolhida na mesma tela (saca 60/50/40 kg, tonelada, quilo, arroba ou sem unidade). Home mostra preço + unidade + dia/período + fonte (editável no admin de cotações) e linka para `/cotacoes` (histórico em gráfico/tabela).
- **Exportação** (set/2026): tudo que tem lista no painel exporta em CSV — selecionados, todos com os filtros atuais ou um registro só (ver "Exportação CSV" acima). A planilha de inscrições do curso agora vem do backend.
- **Inscrições de curso**: selos "Associado" (situação ativa e validade em dia), "Parceira" (vínculo com empresa parceira ativa), cargo na diretoria e cargo de contato público; o CSV traz as mesmas colunas.
- **Home**: os números (associados, cursos realizados, anos, alunos) saíram. As galerias de fotos (História do Sindicato, FAEP, Patrulha Rural) ficam só na página Sobre (#galeria) — o usuário pediu para NÃO ter seção de galerias na home.
- **Configurações do site** (`/admin/configuracoes`): centraliza o que é do site público — Dados do sindicato (telefone, e-mail, endereço, horário, busca do mapa e texto do Sobre; usados no rodapé, Contato, Sobre e convênios via `useOrgInfo`), Redes sociais, Galerias, Parceiros da home (adicionar empresa, logo, link, ordem, tirar) e Contatos públicos ("Nossa Equipe": qualquer pessoa do cadastro, com cargo e ordem). Permissões: Dados/Redes/Galerias `*_BANNER`; Parceiros e Contatos `*_USER`. A empresa não tem mais aba Parceria e o diálogo de admin não marca mais contato público — ambos apontam para cá.
- **Convênios**: cada convênio ativo é um item próprio no menu do header público (entre Notícias e Sobre; sem submenu — pedido do usuário, são poucos); cada um tem página em `/convenios/$slug` (tabela de valores por faixa, documentos para adesão, destaques e texto). Conteúdo 100% editável em `/admin/convenios` (`ConvenioEditor` + `ConvenioPageView` compartilhado com a pré-visualização). Hooks em `useConvenios.ts`. Unimed semeado com os dados da página antiga (`ruraltr.com.br/pgs/print_unimed.php`). Regras com `UPDATE_BANNER` receberam as permissões `*_CONVENIO` na migration.
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
