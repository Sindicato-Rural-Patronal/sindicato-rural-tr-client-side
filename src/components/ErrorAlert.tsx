interface ErrorAlertProps {
  message: string | null
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
