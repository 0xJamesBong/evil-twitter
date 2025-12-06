/**
 * TokenLogo component for displaying just the token logo
 */

import { Box, BoxProps } from "@mui/material";
import Image from "next/image";
import { getTokenLogo } from "@/lib/utils/tokens";

export interface TokenLogoProps {
    mint: string;
    blingMint?: string;
    usdcMint?: string;
    stablecoinMint?: string;
    size?: number;
    sx?: BoxProps["sx"];
}

/**
 * Component to display just the token logo (emoji or image)
 */
export function TokenLogo({
    mint,
    blingMint,
    usdcMint,
    stablecoinMint,
    size = 24,
    sx,
}: TokenLogoProps) {
    const { logo, type } = getTokenLogo(mint, blingMint, usdcMint, stablecoinMint);

    if (!logo) {
        return null;
    }

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: size,
                height: size,
                flexShrink: 0,
                ...sx,
            }}
        >
            {type === "image" ? (
                <Image
                    src={logo}
                    alt=""
                    width={size}
                    height={size}
                    style={{
                        objectFit: "contain",
                    }}
                />
            ) : (
                <Box
                    component="span"
                    sx={{
                        fontSize: size * 0.8,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {logo}
                </Box>
            )}
        </Box>
    );
}

