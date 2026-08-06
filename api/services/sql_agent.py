import os
import json
import urllib.request
from urllib.parse import urlparse, unquote

SCHEMA_CONTEXT = """
Anda adalah AI ahli SQL (MySQL). Tugas Anda adalah mengubah pertanyaan user bahasa Indonesia menjadi query SQL mentah.
KEMBALIKAN HANYA QUERY SQL-NYA SAJA. Jangan gunakan blok markdown ```sql ... ```. JANGAN jelaskan apapun.

Skema database:
Table `data_po-cashin`:
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
- rkap (DOUBLE)
- rkap_stg (DOUBLE)
- po_amount (DOUBLE)
- po_amount_co (DOUBLE)
- bast_amount (DOUBLE)
- po_open (DOUBLE)
- outlook_amount (DOUBLE)
- bast_amount_app1 (DOUBLE)
- bast_amount_app2 (DOUBLE)
- revenue (DOUBLE)
- remaining_bast (DOUBLE)
- invoice (DOUBLE)
- clearing_number (TEXT)
- cash_in (DOUBLE)
- pinalty (DOUBLE)

Aturan Penting:
1. Nama tabel WAJIB di-quote dengan tanda backtick: `data_po-cashin`.
2. Kolom uang/nominal bertipe DOUBLE (numerik).
3. Batasi query maksimal 100 baris dengan LIMIT 100 jika mengembalikan banyak data.
4. JIKA diminta total/jumlah, gunakan SUM().
5. JIKA ditanya rata-rata, gunakan AVG().
"""

def get_mysql_connection():
    import pymysql
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.startswith("mysql://"):
        parsed = urlparse(db_url)
        password = unquote(parsed.password) if parsed.password else ""
        return pymysql.connect(
            host=parsed.hostname or "localhost",
            port=parsed.port or 3306,
            user=parsed.username or "root",
            password=password,
            database=parsed.path[1:] if parsed.path else "tifa_db",
            cursorclass=pymysql.cursors.DictCursor
        )
    
    return pymysql.connect(
        host=os.environ.get("MYSQL_HOST", "localhost"),
        port=int(os.environ.get("MYSQL_PORT", 3306)),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", ""),
        database=os.environ.get("MYSQL_DATABASE", "tifa_db"),
        cursorclass=pymysql.cursors.DictCursor
    )

def execute_sql_mysql(sql_query):
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_query)
            data = cursor.fetchall()
            return data
    finally:
        conn.close()

def process_sql_query(db_client, request_data):
    question = request_data.get("question", "")
    if not question:
        return {"error": "Question not provided", "data": []}

    grok_key = os.environ.get("XAI_GROK_API_KEY") or os.environ.get("GROK_API_KEY") or os.environ.get("GROQ_API_KEY")

    # 1. Try Direct MySQL Text-to-SQL if grok_key exists
    if grok_key:
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
                data = execute_sql_mysql(sql_query)
                return {
                    "query_used": sql_query,
                    "data": data,
                    "row_count": len(data),
                    "message": "Berhasil mengeksekusi Text-to-SQL pada MySQL."
                }
        except Exception as e:
            print(f"[SQL Agent Direct MySQL Error]: {e}")

    # 2. Fallback to direct MySQL Query
    try:
        sql_fallback = "SELECT project_name, portfolio, customer, revenue, cash_in, rkap, outlook_amount, period FROM `data_po-cashin` ORDER BY revenue DESC LIMIT 20"
        data = execute_sql_mysql(sql_fallback)
        return {
            "query_used": "Fallback MySQL Table Query",
            "data": data,
            "row_count": len(data),
            "message": "Berhasil mengambil data dari MySQL."
        }
    except Exception as e:
        return {"error": str(e), "data": []}
