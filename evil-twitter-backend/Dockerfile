FROM rust:1-bullseye AS builder
WORKDIR /app
COPY . .
RUN echo "==== BUILD CONTEXT CONTENTS ====" && ls -R /app
RUN echo "==== FULL BUILD CONTEXT (DEBUG) ====" && ls -la /app || true
RUN echo "==== SRC CONTENTS ====" && ls -la /app/src || true
RUN echo "==== MODELS CONTENTS ====" && ls -la /app/src/models || true

RUN cat Cargo.toml || true

RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/evil-twitter /usr/local/bin/evil-twitter
ENV RUST_LOG=info
CMD ["evil-twitter"]