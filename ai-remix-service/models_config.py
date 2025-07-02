"""
Model configuration for AI Remix Service
Defines different Stable Diffusion models and their properties
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ModelConfig:
    """Configuration for a single model"""

    name: str
    model_id: str
    description: str
    category: str
    tags: List[str]
    default_strength: float = 0.6
    default_guidance_scale: float = 7.5
    max_strength: float = 1.0
    min_strength: float = 0.1
    max_guidance_scale: float = 20.0
    min_guidance_scale: float = 1.0
    example_prompts: List[str] = None
    requires_safety_checker: bool = True


# Define available models
AVAILABLE_MODELS = {
    "stable-diffusion-v1-5": ModelConfig(
        name="Stable Diffusion v1.5",
        model_id="runwayml/stable-diffusion-v1-5",
        description="Classic Stable Diffusion model, great for general image transformations",
        category="General",
        tags=["general", "classic", "versatile"],
        example_prompts=[
            "Turn this into a watercolor painting",
            "Make it look like a vintage photograph",
            "Transform into a cyberpunk style",
        ],
    ),
    "stable-diffusion-v2-1": ModelConfig(
        name="Stable Diffusion v2.1",
        model_id="stabilityai/stable-diffusion-2-1",
        description="Improved version with better quality and more realistic results",
        category="General",
        tags=["general", "realistic", "high-quality"],
        example_prompts=[
            "Make it look like a professional photograph",
            "Transform into a cinematic scene",
            "Convert to a realistic oil painting",
        ],
    ),
    "openjourney": ModelConfig(
        name="Openjourney",
        model_id="prompthero/openjourney",
        description="Midjourney-style model for artistic and creative transformations",
        category="Artistic",
        tags=["artistic", "midjourney-style", "creative"],
        example_prompts=[
            "Transform into a dreamy fantasy landscape",
            "Make it look like a concept art piece",
            "Convert to a magical illustration",
        ],
    ),
    "anything-v3": ModelConfig(
        name="Anything v3",
        model_id="Linaqruf/anything-v3.0",
        description="Anime and manga style model, perfect for cartoon and anime transformations",
        category="Anime",
        tags=["anime", "manga", "cartoon", "japanese"],
        example_prompts=[
            "Convert to anime style",
            "Transform into a manga illustration",
            "Make it look like a Studio Ghibli scene",
        ],
    ),
    "realistic-vision-v5": ModelConfig(
        name="Realistic Vision v5",
        model_id="SG161222/Realistic_Vision_V5.1_noVAE",
        description="Highly realistic model for photorealistic transformations",
        category="Realistic",
        tags=["realistic", "photorealistic", "detailed"],
        example_prompts=[
            "Make it look like a professional studio photo",
            "Transform into a hyperrealistic painting",
            "Convert to a high-resolution photograph",
        ],
    ),
    "dreamlike-diffusion": ModelConfig(
        name="Dreamlike Diffusion",
        model_id="dreamlike-art/dreamlike-diffusion-1.0",
        description="Dreamlike and surreal artistic style",
        category="Artistic",
        tags=["dreamlike", "surreal", "artistic", "fantasy"],
        example_prompts=[
            "Transform into a dreamlike fantasy world",
            "Make it look like a surreal painting",
            "Convert to a mystical illustration",
        ],
    ),
    "deliberate-v2": ModelConfig(
        name="Deliberate v2",
        model_id="XpucT/Deliberate-v2",
        description="Deliberate and controlled transformations with high quality",
        category="General",
        tags=["deliberate", "controlled", "quality"],
        example_prompts=[
            "Transform with deliberate artistic style",
            "Make it look like a carefully crafted illustration",
            "Convert to a deliberate artistic interpretation",
        ],
    ),
    "counterfeit-v3": ModelConfig(
        name="Counterfeit v3",
        model_id="gsdf/Counterfeit-V3.0",
        description="Anime style model with high quality and detail",
        category="Anime",
        tags=["anime", "detailed", "high-quality"],
        example_prompts=[
            "Convert to detailed anime style",
            "Transform into a high-quality manga panel",
            "Make it look like a professional anime scene",
        ],
    ),
}


def get_model_config(model_id: str) -> Optional[ModelConfig]:
    """Get configuration for a specific model"""
    return AVAILABLE_MODELS.get(model_id)


def get_available_models() -> Dict[str, ModelConfig]:
    """Get all available models"""
    return AVAILABLE_MODELS.copy()


def get_models_by_category() -> Dict[str, List[ModelConfig]]:
    """Get models organized by category"""
    categories = {}
    for model_id, config in AVAILABLE_MODELS.items():
        if config.category not in categories:
            categories[config.category] = []
        categories[config.category].append(config)
    return categories


def get_model_list() -> List[Dict]:
    """Get a simplified list of models for API responses"""
    return [
        {
            "id": model_id,
            "name": config.name,
            "description": config.description,
            "category": config.category,
            "tags": config.tags,
            "example_prompts": config.example_prompts or [],
        }
        for model_id, config in AVAILABLE_MODELS.items()
    ]
