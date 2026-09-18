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
| react-i18next | 17.x | Textos centralizados em pt-BR (`t()`); sem troca de idioma |

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
/admin/cursos               → _admin/admin/cursos/index.tsx (CRUD completo em diálogos: criar, editar, duplicar, inscrições; ?curso=<id>&aba=inscricoes abre a janela do curso)
/admin/noticias             → _admin/admin/noticias/index.tsx
/admin/usuarios             → _admin/admin/usuarios/index.tsx (abas ?tab=associados|empresas|admins)
/admin/usuarios/$id         → _admin/admin/usuarios/$id.tsx (detalhe completo; aba "Empresas" = vínculos; ?completar=1 abre "Completar cadastro")
/admin/empresas/novo        → _admin/admin/empresas/novo.tsx (criar empresa)
/admin/empresas/$id         → _admin/admin/empresas/$id.tsx (abas Dados / Pessoas / Propriedades)
/admin/banners              → _admin/admin/banners.tsx (período em dias de Brasília; selo Agendado/No ar/Expirado/Inativo)
/admin/mensagens            → _admin/admin/mensagens.tsx (responder por e-mail/WhatsApp, marcar como não lida)
/admin/salas                → _admin/admin/salas/index.tsx (nome = lista fixa de salas)
/admin/agenda               → _admin/admin/agenda.tsx (Agenda das salas: ?week=<segunda>&roomId&type=COURSE|EVENT|MEETING&view=semana|lista; componentes em components/agenda)
/admin/administradores      → _admin/admin/administradores/index.tsx
/admin/cotacoes             → _admin/admin/cotacoes/index.tsx (lançamento do dia: produtos fixos, preço + manhã/tarde; unidade por produto; fonte)
/admin/galerias             → _admin/admin/galerias/index.tsx (redireciona p/ /admin/configuracoes?tab=galerias)
/admin/configuracoes        → _admin/admin/configuracoes.tsx (Configurações do site: ?tab=dados|redes|galerias|parceiros|contatos)
/admin/convenios            → _admin/admin/convenios/index.tsx (lista de convênios)
/admin/convenios/novo       → _admin/admin/convenios/novo.tsx (editor, criação)
/admin/convenios/$id        → _admin/admin/convenios/$id.tsx (editor com pré-visualização)
/admin/auditoria            → _admin/admin/auditoria/index.tsx (trilha de auditoria; linha abre IP, local, navegador e "O que mudou"; filtros na URL, inclusive ?ip=)
/admin/financeiro           → _admin/admin/financeiro/index.tsx (Financeiro: dashboard, lançamentos, categorias, caixas)
/admin/dashboard            → _admin/admin/dashboard.tsx (painel: stats + calendário de cursos e reservas de sala + cadastros incompletos; pendências ficam no sino)
/convite/:token             → convite/$token.tsx (público: ativar acesso de admin por convite)
```

Layouts pai:
- `_public.tsx` — Header + Footer público
- `_admin.tsx` — Sidebar admin (AdminSideBar), token-gated (valida JWT + expiração); no celular, topo com SidebarTrigger + sino de notificações

`routeTree.gen.ts` é **gerado automaticamente** pelo TanStack Router — não editar manualmente.

## Estrutura de Arquivos

```
src/
├── @types/
│   └── course.ts                    # Tipos Course, ApiCourse, CourseInstructor + mapCourse()
├── components/
│   ├── ui/                          # shadcn/ui + pagination.tsx (PaginatedResponse)
│   ├── cadastro/                    # Empresas: CompaniesList, CompanyForm, CompanyMembersPanel,
│   │                                #   PersonCompanies (aba Empresas da pessoa: vincular a empresa/desvincular);
│   │                                #   PropertiesManager (propriedades/endereços, compartilhado por pessoa e empresa)
│   ├── PublicHeader.tsx             # Nav pública (sticky; convênios como itens próprios; menu mobile abaixo de lg) — logo-full.png
│   ├── public-footer.tsx            # Footer: 4 colunas (marca+redes, links, contato via useOrgInfo, chamada); "Acesso ao painel" é link discreto na linha de baixo
│   ├── WhatsAppFloatingButton.tsx   # Botão flutuante do WhatsApp (layout público; só com WhatsApp nas Configurações; some abaixo de lg em /cursos/$id)
│   ├── NotFoundPage.tsx             # 404 em português (defaultNotFoundComponent, lazy): com cabeçalho/rodapé quando fora do layout; em /admin leva ao painel
│   ├── RouteErrorPage.tsx           # defaultErrorComponent: "Tentar de novo" (router.invalidate) + "Ir para o início"
│   ├── PageLoader.tsx               # defaultPendingComponent (rota demorando a carregar)
│   ├── LoadErrorRetry.tsx           # Falha de carregamento no site público: mensagem + "Tentar de novo" (nunca "não há nada")
│   ├── adminSideBar.tsx             # Sidebar admin — usa logo-icon.png; link perfil via userDataId; sino ao lado do logo
│   ├── notifications/NotificationBell.tsx # Sino (número = avisos não lidos + pendências warning): Popover no computador,
│   │                                #   Sheet no celular; seções Pendências e Avisos; abre o link pelo roteador
│   ├── nav-user.tsx                 # Dropdown do usuário (logout)
│   ├── home-hero-section.tsx        # Banner hero
│   ├── GalleryLightbox.tsx          # Fotos de uma galeria em tela cheia (página Sobre)
│   ├── home-cotacoes-section.tsx    # Faixa de cotações (preço, unidade, dia/período, fonte, link histórico)
│   ├── cotacoes/QuoteHistoryChart.tsx # Gráfico SVG de um produto (linha, crosshair/tooltip, setas do teclado)
│   ├── courses/                     # Admin de cursos: CourseFormDialog (criar/editar/duplicar — fora do arquivo
│   │                                #   da rota para o editor de markdown não ir ao bundle inicial), PhotoGrid
│   ├── PersonPicker.tsx             # Busca de pessoa do cadastro (lista suspensa; "Cadastrar nova pessoa" em outra aba)
│   ├── export/ExportMenu.tsx        # Exportação CSV: ExportMenu (selecionados / todos com filtros / extras),
│   │                                #   ExportOneButton (um registro), SelectCheckbox, SelectionInfo
│   ├── agenda/                      # Agenda das salas: AgendaPage (semana/lista, filtros na URL), AgendaWeekView,
│   │                                #   AgendaListView (busca, exportar), BookingDialog (nova/editar reserva),
│   │                                #   DeleteBookingDialog (só esta / esta e as próximas), KindBadge (Curso/Evento/Reunião)
│   ├── galerias/                    # Admin: GalleryAlbumCard (fotos, legenda, ordem), GalleryAlbumDialog
│   ├── site-config/                 # Abas de Configurações do site: OrgInfoPanel (dados do sindicato +
│   │                                #   texto do Sobre), SocialLinksPanel, GalleriesPanel, PartnersPanel
│   │                                #   (+ PartnerEditDialog: logo/link), PublicContactsPanel (busca pessoa, cargo, ordem)
│   ├── home-courses-section.tsx     # Carrossel de cursos (CoursesSection)
│   ├── home-news-section.tsx        # Seção de notícias na home
│   ├── course-card.tsx              # CourseCard + CourseCardSimple (carousel-aware)
│   ├── StatusBadge.tsx              # Badge do status do curso (PUBLIC | PRIVATE | UNPUBLISHED | IN_PROGRESS | COMPLETED)
│   ├── ImageCropDialog.tsx          # Dialog de crop de imagem (avatar/upload)
│   ├── PermissionButton.tsx         # Botão condicional baseado em permissão
│   ├── confirm-close-dialog.tsx     # Dialog de confirmação de descarte
│   ├── ErrorAlert.tsx               # Alerta de erro
│   └── EmptyState.tsx               # Placeholder estado vazio
├── context/
│   └── AuthContext.tsx              # Token em localStorage; expõe token, baseUrl (= API_BASE), login(), logout()
├── hooks/
│   ├── useCourse.ts                 # useAdminCourses, useCourses, useCourse, useCreateCourse,
│   │                                #   useUpdateCourse, useDeleteCourse, useUploadBanner,
│   │                                #   useUploadGalleryPhoto, useDeleteGalleryPhoto,
│   │                                #   useAllCourseRegistrations, useAdminRegisterPerson, useConfirmAllRegistrations
│   ├── useAdmin.ts                  # Ver seção "Hooks — useAdmin.ts" abaixo
│   ├── useCompanies.ts              # Empresas: useAdminCompanies, useAdminCompany, CRUD, vínculos
│   │                                #   (members; pela pessoa: useLinkPersonToCompany/useUnlinkPersonFromCompany),
│   │                                #   propriedades, logo de parceira, títulos usados + COMMON_MEMBER_TITLES
│   ├── useGalleries.ts              # Galerias: pública, admin, CRUD, upload/legenda/ordem das fotos
│   ├── useMarketQuotes.ts           # Cotações: pública, admin, useSaveDailyQuotes (PUT daily), useQuoteHistory
│   ├── useNotifications.ts          # Sino: useNotifications (a cada 60s e ao voltar à aba), useMarkNotificationsRead
│   │                                #   (marca na tela antes da resposta), markReadLocally
│   ├── useSiteSettings.ts           # Configurações do site (pública/admin/salvar), useUpdateQuotesSource,
│   │                                #   useOrgInfo (dados do sindicato com fallback de lib/org-contact.ts)
│   ├── usePublicContactsAdmin.ts    # Contatos públicos no admin: listar, adicionar, cargo, tirar, reordenar
│   ├── useNews.ts                   # Hooks de notícias (admin + público)
│   ├── useBanner.ts                 # Hooks de banners
│   ├── useRooms.ts                  # useRooms, useCreateRoom
│   ├── useRoomBookings.ts           # Reservas de sala: useRoomBookings, useRoomSchedule, useCreate/Update/DeleteRoomBooking
│   ├── useRowSelection.ts           # Seleção de linhas por id (continua entre páginas) para exportar
│   ├── useAuditTrail.ts             # Auditoria: useAuditTrail (filtros action/entity/actorId/ip/from/to/q) + AuditTrailItem
│   ├── usePermissions.ts            # Hook de permissões do usuário logado
│   ├── use-users.ts                 # authenticateUser(username, password) → POST /api/auth/login
│   └── use-mobile.ts               # useIsMobile (breakpoint hook)
├── lib/
│   ├── api.ts                       # ApiError class (com status: number); apiFetch() e apiUpload()
│   │                                #   injetam Bearer token; 401 → limpa token + redireciona /login
│   ├── query-client.ts              # QueryClient: staleTime 60s, gcTime 5min, retry shouldRetryQuery, refetchOnWindowFocus false
│   ├── query-retry.ts               # shouldRetryQuery (até 2x em falha de rede/5xx, nunca 4xx) + errorStatus (ApiError ou "HTTP nnn")
│   ├── site-whatsapp.ts             # siteWhatsappHref (link pronto ou número solto → wa.me/55…) + isCourseDetailPath
│   ├── auth-guard.ts                # Guard de rota admin
│   ├── schemas.ts                   # Schemas Zod: pessoaSchema, roomSchema, courseBaseSchema
│   ├── export.ts                    # downloadExport(dataset, params) → POST /admin/export/:dataset (filtros/ids no corpo; CSV)
│   ├── member-types.ts              # MEMBER_TYPES (lista fixa {value,label}, também opções do select) + memberTypeLabel
│   ├── membership.ts                # isActiveMember (selo "Associado" nas inscrições)
│   ├── person-validation.ts         # validatePersonFields (nome, e-mail opcional, telefones, CPF, RG, CNH — mesmas regras do backend),
│   │                                #   firstInvalidField, focusFieldById (cadastro novo e edição de pessoa)
│   ├── org-contact.ts               # Dados padrão do sindicato (fallback) + phoneDigits
│   ├── room-names.ts                # Nomes fixos das salas + opções do select
│   ├── agenda.ts                    # Agenda das salas: semana (weekStart, weekLabel), itemsForDay (vários dias), horário de parede,
│   │                                #   parseAgendaSearch, validação/corpo do formulário de reserva
│   ├── calendar-links.ts            # Curso na agenda/WhatsApp: buildCourseIcs (.ics, hora de Brasília → UTC, repete por dia),
│   │                                #   googleCalendarUrl, whatsappShareUrl (só nome, data, horário, local e link)
│   ├── dashboard-agenda.ts          # Calendário do painel: dias com reserva, lista do dia (cursos + reservas), contagem
│   ├── quote-utils.ts               # Cotações: período (manhã/tarde), rótulo dos produtos, unidades (QUOTE_UNIT_OPTIONS), trendOf
│   ├── relative-time.ts             # relativeTime ("agora", "há 5 min", "há 2 h", "ontem", "12/09") + fullDateTime
│   ├── audit-fields.ts              # Auditoria "O que mudou": AUDIT_FIELD_LABELS (campo → português), formatAuditValue, auditChanges
│   ├── quote-price-check.ts         # Cotações: findQuoteDeviations (preço >20% diferente do último → confirmação), formatQuoteChange
│   ├── banner-dates.ts              # Banners: bannerStartIso/bannerEndIso (dia → 00:00 / 23:59:59.999 -03:00), brasiliaYmd
│   │                                #   (instante → dia em Brasília), bannerState (mesma regra do GET /banners), bannerPeriodLabel
│   ├── whatsapp-field.ts            # Campo WhatsApp das Redes sociais: telefone digitado ↔ link https://wa.me/55… salvo
│   ├── lista-presenca-pdf.tsx       # Lista de presença (PDF): curso, data(s), horário, local, instrutores; tabela Nº/Nome/CPF/Assinatura,
│   │                                #   uma folha por dia, inscrições confirmadas em ordem alfabética
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
├── routes/                          # File-based routing
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD → DD/MM/YYYY)
│   ├── dates.ts                     # toIso, toYmd(date) e todayYmd() (YYYY-MM-DD no fuso local)
│   ├── date-input.ts                # maskDateBr, parseDateBr (dd/mm/aaaa → YYYY-MM-DD, null se inválida), ymdToBr — do DatePicker
│   ├── download.ts                  # saveBlob, openBlob, fileSlug (downloads de CSV/PDF)
│   ├── cnpj.ts                      # isValidCnpj
│   ├── cpf.ts                       # isValidCpf, cpfDigits, sameCpf (compara só dígitos)
│   ├── course-status.ts             # getCourseSituation (selo do card), getRegistrationBlock (botão Inscrever-se),
│   │                                #   isRegistrationDeadlinePassed/hasCourseEnded — dia em Brasília, igual ao backend
│   │                                #   (COMPLETED = terminado); hasCourseStarted (mostra a presença)
│   ├── course-attendance.ts         # Presença: attendanceCounts/attendanceSummary (só confirmadas), canReceiveCertificate,
│   │                                #   courseDays (uma folha por dia na lista de presença), sortByName
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
useAdminUsers               → GET /api/admin/users (paginado + filtros; mantém a lista anterior enquanto carrega; 2º arg { enabled })
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

## Textos (i18n)

- O sistema é **só em português**: não há seletor nem detecção de idioma (o usuário decidiu remover o inglês).
- Os textos ficam em `src/i18n/locales/pt-BR.ts` e são lidos com `t('chave')` (`react-i18next`); config em `src/i18n/index.ts` (`lng` fixo `pt-BR`; apaga a chave antiga `sindicato-lang` do localStorage).
- `src/test/lib/i18n.test.ts` confere que toda chave usada em `t('...')` existe em `pt-BR.ts`.

## Tipo Principal: `Course`

Definido em `src/@types/course.ts`. O backend já responde com os campos em inglês, então a UI usa o shape da API direto (não há mais tipo em português nem função de mapeamento).

**`Course`**:
```typescript
id, status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS' | 'COMPLETED',
title, description, maxStudents, minStudents, enrolled, preEnrolled, waitlist,
coverImage: string | null, coverImageThumb?: string | null (WebP ~640px p/ cards; null → coverImage),
price, startDate, endDate, startTime, endTime,
workloadHours, location, instructorName,
registrationDeadline: string | null, observations: string | null, eventNumber: string | null,
photoGallery: { id, url, caption }[], instructors: CourseInstructor[]
```

**`CourseInstructor`** — shape plano retornado pelo backend:
```typescript
{ id, userDataId, title, category, name, bio, avatar,
  linkedin, instagram, facebook }   // title/category/bio/avatar/redes podem ser null
```
`id` = assignment ID (usado em DELETE); `userDataId` = ID do userData do instrutor.

## Auth

- **`AuthContext`** — token JWT persiste em `localStorage`. Expõe `token`, `baseUrl`, `login(token)`, `logout()`.
- **`AuthProvider`** wrapa toda a app em `main.tsx`.
- **`authenticateUser(username, password)`** em `use-users.ts` — POST `/api/auth/login`, retorna JWT.
- Layout `_admin.tsx` faz parse do JWT e valida expiração (`lib/auth-token.ts`); se inválido vai para `/login?redirect=<tela atual>`.
- `apiFetch()` / `apiUpload()` em `lib/api.ts` injetam `Authorization: Bearer {token}` em toda chamada.
- Resposta 401 em qualquer chamada → limpa token + vai para `/login?redirect=<tela atual>`.
- Erro HTTP é lançado como `ApiError` (com `status: number`) — permite `catch (e) { if (e instanceof ApiError && e.status === 409) ... }`.
- Login volta para o `?redirect` só se for caminho do painel (`safeAdminRedirect`: começa com `/admin`), senão `/admin/dashboard`; já logado, `/login` faz o mesmo. Logout vai para `/login`.
- Token vale 8h; a renovação só funciona até 24h depois do login (`authTime` no token), depois é preciso entrar de novo. Renovação deslizante: `useSessionRenewal()` (AuthContext, usado no `_admin.tsx`) confere o token a cada clique/tecla (no máx. a cada 30s) e, passada a metade da validade, chama `POST /auth/refresh` (uma por vez) e grava o novo token; falha não faz nada.
- **Alterações não salvas**: `const allowLeave = useUnsavedGuard(active)` (`hooks/use-unsaved-guard.ts`, `useBlocker` do TanStack Router) pergunta "Sair sem salvar?" (diálogo do app, `<LeaveConfirmHost />` montado no `_admin.tsx`) ao ir para outro caminho; só search params (filtros/abas) não pergunta; fechar/atualizar a aba usa o aviso do navegador. Chame `allowLeave()` logo antes do `navigate()` pós-salvar/criar/excluir.
- **Busca de telas**: `CommandPalette` (Ctrl+K ou botão "Buscar…" no topo da sidebar, `openCommandPalette()` de `lib/command-palette.ts`); lista `NAV_ITEMS` com permissão; busca ignora acentos/maiúsculas e exige todas as palavras.

## Backend / Proxy

- **Base da API**: `API_BASE` em `src/lib/api.ts` = `VITE_API_URL` (embutido no build) ou, sem ele, `/api`. `baseUrl` do contexto é esse mesmo valor.
- **Dev**: sem `VITE_API_URL`, as chamadas vão para `/api/*` e o proxy do Vite encaminha para `VITE_BACKEND_URL` (padrão `http://localhost:3000`), tirando o `/api`.
- **Prod**: não há proxy. O `Dockerfile` builda com `VITE_API_URL` (padrão `https://sindicatoruraltrbackend.nakaidev.tech`), então o navegador chama o backend direto. O container roda `node server/index.mjs` (Fastify na porta 80): serve o `dist/` como SPA (rota desconhecida → `index.html`; asset em `assets/` que não existe → 404) e, em `/cursos/:id` e `/noticias/:id`, busca o curso/notícia em `BACKEND_URL` (runtime) para injetar as meta OpenGraph no HTML (preview de link em WhatsApp/redes; descrição sem markdown via `server/markdown-text.mjs`, mesmas regras de `src/lib/markdown-text.ts`). O `index.html` traz uma tela de carregamento (logo + spinner, CSS inline) dentro de `#root`, trocada pelo React no primeiro render.

## API — Endpoints

**Auth**
- `POST /api/auth/login` — `{ username, password }` → `{ token }` (JWT de 8h)
- `POST /api/auth/refresh` — `Authorization: Bearer <token ainda válido>`, sem corpo → `{ token }` novo de 8h (401 se vencido, admin removido ou login há mais de 24h)

**Cursos (público)**
- `GET /api/courses` — lista cursos públicos
- `GET /api/courses/:id` — detalhe
- `POST /api/courses/:id/register` — inscrição `{ name, phone, cpf, email? }`
- `POST /api/courses/:id/register-full` — inscrição de quem não tem cadastro (`RegisterFullBody`: e-mail opcional; a pessoa é achada só pelo CPF)

**Cursos (admin)**
- `GET /api/admin/courses` — lista admin
- `POST /api/courses` — criar (aceita `eventNumber`, `minStudents`). "Duplicar curso" (menu do card e diálogo do curso) abre a criação preenchida (datas, prazo e nº do evento em branco; rascunho) e manda `copyCoverFromCourseId` (o backend copia a capa para um arquivo próprio) e `copyInstructorsFromCourseId` + `instructorAssignmentIds`; resposta `{ id, coverCopied?, instructorsCopied? }` (falhou → aviso para enviar a capa pela edição). Galeria não é copiada
- `PATCH /api/courses/:id` — atualizar
- `DELETE /api/courses/:id` — deletar
- `POST /api/courses/:id/banner` — upload banner (multipart; gera também a miniatura WebP ~640px → `{ url, thumbUrl }`)
- `POST /api/courses/:id/gallery` — upload foto (multipart)
- `DELETE /api/courses/:id/gallery/:photoId` — remover foto
- `GET /api/admin/courses/:id/registrations` — inscrições do curso (paginado)
- `DELETE /api/admin/registrations/:id` — cancelar inscrição
- `POST /api/admin/courses/:id/registrations` — "Inscrever pessoa" `{ userDataId }` (PersonPicker; já confirmada, ignora o prazo; já inscrita → 409; lotado → 409)
- `PATCH /api/admin/courses/:id/registrations/confirm-all` — "Confirmar todas" → `{ confirmed }`
- `POST /api/admin/courses/:id/start` — "Confirmar início" (diálogo avisa quantas inscrições faltam confirmar; não impede) → status `IN_PROGRESS`
- `PATCH /api/admin/courses/:id/complete` — "Concluir curso" no diálogo do curso (só em andamento; senão 409) → `{ id, status: 'COMPLETED' }`
- `PATCH /api/admin/registrations/:id/attendance` — presença `{ attended: true | false | null }` → `{ id, attended }` (`useSetRegistrationAttendance`, atualização otimista)
- `PATCH /api/admin/courses/:id/registrations/attendance` — "Todos presentes" `{ attended: true }`: só confirmadas ainda sem marcar → `{ updated }`
- Aba Inscrições: WhatsApp (`wa.me/55…`) e Ligar por linha, "Copiar telefones"/"Copiar e-mails" de todas as inscrições (`lib/contact-links.ts`, `lib/copy-text.ts`)

**Usuários (admin)**
- `GET /api/admin/users` — lista (paginado + filtros; `search` ignora acento e maiúscula — "joao" acha "João" — e aceita CPF com ou sem máscara)
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
- `GET /api/admin/companies` — lista paginada (search nome/e-mail/CNPJ sem diferenciar acento, type PRIVATE|PUBLIC, isPartner)
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
- `PATCH /api/admin/contacts/messages/:id/unread` — marcar como não lida (rota própria: a auditoria diz qual foi; mande corpo `{}`)
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

**Reservas de sala (agenda)** — eventos e reuniões; READ/CREATE/UPDATE/DELETE_COURSE; horário de parede no ISO (igual aos cursos)
- `GET /api/admin/room-bookings?from&to[&roomId][&type=EVENT|MEETING][&search]` — reservas (responsável = pessoa ou nome, `seriesId`)
- `GET /api/admin/room-schedule?from&to[&roomId]` — cursos + reservas (`kind` COURSE|EVENT|MEETING)
- `POST /api/admin/room-bookings` (`repeat: { frequency: WEEKLY|MONTHLY, until }` opcional) → `{ ids, seriesId }` · `PATCH /:id` (só esta data) · `DELETE /:id?scope=one|future` — sala ocupada → 409 com a mensagem do conflito

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
- `GET /api/admin/audit-logs` — trilha de auditoria (paginado; `action=create|edit|delete|export|login|login_failed`, `ip` exato). Cada linha traz `summary`, a frase pronta ("Iniciou o curso "HORTA"", "Tentativa de login falhou (usuário "x")", montada no backend); a tela só a exibe. O filtro "Tipo" lista as entidades do backend (`lib/audit-entity.ts`, inclui "Login")
- Cada linha também traz de onde veio — `ip`, `location` ("Terra Roxa, PR, Brasil", aproximado pelo IP; o backend consulta o ipwho.is), `device` ("Chrome no Windows"), `userAgent` — e `changes` (`[{ field, before, after }]` em edições/exclusões; senha trocada = `password` "alterada", sem valor). Linhas antigas: tudo null. Tentativas de login ficam na trilha (LOGIN, LOGIN_FAILED, LOGIN_BLOCKED), com o usuário digitado e nunca a senha

**Exportação CSV** — `POST /api/admin/export/:dataset` (corpo JSON; GET com query também existe) (planilha `;` com BOM, abre no Excel; cada exportação vai para a auditoria como "Exportou")
- Datasets: `people`, `companies`, `properties` (`ownerIds`), `unimed` (READ_USER) · `admins` (READ_USER_ADMIN) · `courses`, `registrations` (`courseIds`) (READ_COURSE) · `contact-messages` (READ_CONTACT) · `audit-logs` (READ_AUDIT) · `room-bookings` (READ_COURSE; from/to/roomId/type/search)
- `ids=a,b` = selecionados ou um registro; sem `ids` = mesmos filtros da listagem
- Telas: checkboxes + "Exportar" em Associados, Empresas, Administradores, Unimed, Cursos (cards), Mensagens; ícone de download por linha; "Exportar" no detalhe de pessoa/empresa/curso/mensagem; botão na Auditoria e na aba Inscrições do curso

**Convites de admin**
- `POST /api/admin/invites` — gera convite (pessoa + regra → token)
- `GET /api/invites/:token` — dados do convite (público)
- `POST /api/invites/:token/accept` — ativa acesso (define username/senha)

**Financeiro (admin)** — gated por `*_FINANCE`; valor sempre em centavos (Int)
- `GET /api/admin/finance/categories` (?all=true inclui inativas) · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET /api/admin/finance/accounts` (caixas; ?all=true) · `POST` · `PATCH /:id` · `DELETE /:id`
- `GET /api/admin/finance/transactions` — paginado + filtros (from, to, type, categoryId, accountId, search); `totals: { incomeCents, expenseCents }` de todos os filtrados (não só a página; sem transferências nem "só nota", como no summary)
- `GET /api/admin/finance/transactions/export` — CSV (respeita filtros)
- `POST /api/admin/finance/transactions` · `PATCH /:id` · `DELETE /:id`
- `POST /api/admin/finance/transfers` — transferência entre caixas (2 lançamentos ligados)
- `POST /api/admin/finance/transactions/:id/attachments` — comprovante (multipart)
- `GET /api/admin/finance/attachments/:id` (download inline) · `DELETE /api/admin/finance/attachments/:id`
- `GET /api/admin/finance/summary?from=&to=` — KPIs + por categoria + por mês + saldo por caixa

**Notificações (admin)** — sino do painel; pendências conforme as permissões de quem está logado
- `GET /api/admin/notifications` — `{ unreadCount, pendingCount, events: [{ id, type, title, body, link, createdAt, read }], pending: [{ type, title, body, count, link, severity: info|warning }] }` (avisos dos últimos 30 dias)
- `PATCH /api/admin/notifications/read` — `{ ids?: string[] }` (sem ids = todos) → `{ updated }`

**Utilitário**
- `GET /api/address/cep/:cep` — lookup CEP (ViaCEP + cache local)

## Estado Atual (setembro/2026)

- Auth **funcional** — login/logout integrados com backend real.
- Cursos **integrados com API real** — CRUD completo (criar, editar, deletar, banner, galeria, instrutores, inscrições).
- Usuários admin: detalhe completo com propriedades/relacionamentos paginados, upload de avatar, promoção a instrutor.
- Banners e mensagens de contato implementados. Datas do banner valem no horário de Brasília (entra à 0h do início, sai às 23h59 do término; a migration `20260919120000_banner_dates_brasilia` corrigiu as gravadas em UTC). Criar banner com imagem que falha: um aviso só e o painel reabre na edição do banner.
- **DatePicker** (`ui/date-picker.tsx`): campo digitável dd/mm/aaaa com botão de calendário ao lado; mesmas props e valor `YYYY-MM-DD` (ou `""` enquanto o texto não é uma data válida — o campo fica vermelho ao sair).
- **Redes sociais** (Configurações do site): o WhatsApp é digitado como telefone ((44) 99999-9999) e salvo como `https://wa.me/55…`; link colado também serve. "Alterações não salvas" e Salvar só com mudança.
- Notícias, salas, admins e parceiros implementados.
- **Empresas separadas de pessoas** (set/2026): `Company` tem vínculos N:N com pessoas (`CompanyMember`, cada um com título livre, ex.: SOCIO, CONTADOR), propriedades próprias (endereços; `Property` pertence a uma pessoa OU a uma empresa) e a parceria (antes flags em `UserData`). Lista na aba "Empresas" de `/admin/usuarios`. O CNPJ saiu do formulário de pessoa; as colunas `cnpj`/`isPartner`/`partner*` de `UserData` foram removidas (valores antigos de CNPJ e de tipo de membro fora da lista foram para as observações do associado). A migration criou uma empresa para cada pessoa ativa que era parceira ou tinha CNPJ, com a pessoa como RESPONSAVEL.
- Dashboard admin **implementado** — stats + calendário + lista de cadastros incompletos (não é mais stub). Calendário: cursos (lista de cursos) e, com `READ_COURSE`, eventos/reuniões de `GET /admin/room-schedule` para os dias visíveis (mesma chave de cache da Agenda); bolinhas separadas (Cursos / Eventos e reuniões) e lista do dia pela hora com horário, sala e selo de tipo (Curso/Evento/Reunião). Reserva abre `/admin/agenda?week=<segunda-feira do dia>`; curso continua sem link.
- **Notificações** (set/2026): sino no topo da barra lateral (embaixo do logo com a barra recolhida) e no topo da tela no celular. Número = avisos não lidos + pendências `warning` ("9+" acima de 9). Painel com "Pendências" (calculadas no backend; importantes primeiro, em âmbar) e "Avisos" (30 dias; clicar marca como lido e abre o `link`; "Marcar todas como lidas"). Links abrem pelo roteador (`navigate({ href })`, só caminhos `/admin`): `/admin/cursos?curso=<id>&aba=inscricoes`, `/admin/usuarios?incomplete=true` ou `?tab=admins` (a tela de usuários acompanha a URL mesmo já aberta), `/admin/configuracoes?tab=...`, `/admin/mensagens`, `/admin/cotacoes`, `/admin/agenda` (reservas de sala de hoje). Alertas de pendência não ficam no painel geral.
- Trilha de auditoria e convites de admin implementados.
- **Ajustes de cadastro (set/2026)**: tipo de membro é select (Aluno, Produtor rural, Trabalhador rural assalariado/autônomo; o backend recusa valor fora da lista); CAD/PRO até 5; salas com nome de lista fixa; empresa com razão social (`name`), nome fantasia (`tradeName`, exibido quando houver — `companyDisplayName`) e endereço da sede no próprio cadastro (CEP com busca).
- **Cotações**: produtos fixos; o admin só lança preço (centavos) e período manhã/tarde; a data é a do dia; a unidade de cada produto é escolhida na mesma tela (saca 60/50/40 kg, tonelada, quilo, arroba ou sem unidade) e só é salva no "Salvar cotações", junto com os preços (PATCH das unidades alteradas, depois PUT daily se houver preço; erro mostrado por produto). Preço >20% diferente do último lançado abre confirmação ("Corrigir" / "Salvar mesmo assim"); "Repetir último" preenche o preço anterior; Enter no preço vai para o próximo (não envia). Home mostra preço + unidade + dia/período + fonte (editável no admin de cotações) e linka para `/cotacoes` (histórico em gráfico/tabela).
- **Exportação** (set/2026): tudo que tem lista no painel exporta em CSV — selecionados, todos com os filtros atuais ou um registro só (ver "Exportação CSV" acima). A planilha de inscrições do curso agora vem do backend.
- **E-mail e telefone de pessoa** (set/2026): podem repetir entre pessoas (casal, família) e o e-mail é opcional (`UserData.email: string | null`; vazio vai como null). Só o CPF identifica a pessoa e só ele dá "já cadastrado" (409 "CPF já cadastrado para outra pessoa."). Cadastro novo, ficha e inscrição pública no site não exigem e-mail (no site aparece "(opcional)"); telefone continua obrigatório. Onde o e-mail aparece (listas, contatos públicos, inscrições, PDFs) sem e-mail não mostra nada ou "—", e `mailto:` só sai quando há e-mail.
- **Inscrições de curso**: selos "Associado" (situação ativa e validade em dia), "Parceira" (vínculo com empresa parceira ativa), cargo na diretoria e cargo de contato público; o CSV traz as mesmas colunas.
- **Presença e "Concluído"** (set/2026): o curso inicia mesmo com inscrição não confirmada. Depois que começou (em andamento, concluído ou chegou o dia do início), cada inscrição confirmada tem os botões "Presente"/"Faltou" (clicar de novo desmarca), "Todos presentes" e a contagem "X presentes · Y faltas · Z sem marcar". **Certificados só para inscrição confirmada que não foi marcada como falta.** "Lista de presença" gera o PDF para assinar. O CSV de inscrições tem a coluna "Presença". Status `COMPLETED` ("Concluído") é sempre manual ("Concluir curso" num curso em andamento; a edição permite voltar): fora da lista do site, página abre pelo link e nunca aceita inscrição (bloqueio "ended", como curso terminado).
- **Página do curso** (`/cursos/$id`): prazo de inscrição vale até o fim do dia em Brasília, ou até a hora quando o painel informou (`registrationDeadlineTime`, "HH:MM"; 00:00/null = dia inteiro; a página mostra "Inscrições até DD/MM/AAAA às HH:MM") e o curso aceita inscrição até o último dia; status `IN_PROGRESS`, curso terminado, prazo vencido ou lotado desligam "Inscrever-se" com o motivo — regra em `utils/course-status.ts`, a mesma do backend e do card. "Não existe" só com 404; outra falha mostra "Tentar de novo". No celular há barra presa ao pé (sticky) com preço e botão. CPF é conferido (dígitos) antes de seguir; formulário com algo digitado não fecha tocando fora/Esc (o X pede confirmação); menor de idade ganha link do `/termo-autorizacao-menor.pdf`. Depois de inscrever (ou se já estava inscrito, 409 "User already registered…" vira tela amigável): resumo, "Adicionar à agenda" (.ics + Google Agenda), "Enviar para meu WhatsApp" e telefone do sindicato.
- **Home**: os números (associados, cursos realizados, anos, alunos) saíram. As galerias de fotos (História do Sindicato, FAEP, Patrulha Rural) ficam só na página Sobre (#galeria) — o usuário pediu para NÃO ter seção de galerias na home.
- **Configurações do site** (`/admin/configuracoes`): centraliza o que é do site público — Dados do sindicato (telefone, e-mail, endereço, horário, busca do mapa e texto do Sobre; usados no rodapé, Contato, Sobre e convênios via `useOrgInfo`), Redes sociais, Galerias, Parceiros da home (adicionar empresa, logo, link, ordem, tirar) e Contatos públicos ("Nossa Equipe": qualquer pessoa do cadastro, com cargo e ordem). Permissões: Dados/Redes/Galerias `*_BANNER`; Parceiros e Contatos `*_USER`. A empresa não tem mais aba Parceria e o diálogo de admin não marca mais contato público — ambos apontam para cá.
- **Convênios**: cada convênio ativo é um item próprio no menu do header público (entre Notícias e Sobre; sem submenu — pedido do usuário, são poucos); cada um tem página em `/convenios/$slug` (tabela de valores por faixa, documentos para adesão, destaques e texto). Conteúdo 100% editável em `/admin/convenios` (`ConvenioEditor` + `ConvenioPageView` compartilhado com a pré-visualização). Hooks em `useConvenios.ts`. Unimed semeado com os dados da página antiga (`ruraltr.com.br/pgs/print_unimed.php`). Regras com `UPDATE_BANNER` receberam as permissões `*_CONVENIO` na migration.
- **Financeiro** (admin): lançamentos de caixa (valor em centavos Int), categorias, dashboard, comprovantes (anexo em Bytes no banco), export CSV, multi-caixa e transferência entre caixas, relatório PDF do período. Gated por `READ/CREATE/UPDATE/DELETE_FINANCE`. Filtros dos lançamentos vivem na URL (search params). Aba Lançamentos: totais (Entradas, Saídas, Saldo) dos filtros atuais vindos do backend (`totals`); "Registrar e novo" (mantém data/tipo/categoria/caixa/método); "Repetir" por linha (novo lançamento copiado, data de hoje, sem comprovantes nem números da nota); remover comprovante pede confirmação.
- **Agenda das salas** (`/admin/agenda`, set/2026): semana seg–dom (7 colunas em tela larga, um cartão por dia no celular) com cursos, eventos e reuniões; item de vários dias aparece em cada dia; selo com texto e cor por tipo; Hoje / semana anterior / próxima, filtro de sala e de tipo na URL. Curso abre `/admin/cursos?curso=<id>`; reserva abre o `BookingDialog` (Tipo, Título, Sala, Data, Início/Término, "Termina em outro dia", responsável do cadastro ou nome digitado, descrição, repetir toda semana/todo mês até uma data — só ao criar). 409 (sala ocupada) aparece dentro do diálogo. Reserva de uma repetição: editar muda só a data; excluir pergunta "Só esta data" / "Esta e as próximas". Visão Lista: só eventos/reuniões da semana, busca, Editar/Excluir e exportar CSV. Ao editar, campos opcionais vazios vão como `null`. Item "Agenda das salas" na barra lateral (depois de Cursos) e na paleta Ctrl+K.
- Deploy em produção via Docker (Dockerfile + docker-compose.prod.yml; servidor Node/Fastify em `server/index.mjs`).
- **Conexão fraca / site público (set/2026)**: consultas repetem até 2x em falha de rede/5xx; home, listas, cotações e notícia mostram "Não foi possível carregar" + "Tentar de novo" (nunca "nenhum curso" quando a API falhou; notícia só diz "não existe" em 404); 404/erro/carregamento em português no router; cards de curso usam `coverImageThumb` (cursos antigos: capa inteira) e descrição sem markdown; faixa de cotações parada e rolável no toque; botão flutuante do WhatsApp; alvos de toque de 44px no menu e chamadas do site.

## Comandos

```bash
# Desenvolvimento
npm run dev      # dev server (Vite) → http://localhost:5173
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # preview do build
npm run lint     # ESLint

# Produção (manual VPS)
cp .env.production.example .env.production
# editar .env.production com BACKEND_URL real (usado em runtime pelo server/index.mjs
# para as meta OpenGraph; as chamadas da SPA usam o VITE_API_URL do build)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Convenções

- Alias `@/` aponta para `src/`
- Componentes shadcn ficam em `src/components/ui/`
- Arquivo de rota exporta só `Route`: componente ou helper exportado de lá (e `validateSearch` com zod) não é dividido pelo `autoCodeSplitting` e vai para o bundle inicial do site público — coloque em `src/components`/`src/lib`
- Lista suspensa dentro de `Dialog`: marque o contêiner com `data-escape-owner` enquanto aberta (Esc fecha só a lista; ver `ui/dialog.tsx`)
- Rotas públicas sob `_public/`, admin sob `_admin/`
- `routeTree.gen.ts` regenerado automaticamente ao salvar rotas — **nunca editar manualmente**
- Todas chamadas API passam por `API_BASE` (`/api` com proxy do Vite em dev; `VITE_API_URL` direto em prod)
- Datas ISO da API → `formatDateFromString()` para exibição
- Máscaras de input em `src/utils/masks.ts` (CPF, telefone)
- CPF é gravado só com dígitos (o backend normaliza): para exibir, sempre `maskCPF(cpf)`
- Formulários: React Hook Form + Zod schemas centralizados em `src/lib/schemas.ts`
- Erros HTTP: `apiFetch` lança `ApiError` (de `@/lib/api`) — sempre usar `instanceof ApiError` no catch para acessar `e.status`
- Dados paginados: shape `PaginatedResponse<T>` de `useAdmin.ts` — `{ data, total, page, totalPages, limit }`
