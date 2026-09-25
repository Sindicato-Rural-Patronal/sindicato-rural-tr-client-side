import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Foto pela câmera do próprio aparelho. Nasceu na ficha da pessoa e saiu de lá
// para ser usada também no cadastro novo: no balcão, a foto é tirada na hora em
// que a pessoa está ali na frente — mandar tirar depois é perder a foto.

export function CameraDialog({ open, onClose, onCapture }: {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Ao abrir, começa sem foto nem erro da vez anterior (ajustado no render; a
  // câmera em si continua no efeito abaixo).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCaptured(null)
      setError(null)
    }
  }

  useEffect(() => {
    if (!open) return
    let active = true
    let localStream: MediaStream | null = null
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        // Resolveu depois do dialog fechar/desmontar → não deixa a câmera ligada.
        if (!active) { s.getTracks().forEach(t => t.stop()); return }
        localStream = s
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
      })
      .catch(() => { if (active) setError('Câmera não disponível ou permissão negada.') })
    return () => {
      active = false
      localStream?.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }, [open])

  function stopStream(s: MediaStream | null) {
    s?.getTracks().forEach(t => t.stop())
  }

  function handleClose() {
    stopStream(stream)
    setStream(null)
    setCaptured(null)
    setError(null)
    onClose()
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    // A câmera demora a entregar o primeiro quadro. Clicar antes disso dava um
    // canvas 0x0, que vira "data:," e sobe como foto de 0 byte.
    if (!video.videoWidth || !video.videoHeight) {
      setError('A câmera ainda está abrindo. Tente de novo em um instante.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
  }

  function confirm() {
    if (!captured) return
    fetch(captured)
      .then(r => r.blob())
      .then(blob => {
        onCapture(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
        handleClose()
      })
      .catch(() => setError('Não foi possível usar esta foto. Tire outra.'))
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="size-4" /> Tirar foto</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive py-4 text-center">{error}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {!captured ? (
              <>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
                <Button onClick={capture} size="lg" className="w-full">
                  <Camera className="size-4 mr-2" />Tirar foto
                </Button>
              </>
            ) : (
              <>
                <div className="w-full aspect-square rounded-xl overflow-hidden">
                  <img src={captured} alt="preview" className="w-full h-full object-cover scale-x-[-1]" />
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setCaptured(null)}>Tirar novamente</Button>
                  <Button className="flex-1" onClick={confirm}>Usar esta foto</Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
