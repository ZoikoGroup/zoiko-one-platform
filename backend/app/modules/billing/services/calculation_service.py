from decimal import Decimal
from typing import Optional, Tuple, Dict, Any
from app.modules.billing.models import TaxRate

class CalculationService:
    @staticmethod
    def calculate_line_item(
        quantity: Decimal,
        unit_price: Decimal,
        discount_percentage: Decimal = Decimal('0'),
        discount_amount_fixed: Decimal = Decimal('0'),
        tax_percentage: Decimal = Decimal('0'),
        exchange_rate: Decimal = Decimal('1.0'),
        is_tax_inclusive: bool = False
    ) -> Dict[str, Decimal]:
        """
        Calculates a line item's totals exactly like a production ERP.
        Order of operations:
        1. Subtotal = Quantity * Unit Price
        2. Discount = (Subtotal * discount_percentage / 100) + discount_amount_fixed
        3. Taxable Amount = Subtotal - Discount
        4. Tax Amount = Taxable Amount * (tax_percentage / 100)
        5. Total = Taxable Amount + Tax Amount
        
        All calculations are done in the original currency, then converted if needed.
        """
        quantity = Decimal(str(quantity))
        unit_price = Decimal(str(unit_price))
        discount_percentage = Decimal(str(discount_percentage))
        discount_amount_fixed = Decimal(str(discount_amount_fixed))
        tax_percentage = Decimal(str(tax_percentage))
        exchange_rate = Decimal(str(exchange_rate))
        
        # 1. Base Subtotal
        original_subtotal = quantity * unit_price
        
        # 2. Discount
        pct_discount_amt = (original_subtotal * discount_percentage) / Decimal('100')
        total_discount_original = pct_discount_amt + discount_amount_fixed
        if total_discount_original > original_subtotal:
            total_discount_original = original_subtotal
            
        # 3. Taxable Base
        taxable_amount_original = original_subtotal - total_discount_original
        
        # 4. Tax (exclusive vs inclusive)
        if is_tax_inclusive and tax_percentage > 0:
            # Tax-inclusive: price already includes tax, extract the base
            # base = inclusive_amount / (1 + rate/100)
            # tax = inclusive_amount - base
            divisor = Decimal('1') + tax_percentage / Decimal('100')
            taxable_amount_original = taxable_amount_original / divisor
            tax_amount_original = taxable_amount_original * tax_percentage / Decimal('100')
        else:
            # Tax-exclusive: tax is added on top
            tax_amount_original = (taxable_amount_original * tax_percentage) / Decimal('100')

        # 5. Line Total
        line_total_original = taxable_amount_original + tax_amount_original
        
        # Convert to target currency
        return {
            "original_quantity": quantity,
            "original_unit_price": unit_price,
            "original_subtotal": original_subtotal,
            "original_discount": total_discount_original,
            "original_taxable_amount": taxable_amount_original,
            "original_tax_amount": tax_amount_original,
            "original_line_total": line_total_original,
            "converted_unit_price": unit_price * exchange_rate,
            "converted_subtotal": original_subtotal * exchange_rate,
            "converted_discount": total_discount_original * exchange_rate,
            "converted_taxable_amount": taxable_amount_original * exchange_rate,
            "converted_tax_amount": tax_amount_original * exchange_rate,
            "converted_line_total": line_total_original * exchange_rate,
            "exchange_rate_used": exchange_rate,
            "is_tax_inclusive": is_tax_inclusive
        }

    @staticmethod
    def summarize_invoice(line_items_data: list) -> Dict[str, Decimal]:
        """
        Takes a list of line item calculation dictionaries and sums them up.
        """
        summary = {
            "total_original_subtotal": Decimal('0'),
            "total_original_discount": Decimal('0'),
            "total_original_tax": Decimal('0'),
            "total_original_grand": Decimal('0'),
            "total_converted_subtotal": Decimal('0'),
            "total_converted_discount": Decimal('0'),
            "total_converted_tax": Decimal('0'),
            "total_converted_grand": Decimal('0')
        }
        for item in line_items_data:
            summary["total_original_subtotal"] += item.get("original_subtotal", Decimal('0'))
            summary["total_original_discount"] += item.get("original_discount", Decimal('0'))
            summary["total_original_tax"] += item.get("original_tax_amount", Decimal('0'))
            summary["total_original_grand"] += item.get("original_line_total", Decimal('0'))
            
            summary["total_converted_subtotal"] += item.get("converted_subtotal", Decimal('0'))
            summary["total_converted_discount"] += item.get("converted_discount", Decimal('0'))
            summary["total_converted_tax"] += item.get("converted_tax_amount", Decimal('0'))
            summary["total_converted_grand"] += item.get("converted_line_total", Decimal('0'))
            
        return summary
