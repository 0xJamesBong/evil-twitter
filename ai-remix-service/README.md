# Image Remix AI Service

A Python microservice for AI-powered image processing and remixing.

## Features

- **Style Transfer**: Apply artistic styles to images (vintage, cartoon, sketch)
- **Background Removal**: Remove backgrounds from images
- **Image Enhancement**: Enhance image quality (sharpness, color, brightness)
- **Async Processing**: Background task processing with status tracking
- **RESTful API**: FastAPI-based REST API

## Setup

1. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables** (optional):

   ```bash
   # Create .env file
   PYTHON_SERVICE_URL=http://localhost:8000
   ```

3. **Run the Service**:

   ```bash
   python main.py
   ```

   Or with uvicorn:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### Process Image

```http
POST /process
Content-Type: application/json

{
  "image_id": "123",
  "processing_type": "style_transfer",
  "style_preset": "vintage",
  "source_image_url": "http://example.com/image.jpg",
  "parameters": {
    "strength": 0.8
  }
}
```

### Get Processing Status

```http
GET /status/{processing_id}
```

### Health Check

```http
GET /health
```

## Processing Types

### Style Transfer

- `vintage`: Apply vintage/retro style
- `cartoon`: Apply cartoon/animation style
- `sketch`: Apply sketch/drawing style

### Background Removal

- Simple chroma key removal (light backgrounds)

### Image Enhancement

- `sharpness`: Enhance image sharpness
- `color`: Enhance color saturation
- `brightness`: Adjust brightness
- `general`: Apply general enhancements

## Integration with Rust Backend

The Rust backend communicates with this service via HTTP requests. The service URL is configured via the `PYTHON_SERVICE_URL` environment variable.

## Production Considerations

1. **Model Loading**: In production, pre-load models to avoid cold starts
2. **Queue System**: Use Redis or RabbitMQ for job queuing
3. **Storage**: Use cloud storage (S3, GCS) for processed images
4. **Scaling**: Deploy multiple instances behind a load balancer
5. **Monitoring**: Add logging and metrics collection

## Development

### Adding New Styles

1. Add new style method to `StyleTransferProcessor`
2. Update the `process` method to handle the new style
3. Test with sample images

### Adding New Processing Types

1. Create new processor class
2. Add to the main processing logic in `main.py`
3. Update API documentation

## Dependencies

- **FastAPI**: Web framework
- **Pillow**: Image processing
- **OpenCV**: Computer vision operations
- **NumPy**: Numerical operations
- **PyTorch**: Deep learning (for future diffusion models)
- **Diffusers**: Hugging Face diffusion models (for future use)
