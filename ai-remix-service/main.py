from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import io
import uuid
import os
from pathlib import Path
import aiofiles
import aiohttp

from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image
import torch

app = FastAPI(title="AI Remix Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance
pipe = None


class RemixRequest(BaseModel):
    prompt: str
    strength: Optional[float] = 0.6
    guidance_scale: Optional[float] = 7.5
    image_url: Optional[str] = None


class RemixResponse(BaseModel):
    success: bool
    result_url: Optional[str] = None
    error: Optional[str] = None


def load_pipeline():
    """Load the diffusion pipeline"""
    global pipe
    if pipe is None:
        print("🔄 Loading diffusion pipeline...")
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"📱 Using device: {device}")

        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5"
        ).to(device)

        # Disable NSFW checker properly
        pipe.safety_checker = lambda images, **kwargs: (images, [False] * len(images))
        print("✅ Pipeline loaded successfully")

    return pipe


@app.on_event("startup")
async def startup_event():
    """Load pipeline on startup"""
    load_pipeline()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-remix"}


@app.post("/remix", response_model=RemixResponse)
async def remix_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    strength: float = Form(0.6),
    guidance_scale: float = Form(7.5),
):
    """Remix an uploaded image with AI"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Load pipeline
        pipeline = load_pipeline()

        # Read and process image
        image_data = await file.read()
        init_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Resize to 512x512 (standard for SD)
        init_image = init_image.resize((512, 512))

        print(f"🎨 Remixing image with prompt: '{prompt}'")

        # Run diffusion
        output = pipeline(
            prompt=prompt,
            image=init_image,
            strength=strength,
            guidance_scale=guidance_scale,
        )

        # Save result
        output_dir = Path("results")
        output_dir.mkdir(exist_ok=True)

        result_filename = f"remixed_{uuid.uuid4().hex[:8]}.jpg"
        result_path = output_dir / result_filename

        output.images[0].save(result_path)

        # Return URL to the result
        result_url = f"/results/{result_filename}"

        print(f"✅ Remix complete: {result_filename}")

        return RemixResponse(success=True, result_url=result_url)

    except Exception as e:
        print(f"❌ Error during remix: {str(e)}")
        return RemixResponse(success=False, error=str(e))


@app.post("/remix-url", response_model=RemixResponse)
async def remix_image_from_url(request: RemixRequest):
    """Remix an image from URL with AI"""
    try:
        if not request.image_url:
            raise HTTPException(status_code=400, detail="image_url is required")

        # Load pipeline
        pipeline = load_pipeline()

        # Download image from URL
        async with aiohttp.ClientSession() as session:
            async with session.get(request.image_url) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=400, detail="Failed to download image"
                    )
                image_data = await response.read()

        # Process image
        init_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        init_image = init_image.resize((512, 512))

        print(f"🎨 Remixing image from URL with prompt: '{request.prompt}'")

        # Run diffusion
        output = pipeline(
            prompt=request.prompt,
            image=init_image,
            strength=request.strength,
            guidance_scale=request.guidance_scale,
        )

        # Save result
        output_dir = Path("results")
        output_dir.mkdir(exist_ok=True)

        result_filename = f"remixed_{uuid.uuid4().hex[:8]}.jpg"
        result_path = output_dir / result_filename

        output.images[0].save(result_path)

        # Return URL to the result
        result_url = f"/results/{result_filename}"

        print(f"✅ Remix complete: {result_filename}")

        return RemixResponse(success=True, result_url=result_url)

    except Exception as e:
        print(f"❌ Error during remix: {str(e)}")
        return RemixResponse(success=False, error=str(e))


@app.get("/results/{filename}")
async def get_result(filename: str):
    """Serve remixed image results"""
    result_path = Path("results") / filename
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result not found")

    return FileResponse(result_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
