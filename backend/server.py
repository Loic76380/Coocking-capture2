from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from bs4 import BeautifulSoup
import asyncio
import resend
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'cooking-capture-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Default filters
DEFAULT_FILTERS = [
    {"id": "apero", "name": "Apéro", "row": 1, "color": "#F59E0B"},
    {"id": "entrees", "name": "Entrées", "row": 1, "color": "#10B981"},
    {"id": "plats", "name": "Plats", "row": 1, "color": "#3B82F6"},
    {"id": "desserts", "name": "Desserts", "row": 1, "color": "#EC4899"},
    {"id": "sale", "name": "Salé", "row": 2, "color": "#8B5CF6"},
    {"id": "sucre", "name": "Sucré", "row": 2, "color": "#F472B6"},
    {"id": "viande", "name": "Viande", "row": 2, "color": "#EF4444"},
    {"id": "poisson", "name": "Poisson", "row": 2, "color": "#06B6D4"},
]

class FilterTag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    row: int = 3  # Custom filters go to row 3
    color: str = "#6B7280"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    custom_filters: List[FilterTag] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    custom_filters: List[FilterTag] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None

class FilterCreate(BaseModel):
    name: str
    color: str = "#6B7280"

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
    user_id: str
    title: str
    description: Optional[str] = None
    source_url: str
    image_url: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[Ingredient] = []
    steps: List[RecipeStep] = []
    tags: List[str] = []  # List of filter IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    url: str

class RecipeUpdate(BaseModel):
    tags: List[str] = []

class EmailRequest(BaseModel):
    recipient_email: EmailStr

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== HELPER FUNCTIONS ====================

async def fetch_webpage(url: str) -> str:
    """Fetch webpage content"""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as http_client:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = await http_client.get(url, headers=headers)
        response.raise_for_status()
        return response.text

def extract_text_from_html(html: str) -> str:
    """Extract readable text from HTML"""
    soup = BeautifulSoup(html, 'html.parser')
    
    for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
        element.decompose()
    
    text = soup.get_text(separator='\n', strip=True)
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
    
    import json
    try:
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
            <tr>
                <td style="background: linear-gradient(135deg, #3A5A40 0%, #344E41 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 400;">Votre Recette</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 30px 20px;">
                    <h2 style="margin: 0; color: #1C1917; font-size: 24px; font-weight: 600;">{recipe.get('title', 'Recette')}</h2>
                    <p style="margin: 10px 0 0; color: #78716C; font-size: 14px;">{recipe.get('description', '') or ''}</p>
                </td>
            </tr>
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
            <tr>
                <td style="padding: 20px 30px;">
                    <h3 style="margin: 0 0 15px; color: #3A5A40; font-size: 18px; font-weight: 600; border-bottom: 2px solid #3A5A40; padding-bottom: 8px;">Ingrédients</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1C1917;">
                        {ingredients_html}
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 30px;">
                    <h3 style="margin: 0 0 15px; color: #3A5A40; font-size: 18px; font-weight: 600; border-bottom: 2px solid #3A5A40; padding-bottom: 8px;">Préparation</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1C1917;">
                        {steps_html}
                    </table>
                </td>
            </tr>
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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(input: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing = await db.users.find_one({"email": input.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create user
    user = User(
        email=input.email,
        password_hash=hash_password(input.password),
        name=input.name,
        custom_filters=[]
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    token = create_token(user.id)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, custom_filters=[])
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(input: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    if not user or not verify_password(input.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user['id'])
    
    custom_filters = [FilterTag(**f) for f in user.get('custom_filters', [])]
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            custom_filters=custom_filters
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    custom_filters = [FilterTag(**f) for f in current_user.get('custom_filters', [])]
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        custom_filters=custom_filters
    )

@api_router.put("/auth/me", response_model=UserResponse)
async def update_me(input: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user"""
    update_data = {}
    if input.name:
        update_data['name'] = input.name
    
    if update_data:
        await db.users.update_one({"id": current_user['id']}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    custom_filters = [FilterTag(**f) for f in updated_user.get('custom_filters', [])]
    
    return UserResponse(
        id=updated_user['id'],
        email=updated_user['email'],
        name=updated_user['name'],
        custom_filters=custom_filters
    )

# ==================== FILTER ROUTES ====================

@api_router.get("/filters")
async def get_filters(current_user: dict = Depends(get_current_user)):
    """Get all filters (default + custom)"""
    custom_filters = current_user.get('custom_filters', [])
    return {
        "default_filters": DEFAULT_FILTERS,
        "custom_filters": custom_filters
    }

@api_router.post("/filters", response_model=FilterTag)
async def create_filter(input: FilterCreate, current_user: dict = Depends(get_current_user)):
    """Create a custom filter"""
    new_filter = FilterTag(
        id=str(uuid.uuid4()),
        name=input.name,
        row=3,
        color=input.color
    )
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$push": {"custom_filters": new_filter.model_dump()}}
    )
    
    return new_filter

@api_router.delete("/filters/{filter_id}")
async def delete_filter(filter_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a custom filter"""
    await db.users.update_one(
        {"id": current_user['id']},
        {"$pull": {"custom_filters": {"id": filter_id}}}
    )
    
    # Also remove this filter from all user's recipes
    await db.recipes.update_many(
        {"user_id": current_user['id']},
        {"$pull": {"tags": filter_id}}
    )
    
    return {"message": "Filtre supprimé"}

# ==================== RECIPE ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Cooking Capture API"}

@api_router.post("/recipes/extract", response_model=Recipe)
async def extract_recipe(input: RecipeCreate, current_user: dict = Depends(get_current_user)):
    """Extract recipe from URL and save to database"""
    try:
        logger.info(f"Fetching URL: {input.url}")
        html_content = await fetch_webpage(input.url)
        
        logger.info("Extracting recipe with AI...")
        recipe_data = await extract_recipe_with_ai(input.url, html_content)
        
        recipe = Recipe(
            user_id=current_user['id'],
            title=recipe_data.get('title', 'Recette sans titre'),
            description=recipe_data.get('description'),
            source_url=input.url,
            image_url=recipe_data.get('image_url'),
            prep_time=recipe_data.get('prep_time'),
            cook_time=recipe_data.get('cook_time'),
            servings=recipe_data.get('servings'),
            ingredients=[Ingredient(**ing) for ing in recipe_data.get('ingredients', [])],
            steps=[RecipeStep(**step) for step in recipe_data.get('steps', [])],
            tags=[]
        )
        
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
async def get_recipes(current_user: dict = Depends(get_current_user)):
    """Get all saved recipes for current user"""
    recipes = await db.recipes.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for recipe in recipes:
        if isinstance(recipe.get('created_at'), str):
            recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipes

@api_router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific recipe by ID"""
    recipe = await db.recipes.find_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    if isinstance(recipe.get('created_at'), str):
        recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipe

@api_router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, input: RecipeUpdate, current_user: dict = Depends(get_current_user)):
    """Update recipe tags"""
    result = await db.recipes.update_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"$set": {"tags": input.tags}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if isinstance(recipe.get('created_at'), str):
        recipe['created_at'] = datetime.fromisoformat(recipe['created_at'])
    
    return recipe

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a recipe"""
    result = await db.recipes.delete_one({"id": recipe_id, "user_id": current_user['id']})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    return {"message": "Recette supprimée"}

@api_router.post("/recipes/{recipe_id}/send-email")
async def send_recipe_email(recipe_id: str, email_request: EmailRequest, current_user: dict = Depends(get_current_user)):
    """Send recipe via email"""
    recipe = await db.recipes.find_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    html_content = generate_recipe_html(recipe)
    
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
