import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './locales/pt-BR'

// O site é só em português: os textos ficam em locales/pt-BR.ts e são lidos
// com t(). Não há troca de idioma nem detecção pelo navegador.
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
    },
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
  })

// Limpa o idioma que o seletor antigo guardava no navegador.
try {
  localStorage.removeItem('sindicato-lang')
} catch {
  // localStorage indisponível (modo privado, bloqueado): nada a limpar.
}

export default i18n
