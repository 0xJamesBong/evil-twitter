'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { IconButton, Box, AppBar, Toolbar, Typography, Link as MuiLink } from '@mui/material'
import { Menu as MenuIcon, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { WalletDropdown } from '@/components/wallet-dropdown'

const ClusterDropdown = dynamic(() => import('@/components/cluster-dropdown').then((m) => m.ClusterDropdown), {
  ssr: false,
})

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <AppBar position="sticky" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <MuiLink component={Link} href="/" sx={{ textDecoration: 'none', color: 'text.primary' }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              Gillsupabasetemplate
            </Typography>
          </MuiLink>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
            {links.map(({ label, path }) => (
              <MuiLink
                key={path}
                component={Link}
                href={path}
                sx={{
                  textDecoration: 'none',
                  color: isActive(path) ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {label}
              </MuiLink>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            <WalletDropdown />
            <ClusterDropdown />
            <ThemeSelect />
          </Box>
          <IconButton
            sx={{ display: { xs: 'flex', md: 'none' } }}
            onClick={() => setShowMenu(!showMenu)}
            size="small"
          >
            {showMenu ? <X size={24} /> : <MenuIcon size={24} />}
          </IconButton>
        </Box>
      </Toolbar>

      {showMenu && (
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            flexDirection: 'column',
            p: 2,
            gap: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
            <WalletDropdown />
            <ClusterDropdown />
            <ThemeSelect />
          </Box>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(({ label, path }) => (
              <Box component="li" key={path}>
                <MuiLink
                  component={Link}
                  href={path}
                  onClick={() => setShowMenu(false)}
                  sx={{
                    textDecoration: 'none',
                    color: isActive(path) ? 'primary.main' : 'text.secondary',
                    display: 'block',
                    py: 1,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {label}
                </MuiLink>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </AppBar>
  )
}
