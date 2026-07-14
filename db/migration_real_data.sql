-- ================================================================
-- MIGRASI DATABASE TIFA: Data Riil TelkomInfra
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. DROP TABEL DUMMY LAMA
-- (tabel aplikasi seperti chat_sessions, chat_messages TIDAK disentuh)
DROP TABLE IF EXISTS cash_in CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Hapus juga tabel baru jika sudah pernah dibuat sebelumnya (idempotent)
DROP TABLE IF EXISTS rkap_stg CASCADE;
DROP TABLE IF EXISTS po_amount CASCADE;
DROP TABLE IF EXISTS outlook_amount CASCADE;
DROP TABLE IF EXISTS bast_amount_app2 CASCADE;
DROP TABLE IF EXISTS revenue CASCADE;
DROP TABLE IF EXISTS invoice CASCADE;
DROP TABLE IF EXISTS cash_in CASCADE;

-- ================================================================
-- 2. BUAT TABEL MASTER: projects
-- (Data induk proyek — tidak berulang per periode)
-- ================================================================
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sid         VARCHAR(100) UNIQUE NOT NULL,
    io_number   VARCHAR(100),
    project_name TEXT,
    customer    VARCHAR(255),
    portfolio   VARCHAR(50),
    segment     VARCHAR(50),
    lop_group_name VARCHAR(100),
    funnel      VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. BUAT TABEL MILESTONE
-- ================================================================

-- Milestone 1: Nilai RKAP
CREATE TABLE rkap_stg (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL,
    rkap        NUMERIC(20, 2),
    rkap_stg    NUMERIC(20, 2),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 2: Nilai PO
CREATE TABLE po_amount (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL,
    po_amount   NUMERIC(20, 2),
    po_amount_co NUMERIC(20, 2),
    po_open     NUMERIC(20, 2),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 3: Nilai Outlook
CREATE TABLE outlook_amount (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL,
    outlook_amount NUMERIC(20, 2),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 4: Nilai BAST
CREATE TABLE bast_amount_app2 (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    period          VARCHAR(20) NOT NULL,
    bast_amount     NUMERIC(20, 2),
    bast_amount_app1 NUMERIC(20, 2),
    bast_amount_app2 NUMERIC(20, 2),
    remaining_bast  NUMERIC(20, 2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 5: Nilai Revenue
CREATE TABLE revenue (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL,
    revenue     NUMERIC(20, 2),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 6: Nilai Invoice
CREATE TABLE invoice (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    period          VARCHAR(20) NOT NULL,
    invoice         NUMERIC(20, 2),
    clearing_number TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone 7: Nilai CashIn
CREATE TABLE cash_in (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    period      VARCHAR(20) NOT NULL,
    cash_in     NUMERIC(20, 2),
    pinalty     NUMERIC(20, 2),
    accrue_date TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. INDEX untuk performa query
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_rkap_stg_project_period    ON rkap_stg(project_id, period);
CREATE INDEX IF NOT EXISTS idx_po_amount_project_period    ON po_amount(project_id, period);
CREATE INDEX IF NOT EXISTS idx_outlook_project_period      ON outlook_amount(project_id, period);
CREATE INDEX IF NOT EXISTS idx_bast_project_period         ON bast_amount_app2(project_id, period);
CREATE INDEX IF NOT EXISTS idx_revenue_project_period      ON revenue(project_id, period);
CREATE INDEX IF NOT EXISTS idx_invoice_project_period      ON invoice(project_id, period);
CREATE INDEX IF NOT EXISTS idx_cash_in_project_period      ON cash_in(project_id, period);

CREATE INDEX IF NOT EXISTS idx_projects_portfolio  ON projects(portfolio);
CREATE INDEX IF NOT EXISTS idx_projects_segment    ON projects(segment);
CREATE INDEX IF NOT EXISTS idx_projects_sid        ON projects(sid);

-- ================================================================
-- DONE. Jalankan script Python import_excel_to_supabase.py
-- untuk mengisi data dari Excel.
-- ================================================================
