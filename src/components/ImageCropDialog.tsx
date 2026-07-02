import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// aspect: width/height ratio (default 1440/600 = 2.4)
type Props = {
  src: string | null
  aspect?: number
  onConfirm: (file: File) => void
  onCancel: () => void
  outputWidth?: number
  outputHeight?: number
}

async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number,
  originalFileName: string,
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    outputWidth, outputHeight,
  )

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas empty')); return }
      const ext = originalFileName.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      resolve(new File([blob], originalFileName, { type: mime }))
    }, 'image/jpeg', 0.92)
  })
}

export function ImageCropDialog({
  src,
  aspect = 1440 / 600,
  onConfirm,
  onCancel,
  outputWidth = 1440,
  outputHeight = 600,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!src || !croppedAreaPixels) return
    setLoading(true)
    try {
      const fileName = `banner-${Date.now()}.jpg`
      const file = await getCroppedFile(src, croppedAreaPixels, outputWidth, outputHeight, fileName)
      onConfirm(file)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!src} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar imagem</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Proporção {outputWidth}×{outputHeight}px — arraste para posicionar, use o zoom para ajustar.
          </p>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 340 }}>
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              style={{
                containerStyle: { borderRadius: '0.5rem', overflow: 'hidden' },
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground w-8">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-10 text-right">{zoom.toFixed(2)}×</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processando...' : 'Usar este recorte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
