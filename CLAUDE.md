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
| @dnd-kit | 6.x / 10.x | Arrastar blocos do Painel Geral e as colunas do montador de relatórios |
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
                              abas "Próximos" (padrão) e "Armazenados" = ?lista=armazenados, a lista inteira é
                              components/courses/CoursesList; ?curso=<id>&aba=inscricoes abre a janela do curso
                              de QUALQUER aba; ?ano=<ano> é o filtro de ano, SEPARADO da busca por texto; os anos
                              vêm de GET /admin/courses/years)
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
/admin/auditoria            → _admin/admin/auditoria/index.tsx (trilha; linha abre IP, local, navegador, "O que foi exportado" e "O que mudou";
                              filtros na URL, inclusive ?ip=; "Configurações da trilha" só com UPDATE_AUDIT)
/admin/financeiro           → _admin/admin/financeiro/index.tsx (?tab=dashboard|lancamentos|recorrentes|categorias|
                              caixas|formas|fechamento; nos lançamentos também ?q, ?ord=number, ?page e os filtros)
/admin/minha-conta          → _admin/admin/minha-conta.tsx (abas Perfil — foto, nome, usuário, senha — e Preferências — tema;
                              link no menu do usuário e na paleta Ctrl+K)
/admin/ajuda                → _admin/admin/ajuda/index.tsx (Central de Ajuda; ?topico=<id>&q=<busca>) — DO CHAT DE AJUDA
/admin/administradores      → redireciona p/ /admin/usuarios
/admin/salas                → redireciona p/ /admin/configuracoes?tab=salas
/admin/galerias             → redireciona p/ /admin/configuracoes?tab=galerias
```

Layouts pai:
- `_public.tsx` — Header + Footer público + botão flutuante do WhatsApp
- `_admin.tsx` — Sidebar admin (AdminSideBar), token-gated (valida JWT + expiração); liga o tema Cinza/Verde-claro do painel (`syncTheme(true)`) e as cores neutras (`setArea('painel')`, lib/area.ts) ao entrar e desliga ao sair; no celular, topo com SidebarTrigger + sino de notificações; monta `CommandPalette` e `LeaveConfirmHost`

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
│   ├── ui/                          # shadcn/ui ajustado ao design (ver "Design"); date-picker.tsx (digitável dd/mm/aaaa),
│   │                                #   native-select.tsx, pagination.tsx (componente Pagination), dialog.tsx (data-escape-owner;
│   │                                #   o X de fechar diz "Fechar" ao leitor de tela, também no sheet.tsx)
│   ├── PageHeader.tsx               # PageHeader (título, "?", descrição, ações) + PageContainer / PAGE_CONTAINER_CLASS (ver "Design")
│   ├── RowActions.tsx               # Ações por linha: duas à vista, o resto no menu "Mais" (ver "Design")
│   ├── SegmentedControl.tsx         # Escolha entre poucas opções (período, Dia/Semana, tipo na agenda…), ver "Design"
│   ├── FilterBar.tsx                # FilterBar (filtros à esquerda, ações no canto) + FilterField (ver "Design")
│   ├── LoadErrorRetry.tsx           # PADRÃO de falha ao carregar (site e painel): mensagem + "Tentar de novo";
│   │                                #   variant "inline" para faixas, selects e listas suspensas
│   ├── EmptyState.tsx               # Vazio de verdade (prop `topico` liga à ajuda; `framed` desenha a caixa)
│   ├── ErrorAlert.tsx               # Erro de formulário/ação (não de carregamento)
│   ├── NoPermission.tsx             # "Sem permissão" + "Por que não vejo esta tela?"; se as permissões não
│   │                                #   carregaram, mostra LoadErrorRetry em vez disso
│   ├── RouteErrorPage.tsx           # defaultErrorComponent: "Tentar de novo" (router.invalidate) + "Ir para o início"
│   ├── NotFoundPage.tsx             # 404 em português (lazy): com cabeçalho/rodapé quando fora do layout; em /admin leva ao painel
│   ├── PageLoader.tsx               # defaultPendingComponent (rota demorando a carregar)
│   ├── PublicHeader.tsx             # Nav pública (sticky; só a logo-icon.png, sem o lema; convênios num item só, "Convênios",
│   │                                #   link direto para /convenios, sem submenu; menu mobile abaixo de lg; ThemeToggle)
│   ├── public-footer.tsx            # Footer: 4 colunas (logo-full.png, links, contato via useOrgInfo, chamada);
│   │                                #   "Acesso ao painel" é link discreto na linha de baixo
│   ├── WhatsAppFloatingButton.tsx   # Botão flutuante do WhatsApp, 48 px no verde do Sindicato (só com WhatsApp nas
│   │                                #   Configurações; some abaixo de lg em /cursos/$id)
│   ├── PublicPageHeader.tsx         # Faixa de topo das páginas internas do site (ver "Design" › Site público)
│   ├── home-hero-section.tsx        # Banner: o cartaz inteiro (1440 × 600) ao lado do título e do botão; troca a cada 9 s,
│   │                                #   para no hover/foco/clique, parado com "reduzir movimento"; some sem banner
│   ├── home-cotacoes-section.tsx    # Cotações da home: título, atualização, links e o quadro (cotacoes/QuoteBoard)
│   ├── home-courses-section.tsx     # Carrossel de cursos (CoursesSection; só anda quando a pessoa pede)
│   ├── home-events-section.tsx      # "Próximos eventos" (só quando há evento publicado); EventDateBlock e EventMeta,
│   │                                #   usados também em /eventos
│   ├── home-news-section.tsx        # Notícias na home
│   ├── course-card.tsx              # CourseCard: uma etiqueta só (a situação), preço como texto, instrutor só se houver
│   ├── StatusBadge.tsx              # Selo do status do curso (tons do Badge)
│   ├── GalleryLightbox.tsx          # Fotos de uma galeria em tela cheia (página Sobre)
│   ├── adminSideBar.tsx             # Sidebar admin (favicon.ico como marca); sino ao lado do logo; itens por permissão; seção sem item permitido
│   │                                #   não mostra nem o título (SR-126)
│   ├── nav-user.tsx                 # Menu do usuário: Minha conta, sair (limpa o cache do React Query)
│   ├── CommandPalette.tsx           # Ctrl+K: busca de telas (NAV_ITEMS de lib/command-palette.ts, filtrados por permissão)
│   ├── notifications/NotificationBell.tsx # Sino (avisos não lidos + pendências warning): Popover no computador,
│   │                                #   Sheet no celular; abre o link pelo roteador
│   ├── ThemeToggle.tsx              # Claro/escuro no cabeçalho público
│   ├── ThemeSetting.tsx             # Claro/escuro/sistema/Cinza/Verde-claro em Minha conta (chave `theme` no localStorage)
│   ├── PersonPicker.tsx             # Busca de pessoa do cadastro (lista suspensa; "Cadastrar nova pessoa" em outra aba, só com CREATE_USER)
│   ├── MemberBadge.tsx              # Selo "Associado" (amarelo; só some para quem não está em dia): lista de pessoas, ficha e busca de pessoa
│   ├── PasswordInput.tsx            # Campo de senha com mostrar/ocultar (repassa `ref`)
│   ├── PasswordStrengthHint.tsx     # Força da senha: barra + rótulo + até 2 dicas; só orienta, nunca bloqueia
│   ├── InitialsAvatar.tsx           # Foto ou iniciais (fundo neutro, sem cor por nome)
│   ├── ImageCropDialog.tsx          # Recorte de imagem (banners, notícias)
│   ├── DeleteConfirmDialog.tsx      # Confirmação de exclusão
│   ├── confirm-close-dialog.tsx     # "Descartar alterações?" + LeaveConfirmHost (useUnsavedGuard)
│   ├── PermissionButton.tsx         # Botão condicional por permissão
│   ├── AgeHint.tsx                  # Idade calculada (em vermelho, com aviso, se menor de 18)
│   ├── CadproFields.tsx             # Lista de CAD/PRO do associado (até 5)
│   ├── ajuda/                       # AjudaLink ("?" ao lado do título de cada tela) e HelpPage — DO CHAT DE AJUDA
│   ├── agenda/                      # Agenda das salas (dentro do Painel Geral): AgendaSection (Dia/Semana, busca, exportar
│   │                                #   com "Montar relatório…", imprimir, nova reserva, ocupação), AgendaItem, WeekAgenda, RoomOccupancy (lista escrita
│   │                                #   até 640px, faixa 07:00–22:00 acima — `@container`, não a largura da tela), BookingDialog,
│   │                                #   DeleteBookingDialog (só esta / esta e as próximas), KindBadge, OnSiteBadge
│   ├── auditoria/                   # AuditRowDetails (IP, local, navegador, "O que foi exportado", "O que mudou"), AuditRetentionPanel (tempo de
│   │                                #   guarda: o select só aparece com o ajuste carregado)
│   ├── cadastro/                    # person-form-fields.tsx: CADA CAMPO do cadastro de pessoa, desenhado UMA vez
│   │                                #   (PersonField + FieldRow + SelectField); CameraDialog (foto pela câmera no cadastro);
│   │                                #   cadastros repetidos: MergePeopleDialog, DuplicatePeopleList, merge-people.ts;
│   │                                #   empresas: CompaniesList, CompanyForm, CompanyMembersPanel, PersonCompanies;
│   │                                #   PersonPhoto (foto da ficha: 128/160 px, clique amplia num diálogo);
│   │                                #   PersonNameCell (coluna Nome da lista de pessoas) e PersonHeading (título da ficha), os dois com o MemberBadge;
│   │                                #   PropertiesManager (propriedades/endereços de pessoa e empresa; lápis só com `onUpdate`;
│   │                                #   `loadError` mostra a falha em vez de "Nenhuma propriedade")
│   ├── conta/PerfilTab.tsx          # Aba Perfil de Minha conta: foto, nome, usuário; trocar a senha pede a senha atual
│   ├── convenio/                    # ConvenioEditor (admin) e ConvenioPageView (página pública e pré-visualização)
│   ├── cotacoes/                    # QuoteBoard (o quadro da home e de /cotacoes), quote-variation.ts ("vs manhã"/"vs
│   │                                #   anterior", dia do quadro), QuoteHistoryChart (gráfico SVG), QuoteDayCard e CotacaoSimples
│   │                                #   (tela /cotacao)
│   ├── courses/                     # CoursesList (lista do painel com as abas Próximos/Armazenados, filtros, cartões e paginação),
│   │                                #   AddInstructorForm ("Adicionar instrutor" da aba Instrutores: só pede GET /admin/instructors com READ_USER;
│   │                                #   sem ela a dica "Pede a permissão Visualizar usuários" toma o lugar do formulário, SR-126),
│   │                                #   AdminCourseCard + CourseCardSkeleton, RegistrationsTab (aba "Inscrições" da janela do
│   │                                #   curso: ordem de chegada, "Inscrito em dd/mm/aaaa hh:mm", presença, fichas) — os três fora
│   │                                #   do arquivo da rota para poder ser testados;
│   │                                #   CourseFormDialog (criar/editar/duplicar — fora do arquivo da rota para o editor de
│   │                                #   markdown não ir ao bundle inicial), PhotoGrid; RegistrationDialog (inscrição pelo
│   │                                #   site em /cursos/$id: CPF + 4 últimos dígitos do telefone → confirmar cadastro ou
│   │                                #   formulário novo; fora do arquivo da rota para poder ser testado)
│   ├── dashboard/                   # Painel Geral: DashboardPage (a tela inteira), StatsRow, QuickActions, QuotesNoticeLine,
│   │                                #   FinanceMonthCard, PublicCoursesCard, IncompleteUsersCard, RecentAuditCard,
│   │                                #   EditModeBar + EditableBlock (modo de organizar), dashboard-prefs.ts (ordem/largura/
│   │                                #   escondidos), dashboard-drag.ts (prévia do arrasto, pura e testada), quotes-notice.ts,
│   │                                #   course-capacity.ts (vagas), month-range.ts (mês atual em Brasília)
│   ├── export/                      # ExportMenu (selecionados / todos com filtros / extras; "Planilha: [CSV] [Excel (.xlsx)]"
│   │                                #   com o catálogo, ou só CSV sem ele; PDF; `label`; sem
│   │                                #   `selectedIds` some "Selecionados"; "Montar relatório…" só com o catálogo; extra com
│   │                                #   `builder` ganha "Montar relatório: …"), ExportOneButton, SelectCheckbox, SelectionInfo;
│   │                                #   ExportarDaFicha (o Exportar das fichas de pessoa e de empresa, SR-111); a escolha CSV/Excel
│   │                                #   dos dois menus: use-planilha-do-menu.ts (`usePlanilhaDoMenu`: catálogo + `sr:planilha`) e
│   │                                #   EscolhaDaPlanilha.tsx (`TituloDaPlanilha`: a escolha, ou "Planilha CSV (abre no Excel)" sem
│   │                                #   o catálogo); BulkDeleteButton (exclusão em massa); montador de relatórios (decisão 006, ver "Montador
│   │                                #   de relatórios"): MontadorDeFontes (ItensDoMontador = os itens do menu, um por fonte com
│   │                                #   catálogo; MontadorAberto = o ReportBuilder carregado só no clique; usado pelo ExportMenu
│   │                                #   e pelo Exportar das fichas), ReportBuilder (diálogo/folha; modelos da equipe: salvar,
│   │                                #   salvar por cima, renomear, excluir, SR-115), ReportFieldPicker (campos
│   │                                #   agrupados com busca), report-builder.ts (o estado, PURO e testado; tipos do catálogo e
│   │                                #   dos modelos da equipe;
│   │                                #   camposDoResumo, pdfRapido, caminhoDoPdfRapido, temPdfDoCsv, periodoEmPalavras,
│   │                                #   totalComCorte, formato da planilha do menu `sr:planilha`), filter-texts.ts (como
│   │                                #   Financeiro, Auditoria e Agenda dizem os filtros por id: "Caixa: BANCO"), export-details.ts
│   │                                #   ("O que foi exportado" da Auditoria)
│   ├── financeiro/                  # Abas que saíram do arquivo da rota: ClosingTab (fechamento, "Reabrir mês"),
│   │                                #   RecurringTab (reativar pede confirmação), PaymentMethodsTab, PaymentMethodSelect
│   │                                #   (select com "+ Nova forma"); ClosedMonth (selo "Mês fechado", aviso do formulário,
│   │                                #   LockedReason = motivo no title de botão desligado, fora da lista); MonthlyChart (o
│   │                                #   gráfico de entradas × saídas da Visão geral; contas em lib/finance-chart.ts);
│   │                                #   use-gerar-recibo.ts (gera o recibo de ENTRADA, SR-065: a lista usa no RowActions) e
│   │                                #   ReciboButton (o mesmo como botão solto; recebe `org` de useOrgInfo; testável fora da rota);
│   │                                #   NumeroField (campo "Nº" do topo do formulário de lançamento) e NumeroSaltoDialog (a pergunta
│   │                                #   "Esse número pula do 128 para o 5000…"), SR-066
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
│   ├── api-error-message.ts         # apiErrorMessage: mensagem do backend → português (inclui 413 e 429 pelo status);
│   │                                #   loadErrorMessage: consulta que falhou com 400 mostra o motivo da API, o resto o texto da tela
│   ├── registration-errors.ts       # Erros da inscrição pelo site: registrationErrorMessage (429 do CPF mostra o texto do
│   │                                #   servidor), isAlreadyRegistered, isCannotConfirmRegistration (409 → link do WhatsApp)
│   ├── theme.ts                     # Tema: ThemeMode, readStoredTheme, syncTheme(inAdmin), saveTheme. Cinza e Verde-claro (fundo fosco,
│   │                                #   cartões brancos) só valem no painel: `data-painel` no <html> liga as cores de index.css
│   ├── area.ts                      # `data-area` no <html>: 'site' (cores de papel) ou 'painel' (neutro); main.tsx e _admin.tsx
│   ├── chunk-reload.ts              # Recarga automática depois de deploy (vite:preloadError): guarda por horário, 60 s entre recargas
│   ├── login-error.ts               # loginErrorMessage: senha errada / 429 / sistema fora do ar / sem internet
│   ├── auth-token.ts                # JWT no navegador: validade, renovação, safeAdminRedirect, loginHref
│   ├── auth-guard.ts                # requirePermission (guarda de rota; lê o cache de meQuery)
│   ├── query-client.ts              # QueryClient: staleTime 60s, gcTime 5min, retry shouldRetryQuery, sem refetch no foco
│   ├── query-retry.ts               # shouldRetryQuery (até 2x em rede/5xx, nunca 4xx) + errorStatus
│   ├── command-palette.ts           # NAV_ITEMS e openCommandPalette()
│   ├── schemas.ts                   # courseBaseSchema (usado); pessoaSchema e roomSchema (sem uso)
│   ├── export.ts                    # downloadExport(dataset, params, 'csv'|'xlsx'|'pdf', { fields, modelo, confirmed, print,
│   │                                #   printWindow, colunasDoPdf }) → POST /admin/export/:dataset (devolve quantos); exportarRelatorio
│   │                                #   (o mesmo, devolve { count, abriuAba }; `recusarVazio` lança RelatorioVazioError
│   │                                #   com 0 registros); reportBody, lerRelatorioJson, RelatorioJson; ehLimiteDoPdf (o 400
│   │                                #   "O PDF aceita até 2.000 linhas…"); TITULO/FALLBACK_NAME = título e nome do PDF do CSV;
│   │                                #   exportErrorMessage/ehLimiteDeExportacoes (o 429 "Muitas…"/"Muitos…" com o texto da API)
│   ├── registrar-documento.ts       # registrarDocumento(tipo, { linhas, alvo, ids, escopo }): a linha da auditoria ANTES de
│   │                                #   gerar um PDF montado no navegador (SR-106); falhou = não gera (DocumentoNaoRegistradoError,
│   │                                #   erroDoDocumento); alvoDoDocumento, periodoDoDocumento, corpoDoRegistro (limites da API)
│   ├── relatorio-pdf.tsx            # PDF da exportação: RelatorioDocument (Relatório de cadastros, fonte sem catálogo e PDF
│   │                                #   rápido acima de 2.000 linhas: a MESMA planilha do CSV, com as `colunas` pedidas) e RelatorioJsonDocument (montador e PDF rápido do menu: o JSON
│   │                                #   da API; layoutDoPdf = em pé até 5 colunas,
│   │                                #   letra 8/7/6 pt; fracoesDasColunas = largura mínima por coluna; quebraDaColuna =
│   │                                #   palavra que cabe não se hifeniza)
│   ├── bulk-delete.ts               # "Excluir selecionados": apaga em lotes e conta o que deu certo
│   ├── csv-parse.ts                 # Lê o CSV do backend de volta: o PDF do Relatório de cadastros (4 tabelas, sem montador),
│   │                                #   o PDF rápido de fonte sem catálogo e o PDF rápido acima do limite de linhas do PDF da API
│   │                                #   saem dele; `pdfColumns(header, rotulos?, doNome?)` também escolhe as colunas do PDF rápido via
│   │                                #   API (`camposDoResumo`, com `COLUNAS_DO_NOME` da fonte: o curso, a propriedade e o dono, SR-111).
│   │                                #   Continua enquanto houver esses três caminhos
│   ├── person-fields.ts             # Campos de pessoa como DADO: PERSON_LABELS, PERSON_FIELD_NAMES, READ_MODE_FIELD
│   ├── person-validation.ts         # validatePersonFields (mesmas regras do backend), firstInvalidField, focusFieldById
│   ├── user-form-options.ts         # Opções dos selects do cadastro de pessoa; os filtros de Etnia e Escolaridade da
│   │                                #   lista de Pessoas leem daqui (mesmos rótulos da ficha e da API: "Parda", "Fundamental incompleto")
│   ├── cin.ts                       # CPF_LABEL ("CPF / CIN") e CIN_HINT
│   ├── member-types.ts              # MEMBER_TYPES e MEMBER_STATUS (listas fixas, iguais às do backend) + memberTypeLabel
│   ├── membership.ts                # isActiveMember / personIsActiveMember (selo "Associado": ACTIVE e validade vazia ou de hoje em diante, dia em Brasília)
│   ├── room-names.ts                # ROOM_NAMES (lista fixa, igual à do backend)
│   ├── unimed-options.ts            # UNIMED_MOVEMENT_TYPES, UNIMED_DEPENDENCY_DEGREES (listas fixas) + unimedOptionsWith
│   ├── unimed-docs.ts               # Baixa Ficha/Termo/Contrato pelo id (registra na auditoria antes); ERRO_DO_DOCUMENTO_UNIMED
│   │                                #   ("Erro ao gerar a Ficha." etc., das duas telas); unimed-{ficha,termo,contrato}-pdf.tsx,
│   │                                #   unimed-pdf-assets.ts, unimed-pdf-utils.ts
│   ├── org-contact.ts               # CNPJ do sindicato (ORG_CONTACT) + phoneDigits, orgAddressLines; sem contato reserva
│   ├── agenda.ts                    # Agenda das salas: horário de parede, itens de vários dias (occupiedDays — a MESMA regra
│   │                                #   para curso e reserva), dia/semana, ocupação das salas, formulário de reserva
│   ├── agenda-pdf.tsx               # "Imprimir" da agenda
│   ├── dashboard-agenda.ts          # parseDashboardSearch (?dia&sala&tipo&nova) e kindDays
│   ├── calendar-links.ts            # .ics, Google Agenda e WhatsApp do curso
│   ├── course-views.ts              # Abas Próximos/Armazenados da lista de cursos: COURSE_VIEWS, ?lista= (courseViewFromSlug/ToSlug), textos
│   ├── course-duplicate.ts          # roomIdByName (a API devolve o NOME da sala) e courseToDuplicateForm ("Duplicar curso")
│   ├── lista-presenca-pdf.tsx       # Lista de presença (uma folha por dia)
│   ├── ficha-inscricao-pdf.tsx      # Ficha de inscrição do curso
│   ├── nota-empenho-pdf.tsx (+assets), relatorio-empenho.ts, relatorio-empenho-pdf.tsx, extenso-legado.ts
│   │                                # Nota de empenho e "Relatório de despesas" no formato em papel do sindicato (o Nº de cada um
│   │                                #   é o `number` do lançamento; ver "Nº do lançamento")
│   ├── finance-number.ts            # Nº do lançamento (SR-066), tudo PURO: lerNumeroDigitado, escolherNumero (o que o POST/PATCH levam),
│   │                                #   saltoDaSequencia + textoDoSalto, textoAutomatico, textoDoRegistro, textoDaTransferencia,
│   │                                #   ehNumeroEmUso (o 409 do campo), textoNumeroAnterior, nomeDoArquivoNotaEmpenho
│   ├── recibo.ts, recibo-pdf.tsx    # Recibo de entrada do Financeiro (SR-065, F4), desenho PADRÃO: recibo.ts é puro (podeGerarRecibo,
│   │                                #   pagadorDoRecibo, trechosDoRecibo = a frase, montarRecibo, nomeDoArquivoRecibo, emissorDoRecibo,
│   │                                #   alvoDoLancamento ("Nº 128 · COOP LTDA", alvo da auditoria do Recibo e da Nota de Empenho) e
│   │                                #   RECIBO_TEXTOS = TODOS os textos); recibo-pdf.tsx só desenha (ESTILO no topo = TODOS os estilos)
│   ├── finance-report-pdf.tsx       # Relatório financeiro do período
│   ├── finance-month.ts             # Meses do Financeiro (fechamento, recorrências); monthNumeric "2026-10" → "10/2026"
│   ├── finance-closed-month.ts      # Trava do mês fechado (SR-060): closedMonthForRow/Transaction/Transfer, closedMonthMessage
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
│   ├── format-datetime-brasilia.ts  # formatDateTimeBrasilia(iso): instante real (createdAt) → "dd/mm/aaaa hh:mm" de Brasília; NÃO serve para horário de parede
│   ├── date-input.ts                # maskDateBr, parseDateBr, ymdToBr — do DatePicker
│   ├── course-status.ts             # getCourseSituation, getRegistrationBlock, hasCourseEnded… — dia em Brasília, igual ao backend
│   ├── course-attendance.ts         # Presença: contagens, courseDays, sortByName
│   ├── masks.ts                     # maskCPF, maskCNPJ, maskPhone, maskCEP, maskRG, maskCNH, maskCNS, maskMoney,
│   │                                #   moneyToCents, centsToBRL, unmaskDigits
│   ├── cpf.ts, cnpj.ts              # Validação (CPF comparado só pelos dígitos)
│   ├── age.ts, extenso.ts, format-currency.ts, text-format.ts (upperNoAccents)
│   ├── download.ts                  # saveBlob, openBlob, fileSlug
│   ├── resize-image.ts              # resizeToSquare (recorte quadrado, sem ampliar; foto de pessoa = PERSON_PHOTO_SIZE 800 px, avatar do admin 256)
│   ├── safe-url.ts, escape-html.ts  # Link digitado pelo admin; texto dinâmico em dangerouslySetInnerHTML
└── main.tsx                         # Tema salvo, recarga depois de deploy (lib/chunk-reload.ts), router com telas padrão em português
```

## Design

Direção aprovada pelo usuário em 10/11/2026 (`orquestracao/PLANO-DESIGN.md`, seção 2). A base (tokens e componentes) é da SR-080; as telas convergem para ela. Os valores estão em `src/index.css`, com o contraste medido ao lado de cada um.

**Regras**
- **Um destaque só: o verde do Sindicato** (`primary`). Botão principal, item selecionado, a linha da aba ativa, o número que importa. Fundos, bordas e textos ficam neutros.
- **Mono só em números de quadro**: preços, datas e Nº, com a utilidade `num` (Geist Mono + algarismos tabulares). Nada de mono em rótulo, botão ou texto. `tabular-nums` sozinho continua valendo para contagens.
- **Pesos 400, 500 e 600**: `font-bold` foi remapeado para 600 no tema, mas código novo usa `font-semibold`. Hierarquia vem do tamanho e da cor.
- **Mínimo de 12 px** (`text-xs`): nada de `text-[10px]`/`text-[11px]`.
- **Texto normal** (sentence case): sem `uppercase` com `tracking-wider` em rótulo ("Saldo em caixa", não "SALDO EM CAIXA").
- **Movimento**: transição com nome (`transition-colors`, `transition-[color,background-color]`, `transition-opacity`), nunca `transition-all`; sem `hover:scale` (hover muda cor ou fundo); uma curva só, o padrão do tema (`ease-out` = `cubic-bezier(0.22, 1, 0.36, 1)`, 150 ms). O "reduzir movimento" do sistema corta tudo (index.css).
- **Cantos**: etiqueta `rounded-sm` (6), item de menu e botão pequeno `rounded-md` (8), botão e campo `rounded-lg` (10), cartão `rounded-xl` (12), diálogo `rounded-2xl` (16). `rounded-full` só em avatar e etiqueta pequena.
- **Linha fina, não anel**: `border border-border` (texto principal a 9%). Sem `backdrop-blur`, sem sombra colorida; sombra só no que flutua (`shadow-float`).

**Tokens** (classes do Tailwind; o par do tema escuro e do site já vem junto)

| Token | Quando usar |
|---|---|
| `bg-background` / `bg-card` / `bg-popover` | página / cartão, campo, tabela / menu, diálogo |
| `bg-muted` (= `bg-secondary`) | superfície um tom acima: linha ativa, etiqueta neutra, faixa de resumo |
| `bg-accent` | hover de menu e de botão fantasma |
| `text-foreground` | texto principal |
| `text-muted-foreground` | texto secundário: descrição, coluna secundária, rótulo |
| `text-faint-foreground` | texto apagado: meta, legenda, placeholder, ícone de apoio (≈4,5:1, nunca em texto corrido) |
| `primary` (`bg-primary`, `text-primary`, `ring`) | o destaque (verde do Sindicato) |
| `success`, `success-foreground`, `success-soft` | positivo, entrada, "ativo", "no ar" |
| `warning`, `warning-foreground`, `warning-soft` | aviso, pendente, "a confirmar", mês fechado |
| `destructive`, `destructive-foreground`, `destructive-soft` | negativo, saída, erro, excluir (vermelho da terra roxa) |
| `chart-1` … `chart-5` | gráficos: entradas, saídas, aviso e dois neutros |
| `brand` | superfície de marca fixa nos dois temas (rodapé, faixas do site, login) |

`-soft` é o fundo suave opaco do tom; o texto em cima é a cor do tom (`bg-warning-soft text-warning`). `-foreground` é o texto sobre a cor cheia (`bg-destructive text-destructive-foreground`): no tema escuro os tons são claros e o texto por cima é escuro, por isso **nunca `text-white` sobre `bg-destructive`/`bg-primary`**.

**Áreas e temas.** O painel é neutro (cinza-grafite) e o site público usa cores de papel: o escopo é `html[data-area="site"]` (lib/area.ts), no `<html>` para valer também nos diálogos e menus, que abrem fora do layout. Login, `/cotacao`, convite e 404 são "site". Cinza e Verde-claro (`data-painel`) só trocam o fundo do painel; no site, com eles salvos, tudo fica claro. O tema escuro vale nos dois (no site, a rampa escura quente).

**Componentes**
- `Button`: `default` verde; `outline`, `secondary` e `ghost` neutros; `destructive` (suave) e `destructive-solid` (cheio, para a confirmação de excluir; o `DeleteConfirmDialog` já usa); `link`. Alturas: `xs` 28, `sm` 32, padrão 36, `lg` 40 (`icon*` iguais). Campos (`Input`, `SelectTrigger`, `NativeSelect`, `DatePicker`, `Textarea`) têm 36 px, canto de 10 e fundo do cartão.
- `Badge` (etiqueta de situação): 20 px, texto de 12, canto de 6, fundo suave e texto da cor. Tons `neutral`, `success`, `warning`, `danger`; apelidos antigos: `default` = success, `secondary` = neutral, `destructive` = danger, `outline` = neutra só com a linha (para o que não é situação: "Parceira", "Nota"). `StatusBadge` e `MemberBadge` já usam.
- `Tabs`: um estilo só (texto secundário, a ativa em texto principal com a linha verde, linha fina sob a barra). `variant="line"` e o padrão desenham o mesmo. Muitas abas no celular: `tabsWrapClass`. O espaço entre a barra e o conteúdo é só o `gap-4` do `Tabs`: sem `mb-*` no `TabsList` nem `mt-*` no `TabsContent`.
- **`SegmentedControl`** (`components/SegmentedControl.tsx`): escolha entre poucas opções que filtra ou muda a forma de ver (Período do Financeiro, Dia/Semana, tipo na agenda, Todas/Não lidas/Lidas, Pessoa/Empresa). Mesmo desenho da escolha de tema: a escolhida um tom acima, com a linha fina e o ícone verde. Não é aba (aba troca o conteúdo) nem botão verde cheio. `options: { value, label, icon?, dot?, title? }`; `dot` é a classe de cor de um ponto de 8 px.
- `Dialog`: fundo escurecido sem desfoque e o "x" sempre (só desligue `showCloseButton` se a tela desenha o próprio no mesmo lugar, como a janela do curso). `AlertDialog` não tem "x": a pessoa escolhe um botão.
- `Card`: linha fina, canto de 12. `Table`: cabeçalho de 12 px em texto secundário, linhas de 44 px.
- `EmptyState`: um estilo só (ícone num quadrado neutro, título, explicação, ação). `framed` desenha a caixa quando o vazio fica solto na página; **nada de caixa tracejada feita à mão**.
- **`PageHeader` + `PageContainer`** (`components/PageHeader.tsx`): toda tela do painel começa assim. O título não leva ícone; o "?" vai em `help` como elemento (o teste da ajuda procura o `<AjudaLink topico=…>` no arquivo da tela). No celular as ações descem para baixo do título.
  ```tsx
  <PageContainer>
    <PageHeader
      title="Banners"
      description="Gerencie os banners exibidos na página inicial"
      help={<AjudaLink topico="banners" titulo="Banners" />}
      actions={<Button onClick={abrirNovo}><Plus /> Novo banner</Button>}
    />
    {/* filtros, conteúdo… (24 px entre os blocos) */}
  </PageContainer>
  ```
  `PageContainer` = `p-4 md:p-6`, `gap-6`, até 1600 px; `PAGE_CONTAINER_CLASS` é a mesma classe para outro elemento.
- **`RowActions`** (`components/RowActions.tsx`): a coluna "Ações" de toda tabela ou lista. As duas primeiras ações ficam à vista (ícone, nome na dica e no leitor de tela; 44 px no toque, 32 no computador) e o resto vai para o menu "Mais", com os nomes escritos e as destrutivas por último, depois de uma linha. Sobrando uma só, ela fica à vista. Cada ação: `{ label, icon, onClick, destructive?, hidden?, disabled?, reason?, busy?, key? }`. Sem permissão ou não se aplica → `hidden`; desligada com motivo (mês fechado, falta de permissão) → `disabled` + `reason` (substitui o `LockedReason`: à vista, a dica diz o nome da ação e, embaixo, o motivo; no menu "Mais", o item desligado não recebe o ponteiro, então o motivo vai escrito embaixo do nome, como descrição do item); gerando PDF → `busy`.
  ```tsx
  <RowActions label={`Ações do lançamento Nº ${t.number}`} actions={[
    { label: 'Editar', icon: Pencil, onClick: () => abrirEditar(t), hidden: !canUpdate, disabled: !!lock, reason: lock ?? undefined },
    { label: 'Repetir', icon: Repeat, onClick: () => abrirRepetir(t), hidden: !canCreate },
    { label: 'Gerar Nota de Empenho', icon: Receipt, onClick: () => gerarNota(t), busy: notaBusy === t.id },
    { label: 'Excluir', icon: Trash2, onClick: () => setDeleteTarget(t), destructive: true, hidden: !canDelete, disabled: !!lock, reason: lock ?? undefined },
  ]} />
  ```
- **`FilterBar` + `FilterField`** (`components/FilterBar.tsx`): filtros à esquerda (quebram linha), ações da lista (Exportar, Novo…) sempre no canto direito; do tablet para baixo as ações sobem para cima dos filtros e, no celular, cada filtro ocupa a largura toda. `FilterField` põe o rótulo de 12 px em cima do campo. Use os campos do sistema (`DatePicker`, `NativeSelect`/`Select`), não o `<input type="date">` do navegador.
  ```tsx
  <FilterBar actions={<><ExportMenu … /><Button><Plus /> Novo lançamento</Button></>}>
    <Input placeholder="Buscar" className="sm:w-72" … />
    <FilterField label="De" htmlFor="f-de"><DatePicker id="f-de" … /></FilterField>
    <FilterField label="Tipo" htmlFor="f-tipo"><NativeSelect id="f-tipo" …>…</NativeSelect></FilterField>
  </FilterBar>
  ```

**Troca das cores fixas por tokens** (o que sobrou nas telas)

| Cor fixa | Vira |
|---|---|
| `emerald-*`, `green-*` em valor positivo, entrada, "ok", "ativo", "no ar" | `text-success`; fundo `bg-success-soft`; borda `border-success/30`; etiqueta `Badge variant="success"` |
| `emerald-*`, `green-*` em botão, link ou seleção | `Button` padrão / `text-primary` / `bg-primary` |
| `red-*`, `rose-*` (saída, negativo, erro, excluir) | `text-destructive`, `bg-destructive-soft`, `border-destructive/30`; botão `variant="destructive"` ou `"destructive-solid"`; etiqueta `danger` |
| `amber-*`, `yellow-*`, `orange-*` (aviso, pendente, a confirmar) | `text-warning`, `bg-warning-soft`, `border-warning/30`; etiqueta `warning` |
| `sky-*`, `blue-*` (informação, "em andamento") | neutro: `text-muted-foreground`, `bg-muted`, etiqueta `neutral` ou `outline`; link → `text-primary` |
| `violet-*`, `purple-*` (concluído, categoria) | neutro: `bg-muted text-muted-foreground`; categoria que precisa de cor → só um ponto de 8 px, não a etiqueta inteira |
| `gray-*`, `neutral-*`, `zinc-*`, `slate-*` em texto | `text-foreground` / `text-muted-foreground` / `text-faint-foreground` |
| `bg-white` em cartão ou campo; `text-white` sobre cor cheia | `bg-card`; `text-primary-foreground`, `text-destructive-foreground`… |
| Gráfico: série de entradas / saídas | `var(--chart-1)` / `var(--chart-2)` (os outros com `--chart-4`/`--chart-5`, neutros) |

Cor que vem do cadastro (cor da categoria e do caixa no Financeiro) continua como está, mas só num ponto ou ícone (nas "Saídas por categoria" a barra é de um tom só).

**Cores de categoria do sistema**: o tipo na agenda (curso, evento, reunião) é um ponto de cor da paleta, `KIND_DOT_CLASS` em `lib/agenda.ts` (curso `chart-1`, evento `chart-3`, reunião `chart-4`), no calendário, nos filtros, no selo `KindBadge` (etiqueta neutra com o ponto) e na faixa de ocupação (barra neutra com um traço da cor na ponta). Nada de fundo colorido por tipo.

**O que fica de cor fixa** (de propósito): texto branco e véu preto sobre FOTO (legenda e botões em cima de imagem, câmera), e a placa branca atrás do logo de parceiro e de convênio (os logos são feitos para fundo claro).

**Site público** (SR-082)
- **Faixa de topo única** (`PublicPageHeader`) em Cursos, Notícias, Eventos, Sobre, Contato, Cotações, Convênios e cada convênio: título à esquerda sobre o papel, a frase da página e uma linha de contexto com dado de verdade ("4 cursos com inscrições abertas", "Preços de 10/11/2026 · Fonte: Cvale"). `width` alinha a faixa com o conteúdo (`max-w-5xl`…); `context={null}` reserva a altura enquanto carrega. Nada de faixa verde ou preta com título centralizado.
- **Imagem que é cartaz não se corta nem leva texto por cima**: banner e imagem de notícia são recortados no painel em 1440 × 600 e aparecem inteiros (`aspect-[12/5]`); a capa do curso (16:9) aparece inteira ao lado do título.
- **O quadro de cotações** (`cotacoes/QuoteBoard`) é o momento do site: superfície `bg-brand`, tudo em mono (é o único lugar com rótulo em mono), parado. Alta e baixa sobre o verde usam `text-brand-positive`/`text-brand-negative` (tokens fixos nos dois temas, 5,2:1 e 5,0:1 sobre o `--brand`); o texto sobre o verde fica a 80% ou mais (`text-brand-foreground/80` = 5,2:1). A variação diz com o que compara (`variationBasis`).
- **Nada se move sozinho** além do banner (9 s, para no hover). Parceiros em grade, cursos só com as setas.
- Rodapé: `bg-brand` (`#15632f`); texto a 80% no mínimo (o pé estava a 60%, 3,6:1).

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
- **Aviso `Buffer is not defined` (warn) ao gerar PDF com imagem** (nota de empenho, recibo, os três da Unimed; SR-126): vem do `@react-pdf/layout` (`fetchImage` chama `Buffer.isBuffer(source)` depois de carregar a imagem, e o navegador não tem `Buffer`). A imagem sai certa; só perde a chave de cache dela. Existe desde antes da 4.6.1 e continua na 5.2.0 (a última). Não há conserto nosso sem polyfill global de `Buffer`, que não vale o risco: ignorar, e rever quando o react-pdf corrigir. PDFs sem imagem (relatórios, lista de presença, agenda, ficha de inscrição) não avisam.
- Avisos conhecidos só de desenvolvimento (ignorar nas baterias de navegador): "Cannot update a component while rendering a different component" (React Hook Form + React 19.3) e "This library called use() to suspend in a previous render…" (TanStack Router + React 19.3).

## Regras de negócio que valem no código

O porquê de cada uma está em `docs/HISTORICO.md`.

- **Relógio de Brasília** em tudo que é "dia": prazo de inscrição (até o fim do dia, ou até `registrationDeadlineTime`), curso terminado, banner no ar (0h do início às 23h59 do fim), notícia agendada, "hoje" do painel. As regras ficam em `utils/course-status.ts`, `lib/banner-dates.ts`, `lib/news-schedule.ts` e espelham as do backend.
- **Horário de parede**: cursos e reservas guardam o horário como ISO com `Z`, mas ele é a hora de Brasília escrita (`lib/agenda.ts`: `wallDate`/`wallTime`/`toWallIso`). Não converta fuso.
- **Selo "Associado"** (`components/MemberBadge.tsx`, regra em `lib/membership.ts`): `memberStatus === 'ACTIVE'` e `membershipValidUntil` vazia ou de hoje em diante pelo relógio de Brasília (a mesma do filtro `activeMember` e da API). Aparece na lista de inscritos do curso (`RegistrationsTab`), nas abas Pessoas e Associados (`PersonNameCell`, embaixo do nome para não tirar espaço dele), no topo da ficha (`PersonHeading`) e na busca de pessoa (`PersonPicker`, contatos públicos, relações da ficha e a aba Pessoa de "Vincular" na Nota de Empenho do Financeiro). `GET /admin/users` e `GET /admin/users/:id` trazem os dois campos; telas novas que listem pessoas devem usar o `MemberBadge`, não repetir a regra.
- **Mês fechado no Financeiro** (SR-060, sobre a trava da API da SR-054): o fechamento é por **caixa e mês**, e com o mês fechado os lançamentos daquele caixa com data no mês não são criados, editados nem excluídos (nem entram ou saem de lá); transferência olha a origem e o destino; lançamento sem caixa e comprovantes ficam livres. O mês é o da data em UTC, como na API. A tela sabe o que está fechado por `GET /admin/finance/closings` (sem filtro, todos os caixas) e a regra fica em `lib/finance-closed-month.ts`. Na lista, a linha ganha o selo "Mês fechado" e Editar/Excluir ficam desligados no `RowActions` (`disabled` + `reason`: a dica diz o nome da ação e, embaixo, o motivo; no menu "Mais", o motivo vai escrito embaixo do nome do item); perna de transferência olha a outra perna se ela estiver na página. "Repetir" continua ligado: o formulário confere a data nova. No formulário de lançamento e no de transferência, o aviso aparece embaixo da data, na largura toda, e os botões de salvar desligam; na edição, tirar o lançamento de um mês fechado também conta. Texto único: `closedMonthMessage` → "Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba Fechamento.". Se a lista de fechamentos não carregar, nada trava e o 409 da API aparece no formulário com o texto dela (`apiErrorMessage` passa o `error` como veio). Reabrir é "Reabrir mês" na aba Fechamento, só com DELETE_FINANCE. Reativar recorrência pausada pede confirmação: os meses da pausa não são lançados.
- **Recibo de entrada (SR-065, F4)**: ação "Gerar recibo em PDF" (ícone `HandCoins`) no menu "Mais" da linha do Financeiro (`RowActions`: Editar e Repetir à vista; Gerar Nota de Empenho, o recibo e Excluir no menu), **só em lançamento de entrada** (`type === 'IN'` e sem `transferId`: saída, "só nota" e a perna de entrada de uma transferência não têm). Funciona com o mês fechado (só lê o lançamento). O desenho é **padrão**, feito antes de o cliente mandar o modelo que usa hoje; para ajustar, textos em `RECIBO_TEXTOS` (`lib/recibo.ts`) e estilos em `ESTILO` (topo de `lib/recibo-pdf.tsx`), sem mexer no resto. Frase: "Recebemos de <Nome / Razão social>, CNPJ|CPF <documento formatado>, <endereço>, a importância de R$ x (<extenso do legado>), referente a <descrição>."; os dados de quem pagou são os do `empenho` do lançamento (os mesmos da Nota de Empenho e da coluna "Nome / Razão social": `fornecedorDoLancamento`, `cnpjCpf`, endereço/bairro/cidade/UF/CEP), a frase se adapta sem nome e/ou sem documento (o endereço só entra havendo um dos dois) e o rótulo é CPF (11 dígitos), CNPJ (14) ou "CNPJ/CPF" (outro tamanho, como foi digitado). Linha "Forma de pagamento" só com forma; "<Cidade das Configurações>, <data por extenso>" (o dia da data do lançamento, sem fuso); assinatura "Sindicato Rural de Terra Roxa" / "Assinatura do responsável". O quadro "Nº" só aparece com `number` no lançamento (o `number` da SR-064/SR-066, nunca o "Nº anterior" da nota; sem número o quadro some) e também entra no nome do arquivo (`recibo-<número ou AAAA-MM-DD>-<nome curto>.pdf`). Cabeçalho: emblema (`SINDICATO_EMBLEMA_PNG` de `unimed-pdf-assets.ts`; a Nota de Empenho só tem o fundo inteiro, sem logo solto), nome fixo, CNPJ de `ORG_CONTACT` (as Configurações não têm nome nem CNPJ) e endereço/telefone de `useOrgInfo`. A4 em pé, uma via, só preto e cinza (o emblema sai cinza na impressão). A ação e o `ReciboButton` usam o `useGerarRecibo` (`components/financeiro/use-gerar-recibo.ts`): antes de gerar, o recibo vai para a auditoria (ver "Documentos montados no navegador"). **Armadilha do react-pdf**: pontuação que abre um trecho novo (", referente a") deixa a linha quebrar ali com um hífen no fim da linha; por isso `trechosDoRecibo` cola a pontuação no trecho anterior (há teste).
- **Nº do lançamento (SR-066, decisão 005; regra da API: `back` CLAUDE.md "Nº do lançamento")**: todo lançamento tem um `number` inteiro que nunca se repete, nem com o de um excluído (`null` só nos excluídos antigos, que a API não lista). Sem digitar nada, a API dá o próximo (o maior + 1); digitado à frente do próximo, a sequência continua dele. As regras e os textos moram em `lib/finance-number.ts` (puro e testado: o Radix é instável no jsdom e o formulário mora no arquivo da rota). A confirmação de Excluir cita o Nº ("Excluir o lançamento Nº 215 — <descrição> (R$ …)?", `prefixoDaExclusao`; sem Nº, o texto antigo). É a única confirmação de excluir lançamento: a tabela e a lista do celular usam o mesmo diálogo.
  - **Lista**: a coluna "Nº" é a primeira (64 px, quebra em duas linhas se o número for comprido; "—" sem número); no celular o cartão traz "Nº 128" na linha de baixo (sem número, nada). A busca diz "Nº, descrição, nome ou CNPJ/CPF..." (cabe em 360 px com 6 px de folga: não aumente o texto) e acha também o "Nº anterior"; um link com `?q=125` à mão chega como número e é lido como texto. "Ordenar por" (Data, padrão | Nº) vai na URL como `?ord=number`, vira `orderBy=number` na lista e no CSV (a ordem da tela é a do arquivo; o relatório de despesas não manda `orderBy`).
  - **Formulário**: campo "Nº" no topo (`NumeroField`; só dígitos, até 10, o que cabe no int4 da API). **Vazio = automático**: o placeholder diz "Automático (próximo: 128)", com o `next` de `GET /admin/finance/transactions/next-number` (`useFinanceNextNumber`, `staleTime: 0`, só com o formulário aberto; se não carregar, só "Automático"), e o POST **não manda** `number`. Digitado à frente do próximo pede confirmação ao salvar (`NumeroSaltoDialog`: "Esse número pula do 128 para o 5000. Os próximos automáticos continuam do 5001."; "Corrigir o número" volta ao campo, "Usar o Nº 5000" grava); a conferência usa o próximo de agora (refaz a consulta quando o digitado passa do que a tela já tinha: o próximo nunca diminui) e, se ela falhar, segue sem perguntar, porque quem decide é a API. O **409** ("O número 123 já é de outro lançamento." / "… de um lançamento excluído.", `ehNumeroEmUso`) aparece embaixo do campo, com o foco nele (o campo fica no topo e o diálogo rola), com o texto da API como veio; o 409 de mês fechado continua no erro geral. **Edição**: o campo vem com o número atual; o PATCH só leva `number` se mudou (a correção vai para a auditoria como "Nº"); esvaziar é erro da tela ("Não dá para apagar o Nº do lançamento…"), porque a API recusa `null` (400). **"Repetir"** e **"Registrar e novo"** abrem com o Nº vazio (o novo recebe o próximo). A prévia "Gerar Nota de Empenho" de dentro do formulário usa o Nº digitado, ou o atual na edição; sem nenhum, a nota sai sem Nº.
  - **Avisos**: lançamento novo → "Lançamento registrado: Nº 128" (a resposta do POST é a linha); transferência (sempre automática, sem campo) → "Transferência registrada: Nº 130 e 131" (`transactions: [saída, entrada]`).
  - **"Nº anterior"**: o antigo "Nº empenho" (`empenho.numero`, texto livre, continua no JSON) virou "Nº anterior (sistema antigo ou nota em papel)", numa linha inteira da seção Nota de Empenho do formulário (o rótulo é comprido). Lançamento do sistema antigo recebe o próximo Nº automático e o número de lá vai aqui; o "Repetir" limpa o campo.
  - **Nota de Empenho em PDF**: o `number` fica no quadro "IDENTIFICAÇÃO" (onde ficava o "Nº empenho", alinhado à data); o "Nº anterior: X" vai embaixo, em letra menor (6,1 pt, encolhe se for comprido), só quando há; o arquivo é `nota-empenho-<Nº>.pdf` (sem Nº, `nota-empenho.pdf`; o Nº anterior não entra no nome). **Relatório de despesas**: a coluna "Nº" é o `number` ("—" sem número) e, no mesmo dia, as linhas seguem o número (numérico: 9 antes de 10; sem número por último). **Recibo**: usa o `number` (quadro e nome do arquivo). **Auditoria**: o campo `number` tem o rótulo "Nº" e sai sem separador de milhar ("1234", não "1.234").
- **Montador de relatórios (SR-089, decisão 006 em `../orquestracao/decisoes/006-relatorios-dinamicos.md`)**: quem exporta escolhe os campos e a ordem das colunas. **O back é o único lugar que define campos, modelos e permissões**: o front lê o catálogo (`useExportCatalog`) e só guarda as chaves escolhidas, na ordem; nunca escreva lista de campos no front. **Têm catálogo** `people` e `registrations` (fase 1), `companies`, `properties`, `admins`, `courses`, `contact-messages` e `unimed` (fase 2, parte A, SR-100/SR-101) e `audit-logs`, `room-bookings` e `finance-transactions` (fase 2, parte B, SR-102/SR-103): toda lista exportável. Só o `cadastros` (Relatório de cadastros) não tem montador.
  - **Onde**: item "Montar relatório…" no fim do `ExportMenu`, só quando o catálogo carrega; recebe o `filters`, o `selectedIds` e o `total` que o menu já recebe. Na janela do curso, o "Planilha" das Inscrições é `<ExportMenu dataset="registrations" label="Planilha">` (sem seleção: só "Todos"), com `confirmedTotal` (quantas confirmadas, da lista inteira) e `filterTexts={{ courseIds: 'Curso: <nome>' }}`. O pedaço do montador começa a carregar quando o menu abre; se ainda não chegou no clique, aparece "Abrindo o montador…" (depois de 150 ms, para não piscar).
  - **Telas da parte B (SR-103)**: **Financeiro › Lançamentos**: o "Exportar CSV" virou `<ExportMenu dataset="finance-transactions">` (botão "Exportar"; sem seleção: só "Todos"), com os filtros e a ordem da tela (`financeExportFilters` de `useFinance.ts`: sem página nem limite; `orderBy` só quando é por Nº) e `total` da lista; a rota antiga `GET /admin/finance/transactions/export` não é mais chamada e a API a apagou na SR-119. "Baixar PDF", "Relatório de despesas", Nota de Empenho e Recibo não mudaram. **Auditoria**: o "Exportar (N)" virou `<ExportMenu dataset="audit-logs" cortaNoLimite>` com os filtros da tela (sem seleção); o "Todos (N)" é o total da tela. **Agenda** (Painel Geral): o "Exportar" de lá continua (Este dia/Esta semana, Escolher período…; só CSV, aviso "Planilha com 2.500 reservas baixada.", com milhar desde a SR-111) e ganhou "Montar relatório…" (`ItensDoMontador`/`MontadorAberto` direto, sem `ExportMenu`), com `{ from, to }` do período da tela, `roomId`, `type` e `search`, `filtered` e o total = as reservas da lista (a mesma busca); os cursos não entram, como na planilha. Sem READ_COURSE nem pede o catálogo.
  - **Corte da Auditoria** (`cortaNoLimite`, prop do `ExportMenu` e do `ReportBuilder`): a API leva só as 20.000 linhas mais recentes em vez de recusar. No montador o "Todos" mostra o total da tela, o botão conta as que saem (`totalComCorte`: "Baixar planilha (20.000)"), não aparece o "passa de 20.000 linhas" e, acima disso, aparece "Saem só as 20.000 linhas mais recentes." (`avisoDoCorte`). O PDF continua com o limite de 2.000. **No menu Exportar** (SR-106) o mesmo aviso aparece antes do clique, numa linha embaixo do "Todos (25.000)" da planilha (sem o catálogo, com o limite da API, 20.000).
  - **Extras e fichas** (fase 2): extra do `ExportMenu` com `builder: true` ganha o item "Montar relatório: <label com inicial minúscula>…" ("Montar relatório: propriedades dos selecionados…", "…: inscrições dos cursos selecionados…", "…: inscrições de todos os cursos…"); desligado junto com o extra. O Exportar das fichas de pessoa (`usuarios/$id`) e de empresa (`empresas/$id`) é o `ExportarDaFicha` (SR-111): a planilha ("Ficha completa"/"Dados da empresa" e "Propriedades (N)", sem `fields`) sai no formato da escolha "Planilha [CSV] [Excel (.xlsx)]", a MESMA do `ExportMenu` (`TituloDaPlanilha` + `usePlanilhaDoMenu`, preferência `sr:planilha`; sem o catálogo de `people`/`companies`, só CSV com "Planilha CSV (abre no Excel)"), com o aviso "Planilha do Excel com 1 registro baixada." (`textoDoBaixado`) e o 429 com o texto da API; embaixo vem o grupo "Montar relatório (escolher campos)" com "Ficha completa…"/"Dados da empresa…" (`ids: [id]`) e "Propriedades (N)…" (`ownerIds: [id]`, desligado sem propriedade). O menu tem a largura do texto (de 224 px até 352 px ou a tela menos 16 px); no celular, o botão da ficha da pessoa fica só com o ícone. Nos dois casos o montador recebe `escopo` (o label do extra; "Só esta pessoa: <nome>", "Só esta empresa: <nome>", "As propriedades desta pessoa (N)"): "O que entra" mostra esse texto no lugar de "Todos"/"Selecionados" e some a linha "Filtros:"; vão os `params` do item como estão. Peças em `MontadorDeFontes.tsx` (`ItensDoMontador` dentro do menu, `MontadorAberto` fora, porque o conteúdo do menu some ao fechar; `FonteDoMontador` = as props do `ReportBuilder` + `rotulo`/`disabled`). A regra de "Selecionados" (só com `selectedIds`) continua.
  - **Filtros que a tela diz** (`filterTexts`, para o montador dizer o mesmo que a API no PDF): Administradores `rulesId` → "Regra de acesso: <nome>" (o filtro manda o id); Empresas `type` → "Tipo: Privada/Pública" (`COMPANY_TYPE_LABEL`; o `type` não entra em `ROTULOS_DOS_VALORES` porque a mesma chave existe nas reservas) e `isPartner: false` → "Só não parceiras"; Mensagens `read: false` → "Só não lidas". O valor `false` só aparece com texto da tela (`activeMember: false` não filtra nada). Cursos mandam `{ view, search, year }` (nessa ordem, a da API: "Aba: Armazenados · Busca: horta · Ano: 2026"; `view` em `ROTULOS_DOS_VALORES` com `COURSE_VIEW_LABEL`). Unimed só tem busca. **Parte B** (`components/export/filter-texts.ts`, puro e testado): Financeiro `type` → "Tipo: Entrada/Saída", `categoryId` → "Categoria: <nome>", `accountId` → "Caixa: <nome>" (da lista de categorias/caixas ou da linha; sem nome, só "Categoria"/"Caixa", nunca o id), `orderBy: 'number'` → "Ordem: Nº" (por data não aparece); a forma de pagamento e a busca já são texto ("Forma de pagamento: PIX": desde a SR-107 o `filterLabels` da API chama o `method` assim; desde a SR-111 o filtro da lista também se chama "Forma de pagamento", como o formulário). Auditoria `action` → "Ação: Exportações" (os nomes do filtro da tela), `actorId` → "Quem: <usuário>" (da lista de administradores ou da linha); o tipo (`entity`) já é o nome ("Tipo: Usuário"; antes da SR-107, "Área"). Agenda `roomId` → "Sala: <nome>", `type` → "Tipo: Evento/Reunião". **Período**: `from` e `to` em dias viram uma parte só, como a API (`periodoEmPalavras`): "Período: 01/06/2026 a 30/11/2026", "Dia: 12/11/2026" (início = fim), "De: …" ou "Até: …"; vale nas três telas. Conferido na tela contra o PDF da API (back `6e2758e`): a linha "Filtros:" do montador e a do PDF saem iguais.
  - **Estado** (`report-builder.ts`, puro e testado): marcar põe no fim; ↑↓ e arrastar ordenam; o seletor "Modelo" tem o "Padrão (como hoje)" (o `padrao` do catálogo) primeiro, os de fábrica depois e, por último, os da equipe (ver "Modelos da equipe", abaixo); mexer depois de escolher mostra "Nome e CPF (alterado)" (o select fica num item à parte para escolher o mesmo modelo de novo funcionar). Campo sem permissão (`allowed: false`) aparece desligado com o `reason`; num modelo ou no último usado, ele e o campo que sumiu do catálogo saem com aviso. "Só confirmadas" só em `registrations` e segue o modelo: o que tem `confirmed: true` (Lista de presença) liga, os outros desligam; depois a pessoa marca à mão. Com seleção na lista, "O que entra" começa em "Selecionados". A linha "Filtros:" usa os nomes do catálogo (`filterLabels`) e, nos filtros de lista fixa, o rótulo dos selects das telas (`ROTULOS_DOS_VALORES`: "Sexo: Feminino", não "FEMALE"; de `user-form-options.ts` e `member-types.ts`); `filterTexts` troca a parte de um filtro pelo texto da tela ("Curso: Horta" em vez de "Cursos (1)").
  - **Abre** no Padrão na primeira vez; depois, no último relatório montado naquela fonte: `localStorage` `sr:relatorio:<dataset>` = `{ fields, format, modelo?, alterado? }` (`format`: `csv`, `xlsx`, `pdf` ou `print`; `modelo` = o id do modelo aberto, de fábrica ou `equipe:<id>`, e `alterado` = as colunas tinham mudado dele; SR-115, `ultimoDoEstado`), gravado ao baixar, lido e gravado sempre em `try/catch`. Com `modelo`, reabre com ele ("Nome e CPF (alterado)" se `alterado`); o modelo da equipe usado sem mexer reabre **como está agora** (alguém pode tê-lo mudado), e o que foi excluído reabre com as colunas guardadas, sem o nome (ou com o de um modelo que bata com elas), sem quebrar. Enquanto a lista da equipe carrega, abre com as colunas guardadas e o select diz "Carregando o modelo…"; quando ela chega e a pessoa ainda não mexeu, o estado é refeito com ela (`estadoInicial` de novo, no render, guardado por `listaChegou`/`mexeu`). Sem `modelo` (guardado antes da SR-115), o nome volta quando as colunas batem com um modelo.
  - **Modelos da equipe** (fase 3, SR-115; decisão do usuário: são **da equipe toda**; API em "API — Endpoints › Exportação › Modelos da equipe"; hook `useReportTemplates.ts`; regras puras em `report-builder.ts`). A lista só é buscada com o montador aberto. **Seletor**: com algum modelo da equipe, dois grupos (`<optgroup>`), "Modelos de fábrica" (o Padrão sempre primeiro) e "Modelos da equipe" (na ordem do nome); sem nenhum, como antes, sem grupos. No estado o id é `equipe:<id>` (`idDaEquipe`/`ehDaEquipe`), para nunca bater com um de fábrica. Sem a rota ou sem a permissão (404/403: `null`), só os de fábrica e nada de "Salvar como modelo…"; se a lista não carregar (rede, 5xx), só os de fábrica e a linha "Os modelos da equipe não carregaram. [Tentar de novo]".
    - **Abrir** um modelo da equipe aplica as colunas, o `format` (se tiver; "Imprimir" continua quando o modelo é PDF, e no celular vira PDF) e, nas inscrições, o `confirmed`. Campo `allowed: false` e as `missingFields` saem com os avisos de sempre ("Ficaram de fora campos do modelo que você não pode exportar: RG." e "1 campo do modelo não existe mais e saiu.": o modelo da equipe entra em `modelosDe` com as `missingFields` no fim de `fields`, e `limparCampos` as tira). Embaixo do seletor: "Modelo da equipe, criado por gestor em 10/11/2026 e editado por bali em 11/11/2026." (`autoriaDoModelo`, dia de Brasília; "editado" e não "alterado", para não confundir com o "(alterado)").
    - **"(alterado)"** igual ao dos de fábrica (só as colunas; o que saiu por permissão não conta). **"Salvar alterações no modelo"** aparece quando a tela está diferente do modelo nas colunas, no formato (se o modelo tem um; "Imprimir" = PDF) ou no "Só confirmadas" (`mudouDoModelo`), e pede confirmação ("Salvar no modelo "X" as colunas e o formato de agora? Ele muda para toda a equipe."), porque muda para todos; manda `PATCH { fields, format, confirmed? }` (`corpoDoModelo`).
    - **"Salvar como modelo…"** (desligado sem coluna): painel com "Nome do modelo" (até 64, `maxLength`; espaços juntados como a API, `normalizarNome`; vazio → "Informe o nome do modelo." sem chamar a API) e "O modelo fica para toda a equipe, com as colunas e o formato de agora." (nas inscrições, "…, o formato e o "Só confirmadas" de agora."); `POST { name, fields, format, confirmed? }`; o modelo novo fica aberto. **Renomear** (lápis) manda só `{ name }` (o mesmo nome não chama a API); **Excluir** (lixeira) confirma com "Excluir o modelo "X"? Ele sai da lista de modelos para toda a equipe." (sem "para sempre": é soft-delete), com o foco em "Cancelar"; as colunas ficam, e o nome passa ao modelo que bata com elas, ou "Montado à mão". Avisos: "Modelo "X" salvo para a equipe.", "Modelo "X" atualizado.", "Modelo renomeado para "Y".", "Modelo "X" excluído.".
    - **Quem não pode exportar um campo do modelo** não o muda nem o exclui (a API dá 403): lápis e lixeira ficam desligados, com o motivo no `title` do invólucro e numa linha visível (no celular não há `title`): "Você não pode mudar nem excluir este modelo, porque ele tem campos que você não pode exportar: RG." (`travaDoModelo`); "Salvar alterações no modelo" não aparece. Campo que saiu do catálogo não trava, como na API.
    - **Painel**: um de cada vez, embaixo do seletor e dentro do montador (sem diálogo dentro do diálogo; `role="group"` com o nome da ação). Erro da API (400/403/404/409) aparece nele, como veio (`apiErrorMessage`), e o montador fica aberto; Esc com o painel aberto fecha só o painel (`onEscapeKeyDown` do `DialogContent`/`SheetContent`), e o foco volta ao seletor. Trocar de modelo fecha o painel. No celular, "Salvar como modelo…", lápis e lixeira vão numa linha embaixo do seletor, com 44 px.
    - **Exportar** com o modelo da equipe manda `modelo: <nome>` (com "(alterado)" se mudou; `modeloParaApi` encurta o nome com "…" para o "(alterado)" caber nos 64).
  - **Limites antes de pedir** (a API confere de novo): pelo menos 1 campo, até 80; até 20.000 linhas; PDF até 2.000 linhas. Com "Só confirmadas", o número do "Todos" e do botão é o de confirmadas quando a tela sabe (`confirmedTotal`); sem isso, o total vira teto ("Baixar PDF (até 5)") e quem decide é a API. Nenhuma confirmada: o botão desliga com "Nenhuma inscrição confirmada. Desmarque "Só confirmadas" para levar todas."; se a API devolver 0 registros (teto), o montador não baixa arquivo vazio (`recusarVazio`) e mostra o mesmo texto (ou "Nenhum registro para exportar."). A partir de 9 colunas em PDF (ou Imprimir), aviso de letra pequena; o Excel tem os limites da planilha (20.000), não os do PDF. "Leva dados pessoais: CPF, …" lista os campos `pessoal` e `sensivel` (os sensíveis primeiro, até 8, depois "e mais N"): é aviso, não pede confirmação. Erro da API (403 "Sem permissão para exportar: RG." etc.) aparece dentro do montador, que fica aberto.
  - **Formatos** (nesta ordem: "Planilha CSV", "Planilha do Excel (.xlsx)", "PDF", "Imprimir"; no celular, sem o Imprimir): CSV (baixa como hoje), **Excel** (SR-106: `format: 'xlsx'`, a API gera a planilha com a aba "Sobre" e devolve o arquivo; baixa com o nome do `Content-Disposition`; botão "Baixar planilha do Excel (N)", aviso "Planilha do Excel com N registros baixada."; erros e o 429 com o texto da API), PDF (a API devolve JSON e o `RelatorioJsonDocument` desenha: em pé até 5 colunas, deitado com mais; letra de 8 pt até 8 colunas, 7 até 12, 6 acima; cabeçalho da tabela em toda página; com coluna "Assinatura" (`blank`) a linha fica alta para assinar; cada coluna fica pelo menos da largura da maior palavra do rótulo e, em data/CPF/telefone/número, do maior valor (`fracoesDasColunas`; se nem os mínimos cabem, como no Padrão de 57 colunas, fica só pelos pesos); a palavra que cabe na coluna não se hifeniza e a que não cabe é hifenizada pelo react-pdf, pela prop `hyphenationCallback` de cada `<Text>`, **não** pelo `Font.registerHyphenationCallback` global, que mudaria os outros PDFs e faria a palavra comprida invadir a coluna do lado) e Imprimir (o mesmo PDF numa aba nova, **aberta no clique** com "Gerando o relatório…" porque a aberta depois da espera é bloqueada; sem aba, baixa e o aviso diz "O navegador não abriu outra aba: o relatório foi baixado. Abra o arquivo para imprimir."). O `modelo` mandado à API é o nome da tela ("Nome e CPF (alterado)"), até 64 caracteres; montado à mão não manda.
  - **Tela**: computador = `Dialog` de 880 px, duas colunas (campos com busca sem acento | colunas com alça de arrastar e ↑↓×; o foco fica no botão depois de mover); celular (< 768 px, `useIsMobile`) = `Sheet` de baixo com altura cheia (`data-[side=bottom]:h-dvh`: um `h-dvh` solto perde para o `data-[side=bottom]:h-auto` do `ui/sheet`), ↑↓× de 44 px, na ordem Modelo, "O que entra", Formato, avisos e por último "Colunas, nesta ordem (N)" com "+ Adicionar campo" no topo da lista (com o Padrão a lista passa de 3.000 px), "+ Adicionar campo" troca o conteúdo pela lista ("Pronto" volta), sem "Imprimir" (o "Imprimir" guardado vira PDF) e o botão de baixar preso no rodapé. O título tem o "?" da Ajuda (`AjudaLink topico="montar-relatorio" novaAba`) nas duas telas: abre o artigo em OUTRA aba (SR-096), e o montador fica aberto com as colunas montadas (na mesma aba, a tela trocava e elas se perdiam). Só usa `ui/dialog`, `ui/sheet`, `ui/button`, `ui/input`, `ui/badge`, `select`/checkbox/rádio nativos e cores por token, que existem também no redesign (nada de `PageHeader`, `FilterBar`, `RowActions`, `SegmentedControl`).
  - **Os itens rápidos do menu** (Selecionados/Todos): a planilha continua sem `fields` (o padrão, como sempre). **Planilha CSV ou Excel** (SR-106): com o catálogo da fonte, o título da seção vira uma linha "Planilha [CSV] [Excel (.xlsx)]" (itens de rádio do menu, `EscolhaDaPlanilha`; escolher não fecha o menu) e "Selecionados"/"Todos" e os extras baixam no formato marcado, sem `fields`, com `format: 'xlsx'` no Excel. A escolha fica no `localStorage` `sr:planilha` (uma para todas as listas e as fichas de pessoa e de empresa; começa em CSV, relida a cada abertura; `usePlanilhaDoMenu`). Assim o Excel entra sem dobrar os itens do menu (seriam mais dois itens e um título em cada lista). Sem o catálogo (back velho), só CSV com o título de antes, "Planilha CSV (abre no Excel)". **Números com milhar**: "Todos com os filtros atuais (2.500)", "Selecionados (2.001)", "Exportar (2.001)"; o menu tem a largura do texto (`w-max`, de 256 px até 352 px ou a tela menos 16 px), para o "Todos com os filtros atuais (20.000)" caber numa linha. O **PDF rápido**, na fonte com catálogo, vem da API (`format: 'pdf'`) com `fields` = as colunas que ele sempre mostrou (`camposDoResumo`: `pdfColumns` aplicado aos rótulos do `padrao` do catálogo, até 7, na ordem do Padrão; conferido contra a API nas 8 fontes, SR-101; desde a SR-111 entra também o nome do registro onde a coluna não se chama "Nome", `COLUNAS_DO_NOME` em `csv-parse.ts`: Cursos sai "Curso | Nº do evento | Início | Descrição" e Propriedades "Propriedade | Matrícula | Nome do dono | Cidade", as duas em pé. "Curso" fica fora da lista geral porque também é coluna das inscrições, onde o PDF já é de um curso só) e `modelo: 'Resumo'`, e é desenhado pelo `RelatorioJsonDocument` (em pé até 5 colunas). Assim vai para a auditoria como PDF, com os campos. Título e nome do arquivo são os de antes. Diferenças que a pessoa vê: o cabeçalho ganha "Modelo: Resumo · Filtros: …", o telefone gravado só com dígitos sai com máscara ("(44) 9991-0137") e a folha fica em pé com até 5 colunas. **Lançamentos e Auditoria** (só exportavam planilha antes, não há colunas "de sempre"; os nomes preferidos achariam só "Data" e "Descrição" nos lançamentos) usam o modelo de fábrica resumido da API (`pdfRapido`, mapa `MODELO_DO_PDF_RAPIDO`): "Resumido" (Nº, Data, Descrição, Nome / Razão social, Valor (R$)) e "Resumida" (Data e hora, Quem, Ação, Alvo), e o `modelo` mandado é esse nome. **Acima de 2.000 linhas o PDF rápido sai do CSV, como antes da decisão 006 (SR-103), só nas fontes que já tinham PDF** (SR-106; `caminhoDoPdfRapido`, `temPdfDoCsv`): se o total que a tela sabe (o `total` no "Todos", quantos estão marcados no "Selecionados") passa de `limits.pdfRows`, nem pede o PDF à API; se a tela não sabe e a API responde o 400 "O PDF aceita até 2.000 linhas…" (`ehLimiteDoPdf`), pede de novo sem `fields` em vez de mostrar o erro. Esse PDF do CSV (folha deitada, sem a linha de modelo e filtros) mostra as mesmas colunas que o da API mostraria (`colunasDoPdf` = os rótulos do resumo; `pdfColumns(header, rotulos)`) e vai para a auditoria como planilha, sem `fields`. **Lançamentos e Auditoria nunca tiveram PDF** e lá isso desenharia até 20.000 linhas no navegador: acima do limite (total conhecido), o item "Relatório em PDF" fica desligado e o menu mostra embaixo o aviso da API, "O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro."; sem saber o total, a API responde esse 400 e ele aparece como veio; sem o catálogo (não dá para saber as colunas), "Não foi possível montar o PDF agora. Tente de novo ou baixe a planilha.". O montador continua respeitando o limite e avisando, como antes. Sem catálogo (back velho; 404), o PDF ainda sai do CSV (`csv-parse.ts`, `RelatorioDocument`), como o "Relatório de cadastros", que não tem montador. O aviso de sucesso diz "Planilha com N registros baixada." / "Relatório com N registros baixado." (milhar com ponto). O catálogo é lido no clique com `fetchQuery` (o cache de `useExportCatalog`), para o PDF não mudar de forma conforme o catálogo já tenha chegado ou não.
- **Documentos montados no navegador na auditoria (SR-106; rota da SR-104, `back` CLAUDE.md "Auditoria › Documentos montados no navegador")**: os PDFs que o painel desenha sozinho chamam `registrarDocumento(tipo, { linhas, alvo, ids, escopo })` (`lib/registrar-documento.ts`) **antes** de gerar, depois de buscar os dados (para saber quantos e o nome). A API grava a linha EXPORT "Gerou o documento "Lista de presença: HORTA · 12 registros · com CPF"". **Se o registro falhar, o documento não é gerado** e a tela mostra a mensagem: 403 → "Você não tem permissão para gerar este documento."; 429 → o texto da API, "Muitos documentos seguidos. Aguarde um minuto e tente de novo."; sem internet ou 5xx → "O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo." (`erroDoDocumento` no `catch`; quem usa `apiErrorMessage` recebe a mesma mensagem). O alvo é curto (até 120, cortado com "…"; `alvoDoDocumento`); `ids` vazios e repetidos saem, e acima de 1000 a lista fica de fora inteira. A diagramação dos documentos não mudou. Onde:
  - **Lista de presença** (`RegistrationsTab`): `lista-presenca`, alvo = o curso, ids = as inscrições confirmadas, linhas = quantas.
  - **Ficha de inscrição** (`RegistrationsTab`): uma → `ficha-inscricao`, alvo "<curso> · <pessoa>", ids = [a inscrição]; "Exportar todas" → UMA chamada, alvo = o curso, ids = todas as inscrições, `escopo: 'todos'`. A ficha lê a pessoa (`GET /admin/users/:id`, READ_USER): **sem "Visualizar usuários"** (SR-111), "Baixar ficha de inscrição" e "Exportar todas" ficam desligados, com a dica "Pede a permissão Visualizar usuários" (o "Exportar todas" é um `PermissionButton`; na linha, a ação do `RowActions` vai com `disabled` + `reason`: à vista, a dica diz "Baixar ficha de inscrição" e o motivo; no menu "Mais", o motivo vem escrito embaixo do nome). Carregando as permissões, ou se elas não vieram, os botões ficam ligados e quem decide é a API; o 403 da busca da pessoa mostra "Você não tem permissão para gerar este documento." (o texto do 403 do registro), não o genérico "Erro ao gerar a ficha de inscrição.".
  - **Agenda › Imprimir** (`AgendaSection`): `agenda`, alvo "05/10/2026 a 11/10/2026 · Sala: AUDITORIO · Tipo: Reunião · Busca: …" (`periodoDoDocumento`; um dia só sai "05/10/2026"), linhas = os itens da tela (o de vários dias conta uma vez), `escopo: 'com filtros'`, sem ids.
  - **Financeiro** (`financeiro/index.tsx`, aba Visão geral): "Baixar PDF" → `financeiro` (linhas = os lançamentos do relatório, sem "só nota"); "Relatório de despesas" → `relatorio-despesas` (linhas = `despesasDoRelatorio`); os dois com alvo = o período e `escopo: 'com filtros'`. **Nota de Empenho** (linha da lista e a prévia do formulário) → `nota-empenho`, alvo "Nº 128 · COOP LTDA" (`alvoDoLancamento`: sem Nº, só o nome; sem nome, a descrição), ids = [o lançamento] (a prévia sem id vai sem ids), `escopo: 'seleção'`. **Recibo** (`useGerarRecibo`, que a ação da lista e o `ReciboButton` usam) → `recibo`, igual à Nota.
  - **Unimed** (`lib/unimed-docs.ts`, usado pela tela da Unimed e pela aba Unimed da ficha da pessoa): `unimed-ficha`, `unimed-termo-adesao`, `unimed-contrato`, alvo = o nome da pessoa, ids = [o beneficiário]; a Ficha registra depois de buscar o titular. Erro sem mensagem da API: "Erro ao gerar a Ficha.", "Erro ao gerar o Termo de adesão." e "Erro ao gerar o Contrato." (`ERRO_DO_DOCUMENTO_UNIMED`, nas duas telas; SR-111: antes era o rótulo do botão, "Erro ao gerar o documento (Gerar Ficha).").
  - **O PDF do "Relatório de cadastros" NÃO chama a rota** (nem existe no tipo `DocumentoDoNavegador`): ele é montado do CSV de `/admin/export/cadastros`, que já grava a linha da planilha; uma chamada a mais daria duas linhas. O mesmo vale para o PDF rápido montado do CSV (fonte sem catálogo ou acima do limite). O tipo `relatorio-cadastros` da API fica sem uso.
- **Relatório de cadastros** (Usuários, botão "Relatório de cadastros", READ_USER_ADMIN): "Planilha CSV", "Planilha do Excel (.xlsx)" (SR-106: uma aba por seção — Pessoas físicas, Associados em dia, Pessoas jurídicas, Administradores — e a aba "Sobre") e "Relatório em PDF (para imprimir)" (montado do CSV). Aviso "Relatório de cadastros baixado (1.234 registros)."; erro e 429 com o texto da API (`exportErrorMessage`).
- **Pessoa**: só o CPF identifica (gravado só com dígitos; exibir com `maskCPF`). E-mail é opcional; e-mail e telefone podem repetir entre pessoas; telefone é obrigatório. RG é opcional (a CIN usa o CPF), mas validado quando preenchido. Onde se DIGITA o número, o rótulo é "CPF / CIN" (`lib/cin.ts`); onde só se exibe, "CPF".
- **Campos de pessoa num lugar só**: cada campo é desenhado uma vez em `components/cadastro/person-form-fields.tsx`; as duas telas (`usuarios/novo` e `usuarios/$id`) só escolhem quais e em que cartão. `src/test/forms/cadastro-pessoa.test.ts` exige que todo campo do associado esteja nas duas.
- **Caixa alta**: `upperNoAccents` nos campos de cadastro (nomes, endereços, razão social). Texto que o visitante lê sai **como foi digitado**: título e observações do curso, título da reserva que vai para `/eventos`.
- **Listas fixas duplicadas com o backend**: `ROOM_NAMES`, `MEMBER_TYPES`, `MEMBER_STATUS`, `UNIMED_MOVEMENT_TYPES`, `UNIMED_DEPENDENCY_DEGREES`. Mudou uma, mude a outra; o teste que compara os dois repositórios mora no backend (`src/lib/__tests__/listas-fixas_test.ts`).
- **Edição com campo opcional vazio**: na reserva, vai como `null`. No curso (`buildCourseBody` em `lib/course-body.ts`), na edição todo campo opcional esvaziado vai como `null` (fora do PATCH a API mantém o valor antigo); nos números (preço, carga horária, mínimo de alunos) a API grava 0. A criação nunca manda `null`.
- **Abas da lista de cursos (SR-059, A9)**: "Próximos" = o dia do início ainda não chegou; "Armazenados" = o dia do início é hoje ou já passou (Brasília), de qualquer status, o concluído marcado como "Concluído". Quem separa é o backend (`GET /admin/courses?view=upcoming|stored`, sem job): o curso muda de aba sozinho no dia do início. A aba vai na URL (`?lista=armazenados`; Próximos é o padrão e não aparece). Trocar de aba volta para a página 1 e zera a seleção (senão "Excluir selecionados" alcançaria cursos fora da tela); busca e ano continuam. A janela do curso (`?curso=<id>`, inscritos, presença, documentos, "Concluir curso") é a mesma nas duas abas. Só a lista do gerenciamento usa `view`: Painel Geral, site público e seletores listam sem ele. O "Exportar" de cursos manda a aba, a busca e o ano (`view`, `search`, `year`, os mesmos filtros da lista; SR-100/SR-101), então "Todos (N)" é o total da tela, e o "Armazenados" sai do mais recente para o mais antigo, como a aba.
- **Inscritos do curso (SR-059, A6)**: a API entrega da mais antiga para a mais nova e a tela mostra **na ordem recebida** (não reordene no front). Cada inscrição mostra "Inscrito em dd/mm/aaaa hh:mm" (`formatDateTimeBrasilia`, `createdAt` é um instante real, não horário de parede), em qualquer largura. A lista de presença em papel continua em ordem alfabética (`sortByName`), de propósito.
- **Curso**: inicia mesmo com inscrição não confirmada; `COMPLETED` é sempre manual; o sistema NÃO emite certificado (quem emite é a FAEP).
- **Home**: sem seção de galerias (ficam no Sobre, pedido do usuário); convênios são itens próprios no menu, sem submenu.
- **Painel Geral — ordem de fábrica** (SR-081): ações rápidas, números, aviso das cotações, **agenda das salas** (o bloco principal), Financeiro do mês e os três cartões pequenos (`DASHBOARD_BLOCKS` em `dashboard-prefs.ts`). Quem personalizou continua com a ordem salva. Nos números, as pendências com algo a fazer vão à frente, em cartão maior no tom de aviso, e o resto fica compacto (`StatsRow`).
- **Painel Geral — arrastar blocos**: a prévia do arrasto anda só por `transform` (`dashboard-drag.ts`) e a ordem real só muda no `onDragEnd`. Não use as estratégias prontas do `@dnd-kit` nem reordene no `onDragOver`: as duas coisas já foram tentadas e quebram (blocos esticados; blocos se alternando sem parar). Grade de 4 colunas, bloco de 2 a 4 (`DashboardSpan`); preferências antigas `'full'`/`'half'` viram 4 e 2 em `normalizePrefs`.
- **Ajuda**: cada tela do menu tem um "?" (`AjudaLink topico="<artigo>"`) ao lado do título; um teste exige que o artigo exista. Os artigos são do chat de Ajuda. O "?" abre na mesma aba; `novaAba` abre em outra (`target="_blank"`, e o rótulo diz "(abre em outra aba)") e é só para onde sair da tela perde trabalho não salvo: hoje, só o montador de relatórios.
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
  - A sidebar mostra todos os itens enquanto as permissões não carregaram (ou se falharam). Com as permissões conhecidas, o item sem permissão some e a seção que ficou sem nenhum item também (o título "Financeiro"/"Configurações" não fica solto, SR-126).
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
useInstructors              → GET /admin/instructors (exige READ_USER: `useInstructors({ enabled })`; só o AddInstructorForm usa)
usePromoteInstructor / useUpdateInstructor / useRemoveInstructor → POST / PATCH / DELETE /admin/users/:id/instructor
useCEPLookup                → GET /address/cep/:cep
usePublicContacts           → GET /contacts (público)
usePartners                 → GET /partners (público, publicGet)
useContactMessages          → GET /admin/contacts/messages · useMarkContactMessageRead PATCH …/:id · useDeleteContactMessage
useSendContactMessage       → POST /contacts/message (público, fetch cru)
```

**Os outros arquivos de `hooks/`**:
- `useCourse.ts` — admin: `useAdminCourses` (`status`, `search`, `year`, `view`; a aba é parte da chave do cache), `useCourseYears`, `useAdminCourse` (`adminCourseQuery`), criar/editar/excluir, capa, galeria, instrutores (`useAssignInstructor`, `useRemoveInstructorAssignment`), inscrições (`useAllCourseRegistrations`, `useAdminRegisterPerson`, `useConfirmAllRegistrations`), presença (`useSetRegistrationAttendance`, `useMarkUnmarkedAttendance`), `useCompleteCourse`; público: `useCourses`, `useCourse`, `useLookupCpf` (POST, CPF + 4 últimos dígitos), `useRegisterByCpf` (`{ cpf, phoneEnd }`), `useRegisterFull`.
- `useNews.ts` — `useNews`, `useNewsDetail` (públicos), `useAdminNews` (`status`, `search`), criar/editar/excluir, `useUploadNewsBanner`, `useUploadNewsBlockImage`.
- `useBanner.ts` — `useBanners` (público, publicGet), `useAdminBanners`, criar/editar/excluir, imagem, `useReorderBanners`.
- `useCompanies.ts` — empresas: lista, detalhe, CRUD, vínculos (members; pela pessoa: `useLinkPersonToCompany`/`useUnlinkPersonFromCompany`), propriedades, parceria (`useSetCompanyPartner`, `useReorderPartners`, `useUploadCompanyPartnerLogo`), títulos (`useCompanyMemberTitles`, `COMMON_MEMBER_TITLES`), `companyDisplayName`.
- `useFinance.ts` — categorias, caixas, lançamentos (+ `financeExportFilters`: os filtros da lista para o `ExportMenu` da fonte `finance-transactions`; transferência, comprovantes), recorrências, formas de pagamento, fechamentos e `useFinanceSummary`. `useCreateFinanceTransaction` devolve a linha criada (com `number`), `useCreateFinanceTransfer` devolve `{ message, transactions: [saída, entrada] }`, `useFinanceNextNumber` lê o próximo Nº automático, e `TransactionFilters.orderBy` (`date`|`number`) vale na lista e na exportação.
- `useUnimed.ts` — `useUnimedList`, `useUnimedByPerson`, `useUnimed`, criar/editar/excluir.
- `useReportTemplates.ts` (SR-115) — modelos de relatório da equipe: `useReportTemplates(dataset, { enabled })` (`GET /admin/report-templates/:dataset`; o montador só busca aberto; `staleTime: 0`, confere a cada abertura; 404 e 403 viram `null` = sem modelos da equipe e sem "Salvar como modelo…") e `useReportTemplateMutations(dataset)` → `{ salvar, mudar, excluir }` (POST, PATCH, DELETE): põem a resposta na lista do cache na hora (`comModelo`/`semModelo`, na ordem do nome) e pedem a lista de novo.
- `useExportCatalog.ts` — `useExportCatalog(dataset)`: `GET /admin/export/:dataset/catalog`, `staleTime` de 30 min. 404 (back velho, ou fonte que ainda não tem montador) e 403 viram `null`; resposta fora do formato também (`lerCatalogo`). Com `null` ou erro, o `ExportMenu` não mostra "Montar relatório…".
- `useConvenios.ts` — `useConvenioMenu`, `usePublicConvenio` (públicos), admin CRUD e logo.
- `useGalleries.ts` — `usePublicGalleries` (publicGet), admin CRUD, fotos (upload, legenda, ordem).
- `useMarketQuotes.ts` — `useMarketQuotes`, `useQuoteHistory` (públicos), `useAdminMarketQuotes`, `useSaveDailyQuotes`, `useUpdateQuoteUnit`.
- `useSiteSettings.ts` — `usePublicSiteSettings`, `useAdminSiteSettings`, `useUpdateSiteSettings`, `useUpdateQuotesSource`, `useOrgInfo` (sem valor reserva: carregando ou erro = campos vazios, o site esconde a linha).
- `usePublicContactsAdmin.ts`, `usePublicEvents.ts`, `useRooms.ts` (CRUD; `GET /rooms` exige READ_COURSE, então o Painel Geral chama `useRooms({ enabled })` só com a permissão), `useRoomBookings.ts` (`useRoomBookings`, `useRoomSchedule`, CRUD), `useAuditTrail.ts` (trilha + tempo de guarda), `useNotifications.ts` (a cada 60s e ao voltar à aba), `useInvite.ts` (`useInvite`, `useAcceptInvite`, fetch cru).
- Utilitários: `usePermissions`, `use-unsaved-guard`, `useRowSelection` (seleção que continua entre páginas), `useCrudDialog`, `useDebouncedValue`, `useConfirmDeletePhoto`, `useSeo`, `use-mobile` (768 px: sino, agenda), `use-compact-nav` (1024 px: o menu lateral do painel vira gaveta), `use-users` (`authenticateUser`, `refreshAuthToken`).

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
- `GET /admin/courses` (`page`, `limit`, `status`, `search`, `year`, `view=upcoming|stored` — só o gerenciamento manda `view`) · `GET /admin/courses/years` · `GET /admin/courses/:id`
- `POST /courses` — criar (aceita `eventNumber`, `minStudents`, `roomId`). "Duplicar curso" manda `copyCoverFromCourseId` e `copyInstructorsFromCourseId` + `instructorAssignmentIds`; resposta `{ id, coverCopied?, instructorsCopied? }`. Galeria não é copiada
- `PATCH /courses/:id` — atualizar (campo fora do corpo não muda; `null` limpa: `registrationDeadline`, `observations` e `eventNumber` ficam nulos, `price`, `workloadHours` e `minStudents` viram 0) · `DELETE /courses/:id`
- `POST /courses/:id/banner` (multipart; gera a miniatura WebP → `{ url, thumbUrl }`) · `POST /courses/:id/gallery` · `DELETE /courses/:id/gallery/:photoId`
- `POST /admin/courses/:id/instructors` · `DELETE /admin/courses/:id/instructors/:assignmentId`
- `GET /admin/courses/:id/registrations` (paginado; da inscrição MAIS ANTIGA para a mais nova, com `createdAt`) · `POST /admin/courses/:id/registrations` `{ userDataId }` ("Inscrever pessoa": já confirmada, ignora o prazo; repetida ou lotado → 409)
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
- `GET /admin/audit-logs` — paginado; `action=create|edit|delete|export|login|login_failed`, `entity`, `actorId`, `ip`, `from`, `to`, `q`. Cada linha traz `summary` (frase pronta, montada no backend), `ip`, `location`, `device`, `userAgent` e `changes` (`[{ field, before, after }]`; senha trocada = "alterada", sem valor). As entidades do filtro "Tipo" vêm do backend (`src/lib/audit-entity.ts` de lá; a lista `ENTITIES` de `auditoria/index.tsx` repete os nomes, e entidade nova entra nela, como "Modelo de relatório", SR-115). Os rótulos dos campos de `changes` (`AUDIT_FIELD_LABELS` em `lib/audit-fields.ts`) espelham o `AUDIT_FIELD_LABELS` do back (`lib/audit-diff.ts` de lá): campo novo lá, rótulo novo aqui. Exportação pelo montador traz `details` `{ formato, modelo, campos: [rótulos], escopo: 'seleção'|'com filtros'|'todos', filtros: [{ nome, valor }], linhas }`, que vira o bloco "O que foi exportado" (`export-details.ts`; linha sem `details` não mostra nada)
- `GET /admin/audit-settings` (READ_AUDIT) → `{ retentionDays, options, oldestAt, total }` · `PATCH` (UPDATE_AUDIT) `{ retentionDays }` (0 = para sempre). Baixar o prazo apaga na hora os mais antigos

**Exportação** (contrato da API: `back` CLAUDE.md "Exportação e montador de relatórios", SR-088) — `POST /admin/export/:dataset` (corpo JSON; `ids` = selecionados ou um só, até 5000; sem `ids` = mesmos filtros da listagem). Sem `fields`, o servidor manda o CSV de sempre (`;` com BOM, `Content-Disposition`, `X-Export-Count`); com `format: 'xlsx'` (com ou sem `fields`, também no `cadastros`; SR-104), a planilha do Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition` `.xlsx`, `X-Export-Count`, até 20.000 linhas), que vai para a auditoria como `details.formato: 'xlsx'` ("Excel (.xlsx)" no bloco "O que foi exportado"); o **PDF rápido** do menu vem da API (ver "Montador de relatórios") e só é montado no front a partir do CSV sem catálogo ou acima de 2.000 linhas (`lib/relatorio-pdf.tsx`). Cada exportação vai para a auditoria. 30 exportações por minuto por IP → 429 "Muitas exportações seguidas. Aguarde um minuto e tente de novo." (o front mostra esse texto: `exportErrorMessage`)
- Datasets: `people`, `companies`, `properties` (`ownerIds`), `unimed` (READ_USER) · `admins`, `cadastros` (relatório dos 4 tipos num arquivo; READ_USER_ADMIN) · `courses`, `registrations` (`courseIds`), `room-bookings` (`from`, `to`, `roomId`, `type`, `search`; READ_COURSE) · `contact-messages` (READ_CONTACT) · `audit-logs` (`action`, `entity`, `actorId`, `ip`, `from`, `to`, `q`; no máximo as 20.000 mais recentes; READ_AUDIT) · `finance-transactions` (`from`, `to`, `type`, `categoryId`, `accountId`, `method`, `search`, `orderBy`; sem `ids`; arquivo `lancamentos-AAAA-MM-DD.csv`; READ_FINANCE; SR-102)
- **Documentos do navegador** (SR-104): `POST /admin/export/documents/:kind` (`lista-presenca`, `ficha-inscricao`, `agenda`, `financeiro`, `relatorio-despesas`, `nota-empenho`, `recibo`, `unimed-ficha`, `unimed-termo-adesao`, `unimed-contrato`, `relatorio-cadastros`), corpo `{ linhas (0–100000), alvo? (até 120), ids? (1–1000, até 64 cada), escopo? ('seleção'|'com filtros'|'todos') }` → 204. 400 tipo ou corpo inválido; 403 sem a permissão do documento; 429 "Muitos documentos seguidos. Aguarde um minuto e tente de novo." (30 por minuto, à parte das exportações). Uso no front: "Documentos montados no navegador na auditoria".
- **Modelos da equipe** (decisão 006, fase 3; contrato: `back` CLAUDE.md "Exportação › Modelos da equipe", SR-114). Todas pedem a permissão de exportar o conjunto (sem ela, 403 `Forbidden`). `GET /admin/report-templates/:dataset` → array pelo nome: `{ id, dataset, name, fields (só chaves que ainda estão no catálogo; as sem permissão de quem lista vêm também), missingFields (as que saíram do catálogo), format: csv|pdf|xlsx|null, confirmed: boolean|null (só inscrições), createdAt, updatedAt, createdBy: { id, username|null }, updatedBy|null }` · `POST` `{ name, fields, format?, confirmed? }` → 201 com o modelo · `PATCH /:id` `{ name?, fields?, format?, confirmed? }` → 200 (`format: null` tira a preferência) · `DELETE /:id` → 204 (soft-delete; o nome fica livre). Erros `{ error }` que a tela mostra como vieram: 400 ("Informe o nome do modelo.", "O nome do modelo pode ter até 64 caracteres.", "Escolha pelo menos um campo.", "No máximo 80 campos por relatório.", "Campo desconhecido: …", "Campo repetido: …", "Formato inválido: use csv, pdf ou xlsx.", "Nada para alterar."), 403 ("Sem permissão para exportar: RG, …" ao salvar ou mudar campos; "Este modelo tem campos que você não pode exportar: RG." ao mudar ou excluir), 404 ("Este conjunto ainda não tem o montador.", "Modelo não encontrado."), 409 ("Já existe um modelo da equipe com esse nome.", "Já existe um modelo de fábrica com esse nome.", "Este relatório já tem 100 modelos da equipe. Exclua um antes de salvar outro."). Exportar com o modelo manda `fields` e `modelo: <nome>`. Na auditoria: tipo "Modelo de relatório", frases `Criou/Editou/Excluiu o modelo de relatório "Pessoas: …"`, `changes` com `name`, `fields`, `format` e `onlyConfirmed`
- **Montador** (decisão 006; todas as fontes menos `cadastros`): `GET /admin/export/:dataset/catalog` (mesma permissão da exportação) → `{ dataset, title, groups: [{ name, fields: [{ key, label, type, privacy: comum|pessoal|sensivel, allowed, reason }] }], padrao: string[], modelos: [{ id, name, fields, confirmed? }] (sem o Padrão), filterLabels, limits: { rows: 20000, pdfRows: 2000, fields: 80 } }`; conjunto sem montador → 404 "Este conjunto ainda não tem o montador.". O corpo da exportação ganha `fields` (chaves, na ordem das colunas), `format` (`csv`|`xlsx`|`pdf`), `modelo` (até 64; id de fábrica ou nome) e `confirmed` (só `registrations`). Com `format: 'pdf'` a resposta é JSON `{ title, filename, count, filters ("Busca: silva · …", "Seleção: 8 registros" ou ""), modelo, columns: [{ key, label, type, weight }], rows: string[][] }`, desenhado por `RelatorioJsonDocument`. Erros 400 em português ("Escolha pelo menos um campo.", "O PDF aceita até 2.000 linhas…" etc.) e 403 "Sem permissão para exportar: RG, …" aparecem como vieram. Com `fields`, o telefone sai com máscara; sem `fields`, como gravado (o padrão não muda)

**Financeiro (admin)** — `*_FINANCE`; valores em centavos
- `GET /admin/finance/categories` (`?all=true` inclui inativas) · `POST` · `PATCH /:id` · `DELETE /:id`; o mesmo para `/accounts` (caixas) e `/payment-methods` (nome em caixa alta, único)
- `GET /admin/finance/transactions` (from, to, type, categoryId, accountId, method, search — descrição, nome / razão social ou CNPJ/CPF da Nota de Empenho; o CNPJ/CPF só quando o termo tem só números e pontuação, com 3+ dígitos; termo só de dígitos acha também o `number` igual e o "Nº anterior" igual sem os zeros à esquerda; `orderBy=date|number`; `totals` de todos os filtrados) · (a rota antiga `GET …/transactions/export` foi apagada da API na SR-119; o CSV dos lançamentos sai pela fonte `finance-transactions`) · `POST` (aceita `number?`; responde 201 com a linha) · `PATCH /:id` (aceita `number`; responde `{ message, transaction }`) · `DELETE /:id`
- **Nº do lançamento (SR-066)**: `GET /admin/finance/transactions/next-number` → `{ next }` (READ_FINANCE; só informativo, não reserva). Todo lançamento da lista traz `number`. Número em uso → **409** `{ error: "O número 123 já é de outro lançamento." }` (ou "… de um lançamento excluído."); `number` `null`, 0 ou texto no PATCH → 400. Regra completa em "Regras de negócio".
- `POST /admin/finance/transfers` (201 `{ message, transactions: [saída, entrada] }`, com dois Nº seguidos) · `POST /admin/finance/transactions/:id/attachments` (multipart) · `GET` / `DELETE /admin/finance/attachments/:id`
- Mês fechado no caixa → **409** `{ error: "O mês 10/2026 está fechado no caixa \"BANCO\". Reabra o mês para mudar lançamentos dele." }` em criar, editar e excluir lançamento e em criar transferência. Entrada inválida → 400 com o motivo em português (SR-055, ex.: "Data inválida: use um ano entre 1900 e 2999."); os formulários mostram o `error` como veio, e a lista, o resumo e a prévia do fechamento mostram o 400 no lugar do "Não foi possível carregar" (`loadErrorMessage`)
- `GET /admin/finance/summary?from&to` · recorrências: `GET /recurrences` · `POST` · `PATCH /:id` · `DELETE /:id` · `POST /recurrences/generate` → `{ created }`
- `GET /admin/finance/closings[?accountId&year]` (sem filtro = todos os caixas: é o que a aba Lançamentos usa para a trava) · `GET /closings/preview?accountId&month` · `POST /closings` `{ accountId, month, countedBalanceCents, notes? }` (esperado recalculado no servidor) · `DELETE /closings/:id` ("Reabrir mês", DELETE_FINANCE; vai para a auditoria como "Reabriu o mês "10/2026 · BANCO"", entidade "Fechamento de caixa")

**Notificações (admin)**
- `GET /admin/notifications` → `{ unreadCount, pendingCount, events: [...], pending: [...] }` · `PATCH /admin/notifications/read` `{ ids? }` → `{ updated }`

**Utilitário**
- `GET /address/cep/:cep` — CEP (ViaCEP + cache)
