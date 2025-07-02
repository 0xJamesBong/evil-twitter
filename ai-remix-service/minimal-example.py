from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image
import torch
import os

#  Useful documentation
# https://huggingface.co/docs/diffusers/en/api/pipelines/stable_diffusion/img2img?utm_source=chatgpt.com
# https://huggingface.co/docs/diffusers/en/using-diffusers/loading?utm_source=chatgpt.com

# Choose device: M1/M2 (Apple Silicon) or fallback to CPU
device = "mps" if torch.backends.mps.is_available() else "cpu"

# Load pipeline
pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5"
).to(device)

# Disable NSFW checker properly
pipe.safety_checker = lambda images, **kwargs: (images, [False] * len(images))

# Load input image
stock_image_path = "../../stock-image/men/men.3.jpg"
if not os.path.exists(stock_image_path):
    raise FileNotFoundError(f"Image not found: {stock_image_path}")

init_image = Image.open(stock_image_path).convert("RGB").resize((512, 512))

# Run remix
prompt = "A King of an ultra British empire"
output = pipe(prompt=prompt, image=init_image, strength=0.6, guidance_scale=7.5)

# Save result
output.images[0].save("remixed.jpg")
print("✅ Remix complete: remixed.jpg")
