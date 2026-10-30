import { Document, Page, View, Text, Image, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { saveBlob } from '@/utils/download'
import { SINDICATO_EMBLEMA_PNG } from '@/lib/unimed-pdf-assets'
import {
  RECIBO_TEXTOS, montarRecibo, nomeDoArquivoRecibo, numeroDoRecibo, pagadorDoRecibo,
  type EmissorRecibo, type ReciboData,
} from '@/lib/recibo'

// Recibo de entrada do Financeiro (SR-065, F4), no desenho PADRÃO: o cliente ainda vai
// mandar o modelo que usa hoje. Para ajustar o desenho, mexa só em ESTILO (aqui embaixo);
// para ajustar os textos, em RECIBO_TEXTOS (`lib/recibo.ts`). O resto não precisa mudar.
//
// A4 em pé, uma via no alto da folha, tudo em preto e cinza-escuro (o único traço colorido
// é o emblema do sindicato, que sai cinza na impressão preta e branca) e sem preenchimento
// de cor: o que separa as partes são filetes, não faixas coloridas.

// Sem hifenização: palavra não é quebrada no meio.
Font.registerHyphenationCallback(word => [word])

const ESTILO = {
  fonte: { normal: 'Helvetica', negrito: 'Helvetica-Bold' },
  cor: { texto: '#000000', suave: '#333333', filete: '#000000' },
  /** Corpo em pt. */
  tamanho: { cabecalhoNome: 12, cabecalhoLinha: 8.5, titulo: 30, rotuloQuadro: 7.5, numero: 18, valor: 20, corpo: 12.5, forma: 11, local: 11, assinatura: 10, assinaturaLegenda: 8.5 },
  /** Folha e moldura, em pt. */
  folha: { margem: 40, padding: 26, espessuraMoldura: 1.2, espessuraFilete: 0.8 },
  emblema: 58,
  /** Entrelinha do parágrafo (múltiplo do corpo). */
  entrelinha: 1.65,
  /** Largura da linha de assinatura, em pt. */
  linhaAssinatura: 250,
} as const

const styles = StyleSheet.create({
  page: { padding: ESTILO.folha.margem, fontFamily: ESTILO.fonte.normal, color: ESTILO.cor.texto },
  moldura: { borderWidth: ESTILO.folha.espessuraMoldura, borderColor: ESTILO.cor.filete, padding: ESTILO.folha.padding },

  // Cabeçalho: emblema + dados do sindicato.
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  emblema: { width: ESTILO.emblema, height: ESTILO.emblema, marginRight: 14 },
  cabecalhoTextos: { flex: 1 },
  cabecalhoNome: { fontFamily: ESTILO.fonte.negrito, fontSize: ESTILO.tamanho.cabecalhoNome },
  cabecalhoLinha: { fontSize: ESTILO.tamanho.cabecalhoLinha, color: ESTILO.cor.suave, marginTop: 2 },

  // Faixa do título: RECIBO à esquerda, quadros do número e do valor à direita.
  faixa: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: ESTILO.folha.espessuraFilete, borderBottomWidth: ESTILO.folha.espessuraFilete,
    borderColor: ESTILO.cor.filete, paddingVertical: 12,
  },
  titulo: { fontFamily: ESTILO.fonte.negrito, fontSize: ESTILO.tamanho.titulo, letterSpacing: 4 },
  quadros: { flexDirection: 'row', alignItems: 'stretch' },
  quadro: {
    borderWidth: ESTILO.folha.espessuraMoldura, borderColor: ESTILO.cor.filete,
    paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', justifyContent: 'center',
  },
  quadroNumero: { minWidth: 70, marginRight: 8 },
  quadroValor: { minWidth: 150 },
  quadroRotulo: { fontSize: ESTILO.tamanho.rotuloQuadro, fontFamily: ESTILO.fonte.negrito, color: ESTILO.cor.suave },
  quadroNumeroTexto: { fontSize: ESTILO.tamanho.numero, fontFamily: ESTILO.fonte.negrito, marginTop: 1 },
  quadroValorTexto: { fontSize: ESTILO.tamanho.valor, fontFamily: ESTILO.fonte.negrito, marginTop: 1 },

  // Corpo.
  corpo: { fontSize: ESTILO.tamanho.corpo, lineHeight: ESTILO.entrelinha, marginTop: 22 },
  negrito: { fontFamily: ESTILO.fonte.negrito },
  forma: { fontSize: ESTILO.tamanho.forma, marginTop: 12 },
  local: { fontSize: ESTILO.tamanho.local, marginTop: 26 },

  // Assinatura.
  assinatura: { alignItems: 'center', marginTop: 46 },
  assinaturaLinha: { width: ESTILO.linhaAssinatura, borderTopWidth: ESTILO.folha.espessuraFilete, borderColor: ESTILO.cor.filete },
  assinaturaNome: { fontFamily: ESTILO.fonte.negrito, fontSize: ESTILO.tamanho.assinatura, marginTop: 5 },
  assinaturaLegenda: { fontSize: ESTILO.tamanho.assinaturaLegenda, color: ESTILO.cor.suave, marginTop: 2 },
})

export function ReciboDocument({ tx, emissor }: { tx: ReciboData; emissor: EmissorRecibo }) {
  const recibo = montarRecibo(tx, emissor)
  const numero = numeroDoRecibo(tx)
  const titulo = [
    `Recibo${numero ? ` nº ${numero}` : ''}`,
    pagadorDoRecibo(tx).nome,
  ].filter(Boolean).join(' - ')

  return (
    <Document title={titulo} author={RECIBO_TEXTOS.sindicato}>
      <Page size="A4" style={styles.page}>
        <View style={styles.moldura}>
          <View style={styles.cabecalho}>
            <Image src={SINDICATO_EMBLEMA_PNG} style={styles.emblema} />
            <View style={styles.cabecalhoTextos}>
              <Text style={styles.cabecalhoNome}>{emissor.nome}</Text>
              {emissor.cnpj !== '' && <Text style={styles.cabecalhoLinha}>CNPJ {emissor.cnpj}</Text>}
              {emissor.linhasEndereco.map(linha => <Text key={linha} style={styles.cabecalhoLinha}>{linha}</Text>)}
              {emissor.telefone !== '' && <Text style={styles.cabecalhoLinha}>Telefone: {emissor.telefone}</Text>}
            </View>
          </View>

          <View style={styles.faixa}>
            <Text style={styles.titulo}>{RECIBO_TEXTOS.titulo}</Text>
            <View style={styles.quadros}>
              {recibo.numero && (
                <View style={[styles.quadro, styles.quadroNumero]}>
                  <Text style={styles.quadroRotulo}>{RECIBO_TEXTOS.numero}</Text>
                  <Text style={styles.quadroNumeroTexto}>{recibo.numero}</Text>
                </View>
              )}
              <View style={[styles.quadro, styles.quadroValor]}>
                <Text style={styles.quadroRotulo}>{RECIBO_TEXTOS.valor}</Text>
                <Text style={styles.quadroValorTexto}>{recibo.valor}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.corpo}>
            {recibo.trechos.map((trecho, i) => (
              trecho.negrito
                ? <Text key={i} style={styles.negrito}>{trecho.texto}</Text>
                : trecho.texto
            ))}
          </Text>

          {recibo.formaDePagamento && <Text style={styles.forma}>{recibo.formaDePagamento}</Text>}
          {recibo.localEData !== '' && <Text style={styles.local}>{recibo.localEData}</Text>}

          <View style={styles.assinatura} wrap={false}>
            <View style={styles.assinaturaLinha} />
            <Text style={styles.assinaturaNome}>{RECIBO_TEXTOS.sindicato}</Text>
            <Text style={styles.assinaturaLegenda}>{RECIBO_TEXTOS.assinatura}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/** Gera o recibo e baixa o PDF ("recibo-<número ou data>-<nome curto>.pdf"). */
export async function downloadRecibo(tx: ReciboData, emissor: EmissorRecibo) {
  const blob = await pdf(<ReciboDocument tx={tx} emissor={emissor} />).toBlob()
  saveBlob(blob, nomeDoArquivoRecibo(tx))
}
