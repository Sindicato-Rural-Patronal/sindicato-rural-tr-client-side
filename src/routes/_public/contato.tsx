import { createFileRoute } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useState } from 'react'
import { usePublicContacts, useSendContactMessage } from '@/hooks/useAdmin'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MapPin, Phone, Clock, Mail, Send, CheckCircle2,
  User,
} from 'lucide-react'
import { maskPhone } from '@/utils/masks'

export const Route = createFileRoute('/_public/contato')({
  component: ContatoPage,
})

const INFO = {
  address: 'Rua Sete de Setembro, 1847, Centro',
  city: 'Terra Roxa – PR, 85990-000',
  phone: '(44) 3645-1200',
  phone2: '(44) 99999-0000',
  email: 'contato@sindicatoruraltr.com.br',
  hours: [
    { days: 'Segunda a Sexta', time: '08h às 17h' },
    { days: 'Sábado', time: '08h às 12h' },
  ],
}

const MAPS_SRC =
  'https://maps.google.com/maps?q=Sindicato+Rural+de+Terra+Roxa+PR+Brasil&output=embed&z=15'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
]

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  if (avatar) {
    return <img src={avatar} alt={name} className="size-16 rounded-full object-cover border-2 border-border" />
  }
  return (
    <div className={`size-16 rounded-full flex items-center justify-center text-lg font-bold ${color} border-2 border-border shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

function PublicContacts() {
  const { data: contacts, isLoading } = usePublicContacts()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!contacts || contacts.length === 0) return null

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Nossa Equipe</h2>
          <p className="mt-2 text-muted-foreground">Entre em contato diretamente com nossos responsáveis</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {contacts.map(c => (
            <div
              key={c.userData.email}
              className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <Avatar name={c.userData.name} />
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{c.userData.name}</p>
                {c.publicTitle && (
                  <p className="text-xs font-medium text-primary">{c.publicTitle}</p>
                )}
                <a
                  href={`mailto:${c.userData.email}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate flex items-center gap-1"
                >
                  <Mail className="size-3 shrink-0" />
                  {c.userData.email}
                </a>
                {c.userData.phone && (
                  <a
                    href={`tel:${c.userData.phone.replace(/\D/g, '')}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Phone className="size-3 shrink-0" />
                    {c.userData.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

type FormState = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const emptyForm = (): FormState => ({ name: '', email: '', phone: '', subject: '', message: '' })

function ContactForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sendMessage = useSendContactMessage()

  function set(k: keyof FormState, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Preencha os campos obrigatórios.')
      return
    }
    try {
      await sendMessage.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject || undefined,
        message: form.message,
      })
      setSent(true)
      setForm(emptyForm())
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao enviar mensagem. Tente novamente.'))
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold">Mensagem enviada!</h3>
        <p className="text-muted-foreground max-w-xs">
          Recebemos sua mensagem e entraremos em contato em breve.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          Enviar outra mensagem
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-name">Nome *</Label>
          <Input
            id="ct-name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Seu nome completo"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-email">E-mail *</Label>
          <Input
            id="ct-email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-phone">Telefone</Label>
          <Input
            id="ct-phone"
            value={form.phone}
            onChange={e => set('phone', maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-subject">Assunto</Label>
          <Input
            id="ct-subject"
            value={form.subject}
            onChange={e => set('subject', e.target.value)}
            placeholder="Ex: Informações sobre cursos"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ct-message">Mensagem *</Label>
        <textarea
          id="ct-message"
          value={form.message}
          onChange={e => set('message', e.target.value)}
          placeholder="Escreva sua mensagem..."
          rows={5}
          required
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full resize-none"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={sendMessage.isPending} className="self-start gap-2">
        <Send className="size-4" />
        {sendMessage.isPending ? 'Enviando...' : 'Enviar mensagem'}
      </Button>
    </form>
  )
}

function ContatoPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-primary py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Entre em Contato
          </h1>
          <p className="mt-3 text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Estamos aqui para ajudar. Fale conosco por telefone, e-mail ou pelo formulário abaixo.
          </p>
        </div>
      </section>

      {/* Equipe pública */}
      <PublicContacts />

      {/* Formulário + Info */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 max-w-5xl mx-auto">

            {/* Formulário — 3 colunas */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold mb-6">Envie uma mensagem</h2>
              <ContactForm />
            </div>

            {/* Info — 2 colunas */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <h2 className="text-xl font-bold">Informações</h2>

              <div className="flex flex-col gap-5">
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Endereço</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{INFO.address}</p>
                    <p className="text-sm text-muted-foreground">{INFO.city}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Telefone</p>
                    <a href={`tel:${INFO.phone.replace(/\D/g, '')}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors block mt-0.5">
                      {INFO.phone}
                    </a>
                    <a href={`tel:${INFO.phone2.replace(/\D/g, '')}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors block">
                      {INFO.phone2}
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">E-mail</p>
                    <a href={`mailto:${INFO.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 block break-all">
                      {INFO.email}
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Horário de atendimento</p>
                    <div className="flex flex-col gap-1 mt-0.5">
                      {INFO.hours.map(h => (
                        <div key={h.days} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-muted-foreground">{h.days}</span>
                          <span className="text-sm font-medium text-foreground tabular-nums">{h.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <User className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Associe-se</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Produtores rurais de Terra Roxa e região podem se associar comparecendo à sede com RG e CPF.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Maps */}
      <section className="h-80 md:h-105 w-full border-t">
        <iframe
          title="Localização Sindicato Rural de Terra Roxa"
          src={MAPS_SRC}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
        />
      </section>
    </main>
  )
}
