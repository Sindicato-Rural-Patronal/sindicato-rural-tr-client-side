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
/noticias                   → _public/noticias.tsx
/noticias/$id               → _public/noticias/$id.tsx
/sobre                      → _public/sobre.tsx
/contato                    → _public/contato.tsx
/login                      → login.tsx
/admin                      → _admin/admin/index.tsx (redirect → /admin/cursos)
/admin/cursos               → _admin/admin/cursos/index.tsx (CRUD completo)
/admin/cursos/$id           → _admin/admin/cursos/$id.tsx (upload banner)
/admin/usuarios             → _admin/admin/usuarios/index.tsx
/admin/salas                → _admin/admin/salas/index.tsx
/admin/administradores      → _admin/admin/administradores/index.tsx
/admin/regras               → _admin/admin/regras/index.tsx
/admin/dashboard            → _admin/admin/dashboard.tsx (stub)
```

Layouts pai:
- `_public.tsx` — Header + Footer público
- `_admin.tsx` — Sidebar admin (AdminSideBar), token-gated (valida JWT + expiração)

`routeTree.gen.ts` é **gerado automaticamente** pelo TanStack Router — não editar manualmente.

## Estrutura de Arquivos

```
src/
├── @types/
│   └── course.ts                    # Tipo Curso (entidade principal)
├── components/
│   ├── ui/                          # shadcn/ui (27 componentes: button, card, dialog, form, table, tabs, etc.)
│   ├── PublicHeader.tsx             # Nav pública responsiva (sticky, mobile menu)
│   ├── public-footer.tsx            # Footer
│   ├── adminSideBar.tsx             # Sidebar admin com seções de nav
│   ├── nav-user.tsx                 # Dropdown do usuário (logout)
│   ├── nav-main.tsx                 # Itens de nav da sidebar
│   ├── home-hero-section.tsx        # Banner hero
│   ├── home-static-section.tsx      # Stats (StatsSection)
│   ├── home-courses-section.tsx     # Carrossel de cursos (CoursesSection)
│   ├── course-card.tsx              # CourseCard + CourseCardSimple (carousel-aware)
│   ├── StatusBadge.tsx              # Badge PUBLICO | PRIVADO | NAO_PUBLICADO
│   ├── LanguageToggle.tsx           # Toggle 🇧🇷 PT / 🇺🇸 EN (i18n)
│   ├── ErrorAlert.tsx               # Alerta de erro
│   └── EmptyState.tsx               # Placeholder estado vazio
├── context/
│   └── AuthContext.tsx              # Token em localStorage; expõe token, baseUrl='/api', login(), logout()
├── hooks/
│   ├── useCourse.ts                 # useAdminCourses, useCourses, useCourse, useCreateCourse,
│   │                                #   useUpdateCourse, useDeleteCourse, useUploadBanner,
│   │                                #   useUploadGalleryPhoto, useRegisterCourse, useDeleteGalleryPhoto
│   ├── useAdmin.ts                  # useAdminStats, useAdminUsers, useAdminAdmins, useAdminRules,
│   │                                #   useCreateRule, useCreateAdmin, useCreateWorker,
│   │                                #   useCourseRegistrations, useCancelRegistration
│   ├── useRooms.ts                  # useRooms, useCreateRoom
│   ├── use-users.ts                 # authenticateUser(username, password) → POST /api/auth/login
│   └── use-mobile.ts                # useIsMobile (breakpoint hook)
├── lib/
│   ├── api.ts                       # apiFetch(url, options) e apiUpload(url, formData) — injetam Bearer token;
│   │                                #   401 → limpa token + redireciona /login
│   ├── query-client.ts              # Instância QueryClient
│   ├── schemas.ts                   # Schemas Zod: pessoaSchema, roomSchema, adminSchema, courseBaseSchema
│   └── utils.ts                     # cn() helper (clsx + tailwind-merge)
├── routes/                          # File-based routing
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD → DD/MM/YYYY)
│   └── masks.ts                     # maskCPF, maskPhone
└── main.tsx                         # Entry: QueryClientProvider → AuthProvider → RouterProvider
```

## Internacionalização (i18n)

- **Biblioteca**: `react-i18next` + `i18next-browser-languagedetector`
- **Config**: `src/i18n/index.ts`
- **Locales**: `src/i18n/locales/pt-BR.ts` (default) e `src/i18n/locales/en.ts`
- **Persistência**: `localStorage` key `sindicato-lang`
- **Toggle**: componente `src/components/LanguageToggle.tsx` — exibe 🇧🇷 PT / 🇺🇸 EN
  - Presente no `PublicHeader` (desktop + mobile) e no `AdminSideBar` (footer)
- **Padrão**: `pt-BR`; fallback: `pt-BR`

Uso em componentes:
```typescript
const { t } = useTranslation()
// t('nav.courses'), t('admin.courses.form.title'), etc.
```

## Tipo Principal: `Course`

Definido em `src/@types/course.ts`. Dois tipos:

**`ApiCourse`** — shape do backend (campos em português):
```typescript
titulo, modulo, numeroEvento, dataInicio, dataTermino, horarioInicio,
horarioFim, inscricoesAte, local, instrutorId, instrutorNome,
cargaHoraria, descricaoBreve, descricaoCompleta, status, valor,
minimoAlunos, maximoAlunos, observacoes, imagemCapa, galeriaFotos[],
inscritos, preInscritos, listaEspera
```

**`Course`** — shape do frontend (campos em inglês), usado em toda a UI:
```typescript
id, title, module, eventNumber, startDate, endDate, startTime, endTime,
registrationDeadline, location, instructorId, instructorName,
workloadHours, shortDescription, fullDescription,
status: "PUBLICO" | "PRIVADO" | "NAO_PUBLICADO",
price, minStudents, maxStudents, notes, coverImage,
gallery: { id, url, caption }[], enrolled, preEnrolled, waitingList
```

**`Curso = ApiCourse`** — alias `@deprecated` para compatibilidade.

**Mapeamento** feito em `src/@types/course.ts`:
```typescript
mapCourse(api: ApiCourse): Course   // titlo→title, valor→price, etc.
mapCourses(list: ApiCourse[]): Course[]
```
Os hooks em `useCourse.ts` aplicam o mapeamento automaticamente antes de retornar dados.

## Auth

- **`AuthContext`** — token JWT persiste em `localStorage`. Expõe `token`, `baseUrl`, `login(token)`, `logout()`.
- **`AuthProvider`** wrapa toda a app em `main.tsx`.
- **`authenticateUser(username, password)`** em `use-users.ts` — POST `/api/auth/login`, retorna JWT.
- Layout `_admin.tsx` faz parse do JWT e valida expiração; redireciona para `/login` se inválido.
- `apiFetch()` / `apiUpload()` em `lib/api.ts` injetam `Authorization: Bearer {token}` em toda chamada.
- Resposta 401 em qualquer chamada → limpa token + redireciona para `/login`.
- Login redireciona para `/admin/cursos`. Logout redireciona para `/`.

## Backend / Proxy

- Backend em `http://localhost:3000`.
- Vite proxy: `/api/*` → `http://localhost:3000/*` (strip `/api`). Elimina CORS em dev.
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

**Admin geral**
- `GET /api/admin/dashboard/stats` — stats
- `GET /api/admin/users` — usuários
- `GET /api/admin/users/admins` — admins
- `POST /api/admin/users` — criar admin/funcionário
- `GET /api/admin/courses/:id/registrations` — inscrições do curso
- `DELETE /api/admin/registrations/:id` — cancelar inscrição
- `GET /api/admin/rules` — regras
- `POST /api/rules` — criar regra

**Salas**
- `GET /api/rooms` — lista
- `POST /api/rooms` — criar

## Estado Atual (maio/2026)

- Auth **funcional** — login/logout integrados com backend real.
- Cursos **integrados com API real** — `useCourse.ts` usa `apiFetch` para todos os endpoints.
- CRUD completo de cursos no admin (criar, editar, deletar, banner, galeria, inscrições).
- Gerenciamento de usuários, salas, admins e regras implementados.
- Dashboard admin é **stub vazio** — dados de stats existem na API mas a página não os exibe.
- `fetchPost.ts` é **legado** — não usado, pode ser removido.

## Comandos

```bash
npm run dev      # dev server (Vite) → http://localhost:5173
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # preview do build
npm run lint     # ESLint
```

## Convenções

- Alias `@/` aponta para `src/`
- Componentes shadcn ficam em `src/components/ui/`
- Rotas públicas sob `_public/`, admin sob `_admin/`
- `routeTree.gen.ts` regenerado automaticamente ao salvar rotas — **nunca editar manualmente**
- Todas chamadas API usam prefixo `/api/` (proxy Vite → `localhost:3000`)
- Datas ISO da API → `formatDateFromString()` para exibição
- Máscaras de input em `src/utils/masks.ts` (CPF, telefone)
- Formulários: React Hook Form + Zod schemas centralizados em `src/lib/schemas.ts`
