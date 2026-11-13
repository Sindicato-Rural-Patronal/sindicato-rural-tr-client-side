import { useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/api-error-message'
import { usePermissions } from '@/hooks/usePermissions'
import { useInstructors } from '@/hooks/useAdmin'
import { useAssignInstructor } from '@/hooks/useCourse'
import { upperNoAccents } from '@/utils/text-format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'

/** `GET /admin/instructors` exige READ_USER: sem ela a lista nem é pedida e a dica toma o lugar do formulário. */
export const INSTRUTOR_PEDE_LER_USUARIOS = 'Pede a permissão Visualizar usuários'

/**
 * "Adicionar instrutor" da aba Instrutores do curso. Só é montado por quem pode editar o
 * curso; a lista de instrutores só é pedida a quem também tem READ_USER.
 */
export function AddInstructorForm({ courseId, assignedUserDataIds }: { courseId: string; assignedUserDataIds: string[] }) {
  const { can } = usePermissions()
  const podeListar = can('READ_USER')
  const { data: instructors } = useInstructors({ enabled: podeListar })
  const assignInstructor = useAssignInstructor(courseId)
  const [selInstrId, setSelInstrId] = useState('')
  const [instrTitle, setInstrTitle] = useState('')
  const [instrCategory, setInstrCategory] = useState('')

  async function handleAssignInstructor() {
    if (!selInstrId) return
    try {
      // apiFetch lança em não-2xx, então não há branch !res.ok — o erro real
      // do backend (ex.: "Instrutor já vinculado") vem no catch.
      await assignInstructor.mutateAsync({
        instructorUserDataId: selInstrId,
        title: instrTitle || undefined,
        category: instrCategory || undefined,
      })
      setSelInstrId('')
      setInstrTitle('')
      setInstrCategory('')
      toast.success('Instrutor adicionado.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar instrutor.'))
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-foreground">Adicionar instrutor</p>
      {!podeListar ? (
        <p className="text-sm text-muted-foreground">{INSTRUTOR_PEDE_LER_USUARIOS}</p>
      ) : (
        <>
          <NativeSelect
            aria-label="Instrutor"
            value={selInstrId}
            onChange={e => setSelInstrId(e.target.value)}
          >
            <option value="">Selecione um instrutor...</option>
            {(instructors ?? [])
              .filter(i => !assignedUserDataIds.includes(i.userData.id))
              .map(i => (
                <option key={i.userData.id} value={i.userData.id}>{i.userData.name}</option>
              ))
            }
          </NativeSelect>
          <Input
            placeholder="Título (ex: Engenheiro Agrônomo)"
            value={instrTitle}
            onChange={e => setInstrTitle(upperNoAccents(e.target.value))}
          />
          <Input
            placeholder="Categoria (ex: Palestrante)"
            value={instrCategory}
            onChange={e => setInstrCategory(upperNoAccents(e.target.value))}
          />
          <Button
            size="sm"
            disabled={!selInstrId || assignInstructor.isPending}
            onClick={handleAssignInstructor}
            className="self-end"
          >
            {assignInstructor.isPending ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </>
      )}
    </div>
  )
}
