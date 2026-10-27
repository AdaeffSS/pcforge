"""Модели входных и выходных данных (проверяются Pydantic автоматически)."""
from pydantic import BaseModel, Field, field_validator

EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=100)
    password: str = Field(min_length=8, max_length=64)

    @field_validator("password")
    @classmethod
    def password_is_strong(cls, value: str) -> str:
        if not any(ch.isalpha() for ch in value) or not any(ch.isdigit() for ch in value):
            raise ValueError("Пароль должен содержать буквы и цифры")
        if len(value.encode("utf-8")) > 72:  # ограничение алгоритма bcrypt
            raise ValueError("Пароль слишком длинный")
        return value


class LoginIn(BaseModel):
    email: str = Field(max_length=100)
    password: str = Field(max_length=64)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: str


class CategoryOut(BaseModel):
    slug: str
    name: str


class ComponentOut(BaseModel):
    id: int
    category: str
    category_name: str
    name: str
    brand: str
    price: int
    description: str
    specs: dict[str, str]
    socket: str | None
    ram_type: str | None
    form_factor: str | None
    power: int | None
    gpu_length: int | None


class BuildIn(BaseModel):
    title: str = Field(min_length=2, max_length=60)
    component_ids: list[int] = Field(min_length=1, max_length=8)


class BuildItemOut(BaseModel):
    id: int
    category_name: str
    name: str
    price: int


class BuildOut(BaseModel):
    id: int
    title: str
    total_price: int
    created_at: str
    items: list[BuildItemOut]


class FeedbackIn(BaseModel):
    name: str = Field(min_length=2, max_length=50)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=100)
    phone: str | None = Field(default=None, pattern=r"^(\+7\d{10})?$")
    topic: str = Field(pattern=r"^(compat|build|other)$")
    message: str = Field(min_length=10, max_length=2000)
