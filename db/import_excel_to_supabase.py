import openpyxl
import os
import sys
import json
import requests
from datetime import datetime
import time

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

def rest_insert(table: str, rows: list, retries: int = 3, prefer: str = "return=representation", on_conflict: str = None):
    """Insert rows via Supabase REST API with retry on transient errors. Can be configured for UPSERT."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    
    headers = {**HEADERS, "Prefer": prefer}
    for attempt in range(retries):
        try:
            res = requests.post(url, headers=headers, data=json.dumps(rows), timeout=30)
            if res.status_code in (200, 201):
                # Return json if it returns representation
                if prefer == "return=representation" or "resolution=merge-duplicates" in prefer:
                    if res.text.strip():
                        return res.json()
                return []
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
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val)

def normalize_period(period_str):
    if not period_str:
        return None
    parts = str(period_str).split('-')
    if len(parts) == 2:
        year, month = parts
        return f"{year}-{month.zfill(2)}"
    return str(period_str)

def batch_insert(table: str, rows: list, label: str):
    if not rows:
        print(f"  [{label}] No rows to insert, skipping.")
        return
    
    total = len(rows)
    inserted = 0
    errors = 0
    
    # Use UPSERT (resolution=merge-duplicates) so we don't duplicate on re-run
    # For project_metrics, the UNIQUE constraint is on (project_id, period), we don't strictly need on_conflict in url if we use primary key, wait, we need it if we are conflicting on unique constraint.
    # The unique constraint is on (project_id, period)
    prefer_header = "resolution=merge-duplicates,return=minimal"
    
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            rest_insert(table, batch, prefer=prefer_header, on_conflict="project_id,period")
            inserted += len(batch)
            print(f"  [{label}] Inserted/Updated {inserted}/{total}...", end='\r')
        except Exception as e:
            errors += len(batch)
            print(f"\n  [{label}] ERROR at batch {i//BATCH_SIZE + 1}: {e}")
    
    print(f"\n  [{label}] Done: {inserted} inserted/updated, {errors} failed out of {total}")

# -------------------------------------
# MAIN
# -------------------------------------
def main():
    print("=" * 60)
    print("TIFA Database Import V2: Cash-In-Report.xlsx -> Supabase (Star Schema)")
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
    
    # 2. Read Excel
    print(f"\n[2/3] Reading Excel: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb['Sheet1']
    
    all_rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"  OK Read {len(all_rows)} rows")
    
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
    
    # Insert projects using UPSERT
    print("  Inserting/Updating projects table...")
    project_rows = list(unique_projects.values())
    
    for i in range(0, len(project_rows), BATCH_SIZE):
        batch = project_rows[i:i + BATCH_SIZE]
        try:
            # UPSERT on conflict
            rest_insert("projects", batch, prefer="resolution=merge-duplicates,return=minimal", on_conflict="sid")
            print(f"  [projects] Upserted {min(i+BATCH_SIZE, len(project_rows))}/{len(project_rows)}...", end='\r')
        except Exception as e:
            print(f"\n  [projects] ERROR: {e}")
            sys.exit(1)
    
    print(f"\n  [projects] OK")
    
    # Fetch ALL projects from DB to get confirmed UUIDs
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
    
    for p in confirmed_projects:
        project_map[p['sid']] = p['id']
    
    # 4. Build project_metrics rows
    print("\n  Building project_metrics rows (Aggregating duplicates)...")
    metrics_dict = {}
    
    skipped = 0
    for row in all_rows:
        sid = to_str(row[7])
        project_id = project_map.get(sid)
        
        if not project_id:
            skipped += 1
            continue
        
        period = normalize_period(row[1])
        key = (project_id, period)
        
        if key not in metrics_dict:
            metrics_dict[key] = {
                "project_id":        project_id,
                "period":            period,
                "rkap":              0.0,
                "rkap_stg":          0.0,
                "po_amount":         0.0,
                "po_amount_co":      0.0,
                "po_open":           0.0,
                "outlook_amount":    0.0,
                "bast_amount":       0.0,
                "bast_amount_app1":  0.0,
                "bast_amount_app2":  0.0,
                "remaining_bast":    0.0,
                "revenue":           0.0,
                "invoice":           0.0,
                "clearing_number":   None,
                "cash_in":           0.0,
                "pinalty":           0.0,
                "accrue_date":       None,
            }
        
        m = metrics_dict[key]
        
        def add_val(current, new_val):
            v = to_float(new_val)
            return current + v if v else current
            
        m["rkap"] = add_val(m["rkap"], row[11])
        m["rkap_stg"] = add_val(m["rkap_stg"], row[12])
        m["po_amount"] = add_val(m["po_amount"], row[13])
        m["po_amount_co"] = add_val(m["po_amount_co"], row[14])
        m["po_open"] = add_val(m["po_open"], row[16])
        m["outlook_amount"] = add_val(m["outlook_amount"], row[17])
        m["bast_amount"] = add_val(m["bast_amount"], row[15])
        m["bast_amount_app1"] = add_val(m["bast_amount_app1"], row[18])
        m["bast_amount_app2"] = add_val(m["bast_amount_app2"], row[19])
        m["remaining_bast"] = add_val(m["remaining_bast"], row[21])
        m["revenue"] = add_val(m["revenue"], row[20])
        m["invoice"] = add_val(m["invoice"], row[22])
        m["cash_in"] = add_val(m["cash_in"], row[24])
        m["pinalty"] = add_val(m["pinalty"], row[25])
        
        c_num = to_str(row[23])
        if c_num:
            m["clearing_number"] = c_num
            
        a_date = to_datetime_str(row[2])
        if a_date:
            m["accrue_date"] = a_date

    # Clean up 0.0 back to None for cleaner DB
    metrics_rows = []
    for m in metrics_dict.values():
        for k, v in m.items():
            if isinstance(v, float) and v == 0.0:
                m[k] = None
        metrics_rows.append(m)
        
    if skipped:
        print(f"  [WARNING] Skipped {skipped} rows (SID not found in projects)")
    
    print(f"  OK Built {len(metrics_rows)} rows for project_metrics table")
    
    # 5. Insert project_metrics
    print("\n  Inserting project_metrics table...")
    batch_insert("project_metrics", metrics_rows, "project_metrics")
    
    print("\n" + "=" * 60)
    print("[OK] IMPORT SELESAI (V2)!")
    print(f"   Projects        : {len(project_rows)} baris")
    print(f"   Project Metrics : {len(metrics_rows)} baris")
    print("=" * 60)

if __name__ == "__main__":
    main()
