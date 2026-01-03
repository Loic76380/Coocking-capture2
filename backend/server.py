from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Ingredient(BaseModel):
    name: str
    quantity: str
    unit: Optional[str] = None

class RecipeStep(BaseModel):
    step_number: int
    instruction: str

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    source_url: str
    image_url: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[Ingredient] = []
    steps: List[RecipeStep] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    url: str

class EmailRequest(BaseModel):
    recipient_email: EmailStr

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ==================== HELPER FUNCTIONS ====================

async def fetch_webpage(url: str) -> str:
    """Fetch webpage content"""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.text

def extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML"""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove scripts and styles
    for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
        element.decompose()
    
    # Get text
    text = soup.get_text(separator='\n', strip=True)
    
    # Limit text length
    return text[:15000]

async def extract_recipe_with_ai(url: str, html_content: str) -> dict:
    """Use AI to extract recipe data from webpage content"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    
    text_content = extract_text_from_html(html_content)
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"recipe-extract-{uuid.uuid4()}",
        system_message="""Tu es un assistant expert en extraction de recettes de cuisine.
Ton rôle est d'analyser le contenu d'une page web et d'extraire les informations de la recette.
Tu dois TOUJOURS répondre en JSON valide, sans texte supplémentaire.

Format de réponse OBLIGATOIRE:
{
    "title": "Nom de la recette",
    "description": "Description courte (1-2 phrases)",
    "prep_time": "Temps de préparation (ex: 20 minutes)",
    "cook_time": "Temps de cuisson (ex: 45 minutes)",
    "servings": "Nombre de portions (ex: 4 personnes)",
    "ingredients": [
        {"name": "Nom ingrédient", "quantity": "200", "unit": "g"},
        {"name": "Autre ingrédient", "quantity": "2", "unit": ""}
    ],
    "steps": [
        {"step_number": 1, "instruction": "Première étape..."},
        {"step_number": 2, "instruction": "Deuxième étape..."}
    ]
}

Si une information n'est pas disponible, utilise null ou une chaîne vide."""
    ).with_model("openai", "gpt-4o")
    
    user_message = UserMessage(
        text=f"""Analyse cette page web et extrait la recette de cuisine.
URL source: {url}

Contenu de la page:
{text_content}

Réponds UNIQUEMENT avec le JSON de la recette extraite."""
    )
    
    response = await chat.send_message(user_message)
    
    # Parse the JSON response
    import json
    try:
        # Clean response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith('```json'):
            clean_response = clean_response[7:]
        if clean_response.startswith('```'):
            clean_response = clean_response[3:]
        if clean_response.endswith('```'):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        recipe_data = json.loads(clean_response)
        return recipe_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {response}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse de la recette: {str(e)}")

def generate_recipe_html(recipe: dict) -> str:
    """Generate beautiful HTML email for recipe"""
    ingredients_html = ""
    for ing in recipe.get('ingredients', []):
        unit = ing.get('unit', '') or ''
        ingredients_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E7E5E4;">{ing.get('quantity', '')} {unit}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E7E5E4;">{ing.get('name', '')}</td>
        </tr>"""
    
    steps_html = ""
    for step in recipe.get('steps', []):
        steps_html += f"""
        <tr>
            <td style="padding: 12px; vertical-align: top; width: 40px; color: #3A5A40; font-weight: bold; font-size: 18px;">{step.get('step_number', '')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E7E5E4;">{step.get('instruction', '')}</td>
        </tr>"""
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F9F8F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
            <!-- Header -->
            <tr>
                <td style="background: linear-gradient(135deg, #3A5A40 0%, #344E41 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 400;">Votre Recette</h1>
                </td>
            </tr>
            
            <!-- Title -->
            <tr>
                <td style="padding: 30px 30px 20px;">
                    <h2 style="margin: 0; color: #1C1917; font-size: 24px; font-weight: 600;">{recipe.get('title', 'Recette')}</h2>
                    <p style="margin: 10px 0 0; color: #78716C; font-size: 14px;">{recipe.get('description', '') or ''}</p>
                </td>
            </tr>
            
            <!-- Info -->
            <tr>
                <td style="padding: 0 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="background: #F5F5F4; padding: 15px; border-radius: 8px; text-align: center; width: 33%;">
                                <span style="display: block; color: #78716C; font-size: 12px; text-transform: uppercase;">Préparation</span>
                                <span style="display: block; color: #1C1917; font-size: 14px; font-weight: 500; margin-top: 4px;">{recipe.get('prep_time', '-') or '-'}</span>
                            </td>
                            <td style="width: 10px;"></td>
                            <td style="background: #F5F5F4; padding: 15px; border-radius: 8px; text-align: center; width: 33%;">
                                <span style="display: block; color: #78716C; font-size: 12px; text-transform: uppercase;">Cuisson</span>
                                <span style="display: block; color: #1C1917; font-size: 14px; font-weight: 500; margin-top: 4px;">{recipe.get('cook_time', '-') or '-'}</span>
                            </td>
                            <td style="width: 10px;"></td>
                            <td style="background: #F5F5F4; padding: 15px; border-radius: 8px; text-align: center; width: 33%;">
                                <span style="display: block; color: #78716C; font-size: 12px; text-transform: uppercase;">Portions</span>
                                <span style="display: block; color: #1C1917; font-size: 14px; font-weight: 500; margin-top: 4px;">{recipe.get('servings', '-') or '-'}</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Ingredients -->
            <tr>
                <td style="padding: 20px 30px;">
                    <h3 style="margin: 0 0 15px; color: #3A5A40; font-size: 18px; font-weight: 600; border-bottom: 2px solid #3A5A40; padding-bottom: 8px;">Ingrédients</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1C1917;">
                        {ingredients_html}
                    </table>
                </td>
            </tr>
            
            <!-- Steps -->
            <tr>
                <td style="padding: 20px 30px;">
                    <h3 style="margin: 0 0 15px; color: #3A5A40; font-size: 18px; font-weight: 600; border-bottom: 2px solid #3A5A40; padding-bottom: 8px;">Préparation</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1C1917;">
                        {steps_html}
                    </table>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background: #F5F5F4; padding: 20px 30px; text-align: center;">
                    <p style="margin: 0; color: #78716C; font-size: 12px;">
                        Recette extraite depuis: <a href="{recipe.get('source_url', '#')}" style="color: #3A5A40;">{recipe.get('source_url', '')}</a>
                    </p>
                    <p style="margin: 8px 0 0; color: #78716C; font-size: 11px;">Envoyé via Cooking Capture</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Cooking Capture API"}

@api_router.post("/recipes/extract", response_model=Recipe)
async def extract_recipe(input: RecipeCreate):
    """Extract recipe from URL and save to database"""
    try:
        # Fetch webpage
        logger.info(f"Fetching URL: {input.url}")
        html_content = await fetch_webpage(input.url)
        
        # Extract recipe with AI
        logger.info("Extracting recipe with AI...")
        recipe_data = await extract_recipe_with_ai(input.url, html_content)
        
        # Create recipe object
        recipe = Recipe(
            title=recipe_data.get('title', 'Recette sans titre'),
            description=recipe_data.get('description'),
            source_url=input.url,
            image_url=recipe_data.get('image_url'),
            prep_time=recipe_data.get('prep_time'),
            cook_time=recipe_data.get('cook_time'),
            servings=recipe_data.get('servings'),
            ingredients=[Ingredient(**ing) for ing in recipe_data.get('ingredients', [])],
            steps=[RecipeStep(**step) for step in recipe_data.get('steps', [])]
        )
        
        # Save to database
        doc = recipe.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.recipes.insert_one(doc)
        
        logger.info(f"Recipe saved: {recipe.title}")
        return recipe
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Impossible d'accéder à l'URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error extracting recipe: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'extraction: {str(e)}")

@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes():
    """Get all saved recipes"""
    recipes = await db.recipes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for recipe in recipes:
        if isinstance(recipe.get('created_at'), str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipes

@api_router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    """Get a specific recipe by ID"""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    if isinstance(recipe.get('created_at'), str):
        recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipe

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str):
    """Delete a recipe"""
    result = await db.recipes.delete_one({"id": recipe_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    return {"message": "Recette supprimée"}

@api_router.post("/recipes/{recipe_id}/send-email")
async def send_recipe_email(recipe_id: str, email_request: EmailRequest):
    """Send recipe via email"""
    # Get recipe
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    # Generate HTML email
    html_content = generate_recipe_html(recipe)
    
    # Send email
    params = {
        "from": SENDER_EMAIL,
        "to": [email_request.recipient_email],
        "subject": f"Recette: {recipe.get('title', 'Votre recette')}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Recette envoyée à {email_request.recipient_email}",
            "email_id": email.get("id") if isinstance(email, dict) else str(email)
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {str(e)}")

# Status check endpoints (keep for compatibility)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
