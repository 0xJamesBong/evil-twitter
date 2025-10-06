"use client";

import { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Slider,
} from "@mui/material";
import { useWeaponsStore } from "../lib/stores/weaponsStore";
import { useBackendUserStore } from "../lib/stores/backendUserStore";

export function WeaponMinter() {
    const { createWeapon, isLoading, error, clearError } = useWeaponsStore();
    const { user } = useBackendUserStore();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [damage, setDamage] = useState(100);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id?.$oid) {
            alert("Please log in to mint a weapon");
            return;
        }

        try {
            await createWeapon(user._id.$oid, {
                name,
                description,
                image_url: imageUrl,
                damage,
            });

            // Reset form
            setName("");
            setDescription("");
            setImageUrl("");
            setDamage(100);
            setSuccess(true);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to mint weapon:", error);
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 600, mx: "auto", my: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom fontWeight={700}>
                🗡️ Mint a Weapon
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
                Create a powerful weapon to use in battles. Each weapon starts with
                10,000 health and degrades with use.
            </Typography>

            {error && (
                <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Weapon minted successfully! 🎉
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label="Weapon Name"
                        placeholder="Sword of Truth"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                        disabled={isLoading}
                    />

                    <TextField
                        label="Description"
                        placeholder="Cuts through nonsense arguments"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        fullWidth
                        multiline
                        rows={3}
                        disabled={isLoading}
                    />

                    <TextField
                        label="Image URL"
                        placeholder="https://example.com/weapon.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        required
                        fullWidth
                        type="url"
                        disabled={isLoading}
                    />

                    <Box>
                        <Typography gutterBottom>
                            Damage: {damage} (affects target health)
                        </Typography>
                        <Slider
                            value={damage}
                            onChange={(_, value) => setDamage(value as number)}
                            min={10}
                            max={1000}
                            step={10}
                            marks={[
                                { value: 10, label: "10" },
                                { value: 500, label: "500" },
                                { value: 1000, label: "1000" },
                            ]}
                            valueLabelDisplay="auto"
                            disabled={isLoading}
                        />
                    </Box>

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={isLoading || !user}
                        sx={{
                            borderRadius: "9999px",
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        {isLoading ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                                Minting...
                            </>
                        ) : (
                            "Mint Weapon"
                        )}
                    </Button>

                    {!user && (
                        <Typography variant="body2" color="error" textAlign="center">
                            Please sign in to mint weapons
                        </Typography>
                    )}
                </Box>
            </form>
        </Paper>
    );
}

