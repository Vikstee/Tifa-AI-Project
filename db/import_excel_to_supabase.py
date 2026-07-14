import openpyxl
import os
import sys
import json
import requests
from datetime import datetime

# -------------------------------------
# CONFIG
# -------------------------------------
SUPABASE_URL = "https://fogaxcnfmuuqgazbgnjd.supabase.co"
SUPABASE_KEY = "sb_publishable_qtlYVV1SYYHg3tcZr427yQ_WuJnDhY5"

EXCEL_PATH = r"d:\coding\Tifa\docs\Cash-In-Report.xlsx"
BATCH_SIZE = 50

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

import time

def rest_insert(table: str, rows: list, retries: int = 3):
    """Insert rows via Supabase REST API with retry on transient errors"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    for attempt in range(retries):
        try:
            res = requests.post(url, headers=HEADERS, data=json.dumps(rows), timeout=30)
            if res.status_code in (200, 201):
                return res.json()
            elif res.status_code in (522, 524, 502, 503):
                wait = 2 ** attempt
                print(f"\n  [RETRY] HTTP {res.status_code} on {table}, waiting {wait}s...")
                time.sleep(wait)
                continue
            else:
                raise Exception(f"HTTP {res.status_code}: {res.text[:300]}")
        except requests.exceptions.Timeout:
            wait = 2 ** attempt
            print(f"\n  [RETRY] Timeout on {table}, waiting {wait}s...")
            time.sleep(wait)
        except requests.exceptions.ConnectionError:
            wait = 2 ** attempt
            print(f"\n  [RETRY] Connection error on {table}, waiting {wait}s...")
            time.sleep(wait)
    raise Exception(f"Failed after {retries} retries on {table}")

# -------------------------------------
# HELPERS
# -------------------------------------
def to_float(val):
    """Convert ke float, None jika tidak valid atau 0"""
    if val is None:
        return None
    try:
        f = float(val)
        return f if f != 0.0 else None
    except (TypeError, ValueError):
        return None

def to_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None

def to_datetime_str(val):
    """Convert datetime/date ke ISO string untuk Supabase"""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val)

def normalize_period(period_str):
    """Normalize '2026-1' -> '2026-01'"""
    if not period_str:
        return None
    parts = str(period_str).split('-')
    if len(parts) == 2:
        year, month = parts
        return f"{year}-{month.zfill(2)}"
    return str(period_str)

def batch_insert(table: str, rows: list, label: str):
    """Insert rows in batches with progress reporting"""
    if not rows:
        print(f"  [{label}] No rows to insert, skipping.")
        return
    
    total = len(rows)
    inserted = 0
    errors = 0
    
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            rest_insert(table, batch)
            inserted += len(batch)
            print(f"  [{label}] Inserted {inserted}/{total}...", end='\r')
        except Exception as e:
            errors += len(batch)
            print(f"\n  [{label}] ERROR at batch {i//BATCH_SIZE + 1}: {e}")
    
    print(f"\n  [{label}] Done: {inserted} inserted, {errors} failed out of {total}")

# -------------------------------------
# MAIN
# -------------------------------------
def main():
    print("=" * 60)
    print("TIFA Database Import: Cash-In-Report.xlsx -> Supabase")
    print("=" * 60)
    
    # 1. Test connection
    print("\n[1/3] Connecting to Supabase...")
    test_res = requests.get(f"{SUPABASE_URL}/rest/v1/projects?select=id&limit=1", headers=HEADERS)
    if test_res.status_code in (200, 206):
        print("  Connected! (projects table accessible)")
    elif test_res.status_code == 401:
        print(f"  WARNING: Auth issue ({test_res.status_code}). Trying to continue...")
    else:
        print(f"  Connection test: {test_res.status_code} - {test_res.text[:200]}")
    
    # 1b. Clear existing data
    print("\n  Clearing existing data...")
    delete_headers = {**HEADERS, "Prefer": "return=minimal"}
    tables_to_clear = ["rkap_stg", "po_amount", "outlook_amount", "bast_amount_app2", "revenue", "invoice", "cash_in", "projects"]
    for tbl in tables_to_clear:
        try:
            del_res = requests.delete(
                f"{SUPABASE_URL}/rest/v1/{tbl}?id=neq.00000000-0000-0000-0000-000000000000",
                headers=delete_headers,
                timeout=30
            )
            print(f"  Cleared {tbl}: HTTP {del_res.status_code}")
        except requests.exceptions.Timeout:
            print(f"  [WARNING] Timeout clearing {tbl}, skipping (will use upsert)")
        except Exception as e:
            print(f"  [WARNING] Error clearing {tbl}: {e}")
    
    # 2. Read Excel
    print(f"\n[2/3] Reading Excel: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb['Sheet1']
    
    all_rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"  OK Read {len(all_rows)} rows")
    
    # Columns (0-indexed):
    # 0:id, 1:period, 2:accrue_date, 3:funnel, 4:lop_group_name, 5:portfolio,
    # 6:segment, 7:sid, 8:io_number, 9:project_name, 10:customer, 11:rkap,
    # 12:rkap_stg, 13:po_amount, 14:po_amount_co, 15:bast_amount, 16:po_open,
    # 17:outlook_amount, 18:bast_amount_app1, 19:bast_amount_app2, 20:revenue,
    # 21:remaining_bast, 22:invoice, 23:clearing_number, 24:cash_in,
    # 25:pinalty, 26:created_at, 27:updated_at
    
    # 3. Extract unique projects
    print("\n[3/3] Processing data...")
    print("  Extracting unique projects...")
    
    project_map = {}  # sid -> uuid (will be assigned by Supabase)
    unique_projects = {}  # sid -> project data
    
    for row in all_rows:
        sid = to_str(row[7])
        if not sid or sid in unique_projects:
            continue
        unique_projects[sid] = {
            "sid":            sid,
            "io_number":      to_str(row[8]),
            "project_name":   to_str(row[9]),
            "customer":       to_str(row[10]),
            "portfolio":      to_str(row[5]),
            "segment":        to_str(row[6]),
            "lop_group_name": to_str(row[4]),
            "funnel":         to_str(row[3]),
        }
    
    print(f"  Found {len(unique_projects)} unique projects")
    
    # Insert projects and capture returned IDs
    print("  Inserting projects table...")
    project_rows = list(unique_projects.values())
    
    all_inserted_projects = []
    for i in range(0, len(project_rows), BATCH_SIZE):
        batch = project_rows[i:i + BATCH_SIZE]
        try:
            result = rest_insert("projects", batch)
            all_inserted_projects.extend(result)
            print(f"  [projects] Inserted {min(i+BATCH_SIZE, len(project_rows))}/{len(project_rows)}...", end='\r')
        except Exception as e:
            print(f"\n  [projects] ERROR: {e}")
            sys.exit(1)
    
    print(f"\n  [projects] OK {len(all_inserted_projects)} projects inserted")
    
    # Fetch ALL projects from DB to get confirmed UUIDs (more reliable than insert return)
    print("  Fetching confirmed project IDs from DB...")
    confirmed_projects = []
    page = 0
    page_size = 500
    while True:
        fetch_res = requests.get(
            f"{SUPABASE_URL}/rest/v1/projects?select=id,sid&limit={page_size}&offset={page * page_size}",
            headers=HEADERS,
            timeout=30
        )
        if fetch_res.status_code != 200:
            print(f"  ERROR fetching projects: {fetch_res.status_code} {fetch_res.text[:200]}")
            sys.exit(1)
        batch_data = fetch_res.json()
        confirmed_projects.extend(batch_data)
        if len(batch_data) < page_size:
            break
        page += 1
    
    print(f"  Confirmed {len(confirmed_projects)} projects in DB")
    
    # Build sid -> id map from confirmed DB data
    for p in confirmed_projects:
        project_map[p['sid']] = p['id']
    
    # 4. Build milestone rows
    print("\n  Building milestone rows...")
    rkap_rows       = []
    po_rows         = []
    outlook_rows    = []
    bast_rows       = []
    revenue_rows    = []
    invoice_rows    = []
    cash_in_rows    = []
    
    skipped = 0
    for row in all_rows:
        sid = to_str(row[7])
        project_id = project_map.get(sid)
        
        if not project_id:
            skipped += 1
            continue
        
        period = normalize_period(row[1])
        
        rkap_rows.append({
            "project_id": project_id,
            "period":     period,
            "rkap":       to_float(row[11]),
            "rkap_stg":   to_float(row[12]),
        })
        
        po_rows.append({
            "project_id":   project_id,
            "period":       period,
            "po_amount":    to_float(row[13]),
            "po_amount_co": to_float(row[14]),
            "po_open":      to_float(row[16]),
        })
        
        outlook_rows.append({
            "project_id":     project_id,
            "period":         period,
            "outlook_amount": to_float(row[17]),
        })
        
        bast_rows.append({
            "project_id":        project_id,
            "period":            period,
            "bast_amount":       to_float(row[15]),
            "bast_amount_app1":  to_float(row[18]),
            "bast_amount_app2":  to_float(row[19]),
            "remaining_bast":    to_float(row[21]),
        })
        
        revenue_rows.append({
            "project_id": project_id,
            "period":     period,
            "revenue":    to_float(row[20]),
        })
        
        invoice_rows.append({
            "project_id":     project_id,
            "period":         period,
            "invoice":        to_float(row[22]),
            "clearing_number": to_str(row[23]),
        })
        
        cash_in_rows.append({
            "project_id": project_id,
            "period":     period,
            "cash_in":    to_float(row[24]),
            "pinalty":    to_float(row[25]),
            "accrue_date": to_datetime_str(row[2]),
        })
    
    if skipped:
        print(f"  [WARNING] Skipped {skipped} rows (SID not found in projects)")
    
    print(f"  OK Built {len(rkap_rows)} rows for each milestone table")
    
    # 5. Insert milestone tables
    print("\n  Inserting milestone tables...")
    batch_insert("rkap_stg",        rkap_rows,     "rkap_stg")
    batch_insert("po_amount",        po_rows,       "po_amount")
    batch_insert("outlook_amount",   outlook_rows,  "outlook_amount")
    batch_insert("bast_amount_app2", bast_rows,     "bast_amount_app2")
    batch_insert("revenue",          revenue_rows,  "revenue")
    batch_insert("invoice",          invoice_rows,  "invoice")
    batch_insert("cash_in",          cash_in_rows,  "cash_in")
    
    print("\n" + "=" * 60)
    print("[OK] IMPORT SELESAI!")
    print(f"   Projects   : {len(all_inserted_projects)} baris")
    print(f"   rkap_stg   : {len(rkap_rows)} baris")
    print(f"   po_amount  : {len(po_rows)} baris")
    print(f"   outlook    : {len(outlook_rows)} baris")
    print(f"   bast_app2  : {len(bast_rows)} baris")
    print(f"   revenue    : {len(revenue_rows)} baris")
    print(f"   invoice    : {len(invoice_rows)} baris")
    print(f"   cash_in    : {len(cash_in_rows)} baris")
    print("=" * 60)

if __name__ == "__main__":
    main()

