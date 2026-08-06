import os
import pymysql
from urllib.parse import urlparse, unquote

def get_mysql_connection():
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

def fetch_table_data(table_name="data_po-cashin", select_columns="*"):
    clean_table = table_name.replace("`", "")
    sql = f"SELECT {select_columns} FROM `{clean_table}`"
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
            return rows
    finally:
        conn.close()
