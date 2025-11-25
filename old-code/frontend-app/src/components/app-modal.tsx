import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material'
import { ReactNode, useState } from 'react'

export function AppModal({
  children,
  title,
  submit,
  submitDisabled,
  submitLabel,
}: {
  children: ReactNode
  title: string
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (submit) {
      submit()
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        {title}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>{children}</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          {submit && (
            <Button onClick={handleSubmit} disabled={submitDisabled} variant="contained">
              {submitLabel || 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
