from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Ingredient(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    stock_quantity: float = 0.0
    last_unit_cost: float = 0.0
    sales_price: float = 0.0
    is_saleable: bool = False
    is_menu: bool = False
    supplier_id: Optional[str] = None
    box_quantity: float = 1.0
    tax_rate: float = 10.0
    purchase_unit: str = "Adet"
    usage_unit: str = "Adet"
    unit_conversion_factor: float = 1.0

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock_quantity: Optional[float] = None
    unit_price: Optional[float] = None
    sales_price: Optional[float] = None
    is_saleable: Optional[bool] = None
    is_menu: Optional[bool] = None
    supplier_id: Optional[str] = None
    box_quantity: Optional[float] = None
    tax_rate: Optional[float] = None
    purchase_unit: Optional[str] = None
    usage_unit: Optional[str] = None
    unit_conversion_factor: Optional[float] = None

class Supplier(BaseModel):
    id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    balance: float = 0.0

class InvoiceItem(BaseModel):
    ingredient_id: str
    quantity: float
    unit_price: float
    total_price: float

class Invoice(BaseModel):
    id: Optional[str] = None
    supplier_id: str
    invoice_date: datetime
    total_amount_gross: float
    items: List[InvoiceItem]

class RecipeItem(BaseModel):
    ingredient_id: str
    quantity_used: float
    yield_rate: float = 1.0
    additional_cost: float = 0.0

class Recipe(BaseModel):
    menu_item_id: str
    name: str
    category: str
    items: List[RecipeItem]
