from fastapi import FastAPI, File, UploadFile, HTTPException, Path as FastAPIPath
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import io
import uvicorn
from pathlib import Path
import logging
from typing import List, Dict, Any, Optional
import os
import json
from enum import Enum
from pydantic import BaseModel
import joblib
from dotenv import load_dotenv



load_dotenv()  # Load environment variables from .env file




# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Enum for plant types
class PlantType(str, Enum):
    tomato = "tomato"
    cotton = "cotton"
    mango = "mango"
    rice = "rice"



# Initialize FastAPI app
app = FastAPI(
    title="Plant Disease Classification API",
    description="Unified API for classifying plant diseases (Tomato & Cotton) using deep learning",
    version="2.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global variables for models and class labels
models = {"tomato": None, "cotton": None, "mango": None}
class_labels = {"tomato": [], "cotton": [], "mango": []}
model_metadata = {"tomato": {}, "cotton": {}, "mango": {}}

IMG_SIZE = (224, 224)

# Model and labels file paths
MODEL_PATHS = {
    "tomato": "models/tomato_disease_model.keras",  # Update this path to match your original
    "cotton": "models/cotton_disease_model.keras",
    "mango": "models/mango_disease_model.keras",
    "rice": "models/rice_disease_model.keras",
}


CLASS_LABELS_PATHS = {
    "tomato": "class_labels/tomato_class_labels.txt",  # Original tomato path - update if different
    "cotton": "class_labels/cotton_class_labels.txt",
    "mango": "class_labels/mango_class_labels.txt",
    "rice": "class_labels/rice_class_labels.txt",
}

class CropYieldRequest(BaseModel):
    features: list[float]


METADATA_PATHS = {
    "tomato": "tomato_model_metadata.json",  # Optional for tomato
    "cotton": "cotton_model_metadata.json",
    "mango": "mango_model_metadata.json",
    "rice": "rice_model_metadata.json",
}


def load_model_and_labels(plant_type: str):
    """Load the trained model and class labels for specific plant type"""
    global models, class_labels, model_metadata

    try:
        # Load model
        model_path = MODEL_PATHS[plant_type]
        logger.info(f"Loading {plant_type} model from {model_path}")
        models[plant_type] = keras.models.load_model(model_path)
        logger.info(f"{plant_type.capitalize()} model loaded successfully")

        # Load class labels
        labels_path = CLASS_LABELS_PATHS[plant_type]
        logger.info(f"Loading {plant_type} class labels from {labels_path}")
        with open(labels_path, "r") as f:
            class_labels[plant_type] = [line.strip() for line in f.readlines()]
        logger.info(
            f"Loaded {len(class_labels[plant_type])} {plant_type} class labels: {class_labels[plant_type]}"
        )

        # Load metadata if available
        metadata_path = METADATA_PATHS[plant_type]
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                model_metadata[plant_type] = json.load(f)
            logger.info(f"Loaded {plant_type} model metadata")
        else:
            model_metadata[plant_type] = {
                "num_classes": len(class_labels[plant_type]),
                "image_size": IMG_SIZE,
                "model_type": "MobileNetV2_Transfer_Learning",
            }

        return True
    except Exception as e:
        logger.error(f"Error loading {plant_type} model or labels: {str(e)}")
        return False


def load_all_models():
    """Load all available models"""
    success_count = 0
    total_models = len(MODEL_PATHS)

    for plant_type in MODEL_PATHS.keys():
        if os.path.exists(MODEL_PATHS[plant_type]) and os.path.exists(
            CLASS_LABELS_PATHS[plant_type]
        ):
            if load_model_and_labels(plant_type):
                success_count += 1
                logger.info(f"✅ {plant_type.capitalize()} model loaded successfully")
            else:
                logger.warning(f"❌ Failed to load {plant_type} model")
        else:
            logger.warning(
                f"⚠️  {plant_type.capitalize()} model files not found, skipping..."
            )

    logger.info(f"Loaded {success_count}/{total_models} models successfully")
    return success_count > 0


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Preprocess image for model prediction

    Args:
        image: PIL Image object

    Returns:
        Preprocessed image array
    """
    try:
        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize image
        image = image.resize(IMG_SIZE)

        # Convert to numpy array and normalize
        img_array = np.array(image, dtype=np.float32) / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        return img_array
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Error preprocessing image: {str(e)}"
        )


def validate_image(file: UploadFile) -> bool:
    """
    Validate uploaded image file

    Args:
        file: Uploaded file object

    Returns:
        True if valid, raises HTTPException if invalid
    """
    # Check file size (max 10MB)
    if hasattr(file, "size") and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="File size too large. Maximum 10MB allowed."
        )

    # Check content type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
        )

    return True


def validate_plant_type(plant_type: str):
    """Validate if plant type is supported and model is loaded"""
    if plant_type not in models:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported plant type: {plant_type}. Supported types: {list(models.keys())}",
        )

    if models[plant_type] is None:
        raise HTTPException(
            status_code=503,
            detail=f"{plant_type.capitalize()} model not loaded. Please check server configuration.",
        )


@app.on_event("startup")
async def startup_event():
    """Load models and labels on startup"""
    logger.info("Starting up the Plant Disease Classification API...")

    if not load_all_models():
        logger.error("Failed to load any models. Please check file paths.")
        raise RuntimeError("Model initialization failed - no models could be loaded")

    logger.info("Application startup completed successfully")


@app.post("/predict-tomato")
async def predict_tomato_disease(file: UploadFile = File(...)):
    """
    Predict tomato disease from uploaded image

    Args:
        file: Image file (JPEG, PNG, BMP, TIFF)

    Returns:
        JSON response with prediction results
    """
    plant_type = "tomato"
    validate_plant_type(plant_type)
    validate_image(file)

    try:
        # Read image file
        logger.info(f"Processing tomato image: {file.filename}")
        image_data = await file.read()

        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        logger.info(
            f"Image opened successfully. Size: {image.size}, Mode: {image.mode}"
        )

        # Preprocess image
        processed_image = preprocess_image(image)
        logger.info("Image preprocessed successfully")

        # Make prediction
        logger.info("Making tomato prediction...")
        predictions = models[plant_type].predict(processed_image, verbose=0)

        # Get prediction results
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = class_labels[plant_type][predicted_class_idx]

        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                "class": class_labels[plant_type][i],
                "confidence": float(predictions[0][i]),
                "percentage": round(float(predictions[0][i]) * 100, 2),
            }
            for i in top_3_idx
        ]

        # Prepare response
        response = {
            "success": True,
            "plant_type": plant_type,
            "filename": file.filename,
            "prediction": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "percentage": round(confidence * 100, 2),
            },
            "top_3_predictions": top_3_predictions,
            "model_info": {
                "plant_type": plant_type,
                "total_classes": len(class_labels[plant_type]),
                "image_size": IMG_SIZE,
                "metadata": model_metadata.get(plant_type, {}),
            },
        }

        logger.info(
            f"Tomato prediction successful: {predicted_class} ({confidence:.4f})"
        )
        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error during tomato prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Tomato prediction failed: {str(e)}"
        )


@app.post("/predict-cotton")
async def predict_cotton_disease(file: UploadFile = File(...)):
    """
    Predict cotton disease from uploaded image

    Args:
        file: Image file (JPEG, PNG, BMP, TIFF)

    Returns:
        JSON response with prediction results
    """
    plant_type = "cotton"
    validate_plant_type(plant_type)
    validate_image(file)

    try:
        # Read image file
        logger.info(f"Processing cotton image: {file.filename}")
        image_data = await file.read()

        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        logger.info(
            f"Image opened successfully. Size: {image.size}, Mode: {image.mode}"
        )

        # Preprocess image
        processed_image = preprocess_image(image)
        logger.info("Image preprocessed successfully")

        # Make prediction
        logger.info("Making cotton prediction...")
        predictions = models[plant_type].predict(processed_image, verbose=0)

        # Get prediction results
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = class_labels[plant_type][predicted_class_idx]

        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                "class": class_labels[plant_type][i],
                "confidence": float(predictions[0][i]),
                "percentage": round(float(predictions[0][i]) * 100, 2),
            }
            for i in top_3_idx
        ]

        # Prepare response
        response = {
            "success": True,
            "plant_type": plant_type,
            "filename": file.filename,
            "prediction": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "percentage": round(confidence * 100, 2),
            },
            "top_3_predictions": top_3_predictions,
            "model_info": {
                "plant_type": plant_type,
                "total_classes": len(class_labels[plant_type]),
                "image_size": IMG_SIZE,
                "metadata": model_metadata.get(plant_type, {}),
            },
        }

        logger.info(
            f"Cotton prediction successful: {predicted_class} ({confidence:.4f})"
        )
        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error during cotton prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Cotton prediction failed: {str(e)}"
        )


@app.post("/predict-mango")
async def predict_mango_disease(file: UploadFile = File(...)):
    """
    Predict mango disease from uploaded image

    Args:
        file: Image file (JPEG, PNG, BMP, TIFF)

    Returns:
        JSON response with prediction results
    """
    plant_type = "mango"
    validate_plant_type(plant_type)
    validate_image(file)

    try:
        # Read image file
        logger.info(f"Processing mango image: {file.filename}")
        image_data = await file.read()

        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        logger.info(
            f"Image opened successfully. Size: {image.size}, Mode: {image.mode}"
        )

        # Preprocess image
        processed_image = preprocess_image(image)
        logger.info("Image preprocessed successfully")

        # Make prediction
        logger.info("Making mango prediction...")
        predictions = models[plant_type].predict(processed_image, verbose=0)

        # Get prediction results
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = class_labels[plant_type][predicted_class_idx]

        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                "class": class_labels[plant_type][i],
                "confidence": float(predictions[0][i]),
                "percentage": round(float(predictions[0][i]) * 100, 2),
            }
            for i in top_3_idx
        ]

        # Prepare response
        response = {
            "success": True,
            "plant_type": plant_type,
            "filename": file.filename,
            "prediction": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "percentage": round(confidence * 100, 2),
            },
            "top_3_predictions": top_3_predictions,
            "model_info": {
                "plant_type": plant_type,
                "total_classes": len(class_labels[plant_type]),
                "image_size": IMG_SIZE,
                "metadata": model_metadata.get(plant_type, {}),
            },
        }

        logger.info(
            f"Mango prediction successful: {predicted_class} ({confidence:.4f})"
        )
        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error during mango prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Mango prediction failed: {str(e)}"
        )


@app.post("/predict-rice")
async def predict_rice_disease(file: UploadFile = File(...)):
    """
    Predict rice disease from uploaded image

    Args:
        file: Image file (JPEG, PNG, BMP, TIFF)

    Returns:
        JSON response with prediction results
    """
    plant_type = "rice"
    validate_plant_type(plant_type)
    validate_image(file)

    try:
        # Read image file
        logger.info(f"Processing rice image: {file.filename}")
        image_data = await file.read()

        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        logger.info(
            f"Image opened successfully. Size: {image.size}, Mode: {image.mode}"
        )

        # Preprocess image
        processed_image = preprocess_image(image)
        logger.info("Image preprocessed successfully")

        # Make prediction
        logger.info("Making rice prediction...")
        predictions = models[plant_type].predict(processed_image, verbose=0)

        # Get prediction results
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = class_labels[plant_type][predicted_class_idx]

        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3_predictions = [
            {
                "class": class_labels[plant_type][i],
                "confidence": float(predictions[0][i]),
                "percentage": round(float(predictions[0][i]) * 100, 2),
            }
            for i in top_3_idx
        ]

        # Prepare response
        response = {
            "success": True,
            "plant_type": plant_type,
            "filename": file.filename,
            "prediction": {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "percentage": round(confidence * 100, 2),
            },
            "top_3_predictions": top_3_predictions,
            "model_info": {
                "plant_type": plant_type,
                "total_classes": len(class_labels[plant_type]),
                "image_size": IMG_SIZE,
                "metadata": model_metadata.get(plant_type, {}),
            },
        }

        logger.info(f"Rice prediction successful: {predicted_class} ({confidence:.4f})")
        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error during rice prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Rice prediction failed: {str(e)}")
    

# Custom exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500, content={"detail": "Internal server error occurred"}
    )


if __name__ == "__main__":
    # Check if model files exist
    missing_files = []

    for plant_type, model_path in MODEL_PATHS.items():
        if not os.path.exists(model_path):
            missing_files.append(f"{plant_type} model: {model_path}")

        labels_path = CLASS_LABELS_PATHS[plant_type]
        if not os.path.exists(labels_path):
            missing_files.append(f"{plant_type} labels: {labels_path}")

    if missing_files:
        print("⚠️  Warning: Some model files are missing:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nThe API will start but missing models won't be available.")
        print("Make sure to place your model files in the correct locations.\n")

    # Run the server
    print("🚀 Starting Plant Disease Classification API...")
    print("📚 API Documentation available at: http://192.168.18.226:8000/docs")
    print("🍅 Tomato prediction: http://192.168.18.226:8000/predict-tomato")
    print("🌱 Cotton prediction: http://192.168.18.226:8000/predict-cotton")
    print("🥭 Mango prediction: http://192.168.18.226:8000/predict_mango")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,  # Set to True for development
        access_log=True,
    )

@app.post("/api/predict/yield")
async def predict_crop_yield(request: CropYieldRequest):
    """
    Predict crop yield using crop_yield_model.pkl
    Args:
        request: CropYieldRequest with features in order ['Year', 'Area_harvested', 'Avg_Temp_ANN', 'Aqua_Water_Metric', 'CropType_encoded']
    Returns:
        JSON response with predicted yield
    """
    try:
        model_path = Path("models/crop_yield_model.pkl")

        # ✅ Check if model file exists
        if not model_path.exists():
            print("[ERROR] Crop yield model file not found.")
            raise HTTPException(status_code=500, detail="Crop yield model file not found.")

        # ✅ Load using joblib (not pickle)
        model = joblib.load(model_path)
        print("✅ Model loaded successfully!")

        # ✅ Validate input features
        features = request.features
        if not isinstance(features, list) or len(features) != 5:
            print(f"[ERROR] Invalid features: {features}")
            raise HTTPException(status_code=400, detail="Features must be a list of 5 numeric values.")

        # ✅ Convert to float
        features = [float(x) for x in features]

        # ✅ Predict
        prediction = model.predict([features])[0]
        print(f"[INFO] Prediction result: {prediction}")

        return {"predicted_yield": round(float(prediction), 3)}

    except Exception as e:
        print(f"[ERROR] Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# Add these imports to your existing imports at the top of main.py
import requests
import asyncio
import aiohttp
from pydantic import BaseModel
from typing import Optional

# Add these Pydantic models after your PlantType enum
class PredictionInput(BaseModel):
    plant_type: str
    predicted_class: str
    confidence: float
    
class CureSuggestionRequest(BaseModel):
    plant_type: str
    predicted_class: str
    confidence: Optional[float] = None
    severity: Optional[str] = None  # mild, moderate, severe
    language: Optional[str] = "en" # Add language field, default to English

class CureSuggestionResponse(BaseModel):
    success: bool
    plant_type: str
    disease: str
    cure_suggestion: str
    confidence_level: str
    model_used: str
    error: Optional[str] = None


# Add these configuration constants after your existing constants
# LLM Configuration - Multiple options
LLM_PROVIDERS = {
    "groq": {
        "model_name": "llama-3.3-70b-versatile",
        "api_url": "https://api.groq.com/openai/v1/chat/completions",
        "api_key_env": "GROQ_API_KEY",
        "max_tokens": 1500,  # Increased from 800
        "temperature": 0.7,
        "timeout": 90  # Increased timeout
    },
    "huggingface": {
        "model_name": "google/flan-t5-base",
        "api_url": "https://router.huggingface.co/models/google/flan-t5-base",
        "api_key_env": "HUGGINGFACE_API_KEY",
        "max_tokens": 500,  # Increased
        "temperature": 0.7,
        "timeout": 60
    },
    "together": {
        "model_name": "meta-llama/Llama-2-7b-chat-hf",
        "api_url": "https://api.together.xyz/v1/chat/completions",
        "api_key_env": "df29827c8fbbc875e9e28c07835515599e6b923b63f5d1cc4949cc1d935ecfb2",
        "max_tokens": 500,  # Increased
        "temperature": 0.7,
        "timeout": 60
    }
}

# Set your preferred provider here
PREFERRED_LLM = "groq"  # Change to "huggingface" or "together" as needed
LLM_CONFIG = LLM_PROVIDERS[PREFERRED_LLM]

# API Keys (set as environment variables)
API_KEYS = {
    "groq": os.getenv("GROQ_API_KEY", ""),
    "huggingface": os.getenv("HUGGINGFACE_API_TOKEN", ""),
    "together": os.getenv("TOGETHER_API_KEY", "")
}

# Add these helper functions before your existing functions

def create_cure_prompt(plant_type: str, disease: str, confidence: float, language: str) -> str:
    """Create a structured prompt for the LLM to generate cure suggestions"""
    
    confidence_level = "high" if confidence > 0.8 else "moderate" if confidence > 0.6 else "low"
    
    # Simple prompt with language support, no markdown
    prompt = f"""You are an agricultural expert. Provide treatment for {plant_type} plant disease: {disease}

IMPORTANT: Respond in {"Urdu" if language == "ur" else "English"} language only.
Do NOT use any markdown symbols like *, #, _, or other formatting.
Use plain text only.

Give practical cure steps in 3 parts:
1. Immediate treatment (2-3 actions)
2. Prevention tips (1-2 points)  
3. When to get expert help

Keep response under 200 words. Use simple language.

Treatment:"""
    
    return prompt

async def call_groq_llm(prompt: str) -> dict:
    """Call Groq API for LLM inference"""
    api_key = API_KEYS["groq"]
    if not api_key:
        return {"success": False, "error": "Groq API key not found"}
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": LLM_PROVIDERS["groq"]["model_name"],
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": LLM_CONFIG["max_tokens"],
        "temperature": LLM_CONFIG["temperature"]
    }
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=LLM_CONFIG["timeout"])) as session:
            async with session.post(
                LLM_PROVIDERS["groq"]["api_url"], 
                headers=headers, 
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {"success": True, "text": result["choices"][0]["message"]["content"]}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"Groq API error {response.status}: {error_text}"}
    except Exception as e:
        return {"success": False, "error": f"Groq request failed: {str(e)}"}

async def call_huggingface_llm(prompt: str) -> dict:
    """Call Hugging Face Inference API with a free model"""
    api_key = API_KEYS["huggingface"]
    if not api_key:
        return {"success": False, "error": "Hugging Face API key not found"}
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Using a simpler free model approach
    payload = {"inputs": prompt}
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=LLM_CONFIG["timeout"])) as session:
            async with session.post(
                "https://router.huggingface.co/models/google/flan-t5-base",  # Free model
                headers=headers, 
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if isinstance(result, list) and len(result) > 0:
                        return {"success": True, "text": result[0].get("generated_text", "")}
                    else:
                        return {"success": False, "error": "Unexpected response format"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HF API error {response.status}: {error_text}"}
    except Exception as e:
        return {"success": False, "error": f"HF request failed: {str(e)}"}

async def call_together_llm(prompt: str) -> dict:
    """Call Together AI API"""
    api_key = API_KEYS["together"]
    if not api_key:
        return {"success": False, "error": "Together API key not found"}
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": LLM_PROVIDERS["together"]["model_name"],
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": LLM_CONFIG["max_tokens"],
        "temperature": LLM_CONFIG["temperature"]
    }
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=LLM_CONFIG["timeout"])) as session:
            async with session.post(
                LLM_PROVIDERS["together"]["api_url"], 
                headers=headers, 
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return {"success": True, "text": result["choices"][0]["message"]["content"]}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"Together API error {response.status}: {error_text}"}
    except Exception as e:
        return {"success": False, "error": f"Together request failed: {str(e)}"}

def get_fallback_cure_suggestion(plant_type: str, disease: str) -> str:
    """Provide comprehensive cure suggestions when LLM is unavailable"""
    
    # Comprehensive disease-specific cures
    disease_cures = {
        # Tomato diseases
        "yellow-curl": "1. Remove infected plants immediately to prevent spread\n2. Apply imidacloprid-based insecticide to control whiteflies\n3. Use reflective mulch to repel whiteflies\n4. Plant resistant varieties like Pusa Ruby or Arka Samrat\n\nPrevention: Control whitefly population, remove weeds, use sticky traps",
        
        "late_blight": "1. Apply copper-based fungicide spray every 7-10 days\n2. Remove and destroy affected leaves and fruits\n3. Improve air circulation by proper spacing\n4. Avoid overhead watering, water at soil level\n\nPrevention: Use drip irrigation, apply preventive fungicide sprays",
        
        "early_blight": "1. Spray with mancozeb or chlorothalonil fungicide\n2. Remove lower leaves touching the ground\n3. Apply mulch to prevent soil splash\n4. Ensure proper plant spacing for air circulation\n\nPrevention: Crop rotation, avoid overhead watering",
        
        "bacterial_spot": "1. Apply copper-based bactericide sprays\n2. Remove and destroy infected plant parts\n3. Avoid working in wet conditions\n4. Use drip irrigation instead of sprinklers\n\nPrevention: Use certified disease-free seeds, practice crop rotation",
        
        "mosaic_virus": "1. Remove infected plants immediately\n2. Control aphid vectors with insecticides\n3. Use reflective mulch to deter aphids\n4. Disinfect tools between plants\n\nPrevention: Plant resistant varieties, control aphid population",
        
        # Cotton diseases
        "bacterial_blight": "1. Apply copper oxychloride spray (3g/liter)\n2. Remove and burn infected plant parts\n3. Use resistant varieties like Bunny Bt\n4. Avoid irrigation during flowering\n\nPrevention: Seed treatment with streptocycline, balanced fertilization",
        
        "fusarium_wilt": "1. Apply Trichoderma viride to soil\n2. Use soil solarization before planting\n3. Apply carbendazim soil drench\n4. Ensure proper drainage\n\nPrevention: Use resistant varieties, avoid waterlogging",
        
        # Mango diseases
        "anthracnose": "1. Spray copper oxychloride before flowering\n2. Apply propiconazole after fruit set\n3. Remove infected fruits and leaves\n4. Improve orchard sanitation\n\nPrevention: Proper pruning for air circulation, avoid overhead irrigation",
        
        "powdery_mildew": "1. Spray sulfur-based fungicide weekly\n2. Apply neem oil solution (5ml/liter)\n3. Remove affected leaves and shoots\n4. Ensure good air circulation\n\nPrevention: Avoid overhead watering, plant in sunny locations",
        
        # Rice diseases
        "blast": "1. Apply tricyclazole fungicide spray\n2. Use balanced NPK fertilization\n3. Drain field for 2-3 days\n4. Apply silica-rich fertilizers\n\nPrevention: Use resistant varieties, avoid excess nitrogen",
        
        "brown_spot": "1. Spray mancozeb fungicide\n2. Apply potash fertilizer\n3. Ensure proper field drainage\n4. Remove infected stubble\n\nPrevention: Use healthy seeds, balanced nutrition",
        
        # Common patterns
        "blight": "1. Apply copper-based fungicide immediately\n2. Remove all affected plant parts\n3. Improve air circulation around plants\n4. Reduce humidity by avoiding overhead watering\n\nPrevention: Preventive fungicide sprays, proper plant spacing",
        
        "wilt": "1. Apply carbendazim soil drench\n2. Improve soil drainage\n3. Reduce watering frequency\n4. Apply Trichoderma to soil\n\nPrevention: Use resistant varieties, avoid waterlogging",
        
        "rot": "1. Remove affected fruits/parts immediately\n2. Apply copper fungicide spray\n3. Improve ventilation and drainage\n4. Reduce humidity around plants\n\nPrevention: Proper spacing, avoid overwatering",
        
        "spot": "1. Apply chlorothalonil fungicide spray\n2. Remove infected leaves\n3. Avoid overhead watering\n4. Ensure good air circulation\n\nPrevention: Crop rotation, resistant varieties",
        
        "rust": "1. Apply sulfur-based fungicide\n2. Remove affected leaves immediately\n3. Improve air circulation\n4. Avoid overhead irrigation\n\nPrevention: Plant resistant varieties, proper spacing",
        
        "mildew": "1. Spray with potassium bicarbonate solution\n2. Apply neem oil (5ml/liter water)\n3. Improve air circulation\n4. Remove affected plant parts\n\nPrevention: Avoid overhead watering, ensure good ventilation"
    }
    
    # Normalize disease name for matching
    disease_lower = disease.lower().replace(" ", "_").replace("-", "_")
    
    # Direct match first
    if disease_lower in disease_cures:
        return disease_cures[disease_lower]
    
    # Pattern matching for partial matches
    for pattern, cure in disease_cures.items():
        if pattern in disease_lower or disease_lower in pattern:
            return cure
    
    # Generic cure based on plant type
    generic_cures = {
        "tomato": "1. Apply copper-based fungicide spray\n2. Remove affected plant parts immediately\n3. Improve air circulation and drainage\n4. Use drip irrigation instead of overhead watering\n\nPrevention: Plant resistant varieties, practice crop rotation",
        
        "cotton": "1. Apply appropriate fungicide based on symptoms\n2. Remove and destroy infected plant parts\n3. Ensure proper field drainage\n4. Use balanced fertilization\n\nPrevention: Use resistant varieties, proper field sanitation",
        
        "mango": "1. Apply copper oxychloride spray\n2. Remove infected fruits and leaves\n3. Improve orchard sanitation\n4. Ensure proper drainage\n\nPrevention: Regular pruning, avoid overhead irrigation",
        
        "rice": "1. Apply appropriate fungicide spray\n2. Ensure proper field drainage\n3. Use balanced NPK fertilization\n4. Remove infected plant debris\n\nPrevention: Use certified seeds, practice crop rotation"
    }
    
    return generic_cures.get(plant_type.lower(), 
        "1. Apply broad-spectrum fungicide spray\n2. Remove all affected plant parts\n3. Improve drainage and air circulation\n4. Adjust watering practices\n\nPrevention: Use healthy plants, maintain field hygiene")

async def call_llm_with_fallback(prompt: str) -> dict:
    """Call LLM with fallback options"""
    
    # List of providers to try in order
    providers = [
        ("groq", call_groq_llm),
        ("huggingface", call_huggingface_llm),
        ("together", call_together_llm)
    ]
    
    # Try preferred provider first
    if PREFERRED_LLM == "groq":
        result = await call_groq_llm(prompt)
    elif PREFERRED_LLM == "huggingface":
        result = await call_huggingface_llm(prompt)
    elif PREFERRED_LLM == "together":
        result = await call_together_llm(prompt)
    else:
        result = {"success": False, "error": "Unknown provider"}
    
    if result["success"]:
        return result
    
    # Try other providers as fallback
    for provider_name, provider_func in providers:
        if provider_name != PREFERRED_LLM:
            logger.info(f"Trying fallback provider: {provider_name}")
            result = await provider_func(prompt)
            if result["success"]:
                return result
    
    # All providers failed
    return {"success": False, "error": "All LLM providers failed"}

def extract_cure_from_response(llm_response: str, original_prompt: str) -> str:
    """Extract only the cure suggestion from LLM response"""
    try:
        # Remove the original prompt from response
        if original_prompt in llm_response:
            cure_text = llm_response.replace(original_prompt, "").strip()
        else:
            cure_text = llm_response.strip()
        
        # Clean up the response
        cure_text = cure_text.replace("Cure suggestion:", "").strip()
        cure_text = cure_text.replace("Treatment:", "").strip()
        cure_text = cure_text.replace("علاج:", "").strip()
        
        # Don't truncate - let the full response come through
        # Remove the truncation that was cutting off responses
        return cure_text
        
    except Exception as e:
        logger.error(f"Error extracting cure from response: {str(e)}")
        return "Unable to generate cure suggestion. Please consult an agricultural expert."

# Add this new endpoint to your FastAPI app (add this before the exception handler)

@app.post("/get-cure-suggestion", response_model=CureSuggestionResponse)
async def get_cure_suggestion(request: CureSuggestionRequest):
    """
    Get cure suggestion for a predicted plant disease using LLM
    
    Args:
        request: CureSuggestionRequest with plant_type, predicted_class, confidence, severity, and language
        
    Returns:
        JSON response with cure suggestion
    """
    try:
        logger.info(f"Getting cure suggestion for {request.plant_type} - {request.predicted_class} in language: {request.language}")
        
        # Validate plant type
        if request.plant_type not in ["tomato", "cotton", "mango", "rice"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported plant type: {request.plant_type}"
            )
        
        # Create prompt for LLM
        confidence = request.confidence or 0.5
        prompt = create_cure_prompt(
            request.plant_type, 
            request.predicted_class, 
            confidence,
            request.language
        )
        
        # Call LLM with fallback
        logger.info("Calling LLM for cure suggestion...")
        llm_result = await call_llm_with_fallback(prompt)
        
        if llm_result["success"]:
            cure_suggestion = extract_cure_from_response(llm_result["text"], prompt)
            model_used = LLM_CONFIG["model_name"]
            
            # Log the full response for debugging
            logger.info(f"Full LLM response length: {len(llm_result['text'])} characters")
            logger.info(f"Extracted cure length: {len(cure_suggestion)} characters")
        else:
            # Use fallback cure suggestion when all LLM providers fail
            logger.warning(f"All LLM providers failed: {llm_result['error']}")
            cure_suggestion = get_fallback_cure_suggestion(request.plant_type, request.predicted_class)
            model_used = "fallback_system"
        
        # Determine confidence level
        confidence_level = "high" if confidence > 0.8 else "moderate" if confidence > 0.6 else "low"
        
        response = CureSuggestionResponse(
            success=True,
            plant_type=request.plant_type,
            disease=request.predicted_class,
            cure_suggestion=cure_suggestion,
            confidence_level=confidence_level,
            model_used=model_used
        )
        
        logger.info(f"Cure suggestion generated successfully for {request.plant_type} - {request.predicted_class}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating cure suggestion: {str(e)}")
        return CureSuggestionResponse(
            success=False,
            plant_type=request.plant_type,
            disease=request.predicted_class,
            cure_suggestion="Unable to generate cure suggestion at this time. Please consult an agricultural expert.",
            confidence_level="low",
            model_used=LLM_CONFIG["model_name"],
            error=str(e)
        )

# Optional: Add a health check endpoint for the LLM service
@app.get("/llm-health")
async def check_llm_health():
    """Check if LLM services are available"""
    try:
        test_prompt = "Say hello"
        result = await call_llm_with_fallback(test_prompt)
        
        # Check which providers have API keys
        available_providers = []
        for provider, key in API_KEYS.items():
            if key:
                available_providers.append(provider)
        
        return {
            "llm_service": "available" if result["success"] else "limited",
            "preferred_provider": PREFERRED_LLM,
            "available_providers": available_providers,
            "fallback_system": "available",
            "status": "healthy" if result["success"] or len(available_providers) > 0 else "degraded",
            "error": result.get("error") if not result["success"] else None
        }
    except Exception as e:
        return {
            "llm_service": "unavailable",
            "preferred_provider": PREFERRED_LLM,
            "available_providers": [],
            "fallback_system": "available",
            "status": "degraded",
            "error": str(e)
        }