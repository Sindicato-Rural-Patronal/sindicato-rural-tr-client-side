# CLAUDE.md — Sindicato Rural de Terra Roxa

## Projeto

Site institucional do **Sindicato Rural de Terra Roxa** (Paraná, Brasil). Plataforma pública com cursos agrícolas, notícias e informações institucionais, mais área admin interna completa.

Este arquivo tem as regras e o mapa para quem vai implementar. **O histórico de cada tela** (o que foi feito, quando, por quê e o que já foi tentado e não funcionou) está em `docs/HISTORICO.md`: leia antes de refazer algo que parece estranho.

## Stack

| Ferramenta | Versão | Uso |
|---|---|---|
| React | 19.2 | UI |
| TypeScript | 6.0 | Tipagem |
| Vite | 8 | Build/dev server |
| Vitest + Testing Library | 4.1 | Testes (jsdom) |
| TanStack Router | 1.x | Roteamento file-based (`autoCodeSplitting`) |
| TanStack Query | 5.x | Data fetching e cache |
| Tailwind CSS | 4.x | Estilos |
| shadcn/ui (Radix Nova) | — | Componentes base (`src/components/ui/`) |
| React Hook Form + Zod | 7.x / 4.x | Só no formulário de curso (ver "Padrões do código") |
| Lucide React | — | Ícones |
| Embla Carousel | 8.x | Carrossel |
| @uiw/react-md-editor | 4.x | Editor markdown (descrições de cursos) |
| React Markdown + remark-gfm | 10.x | Renderização markdown (notícias, ajuda) |
| react-i18next | 17.x | Parte dos textos em pt-BR (`t()`); sem troca de idioma |
| @react-pdf/renderer | 4.x | Todos os PDFs (carregado só no clique) |
| @dnd-kit | 6.x / 10.x | Arrastar blocos do Painel Geral |
| sonner | 2.x | Toasts |
| react-day-picker | 10.x | Calendário do DatePicker |
| react-easy-crop | 6.x | Recorte de imagem |

## Comandos

```bash
npm run dev       # dev server (Vite) → http://localhost:5173
npm run lint      # ESLint
npm run test:run  # Vitest, uma rodada
npm run build     # tsc -b + vite build → dist/ (o tsc -b compila os TESTES junto)
```

Verificação antes de dar uma tarefa por pronta: `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit` e `npm run test:run`. O `tsc -b` regrava o `tsconfig.tsbuildinfo`, que é versionado: se ele mudar, não o adicione. `npm run coverage` não funciona (falta o `@vitest/coverage-v8`).

Produção é pelo Coolify, que builda o `Dockerfile`. Caminho manual (VPS):

```bash
cp .env.production.example .env.production
# editar .env.production com a BACKEND_URL real (obrigatória)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Estrutura de Rotas

```
/                           → _public/index.tsx (home: banner, cotações, cursos, eventos, notícias, parceiros)
/cursos                     → _public/cursos/index.tsx
/cursos/$id                 → _public/cursos/$id.tsx (detalhe + inscrição)
/eventos                    → _public/eventos.tsx (eventos publicados, agrupados por mês)
/noticias                   → _public/noticias/index.tsx
/noticias/$id               → _public/noticias/$id.tsx
/sobre                      → _public/sobre.tsx (texto de Configurações + sede + galeria com todas as fotos em #galeria)
/cotacoes                   → _public/cotacoes.tsx (histórico: um gráfico por produto, 30/90/180/365 dias, visão tabela)
/contato                    → _public/contato.tsx
/convenios                  → _public/convenios/index.tsx (cartões dos convênios ativos)
/convenios/$slug            → _public/convenios/$slug.tsx (tabela de valores, documentos, sobre)
/cotacao                    → cotacao.tsx (tela enxuta das cotações do dia, no espírito da página
                              antiga /mobile/cotacao.php: logo, data, um cartão por produto e o dólar
                              à parte; FORA do layout _public. Sem botão de copiar/compartilhar — para
                              mandar em grupo basta copiar o endereço. O servidor injeta a prévia do
                              link com os preços, ver server/cotacao-resumo.mjs)
/login                      → login.tsx
/convite/$token             → convite/$token.tsx (público: ativar acesso de admin por convite; depois vai
                              para /login?redirect=/admin/ajuda)
/admin                      → _admin/admin/index.tsx (redireciona p/ /admin/dashboard)
/admin/dashboard            → _admin/admin/dashboard.tsx (só liga a URL à tela; o painel é DashboardPage):
                              ações rápidas, números que pedem ação, aviso das cotações, Financeiro do mês,
                              calendário + agenda das salas, cursos públicos, cadastros incompletos, últimas ações;
                              ?dia=AAAA-MM-DD&sala=<id>&tipo=COURSE|EVENT|MEETING&nova=reserva; "Personalizar" blocos
/admin/cursos               → _admin/admin/cursos/index.tsx (CRUD em diálogos: criar, editar, duplicar, inscrições;
                              ?curso=<id>&aba=inscricoes abre a janela do curso; ?ano=<ano> é o filtro de ano,
                              SEPARADO da busca por texto; os anos vêm de GET /admin/courses/years)
/admin/noticias             → _admin/admin/noticias/index.tsx
/admin/usuarios             → _admin/admin/usuarios/index.tsx (abas ?tab=pessoas (padrão)|associados|empresas|admins;
                              ?page, ?q, ?incomplete=true; "Possíveis duplicados"; regras e convites na aba admins)
/admin/usuarios/novo        → _admin/admin/usuarios/novo.tsx (cadastro novo de pessoa; exige CREATE_USER)
/admin/usuarios/$id         → _admin/admin/usuarios/$id.tsx (ficha completa; aba "Empresas" = vínculos;
                              ?completar=1 abre "Completar cadastro")
/admin/empresas/novo        → _admin/admin/empresas/novo.tsx (criar empresa; exige CREATE_USER)
/admin/empresas/$id         → _admin/admin/empresas/$id.tsx (abas Dados / Pessoas / Propriedades)
/admin/banners              → _admin/admin/banners.tsx (período em dias de Brasília; selo Agendado/No ar/Expirado/Inativo)
/admin/mensagens            → _admin/admin/mensagens.tsx (responder por e-mail/WhatsApp, marcar como não lida)
/admin/unimed               → _admin/admin/unimed.tsx (beneficiários do plano; o formulário é
                              components/unimed/UnimedFormDialog.tsx; Ficha/Termo/Contrato em PDF)
/admin/cotacoes             → _admin/admin/cotacoes/index.tsx (lançamento do dia: produtos fixos, preço + manhã/tarde;
                              unidade por produto; fonte)
/admin/configuracoes        → _admin/admin/configuracoes.tsx (?tab=dados|redes|galerias|parceiros|contatos|salas)
/admin/convenios            → _admin/admin/convenios/index.tsx (lista de convênios)
/admin/convenios/novo       → _admin/admin/convenios/novo.tsx (editor, criação)
/admin/convenios/$id        → _admin/admin/convenios/$id.tsx (editor com pré-visualização)
/admin/auditoria            → _admin/admin/auditoria/index.tsx (trilha; linha abre IP, local, navegador e "O que mudou";
                              filtros na URL, inclusive ?ip=; "Configurações da trilha" só com UPDATE_AUDIT)
/admin/financeiro           → _admin/admin/financeiro/index.tsx (?tab=dashboard|lancamentos|recorrentes|categorias|
                              caixas|formas|fechamento)
/admin/minha-conta          → _admin/admin/minha-conta.tsx (abas Perfil — foto, nome, usuário, senha — e Preferências — tema;
                              link no menu do usuário e na paleta Ctrl+K)
/admin/ajuda                → _admin/admin/ajuda/index.tsx (Central de Ajuda; ?topico=<id>&q=<busca>) — DO CHAT DE AJUDA
/admin/administradores      → redireciona p/ /admin/usuarios
/admin/salas                → redireciona p/ /admin/configuracoes?tab=salas
/admin/galerias             → redireciona p/ /admin/configuracoes?tab=galerias
```

Layouts pai:
- `_public.tsx` — Header + Footer público + botão flutuante do WhatsApp
- `_admin.tsx` — Sidebar admin (AdminSideBar), token-gated (valida JWT + expiração); no celular, topo com SidebarTrigger + sino de notificações; monta `CommandPalette` e `LeaveConfirmHost`

`routeTree.gen.ts` é **gerado automaticamente** pelo TanStack Router — não editar manualmente.

## Estrutura de Arquivos

`src/lib/help/**` e `src/routes/_admin/admin/ajuda/` são do **chat de Ajuda**: não editar daqui.

```
server/                              # Servidor do container (Node + Fastify, porta 80) — ver "Backend / Proxy"
├── index.mjs                        # SPA + proxy /api/* + meta OpenGraph em /cursos/:id, /noticias/:id, /cotacao
├── backend-url.mjs                  # backendUrlFrom(env): BACKEND_URL obrigatória em produção, sem padrão
├── raw-body.mjs                     # Corpo cru do proxy, BODY_LIMIT de 16 MB (acima dos 15 MB do backend)
├── markdown-text.mjs                # Descrição sem markdown (mesmas regras de src/lib/markdown-text.ts)
└── cotacao-resumo.mjs               # Prévia do link de /cotacao (mesma regra de src/lib/cotacao-resumo.ts)
docs/HISTORICO.md                    # Histórico das telas (o "porquê" das decisões)
src/
├── @types/
│   ├── course.ts                    # Course, CourseInstructor (shape da API, campos em inglês)
│   └── news.ts                      # News, blocos de conteúdo (parágrafo, imagem, imagem+texto), NewsStatus
├── components/
│   ├── ui/                          # shadcn/ui; date-picker.tsx (digitável dd/mm/aaaa), native-select.tsx,
│   │                                #   pagination.tsx (componente Pagination), dialog.tsx (data-escape-owner)
│   ├── LoadErrorRetry.tsx           # PADRÃO de falha ao carregar (site e painel): mensagem + "Tentar de novo";
│   │                                #   variant "inline" para faixas, selects e listas suspensas
│   ├── EmptyState.tsx               # Vazio de verdade (prop `topico` liga à ajuda)
│   ├── ErrorAlert.tsx               # Erro de formulário/ação (não de carregamento)
│   ├── NoPermission.tsx             # "Sem permissão" + "Por que não vejo esta tela?"; se as permissões não
│   │                                #   carregaram, mostra LoadErrorRetry em vez disso
│   ├── RouteErrorPage.tsx           # defaultErrorComponent: "Tentar de novo" (router.invalidate) + "Ir para o início"
│   ├── NotFoundPage.tsx             # 404 em português (lazy): com cabeçalho/rodapé quando fora do layout; em /admin leva ao painel
│   ├── PageLoader.tsx               # defaultPendingComponent (rota demorando a carregar)
│   ├── PublicHeader.tsx             # Nav pública (sticky; logo-icon.png; convênios como itens próprios; menu mobile abaixo de lg;
│   │                                #   ThemeToggle)
│   ├── public-footer.tsx            # Footer: 4 colunas (logo-full.png, links, contato via useOrgInfo, chamada);
│   │                                #   "Acesso ao painel" é link discreto na linha de baixo
│   ├── WhatsAppFloatingButton.tsx   # Botão flutuante do WhatsApp (só com WhatsApp nas Configurações; some abaixo de lg em /cursos/$id)
│   ├── home-hero-section.tsx        # Banner hero (some sem banner; falha = linha com "Tentar de novo")
│   ├── home-cotacoes-section.tsx    # Faixa de cotações (preço, unidade, dia/período, fonte, link histórico)
│   ├── home-courses-section.tsx     # Carrossel de cursos (CoursesSection)
│   ├── home-events-section.tsx      # "Próximos eventos" (só quando há evento publicado)
│   ├── home-news-section.tsx        # Notícias na home
│   ├── course-card.tsx              # CourseCard + CourseCardSimple (carousel-aware)
│   ├── StatusBadge.tsx              # Selo do status do curso
│   ├── GalleryLightbox.tsx          # Fotos de uma galeria em tela cheia (página Sobre)
│   ├── adminSideBar.tsx             # Sidebar admin (favicon.ico como marca); sino ao lado do logo; itens por permissão
│   ├── nav-user.tsx                 # Menu do usuário: Minha conta, sair (limpa o cache do React Query)
│   ├── CommandPalette.tsx           # Ctrl+K: busca de telas (NAV_ITEMS de lib/command-palette.ts, filtrados por permissão)
│   ├── notifications/NotificationBell.tsx # Sino (avisos não lidos + pendências warning): Popover no computador,
│   │                                #   Sheet no celular; abre o link pelo roteador
│   ├── ThemeToggle.tsx              # Claro/escuro no cabeçalho público
│   ├── ThemeSetting.tsx             # Claro/escuro/sistema em Minha conta (chave `theme` no localStorage; main.tsx aplica)
│   ├── PersonPicker.tsx             # Busca de pessoa do cadastro (lista suspensa; "Cadastrar nova pessoa" em outra aba, só com CREATE_USER)
│   ├── PasswordInput.tsx            # Campo de senha com mostrar/ocultar (repassa `ref`)
│   ├── PasswordStrengthHint.tsx     # Força da senha: barra + rótulo + até 2 dicas; só orienta, nunca bloqueia
│   ├── InitialsAvatar.tsx           # Foto ou iniciais
│   ├── ImageCropDialog.tsx          # Recorte de imagem (banners, notícias)
│   ├── DeleteConfirmDialog.tsx      # Confirmação de exclusão
│   ├── confirm-close-dialog.tsx     # "Descartar alterações?" + LeaveConfirmHost (useUnsavedGuard)
│   ├── PermissionButton.tsx         # Botão condicional por permissão
│   ├── AgeHint.tsx                  # Idade calculada (em vermelho, com aviso, se menor de 18)
│   ├── CadproFields.tsx             # Lista de CAD/PRO do associado (até 5)
│   ├── ajuda/                       # AjudaLink ("?" ao lado do título de cada tela) e HelpPage — DO CHAT DE AJUDA
│   ├── agenda/                      # Agenda das salas (dentro do Painel Geral): AgendaSection (Dia/Semana, busca, exportar,
│   │                                #   imprimir, nova reserva, ocupação), AgendaItem, WeekAgenda, RoomOccupancy (lista escrita
│   │                                #   até 640px, faixa 07:00–22:00 acima — `@container`, não a largura da tela), BookingDialog,
│   │                                #   DeleteBookingDialog (só esta / esta e as próximas), KindBadge, OnSiteBadge
│   ├── auditoria/                   # AuditRowDetails (IP, local, navegador, "O que mudou"), AuditRetentionPanel (tempo de
│   │                                #   guarda: o select só aparece com o ajuste carregado)
│   ├── cadastro/                    # person-form-fields.tsx: CADA CAMPO do cadastro de pessoa, desenhado UMA vez
│   │                                #   (PersonField + FieldRow + SelectField); CameraDialog (foto pela câmera no cadastro);
│   │                                #   cadastros repetidos: MergePeopleDialog, DuplicatePeopleList, merge-people.ts;
│   │                                #   empresas: CompaniesList, CompanyForm, CompanyMembersPanel, PersonCompanies;
│   │                                #   PropertiesManager (propriedades/endereços de pessoa e empresa; lápis só com `onUpdate`;
│   │                                #   `loadError` mostra a falha em vez de "Nenhuma propriedade")
│   ├── conta/PerfilTab.tsx          # Aba Perfil de Minha conta: foto, nome, usuário; trocar a senha pede a senha atual
│   ├── convenio/                    # ConvenioEditor (admin) e ConvenioPageView (página pública e pré-visualização)
│   ├── cotacoes/                    # QuoteHistoryChart (gráfico SVG), QuoteDayCard e CotacaoSimples (tela /cotacao)
│   ├── courses/                     # CourseFormDialog (criar/editar/duplicar — fora do arquivo da rota para o editor de
│   │                                #   markdown não ir ao bundle inicial), PhotoGrid; RegistrationDialog (inscrição pelo
│   │                                #   site em /cursos/$id: CPF + 4 últimos dígitos do telefone → confirmar cadastro ou
│   │                                #   formulário novo; fora do arquivo da rota para poder ser testado)
│   ├── dashboard/                   # Painel Geral: DashboardPage (a tela inteira), StatsRow, QuickActions, QuotesNoticeLine,
│   │                                #   FinanceMonthCard, PublicCoursesCard, IncompleteUsersCard, RecentAuditCard,
│   │                                #   EditModeBar + EditableBlock (modo de organizar), dashboard-prefs.ts (ordem/largura/
│   │                                #   escondidos), dashboard-drag.ts (prévia do arrasto, pura e testada), quotes-notice.ts,
│   │                                #   course-capacity.ts (vagas), month-range.ts (mês atual em Brasília)
│   ├── export/                      # ExportMenu (selecionados / todos com filtros / extras; CSV ou PDF), ExportOneButton,
│   │                                #   SelectCheckbox, SelectionInfo; BulkDeleteButton (exclusão em massa)
│   ├── financeiro/                  # Abas que saíram do arquivo da rota: ClosingTab (fechamento), RecurringTab,
│   │                                #   PaymentMethodsTab, PaymentMethodSelect (select com "+ Nova forma")
│   ├── galerias/                    # GalleryAlbumCard (fotos, legenda, ordem), GalleryAlbumDialog
│   ├── site-config/                 # Abas de Configurações: OrgInfoPanel (dados do sindicato + texto do Sobre),
│   │                                #   SocialLinksPanel, GalleriesPanel, PartnersPanel (+ PartnerEditDialog),
│   │                                #   PublicContactsPanel, RoomsPanel
│   └── unimed/                      # PersonUnimedTab (aba Unimed da ficha da pessoa); UnimedFormDialog (cadastrar/editar
│                                    #   beneficiário — edição só com o cadastro carregado, formulário zerado ao fechar)
├── context/AuthContext.tsx          # Token em localStorage; token, baseUrl (= API_BASE), login(), logout(); useSessionRenewal
├── hooks/                           # Ver "Hooks"
├── i18n/                            # index.ts (lng fixo pt-BR) e locales/pt-BR.ts
├── lib/
│   ├── api.ts                       # API_BASE, ApiError (status), apiFetch / apiUpload (Bearer; 401 → login)
│   ├── public-fetch.ts              # publicGet<T>(path): GET de rota pública SEM token; erro HTTP = Error("HTTP nnn")
│   ├── api-error-message.ts         # apiErrorMessage: mensagem do backend → português (inclui 413 e 429 pelo status)
│   ├── registration-errors.ts       # Erros da inscrição pelo site: registrationErrorMessage (429 do CPF mostra o texto do
│   │                                #   servidor), isAlreadyRegistered, isCannotConfirmRegistration (409 → link do WhatsApp)
│   ├── login-error.ts               # loginErrorMessage: senha errada / 429 / sistema fora do ar / sem internet
│   ├── auth-token.ts                # JWT no navegador: validade, renovação, safeAdminRedirect, loginHref
│   ├── auth-guard.ts                # requirePermission (guarda de rota; lê o cache de meQuery)
│   ├── query-client.ts              # QueryClient: staleTime 60s, gcTime 5min, retry shouldRetryQuery, sem refetch no foco
│   ├── query-retry.ts               # shouldRetryQuery (até 2x em rede/5xx, nunca 4xx) + errorStatus
│   ├── command-palette.ts           # NAV_ITEMS e openCommandPalette()
│   ├── schemas.ts                   # courseBaseSchema (usado); pessoaSchema e roomSchema (sem uso)
│   ├── export.ts                    # downloadExport(dataset, params, 'csv'|'pdf') → POST /admin/export/:dataset
│   ├── relatorio-pdf.tsx            # PDF da exportação: a MESMA planilha do CSV, montada para o papel
│   ├── bulk-delete.ts               # "Excluir selecionados": apaga em lotes e conta o que deu certo
│   ├── csv-parse.ts                 # Lê o CSV do backend de volta (o PDF da exportação sai dele)
│   ├── person-fields.ts             # Campos de pessoa como DADO: PERSON_LABELS, PERSON_FIELD_NAMES, READ_MODE_FIELD
│   ├── person-validation.ts         # validatePersonFields (mesmas regras do backend), firstInvalidField, focusFieldById
│   ├── user-form-options.ts         # Opções dos selects do cadastro de pessoa
│   ├── cin.ts                       # CPF_LABEL ("CPF / CIN") e CIN_HINT
│   ├── member-types.ts              # MEMBER_TYPES e MEMBER_STATUS (listas fixas, iguais às do backend) + memberTypeLabel
│   ├── membership.ts                # isActiveMember (selo "Associado")
│   ├── room-names.ts                # ROOM_NAMES (lista fixa, igual à do backend)
│   ├── unimed-options.ts            # UNIMED_MOVEMENT_TYPES, UNIMED_DEPENDENCY_DEGREES (listas fixas) + unimedOptionsWith
│   ├── unimed-docs.ts               # Baixa Ficha/Termo/Contrato pelo id; unimed-{ficha,termo,contrato}-pdf.tsx,
│   │                                #   unimed-pdf-assets.ts, unimed-pdf-utils.ts
│   ├── org-contact.ts               # Dados padrão do sindicato (fallback) + phoneDigits
│   ├── agenda.ts                    # Agenda das salas: horário de parede, itens de vários dias (occupiedDays — a MESMA regra
│   │                                #   para curso e reserva), dia/semana, ocupação das salas, formulário de reserva
│   ├── agenda-pdf.tsx               # "Imprimir" da agenda
│   ├── dashboard-agenda.ts          # parseDashboardSearch (?dia&sala&tipo&nova) e kindDays
│   ├── calendar-links.ts            # .ics, Google Agenda e WhatsApp do curso
│   ├── course-duplicate.ts          # roomIdByName (a API devolve o NOME da sala) e courseToDuplicateForm ("Duplicar curso")
│   ├── lista-presenca-pdf.tsx       # Lista de presença (uma folha por dia)
│   ├── ficha-inscricao-pdf.tsx      # Ficha de inscrição do curso
│   ├── nota-empenho-pdf.tsx (+assets), relatorio-empenho.ts, relatorio-empenho-pdf.tsx, extenso-legado.ts
│   │                                # Nota de empenho e "Relatório de despesas" no formato em papel do sindicato
│   ├── finance-report-pdf.tsx       # Relatório financeiro do período
│   ├── finance-month.ts             # Meses do Financeiro (fechamento, recorrências)
│   ├── news-schedule.ts             # Agendamento de notícia (relógio de Brasília)
│   ├── public-events.ts             # Eventos públicos: agrupar por mês, rótulo da data
│   ├── quote-utils.ts, quote-price-check.ts # Cotações: rótulos/unidades/período; aviso de variação >20%
│   ├── cotacao-resumo.ts            # diaDaCotacao/resumoDaCotacao (a mesma regra do server/cotacao-resumo.mjs)
│   ├── banner-dates.ts              # Período do banner em dias de Brasília; bannerState (mesma regra do GET /banners)
│   ├── convenio-utils.ts            # Helpers puros de Convênios (slug, valores), da página pública e do editor
│   ├── audit-fields.ts              # "O que mudou": rótulos dos campos e formatação dos valores
│   ├── password-strength.ts         # passwordStrength (nunca impede salvar)
│   ├── relative-time.ts             # "agora", "há 5 min", "ontem"…
│   ├── markdown-text.ts             # Markdown → texto corrido (cards e prévias)
│   ├── site-whatsapp.ts, whatsapp-field.ts, contact-links.ts, copy-text.ts # WhatsApp, ligar, copiar
│   ├── table-sticky-actions.ts      # Coluna de ações presa à direita nas tabelas
│   └── utils.ts                     # cn() (clsx + tailwind-merge)
├── routes/                          # File-based routing
├── test/                            # Testes (Vitest): components/, forms/, hooks/, lib/, utils/, *.render.test.tsx (PDFs)
├── utils/
│   ├── format-data-from-string.ts   # formatDateFromString (YYYY-MM-DD ou ISO → DD/MM/YYYY, sem fuso)
│   ├── dates.ts                     # toIso, toYmd(date), todayYmd() (fuso local)
│   ├── date-input.ts                # maskDateBr, parseDateBr, ymdToBr — do DatePicker
│   ├── course-status.ts             # getCourseSituation, getRegistrationBlock, hasCourseEnded… — dia em Brasília, igual ao backend
│   ├── course-attendance.ts         # Presença: contagens, courseDays, sortByName
│   ├── masks.ts                     # maskCPF, maskCNPJ, maskPhone, maskCEP, maskRG, maskCNH, maskCNS, maskMoney,
│   │                                #   moneyToCents, centsToBRL, unmaskDigits
│   ├── cpf.ts, cnpj.ts              # Validação (CPF comparado só pelos dígitos)
│   ├── age.ts, extenso.ts, format-currency.ts, text-format.ts (upperNoAccents)
│   ├── download.ts                  # saveBlob, openBlob, fileSlug
│   ├── resize-image.ts              # resizeToSquare (avatar)
│   ├── safe-url.ts, escape-html.ts  # Link digitado pelo admin; texto dinâmico em dangerouslySetInnerHTML
└── main.tsx                         # Tema salvo, recarga única depois de deploy, router com telas padrão em português
```

## Padrões do código

- Alias `@/` aponta para `src/`. Rotas públicas sob `_public/`, admin sob `_admin/`.
- **Arquivo de rota exporta só `Route`**: componente ou helper exportado de lá (e `validateSearch` com zod) não é dividido pelo `autoCodeSplitting` e vai para o bundle inicial do site público. Coloque em `src/components`/`src/lib`. É também o que permite testar: diálogo ou aba que precisa de teste sai do arquivo da rota (ex.: `UnimedFormDialog`, `conta/PerfilTab`).
- **Erro não é vazio.** Toda consulta tem três estados: carregando, vazio e erro. O vazio ("Nenhum X", R$ 0,00, "todos completos", "sem permissão") só aparece com `!isError`. Com erro e sem dado nenhum aparece `LoadErrorRetry` com `onRetry={() => void refetch()}` e `retrying={isFetching}`; em select, faixa ou lista suspensa, `variant="inline"`. Seção opcional (banner, parceiros, eventos da home) continua sumindo quando não há conteúdo, mas a falha vira uma linha com "Tentar de novo". Na lista suspensa de busca, embrulhe o aviso num `onMouseDown={e => e.preventDefault()}` para o campo não perder o foco.
- **Formulário que carrega um registro para editar** só deixa salvar com o registro carregado: com o detalhe em erro, aviso + "Salvar" desligado, e o formulário é zerado ao fechar. Senão salvar grava campos vazios por cima (aconteceu na Unimed).
- **Rota pública** (sem login) usa `publicGet` de `lib/public-fetch.ts`, sem token: um token velho guardado no navegador não pode deslogar nem redirecionar o visitante. Nunca transforme erro em lista vazia (`r.ok ? r.json() : []`).
- Chamadas do painel passam por `apiFetch`/`apiUpload` (`lib/api.ts`). Erro HTTP é `ApiError` com `status`: use `instanceof ApiError` no catch. Para mostrar, `apiErrorMessage(e, 'fallback')`.
- Dados paginados: `PaginatedResponse<T>` de `hooks/useAdmin.ts` — `{ data, total, page, totalPages, limit }`.
- **Formulários**: só o `CourseFormDialog` usa React Hook Form + Zod (`courseBaseSchema` de `lib/schemas.ts`). Os outros usam `useState` com validação à mão (pessoa: `lib/person-validation.ts`). Ao mexer num formulário, siga o padrão que ele já usa.
- **Textos**: o sistema é **só em português** (sem seletor de idioma). Parte dos textos (login, site público, cursos, erros da API) está em `src/i18n/locales/pt-BR.ts`, lida com `t('chave')`; as telas mais novas do painel (financeiro, unimed, painel, agenda, configurações…) têm o texto direto no JSX. Os dois convivem: siga o que a tela já usa. `src/test/lib/i18n.test.ts` confere que toda chave usada em `t('...')` existe.
- Máscaras e dinheiro em `src/utils/masks.ts`. Valor em dinheiro é sempre **centavos inteiros** (financeiro, convênios, cotações): `moneyToCents`/`centsToBRL`, nada de float.
- Datas ISO da API → `formatDateFromString()` para exibir (não usa fuso).
- Lista suspensa dentro de `Dialog`: marque o contêiner com `data-escape-owner` enquanto aberta (Esc fecha só a lista; ver `ui/dialog.tsx`).
- `routeTree.gen.ts` regenerado automaticamente — **nunca editar manualmente**.
- Avisos conhecidos só de desenvolvimento (ignorar nas baterias de navegador): "Cannot update a component while rendering a different component" (React Hook Form + React 19.3) e "This library called use() to suspend in a previous render…" (TanStack Router + React 19.3).

## Regras de negócio que valem no código

O porquê de cada uma está em `docs/HISTORICO.md`.

- **Relógio de Brasília** em tudo que é "dia": prazo de inscrição (até o fim do dia, ou até `registrationDeadlineTime`), curso terminado, banner no ar (0h do início às 23h59 do fim), notícia agendada, "hoje" do painel. As regras ficam em `utils/course-status.ts`, `lib/banner-dates.ts`, `lib/news-schedule.ts` e espelham as do backend.
- **Horário de parede**: cursos e reservas guardam o horário como ISO com `Z`, mas ele é a hora de Brasília escrita (`lib/agenda.ts`: `wallDate`/`wallTime`/`toWallIso`). Não converta fuso.
- **Pessoa**: só o CPF identifica (gravado só com dígitos; exibir com `maskCPF`). E-mail é opcional; e-mail e telefone podem repetir entre pessoas; telefone é obrigatório. RG é opcional (a CIN usa o CPF), mas validado quando preenchido. Onde se DIGITA o número, o rótulo é "CPF / CIN" (`lib/cin.ts`); onde só se exibe, "CPF".
- **Campos de pessoa num lugar só**: cada campo é desenhado uma vez em `components/cadastro/person-form-fields.tsx`; as duas telas (`usuarios/novo` e `usuarios/$id`) só escolhem quais e em que cartão. `src/test/forms/cadastro-pessoa.test.ts` exige que todo campo do associado esteja nas duas.
- **Caixa alta**: `upperNoAccents` nos campos de cadastro (nomes, endereços, razão social). Texto que o visitante lê sai **como foi digitado**: título e observações do curso, título da reserva que vai para `/eventos`.
- **Listas fixas duplicadas com o backend**: `ROOM_NAMES`, `MEMBER_TYPES`, `MEMBER_STATUS`, `UNIMED_MOVEMENT_TYPES`, `UNIMED_DEPENDENCY_DEGREES`. Mudou uma, mude a outra; o teste que compara os dois repositórios mora no backend (`src/lib/__tests__/listas-fixas_test.ts`).
- **Edição com campo opcional vazio**: na reserva, vai como `null`. No curso (`buildCourseBody` em `lib/course-body.ts`), prazo de inscrição, observações e número do evento esvaziados na edição vão como `null` (fora do PATCH a API mantém o valor antigo); preço, carga horária e mínimo de alunos esvaziados ainda NÃO são enviados — pendente, depende da API (SR-019). A criação nunca manda `null`.
- **Curso**: inicia mesmo com inscrição não confirmada; `COMPLETED` é sempre manual; o sistema NÃO emite certificado (quem emite é a FAEP).
- **Home**: sem seção de galerias (ficam no Sobre, pedido do usuário); convênios são itens próprios no menu, sem submenu.
- **Painel Geral — arrastar blocos**: a prévia do arrasto anda só por `transform` (`dashboard-drag.ts`) e a ordem real só muda no `onDragEnd`. Não use as estratégias prontas do `@dnd-kit` nem reordene no `onDragOver`: as duas coisas já foram tentadas e quebram (blocos esticados; blocos se alternando sem parar). Grade de 4 colunas, bloco de 2 a 4 (`DashboardSpan`); preferências antigas `'full'`/`'half'` viram 4 e 2 em `normalizePrefs`.
- **Ajuda**: cada tela do menu tem um "?" (`AjudaLink topico="<artigo>"`) ao lado do título; um teste exige que o artigo exista. Os artigos são do chat de Ajuda.
- **Upload**: o proxy do container aceita até 16 MB; o backend, até 15 MB. Foto de galeria e comprovante vão sem redução.

## Auth e permissões

- **`AuthContext`** — token JWT em `localStorage`; `token`, `baseUrl`, `login(token)`, `logout()`. `AuthProvider` envolve a app em `main.tsx`. Logout (`nav-user.tsx`) também limpa o cache do React Query.
- **Login** (`login.tsx`): `authenticateUser` (`hooks/use-users.ts`) faz `POST /auth/login` com fetch cru (um 401 ali é senha errada, não sessão vencida) e lança `ApiError` com o status. `loginErrorMessage` (`lib/login-error.ts`) escolhe a mensagem: 4xx → "Usuário ou senha inválidos."; 429 → "Muitas tentativas seguidas. Espere alguns minutos…" (o backend bloqueia depois de 10 tentativas em 5 min por IP); 5xx (inclusive o 502 do proxy) → "O sistema está fora do ar…"; sem resposta → "Sem conexão…".
- Layout `_admin.tsx` valida o JWT (`lib/auth-token.ts`); inválido → `/login?redirect=<tela atual>`. Login volta ao `?redirect` só se for caminho do painel (`safeAdminRedirect`), senão `/admin/dashboard`.
- `apiFetch()` / `apiUpload()` injetam `Authorization: Bearer`; resposta 401 → limpa o token e vai para `/login?redirect=<tela atual>`.
- Token vale 8h; renovação só até 24h depois do login. `useSessionRenewal()` (usado no `_admin.tsx`) confere a cada clique/tecla (no máx. a cada 30s) e, passada a metade da validade, chama `POST /auth/refresh`; falha não faz nada.
- **Permissões**: `useMe` e a guarda de rota leem a MESMA consulta (`meQuery` em `hooks/useAdmin.ts`, chave `['admin','me']`, staleTime 5 min).
  - `requirePermission(perm)` (`lib/auth-guard.ts`), no `beforeLoad` da rota: sem a permissão → `/admin/dashboard`; 401 → login; **falha ao conferir (rede, 5xx) lança erro** e o roteador mostra a tela de erro com "Tentar de novo" — não é "sem permissão". Usado em banners, convênios, cursos, empresas, mensagens, notícias, unimed, usuários e `usuarios/novo` (CREATE_USER).
  - `usePermissions()` → `can`, `cannot`, `isLoading`, `perms` e `isError`/`retry`/`retrying`. Com `isError`, `can` responde false, mas a tela não deve dizer "sem permissão": o `NoPermission` já mostra a falha com "Tentar de novo", e o Painel Geral avisa que blocos podem faltar.
  - A sidebar mostra todos os itens enquanto as permissões não carregaram.
- **Minha conta** (`components/conta/PerfilTab.tsx`): trocar a senha manda `password` + `currentPassword`. A tela confere antes que a senha atual foi preenchida e que a nova tem 8+ caracteres (para não gastar as 10 tentativas por 5 min da rota). 400 "Senha atual incorreta." / "Informe a senha atual…" aparece embaixo do campo. Nome e usuário sozinhos não pedem a senha.
- **Alterações não salvas**: `const allowLeave = useUnsavedGuard(active)` (`hooks/use-unsaved-guard.ts`) pergunta "Sair sem salvar?" ao ir para outro caminho; só search params não pergunta. Chame `allowLeave()` logo antes do `navigate()` pós-salvar/criar/excluir.
- **Busca de telas**: `CommandPalette` (Ctrl+K ou "Buscar…" no topo da sidebar); busca ignora acentos/maiúsculas e exige todas as palavras.

## Backend / Proxy

- **Base da API**: `API_BASE` em `src/lib/api.ts` = `VITE_API_URL` (embutido no build) ou, sem ele, `/api`. `baseUrl` do contexto é esse mesmo valor.
- **Dev**: sem `VITE_API_URL`, as chamadas vão para `/api/*` e o proxy do Vite encaminha para `VITE_BACKEND_URL` (padrão `http://localhost:3000`, o único padrão de endereço que existe), tirando o `/api`.
- **Prod**: o `Dockerfile` builda **sem** `VITE_API_URL` (ARG vazio de propósito), então a SPA chama `/api` na própria origem (sem CORS). O container roda `node server/index.mjs` (Fastify na porta 80), que:
  - encaminha `/api/*` para `BACKEND_URL` tirando o prefixo, com o corpo cru até **16 MB** (`server/raw-body.mjs`; acima disso, 413, que a tela mostra em português). Backend fora do ar → 502;
  - serve o `dist/` como SPA (rota desconhecida → `index.html`; asset em `assets/` que não existe → 404, para a aba velha recarregar depois de deploy);
  - em `/cursos/:id`, `/noticias/:id` e `/cotacao`, busca os dados em `BACKEND_URL` e injeta as meta OpenGraph (prévia de link no WhatsApp/redes).
- **`BACKEND_URL` é obrigatória e não tem padrão** (`server/backend-url.mjs`): com `NODE_ENV=production` (o Dockerfile define), sem ela ou com um endereço que não seja http(s), o servidor não sobe e o log diz por quê; fora de produção sobe, mas `/api` responde 502. O `docker-compose.prod.yml` também para sem ela. Antes o padrão era a API de staging, e a produção sem a variável gravaria dado real no banco de staging. **Cada ambiente do Coolify define a sua.**
- O proxy repassa o `X-Forwarded-For` que recebeu e não acrescenta o IP de quem conectou. O IP que a API enxerga (limite de login, auditoria) depende da topologia do Coolify — risco 4 de `../orquestracao/decisoes/000-mapa-da-arquitetura.md`.
- Passar `VITE_API_URL` como build arg volta ao comportamento antigo (navegador falando direto com o backend; o proxy fica sem uso).
- O `index.html` traz uma tela de carregamento (logo + spinner, CSS inline) dentro de `#root`, trocada pelo React no primeiro render.

## Tipos principais

**`Course`** (`src/@types/course.ts`) — shape da API, campos em inglês, sem mapeamento:
```typescript
id, status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS' | 'COMPLETED',
title, description, maxStudents, minStudents, enrolled, preEnrolled, waitlist,
coverImage: string | null, coverImageThumb?: string | null (WebP ~640px p/ cards; null → coverImage),
price, startDate, endDate, startTime, endTime, workloadHours, location, instructorName,
registrationDeadline: string | null (dia), registrationDeadlineTime?: string | null ("HH:MM"; null = dia inteiro),
observations: string | null, eventNumber: string | null,
photoGallery: { id, url, caption }[], instructors: CourseInstructor[]
```

**`CourseInstructor`** — `{ id, userDataId, title, category, name, bio, avatar, linkedin, instagram, facebook }` (`id` = id da atribuição, usado no DELETE; `userDataId` = a pessoa).

**`News`** (`src/@types/news.ts`) — notícia com `status: 'PUBLISHED' | 'UNPUBLISHED'`, `publishAt` (agendamento) e conteúdo em blocos (parágrafo, imagem, imagem+texto).

**Tipos de `hooks/useAdmin.ts`**:
```typescript
PaginatedResponse<T>    // { data: T[], total, page, totalPages, limit }
AdminMe                 // { userId, userDataId, username, name, avatar, rulesId, ruleName, permissions, dashboardPrefs? }
DashboardStats          // números do Painel Geral (cada bloco só vem com a permissão)
UserData / UserDataDetail // pessoa; o detalhe inclui properties, userInstructor e companyMemberships
                        //   (`address` está @deprecated: o endereço mora nas propriedades)
UserProperty, UserRelation, UserInstructor, UserAdmin, Rule, PendingInvite
InstructorItem, PublicContactItem, PublicPartner, ContactMessage, Registration, CEPResult
```

## Hooks

**`useAdmin.ts`** (com o endpoint de cada um):
```
meQuery / useMe             → GET /admin/me (inclui permissions e dashboardPrefs)
useUpdateMe                 → PATCH /admin/me { name?, username?, password?, currentPassword? }
useUploadMyAvatar           → POST /admin/me/avatar
useUpdateDashboardPrefs     → PATCH /admin/me/preferences { dashboardPrefs: { hidden, order, sizes } }
useAdminStats               → GET /admin/dashboard/stats
useAdminUsers               → GET /admin/users (paginado + filtros; mantém a lista anterior; 2º arg { enabled })
useAdminAdmins              → GET /admin/users/admins
useAdminRules               → GET /admin/rules · useCreateRule POST /rules · useUpdateRule PATCH /rules/:id · useDeleteRule DELETE /rules/:id
useCreateAdminInvite        → POST /admin/invites · useAdminInvites GET /admin/invites · useRevokeAdminInvite DELETE /admin/invites/:id
useUpdateWorker / useDeleteWorker → PATCH / DELETE /users/:id (a PESSOA; sem /admin)
useUpdateAdmin / useDeleteAdmin   → PATCH / DELETE /admin/users/:id (o acesso de administrador)
useCourseRegistrations      → GET /admin/courses/:id/registrations (paginado)
useCancelRegistration       → DELETE /admin/registrations/:id
useConfirmRegistration      → PATCH /admin/registrations/:id/confirm
useStartCourse              → POST /admin/courses/:id/start
useUploadRegistrationFicha / useDeleteRegistrationFicha / openRegistrationFicha → POST / DELETE / GET /admin/registrations/:id/ficha
useAdminUser                → GET /admin/users/:id
useUserProperties           → GET /admin/users/:id/properties · useCreate/Update/DeleteUserProperty
useUploadAvatar             → POST /admin/users/:id/avatar
useUserRelations            → GET /admin/users/:id/relations · useCreate/DeleteUserRelation
useInstructors              → GET /admin/instructors
usePromoteInstructor / useUpdateInstructor / useRemoveInstructor → POST / PATCH / DELETE /admin/users/:id/instructor
useCEPLookup                → GET /address/cep/:cep
usePublicContacts           → GET /contacts (público)
usePartners                 → GET /partners (público, publicGet)
useContactMessages          → GET /admin/contacts/messages · useMarkContactMessageRead PATCH …/:id · useDeleteContactMessage
useSendContactMessage       → POST /contacts/message (público, fetch cru)
```

**Os outros arquivos de `hooks/`**:
- `useCourse.ts` — admin: `useAdminCourses` (`status`, `search`, `year`), `useCourseYears`, `useAdminCourse` (`adminCourseQuery`), criar/editar/excluir, capa, galeria, instrutores (`useAssignInstructor`, `useRemoveInstructorAssignment`), inscrições (`useAllCourseRegistrations`, `useAdminRegisterPerson`, `useConfirmAllRegistrations`), presença (`useSetRegistrationAttendance`, `useMarkUnmarkedAttendance`), `useCompleteCourse`; público: `useCourses`, `useCourse`, `useLookupCpf` (POST, CPF + 4 últimos dígitos), `useRegisterByCpf` (`{ cpf, phoneEnd }`), `useRegisterFull`.
- `useNews.ts` — `useNews`, `useNewsDetail` (públicos), `useAdminNews` (`status`, `search`), criar/editar/excluir, `useUploadNewsBanner`, `useUploadNewsBlockImage`.
- `useBanner.ts` — `useBanners` (público, publicGet), `useAdminBanners`, criar/editar/excluir, imagem, `useReorderBanners`.
- `useCompanies.ts` — empresas: lista, detalhe, CRUD, vínculos (members; pela pessoa: `useLinkPersonToCompany`/`useUnlinkPersonFromCompany`), propriedades, parceria (`useSetCompanyPartner`, `useReorderPartners`, `useUploadCompanyPartnerLogo`), títulos (`useCompanyMemberTitles`, `COMMON_MEMBER_TITLES`), `companyDisplayName`.
- `useFinance.ts` — categorias, caixas, lançamentos (+ export CSV, transferência, comprovantes), recorrências, formas de pagamento, fechamentos e `useFinanceSummary`.
- `useUnimed.ts` — `useUnimedList`, `useUnimedByPerson`, `useUnimed`, criar/editar/excluir.
- `useConvenios.ts` — `useConvenioMenu`, `usePublicConvenio` (públicos), admin CRUD e logo.
- `useGalleries.ts` — `usePublicGalleries` (publicGet), admin CRUD, fotos (upload, legenda, ordem).
- `useMarketQuotes.ts` — `useMarketQuotes`, `useQuoteHistory` (públicos), `useAdminMarketQuotes`, `useSaveDailyQuotes`, `useUpdateQuoteUnit`.
- `useSiteSettings.ts` — `usePublicSiteSettings`, `useAdminSiteSettings`, `useUpdateSiteSettings`, `useUpdateQuotesSource`, `useOrgInfo` (com fallback de `lib/org-contact.ts`).
- `usePublicContactsAdmin.ts`, `usePublicEvents.ts`, `useRooms.ts` (CRUD; `GET /rooms` exige READ_COURSE, então o Painel Geral chama `useRooms({ enabled })` só com a permissão), `useRoomBookings.ts` (`useRoomBookings`, `useRoomSchedule`, CRUD), `useAuditTrail.ts` (trilha + tempo de guarda), `useNotifications.ts` (a cada 60s e ao voltar à aba), `useInvite.ts` (`useInvite`, `useAcceptInvite`, fetch cru).
- Utilitários: `usePermissions`, `use-unsaved-guard`, `useRowSelection` (seleção que continua entre páginas), `useCrudDialog`, `useDebouncedValue`, `useConfirmDeletePhoto`, `useSeo`, `use-mobile`, `use-users` (`authenticateUser`, `refreshAuthToken`).

## API — Endpoints

Os caminhos abaixo são os que o front chama, relativos a `API_BASE` (`/api` no navegador; o proxy tira o prefixo).

**Auth**
- `POST /auth/login` — `{ username, password }` → `{ token }` (JWT de 8h). 401 = credenciais erradas; 429 = mais de 10 tentativas em 5 min por IP
- `POST /auth/refresh` — `Authorization: Bearer <token ainda válido>`, sem corpo → `{ token }` novo (401 se vencido, admin removido ou login há mais de 24h)

**Cursos (público)**
- `GET /courses?page&limit[&ended=include|exclude]` — cursos `PUBLIC` do site. **Ordem (SR-016, back `edde21b`)**: primeiro os que não terminaram (em andamento e próximos, do início mais cedo para o mais tarde), depois os terminados (do mais recente para o mais antigo). "Terminou" = o dia do fim já passou em Brasília (a mesma regra da inscrição). `ended=include` (padrão) traz os terminados no fim; `ended=exclude` deixa só os que não terminaram — é o que a home usa (`useCourses({ ended: 'exclude' })`); `/cursos` pede o padrão e filtra/ordena no cliente, com o filtro "Encerrados"
- `GET /courses/:id` — detalhe
- `POST /users/lookup-cpf` `{ cpf, phoneEnd }` (`phoneEnd` = 4 últimos dígitos de um telefone do cadastro) → `{ found, name }` (nome mascarado). `found: true` só com CPF **e** telefone batendo; qualquer outro caso é `{ found: false, name: null }`, igual para "sem cadastro" e "telefone errado". POST para o CPF não ir na URL
- `POST /courses/:id/register-by-cpf` `{ cpf, phoneEnd }`: inscreve quem já tem cadastro; CPF sem cadastro ou telefone errado → o mesmo 404 "Não encontramos cadastro com este CPF e telefone."
- `POST /courses/:id/register-full` — inscrição de quem não tem cadastro (dados + endereço; e-mail opcional). Se o CPF já tem cadastro, só inscreve quando o `phone` é um dos telefones dele; senão 409 "Não foi possível confirmar seu cadastro pelo site. Procure o Sindicato…" (a tela mostra o link do WhatsApp)
- Os três: 5 erros por hora no mesmo CPF → 429 "Muitas tentativas com este CPF…". `registrationErrorMessage` (`lib/registration-errors.ts`) mostra a mensagem do servidor, que o `apiErrorMessage` trocaria pelo texto genérico do login

**Cursos (admin)**
- `GET /admin/courses` (`page`, `limit`, `status`, `search`, `year`) · `GET /admin/courses/years` · `GET /admin/courses/:id`
- `POST /courses` — criar (aceita `eventNumber`, `minStudents`, `roomId`). "Duplicar curso" manda `copyCoverFromCourseId` e `copyInstructorsFromCourseId` + `instructorAssignmentIds`; resposta `{ id, coverCopied?, instructorsCopied? }`. Galeria não é copiada
- `PATCH /courses/:id` — atualizar (`registrationDeadline` aceita `null`; `workloadHours` e `minStudents` não) · `DELETE /courses/:id`
- `POST /courses/:id/banner` (multipart; gera a miniatura WebP → `{ url, thumbUrl }`) · `POST /courses/:id/gallery` · `DELETE /courses/:id/gallery/:photoId`
- `POST /admin/courses/:id/instructors` · `DELETE /admin/courses/:id/instructors/:assignmentId`
- `GET /admin/courses/:id/registrations` (paginado) · `POST /admin/courses/:id/registrations` `{ userDataId }` ("Inscrever pessoa": já confirmada, ignora o prazo; repetida ou lotado → 409)
- `DELETE /admin/registrations/:id` · `PATCH /admin/registrations/:id/confirm` · `PATCH /admin/courses/:id/registrations/confirm-all` → `{ confirmed }`
- `POST /admin/registrations/:id/ficha` (multipart) · `GET` · `DELETE` — ficha de inscrição escaneada
- `POST /admin/courses/:id/start` → `IN_PROGRESS` · `PATCH /admin/courses/:id/complete` (só em andamento; senão 409) → `COMPLETED`
- `PATCH /admin/registrations/:id/attendance` `{ attended: true | false | null }` · `PATCH /admin/courses/:id/registrations/attendance` `{ attended: true }` ("Todos presentes": só confirmadas sem marcar) → `{ updated }`

**Pessoas e administradores (admin)**
- `GET /admin/users` — lista (paginado + filtros; `search` ignora acento e maiúscula e aceita CPF com ou sem máscara; `incompleteRegistration`, `activeMember`…)
- `GET /admin/users/:id` — detalhe · `GET /admin/users/admins`
- `POST /users` (CREATE_USER) — cadastro novo de pessoa; `PATCH /users/:id` · `DELETE /users/:id` — editar/excluir a pessoa
- `PATCH /admin/users/:id` · `DELETE /admin/users/:id` — o acesso de administrador (usuário, senha, regra). Admin novo entra por convite
- `GET/POST /admin/users/:id/properties` · `PATCH/DELETE /admin/users/:id/properties/:propId`
- `GET/POST /admin/users/:id/relations` · `DELETE /admin/users/:id/relations/:relId`
- `POST /admin/users/:id/avatar` (multipart)
- `GET /admin/users/duplicates?limit=50` · `GET /admin/users/merge-preview?ids=a,b` · `POST /admin/users/merge` `{ keepId, removeId }` (DELETE_USER + UPDATE_USER)
- `GET /admin/instructors` · `POST` / `PATCH` / `DELETE /admin/users/:id/instructor` — promover, editar, rebaixar instrutor

**Empresas (admin)** — reusa as permissões `*_USER`; CNPJ só com dígitos, único entre empresas ativas
- `GET /admin/companies` (search nome/e-mail/CNPJ sem diferenciar acento, `type` PRIVATE|PUBLIC, `isPartner`) · `GET /admin/companies/titles` · `GET /admin/companies/:id`
- `POST /admin/companies` · `PATCH /admin/companies/:id` (inclui `tradeName`, `address` da sede — null/vazio remove —, parceria e `primaryPropertyId`) · `DELETE /admin/companies/:id` (soft)
- `POST /admin/companies/:id/members` `{ userDataId, title }` · `PATCH /members/:memberId` `{ title }` · `DELETE /members/:memberId`
- `POST /admin/companies/:id/properties` · `PATCH` / `DELETE /admin/companies/:id/properties/:propertyId`
- `POST /admin/companies/:id/partner-logo` — multipart (300×150, PNG); `PATCH` com `partnerLogo: null` remove

**Admin geral**
- `GET /admin/me` — dados do admin logado + `permissions` + `dashboardPrefs`
- `PATCH /admin/me` — `{ name?, username?, password?, currentPassword? }`: `password` (8+ caracteres) só vale com `currentPassword`; sem ela ou errada → 400 e nada é gravado (400, não 401, porque o painel desloga no 401). 10 pedidos por 5 min por IP (429)
- `POST /admin/me/avatar` · `PATCH /admin/me/preferences` — `{ dashboardPrefs: { hidden: string[], order: string[], sizes: Record<bloco, 2|3|4> } }` (substitui o valor inteiro; até 4 KB)
- `GET /admin/dashboard/stats` — `courses{…}`, `totalUsers`, `totalAdmins`, `totalRooms`, `registrations{last30Days,pendingConfirmation}`, `coursesStartingIn7Days`, `unreadMessages`, `membershipsExpiring30Days`, `quotesToday{launched,period}` — cada bloco só vem com a permissão
- `GET /admin/rules` · `POST /rules` · `PATCH /rules/:id` · `DELETE /rules/:id`
- `POST /admin/invites` (pessoa + regra → link) · `GET /admin/invites` (pendentes) · `DELETE /admin/invites/:id` (revogar) · `GET /invites/:token` e `POST /invites/:token/accept` (públicos)

**Banners**
- `GET /banners` (público: só os no ar) · `GET /admin/banners` · `POST /admin/banners` · `PATCH` / `DELETE /admin/banners/:id` · `POST /admin/banners/:id/image` (multipart) · `PATCH /admin/banners/reorder`

**Notícias**
- `GET /news?page&limit` e `GET /news/:id` (públicos; agendada dá 404 até a hora) · `GET /admin/news` (`status`, `search`)
- `POST /news` · `PATCH /news/:id` (`publishAt` agenda) · `DELETE /news/:id` · `POST /news/:id/banner` · `POST /news/:id/image` (imagem de bloco)

**Mensagens de contato**
- `POST /contacts/message` (público) — `{ name, email, phone?, subject?, message }`
- `GET /admin/contacts/messages` (paginado + filtros) · `PATCH /admin/contacts/messages/:id` (lida) · `PATCH …/:id/unread` (não lida; mande corpo `{}`) · `DELETE …/:id`

**Site público e Configurações**
- `GET /site-settings` (público) — redes, dados do sindicato (`org*`), `aboutText`, `quotesSource` · `GET` / `PATCH /admin/site-settings` (`*_BANNER`; só grava os campos enviados)
- `GET /contacts` (público, na ordem do admin) · `GET /admin/public-contacts` · `POST` `{ userDataId, title }` · `PATCH /:id` · `DELETE /:id` · `PATCH /reorder`
- `GET /partners` (público) · `PATCH /admin/partners/reorder` `{ order: id[] }`
- `GET /events` (público) — eventos publicados que não terminaram (até 50)

**Salas** — nome da lista fixa (AUDITORIO, COZINHA, SALA DE VIDEO CONFERENCIA, SALA 1, SALA 2, SALA APL); repetido → 409
- `GET /rooms` · `POST /rooms` · `PATCH /rooms/:id` · `DELETE /rooms/:id`

**Reservas de sala (agenda)** — eventos e reuniões; permissões `*_COURSE`; horário de parede
- `GET /admin/room-bookings?from&to[&roomId][&type=EVENT|MEETING][&search]` · `GET /admin/room-schedule?from&to[&roomId]` (cursos + reservas, `kind` COURSE|EVENT|MEETING)
- `POST /admin/room-bookings` (`repeat: { frequency: WEEKLY|MONTHLY, until }` opcional) → `{ ids, seriesId }` · `PATCH /:id` (só esta data) · `DELETE /:id?scope=one|future` — sala ocupada → 409
- `publicOnSite` + `publicDescription`: só evento vai para o site; `description` é observação interna

**Convênios** — `*_CONVENIO`; preço em centavos
- `GET /convenios` (menu público) · `GET /convenios/:slug` (inativo/inexistente → 404)
- `GET /admin/convenios` · `GET /admin/convenios/:id` · `POST` · `PATCH /:id` (`logoUrl: null` remove) · `DELETE /:id` · `POST /admin/convenios/:id/logo` (multipart)

**Unimed (beneficiários)** — permissões `*_USER`
- `GET /admin/unimed` (`search`; `userDataId` traz os cadastros da pessoa e aqueles em que ela é titular) · `GET /admin/unimed/:id` · `POST` · `PATCH /:id` · `DELETE /:id` (soft)
- `tipoMovimento` e `grauDependencia` são listas fixas; `cns` só com dígitos (15). O PATCH grava `null` em todo campo vazio

**Cotações** — produtos fixos: SOJA, MILHO, TRIGO, MANDIOCA, DOLAR
- `GET /market-quotes` · `GET /market-quotes/history?days=30|90|180|365` (públicos)
- `GET /admin/market-quotes` · `PUT /admin/market-quotes/daily` `{ period, prices: [{ id, priceCents }] }` (data = hoje, do backend) · `PATCH /admin/market-quotes/:id` `{ unit }` · `PUT /admin/market-quotes/source` `{ source }` (vazio esconde a fonte)

**Galerias (página Sobre)** — `*_BANNER`
- `GET /galleries` (público) · `GET` / `POST /admin/galleries` · `PATCH` / `DELETE /:id` · `PATCH /admin/galleries/reorder`
- `POST /admin/galleries/:id/photos` (multipart; reduzida p/ 1600px) · `PATCH /photos/:photoId` `{ caption }` · `DELETE /photos/:photoId` · `PATCH /photos/reorder`

**Auditoria**
- `GET /admin/audit-logs` — paginado; `action=create|edit|delete|export|login|login_failed`, `entity`, `actorId`, `ip`, `from`, `to`, `q`. Cada linha traz `summary` (frase pronta, montada no backend), `ip`, `location`, `device`, `userAgent` e `changes` (`[{ field, before, after }]`; senha trocada = "alterada", sem valor). As entidades do filtro "Tipo" vêm do backend (`src/lib/audit-entity.ts` de lá)
- `GET /admin/audit-settings` (READ_AUDIT) → `{ retentionDays, options, oldestAt, total }` · `PATCH` (UPDATE_AUDIT) `{ retentionDays }` (0 = para sempre). Baixar o prazo apaga na hora os mais antigos

**Exportação** — `POST /admin/export/:dataset` (corpo JSON; `ids` = selecionados ou um só; sem `ids` = mesmos filtros da listagem). O servidor manda sempre CSV (`;` com BOM); o **PDF** ("Relatório", A4 deitado) é montado no front a partir do mesmo CSV (`lib/relatorio-pdf.tsx`). Cada exportação vai para a auditoria
- Datasets: `people`, `companies`, `properties` (`ownerIds`), `unimed` (READ_USER) · `admins`, `cadastros` (relatório dos 4 tipos num arquivo; READ_USER_ADMIN) · `courses`, `registrations` (`courseIds`), `room-bookings` (READ_COURSE) · `contact-messages` (READ_CONTACT) · `audit-logs` (READ_AUDIT)

**Financeiro (admin)** — `*_FINANCE`; valores em centavos
- `GET /admin/finance/categories` (`?all=true` inclui inativas) · `POST` · `PATCH /:id` · `DELETE /:id`; o mesmo para `/accounts` (caixas) e `/payment-methods` (nome em caixa alta, único)
- `GET /admin/finance/transactions` (from, to, type, categoryId, accountId, method, search; `totals` de todos os filtrados) · `GET …/transactions/export` (CSV) · `POST` · `PATCH /:id` · `DELETE /:id`
- `POST /admin/finance/transfers` · `POST /admin/finance/transactions/:id/attachments` (multipart) · `GET` / `DELETE /admin/finance/attachments/:id`
- `GET /admin/finance/summary?from&to` · recorrências: `GET /recurrences` · `POST` · `PATCH /:id` · `DELETE /:id` · `POST /recurrences/generate` → `{ created }`
- `GET /admin/finance/closings?accountId&year` · `GET /closings/preview?accountId&month` · `POST /closings` `{ accountId, month, countedBalanceCents, notes? }` (esperado recalculado no servidor) · `DELETE /closings/:id` (reabrir)

**Notificações (admin)**
- `GET /admin/notifications` → `{ unreadCount, pendingCount, events: [...], pending: [...] }` · `PATCH /admin/notifications/read` `{ ids? }` → `{ updated }`

**Utilitário**
- `GET /address/cep/:cep` — CEP (ViaCEP + cache)
