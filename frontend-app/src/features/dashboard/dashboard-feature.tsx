import { Card, CardContent, Typography, Box, Link as MuiLink } from '@mui/material'
import { ArrowRight, BookOpen, CookingPot, Droplets, LucideWallet, MessageCircleQuestion } from 'lucide-react'
import React from 'react'
import { AppHero } from '@/components/app-hero'
import WalletLogin from '@/components/auth/wallet-login'

const primary: {
  label: string
  href: string
  description: string
  icon: React.ReactNode
}[] = [
    {
      label: 'Solana Docs',
      href: 'https://solana.com/docs',
      description: 'The official documentation. Your first stop for understanding the Solana ecosystem.',
      icon: <BookOpen className="w-8 h-8 text-purple-400" />,
    },
    {
      label: 'Solana Cookbook',
      href: 'https://solana.com/developers/cookbook/',
      description: 'Practical examples and code snippets for common tasks when building on Solana.',
      icon: <CookingPot className="w-8 h-8 text-green-400" />,
    },
  ]

const secondary: {
  label: string
  href: string
  icon: React.ReactNode
}[] = [
    {
      label: 'Solana Faucet',
      href: 'https://faucet.solana.com/',
      icon: <Droplets className="w-5 h-5 text-green-400" />,
    },
    {
      label: 'Solana Stack Overflow',
      href: 'https://solana.stackexchange.com/',
      icon: <MessageCircleQuestion className="w-5 h-5 text-orange-400" />,
    },
    {
      label: 'Wallet UI Docs',
      href: 'https://wallet-ui.dev',
      icon: <LucideWallet className="w-5 h-5 text-blue-400" />,
    },
  ]

export default function DashboardFeature() {
  return (
    <Box>
      <AppHero title="gm" subtitle="Say hi to your new Solana app." />
      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
        {/* Authentication Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ textAlign: 'center', mb: 4, fontWeight: 'bold' }}>
            Wallet Authentication
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <WalletLogin />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
          {primary.map((link) => (
            <MuiLink
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'none', display: 'block' }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, p: 3 }}>
                  {link.icon}
                  <Typography variant="h6" component="h3" sx={{ '&:hover': { color: 'primary.main' } }}>
                    {link.label}
                  </Typography>
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {link.description}
                  </Typography>
                </CardContent>
              </Card>
            </MuiLink>
          ))}
        </Box>
        <Box sx={{ mt: 4 }}>
          <Card>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                More Resources
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Expand your knowledge with these community and support links.
              </Typography>
            </Box>
            <CardContent>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {secondary.map((link) => (
                  <Box component="li" key={link.label}>
                    <MuiLink
                      href={link.href}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        borderRadius: 1,
                        p: 1,
                        textDecoration: 'none',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.icon}
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                        {link.label}
                      </Typography>
                      <ArrowRight style={{ width: 16, height: 16, opacity: 0.5 }} />
                    </MuiLink>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
