'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Stack,
    IconButton,
} from '@mui/material';
import { useAuthStore } from '../lib/stores/authStore';
import { useBackendUserStore } from '../lib/stores/backendUserStore';
import { AuthModal } from './AuthModal';
import { TestPing } from './TestPing';

export default function Navbar() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { isAuthenticated, user, logout } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();

    const handleLogin = () => {
        setShowAuthModal(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={handleLogin}
                />
            )}

            {/* Navbar Content */}
            <AppBar
                position="fixed"
                sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    zIndex: 1300,
                    top: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Left side - TestPing */}
                    <Box>
                        <TestPing />
                    </Box>

                    {/* Center - Logo */}
                    <Box sx={{ flexGrow: 0 }}>
                        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                Evil Twitter
                            </Typography>
                        </Link>
                    </Box>

                    {/* Right side - Navigation and Auth */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        {/* Navigation Links */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                            <Button
                                component={Link}
                                href="/"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Home
                            </Button>
                            <Button
                                component={Link}
                                href="/shop"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Shop
                            </Button>
                            <Button
                                component={Link}
                                href="/explore"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Explore
                            </Button>
                            <Button
                                component={Link}
                                href="/notifications"
                                color="inherit"
                                sx={{ textTransform: 'none' }}
                            >
                                Notifications
                            </Button>
                        </Box>

                        {/* Auth Section */}
                        {isAuthenticated && user ? (
                            <Stack direction="row" spacing={2} alignItems="center">
                                {/* Dollar Conversion Rate */}
                                {backendUser && (
                                    <Box
                                        sx={{
                                            backgroundColor: '#a855f7',
                                            color: 'white',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 2,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            minWidth: '60px',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 4px rgba(168, 85, 247, 0.3)'
                                        }}
                                    >
                                        ${backendUser.dollar_conversion_rate.toLocaleString()}
                                    </Box>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                    Welcome, {user.user_metadata?.display_name || user.email}
                                </Typography>
                                <Button
                                    onClick={handleLogout}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                >
                                    Logout
                                </Button>
                            </Stack>
                        ) : (
                            <Button
                                onClick={() => setShowAuthModal(true)}
                                variant="contained"
                                color="primary"
                                size="small"
                            >
                                Login
                            </Button>
                        )}
                    </Stack>
                </Toolbar>
            </AppBar>
        </>
    );
} 