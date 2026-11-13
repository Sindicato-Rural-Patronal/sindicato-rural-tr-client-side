interface ErrorAlertProps {
  message: string | null
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
