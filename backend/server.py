from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
import io
from PIL import Image

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)
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
    {"id": "salade", "name": "Salade", "row": 1, "color": "#84CC16"},
    {"id": "petites-envies", "name": "Petites envies", "row": 1, "color": "#F97316"},
    {"id": "sauces", "name": "Sauces", "row": 1, "color": "#A855F7"},
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
    source_url: Optional[str] = None  # Optional for manual recipes
    source_type: str = "url"  # "url", "manual", "document"
    image_url: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[Ingredient] = []
    steps: List[RecipeStep] = []
    tags: List[str] = []  # List of filter IDs
    is_public: bool = False  # Whether recipe appears in public sidebar
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    url: str

class RecipeManualCreate(BaseModel):
    title: str
    description: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[Ingredient] = []
    steps: List[RecipeStep] = []
    tags: List[str] = []

class RecipeUpdate(BaseModel):
    tags: Optional[List[str]] = None
    title: Optional[str] = None
    description: Optional[str] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
    steps: Optional[List[RecipeStep]] = None

class EmailRequest(BaseModel):
    recipient_email: EmailStr

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Admin models
ADMIN_EMAIL = "loicchampanay@gmail.com"

class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class AdminEmailRequest(BaseModel):
    subject: str
    message: str
    recipient_emails: List[EmailStr]  # List of emails to send to

class AdminStatsResponse(BaseModel):
    total_users: int
    total_recipes: int
    total_images: int
    recent_users: List[dict]
    recent_recipes: List[dict]
    recipes_by_source: dict
    top_filters: List[dict]

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = ""
    message: str

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

def create_reset_token(user_id: str) -> str:
    """Create a password reset token valid for 1 hour"""
    payload = {
        "user_id": user_id,
        "type": "reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_reset_token(token: str) -> str:
    """Verify reset token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token invalide")
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Le lien a expiré. Veuillez refaire une demande.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token invalide")

def generate_reset_email_html(reset_link: str, user_name: str) -> str:
    """Generate HTML email for password reset"""
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
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 400;">Cooking Capture</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1C1917; font-size: 24px; font-weight: 600;">
                        Réinitialisation de votre mot de passe
                    </h2>
                    <p style="margin: 0 0 20px; color: #57534E; font-size: 16px; line-height: 1.6;">
                        Bonjour {user_name},
                    </p>
                    <p style="margin: 0 0 30px; color: #57534E; font-size: 16px; line-height: 1.6;">
                        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="display: inline-block; background-color: #3A5A40; color: #FFFFFF; text-decoration: none; padding: 14px 40px; border-radius: 25px; font-size: 16px; font-weight: 500;">
                            Réinitialiser mon mot de passe
                        </a>
                    </div>
                    <p style="margin: 30px 0 10px; color: #78716C; font-size: 14px; line-height: 1.6;">
                        Ce lien est valable pendant <strong>1 heure</strong>.
                    </p>
                    <p style="margin: 0; color: #78716C; font-size: 14px; line-height: 1.6;">
                        Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background: #F5F5F4; padding: 20px 30px; text-align: center;">
                    <p style="margin: 0; color: #78716C; font-size: 12px;">
                        Cooking Capture - Votre assistant culinaire
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

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

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    from pypdf import PdfReader
    try:
        pdf = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"
        return text[:15000]
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from Word document"""
    from docx import Document
    try:
        doc = Document(io.BytesIO(file_content))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text[:15000]
    except Exception as e:
        logger.error(f"Error extracting DOCX: {e}")
        return ""

def extract_text_from_image(file_content: bytes) -> str:
    """For images, we'll use AI vision - return empty for text extraction"""
    return ""

async def extract_recipe_from_document(file_content: bytes, filename: str, content_type: str) -> dict:
    """Extract recipe from uploaded document using AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    
    # Extract text based on file type
    text_content = ""
    is_image = False
    
    if content_type == "application/pdf" or filename.lower().endswith('.pdf'):
        text_content = extract_text_from_pdf(file_content)
    elif content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"] or filename.lower().endswith(('.docx', '.doc')):
        text_content = extract_text_from_docx(file_content)
    elif content_type.startswith("image/") or filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        is_image = True
    elif content_type == "text/plain" or filename.lower().endswith('.txt'):
        text_content = file_content.decode('utf-8', errors='ignore')[:15000]
    else:
        raise HTTPException(status_code=400, detail=f"Type de fichier non supporté: {content_type}")
    
    if not text_content and not is_image:
        raise HTTPException(status_code=400, detail="Impossible d'extraire le texte du document")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"recipe-doc-{uuid.uuid4()}",
        system_message="""Tu es un assistant expert en extraction de recettes de cuisine.
Ton rôle est d'analyser le contenu d'un document et d'extraire les informations de la recette.
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
    
    if is_image:
        # For images, use vision capabilities
        import base64
        b64_image = base64.b64encode(file_content).decode('utf-8')
        user_message = UserMessage(
            text="Analyse cette image de recette et extrait toutes les informations. Réponds UNIQUEMENT avec le JSON de la recette.",
            images=[f"data:{content_type};base64,{b64_image}"]
        )
    else:
        user_message = UserMessage(
            text=f"""Analyse ce document et extrait la recette de cuisine.
Nom du fichier: {filename}

Contenu du document:
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
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")

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

@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordRequest):
    """Request password reset email"""
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        logger.info(f"Password reset requested for non-existent email: {input.email}")
        return {"status": "success", "message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}
    
    # Create reset token
    reset_token = create_reset_token(user['id'])
    
    # Build reset URL (frontend URL)
    frontend_url = os.environ.get('FRONTEND_URL', 'https://recipe-box-10.preview.emergentagent.com')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Generate email HTML
    html_content = generate_reset_email_html(reset_link, user['name'])
    
    # Send email via Resend
    params = {
        "from": SENDER_EMAIL,
        "to": [input.email],
        "subject": "Réinitialisation de votre mot de passe - Cooking Capture",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {input.email}")
        return {"status": "success", "message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}
    except Exception as e:
        logger.error(f"Failed to send reset email: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")

@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordRequest):
    """Reset password using token"""
    # Verify token and get user_id
    user_id = verify_reset_token(input.token)
    
    # Validate password length
    if len(input.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Update password
    new_hash = hash_password(input.new_password)
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": new_hash}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    logger.info(f"Password reset successful for user {user_id}")
    return {"status": "success", "message": "Mot de passe réinitialisé avec succès"}

# ==================== PUBLIC RECIPES ROUTE ====================

@api_router.get("/recipes/public/recent")
async def get_public_recent_recipes():
    """Get recent public recipes for the sidebar (no auth required)"""
    # Get recipes marked as public, sorted by date
    cursor = db.recipes.find(
        {"is_public": True},
        {"_id": 0, "id": 1, "title": 1, "image_url": 1, "source_url": 1, "source_type": 1, "user_id": 1}
    ).sort("created_at", -1).limit(20)
    
    recipes = await cursor.to_list(length=20)
    
    # Add user names
    for recipe in recipes:
        user = await db.users.find_one({"id": recipe.get("user_id")}, {"_id": 0, "name": 1})
        recipe["user_name"] = user.get("name", "Anonyme") if user else "Anonyme"
    
    return {"recipes": recipes}

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
            source_type="url",
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

@api_router.post("/recipes/manual", response_model=Recipe)
async def create_manual_recipe(input: RecipeManualCreate, current_user: dict = Depends(get_current_user)):
    """Create a manual recipe"""
    recipe = Recipe(
        user_id=current_user['id'],
        title=input.title,
        description=input.description,
        source_url=None,
        source_type="manual",
        prep_time=input.prep_time,
        cook_time=input.cook_time,
        servings=input.servings,
        ingredients=input.ingredients,
        steps=input.steps,
        tags=input.tags
    )
    
    doc = recipe.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.recipes.insert_one(doc)
    
    logger.info(f"Manual recipe created: {recipe.title}")
    return recipe

@api_router.post("/recipes/upload", response_model=Recipe)
async def upload_recipe_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document (PDF, Word, image) and extract recipe"""
    try:
        # Read file content
        file_content = await file.read()
        
        if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
        
        logger.info(f"Processing uploaded file: {file.filename}, type: {file.content_type}")
        
        # Extract recipe from document
        recipe_data = await extract_recipe_from_document(file_content, file.filename, file.content_type)
        
        recipe = Recipe(
            user_id=current_user['id'],
            title=recipe_data.get('title', 'Recette sans titre'),
            description=recipe_data.get('description'),
            source_url=f"document:{file.filename}",
            source_type="document",
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
        
        logger.info(f"Document recipe saved: {recipe.title}")
        return recipe
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du document: {str(e)}")

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
    """Update recipe (tags, ingredients, steps, etc.)"""
    update_data = {}
    
    if input.tags is not None:
        update_data['tags'] = input.tags
    if input.title is not None:
        update_data['title'] = input.title
    if input.description is not None:
        update_data['description'] = input.description
    if input.prep_time is not None:
        update_data['prep_time'] = input.prep_time
    if input.cook_time is not None:
        update_data['cook_time'] = input.cook_time
    if input.servings is not None:
        update_data['servings'] = input.servings
    if input.ingredients is not None:
        update_data['ingredients'] = [ing.model_dump() for ing in input.ingredients]
    if input.steps is not None:
        update_data['steps'] = [step.model_dump() for step in input.steps]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    
    result = await db.recipes.update_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"$set": update_data}
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

# ==================== IMAGE UPLOAD ROUTES ====================

def compress_image(image_data: bytes, max_size: int = 1200, quality: int = 85) -> bytes:
    """Compress and resize image while maintaining aspect ratio"""
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if larger than max_size
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Save to bytes with compression
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        raise HTTPException(status_code=400, detail="Erreur lors de la compression de l'image")

@api_router.post("/recipes/{recipe_id}/upload-image")
async def upload_recipe_image(
    recipe_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and compress an image for a recipe"""
    # Check recipe exists and belongs to user
    recipe = await db.recipes.find_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG ou WebP.")
    
    try:
        # Read and compress image
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
        
        compressed_image = compress_image(file_content)
        
        # Delete old image if exists
        if recipe.get('image_url'):
            old_filename = recipe['image_url'].split('/')[-1]
            old_path = UPLOADS_DIR / old_filename
            if old_path.exists():
                old_path.unlink()
        
        # Save new image
        filename = f"{recipe_id}_{uuid.uuid4().hex[:8]}.jpg"
        file_path = UPLOADS_DIR / filename
        
        with open(file_path, 'wb') as f:
            f.write(compressed_image)
        
        # Update recipe with image URL
        image_url = f"/api/uploads/{filename}"
        await db.recipes.update_one(
            {"id": recipe_id},
            {"$set": {"image_url": image_url}}
        )
        
        logger.info(f"Image uploaded for recipe {recipe_id}: {filename}")
        
        return {
            "status": "success",
            "image_url": image_url,
            "message": "Image téléchargée avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du téléchargement: {str(e)}")

@api_router.delete("/recipes/{recipe_id}/image")
async def delete_recipe_image(
    recipe_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete the image of a recipe"""
    recipe = await db.recipes.find_one(
        {"id": recipe_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvée")
    
    if not recipe.get('image_url'):
        raise HTTPException(status_code=400, detail="Cette recette n'a pas d'image")
    
    try:
        # Delete file from disk
        filename = recipe['image_url'].split('/')[-1]
        file_path = UPLOADS_DIR / filename
        if file_path.exists():
            file_path.unlink()
        
        # Update recipe
        await db.recipes.update_one(
            {"id": recipe_id},
            {"$set": {"image_url": None}}
        )
        
        logger.info(f"Image deleted for recipe {recipe_id}")
        
        return {"status": "success", "message": "Image supprimée"}
        
    except Exception as e:
        logger.error(f"Error deleting image: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ==================== CONTACT ROUTE ====================

@api_router.post("/contact")
async def send_contact_message(contact: ContactRequest):
    """Send a contact message to the admin"""
    subject = contact.subject or "Message depuis Cooking Capture"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', sans-serif; background-color: #F9F8F6; margin: 0; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px;">
            <tr>
                <td style="background: linear-gradient(135deg, #3A5A40 0%, #344E41 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 20px;">📬 Nouveau message de contact</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <table style="width: 100%; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                                <strong>De :</strong> {contact.name}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                                <strong>Email :</strong> <a href="mailto:{contact.email}">{contact.email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                                <strong>Sujet :</strong> {subject}
                            </td>
                        </tr>
                    </table>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px;">
                        <strong>Message :</strong>
                        <p style="white-space: pre-wrap; margin-top: 10px;">{contact.message}</p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [ADMIN_EMAIL],
        "subject": f"[Contact] {subject}",
        "html": html_content,
        "reply_to": contact.email
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Contact message received from {contact.email}")
        return {"status": "success", "message": "Message envoyé avec succès"}
    except Exception as e:
        logger.error(f"Failed to send contact message: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi du message")

# ==================== ADMIN ROUTES ====================

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify the user is admin"""
    user = await get_current_user(credentials)
    if user['email'] != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return user

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get site statistics (admin only)"""
    # Total counts
    total_users = await db.users.count_documents({})
    total_recipes = await db.recipes.count_documents({})
    
    # Count images
    total_images = await db.recipes.count_documents({"image_url": {"$ne": None}})
    
    # Recent users (last 10)
    recent_users_cursor = db.users.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10)
    recent_users = await recent_users_cursor.to_list(length=10)
    
    # Recent recipes (last 10)
    recent_recipes_cursor = db.recipes.find(
        {},
        {"_id": 0, "id": 1, "title": 1, "user_id": 1, "source_type": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10)
    recent_recipes = await recent_recipes_cursor.to_list(length=10)
    
    # Recipes by source type
    recipes_by_source = {
        "url": await db.recipes.count_documents({"source_type": "url"}),
        "manual": await db.recipes.count_documents({"source_type": "manual"}),
        "document": await db.recipes.count_documents({"source_type": "document"})
    }
    
    # Top filters used
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_filters_cursor = db.recipes.aggregate(pipeline)
    top_filters = await top_filters_cursor.to_list(length=10)
    top_filters = [{"filter_id": f["_id"], "count": f["count"]} for f in top_filters]
    
    return {
        "total_users": total_users,
        "total_recipes": total_recipes,
        "total_images": total_images,
        "recent_users": recent_users,
        "recent_recipes": recent_recipes,
        "recipes_by_source": recipes_by_source,
        "top_filters": top_filters
    }

@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    """Get all users (admin only)"""
    cursor = db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1)
    users = await cursor.to_list(length=1000)
    
    # Add recipe count for each user
    for user in users:
        user['recipe_count'] = await db.recipes.count_documents({"user_id": user['id']})
    
    return {"users": users}

@api_router.post("/admin/users")
async def admin_create_user(user_data: AdminUserCreate, admin: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")
    
    # Create user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        custom_filters=[]
    )
    
    await db.users.insert_one(new_user.model_dump())
    logger.info(f"Admin created user: {user_data.email}")
    
    return {
        "status": "success",
        "message": f"Utilisateur {user_data.email} créé avec succès",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name
        }
    }

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user and all their data (admin only)"""
    # Find user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Prevent deleting admin
    if user['email'] == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Impossible de supprimer le compte administrateur")
    
    # Delete user's recipe images
    user_recipes = db.recipes.find({"user_id": user_id}, {"_id": 0, "image_url": 1})
    async for recipe in user_recipes:
        if recipe.get('image_url'):
            filename = recipe['image_url'].split('/')[-1]
            file_path = UPLOADS_DIR / filename
            if file_path.exists():
                file_path.unlink()
    
    # Delete user's recipes
    await db.recipes.delete_many({"user_id": user_id})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"Admin deleted user: {user['email']}")
    
    return {
        "status": "success",
        "message": f"Utilisateur {user['email']} et toutes ses données ont été supprimés"
    }

@api_router.delete("/admin/users/by-email/{email}")
async def admin_delete_user_by_email(email: str, admin: dict = Depends(get_admin_user)):
    """Delete a user by email (admin only)"""
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return await admin_delete_user(user['id'], admin)

@api_router.post("/admin/email")
async def admin_send_email(email_data: AdminEmailRequest, admin: dict = Depends(get_admin_user)):
    """Send email to users (admin only)"""
    if not email_data.recipient_emails:
        raise HTTPException(status_code=400, detail="Aucun destinataire spécifié")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F9F8F6; margin: 0; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden;">
            <tr>
                <td style="background: linear-gradient(135deg, #3A5A40 0%, #344E41 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 24px;">Cooking Capture</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px; color: #1C1917; font-size: 20px;">{email_data.subject}</h2>
                    <div style="color: #57534E; font-size: 16px; line-height: 1.6;">
                        {email_data.message.replace(chr(10), '<br>')}
                    </div>
                </td>
            </tr>
            <tr>
                <td style="background: #F5F5F4; padding: 20px; text-align: center;">
                    <p style="margin: 0; color: #78716C; font-size: 12px;">
                        Cooking Capture - Votre assistant culinaire
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    success_count = 0
    failed_emails = []
    
    for recipient in email_data.recipient_emails:
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [recipient],
                "subject": email_data.subject,
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
            success_count += 1
            logger.info(f"Admin email sent to {recipient}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            failed_emails.append(recipient)
    
    return {
        "status": "success" if success_count > 0 else "error",
        "message": f"{success_count} email(s) envoyé(s) sur {len(email_data.recipient_emails)}",
        "failed_emails": failed_emails
    }

@api_router.post("/admin/email/all")
async def admin_send_email_to_all(email_data: AdminEmailRequest, admin: dict = Depends(get_admin_user)):
    """Send email to all users (admin only)"""
    # Get all user emails
    cursor = db.users.find({}, {"_id": 0, "email": 1})
    users = await cursor.to_list(length=10000)
    all_emails = [u['email'] for u in users]
    
    # Update recipient list
    email_data.recipient_emails = all_emails
    
    return await admin_send_email(email_data, admin)

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, user_data: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    """Update a user's data (admin only) - RGPD droit de rectification"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = {}
    if user_data.name:
        update_data['name'] = user_data.name
    if user_data.email:
        # Check if new email is already used
        existing = await db.users.find_one({"email": user_data.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        update_data['email'] = user_data.email
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        logger.info(f"Admin updated user {user_id}: {update_data}")
    
    return {"status": "success", "message": "Utilisateur mis à jour"}

@api_router.get("/admin/users/{user_id}/export")
async def admin_export_user_data(user_id: str, admin: dict = Depends(get_admin_user)):
    """Export all user data (admin only) - RGPD droit à la portabilité"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Get all user's recipes
    recipes_cursor = db.recipes.find({"user_id": user_id}, {"_id": 0})
    recipes = await recipes_cursor.to_list(length=10000)
    
    export_data = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "recipes": recipes,
        "total_recipes": len(recipes)
    }
    
    return export_data

@api_router.post("/admin/users/{user_id}/send-data")
async def admin_send_user_data(user_id: str, admin: dict = Depends(get_admin_user)):
    """Send all user data to their email (admin only) - RGPD droit à la portabilité"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Get export data
    recipes_cursor = db.recipes.find({"user_id": user_id}, {"_id": 0})
    recipes = await recipes_cursor.to_list(length=10000)
    
    # Format recipes for email
    recipes_html = ""
    for r in recipes:
        recipes_html += f"""
        <div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">{r.get('title', 'Sans titre')}</h3>
            <p><strong>Source:</strong> {r.get('source_type', 'N/A')}</p>
            <p><strong>Créée le:</strong> {r.get('created_at', 'N/A')}</p>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', sans-serif; background-color: #F9F8F6; margin: 0; padding: 20px;">
        <table width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px;">
            <tr>
                <td style="background: linear-gradient(135deg, #3A5A40 0%, #344E41 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 20px;">📦 Vos données Cooking Capture</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <p>Bonjour {user.get('name', '')},</p>
                    <p>Conformément à votre demande et au RGPD (droit à la portabilité), voici l'ensemble de vos données personnelles stockées sur Cooking Capture :</p>
                    
                    <h2 style="border-bottom: 2px solid #3A5A40; padding-bottom: 10px;">👤 Informations du compte</h2>
                    <ul>
                        <li><strong>Nom:</strong> {user.get('name', 'N/A')}</li>
                        <li><strong>Email:</strong> {user.get('email', 'N/A')}</li>
                        <li><strong>Date d'inscription:</strong> {user.get('created_at', 'N/A')}</li>
                    </ul>
                    
                    <h2 style="border-bottom: 2px solid #3A5A40; padding-bottom: 10px;">📖 Vos recettes ({len(recipes)})</h2>
                    {recipes_html if recipes else '<p>Aucune recette enregistrée.</p>'}
                    
                    <p style="margin-top: 30px; color: #666; font-size: 12px;">
                        Pour toute question ou demande de suppression, contactez-nous via le formulaire de contact sur le site.
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background: #F5F5F4; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #78716C; font-size: 12px;">
                        Cooking Capture - https://coocking-capture.fr
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [user['email']],
        "subject": "Vos données Cooking Capture (RGPD)",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"User data sent to {user['email']}")
        return {"status": "success", "message": f"Données envoyées à {user['email']}"}
    except Exception as e:
        logger.error(f"Failed to send user data: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi des données")

# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
