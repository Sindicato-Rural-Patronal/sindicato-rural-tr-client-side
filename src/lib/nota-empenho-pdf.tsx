import { Fragment } from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { centsToBRL } from '@/utils/masks'
import { valorPorExtensoLegado } from '@/lib/extenso-legado'
import { saveBlob } from '@/utils/download'
import type { Empenho } from '@/hooks/useFinance'
import {
  NE_FUNDO_PNG, NE_TITULO_PF_PNG, NE_NOTA_FISCAL_PNG, NE_BANCO_PNG, NE_CONTA_PNG,
  NE_AGENCIA_PNG, NE_CHEQUE_PNG, NE_PONTILHADO_PNG,
} from '@/lib/nota-empenho-pdf-assets'

// Réplica da Nota de Empenho do sistema legado (ruraltr.com.br/sistema/ne_pj.php e ne_pf.php).
// Lá o modelo é uma imagem de fundo (cabeçalho, caixas, faixas e rótulos) com os dados em
// Arial por cima; aqui é o mesmo fundo e os dados em Helvetica (mesmas medidas da Arial),
// todos posicionados em pt com as coordenadas medidas no PDF do legado.

// Sem hifenização: palavra não é quebrada no meio.
Font.registerHyphenationCallback(word => [word])

// A nota precisa só destes campos do lançamento.
export type NotaData = {
  amountCents: number
  date: string
  description: string
  empenho: Empenho | null
}

// Assinaturas institucionais (dirigentes do sindicato).
const SIGNATORIES = [
  { name: 'OSVAIR MAURO FRASSON', role: 'EXECUTIVO', center: 121.4 },
  { name: 'FERNANDO VOLPATO MARQUES', role: 'PRESIDENTE', center: 285.3 },
  { name: 'ADEMIR FERREIRA DE PÁDUA', role: 'FINANCEIRO', center: 462.0 },
]

// Fundo do modelo: 983x1342 px desenhados em (28.5, 28.5) com 539.25 pt de largura.
const BG = { x: 28.5, y: 28.5, w: 539.25, h: 736.19 }
const PX = BG.w / 983
const MID = BG.x + BG.w / 2

const GRAY = '#333333'
const BLACK = '#000000'

// Distância do topo da caixa de texto até a linha de base, em fração do corpo (Helvetica no
// react-pdf; a entrelinha extra fica toda abaixo da linha).
const ASC = 0.905

const styles = StyleSheet.create({
  page: { position: 'relative', fontFamily: 'Helvetica', color: GRAY },
  abs: { position: 'absolute' },
  b: { fontFamily: 'Helvetica-Bold' },
})

// Larguras aproximadas da Helvetica-Bold (em em) pra reduzir o corpo de valores longos
// antes que invadam a coluna vizinha.
function approxWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) {
    if (/[\sIÍ.,/:;!|]/.test(ch)) w += 0.278
    else if (/[A-ZÀ-Ý&@]/.test(ch)) w += 0.69
    else if (/[a-zà-ÿ]/.test(ch)) w += 0.58
    else if (ch === '-' || ch === '(' || ch === ')') w += 0.333
    else w += 0.556
  }
  return w * size
}
function fit(text: string, size: number, maxWidth: number): number {
  const w = approxWidth(text, size)
  return w > maxWidth ? Math.max(4, (size * maxWidth) / w) : size
}

/** Texto numa linha, com a linha de base em `baseline` (pt). */
function Line({ x, baseline, size, text, bold, color = GRAY, width, align = 'left' }: {
  x: number; baseline: number; size: number; text?: string | null; bold?: boolean; color?: string
  width?: number; align?: 'left' | 'center'
}) {
  if (!text) return null
  const fs = width ? fit(text, size, width) : size
  // Com o corpo reduzido, a linha de base continua no mesmo lugar.
  const top = baseline - ASC * fs
  const box = align === 'center' && width
    ? { left: x - width / 2, width, textAlign: 'center' as const }
    : { left: x, width: width ?? 400 }
  return (
    <Text style={[styles.abs, box, { top, fontSize: fs, lineHeight: 1, color }, bold ? styles.b : {}]}>
      {text}
    </Text>
  )
}

function Label({ x, baseline, text }: { x: number; baseline: number; text: string }) {
  return <Line x={x} baseline={baseline} size={5.49} text={text} />
}

function Img({ src, x, y, w, h }: { src: string; x: number; y: number; w: number; h: number }) {
  return <Image src={src} style={[styles.abs, { left: x, top: y, width: w, height: h }]} />
}

export function NotaEmpenhoDocument({ tx }: { tx: NotaData }) {
  const e = tx.empenho ?? {}
  const liquidoCents = tx.amountCents
  const descontoCents = e.descontoCents ?? 0
  const brutoCents = liquidoCents + descontoCents
  const dataFmt = formatDateFromString(tx.date.slice(0, 10))
  const extenso = valorPorExtensoLegado(liquidoCents)
  // Textos em maiúsculas como na nota do legado (números ficam como foram digitados).
  const up = (v?: string | null) => (v ? v.toLocaleUpperCase('pt-BR') : '')
  const descricao = up(tx.description)
  // CPF (11 dígitos) = pessoa física (ne_pf.php); o resto segue o modelo de pessoa jurídica.
  const pessoaFisica = (e.cnpjCpf ?? '').replace(/\D/g, '').length === 11
  const assinatura = up(e.nomeFantasia || e.razaoSocial)
  // Descrição longa: corpo menor pra caber em até 3 linhas antes da faixa do RECIBO.
  const discSize = fit(descricao, 8.78, 3 * 480)
  const nfSize = e.notaFiscal ? fit(e.notaFiscal, 10.97, 450) : 10.97

  return (
    <Document title={`Nota de Empenho${e.numero ? ` ${e.numero}` : ''}`}>
      <Page size="A4" style={styles.page}>
        <Img src={NE_FUNDO_PNG} {...BG} />
        {pessoaFisica && (
          <Img src={NE_TITULO_PF_PNG} x={BG.x + 506 * PX} y={BG.y + 30 * PX} w={473 * PX} h={40 * PX} />
        )}

        {/* Cabeçalho: data de emissão e identificação */}
        <Line x={369.3} width={120} align="center" baseline={114.6} size={10.97} bold color={BLACK} text={dataFmt} />
        <Line x={501.2} width={120} align="center" baseline={114.6} size={10.97} bold color={BLACK} text={e.numero} />

        {/* Fornecedor — coluna da esquerda */}
        <Label x={50} baseline={157.4} text="NOME FANTASIA" />
        <Line x={50} baseline={169.5} size={9.33} bold width={250} text={up(e.nomeFantasia)} />
        <Label x={50} baseline={185.9} text="RAZÃO SOCIAL" />
        <Line x={50} baseline={198.6} size={9.33} bold width={250} text={up(e.razaoSocial)} />
        <Label x={50} baseline={212.8} text={pessoaFisica ? 'CPF' : 'CNPJ'} />
        <Line x={50} baseline={221.1} size={7.68} bold width={92} text={e.cnpjCpf} />
        <Label x={145.9} baseline={212.8} text="INSC. ESTD." />
        <Line x={145.9} baseline={221.1} size={7.68} bold width={154} text={e.inscricaoEstadual} />

        {/* Fornecedor — coluna da direita */}
        <Label x={304.7} baseline={157.4} text="ENDEREÇO" />
        <Line x={304.7} baseline={167.3} size={6.58} bold width={140} text={up(e.endereco)} />
        <Label x={449.2} baseline={157.4} text="BAIRRO" />
        <Line x={449.2} baseline={167.3} size={6.58} bold width={61} text={up(e.bairro)} />
        <Label x={514} baseline={157.4} text="CEP" />
        <Line x={514} baseline={167.3} size={6.58} bold width={52} text={e.cep} />
        <Label x={304.7} baseline={183.7} text="CIDADE" />
        <Line x={304.7} baseline={190.9} size={6.58} bold width={140} text={up(e.cidade)} />
        <Label x={449.2} baseline={183.7} text="UF" />
        <Line x={449.2} baseline={190.9} size={6.58} bold width={61} text={up(e.uf)} />
        <Label x={304.7} baseline={208.4} text="TELEFONE" />
        <Line x={304.7} baseline={215.6} size={6.58} bold width={140} text={e.telefone} />

        {/* Valores */}
        <Line x={85.1} width={108} align="center" baseline={298.4} size={10.97} bold color={BLACK} text={centsToBRL(brutoCents)} />
        <Line x={201.05} width={108} align="center" baseline={298.4} size={10.97} bold color={BLACK} text={centsToBRL(descontoCents)} />
        <Line x={317} width={108} align="center" baseline={298.4} size={10.97} bold color={BLACK} text={centsToBRL(liquidoCents)} />
        {/* Por extenso: centralizado na vertical da célula (2 linhas no modelo, base em 292.9 e 300.6) */}
        <View style={[styles.abs, { left: 470.7 - 90, width: 180, top: 272.6, height: 44, justifyContent: 'center' }]}>
          <Text style={[styles.b, { fontSize: 6.58, lineHeight: 7.7 / 6.58, textAlign: 'center' }]}>{extenso}</Text>
        </View>

        {/* Discriminação */}
        <Text style={[styles.abs, styles.b, {
          left: MID - 255, width: 510, top: 354.4 - discSize * ASC,
          fontSize: discSize, lineHeight: 10.1 / 8.78, textAlign: 'center',
        }]}>
          {descricao}
        </Text>

        {/* Recibo: parágrafo (2 linhas no modelo, base em 465.2 e 473.9) e, logo abaixo, local e data
            (base em 489.3) — se o extenso for longo e o parágrafo ganhar linha, a data desce junto. */}
        <View style={[styles.abs, { left: MID - 252, width: 504, top: 465.2 - 7.68 * ASC }]}>
          <Text style={{ fontSize: 7.68, lineHeight: 8.7 / 7.68, textAlign: 'center' }}>
            RECEBI (EMOS) DA TESOURARIA DO SINDICATO RURAL DE TERRA ROXA / PR, A IMPORTÂNCIA DE{' '}
            <Text style={[styles.b, { fontSize: 6.58, lineHeight: 8.7 / 6.58 }]}>
              {centsToBRL(liquidoCents)} - {extenso},
            </Text>
            {' '}CONSTANTE DESTA NOTA DE EMPENHO. DA QUAL PASSO (AMOS) A PRESENTE QUITAÇÃO.
          </Text>
          <Text style={[styles.b, {
            fontSize: 6.58, lineHeight: 1, textAlign: 'center',
            marginTop: 489.3 - 6.58 * ASC - (465.2 - 7.68 * ASC + 2 * 8.7),
          }]}>
            TERRA ROXA / PR, {dataFmt}
          </Text>
        </View>

        {/* Assinatura do fornecedor */}
        <Img src={NE_PONTILHADO_PNG} x={199.66} y={531.54} w={197.49} h={0.55} />
        <Line x={MID} width={300} align="center" baseline={542} size={6.58} bold color={BLACK} text={assinatura} />

        {/* Assinaturas do sindicato */}
        {SIGNATORIES.map(s => (
          <Fragment key={s.role}>
            <Img src={NE_PONTILHADO_PNG} x={s.center + 0.1 - 74.33} y={699.41} w={148.66} h={0.55} />
            <Line x={s.center} width={160} align="center" baseline={710.9} size={6.58} bold color={BLACK} text={s.name} />
            <Line x={s.center} width={160} align="center" baseline={719.2} size={5.49} text={s.role} />
          </Fragment>
        ))}

        {/* Nota fiscal: rótulo + número, o conjunto centralizado na página */}
        <View style={[styles.abs, { left: BG.x, width: BG.w, top: 742.75, flexDirection: 'row', justifyContent: 'center' }]}>
          <Image src={NE_NOTA_FISCAL_PNG} style={{ width: 82.83, height: 10.97 }} />
          {e.notaFiscal ? (
            <Text style={[styles.b, {
              fontSize: nfSize, lineHeight: 1, color: BLACK, marginTop: 753.7 - 742.75 - ASC * nfSize,
            }]}>
              {e.notaFiscal}
            </Text>
          ) : null}
        </View>

        {/* Banco, conta, agência e cheque */}
        <Img src={NE_BANCO_PNG} x={28.5} y={773.47} w={36.21} h={6.03} />
        <Line x={64.7} baseline={779} size={8.78} bold width={104} text={up(e.banco)} />
        <Img src={NE_CONTA_PNG} x={170.58} y={772.92} w={44.43} h={6.58} />
        <Line x={214.8} baseline={779} size={8.78} bold width={62} text={e.conta} />
        <Img src={NE_AGENCIA_PNG} x={279.2} y={772.92} w={44.43} h={7.13} />
        <Line x={332} baseline={779} size={8.78} bold width={40} text={e.agencia} />
        <Img src={NE_CHEQUE_PNG} x={373.55} y={773.47} w={52.11} h={6.03} />
        <Line x={425.7} baseline={779} size={8.78} bold width={140} text={e.cheque} />
      </Page>
    </Document>
  )
}

export async function downloadNotaEmpenho(tx: NotaData) {
  const blob = await pdf(<NotaEmpenhoDocument tx={tx} />).toBlob()
  const num = tx.empenho?.numero ? `-${tx.empenho.numero}` : ''
  saveBlob(blob, `nota-empenho${num}.pdf`)
}
