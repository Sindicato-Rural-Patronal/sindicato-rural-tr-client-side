import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import type { ExportDataset } from '@/lib/export'
import {
  comModelo, lerModeloDaEquipe, lerModelosDaEquipe, semModelo, type FormatoDoModelo, type ModeloDaEquipe,
} from '@/components/export/report-builder'

// Modelos de relatório da equipe (decisão 006, fase 3; contrato da SR-114 no
// CLAUDE.md do back, "Modelos da equipe"). São da equipe toda: o que uma pessoa
// salva no montador, as outras veem.
//
// A lista só é buscada com o montador aberto (`enabled`) e confere de novo a
// cada abertura (`staleTime: 0`), porque outra pessoa pode ter mudado. Salvar,
// mudar e excluir põem a resposta na lista na hora e pedem a lista de novo.
//
// `null` = a fonte não tem modelos da equipe para quem pede: 404 (back velho,
// sem a rota, ou conjunto sem montador) e 403 (sem a permissão de exportar a
// fonte). Aí o montador mostra só os modelos de fábrica e não oferece salvar.

export function reportTemplatesKey(dataset: ExportDataset) {
  return ['admin', 'report-templates', dataset] as const
}

function caminho(dataset: ExportDataset, id?: string) {
  return `/admin/report-templates/${dataset}${id ? `/${encodeURIComponent(id)}` : ''}`
}

export async function fetchReportTemplates(dataset: ExportDataset): Promise<ModeloDaEquipe[] | null> {
  try {
    const res = await apiFetch(caminho(dataset))
    return lerModelosDaEquipe(await res.json())
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null
    throw e
  }
}

export function useReportTemplates(dataset: ExportDataset, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ModeloDaEquipe[] | null>({
    queryKey: reportTemplatesKey(dataset),
    queryFn: () => fetchReportTemplates(dataset),
    staleTime: 0,
    enabled,
  })
}

/** `POST`: o nome, as colunas e, se houver, o formato e o "Só confirmadas". */
export type ModeloNovo = { name: string; fields: string[]; format?: FormatoDoModelo | null; confirmed?: boolean }

/** `PATCH`: só o que muda (`format: null` tira a preferência). */
export type MudancaDoModelo = Partial<ModeloNovo>

async function modeloDaResposta(res: Response): Promise<ModeloDaEquipe> {
  const modelo = lerModeloDaEquipe(await res.json())
  if (!modelo) throw new Error('Resposta do modelo fora do formato.')
  return modelo
}

export function useReportTemplateMutations(dataset: ExportDataset) {
  const queryClient = useQueryClient()
  const queryKey = reportTemplatesKey(dataset)
  const mudarLista = (fn: (lista: ModeloDaEquipe[]) => ModeloDaEquipe[]) =>
    queryClient.setQueryData<ModeloDaEquipe[] | null>(queryKey, atual => fn(atual ?? []))
  const conferir = () => queryClient.invalidateQueries({ queryKey })

  const salvar = useMutation({
    mutationFn: async (body: ModeloNovo) =>
      modeloDaResposta(await apiFetch(caminho(dataset), { method: 'POST', body: JSON.stringify(body) })),
    onSuccess: modelo => mudarLista(lista => comModelo(lista, modelo)),
    onSettled: conferir,
  })

  const mudar = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: MudancaDoModelo }) =>
      modeloDaResposta(await apiFetch(caminho(dataset, id), { method: 'PATCH', body: JSON.stringify(body) })),
    onSuccess: modelo => mudarLista(lista => comModelo(lista, modelo)),
    onSettled: conferir,
  })

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(caminho(dataset, id), { method: 'DELETE' })
    },
    onSuccess: (_, id) => mudarLista(lista => semModelo(lista, id)),
    onSettled: conferir,
  })

  return { salvar, mudar, excluir }
}
