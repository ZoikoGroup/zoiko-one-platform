from app.modules.payroll.bank_export.base import IBankExporter
from app.modules.payroll.bank_export.csv_exporter import CSVExporter
from app.modules.payroll.bank_export.excel_exporter import ExcelExporter
from app.modules.payroll.bank_export.txt_exporter import TXTExporter

# Future BankAPIExporter (direct bank-API disbursement instead of a file
# download) is added here as one more entry — no changes required to
# Payroll Run logic or the endpoints that call get_exporter().
_EXPORTERS = {
    "csv": CSVExporter,
    "xlsx": ExcelExporter,
    "txt": TXTExporter,
}


def get_exporter(format_key: str) -> IBankExporter:
    cls = _EXPORTERS.get((format_key or "csv").lower())
    if not cls:
        raise ValueError(f"Unsupported bank export format: {format_key!r}")
    return cls()
