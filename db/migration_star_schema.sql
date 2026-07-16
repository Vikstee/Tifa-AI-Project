-- ================================================================
-- MIGRASI DATABASE TIFA V2: Star Schema (Optimized for AI Text-to-SQL)
-- ================================================================

-- 1. DROP TABEL MILESTONE LAMA (jika ada)
DROP TABLE IF EXISTS rkap_stg CASCADE;
DROP TABLE IF EXISTS po_amount CASCADE;
DROP TABLE IF EXISTS outlook_amount CASCADE;
DROP TABLE IF EXISTS bast_amount_app2 CASCADE;
DROP TABLE IF EXISTS revenue CASCADE;
DROP TABLE IF EXISTS invoice CASCADE;
DROP TABLE IF EXISTS cash_in CASCADE;

-- 2. PASTIKAN TABEL PROJECTS ADA DAN MEMILIKI UNIQUE SID
CREATE TABLE IF NOT EXISTS projects (
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

-- 3. BUAT TABEL FAKTA TUNGGAL: project_metrics
-- Menggabungkan semua metrik keuangan per project per bulan
CREATE TABLE project_metrics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
    period            VARCHAR(20) NOT NULL,
    
    rkap              NUMERIC(20, 2),
    rkap_stg          NUMERIC(20, 2),
    
    po_amount         NUMERIC(20, 2),
    po_amount_co      NUMERIC(20, 2),
    po_open           NUMERIC(20, 2),
    
    outlook_amount    NUMERIC(20, 2),
    
    bast_amount       NUMERIC(20, 2),
    bast_amount_app1  NUMERIC(20, 2),
    bast_amount_app2  NUMERIC(20, 2),
    remaining_bast    NUMERIC(20, 2),
    
    revenue           NUMERIC(20, 2),
    
    invoice           NUMERIC(20, 2),
    clearing_number   TEXT,
    
    cash_in           NUMERIC(20, 2),
    pinalty           NUMERIC(20, 2),
    accrue_date       TIMESTAMPTZ,
    
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    
    -- UNIQUE constraint mencegah duplikasi data per bulan per project.
    -- Sangat berguna untuk operasi UPSERT saat import bulanan.
    UNIQUE(project_id, period)
);

-- 4. INDEX UNTUK PERFORMA
CREATE INDEX IF NOT EXISTS idx_project_metrics_project_id ON project_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_period ON project_metrics(period);

-- ================================================================
-- DONE.
