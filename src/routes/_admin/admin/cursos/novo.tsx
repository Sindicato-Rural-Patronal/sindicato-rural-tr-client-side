import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateCourse } from '@/hooks/useCourse'
import { useRooms } from '@/hooks/useRooms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_admin/admin/cursos/novo')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { data: salas, isLoading: salasLoading } = useRooms()
  const createCourse = useCreateCourse()
  const { t } = useTranslation()

  const [form, setForm] = useState({
    name: '',
    description: '',
    roomId: '',
    status: 'UNPUBLISHED',
    startTime: '',
    endTime: '',
    price: '',
    workloadHours: '',
    registrationDeadline: '',
    observations: '',
  })

  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSelectChange(name: string, value: string) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const body = {
      name: form.name,
      description: form.description,
      roomId: form.roomId,
      status: form.status as 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED',
      // hora "de parede" — mesma convenção do dialog de cursos (backend fatia em UTC)
      startTime: `${form.startTime}:00.000Z`,
      endTime: `${form.endTime}:00.000Z`,
      ...(form.price ? { price: Number(form.price) } : {}),
      ...(form.workloadHours ? { workloadHours: Number(form.workloadHours) } : {}),
      ...(form.registrationDeadline ? { registrationDeadline: `${form.registrationDeadline}:00.000Z` } : {}),
      ...(form.observations ? { observations: form.observations } : {}),
    }

    try {
      const res = await createCourse.mutateAsync(body)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(apiErrorMessage(data?.error ?? data?.message ?? '', 'Erro ao criar curso.'))
        return
      }
      navigate({ to: '/admin/cursos' })
    } catch {
      setError(t('common.error'))
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t('admin.courses.newCourse')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('courseDetail.info')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-nome">{t('admin.courses.form.title')}</Label>
              <Input id="curso-nome" name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-desc">{t('admin.courses.form.shortDescription')}</Label>
              <Textarea id="curso-desc" name="description" value={form.description} onChange={handleChange} required rows={4} className="resize-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-sala">{t('admin.courses.form.room')}</Label>
              <Select value={form.roomId} onValueChange={v => handleSelectChange('roomId', v)} required>
                <SelectTrigger id="curso-sala">
                  <SelectValue placeholder={salasLoading ? t('common.loading') : t('admin.courses.form.selectRoom')} />
                </SelectTrigger>
                <SelectContent>
                  {salas?.map(sala => (
                    <SelectItem key={sala.id} value={sala.id}>{sala.name} (cap. {sala.maxCapacity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-status">{t('admin.courses.form.status')}</Label>
              <Select value={form.status} onValueChange={v => handleSelectChange('status', v)}>
                <SelectTrigger id="curso-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPUBLISHED">{t('admin.courses.form.statusDraft')}</SelectItem>
                  <SelectItem value="PRIVATE">{t('admin.courses.form.statusPrivate')}</SelectItem>
                  <SelectItem value="PUBLIC">{t('admin.courses.form.statusPublic')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="curso-start">{t('admin.courses.form.startDate')}</Label>
                <Input id="curso-start" type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="curso-end">{t('admin.courses.form.endDate')}</Label>
                <Input id="curso-end" type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="curso-price">{t('admin.courses.form.price')}</Label>
                <Input id="curso-price" type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="curso-workload">{t('admin.courses.form.workload')}</Label>
                <Input id="curso-workload" type="number" name="workloadHours" value={form.workloadHours} onChange={handleChange} min="0" placeholder="0" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-deadline">{t('admin.courses.form.regDeadlineDate')}</Label>
              <Input id="curso-deadline" type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="curso-obs">{t('admin.courses.form.observations')}</Label>
              <Input id="curso-obs" name="observations" value={form.observations} onChange={handleChange} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createCourse.isPending}>
                {createCourse.isPending ? t('admin.courses.form.creating') : t('admin.courses.form.create')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/cursos' })}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
