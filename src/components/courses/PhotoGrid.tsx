import { Trash2 } from 'lucide-react'

// Grade de fotos de curso, usada no formulário e no detalhe do curso.

// Grade de fotos com o botão de remover sempre visível (no celular não existe
// "passar o mouse" para descobrir o botão).
export function PhotoGrid({ photos, onRemove, disabled }: {
  photos: { key: string; url: string; caption?: string | null }[]
  onRemove: (key: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {photos.map(photo => (
        <div key={photo.key} className="relative aspect-video rounded-xl overflow-hidden bg-muted">
          <img src={photo.url} alt={photo.caption || 'Foto'} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(photo.key)}
            disabled={disabled}
            aria-label="Remover foto"
            title="Remover foto"
            className="absolute top-1.5 right-1.5 size-8 rounded-full bg-destructive text-white shadow-md flex items-center justify-center hover:bg-destructive/90 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
              <p className="text-white text-xs truncate">{photo.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
