# 1. Builder image with Rust toolchain
FROM rust:1.82 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

# 2. Slim runtime image
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/evil-twitter-backend /app/app

# Optional: install OpenSSL or CA certs if your app makes HTTPS requests
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

CMD ["/app/app"]
