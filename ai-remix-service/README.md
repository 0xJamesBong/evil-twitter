# AI Remix Service

This service provides a REST API for AI-powered image remixing using Stable Diffusion (img2img). It is designed to be called by your Rust backend, but you can also use it directly for testing.

---

## 🚀 Quickstart

### 1. Install Dependencies

```bash
cd ai-remix-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the FastAPI Service

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- The API will be available at [http://localhost:8000](http://localhost:8000)

### 3. (In a separate terminal) Start the Rust Backend

```bash
cd /Users/hongjan/Documents/image-remix/image-remix-backend
cargo run
```

- The backend will be available at [http://localhost:3000](http://localhost:3000)

---

## How It Works

- The Rust backend POSTs to `/images/{id}/remix`.
- The backend calls this Python service at `/remix-url` (or `/remix` for file upload).
- The Python service runs the AI remix and returns a result URL.
- The backend returns this to the client.

---

## Example API Usage

### Health Check

```bash
curl http://localhost:8000/health
```

### Remix an Image from a URL (direct call)

```bash
curl -X POST http://localhost:8000/remix-url \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "A cyberpunk anime style portrait",
    "image_url": "https://example.com/image.jpg"
  }'
```

### Remix an Uploaded Image (direct call)

```bash
curl -X POST http://localhost:8000/remix \
  -F 'file=@/path/to/image.jpg' \
  -F 'prompt=A cyberpunk anime style portrait'
```

---

## Integration with Rust Backend

- The Rust backend expects this service to be running at `http://localhost:8000` (configurable via `PYTHON_SERVICE_URL`).
- When you POST to `/images/{id}/remix` on the backend, it will automatically call this service.

---

## Troubleshooting

- **Both services must be running** for remixing to work.
- If you get connection errors, make sure the Python service is running and accessible at the expected URL.
- Check your `.env` or config for `PYTHON_SERVICE_URL` if you changed ports.

---

## Development

- `main.py`: FastAPI service (run this!)
- `ai_processor.py`: Helper module for image processing (imported by main.py)
- `minimal-example.py`: Standalone script for local testing (not an API)

---

## License

MIT
