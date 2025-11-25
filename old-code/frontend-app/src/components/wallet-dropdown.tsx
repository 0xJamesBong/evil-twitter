'use client'

import * as React from 'react'
import { ellipsify, UiWallet, useWalletUi, useWalletUiWallet } from '@wallet-ui/react'
import { Button, Menu, MenuItem, Avatar, Divider, Box } from '@mui/material'
import { useAuth } from '@/components/auth/auth-provider'
import { useCombinedSignOut } from '@/hooks/use-combined-signout'

function WalletAvatar({ wallet }: { wallet: UiWallet }) {
  return (
    <Avatar src={wallet.icon} alt={wallet.name} sx={{ width: 24, height: 24 }}>
      {wallet.name[0]}
    </Avatar>
  )
}

function WalletDropdownItem({ wallet }: { wallet: UiWallet }) {
  const { connect } = useWalletUiWallet({ wallet })

  return (
    <MenuItem
      onClick={() => {
        return connect()
      }}
    >
      {wallet.icon ? <WalletAvatar wallet={wallet} /> : null}
      <Box sx={{ ml: 1 }}>{wallet.name}</Box>
    </MenuItem>
  )
}

function WalletDropdown() {
  const { account, connected, copy, disconnect, wallet, wallets } = useWalletUi()
  const { user } = useAuth()
  const { handleSignOut } = useCombinedSignOut()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDisconnect = () => {
    if (user) {
      // If user is authenticated, sign out and disconnect
      handleSignOut()
    } else {
      // If not authenticated, just disconnect wallet
      disconnect()
    }
    handleClose()
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        startIcon={wallet?.icon ? <WalletAvatar wallet={wallet} /> : null}
      >
        {connected ? (account ? ellipsify(account.address) : wallet?.name) : 'Select Wallet'}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {account ? (
          <>
            <MenuItem
              onClick={() => {
                copy()
                handleClose()
              }}
            >
              Copy address
            </MenuItem>
            <MenuItem onClick={handleDisconnect}>
              {user ? 'Sign Out & Disconnect' : 'Disconnect'}
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {wallets.length ? (
          wallets.map((wallet) => <WalletDropdownItem key={wallet.name} wallet={wallet} />)
        ) : (
          <MenuItem component="a" href="https://solana.com/solana-wallets" target="_blank" rel="noopener noreferrer">
            Get a Solana wallet to connect.
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export { WalletDropdown }
