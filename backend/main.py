from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from database.mongo import Database
from api import auth, expenses, dashboard
import uvicorn

app = FastAPI(
    title="Finance Tracker API",
    description="API for the Finance Tracker application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8764",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nurahub-finance.vbuddy.in",
        "http://nurahub-finance.vbuddy.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await Database.connect_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    await Database.close_db()

app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Finance Tracker API"}
