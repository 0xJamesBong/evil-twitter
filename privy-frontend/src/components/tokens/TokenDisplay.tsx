/**
 * TokenDisplay component for displaying tokens with their logos
 */

import { Box, BoxProps, Typography, TypographyProps } from "@mui/material";
import Image from "next/image";
import { getTokenLogo, getTokenName, getTokenSymbol } from "@/lib/utils/tokens";

export interface TokenDisplayProps {
    mint: string;
    blingMint?: string;
    usdcMint?: string;
    stablecoinMint?: string;
    showSymbol?: boolean; // Show symbol instead of full name
    size?: "small" | "medium" | "large";
    logoSize?: number; // Custom logo size in pixels
    variant?: TypographyProps["variant"];
    sx?: BoxProps["sx"];
}

const sizeMap = {
    small: { logo: 16, fontSize: "0.75rem" },
    medium: { logo: 24, fontSize: "0.875rem" },
    large: { logo: 32, fontSize: "1rem" },
};

/**
 * Component to display a token with its logo
 */
export function TokenDisplay({
    mint,
    blingMint,
    usdcMint,
    stablecoinMint,
    showSymbol = false,
    size = "medium",
    logoSize,
    variant,
    sx,
}: TokenDisplayProps) {
    const tokenName = showSymbol
        ? getTokenSymbol(mint, blingMint, usdcMint, stablecoinMint)
        : getTokenName(mint, blingMint, usdcMint, stablecoinMint);
    const { logo, type } = getTokenLogo(mint, blingMint, usdcMint, stablecoinMint);
    const sizeConfig = sizeMap[size];
    const finalLogoSize = logoSize || sizeConfig.logo;

    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                ...sx,
            }}
        >
            {logo && (
                <Box
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: finalLogoSize,
                        height: finalLogoSize,
                        flexShrink: 0,
                    }}
                >
                    {type === "image" ? (
                        <Image
                            src={logo}
                            alt={tokenName}
                            width={finalLogoSize}
                            height={finalLogoSize}
                            style={{
                                objectFit: "contain",
                            }}
                        />
                    ) : (
                        <Typography
                            component="span"
                            sx={{
                                fontSize: finalLogoSize * 0.8,
                                lineHeight: 1,
                            }}
                        >
                            {logo}
                        </Typography>
                    )}
                </Box>
            )}
            <Typography
                variant={variant || (size === "small" ? "body2" : "body1")}
                component="span"
                sx={{
                    fontSize: variant ? undefined : sizeConfig.fontSize,
                }}
            >
                {tokenName}
            </Typography>
        </Box>
    );
}

