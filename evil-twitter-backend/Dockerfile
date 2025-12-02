FROM rust:1-bullseye AS builder
WORKDIR /app

# Copy opinions-market workspace root (required for workspace dependencies)
COPY opinions-market/Cargo.toml ./opinions-market/
COPY opinions-market/Cargo.lock ./opinions-market/

# Copy opinions-market program (the actual dependency)
COPY opinions-market/programs/opinions-market ./opinions-market/programs/opinions-market

# Copy backend code
COPY evil-twitter-backend ./evil-twitter-backend

# Build from backend directory
WORKDIR /app/evil-twitter-backend
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl1.1 && rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /app/evil-twitter-backend/target/release/evil-twitter /usr/local/bin/evil-twitter

# Copy IDL files (required at runtime)
COPY --from=builder /app/evil-twitter-backend/src/solana/target ./evil-twitter-backend/src/solana/target

ENV RUST_LOG=info
WORKDIR /app/evil-twitter-backend
CMD ["evil-twitter"]