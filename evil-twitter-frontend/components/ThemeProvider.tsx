'use client';

import React from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1DA1F2', // Twitter blue
        },
        secondary: {
            main: '#1DA1F2',
        },
        background: {
            default: '#000000',
            paper: '#16181C',
        },
        text: {
            primary: '#FFFFFF',
            secondary: '#71767B',
        },
        divider: '#2F3336',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '1.5rem',
            fontWeight: 700,
        },
        h2: {
            fontSize: '1.25rem',
            fontWeight: 600,
        },
        body1: {
            fontSize: '0.9375rem',
            lineHeight: 1.4,
        },
        body2: {
            fontSize: '0.8125rem',
            lineHeight: 1.4,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: '9999px',
                    fontWeight: 600,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#000000',
                    boxShadow: 'none',
                    borderBottom: '1px solid #2F3336',
                },
            },
        },
    },
});

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    return (
        <MuiThemeProvider theme={darkTheme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
}