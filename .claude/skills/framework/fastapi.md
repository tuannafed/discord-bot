# Skill: FastAPI Patterns

**Used by:** Backend FastAPI agent, Code Reviewer.

---

## Project Structure

```
src/
  main.py                  # App factory, startup
  api/
    v1/
      router.py            # Include all feature routers
      users/
        router.py          # Route handlers only
        service.py         # Business logic
        schemas.py         # Pydantic request/response schemas
        models.py          # SQLAlchemy models
        deps.py            # Route-specific dependencies
  core/
    config.py              # Settings (pydantic-settings)
    database.py            # DB engine, session factory
    security.py            # JWT utils
    dependencies.py        # Shared dependencies (get_current_user)
  tests/
    conftest.py
    test_users.py
```

---

## App Factory (main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.api.v1.router import api_router
from src.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, ...)
    app.include_router(api_router, prefix="/api/v1")
    return app

app = create_app()
```

---

## Pydantic v2 Schemas

```python
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
import uuid

# Request schemas
class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str  # min_length validation via Field
    role: str = "user"

    model_config = ConfigDict(str_strip_whitespace=True)

# Response schemas — always explicit (never return ORM objects directly)
class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)  # allow ORM → schema

# Paginated list
class UserListResponse(BaseModel):
    success: bool = True
    data: list[UserResponse]
    meta: PaginationMeta
```

---

## Dependency Injection

```python
# core/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_token
from src.users.service import UsersService

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    user = await UsersService(db).get_by_id(payload.sub)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(role: str):
    async def check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return check
```

---

## Router Pattern

```python
# api/v1/users/router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from .service import UsersService
from .schemas import CreateUserRequest, UpdateUserRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=DataResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),  # auth guard
):
    service = UsersService(db)
    user = await service.create(body)
    return DataResponse(data=UserResponse.model_validate(user))

@router.get("/{user_id}", response_model=DataResponse[UserResponse])
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UsersService(db)
    user = await service.get_or_404(user_id)
    return DataResponse(data=UserResponse.model_validate(user))
```

---

## Service Pattern

```python
# api/v1/users/service.py
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

class UsersService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: CreateUserRequest) -> User:
        existing = await self.db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(**data.model_dump())
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_or_404(self, user_id: uuid.UUID) -> User:
        user = await self.db.scalar(select(User).where(User.id == user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
```

---

## Settings (pydantic-settings)

```python
# core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "MyApp"
    DEBUG: bool = False
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    CORS_ORIGINS: list[str] = []

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()  # validates all required envs at startup
```

---

## Global Exception Handler

```python
# main.py
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed",
                "details": [
                    {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
                    for e in exc.errors()
                ],
            },
        },
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN",
                404: "NOT_FOUND", 409: "ALREADY_EXISTS", 422: "UNPROCESSABLE"}
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": code_map.get(exc.status_code, "ERROR"), "message": exc.detail}},
    )
```

---

## Code Review: FastAPI Checklist

```
[ ] No business logic in route handlers — only in service classes
[ ] Pydantic v2 response schemas — never return raw ORM objects
[ ] HTTPBearer dependency on all protected routes
[ ] Resource ownership checked in service (not just auth)
[ ] Settings loaded via pydantic-settings at startup
[ ] async/await used consistently (no sync DB calls in async routes)
[ ] Exception handlers return consistent error envelope
[ ] from_attributes=True on response schemas using ORM objects
```
