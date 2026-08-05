import os
import json
import urllib.request
from urllib.parse import urlparse, unquote
import pg8000.dbapi

SCHEMA_CONTEXT = """
Anda adalah AI ahli SQL (PostgreSQL). Tugas Anda adalah mengubah pertanyaan user bahasa Indonesia menjadi query SQL mentah.
KEMBALIKAN HANYA QUERY SQL-NYA SAJA. Jangan gunakan blok markdown ```sql ... ```. JANGAN jelaskan apapun.

Skema database:
Table "data_po-cashin":
- id (BIGINT PRIMARY KEY)
- period (VARCHAR)
- accrue_date (DATE)
- funnel (VARCHAR)
- lop_group_name (TEXT)
- portfolio (VARCHAR)
- segment (VARCHAR)
- sid (TEXT)
- io_number (TEXT)
- project_name (TEXT)
- customer (TEXT)
- rkap (DOUBLE PRECISION)
- rkap_stg (DOUBLE PRECISION)
- po_amount (DOUBLE PRECISION)
- po_amount_co (DOUBLE PRECISION)
- bast_amount (DOUBLE PRECISION)
- po_open (DOUBLE PRECISION)
- outlook_amount (DOUBLE PRECISION)
- bast_amount_app1 (DOUBLE PRECISION)
- bast_amount_app2 (DOUBLE PRECISION)
- revenue (DOUBLE PRECISION)
- remaining_bast (DOUBLE PRECISION)
- invoice (DOUBLE PRECISION)
- clearing_number (TEXT)
- cash_in (DOUBLE PRECISION)
- pinalty (DOUBLE PRECISION)

Aturan Penting:
1. Nama tabel WAJIB di-quote dengan tanda petik ganda: "data_po-cashin".
2. Kolom uang/nominal bertipe DOUBLE PRECISION (numerik).
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

def process_sql_query(supabase_client, request_data):
    question = request_data.get("question", "")
    if not question:
        return {"error": "Question not provided", "data": []}

    grok_key = os.environ.get("XAI_GROK_API_KEY") or os.environ.get("GROK_API_KEY") or os.environ.get("GROQ_API_KEY")
    db_url = os.environ.get("DATABASE_URL")

    # 1. Try Direct PostgreSQL Text-to-SQL if DATABASE_URL and grok_key exist
    if db_url and grok_key:
        try:
            is_xai = grok_key.startswith('xai-')
            endpoint = 'https://api.x.ai/v1/chat/completions' if is_xai else 'https://api.groq.com/openai/v1/chat/completions'
            model_name = 'grok-4.20-non-reasoning-latest' if is_xai else 'llama-3.3-70b-versatile'

            prompt = f"{SCHEMA_CONTEXT}\n\nPertanyaan User: {question}\n\nSQL Query:"
            
            headers = {
                "Authorization": f"Bearer {grok_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            }

            req = urllib.request.Request(endpoint, data=json.dumps(payload).encode(), headers=headers)
            with urllib.request.urlopen(req) as resp:
                res_data = json.loads(resp.read().decode())
                sql_query = res_data["choices"][0]["message"]["content"].strip()

            if sql_query.startswith("```sql"):
                sql_query = sql_query[6:]
            if sql_query.startswith("```"):
                sql_query = sql_query[3:]
            if sql_query.endswith("```"):
                sql_query = sql_query[:-3]
            sql_query = sql_query.strip()
            
            if sql_query.upper().startswith("SELECT"):
                data = execute_sql_pg8000(db_url, sql_query)
                return {
                    "query_used": sql_query,
                    "data": data,
                    "row_count": len(data),
                    "message": "Berhasil mengeksekusi Text-to-SQL."
                }
        except Exception as e:
            print(f"[SQL Agent Direct PG Error]: {e}")

    # 2. Fallback to Supabase REST Query if Direct PG is not available or failed
    if supabase_client:
        try:
            res = supabase_client.table("data_po-cashin").select("project_name, portfolio, customer, revenue, cash_in, rkap, outlook_amount, period").order("revenue", desc=True).limit(20).execute()
            return {
                "query_used": "Fallback Supabase REST Table Query",
                "data": res.data or [],
                "row_count": len(res.data) if res.data else 0,
                "message": "Berhasil mengambil data resmi Supabase."
            }
        except Exception as e:
            return {"error": str(e), "data": []}

    return {"error": "Database fallback unavailable", "data": []}
