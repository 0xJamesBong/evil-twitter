from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict
import io
import uuid
import os
from pathlib import Path
import aiofiles
import aiohttp

from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image
import torch

from models_config import get_model_config, get_model_list, get_models_by_category

app = FastAPI(title="AI Remix Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline cache
pipelines: Dict[str, StableDiffusionImg2ImgPipeline] = {}


class RemixRequest(BaseModel):
    prompt: str
    strength: Optional[float] = 0.6
    guidance_scale: Optional[float] = 7.5
    image_url: Optional[str] = None
    model_id: Optional[str] = "stable-diffusion-v1-5"


class RemixResponse(BaseModel):
    success: bool
    result_url: Optional[str] = None
    error: Optional[str] = None
    model_used: Optional[str] = None


def load_pipeline(model_id: str = "stable-diffusion-v1-5"):
    """Load the diffusion pipeline for a specific model"""
    global pipelines

    if model_id not in pipelines:
        model_config = get_model_config(model_id)
        if not model_config:
            raise ValueError(f"Unknown model: {model_id}")

        print(f"🔄 Loading pipeline for {model_config.name}...")
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"📱 Using device: {device}")

        try:
            # Clear GPU memory if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            elif torch.backends.mps.is_available():
                # For MPS, we can't clear cache but we can try to free memory
                import gc

                gc.collect()

            pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(
                model_config.model_id,
                torch_dtype=torch.float16 if device == "mps" else torch.float32,
                safety_checker=None,  # Disable safety checker during loading
            ).to(device)

            # Ensure safety checker is disabled
            pipeline.safety_checker = None

            pipelines[model_id] = pipeline
            print(f"✅ Pipeline loaded successfully for {model_config.name}")

        except Exception as e:
            print(f"❌ Failed to load pipeline for {model_id}: {str(e)}")
            # Try to load the default model as fallback
            if model_id != "stable-diffusion-v1-5":
                print(f"🔄 Falling back to default model...")
                return load_pipeline("stable-diffusion-v1-5")
            else:
                raise

    return pipelines[model_id]


@app.on_event("startup")
async def startup_event():
    """Load default pipeline on startup"""
    try:
        load_pipeline("stable-diffusion-v1-5")
    except Exception as e:
        print(f"⚠️ Warning: Could not load default pipeline: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-remix",
        "loaded_models": list(pipelines.keys()),
    }


@app.get("/models")
async def get_models():
    """Get list of available models"""
    return {"models": get_model_list(), "categories": get_models_by_category()}


@app.get("/models/{model_id}")
async def get_model_info(model_id: str):
    """Get information about a specific model"""
    model_config = get_model_config(model_id)
    if not model_config:
        raise HTTPException(status_code=404, detail="Model not found")

    return {
        "id": model_id,
        "name": model_config.name,
        "description": model_config.description,
        "category": model_config.category,
        "tags": model_config.tags,
        "example_prompts": model_config.example_prompts or [],
        "default_strength": model_config.default_strength,
        "default_guidance_scale": model_config.default_guidance_scale,
        "max_strength": model_config.max_strength,
        "min_strength": model_config.min_strength,
        "max_guidance_scale": model_config.max_guidance_scale,
        "min_guidance_scale": model_config.min_guidance_scale,
        "loaded": model_id in pipelines,
    }


@app.post("/remix", response_model=RemixResponse)
async def remix_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    strength: float = Form(0.6),
    guidance_scale: float = Form(7.5),
    model_id: str = Form("stable-diffusion-v1-5"),
):
    """Remix an uploaded image with AI using specified model"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Validate model
        model_config = get_model_config(model_id)
        if not model_config:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model_id}")

        # Validate parameters
        if not (model_config.min_strength <= strength <= model_config.max_strength):
            raise HTTPException(
                status_code=400,
                detail=f"Strength must be between {model_config.min_strength} and {model_config.max_strength}",
            )

        if not (
            model_config.min_guidance_scale
            <= guidance_scale
            <= model_config.max_guidance_scale
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Guidance scale must be between {model_config.min_guidance_scale} and {model_config.max_guidance_scale}",
            )

        # Load pipeline
        pipeline = load_pipeline(model_id)

        # Read and process image
        image_data = await file.read()
        init_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Resize to 512x512 (standard for SD)
        init_image = init_image.resize((512, 512))

        print(f"🎨 Remixing image with {model_config.name} - prompt: '{prompt}'")

        # Run diffusion
        try:
            output = pipeline(
                prompt=prompt,
                image=init_image,
                strength=strength,
                guidance_scale=guidance_scale,
            )

            # Check if output is valid
            if not output or not hasattr(output, "images") or not output.images:
                raise Exception("Pipeline returned invalid output")

        except Exception as e:
            print(f"❌ Pipeline execution failed: {str(e)}")
            raise Exception(f"AI processing failed: {str(e)}")

        # Save result
        output_dir = Path("results")
        output_dir.mkdir(exist_ok=True)

        result_filename = f"remixed_{model_id}_{uuid.uuid4().hex[:8]}.jpg"
        result_path = output_dir / result_filename

        try:
            output.images[0].save(result_path)
        except Exception as e:
            print(f"❌ Failed to save image: {str(e)}")
            raise Exception(f"Failed to save result: {str(e)}")

        # Return URL to the result
        result_url = f"/results/{result_filename}"

        print(f"✅ Remix complete: {result_filename}")

        return RemixResponse(
            success=True, result_url=result_url, model_used=model_config.name
        )

    except Exception as e:
        print(f"❌ Error during remix: {str(e)}")
        return RemixResponse(success=False, error=str(e))


@app.post("/remix-url", response_model=RemixResponse)
async def remix_image_from_url(request: RemixRequest):
    """Remix an image from URL with AI using specified model"""
    try:
        if not request.image_url:
            raise HTTPException(status_code=400, detail="image_url is required")

        # Validate model
        model_config = get_model_config(request.model_id)
        if not model_config:
            raise HTTPException(
                status_code=400, detail=f"Unknown model: {request.model_id}"
            )

        # Validate parameters
        if not (
            model_config.min_strength <= request.strength <= model_config.max_strength
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Strength must be between {model_config.min_strength} and {model_config.max_strength}",
            )

        if not (
            model_config.min_guidance_scale
            <= request.guidance_scale
            <= model_config.max_guidance_scale
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Guidance scale must be between {model_config.min_guidance_scale} and {model_config.max_guidance_scale}",
            )

        # Load pipeline
        pipeline = load_pipeline(request.model_id)

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

        print(
            f"🎨 Remixing image from URL with {model_config.name} - prompt: '{request.prompt}'"
        )

        # Run diffusion
        try:
            output = pipeline(
                prompt=request.prompt,
                image=init_image,
                strength=request.strength,
                guidance_scale=request.guidance_scale,
            )

            # Check if output is valid
            if not output or not hasattr(output, "images") or not output.images:
                raise Exception("Pipeline returned invalid output")

        except Exception as e:
            print(f"❌ Pipeline execution failed: {str(e)}")
            raise Exception(f"AI processing failed: {str(e)}")

        # Save result
        output_dir = Path("results")
        output_dir.mkdir(exist_ok=True)

        result_filename = f"remixed_{request.model_id}_{uuid.uuid4().hex[:8]}.jpg"
        result_path = output_dir / result_filename

        try:
            output.images[0].save(result_path)
        except Exception as e:
            print(f"❌ Failed to save image: {str(e)}")
            raise Exception(f"Failed to save result: {str(e)}")

        # Return URL to the result
        result_url = f"/results/{result_filename}"

        print(f"✅ Remix complete: {result_filename}")

        return RemixResponse(
            success=True, result_url=result_url, model_used=model_config.name
        )

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
