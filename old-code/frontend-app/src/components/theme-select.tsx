'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { IconButton, Menu, MenuItem } from '@mui/material'

export function ThemeSelect() {
  const { setTheme } = useTheme()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    handleClose()
  }

  return (
    <>
      <IconButton onClick={handleClick} size="small">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MenuItem onClick={() => handleThemeChange('light')}>Light</MenuItem>
        <MenuItem onClick={() => handleThemeChange('dark')}>Dark</MenuItem>
        <MenuItem onClick={() => handleThemeChange('system')}>System</MenuItem>
      </Menu>
    </>
  )
}
