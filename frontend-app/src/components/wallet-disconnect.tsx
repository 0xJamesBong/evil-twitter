'use client'

import * as React from 'react'
import { useWalletUi } from '@wallet-ui/react'
import { Button, ButtonProps } from '@mui/material'
import { useAuth } from '@/components/auth/auth-provider'
import { useRouter } from 'next/navigation'

function WalletDisconnect(props: ButtonProps) {
  const { connected, disconnect } = useWalletUi()
  const { signOut } = useAuth()
  const router = useRouter()

  const handleDisconnect = async () => {
    try {
      // Sign out from Supabase auth first (this clears the session)
      await signOut()

      // Clear any remaining Supabase data from localStorage
      if (typeof window !== 'undefined') {
        // Clear Supabase auth data
        const keys = Object.keys(localStorage)
        keys.forEach((key) => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }

      // Then disconnect the wallet
      disconnect()

      // Force redirect to home page
      router.replace('/')
    } catch (error) {
      console.error('Error disconnecting wallet:', error)

      // Force cleanup even if signOut fails
      if (typeof window !== 'undefined') {
        // Clear all localStorage just to be safe
        const keys = Object.keys(localStorage)
        keys.forEach((key) => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }

      // Still try to disconnect wallet
      disconnect()

      // Force redirect
      router.replace('/')
    }
  }

  return (
    <Button variant="outlined" {...props} onClick={handleDisconnect} disabled={!connected}>
      Disconnect
    </Button>
  )
}

export { WalletDisconnect }
