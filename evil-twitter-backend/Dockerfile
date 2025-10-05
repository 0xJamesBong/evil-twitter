FROM rustlang/rust:nightly AS builder
WORKDIR /app
COPY . .
RUN echo "==== BUILD CONTEXT CONTENTS ====" && ls -R /app
RUN cat Cargo.toml || true

RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/evil-twitter /usr/local/bin/evil-twitter
ENV RUST_LOG=info
CMD ["evil-twitter"]