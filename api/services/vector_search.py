import os
# Fix for Python 3.14 Protobuf compatibility issue
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

import google.generativeai as genai
import pg8000.dbapi
from urllib.parse import urlparse, unquote

def search_vector_db(request_data):
    try:
        query = request_data.get('query', '')
        file_name = request_data.get('file_name', '')
        top_k = request_data.get('top_k', 5)
        
        if not query:
            return {"error": "Query is required"}
            
        # 1. Embed user query
        emb_res = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="retrieval_query"
        )
        query_embedding = emb_res['embedding']
        embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # 2. Connect to Supabase
        db_url = os.environ.get("DATABASE_URL")
        if not db_url: return {"error": "DB URL not found"}
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
        
        # 3. Vector Similarity Search using cosine distance (<=>)
        if file_name:
            sql = """
            SELECT file_name, content, 1 - (embedding <=> %s::vector) AS similarity 
            FROM document_chunks 
            WHERE file_name = %s
            ORDER BY embedding <=> %s::vector 
            LIMIT %s
            """
            cursor.execute(sql, (embedding_str, file_name, embedding_str, top_k))
        else:
            sql = """
            SELECT file_name, content, 1 - (embedding <=> %s::vector) AS similarity 
            FROM document_chunks 
            ORDER BY embedding <=> %s::vector 
            LIMIT %s
            """
            cursor.execute(sql, (embedding_str, embedding_str, top_k))
            
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # 4. Format Results
        results = []
        for row in rows:
            results.append({
                "file": row[0],
                "content": row[1],
                "similarity": round(row[2], 4)
            })
            
        if not results:
            return {"results": "Tidak ada informasi relevan yang ditemukan."}
            
        return {"results": results}
        
    except Exception as e:
        return {"error": str(e)}
