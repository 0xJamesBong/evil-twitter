"use client";

import { Box, Container, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import { WeaponMinter } from "../../../components/WeaponMinter";
import { WeaponsList } from "../../../components/WeaponsList";
import Navbar from "../../../components/Navbar";
import { useBackendUserStore } from "../../../lib/stores/backendUserStore";

export default function WeaponsPage() {
    const [activeTab, setActiveTab] = useState(0);
    const { user } = useBackendUserStore();

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        aria-label="weapons tabs"
                    >
                        <Tab label="Mint Weapon" />
                        <Tab label="My Arsenal" />
                    </Tabs>
                </Box>

                {activeTab === 0 && <WeaponMinter />}

                {activeTab === 1 && (
                    <Box>
                        <WeaponsList userId={user?._id?.$oid} />
                    </Box>
                )}
            </Container>
        </Box>
    );
}

