from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal, check_db_connection
from app.models.user import User
from app.routers import admin, auth, users, results, ws, multiplayer, matches, leaderboard, achievements, friends, notifications, tournaments

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(results.router)
app.include_router(ws.router)
app.include_router(multiplayer.router)
app.include_router(matches.router)
app.include_router(leaderboard.router)
app.include_router(achievements.router)
app.include_router(admin.router)
app.include_router(friends.router)
app.include_router(friends.presence_router)
app.include_router(notifications.router)
app.include_router(tournaments.router)


@app.on_event("startup")
def ensure_bootstrap_admin():
    email = settings.bootstrap_admin_email
    username = settings.bootstrap_admin_username
    password = settings.bootstrap_admin_password
    if not email and not username and not password:
        return
    if not email or not username or not password:
        raise RuntimeError("Configura BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_USERNAME e BOOTSTRAP_ADMIN_PASSWORD")

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == email.strip().lower()).first()
        if admin_user:
            admin_user.is_admin = True
            admin_user.is_active = True
        else:
            username_taken = db.query(User).filter(User.username == username).first()
            if username_taken:
                raise RuntimeError("BOOTSTRAP_ADMIN_USERNAME já pertence a outro utilizador")
            db.add(User(
                email=email.strip().lower(),
                username=username,
                hashed_password=hash_password(password),
                is_admin=True,
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()




@app.get("/")
def root():
    return {"app": settings.app_name, "status": "running"}


@app.get("/health")
def health():
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
