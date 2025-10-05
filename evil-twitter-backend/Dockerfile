# ---- Builder stage ----
FROM rustlang/rust:nightly AS builder
WORKDIR /app    
# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src    
# Copy the full backend source
COPY . .    
# Build the actual binary
RUN cargo build --release    
# ---- Runtime stage ----
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*    
# Copy compiled binary
COPY --from=builder /app/target/release/evil-twitter /usr/local/bin/evil-twitter    
# Railway sets PORT automatically
ENV RUST_LOG=info
CMD ["evil-twitter"]
    
    