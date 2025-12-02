FROM rust:1-bullseye AS builder
WORKDIR /app

# Copy opinions-market dependency (required for build)
COPY opinions-market/programs/opinions-market ./opinions-market/programs/opinions-market
COPY opinions-market/programs/opinions-market/Cargo.toml ./opinions-market/programs/opinions-market/

# Copy backend code
COPY evil-twitter-backend ./evil-twitter-backend

# Build from backend directory
WORKDIR /app/evil-twitter-backend
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/evil-twitter-backend/target/release/evil-twitter /usr/local/bin/evil-twitter
ENV RUST_LOG=info
CMD ["evil-twitter"]