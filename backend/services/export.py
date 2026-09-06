import io
import zipfile
import openpyxl
from datetime import datetime
from openpyxl.styles import Font, Alignment
from utils.s3 import download_file_from_s3

class ExportService:
    @staticmethod
    async def generate_excel(expenses: list, user_name: str) -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Expenses"

        headers = ["Expense ID", "Date", "Name", "Vendor/Payee", "Description", "GST", "Amount"]
        ws.append(headers)

        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center")

        # Sort expenses by date ascending
        expenses = sorted(expenses, key=lambda x: x.get("expense_date", 0))

        for idx, exp in enumerate(expenses, start=1):
            # EX01 format
            expense_id = f"EX{idx:02d}"
            
            # Formatting Date
            # Expense date might be in milliseconds, converting to seconds
            exp_date_ms = exp.get("expense_date")
            if exp_date_ms:
                dt = datetime.fromtimestamp(exp_date_ms / 1000)
                date_str = dt.strftime("%d-%m-%Y")
            else:
                date_str = ""
            
            gst = "Yes" if exp.get("gst_bill") else "No"
            
            amount = f"₹ {exp.get('amount', 0)}"

            row = [
                expense_id,
                date_str,
                user_name,
                exp.get("vendor", ""),
                exp.get("description", ""),
                gst,
                amount
            ]
            ws.append(row)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @staticmethod
    async def generate_zip(expenses: list, user_name: str) -> io.BytesIO:
        zip_buffer = io.BytesIO()
        
        # Sort expenses by date ascending to match Excel ID generation
        expenses = sorted(expenses, key=lambda x: x.get("expense_date", 0))

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for idx, exp in enumerate(expenses, start=1):
                expense_id = f"EX{idx:02d}"

                bill_url = exp.get("bill_url")
                if bill_url and not bill_url.startswith("http"):
                    # We expect a direct S3 key here.
                    file_bytes = download_file_from_s3(bill_url)
                    if file_bytes:
                        ext = bill_url.split(".")[-1]
                        filename = f"{expense_id}.{ext}"
                        zip_file.writestr(filename, file_bytes)
            
        zip_buffer.seek(0)
        return zip_buffer

