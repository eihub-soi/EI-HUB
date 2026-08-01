import os
import re
import uuid
import json
import jwt
import requests
import asyncio
import time
import httpx
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Security, Depends, Header, Body, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import libsql_client
from contextlib import asynccontextmanager
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

# Load environment
dotenv_path = os.path.join(os.path.dirname(__file__), "../.env")
load_dotenv(dotenv_path)

# ----------------------------------------------------
# CONCURRENCY, CACHING AND SCALE STRUCTURES
# ----------------------------------------------------

class TTLMemCache:
    """Coroutine-safe, lock-free in-memory cache with TTL expiration"""
    def __init__(self, ttl: int = 300):
        self.ttl = ttl
        self.cache = {}

    async def get(self, key: str) -> Optional[Any]:
        val, expiry = self.cache.get(key, (None, 0))
        if val is not None and time.time() < expiry:
            return val
        if key in self.cache:
            del self.cache[key]
        return None

    async def set(self, key: str, val: Any):
        self.cache[key] = (val, time.time() + self.ttl)

    async def delete(self, key: str):
        if key in self.cache:
            del self.cache[key]

    async def clear(self):
        self.cache.clear()

# User Profile cache for Auth token verification bypass
USER_PROFILE_CACHE = TTLMemCache(ttl=60)

# Caches for catalog and requests lists supporting paginated/filtered caching
COMPONENTS_CACHE = TTLMemCache(ttl=5)
COMPONENTS_CACHE_LOCK = asyncio.Lock()

REQUESTS_CACHE = TTLMemCache(ttl=5)
REQUESTS_CACHE_LOCK = asyncio.Lock()

# Global locks for thread-safety
db_lock = asyncio.Lock()
google_keys_lock = asyncio.Lock()

# Rate limiting settings
RATE_LIMIT_REQUESTS = defaultdict(list)
RATE_LIMIT_LOCK = asyncio.Lock()
RATE_LIMIT_MAX_REQUESTS = 100  # Max requests per window
RATE_LIMIT_WINDOW = 60         # Window size in seconds

# Periodic cleanup task for rate limiting memory leak
async def cleanup_rate_limits():
    while True:
        try:
            await asyncio.sleep(120)  # Prune every 2 minutes
            async with RATE_LIMIT_LOCK:
                now = time.time()
                to_delete = []
                for ip, ts in RATE_LIMIT_REQUESTS.items():
                    valid_ts = [t for t in ts if now - t < RATE_LIMIT_WINDOW]
                    if not valid_ts:
                        to_delete.append(ip)
                    else:
                        RATE_LIMIT_REQUESTS[ip] = valid_ts
                for ip in to_delete:
                    del RATE_LIMIT_REQUESTS[ip]
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[RateLimit Cleanup] Error: {e}")

# Asynchronous Background Email Queue & Workers
EMAIL_QUEUE = asyncio.Queue()

async def email_worker():
    while True:
        try:
            to_email, subject, html, attachment = await EMAIL_QUEUE.get()
            try:
                await send_brevo_email(to_email, subject, html, attachment)
            except Exception as e:
                print(f"[Email Worker] Failed to send email to {to_email}: {e}")
            finally:
                EMAIL_QUEUE.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Email Worker] Loop error: {e}")
            await asyncio.sleep(1)



# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        if sa_json:
            try:
                cred_dict = json.loads(sa_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK initialized successfully using FIREBASE_SERVICE_ACCOUNT env var.")
            except Exception as e:
                print(f"Warning: Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT: {e}")
        else:
            if not sa_path:
                # Auto-detect service account credentials in backend folder
                backend_dir = os.path.dirname(__file__)
                for file_name in os.listdir(backend_dir):
                    if file_name.endswith(".json") and ("firebase-adminsdk" in file_name or file_name == "firebase-service-account.json"):
                        sa_path = os.path.join(backend_dir, file_name)
                        break

            if sa_path and os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase Admin SDK initialized successfully using credentials: {sa_path}")
            else:
                # Fallback to default application credentials
                firebase_admin.initialize_app()
                print("Firebase Admin SDK initialized with default application credentials.")
    else:
        print("Firebase Admin SDK already initialized.")
except Exception as e:
    print(f"Warning: Firebase Admin SDK initialization failed: {e}. Programmatic reset link generation will not be active.")


# Connect to database
db_url = os.environ.get("VITE_TURSO_DATABASE_URL")
db_token = os.environ.get("VITE_TURSO_AUTH_TOKEN")

if db_url and db_url.startswith("libsql://"):
    db_url = db_url.replace("libsql://", "https://")

if not db_url or "placeholder" in db_url:
    if os.environ.get("VERCEL"):
        db_url = "file:/tmp/local.db"
    else:
        db_url = "file:local.db"
    db_token = None

# Initialize connection globally as None
client: Optional[Any] = None
db_initialized: bool = False

async def get_db_client() -> Any:
    global client, db_initialized
    if client is None or not db_initialized:
        async with db_lock:
            if client is None:
                print(f"Connecting to database: {db_url}")
                assert db_url is not None, "Database URL must be configured"
                client = libsql_client.create_client(url=db_url, auth_token=db_token)
                
            if not db_initialized:
                # Check profiles table and run schema if needed
                try:
                    await client.execute("SELECT 1 FROM profiles LIMIT 1")
                    print("Database connection verified.")
                    db_initialized = True
                except Exception:
                    print("Database tables not found. Initializing schema...")
                    schema_path = os.path.join(os.path.dirname(__file__), "../turso/schema_turso.sql")
                    if os.path.exists(schema_path):
                        with open(schema_path, "r", encoding="utf-8") as f:
                            schema_sql = f.read()
                        # Split schema by semicolons to execute separate statements
                        statements = re.split(r';\s*\n', schema_sql)
                        for stmt in statements:
                            stmt = stmt.strip()
                            if stmt and not stmt.startswith("--"):
                                try:
                                    await client.execute(stmt)
                                except Exception as err:
                                    print(f"Error executing statement:\n{stmt}\nError: {err}")
                        print("Database initialized successfully.")
                        db_initialized = True
                    else:
                        print("Warning: schema_turso.sql not found at path:", schema_path)
                        db_initialized = True
                        
                # Sync password_resets table
                try:
                    await client.execute("""
                        CREATE TABLE IF NOT EXISTS password_resets (
                            email TEXT PRIMARY KEY,
                            token TEXT NOT NULL,
                            expires_at TEXT NOT NULL
                        )
                    """)
                except Exception as e:
                    print("Error creating password_resets table:", e)
                    
                # Migrate profiles table to add password column if not exists
                try:
                    await client.execute("ALTER TABLE profiles ADD COLUMN password TEXT")
                    print("Profiles database schema migrated successfully (password).")
                except Exception:
                    pass
                    
                # Migrate profiles table to add year_of_study column if not exists
                try:
                    await client.execute("ALTER TABLE profiles ADD COLUMN year_of_study TEXT")
                    print("Profiles database schema migrated successfully (year_of_study).")
                except Exception:
                    pass
                    
    return client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-initialize client on startup if lifespan runs
    await get_db_client()
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_rate_limits())
    
    # Start background email workers
    email_tasks = [asyncio.create_task(email_worker()) for _ in range(3)]
    
    yield
    
    # Cancel background tasks
    cleanup_task.cancel()
    for task in email_tasks:
        task.cancel()
        
    global client
    if client:
        await client.close()
        client = None

app = FastAPI(title="EI HUB API", description="Python FastAPI Backend for EI HUB", version="1.0.0", lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-IP Sliding Window Rate Limiting Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Exclude API documentation and standard schema endpoints from limit
    if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    async with RATE_LIMIT_LOCK:
        # Keep only request timestamps that fall within the current sliding window
        timestamps = [t for t in RATE_LIMIT_REQUESTS[client_ip] if now - t < RATE_LIMIT_WINDOW]
        RATE_LIMIT_REQUESTS[client_ip] = timestamps
        
        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return Response(
                content=json.dumps({"detail": "Too many requests. Please try again later."}),
                status_code=429,
                media_type="application/json"
            )
            
        RATE_LIMIT_REQUESTS[client_ip].append(now)
        
    return await call_next(request)

# Helper to run raw SQL queries
def row_to_dict(columns, row):
    return {col: val for col, val in zip(columns, row)}

async def db_query(sql: str, params: Optional[list] = None) -> List[Dict[str, Any]]:
    db_client = await get_db_client()
    result = await db_client.execute(sql, params or [])
    cols = result.columns
    return [row_to_dict(cols, row) for row in result.rows]

async def db_execute(sql: str, params: Optional[list] = None):
    db_client = await get_db_client()
    return await db_client.execute(sql, params or [])

# Token validation helper
security = HTTPBearer()
GOOGLE_KEYS = {}

async def get_google_public_key(kid: str) -> str:
    global GOOGLE_KEYS
    # Fast path if key is already cached
    if kid in GOOGLE_KEYS:
        return GOOGLE_KEYS[kid]
        
    async with google_keys_lock:
        # Double check cache inside lock
        if kid in GOOGLE_KEYS:
            return GOOGLE_KEYS[kid]
            
        url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                r = await http_client.get(url)
                if r.status_code == 200:
                    GOOGLE_KEYS = r.json()
                    print("[Google Certs] Refreshed and cached Google public keys.")
        except Exception as e:
            print(f"Error fetching Google certs: {e}")
            
    cert_pem = GOOGLE_KEYS.get(kid)
    if not cert_pem:
        raise HTTPException(status_code=401, detail="Invalid token kid")
    return cert_pem

DEMO_PROFILES = {
    "usr-student-1": {
        "uid": "usr-student-1",
        "email": "student-01@kgkite.ac.in",
        "name": "Aravind R",
        "role": "student"
    },
    "usr-faculty-1": {
        "uid": "usr-faculty-1",
        "email": "faculty-01@kgkite.ac.in",
        "name": "Prof. Robert Chen",
        "role": "faculty"
    },
    "usr-admin-1": {
        "uid": "usr-admin-1",
        "email": "admin-02@kgkite.ac.in",
        "name": "Admin User",
        "role": "admin"
    }
}

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = credentials.credentials
    
    # Check user profile cache first
    cached_user = await USER_PROFILE_CACHE.get(token)
    if cached_user:
        return cached_user
        
    # Helper to cache and return
    async def cache_and_return(user_dict):
        await USER_PROFILE_CACHE.set(token, user_dict)
        return user_dict

    # Check for demo/mock auth tokens
    if token in DEMO_PROFILES:
        return await cache_and_return(DEMO_PROFILES[token])
        
    if token.startswith("demo-"):
        role = token.replace("demo-", "")
        for dp in DEMO_PROFILES.values():
            if dp["role"] == role:
                return await cache_and_return(dp)
        res_dict = {"uid": token, "email": f"{role}@kgkite.ac.in", "name": f"Demo {role.capitalize()}", "role": role}
        return await cache_and_return(res_dict)

    # If the token does not look like a JWT (doesn't have two dots), try fallback DB query directly first
    if not isinstance(token, str) or token.count('.') != 2:
        try:
            profiles = await db_query("SELECT id, email, full_name, role FROM profiles WHERE id = ?", [token])
            if profiles:
                p = profiles[0]
                res_dict = {
                    "uid": p["id"],
                    "email": p["email"],
                    "name": p["full_name"],
                    "role": p["role"]
                }
                return await cache_and_return(res_dict)
        except Exception:
            pass

    # Verify standard Firebase JWT
    try:
        project_id = os.environ.get("VITE_FIREBASE_PROJECT_ID", "ei-hub-9a4a2")
        
        # Get unverified header to extract kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Missing kid in token header")
            
        cert_pem = await get_google_public_key(kid)
        
        from cryptography.x509 import load_pem_x509_certificate
        cert_obj = load_pem_x509_certificate(cert_pem.encode('utf-8'))
        public_key: Any = cert_obj.public_key()
        
        decoded = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )
        
        # Pull profile details from database if possible
        try:
            profile = await db_query("SELECT id, email, full_name, role FROM profiles WHERE firebase_uid = ?", [decoded.get("sub")])
            if profile:
                res_dict = {
                    "uid": profile[0]["id"],
                    "email": profile[0]["email"],
                    "name": profile[0]["full_name"],
                    "role": profile[0]["role"]
                }
                return await cache_and_return(res_dict)
        except Exception:
            pass
            
        res_dict = {
            "uid": decoded.get("sub"),
            "email": decoded.get("email"),
            "name": decoded.get("name", "User"),
            "role": "student"
        }
        return await cache_and_return(res_dict)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        # Fallback check inside profiles table for direct IDs
        try:
            profiles = await db_query("SELECT id, email, full_name, role FROM profiles WHERE id = ?", [token])
            if profiles:
                p = profiles[0]
                res_dict = {
                    "uid": p["id"],
                    "email": p["email"],
                    "name": p["full_name"],
                    "role": p["role"]
                }
                return await cache_and_return(res_dict)
        except Exception:
            pass
        raise HTTPException(status_code=401, detail=f"Invalid token signature: {str(e)}")
    except Exception as e:
        # Fallback check inside profiles table for direct IDs
        try:
            profiles = await db_query("SELECT id, email, full_name, role FROM profiles WHERE id = ?", [token])
            if profiles:
                p = profiles[0]
                res_dict = {
                    "uid": p["id"],
                    "email": p["email"],
                    "name": p["full_name"],
                    "role": p["role"]
                }
                return await cache_and_return(res_dict)
        except Exception:
            pass
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

# Row cleanup helper
def clean_row(table_name: str, row: dict) -> dict:
    if not row:
        return row
    cleaned = dict(row)
    if table_name == "profiles":
        if "is_active" in cleaned and cleaned["is_active"] is not None:
            cleaned["is_active"] = bool(cleaned["is_active"])
        if "email_verified" in cleaned and cleaned["email_verified"] is not None:
            cleaned["email_verified"] = bool(cleaned["email_verified"])
    elif table_name == "notifications":
        if "is_read" in cleaned and cleaned["is_read"] is not None:
            cleaned["is_read"] = bool(cleaned["is_read"])
    elif table_name == "activity_logs":
        if "details" in cleaned and isinstance(cleaned["details"], str):
            try:
                cleaned["details"] = json.loads(cleaned["details"])
            except Exception:
                pass
    return cleaned

# Brevo Email Dispatch Helper
async def send_brevo_email(to_email: str, subject: str, html_content: str, attachment: Optional[list] = None) -> bool:
    api_key = os.environ.get("VITE_BREVO_API_KEY")
    sender_email = os.environ.get("VITE_BREVO_SENDER_EMAIL", "eihubsoi@gmail.com")
    sender_name = os.environ.get("VITE_BREVO_SENDER_NAME", "EI HUB Support")
    
    if not api_key:
        print(f"[Brevo Fallback Dev Mode] To: {to_email} | Subject: {subject}")
        return True
        
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    if attachment:
        payload["attachment"] = attachment
        
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
            if response.status_code in [200, 201, 202]:
                print(f"Brevo email successfully sent to {to_email}")
                return True
            else:
                print(f"Brevo email failed ({response.status_code}): {response.text}")
                return False
    except Exception as e:
        print(f"Error calling Brevo: {e}")
        return False

# Audit log helper
async def log_activity(user_id: Optional[str], user_name: Optional[str], action: str, entity_type: str, entity_id: Optional[str], details: dict, severity: str = "info"):
    log_id = str(uuid.uuid4())
    details_str = json.dumps(details)
    sql = """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """
    await db_execute(sql, [log_id, user_id, user_name, action, entity_type, entity_id, details_str, severity, "127.0.0.1"])

# In-memory notifications storage
in_memory_notifications: List[dict] = []

# Notification helper
async def add_notification(user_id: str, title: str, message: str, type_str: str = "info", link_url: Optional[str] = None):
    notif_id = str(uuid.uuid4())
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    in_memory_notifications.append({
        "id": notif_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type_str,
        "is_read": False,
        "link_url": link_url,
        "created_at": created_at_iso
    })



# --- REST API ENDPOINTS ---

# Auth
class ResetLinkRequest(BaseModel):
    email: str

@app.post("/api/auth/reset-link")
async def get_firebase_reset_link(req: ResetLinkRequest):
    try:
        # Check if Firebase Admin is initialized
        if not firebase_admin._apps:
            raise HTTPException(status_code=500, detail="Firebase Admin SDK is not initialized. Please configure the service account.")
        
        # Verify the user exists in profiles database first
        profiles = await db_query("SELECT email FROM profiles WHERE email = ?", [req.email.lower().strip()])
        if not profiles:
            raise HTTPException(status_code=404, detail="This email is not registered in our database.")
        
        # Generate the password reset link
        redirect_url = os.environ.get("VITE_APP_URL", "http://localhost:3000/")
        action_code_settings = firebase_auth.ActionCodeSettings(
            url=redirect_url,
            handle_code_in_app=True
        )
        
        link = firebase_auth.generate_password_reset_link(req.email.lower().strip(), action_code_settings)
        return {"oobLink": link}
    except Exception as e:
        print(f"Error generating password reset link: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# 1. Components
@app.get("/api/components")
async def get_components(page: Optional[int] = None, limit: Optional[int] = None):
    cache_key = f"components_list_{page}_{limit}"
    
    # 1. First lock-free check
    cached = await COMPONENTS_CACHE.get(cache_key)
    if cached is not None:
        return cached
        
    async with COMPONENTS_CACHE_LOCK:
        # 2. Second check inside the lock
        cached = await COMPONENTS_CACHE.get(cache_key)
        if cached is not None:
            return cached
            
        if page is None or limit is None:
            rows = await db_query("SELECT * FROM components ORDER BY created_at DESC")
        else:
            offset = (page - 1) * limit
            rows = await db_query("SELECT * FROM components ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset])
            
        cleaned_rows = []
        for r in rows:
            c = dict(r)
            # Add frontend-specific virtual fields
            c["borrowed_stock"] = c["total_stock"] - c["available_stock"]
            c["sku"] = f"COMP-{c['id'][:4].upper()}"
            c["cabinet"] = c["location"].split(",")[0].strip() if c["location"] and "," in c["location"] else c["location"] or "Lab A"
            c["shelf"] = c["location"].split(",")[1].strip() if c["location"] and "," in c["location"] else "Shelf 1"
            c["unit_cost"] = 0
            cleaned_rows.append(c)
            
        await COMPONENTS_CACHE.set(cache_key, cleaned_rows)
        return cleaned_rows

@app.post("/api/components")
async def create_component(data: dict = Body(...), user: dict = Depends(get_current_user)):
    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Component name is required")
        
    # Prevent duplicate component name
    existing = await db_query("SELECT id FROM components WHERE LOWER(name) = ? LIMIT 1", [name.lower().strip()])
    if existing:
        raise HTTPException(status_code=400, detail="A component with this name already exists.")

    comp_id = str(uuid.uuid4())
    category = data.get("category")
    description = data.get("description", "")
    total_stock = int(data.get("total_stock", 0))
    available_stock = int(data.get("available_stock", total_stock))
    location = data.get("location", "Lab A, Shelf 1")
    image_url = data.get("image_url", "")
    unit = data.get("unit", "pcs")
    
    # Batch inserting component and logging activity into a single RTT
    db_client = await get_db_client()
    
    stmt1 = libsql_client.Statement(
        """
        INSERT INTO components (id, name, category, description, total_stock, available_stock, location, image_url, unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        [comp_id, name, category, description, total_stock, available_stock, location, image_url, unit]
    )
    
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"name": name, "qty": total_stock})
    stmt2 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [log_id, user["uid"], user["name"], "CREATE_COMPONENT", "COMPONENT", comp_id, details_str, "info", "127.0.0.1"]
    )
    
    await db_client.batch([stmt1, stmt2])
    
    await COMPONENTS_CACHE.clear()
    return {"id": comp_id, "name": name, "category": category, "total_stock": total_stock, "available_stock": available_stock}

@app.put("/api/components/{id}")
async def update_component(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    name = data.get("name")
    category = data.get("category")
    description = data.get("description", "")
    total_stock = int(data.get("total_stock", 0))
    available_stock = int(data.get("available_stock", total_stock))
    location = data.get("location", "Lab A, Shelf 1")
    image_url = data.get("image_url", "")
    
    db_client = await get_db_client()
    
    stmt1 = libsql_client.Statement(
        """
        UPDATE components
        SET name = ?, category = ?, description = ?, total_stock = ?, available_stock = ?, location = ?, image_url = ?, updated_at = datetime('now')
        WHERE id = ?
        """,
        [name, category, description, total_stock, available_stock, location, image_url, id]
    )
    
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"name": name, "qty": total_stock})
    stmt2 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [log_id, user["uid"], user["name"], "UPDATE_COMPONENT", "COMPONENT", id, details_str, "info", "127.0.0.1"]
    )
    
    await db_client.batch([stmt1, stmt2])
    
    await COMPONENTS_CACHE.clear()
    return {"id": id, "name": name, "category": category}

@app.delete("/api/components/{id}")
async def delete_component(id: str, user: dict = Depends(get_current_user)):
    # Fetch component details first
    comps = await db_query("SELECT name FROM components WHERE id = ?", [id])
    name = comps[0]["name"] if comps else "Unknown"
    
    db_client = await get_db_client()
    
    stmt1 = libsql_client.Statement("DELETE FROM components WHERE id = ?", [id])
    
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"name": name})
    stmt2 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [log_id, user["uid"], user["name"], "DELETE_COMPONENT", "COMPONENT", id, details_str, "info", "127.0.0.1"]
    )
    
    await db_client.batch([stmt1, stmt2])
    
    await COMPONENTS_CACHE.clear()
    return {"id": id, "status": "deleted"}


# 2. Borrow Requests
@app.get("/api/requests")
async def get_requests(page: Optional[int] = None, limit: Optional[int] = None):
    cache_key = f"requests_list_{page}_{limit}"
    
    # 1. Lock-free cache check
    cached = await REQUESTS_CACHE.get(cache_key)
    if cached is not None:
        return cached
        
    async with REQUESTS_CACHE_LOCK:
        # 2. Double check inside lock
        cached = await REQUESTS_CACHE.get(cache_key)
        if cached is not None:
            return cached
            
        if page is None or limit is None:
            sql = """
                SELECT r.*, 
                       s.full_name as student_name, s.register_number as student_register_no, s.email as student_email,
                       a.full_name as approver_name,
                       c.name as component_name, c.category as component_category, c.image_url as component_image
                FROM requests r
                LEFT JOIN profiles s ON r.student_id = s.id
                LEFT JOIN profiles a ON r.reviewed_by = a.id
                LEFT JOIN components c ON r.component_id = c.id
                ORDER BY r.requested_at DESC
            """
            rows = await db_query(sql)
        else:
            offset = (page - 1) * limit
            sql = """
                SELECT r.*, 
                       s.full_name as student_name, s.register_number as student_register_no, s.email as student_email,
                       a.full_name as approver_name,
                       c.name as component_name, c.category as component_category, c.image_url as component_image
                FROM requests r
                LEFT JOIN profiles s ON r.student_id = s.id
                LEFT JOIN profiles a ON r.reviewed_by = a.id
                LEFT JOIN components c ON r.component_id = c.id
                ORDER BY r.requested_at DESC
                LIMIT ? OFFSET ?
            """
            rows = await db_query(sql, [limit, offset])
            
        cleaned_rows = []
        for r in rows:
            req = dict(r)
            
            # Reconstruct custom fields formatted in reject_reason string for returned conditions
            reject_reason = req.get("reject_reason") or ""
            parsed_condition = "Good / Fully Functional"
            parsed_description = ""
            parsed_missing = ""
            parsed_damaged = ""
            parsed_remarks = ""
            
            if reject_reason.startswith("Condition reported by student:"):
                parts = reject_reason.split(" | ")
                for part in parts:
                    if part.startswith("Condition reported by student:"):
                        parsed_condition = part.replace("Condition reported by student:", "").strip()
                    elif part.startswith("Description:"):
                        parsed_description = part.replace("Description:", "").strip()
                    elif part.startswith("Missing:"):
                        parsed_missing = part.replace("Missing:", "").strip()
                    elif part.startswith("Damaged:"):
                        parsed_damaged = part.replace("Damaged:", "").strip()
                    elif part.startswith("Remarks:"):
                        parsed_remarks = part.replace("Remarks:", "").strip()

            # Add virtual fields for frontend compatibility
            req["request_code"] = f"REQ-{req['id'][:8].upper()}"
            req["approved_by"] = req["reviewed_by"]
            req["approved_by_name"] = req["approver_name"] or "Prof. Robert Chen"
            req["rejection_reason"] = req["reject_reason"] or ""
            req["approved_at"] = req["reviewed_at"]
            # Calculate expected_return_at dynamically
            notes_str = req.get("notes") or ""
            to_date_val = None
            if "To Date:" in notes_str:
                for line in notes_str.split("\n"):
                    if line.startswith("To Date:"):
                        to_date_val = line.replace("To Date:", "").strip()
                        break
            
            expected_return_at = None
            if to_date_val:
                try:
                    # Convert to standard ISO timestamp format expected by frontend
                    expected_return_at = f"{to_date_val}T17:00:00.000Z"
                except Exception:
                    pass
            
            if not expected_return_at:
                try:
                    req_at_str = req.get("requested_at")
                    clean_req_at = req_at_str.replace("Z", "") if req_at_str else datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
                    req_dt = datetime.fromisoformat(clean_req_at)
                    expected_return_at = (req_dt + timedelta(days=14)).isoformat() + "Z"
                except Exception:
                    expected_return_at = req.get("requested_at")
            
            req["expected_return_at"] = expected_return_at
            req["return_condition"] = parsed_condition
            req["return_description"] = parsed_description
            req["return_missing_details"] = parsed_missing
            req["return_damaged_details"] = parsed_damaged
            req["return_remarks"] = parsed_remarks
            req["created_at"] = req["requested_at"]
            req["purpose"] = req.get("notes") or ""
            cleaned_rows.append(req)
            
        await REQUESTS_CACHE.set(cache_key, cleaned_rows)
        return cleaned_rows

@app.post("/api/requests/submit")
async def submit_request(data: dict = Body(...), user: dict = Depends(get_current_user)):
    req_id = str(uuid.uuid4())
    student_id = data.get("student_id")
    component_id = data.get("component_id")
    if not isinstance(student_id, str) or not isinstance(component_id, str):
        raise HTTPException(status_code=400, detail="student_id and component_id must be strings")
    quantity = int(data.get("quantity", 1))
    purpose = data.get("notes", "Lab Experimentation")
    
    # 1. Batch SELECT queries (Component stock, Duplicate request check, Faculty list, Student email)
    db_client = await get_db_client()
    results = await db_client.batch([
        libsql_client.Statement("SELECT name, available_stock FROM components WHERE id = ?", [component_id]),
        libsql_client.Statement("SELECT id FROM requests WHERE student_id = ? AND component_id = ? AND status = 'pending' LIMIT 1", [student_id, component_id]),
        libsql_client.Statement("SELECT id, role FROM profiles WHERE role = 'faculty' OR role = 'admin'"),
        libsql_client.Statement("SELECT email FROM profiles WHERE id = ?", [student_id])
    ])
    
    comp_rows = results[0].rows
    duplicate_rows = results[1].rows
    faculty_rows = results[2].rows
    student_rows = results[3].rows
    
    if not comp_rows:
        raise HTTPException(status_code=404, detail="Component not found")
    comp_name = comp_rows[0][0]
    available_stock = comp_rows[0][1]
    
    if duplicate_rows:
        raise HTTPException(status_code=400, detail="You already have a pending request for this component.")
        
    if available_stock < quantity:
        raise HTTPException(status_code=400, detail=f"Cannot submit request: insufficient stock (only {available_stock} available)")
        
    req_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    req_code = f"REQ-{req_id[:8].upper()}"
    
    # 2. Batch INSERT queries (Submit request, Log activity, App notifications)
    stmts = []
    
    # Insert Request
    stmts.append(libsql_client.Statement(
        """
        INSERT INTO requests (id, student_id, component_id, quantity, status, notes, requested_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
        """,
        [req_id, student_id, component_id, quantity, purpose, req_at]
    ))
    
    # Log Activity
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"code": req_code, "component": comp_name, "qty": quantity})
    stmts.append(libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [log_id, student_id, user["name"], "SUBMIT_REQUEST", "REQUEST", req_id, details_str, "info", "127.0.0.1"]
    ))
    
    await db_client.batch(stmts)
    
    # Add to in-memory notifications
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    in_memory_notifications.append({
        "id": str(uuid.uuid4()),
        "user_id": student_id,
        "title": "Request Received",
        "message": f"Your request for {quantity}x {comp_name} has been submitted for faculty approval.",
        "type": "info",
        "is_read": False,
        "link_url": "/student/requests",
        "created_at": created_at_iso
    })
    for r in faculty_rows:
        f_id = r[0]
        f_role = r[1]
        link = "/admin/pending-requests" if f_role == "admin" else "/faculty/pending-requests"
        in_memory_notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": f_id,
            "title": "New Borrow Request",
            "message": f"Student {user['name']} has requested {quantity}x {comp_name} ({req_code}).",
            "type": "info",
            "is_read": False,
            "link_url": link,
            "created_at": created_at_iso
        })
    
    # Dispatch email asynchronously using email queue
    student_email = student_rows[0][0] if student_rows and student_rows[0][0] else None
    if student_email:
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; margin-top: 0; font-size: 22px;">Request Pending</h2>
          <p>Your request to borrow <strong>{quantity}x {comp_name}</strong> has been logged in our system and is pending faculty authorization.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
            <p><strong>Request Code:</strong> {req_code}</p>
            <p><strong>Purpose:</strong> {purpose}</p>
          </div>
        </div>
        """
        await EMAIL_QUEUE.put((student_email, f"EI HUB - Borrowing Request Pending ({req_code})", html, None))
        
    await REQUESTS_CACHE.clear()
    return {"id": req_id, "status": "pending"}

@app.post("/api/requests/{id}/approve")
async def approve_request(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    faculty_id = data.get("reviewed_by")
    remark = data.get("notes", "")
    pdf_base64 = data.get("pdf_base64")
    
    # 1. Fetch request details to verify state and get meta info
    reqs = await db_query("""
        SELECT r.*, c.name as component_name, c.available_stock, s.email as student_email, s.full_name as student_name
        FROM requests r
        JOIN components c ON r.component_id = c.id
        JOIN profiles s ON r.student_id = s.id
        WHERE r.id = ?
    """, [id])
    if not reqs:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req = reqs[0]
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")
        
    if req["available_stock"] < req["quantity"]:
        raise HTTPException(status_code=400, detail="Cannot approve: stock depleted")
        
    app_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    req_code = f"REQ-{id[:8].upper()}"
    
    # Generate UUIDs for log and notifications
    log_id = str(uuid.uuid4())
    notif_id = str(uuid.uuid4())
    details_str = json.dumps({"code": req_code, "component": req["component_name"], "remark": remark})
    
    # 2. Prepare the batch updates (safe, transactional check-and-update)
    stmt1 = libsql_client.Statement(
        """
        UPDATE requests 
        SET status = 'approved', reviewed_by = ?, reviewed_at = ?, reject_reason = ?
        WHERE id = ? AND status = 'pending' AND (
            SELECT available_stock FROM components WHERE id = requests.component_id
        ) >= quantity
        """,
        [faculty_id, app_at, remark, id]
    )
    
    stmt2 = libsql_client.Statement(
        """
        UPDATE components 
        SET available_stock = available_stock - ?, updated_at = datetime('now') 
        WHERE id = ? AND EXISTS (
            SELECT 1 FROM requests WHERE id = ? AND status = 'approved' AND reviewed_at = ?
        )
        """,
        [req["quantity"], req["component_id"], id, app_at]
    )
    
    stmt3 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
            SELECT 1 FROM requests WHERE id = ? AND status = 'approved' AND reviewed_at = ?
        )
        """,
        [log_id, faculty_id, user["name"], "APPROVE_REQUEST", "REQUEST", id, details_str, "info", "127.0.0.1", id, app_at]
    )
    
    db_client = await get_db_client()
    results = await db_client.batch([stmt1, stmt2, stmt3])
    
    if results[0].rows_affected == 0:
        raise HTTPException(status_code=400, detail="Cannot approve: stock depleted or request state changed concurrently")
        
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    in_memory_notifications.append({
        "id": notif_id,
        "user_id": req["student_id"],
        "title": "Request Approved!",
        "message": f"Your request for {req['quantity']}x {req['component_name']} has been approved.",
        "type": "success",
        "is_read": False,
        "link_url": "/student/requests",
        "created_at": created_at_iso
    })
        
    await REQUESTS_CACHE.clear()
    await COMPONENTS_CACHE.clear()
    return {"id": id, "status": "approved"}

@app.post("/api/requests/{id}/reject")
async def reject_request(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    faculty_id = data.get("reviewed_by")
    reason = data.get("reject_reason", "No reason specified")
    
    reqs = await db_query("""
        SELECT r.*, c.name as component_name, s.email as student_email, s.full_name as student_name
        FROM requests r
        JOIN components c ON r.component_id = c.id
        JOIN profiles s ON r.student_id = s.id
        WHERE r.id = ?
    """, [id])
    if not reqs:
        raise HTTPException(status_code=404, detail="Request not found")
    req = reqs[0]
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")
        
    rej_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    req_code = f"REQ-{id[:8].upper()}"
    
    log_id = str(uuid.uuid4())
    notif_id = str(uuid.uuid4())
    details_str = json.dumps({"code": req_code, "component": req["component_name"], "reason": reason})
    
    stmt1 = libsql_client.Statement(
        """
        UPDATE requests 
        SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ?
        WHERE id = ? AND status = 'pending'
        """,
        [faculty_id, rej_at, reason, id]
    )
    
    stmt2 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
            SELECT 1 FROM requests WHERE id = ? AND status = 'rejected' AND reviewed_at = ?
        )
        """,
        [log_id, faculty_id, user["name"], "REJECT_REQUEST", "REQUEST", id, details_str, "info", "127.0.0.1", id, rej_at]
    )
    
    db_client = await get_db_client()
    results = await db_client.batch([stmt1, stmt2])
    
    if results[0].rows_affected == 0:
        raise HTTPException(status_code=400, detail="Cannot reject: request state changed concurrently")
        
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    in_memory_notifications.append({
        "id": notif_id,
        "user_id": req["student_id"],
        "title": "Request Rejected",
        "message": f"Your request for {req['quantity']}x {req['component_name']} was rejected. Reason: {reason}",
        "type": "danger",
        "is_read": False,
        "link_url": "/student/requests",
        "created_at": created_at_iso
    })
        
    await REQUESTS_CACHE.clear()
    return {"id": id, "status": "rejected"}

@app.post("/api/requests/{id}/return-request")
async def request_return(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    student_id = data.get("student_id")
    condition = data.get("condition", "Good / Fully Functional")
    description = data.get("description", "")
    
    # 1. Fetch details
    reqs = await db_query("""
        SELECT r.quantity, r.status, c.name FROM requests r 
        JOIN components c ON r.component_id = c.id 
        WHERE r.id = ?
    """, [id])
    if not reqs:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req = reqs[0]
    if req["status"] == "returned":
        raise HTTPException(status_code=400, detail="Component has already been returned")
        
    comp_name = req["name"]
    qty = req["quantity"]
    req_code = f"REQ-{id[:8].upper()}"
    
    # Format return condition into reject_reason string for backward compatibility
    formatted_condition = f"Condition reported by student: {condition} | Description: {description} | Missing:  | Damaged:  | Remarks: "
    ret_req_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    
    # 2. Fetch faculty profiles to notify
    faculty = await db_query("SELECT id FROM profiles WHERE role = 'faculty' OR role = 'admin'")
    
    stmts = []
    # Statement 1: Update requests return info
    stmt1 = libsql_client.Statement(
        """
        UPDATE requests
        SET return_requested_at = ?, reject_reason = ?
        WHERE id = ? AND status != 'returned'
        """,
        [ret_req_at, formatted_condition, id]
    )
    stmts.append(stmt1)
    
    # Statement 2: Insert activity log (conditional)
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"code": req_code, "component": comp_name, "qty": qty})
    stmt2 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
            SELECT 1 FROM requests WHERE id = ? AND return_requested_at = ?
        )
        """,
        [log_id, student_id, user["name"], "REQUEST_RETURN", "REQUEST", id, details_str, "info", "127.0.0.1", id, ret_req_at]
    )
    stmts.append(stmt2)
    
    db_client = await get_db_client()
    results = await db_client.batch(stmts)
    
    if results[0].rows_affected == 0:
        raise HTTPException(status_code=400, detail="Cannot request return: state changed concurrently")
        
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    for f in faculty:
        in_memory_notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": f["id"],
            "title": "Return Approval Pending",
            "message": f"Student {user['name']} has requested to return {qty}x {comp_name}.",
            "type": "warning",
            "is_read": False,
            "link_url": "/faculty/returns",
            "created_at": created_at_iso
        })
        
    await REQUESTS_CACHE.clear()
    return {"id": id, "status": "return_pending"}

@app.post("/api/requests/{id}/return-process")
async def process_return(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    faculty_id = data.get("reviewed_by")
    status = data.get("status", "returned") # "returned" or "overdue"
    condition = data.get("condition", "Good")
    remarks = data.get("remarks", "")
    missing_details = data.get("missing_details", "")
    damaged_details = data.get("damaged_details", "")
    
    # 1. Fetch details
    reqs = await db_query("""
        SELECT r.*, c.name as component_name, c.total_stock, c.available_stock, s.email as student_email, s.full_name as student_name
        FROM requests r
        JOIN components c ON r.component_id = c.id
        JOIN profiles s ON r.student_id = s.id
        WHERE r.id = ?
    """, [id])
    if not reqs:
        raise HTTPException(status_code=404, detail="Request not found")
    req = reqs[0]
    
    if req["status"] == "returned":
        raise HTTPException(status_code=400, detail="Request is already processed as returned")
        
    formatted_remarks = f"Condition reported by student: {condition} | Description: Returned | Missing: {missing_details} | Damaged: {damaged_details} | Remarks: {remarks}"
    ret_at = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    req_code = f"REQ-{id[:8].upper()}"
    
    log_id = str(uuid.uuid4())
    notif_id = str(uuid.uuid4())
    details_str = json.dumps({"code": req_code, "component": req["component_name"], "status": status, "condition": condition})
    
    # 2. Batch updates
    stmts = []
    # Update request
    stmt1 = libsql_client.Statement(
        """
        UPDATE requests
        SET status = 'returned', returned_at = ?, return_reviewed_by = ?, reject_reason = ?
        WHERE id = ? AND status != 'returned'
        """,
        [ret_at, faculty_id, formatted_remarks, id]
    )
    stmts.append(stmt1)
    
    if status == "returned":
        # Increment component stock, up to total_stock
        stmt2 = libsql_client.Statement(
            """
            UPDATE components
            SET available_stock = MIN(total_stock, available_stock + ?), updated_at = datetime('now')
            WHERE id = ? AND EXISTS (
                SELECT 1 FROM requests WHERE id = ? AND status = 'returned' AND returned_at = ?
            )
            """,
            [req["quantity"], req["component_id"], id, ret_at]
        )
        stmts.append(stmt2)
        
    # Log activity (conditional)
    stmt3 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
        WHERE EXISTS (
            SELECT 1 FROM requests WHERE id = ? AND status = 'returned' AND returned_at = ?
        )
        """,
        [log_id, faculty_id, user["name"], "PROCESS_RETURN", "REQUEST", id, details_str, "info", "127.0.0.1", id, ret_at]
    )
    stmts.append(stmt3)
    
    db_client = await get_db_client()
    results = await db_client.batch(stmts)
    
    if results[0].rows_affected == 0:
        raise HTTPException(status_code=400, detail="Cannot process return: state changed concurrently")
        
    created_at_iso = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
    in_memory_notifications.append({
        "id": notif_id,
        "user_id": req["student_id"],
        "title": "Return Verified!",
        "message": f"Your return of {req['quantity']}x {req['component_name']} has been processed.",
        "type": "info",
        "is_read": False,
        "link_url": "/student/requests",
        "created_at": created_at_iso
    })
        
    # Queue email asynchronously
    if req["student_email"]:
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #6366f1; text-align: center; margin-top: 0; font-size: 22px;">Component Return Processed</h2>
          <p>Dear {req['student_name']},</p>
          <p>Your return of <strong>{req['quantity']}x {req['component_name']}</strong> has been successfully processed and verified.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; font-size: 13px;">
            <p><strong>Return Condition:</strong> {condition}</p>
            <p><strong>Remarks:</strong> {remarks or 'None'}</p>
          </div>
        </div>
        """
        await EMAIL_QUEUE.put((req["student_email"], f"EI HUB - Return Verified ({req_code})", html, None))
        
    await REQUESTS_CACHE.clear()
    await COMPONENTS_CACHE.clear()
    return {"id": id, "status": "returned"}


# 3. Profiles
@app.get("/api/profiles")
async def get_profiles():
    rows = await db_query("SELECT * FROM profiles ORDER BY created_at DESC")
    return [clean_row("profiles", r) for r in rows]

@app.post("/api/profiles/sync")
async def sync_profile(data: dict = Body(...), user: dict = Depends(get_current_user)):
    profile_id = data.get("id")
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")
    full_name = data.get("full_name", "User")
    role = data.get("role", "student")
    department = data.get("department", "ECE")
    phone = data.get("phone", "")
    register_number = data.get("register_number")
    avatar_url = data.get("avatar_url")
    faculty_id = data.get("faculty_id")
    roll_number = data.get("roll_number")
    institution = data.get("institution", "KITE")
    password = data.get("password")
    year_of_study = data.get("year_of_study")
    
    # Check if profile already exists in Turso
    existing = await db_query("SELECT id FROM profiles WHERE id = ? OR email = ?", [profile_id, email])
    if existing:
        # Update existing profile
        sql = """
            UPDATE profiles
            SET firebase_uid = ?, full_name = ?, role = ?, department = ?, phone = ?, register_number = ?, avatar_url = ?, faculty_id = ?, roll_number = ?, institution = ?, password = COALESCE(?, password), year_of_study = COALESCE(?, year_of_study), updated_at = datetime('now')
            WHERE id = ?
        """
        await db_execute(sql, [firebase_uid, full_name, role, department, phone, register_number, avatar_url, faculty_id, roll_number, institution, password, year_of_study, existing[0]["id"]])
        profile_id = existing[0]["id"]
    else:
        # Insert new profile
        sql = """
            INSERT INTO profiles (id, firebase_uid, email, full_name, role, department, phone, register_number, avatar_url, created_at, updated_at, is_active, faculty_id, roll_number, institution, password, year_of_study)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, ?, ?, ?, ?, ?)
        """
        await db_execute(sql, [profile_id, firebase_uid, email, full_name, role, department, phone, register_number, avatar_url, faculty_id, roll_number, institution, password, year_of_study])
        
        # Log activity
        await log_activity(profile_id, full_name, "SYNC_PROFILE", "PROFILE", profile_id, {"email": email, "role": role})

    # Invalidate profile cache
    await USER_PROFILE_CACHE.clear()

    # Retrieve and return updated profile
    updated = await db_query("SELECT * FROM profiles WHERE id = ?", [profile_id])
    return clean_row("profiles", updated[0]) if updated else None

@app.put("/api/profiles/{id}")
async def update_profile(id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    full_name = data.get("full_name")
    department = data.get("department")
    phone = data.get("phone")
    register_number = data.get("register_number")
    avatar_url = data.get("avatar_url")
    is_active = 1 if data.get("is_active", True) else 0
    role = data.get("role")
    
    # Fetch current profile to compile SQL dynamically
    current = await db_query("SELECT * FROM profiles WHERE id = ?", [id])
    if not current:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    c = current[0]
    
    sql = """
        UPDATE profiles
        SET full_name = ?, department = ?, phone = ?, register_number = ?, avatar_url = ?, is_active = ?, role = ?, updated_at = datetime('now')
        WHERE id = ?
    """
    await db_execute(sql, [
        full_name or c["full_name"],
        department or c["department"],
        phone or c["phone"],
        register_number or c["register_number"],
        avatar_url or c["avatar_url"],
        is_active,
        role or c["role"],
        id
    ])
    
    # Invalidate profile cache
    await USER_PROFILE_CACHE.clear()
    
    await log_activity(user["uid"], user["name"], "UPDATE_PROFILE", "PROFILE", id, {"profile_id": id})
    
    updated = await db_query("SELECT * FROM profiles WHERE id = ?", [id])
    return clean_row("profiles", updated[0])

@app.delete("/api/profiles/{id}")
async def delete_profile(id: str, user: dict = Depends(get_current_user)):
    # 1. Fetch profile to get email and firebase_uid
    p = await db_query("SELECT email, firebase_uid FROM profiles WHERE id = ?", [id])
    email = p[0]["email"] if p else None
    firebase_uid = p[0]["firebase_uid"] if p else None
    
    # 2. Delete credentials from _auth_users table if exists
    if email:
        await db_execute("DELETE FROM _auth_users WHERE email = ?", [email.lower().strip()])
        
    # 3. Delete profile row
    await db_execute("DELETE FROM profiles WHERE id = ?", [id])
    
    # 4. Delete from Firebase Authentication and Firestore if Firebase Admin is initialized
    if firebase_admin._apps:
        # Delete from Firebase Auth by UID (using firebase_uid or profile id as fallback)
        uid_to_delete = firebase_uid or id
        if uid_to_delete:
            try:
                firebase_auth.delete_user(uid_to_delete)
                print(f"[Firebase Auth] Successfully deleted user with UID: {uid_to_delete}")
            except Exception as fb_err:
                print(f"[Firebase Auth] Error deleting user by UID {uid_to_delete}: {fb_err}")
        
        # Fallback: Delete from Firebase Auth by Email (if UID delete didn't run or fail)
        if email:
            try:
                try:
                    fb_user = firebase_auth.get_user_by_email(email.lower().strip())
                    firebase_auth.delete_user(fb_user.uid)
                    print(f"[Firebase Auth] Successfully deleted user by email: {email}")
                except firebase_auth.UserNotFoundError:
                    pass
            except Exception as fb_err:
                print(f"[Firebase Auth] Error deleting user by email {email}: {fb_err}")
                
        # Delete from Firebase Firestore
        try:
            from firebase_admin import firestore
            fs_client = firestore.client()
            fs_client.collection("profiles").document(id).delete()
            print(f"[Firebase Firestore] Deleted document for profile: {id}")
        except Exception as fs_err:
            print(f"[Firebase Firestore] Error deleting document {id} from Firestore: {fs_err}")
            
    # Invalidate profile cache
    await USER_PROFILE_CACHE.clear()
    
    await log_activity(user["uid"], user["name"], "DELETE_PROFILE", "PROFILE", id, {"deleted_id": id, "email": email})
    
    return {"id": id, "status": "deleted"}


# 4. Activity Logs
@app.get("/api/activity-logs")
async def get_activity_logs():
    rows = await db_query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100")
    return [clean_row("activity_logs", r) for r in rows]

@app.post("/api/activity-logs")
async def create_activity_log(data: dict = Body(...), user: dict = Depends(get_current_user)):
    action = data.get("action")
    entity_type = data.get("entity_type")
    if not isinstance(action, str) or not isinstance(entity_type, str):
        raise HTTPException(status_code=400, detail="action and entity_type must be strings")
    entity_id = data.get("entity_id")
    details = data.get("details", {})
    severity = data.get("severity", "info")
    
    await log_activity(user["uid"], user["name"], action, entity_type, entity_id, details, severity)
    return {"status": "success"}


# 5. Notifications
@app.get("/api/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    user_id = user["uid"]
    # Filter notifications for this user, sorted by created_at DESC
    user_notifs = [n for n in in_memory_notifications if n["user_id"] == user_id]
    user_notifs.sort(key=lambda x: x["created_at"], reverse=True)
    return user_notifs

@app.put("/api/notifications/{id}/read")
async def mark_notification_read(id: str, user: dict = Depends(get_current_user)):
    for n in in_memory_notifications:
        if n["id"] == id:
            n["is_read"] = True
            break
    return {"status": "success"}

@app.put("/api/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    user_id = user["uid"]
    for n in in_memory_notifications:
        if n["user_id"] == user_id:
            n["is_read"] = True
    return {"status": "success"}


# 6. Purchase Orders
@app.get("/api/purchase-orders")
async def get_purchase_orders():
    rows = await db_query("SELECT * FROM purchase_orders ORDER BY created_at DESC")
    return rows

@app.post("/api/purchase-orders")
async def create_purchase_order(data: dict = Body(...), user: dict = Depends(get_current_user)):
    po_id = str(uuid.uuid4())
    po_number = f"PO-2026-{uuid.uuid4().hex[:4].upper()}"
    supplier_name = data.get("supplier_name")
    component_id = data.get("component_id")
    component_name = data.get("component_name")
    if not isinstance(component_name, str):
        raise HTTPException(status_code=400, detail="component_name must be a string")
    component_category = data.get("component_category", "Microcontrollers")
    quantity = int(data.get("quantity", 0))
    unit_cost = float(data.get("unit_cost", 0.0))
    total_cost = quantity * unit_cost
    purchased_by = data.get("purchased_by")
    purchased_by_name = data.get("purchased_by_name")
    invoice_ref = data.get("invoice_ref", "")
    cabinet = data.get("cabinet", "Lab A")
    shelf = data.get("shelf", "Shelf 1")
    
    # Prevent duplicate purchase order using invoice reference if provided
    if invoice_ref:
        existing_po = await db_query("SELECT id FROM purchase_orders WHERE invoice_ref = ? LIMIT 1", [invoice_ref])
        if existing_po:
            raise HTTPException(status_code=400, detail="A purchase order with this invoice reference already exists.")
            
    # 1. Fetch matching component to choose write path
    comps = []
    if component_id:
        comps = await db_query("SELECT id, total_stock, available_stock FROM components WHERE id = ?", [component_id])
    if not comps:
        comps = await db_query("SELECT id, total_stock, available_stock FROM components WHERE LOWER(name) = ?", [component_name.lower().strip()])
        
    stmts = []
    
    # 2. Statement 1: Insert Purchase Order
    stmt1 = libsql_client.Statement(
        """
        INSERT INTO purchase_orders (id, po_number, supplier_name, component_id, component_name, component_category, quantity, unit_cost, total_cost, purchased_by, purchased_by_name, invoice_ref, cabinet, shelf, status, purchased_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered', datetime('now'), datetime('now'))
        """,
        [po_id, po_number, supplier_name, component_id, component_name, component_category, quantity, unit_cost, total_cost, purchased_by, purchased_by_name, invoice_ref, cabinet, shelf]
    )
    stmts.append(stmt1)
    
    if comps:
        # Statement 2: Update existing component stock
        comp = comps[0]
        new_tot = comp["total_stock"] + quantity
        new_avail = comp["available_stock"] + quantity
        stmt2 = libsql_client.Statement(
            """
            UPDATE components 
            SET total_stock = ?, available_stock = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            [new_tot, new_avail, comp["id"]]
        )
        stmts.append(stmt2)
    else:
        # Statement 2: Create a new component
        new_comp_id = component_id or str(uuid.uuid4())
        stmt2 = libsql_client.Statement(
            """
            INSERT INTO components (id, name, category, description, total_stock, available_stock, location, image_url, unit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?w=400', 'pcs', datetime('now'), datetime('now'))
            """,
            [new_comp_id, component_name, component_category, f"Procured from {supplier_name}", quantity, quantity, f"{cabinet}, {shelf}"]
        )
        stmts.append(stmt2)
        
    # Statement 3: Log activity
    log_id = str(uuid.uuid4())
    details_str = json.dumps({"po": po_number, "supplier": supplier_name, "component": component_name, "qty": quantity, "amount": total_cost})
    stmt3 = libsql_client.Statement(
        """
        INSERT INTO activity_logs (id, user_id, user_name, action, entity_type, entity_id, details, severity, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [log_id, user["uid"], user["name"], "PURCHASE_STOCK", "COMPONENT", po_id, details_str, "info", "127.0.0.1"]
    )
    stmts.append(stmt3)
    
    db_client = await get_db_client()
    await db_client.batch(stmts)
    
    await COMPONENTS_CACHE.clear()
    return {"id": po_id, "po_number": po_number}

@app.put("/api/purchase-orders/{po_id}")
async def update_purchase_order(po_id: str, data: dict = Body(...), user: dict = Depends(get_current_user)):
    # 1. Fetch existing PO
    pos = await db_query("SELECT * FROM purchase_orders WHERE id = ?", [po_id])
    if not pos:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po = pos[0]
    
    supplier_name = data.get("supplier_name", po["supplier_name"])
    raw_qty = data.get("quantity")
    new_quantity = int(raw_qty) if raw_qty is not None else int(po["quantity"])
    raw_cost = data.get("unit_cost")
    unit_cost = float(raw_cost) if raw_cost is not None else float(po["unit_cost"])
    total_cost = new_quantity * unit_cost
    invoice_ref = data.get("invoice_ref", po["invoice_ref"])
    cabinet = data.get("cabinet", po["cabinet"])
    shelf = data.get("shelf", po["shelf"])
    component_id = po["component_id"]
    quantity_diff = new_quantity - po["quantity"]
    
    stmts = []
    # Update PO statement
    stmt1 = libsql_client.Statement(
        """
        UPDATE purchase_orders
        SET supplier_name = ?, quantity = ?, unit_cost = ?, total_cost = ?, invoice_ref = ?, cabinet = ?, shelf = ?, updated_at = datetime('now')
        WHERE id = ?
        """,
        [supplier_name, new_quantity, unit_cost, total_cost, invoice_ref, cabinet, shelf, po_id]
    )
    stmts.append(stmt1)
    
    if component_id:
        comps = await db_query("SELECT id, total_stock, available_stock FROM components WHERE id = ?", [component_id])
        if comps:
            comp = comps[0]
            new_tot = max(0, comp["total_stock"] + quantity_diff)
            new_avail = max(0, comp["available_stock"] + quantity_diff)
            stmt2 = libsql_client.Statement(
                """
                UPDATE components
                SET total_stock = ?, available_stock = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [new_tot, new_avail, component_id]
            )
            stmts.append(stmt2)
            
    db_client = await get_db_client()
    await db_client.batch(stmts)
    await COMPONENTS_CACHE.clear()
    return {"status": "success"}

@app.delete("/api/purchase-orders/{po_id}")
async def delete_purchase_order(po_id: str, user: dict = Depends(get_current_user)):
    pos = await db_query("SELECT * FROM purchase_orders WHERE id = ?", [po_id])
    if not pos:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po = pos[0]
    
    component_id = po["component_id"]
    quantity = po["quantity"]
    
    stmts = []
    stmt1 = libsql_client.Statement(
        "DELETE FROM purchase_orders WHERE id = ?",
        [po_id]
    )
    stmts.append(stmt1)
    
    if component_id:
        comps = await db_query("SELECT id, total_stock, available_stock FROM components WHERE id = ?", [component_id])
        if comps:
            comp = comps[0]
            new_tot = max(0, comp["total_stock"] - quantity)
            new_avail = max(0, comp["available_stock"] - quantity)
            stmt2 = libsql_client.Statement(
                """
                UPDATE components
                SET total_stock = ?, available_stock = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                [new_tot, new_avail, component_id]
            )
            stmts.append(stmt2)
            
    db_client = await get_db_client()
    await db_client.batch(stmts)
    await COMPONENTS_CACHE.clear()
    return {"status": "success"}


# 7. Consolidated Deadline Alert Cron Endpoint
@app.post("/api/cron/check-reminders")
async def check_reminders():
    # Fetch all approved and unreturned borrow requests
    active_loans = await db_query("""
        SELECT r.*, c.name as component_name, s.email as student_email, s.full_name as student_name
        FROM requests r
        JOIN components c ON r.component_id = c.id
        JOIN profiles s ON r.student_id = s.id
        WHERE r.status = 'approved' AND r.returned_at IS NULL
    """)
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    approaching = {}
    
    for r in active_loans:
        try:
            req_date = datetime.fromisoformat(r["requested_at"].replace("Z", ""))
        except Exception:
            continue
            
        # Calculate expected return date from "To Date:" in notes field, fallback to 14 days
        notes_str = r.get("notes") or ""
        to_date_val = None
        if "To Date:" in notes_str:
            for line in notes_str.split("\n"):
                if line.startswith("To Date:"):
                    to_date_val = line.replace("To Date:", "").strip()
                    break
        
        expected_return_date = None
        if to_date_val:
            try:
                expected_return_date = datetime.fromisoformat(to_date_val)
            except Exception:
                pass
                
        if not expected_return_date:
            expected_return_date = req_date + timedelta(days=14)
            
        # Skip if the total borrow duration was only 1 day or less
        borrow_duration = (expected_return_date.date() - req_date.date()).days
        if borrow_duration <= 1:
            continue
            
        # Send warning exactly 3 days before deadline
        days_remaining = (expected_return_date.date() - now.date()).days
        if days_remaining != 3:
            continue
        # If it has been borrowed for a while (e.g. 7 days or more) or is approaching deadline
        # Let's group them by student email to consolidate
        email = r["student_email"]
        if email and email != "N/A" and "@" in email:
            if email not in approaching:
                approaching[email] = {
                    "student_name": r["student_name"],
                    "student_id": r["student_id"],
                    "items": []
                }
            approaching[email]["items"].append(r)
            
    # Send consolidated emails
    tasks = []
    
    async def send_reminder_task(email, student_name, student_id, items):
        # Format list
        items_html = "<ul style='padding-left: 20px; line-height: 1.6;'>"
        for it in items:
            req_code = f"REQ-{it['id'][:8].upper()}"
            items_html += f"<li><strong>{it['quantity']}x {it['component_name']}</strong> (Code: {req_code})</li>"
        items_html += "</ul>"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #f59e0b; text-align: center; margin-top: 0; font-size: 22px;">Consolidated Return Reminder</h2>
          <p>Dear {student_name},</p>
          <p>This is a consolidated warning that the borrowing period for the following laboratory hardware components issued to you is set to expire soon:</p>
          
          <div style="background-color: #fafafa; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin: 20px 0;">
            {items_html}
          </div>
          
          <p>Please return all listed components to the Innovation SOI lab coordinator in functional working condition to avoid overdue flags.</p>
        </div>
        """
        
        # 1. Add app notification
        items_summary = ", ".join([f"{it['quantity']}x {it['component_name']}" for it in items])
        await add_notification(student_id, "Consolidated Return Reminder", f"You have {len(items)} borrowed items approaching deadline: {items_summary}", "warning", "/student/return")
        
        # 2. Queue email
        await EMAIL_QUEUE.put((email, f"EI HUB - Return Deadline Reminder ({len(items)} items)", html, None))
        return True

    for email, info in approaching.items():
        tasks.append(send_reminder_task(email, info["student_name"], info["student_id"], info["items"]))
        
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        sent_count = sum(1 for r in results if r is True)
    else:
        sent_count = 0
            
    return {"reminders_processed": len(approaching), "emails_sent": sent_count}

if __name__ == "__main__":
    import uvicorn
    # Read port from env or default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Production-ready startup: disable reload by default to save resources, enable workers control
    env = os.environ.get("ENV", "production").lower()
    reload_on = env == "development"
    workers = int(os.environ.get("WEB_CONCURRENCY", 1))
    
    print(f"Starting server in {env} mode (port={port}, reload={reload_on}, workers={workers})")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=reload_on, workers=workers)
