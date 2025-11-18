'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, Typography, Box } from '@mui/material'
import { useSolana } from '@/components/solana/use-solana'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-provider'
import { useCombinedSignOut } from '@/hooks/use-combined-signout'

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      publicKey?: {
        toString(): string
      }
      signMessage?(message: Uint8Array): Promise<{ signature: Uint8Array }>
      connect?(): Promise<{ publicKey: { toString(): string } }>
    }
  }
}

export default function WalletLogin() {
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { connected, account } = useSolana()
  const { user } = useAuth()
  const { handleSignOut } = useCombinedSignOut()

  const handleWalletAuth = async () => {
    setMessage('')

    try {
      if (!connected || !account) {
        setMessage('Please connect a wallet first')
        return
      }
      if (typeof window !== 'undefined' && window.solana) {
        try {
          const { data, error } = await supabase.auth.signInWithWeb3({
            chain: 'solana',
            statement: 'Please sign this message to authenticate with your wallet.',
          })

          if (error) {
            setMessage(`Authentication failed: ${error.message}`)
            return
          }

          if (data.user) {
            setMessage('Wallet authenticated successfully!')
          }
        } catch (authError) {
          console.error('Supabase auth error:', authError)
          setMessage('Failed to authenticate with wallet. Please try again.')
        }
      } else {
        setMessage('Solana wallet not detected. Please install a Solana wallet.')
      }
    } catch (error) {
      console.error('Wallet auth error:', error)
      setMessage('An error occurred. Please try again.')
    }
  }

  const handleSignOutAndDisconnect = async () => {
    await handleSignOut()
    setMessage('Signed out successfully')
  }

  if (user) {
    return (
      <Card sx={{ width: '100%', maxWidth: '28rem', p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome Back!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You are signed in with your Solana wallet
          </Typography>
        </Box>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="success.main">
              Wallet: {user.user_metadata?.wallet_address?.slice(0, 8) || 'Connected'}...
            </Typography>
            <Button variant="contained" onClick={() => router.push('/account')} fullWidth>
              View Account Details
            </Button>
            <Button variant="outlined" onClick={handleSignOutAndDisconnect} fullWidth>
              Sign Out
            </Button>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ width: '100%', maxWidth: '28rem', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Sign in with Solana
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect and authenticate with your Solana wallet
        </Typography>
      </Box>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!connected || !account ? (
            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                No wallet connected. Please use the wallet connection from the header.
              </Typography>
              <Button disabled fullWidth>
                Connect Wallet First
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="success.main">
                Wallet Connected: {account.address.slice(0, 8)}...
              </Typography>
              <Button variant="contained" onClick={handleWalletAuth} fullWidth>
                Sign in with Solana
              </Button>
            </Box>
          )}
          {message && (
            <Typography
              variant="body2"
              color={message.includes('error') || message.includes('failed') ? 'error.main' : 'success.main'}
            >
              {message}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
