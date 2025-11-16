'use client'

import * as React from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useTheme as useNextTheme } from 'next-themes'
import { createAppTheme } from '@/theme/theme'

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme: nextTheme, systemTheme } = useNextTheme()
    const resolvedTheme = nextTheme === 'system' ? systemTheme : nextTheme
    const mode = resolvedTheme === 'dark' ? 'dark' : 'light'

    const theme = React.useMemo(() => createAppTheme(mode), [mode])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    )
}

