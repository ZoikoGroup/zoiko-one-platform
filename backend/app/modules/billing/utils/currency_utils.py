CURRENCY_SYMBOL_MAP = {
    "USD": "$",
    "EUR": "\u20AC",
    "GBP": "\u00A3",
    "INR": "\u20B9",
    "JPY": "\u00A5",
    "CNY": "\u00A5",
    "AED": "\u062F.\u0625",
    "SAR": "\u0631.\u0633",
    "QAR": "\u0631.\u0642",
    "KWD": "\u062F.\u0643",
    "AUD": "A$",
    "CAD": "C$",
    "CHF": "CHF",
    "SGD": "S$",
    "NZD": "NZ$",
    "MYR": "RM",
    "THB": "\u0E3F",
    "HKD": "HK$",
    "KRW": "\u20A9",
    "MXN": "MX$",
    "ZAR": "R",
    "BRL": "R$",
    "SEK": "kr",
    "NOK": "kr",
    "DKK": "kr",
    "NGN": "\u20A6",
    "PKR": "\u20A8",
    "BDT": "\u09F3",
    "LKR": "\u20A8",
    "NPR": "\u20A8",
    "BHD": "\u062F.\u0628",
    "OMR": "\u0631.\u0639",
}

CURRENCY_DECIMAL_MAP = {
    "JPY": 0,
    "KRW": 0,
    "KWD": 3,
    "BHD": 3,
    "OMR": 3,
}


def get_currency_symbol(currency_code: str) -> str:
    return CURRENCY_SYMBOL_MAP.get(currency_code, currency_code)


def get_currency_decimal_digits(currency_code: str) -> int:
    return CURRENCY_DECIMAL_MAP.get(currency_code, 2)


def format_currency_display(amount, currency_code: str, position: str = "before") -> str:
    symbol = get_currency_symbol(currency_code)
    decimals = get_currency_decimal_digits(currency_code)
    try:
        formatted = f"{float(amount):.{decimals}f}"
    except (ValueError, TypeError):
        formatted = str(amount)
    if position == "after":
        return f"{formatted}{symbol}"
    return f"{symbol}{formatted}"


def validate_currency_code(code: str) -> bool:
    return code in CURRENCY_SYMBOL_MAP


def validate_language_code(code: str) -> bool:
    valid_codes = {
        "en", "hi", "te", "ta", "kn", "ml", "mr", "bn", "gu", "pa",
        "ur", "ar", "fr", "de", "es", "pt", "nl", "zh", "ja", "ko",
        "ru", "it", "tr",
    }
    return code in valid_codes
