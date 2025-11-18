'use client'

import * as React from 'react'
import { SolanaClusterId, useWalletUi, useWalletUiCluster } from '@wallet-ui/react'
import { Button, Menu, MenuItem, Radio } from '@mui/material'

export function ClusterDropdown() {
  const { cluster } = useWalletUi()
  const { clusters, setCluster } = useWalletUiCluster()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleClusterChange = (clusterId: string) => {
    setCluster(clusterId as SolanaClusterId)
    handleClose()
  }

  return (
    <>
      <Button variant="outlined" onClick={handleClick}>
        {cluster.label}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} sx={{ width: 224 }}>
        {clusters.map((c) => (
          <MenuItem
            key={c.id}
            onClick={() => handleClusterChange(c.id)}
            selected={c.id === cluster.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Radio checked={c.id === cluster.id} size="small" />
            {c.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
