import logging
from decimal import Decimal
from typing import Any, Dict, Set

from sqlalchemy.orm import Session

logger = logging.getLogger("zoiko")


def safe_commit(db: Session) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def safe_commit_and_refresh(db: Session, *objs: Any) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    for obj in objs:
        db.refresh(obj)


def filter_allowed(data: Dict[str, Any], allowed: Set[str], drop_none: bool = True) -> Dict[str, Any]:
    return {
        k: v
        for k, v in data.items()
        if k in allowed and (not drop_none or v is not None)
    }


def calculate_line_item_totals(
    items: list,
    discount_percentage: Any = Decimal("0"),
) -> Dict[str, Decimal]:
    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    for item in items:
        qty = Decimal(str(item.get("quantity", 1)))
        price = Decimal(str(item.get("unit_price", 0)))
        disc_pct = Decimal(str(item.get("discount_percentage", 0)))
        tax_pct = Decimal(str(item.get("tax_percentage", 0)))
        line_total = qty * price
        line_discount = line_total * disc_pct / Decimal("100")
        line_tax = (line_total - line_discount) * tax_pct / Decimal("100")
        subtotal += line_total
        tax_amount += line_tax
    total_discount = subtotal * Decimal(str(discount_percentage)) / Decimal("100")
    total = subtotal - total_discount + tax_amount
    return {
        "subtotal": subtotal,
        "discount_amount": total_discount,
        "tax_amount": tax_amount,
        "total_amount": total,
    }
