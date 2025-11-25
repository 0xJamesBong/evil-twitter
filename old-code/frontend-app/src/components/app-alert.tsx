import { AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, Box } from '@mui/material'
import { ReactNode } from 'react'

export function AppAlert({
  action,
  children,
  className = '',
}: {
  action: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Alert severity="warning" className={className} icon={<AlertCircle size={16} />}>
      <AlertTitle>{children}</AlertTitle>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>{action}</Box>
    </Alert>
  )
}
