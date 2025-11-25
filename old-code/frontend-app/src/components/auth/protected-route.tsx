'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-provider'
import { Card, CardContent, Typography, Button, Box, CircularProgress } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      console.log('Protected route: User not authenticated, redirecting to home')
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Card sx={{ width: '100%', maxWidth: '28rem', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Loading...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Checking authentication status
            </Typography>
          </Box>
          <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (!user) {
    return (
      fallback || (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <Card sx={{ width: '100%', maxWidth: '28rem', p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Authentication Required
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please sign in with your Solana wallet to access this page
              </Typography>
            </Box>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Button variant="contained" onClick={() => router.replace('/')} fullWidth>
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </Box>
      )
    )
  }

  return <>{children}</>
}
