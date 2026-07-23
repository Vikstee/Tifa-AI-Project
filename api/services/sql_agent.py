import os
# Fix for Python 3.14 Protobuf compatibility issue
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

import google.generativeai as genai
import pg8000.dbapi
from urllib.parse import urlparse, unquote
import json

# Define the schema map to help Gemini write correct SQL
SCHEMA_CONTEXT = """
Anda adalah AI ahli SQL (PostgreSQL). Tugas Anda adalah mengubah pertanyaan user bahasa Indonesia menjadi query SQL mentah.
KEMBALIKAN HANYA QUERY SQL-NYA SAJA. Jangan gunakan blok markdown ```sql ... ```. JANGAN jelaskan apapun.

Skema database:
1. Table `projects`:
   - id (UUID), sid, io_number, project_name, customer, portfolio, segment.
2. Table `project_metrics`:
   - id, project_id (FK to projects.id), period, rkap, rkap_stg, po_amount, po_amount_co, po_open, outlook_amount, bast_amount, bast_amount_app1, bast_amount_app2, remaining_bast, revenue, invoice, clearing_number, cash_in, pinalty, accrue_date.
3. Table `invoices`:
   - id, client_name, amount, status.
4. Table `purchase_orders`:
   - id, client_name, amount, status.
5. Table `cash_in`:
   - date, amount.
6. Table `cash_out`:
   - date, amount.

Aturan Penting:
1. Kolom uang/nominal bertipe numerik.
2. Gunakan JOIN jika butuh project_name dan nominal (contoh: JOIN projects p ON m.project_id = p.id).
3. Batasi query maksimal 100 baris dengan LIMIT 100 jika mengembalikan banyak data.
4. JIKA diminta total/jumlah, gunakan SUM().
5. JIKA ditanya rata-rata, gunakan AVG().
"""

def execute_sql_pg8000(db_url, sql_query):
    parsed = urlparse(db_url)
    password = unquote(parsed.password) if parsed.password else None
    
    conn = pg8000.dbapi.connect(
        user=parsed.username,
        password=password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:]
    )
    cursor = conn.cursor()
    cursor.execute(sql_query)
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    data = [dict(zip(columns, row)) for row in rows]
    cursor.close()
    conn.close()
    return data

def process_sql_query(request_data):
    question = request_data.get("question", "")
    if not question:
        return {"error": "Question not provided"}

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        return {"error": "Gemini API key not configured"}
        
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return {"error": "DATABASE_URL not configured for SQL Agent"}

    try:
        # 1. Ask Gemini for SQL
        genai.configure(api_key=gemini_key.split(',')[0].strip())
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"{SCHEMA_CONTEXT}\n\nPertanyaan User: {question}\n\nSQL Query:"
        response = model.generate_content(prompt)
        sql_query = response.text.strip()
        
        # Bersihkan jika Gemini membandel mengirimkan markdown
        if sql_query.startswith("```sql"):
            sql_query = sql_query[6:]
        if sql_query.startswith("```"):
            sql_query = sql_query[3:]
        if sql_query.endswith("```"):
            sql_query = sql_query[:-3]
        sql_query = sql_query.strip()
        
        # Proteksi keamanan dasar (Hanya izinkan SELECT)
        if not sql_query.upper().startswith("SELECT"):
            return {"error": "Only SELECT queries are allowed for security reasons.", "query": sql_query}

        # 2. Execute SQL
        data = execute_sql_pg8000(db_url, sql_query)
            
        return {
            "query_used": sql_query,
            "data": data,
            "row_count": len(data),
            "message": "Berhasil mengeksekusi Text-to-SQL."
        }
    except Exception as e:
        return {"error": str(e), "note": "Mungkin AI salah menulis syntax SQL atau kolom tidak ada."}
