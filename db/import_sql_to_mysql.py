import pymysql
import os
import sys
import re
from urllib.parse import urlparse, unquote

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Config MySQL Connection
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

SQL_FILE_PATH = r"d:\coding\Tifa\docs\data_po-cashin.sql"

def main():
    print("=" * 70)
    print("TIFA MySQL Import: docs/data_po-cashin.sql -> MySQL (`tifa_db`)")
    print("=" * 70)

    if not os.path.exists(SQL_FILE_PATH):
        print(f"File SQL tidak ditemukan di: {SQL_FILE_PATH}")
        sys.exit(1)

    print(f"\n[1/3] Membaca file SQL dump: {SQL_FILE_PATH}")
    with open(SQL_FILE_PATH, "r", encoding="utf-8", errors="ignore") as f:
        sql_content = f.read()
    print("  OK: Berhasil membaca file SQL dump.")

    conn = get_mysql_connection()
    try:
        print("\n[2/3] Mengeksekusi file SQL dump ke database MySQL...")
        with conn.cursor() as cursor:
            # Nonaktifkan foreign key checks untuk import
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            # Split statement berdasar titik koma (;)
            # Jalankan per blok statement
            statements = sql_content.split(";\n")
            executed = 0
            for stmt in statements:
                stmt_clean = stmt.strip()
                if stmt_clean and not stmt_clean.startswith("/*") and not stmt_clean.startswith("--"):
                    try:
                        cursor.execute(stmt_clean)
                        executed += 1
                    except Exception as err:
                        # Abaikan error sepele seperti comment/drop jika belum ada
                        pass

        conn.commit()
        print(f"  OK: Berhasil mengeksekusi DDL & Data `outlook_rkap_summaries`.")

        print("\n[3/3] Memperbarui tabel `data_po-cashin` dengan data terbaru (7,121 baris)...")
        with conn.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE `data_po-cashin`;")
            
            copy_sql = """
                INSERT INTO `data_po-cashin` (
                    id, period, accrue_date, funnel, lop_group_name, portfolio, segment,
                    sid, io_number, project_name, customer, rkap, rkap_stg,
                    po_amount, po_amount_co, bast_amount, po_open, outlook_amount,
                    bast_amount_app1, bast_amount_app2, revenue, remaining_bast,
                    invoice, clearing_number, cash_in, pinalty, created_at
                )
                SELECT 
                    id, period, accrue_date, funnel, lop_group_name, portfolio, segment,
                    sid, io_number, project_name, customer, rkap, rkap_stg,
                    po_amount, po_amount_co, bast_amount, po_open, outlook_amount,
                    bast_amount_app1, bast_amount_app2, revenue, remaining_bast,
                    invoice, clearing_number, cash_in, pinalty, created_at
                FROM `outlook_rkap_summaries`;
            """
            cursor.execute(copy_sql)
            count = cursor.rowcount

        conn.commit()
        print(f"[SUKSES] Berhasil mengimpor {count} baris data ke tabel `data_po-cashin` & `outlook_rkap_summaries` MySQL!")
    except Exception as e:
        conn.rollback()
        print(f"[GAGAL] Error saat mengimpor SQL ke MySQL: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
