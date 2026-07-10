import io
import pandas as pd
import requests

def process_document_parsing(request_data):
    try:
        file_url = request_data.get('url', '')
        file_name = request_data.get('name', '')
        
        if not file_url:
            return {"error": "No URL provided"}
            
        res = requests.get(file_url)
        if res.status_code != 200:
            return {"error": f"Failed to download file: {res.status_code}"}
            
        text = f"--- Konten File: {file_name} ---\n"
        
        # Parse PDF
        if file_name.lower().endswith('.pdf'):
            import PyPDF2
            pdf_file = io.BytesIO(res.content)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                    
        # Parse Excel / CSV
        elif file_name.lower().endswith(('.xlsx', '.xls', '.csv')):
            if file_name.lower().endswith('.csv'):
                df = pd.read_csv(io.BytesIO(res.content))
            else:
                df = pd.read_excel(io.BytesIO(res.content))
            text += df.to_string()
            
        else:
            text += "Format file tidak didukung untuk ekstraksi teks secara native."
            
        # Limit text length to prevent huge context window bloat (limit to ~20000 chars)
        if len(text) > 20000:
            text = text[:20000] + "\n...[TEKS TERPOTONG KARENA TERLALU PANJANG]..."
            
        return {"text": text}
    except Exception as e:
        return {"error": str(e)}
