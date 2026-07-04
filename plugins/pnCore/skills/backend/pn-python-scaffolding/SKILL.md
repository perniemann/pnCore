---
name: pn-python-scaffolding
description: "Scaffolds new Python API projects (FastAPI, Flask, Django) or routes. Use when adding a new route/module; covers project layout, env/secrets, validation, error handling, and idiomatic Python patterns."
---

# Python backend scaffolding

## When to use

- Starting a new Python API project (FastAPI, Flask, Django).
- Adding a new route, router, or domain module.
- Establishing project structure and config patterns from scratch.

## Project structure

```
# FastAPI — domain-driven layout (preferred)
src/
  users/
    router.py         # APIRouter with route definitions
    service.py        # Business logic
    schemas.py        # Pydantic request/response models
    models.py         # SQLAlchemy ORM models (if used)
  orders/
    router.py
    service.py
    schemas.py
  core/
    config.py         # Settings via pydantic-settings
    database.py       # Async DB engine + session factory
    errors.py         # AppError class and exception handlers
    security.py       # Auth helpers (JWT decode, password hash)
  main.py             # FastAPI app factory, router registration

pyproject.toml        # Dependencies + project metadata (preferred over requirements.txt)
.env.example          # Required environment variables with placeholders
```

## FastAPI scaffold

```python
# src/users/schemas.py
from pydantic import BaseModel, EmailStr, field_validator

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    role: str = "user"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

    model_config = {"from_attributes": True}  # allow ORM model input
```

```python
# src/users/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from .schemas import CreateUserRequest, UserResponse
from .service import create_user, get_user_by_id
from ..core.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_route(
    body: CreateUserRequest,
    current_user=Depends(get_current_user),
) -> UserResponse:
    return await create_user(body)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_route(
    user_id: int,
    current_user=Depends(get_current_user),
) -> UserResponse:
    user = await get_user_by_id(user_id, requester_id=current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

```python
# src/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .users.router import router as users_router
from .core.errors import AppError

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: init DB pool, connect Redis, etc.
    yield
    # shutdown: close connections

app = FastAPI(lifespan=lifespan)
app.include_router(users_router, prefix="/api/v1")

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
```

## Config and secrets

```python
# src/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expires_minutes: int = 15
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()  # Raises ValidationError at startup if required vars missing
```

## Error handling

```python
# src/core/errors.py
class AppError(Exception):
    def __init__(self, code: str, http_status: int, message: str):
        self.code = code
        self.http_status = http_status
        self.message = message
        super().__init__(message)

# Usage in service layer
raise AppError("USER_NOT_FOUND", 404, "No user with that ID")
raise AppError("VALIDATION_FAILED", 422, "Email is already in use")
```

## pyproject.toml (preferred over requirements.txt)

```toml
[project]
name = "my-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic-settings>=2.0",
    "asyncpg>=0.30",
    "sqlalchemy[asyncio]>=2.0",
    "python-jose[cryptography]>=3.3",
    "bcrypt>=4.0",
    "structlog>=24.0",
]

[tool.ruff]
select = ["E", "F", "I", "UP"]
```

## One-at-a-time rule

Add one router or one module per PR. Mix only when a schema change and its router change are inseparable.

## Guardrails

- **pn-backend-philosophy** — security, OWASP, REST, secrets rulebook.
- **pn-python-backend** — rule for file-glob activation and Python-specific style.
- **pn-node-api** — REST and error handling patterns (language-agnostic principles apply).
