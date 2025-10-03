# Use nightly Rust (supports edition 2024)
FROM rustlang/rust:nightly as builder

# Create a new empty shell project to cache dependencies
WORKDIR /app
RUN USER=root cargo new --bin app
WORKDIR /app/app

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./

# Build dependencies only (for caching)
RUN cargo build --release || true

# Copy the full source
COPY . .

# Build the actual project
RUN cargo build --release

# Final slim runtime image
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/app/target/release/evil-twitter /app/app

# Ensure certs are available for HTTPS (Mongo, APIs, etc.)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

CMD ["/app/app"]
