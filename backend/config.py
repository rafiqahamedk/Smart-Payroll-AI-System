# ================================================================
# SmartPayroll AI — Backend Configuration
# ================================================================

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "smartpayroll"

    # AI API
    VITE_GEMINI_API_KEY: str = ""
    AI_API_URL: str = "https://generativelanguage.googleapis.com/v1/models"
    AI_MODEL: str = "gemini-2.0-flash"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
