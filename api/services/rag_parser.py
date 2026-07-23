import io
import pandas as pd
import requests
import os
import google.generativeai as genai
import pg8000.dbapi
from urllib.parse import urlparse, unquote

def get_pg8000_conn():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url: return None
    parsed = urlparse(db_url)
    password = unquote(parsed.password) if parsed.password else None
    return pg8000.dbapi.connect(
        user=parsed.username,
        password=password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:]
    )

def chunk_text(text, chunk_size=300):
    words = text.split()
    return [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

def process_document_parsing(request_data):
    try:
        file_url = request_data.get('url', '')
        file_name = request_data.get('name', '')
        
        if not file_url:
            return {"error": "No URL provided"}
            
        res = requests.get(file_url)
        if res.status_code != 200:
            return {"error": f"Failed to download file: {res.status_code}"}
            
        text = ""
        # Parse PDF
        if file_name.lower().endswith('.pdf'):
            import PyPDF2
            import re
            pdf_file = io.BytesIO(res.content)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
                    text += cleaned_text + "\n"
        # Parse Excel / CSV
        elif file_name.lower().endswith(('.xlsx', '.xls', '.csv')):
            if file_name.lower().endswith('.csv'):
                df = pd.read_csv(io.BytesIO(res.content))
            else:
                df = pd.read_excel(io.BytesIO(res.content))
            text += df.to_string()
        else:
            return {"error": "Format file tidak didukung untuk ekstraksi teks secara native."}
            
        # 2. Chunking and Embedding
        chunks = chunk_text(text, chunk_size=300)
        conn = get_pg8000_conn()
        if not conn:
            return {"error": "Gagal terkoneksi ke Database Vector"}
            
        cursor = conn.cursor()
        cursor.execute("DELETE FROM document_chunks WHERE file_name = %s", (file_name,))
        
        for idx, chunk in enumerate(chunks):
            # Genai Text Embedding
            emb_res = genai.embed_content(
                model="models/text-embedding-004",
                content=chunk,
                task_type="retrieval_document"
            )
            embedding = emb_res['embedding']
            embedding_str = '[' + ','.join(map(str, embedding)) + ']'
            
            cursor.execute(
                "INSERT INTO document_chunks (file_name, chunk_index, content, embedding) VALUES (%s, %s, %s, %s)",
                (file_name, idx, chunk, embedding_str)
            )
            
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"text": f"[SISTEM] Dokumen '{file_name}' ({len(chunks)} paragraf) telah berhasil dibaca dan diindeks ke dalam Database Vector. Anda tidak perlu membaca dokumen penuhnya lagi. Gunakan alat 'search_document' untuk mencari informasi apapun di dalam dokumen ini."}
        
    except Exception as e:
        return {"error": str(e)}
