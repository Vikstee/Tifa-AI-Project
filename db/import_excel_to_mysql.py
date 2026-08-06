import openpyxl
import os
import sys
import pymysql
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

EXCEL_PATH = r"d:\coding\Tifa\docs\Cash-In-Report.xlsx"

def to_float(val):
    if val is None:
        return 0.0
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0

def to_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None

def main():
    print("=" * 60)
    print("TIFA MySQL Database Import: Cash-In-Report.xlsx -> MySQL (`data_po-cashin`)")
    print("=" * 60)

    if not os.path.exists(EXCEL_PATH):
        print(f"File Excel tidak ditemukan di: {EXCEL_PATH}")
        sys.exit(1)

    print(f"\n[1/2] Membaca file Excel: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb['Sheet1']
    all_rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"  OK: Berhasil membaca {len(all_rows)} baris data.")

    print("\n[2/2] Mengimpor data ke MySQL tabel `data_po-cashin`...")
    conn = get_mysql_connection()

    sql = """
        INSERT INTO `data_po-cashin` (
            period, accrue_date, funnel, lop_group_name, portfolio, segment,
            sid, io_number, project_name, customer, rkap, rkap_stg,
            po_amount, po_amount_co, bast_amount, po_open, outlook_amount,
            bast_amount_app1, bast_amount_app2, revenue, remaining_bast,
            invoice, clearing_number, cash_in, pinalty
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s
        )
    """

    inserted = 0
    try:
        with conn.cursor() as cursor:
            # Kosongkan tabel sebelum impor ulang
            cursor.execute("TRUNCATE TABLE `data_po-cashin`")

            for row in all_rows:
                period = to_str(row[1])
                accrue_date = row[2] if hasattr(row[2], 'strftime') else None
                funnel = to_str(row[3])
                lop_group_name = to_str(row[4])
                portfolio = to_str(row[5])
                segment = to_str(row[6])
                sid = to_str(row[7])
                io_number = to_str(row[8])
                project_name = to_str(row[9])
                customer = to_str(row[10])
                rkap = to_float(row[11])
                rkap_stg = to_float(row[12])
                po_amount = to_float(row[13])
                po_amount_co = to_float(row[14])
                bast_amount = to_float(row[15])
                po_open = to_float(row[16])
                outlook_amount = to_float(row[17])
                bast_amount_app1 = to_float(row[18])
                bast_amount_app2 = to_float(row[19])
                revenue = to_float(row[20])
                remaining_bast = to_float(row[21])
                invoice = to_float(row[22])
                clearing_number = to_str(row[23])
                cash_in = to_float(row[24])
                pinalty = to_float(row[25])

                cursor.execute(sql, (
                    period, accrue_date, funnel, lop_group_name, portfolio, segment,
                    sid, io_number, project_name, customer, rkap, rkap_stg,
                    po_amount, po_amount_co, bast_amount, po_open, outlook_amount,
                    bast_amount_app1, bast_amount_app2, revenue, remaining_bast,
                    invoice, clearing_number, cash_in, pinalty
                ))
                inserted += 1

        conn.commit()
        print(f"[SUKSES] Berhasil mengimpor {inserted} baris data ke tabel `data_po-cashin` MySQL!")
    except Exception as e:
        conn.rollback()
        print(f"[GAGAL] Mengimpor ke MySQL: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
