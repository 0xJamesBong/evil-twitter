from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import asyncio
import aiohttp
import aiofiles
from PIL import Image
import io
import base64
import os
from pathlib import Path
import json

# Import AI processing modules
from ai_processor import (
    StyleTransferProcessor,
    BackgroundRemovalProcessor,
    ImageEnhancer,
)

app = FastAPI(title="Image Remix AI Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for processing status (in production, use Redis or database)
processing_status = {}


class ProcessingRequest(BaseModel):
    image_id: str
    processing_type: str
    parameters: Optional[Dict[str, Any]] = None
    style_preset: Optional[str] = None
    source_image_url: str


class ProcessingResponse(BaseModel):
    success: bool
    processed_image_url: Optional[str] = None
    error: Optional[str] = None
    processing_id: str


class StatusResponse(BaseModel):
    status: str
    progress: Optional[float] = None
    result_url: Optional[str] = None
    error: Optional[str] = None


@app.post("/process", response_model=ProcessingResponse)
async def process_image(request: ProcessingRequest, background_tasks: BackgroundTasks):
    """Process an image with AI"""
    processing_id = str(uuid.uuid4())

    # Initialize processing status
    processing_status[processing_id] = {
        "status": "pending",
        "progress": 0.0,
        "result_url": None,
        "error": None,
    }

    # Start background processing
    background_tasks.add_task(process_image_background, processing_id, request)

    return ProcessingResponse(success=True, processing_id=processing_id)


@app.get("/status/{processing_id}", response_model=StatusResponse)
async def get_processing_status(processing_id: str):
    """Get processing status"""
    if processing_id not in processing_status:
        raise HTTPException(status_code=404, detail="Processing ID not found")

    status_data = processing_status[processing_id]
    return StatusResponse(**status_data)


async def process_image_background(processing_id: str, request: ProcessingRequest):
    """Background task for image processing"""
    try:
        # Update status to processing
        processing_status[processing_id]["status"] = "processing"
        processing_status[processing_id]["progress"] = 0.1

        # Download source image
        async with aiohttp.ClientSession() as session:
            async with session.get(request.source_image_url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download image: {response.status}")

                image_data = await response.read()

        processing_status[processing_id]["progress"] = 0.3

        # Process image based on type
        if request.processing_type == "style_transfer":
            processor = StyleTransferProcessor()
            result_image = await processor.process(
                image_data, request.style_preset or "vintage", request.parameters or {}
            )
        elif request.processing_type == "background_removal":
            processor = BackgroundRemovalProcessor()
            result_image = await processor.process(image_data, request.parameters or {})
        elif request.processing_type == "enhancement":
            processor = ImageEnhancer()
            result_image = await processor.process(
                image_data,
                (
                    request.parameters.get("enhancement_type", "general")
                    if request.parameters
                    else "general"
                ),
                request.parameters or {},
            )
        else:
            raise Exception(f"Unknown processing type: {request.processing_type}")

        processing_status[processing_id]["progress"] = 0.8

        # Save processed image
        output_dir = Path("processed_images")
        output_dir.mkdir(exist_ok=True)

        output_path = output_dir / f"{processing_id}.png"
        result_image.save(output_path)

        # In production, upload to cloud storage and return URL
        result_url = f"http://localhost:8000/processed/{processing_id}.png"

        # Update status to completed
        processing_status[processing_id]["status"] = "completed"
        processing_status[processing_id]["progress"] = 1.0
        processing_status[processing_id]["result_url"] = result_url

    except Exception as e:
        # Update status to failed
        processing_status[processing_id]["status"] = "failed"
        processing_status[processing_id]["error"] = str(e)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "image-remix-ai"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
