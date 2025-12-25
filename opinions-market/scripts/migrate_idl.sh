#!/bin/bash
# Usage: ./scripts/migrate_idl.sh [localnet|devnet]

NETWORK=${1:-localnet}
BASE_DIR=$(pwd)

# Copy Opinions Market
cp "$BASE_DIR/target/idl/opinions_market.json" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/idl/opinions_market.json"
cp "$BASE_DIR/target/types/opinions_market.ts" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/types/opinions_market.ts"
cp "$BASE_DIR/target/idl/opinions_market.json" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/idl/opinions_market.json"
cp "$BASE_DIR/target/types/opinions_market.ts" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/types/opinions_market.ts"

# Copy Fed
cp "$BASE_DIR/target/idl/fed.json" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/idl/fed.json"
cp "$BASE_DIR/target/types/fed.ts" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/types/fed.ts"
cp "$BASE_DIR/target/idl/fed.json" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/idl/fed.json"
cp "$BASE_DIR/target/types/fed.ts" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/types/fed.ts"

# Copy Persona
cp "$BASE_DIR/target/idl/persona.json" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/idl/persona.json"
cp "$BASE_DIR/target/types/persona.ts" "$BASE_DIR/../privy-frontend/src/lib/solana/target/$NETWORK/types/persona.ts"
cp "$BASE_DIR/target/idl/persona.json" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/idl/persona.json"
cp "$BASE_DIR/target/types/persona.ts" "$BASE_DIR/../evil-twitter-backend/src/solana/target/$NETWORK/types/persona.ts"

echo "✅ IDL and types copied for $NETWORK"

