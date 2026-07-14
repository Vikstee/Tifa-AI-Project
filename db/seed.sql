-- ==========================================
-- SCRIPT RESET & MASS SEED DATABASE (1000+ ROWS)
-- ==========================================

-- 1. DROP EXISTING TABLES (Hapus jika ada)
DROP TABLE IF EXISTS cash_in CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- 2. CREATE TABLES
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    credit_score INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    contract_number VARCHAR(100) NOT NULL,
    value NUMERIC(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Ongoing',
    milestone_progress NUMERIC(5,2) DEFAULT 0,
    budget NUMERIC(15,2) NOT NULL,
    actual_cost NUMERIC(15,2) DEFAULT 0,
    profit NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    po_number VARCHAR(100) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    so_number VARCHAR(100) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    invoice_number VARCHAR(100) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Unpaid',
    due_date DATE NOT NULL,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cash_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    amount NUMERIC(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS & BYPASS FOR ANON (Agar AI bisa baca)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON contracts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sales_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON cash_in FOR SELECT USING (true);

-- 4. MASS INSERT DUMMY DATA USING PL/PGSQL (Ribuan Baris)
DO $$
DECLARE
    v_customer_id UUID;
    v_contract_id UUID;
    v_project_id UUID;
    v_invoice_id UUID;
    v_industries TEXT[] := ARRAY['Telecommunications', 'Energy', 'Banking', 'Automotive', 'Aviation', 'Healthcare', 'Retail'];
    v_statuses TEXT[] := ARRAY['Active', 'Expired', 'Terminated'];
    v_proj_statuses TEXT[] := ARRAY['Ongoing', 'Completed', 'On Hold'];
    v_doc_statuses TEXT[] := ARRAY['Pending', 'Approved', 'Rejected'];
    v_inv_statuses TEXT[] := ARRAY['Unpaid', 'Paid', 'Overdue'];
    i INT;
    j INT;
    k INT;
BEGIN
    -- 1. Insert 100 Customers
    FOR i IN 1..100 LOOP
        INSERT INTO customers (id, name, industry, credit_score, created_at)
        VALUES (
            gen_random_uuid(), 
            'PT Klien ' || i, 
            v_industries[1 + mod(i, 7)], 
            500 + floor(random() * 450)::INT,
            NOW() - (random() * interval '365 days')
        ) RETURNING id INTO v_customer_id;

        -- 2. Insert 3 Contracts per Customer (Total 300 Contracts)
        FOR j IN 1..3 LOOP
            INSERT INTO contracts (id, customer_id, contract_number, value, start_date, end_date, status, created_at)
            VALUES (
                gen_random_uuid(),
                v_customer_id,
                'CTR-' || i || '-' || j,
                100000000 + floor(random() * 900000000),
                CURRENT_DATE - (random() * interval '200 days'),
                CURRENT_DATE + (random() * interval '200 days'),
                v_statuses[1 + mod(j, 3)],
                NOW() - (random() * interval '365 days')
            ) RETURNING id INTO v_contract_id;

            -- 3. Insert 2 Projects per Contract (Total 600 Projects)
            FOR k IN 1..2 LOOP
                INSERT INTO projects (id, contract_id, name, status, milestone_progress, budget, actual_cost, profit, created_at)
                VALUES (
                    gen_random_uuid(),
                    v_contract_id,
                    'Proyek Infrastruktur ' || i || j || k,
                    v_proj_statuses[1 + mod(k, 3)],
                    floor(random() * 100),
                    50000000 + floor(random() * 450000000),
                    floor(random() * 400000000),
                    floor(random() * 100000000),
                    NOW() - (random() * interval '365 days')
                ) RETURNING id INTO v_project_id;

                -- 4. Insert 2 POs & SOs per Project (Total 1200 POs & 1200 SOs)
                INSERT INTO purchase_orders (project_id, po_number, amount, status, created_at)
                VALUES (v_project_id, 'PO-' || i || j || k || 'A', 10000000 + floor(random() * 50000000), v_doc_statuses[1 + mod(random()::INT * 100, 3)], NOW() - (random() * interval '100 days'));
                
                INSERT INTO purchase_orders (project_id, po_number, amount, status, created_at)
                VALUES (v_project_id, 'PO-' || i || j || k || 'B', 10000000 + floor(random() * 50000000), v_doc_statuses[1 + mod(random()::INT * 100, 3)], NOW() - (random() * interval '100 days'));

                INSERT INTO sales_orders (project_id, so_number, amount, status, created_at)
                VALUES (v_project_id, 'SO-' || i || j || k || 'A', 50000000 + floor(random() * 100000000), v_doc_statuses[1 + mod(random()::INT * 100, 3)], NOW() - (random() * interval '100 days'));
            END LOOP;
        END LOOP;

        -- 5. Insert 5 Invoices per Customer (Total 500 Invoices)
        FOR j IN 1..5 LOOP
            INSERT INTO invoices (id, customer_id, invoice_number, amount, status, due_date, payment_date, created_at)
            VALUES (
                gen_random_uuid(),
                v_customer_id,
                'INV-' || i || '-' || j,
                10000000 + floor(random() * 200000000),
                v_inv_statuses[1 + mod(j, 3)],
                CURRENT_DATE + (random() * interval '60 days') - interval '30 days',
                CASE WHEN mod(j, 3) = 1 THEN CURRENT_DATE - (random() * interval '30 days') ELSE NULL END,
                NOW() - (random() * interval '180 days')
            ) RETURNING id INTO v_invoice_id;

            -- 6. Insert Cash In for Paid Invoices (sekitar 33% dari invoice)
            IF mod(j, 3) = 1 THEN
                INSERT INTO cash_in (invoice_id, amount, payment_date, created_at)
                VALUES (
                    v_invoice_id,
                    10000000 + floor(random() * 200000000),
                    CURRENT_DATE - (random() * interval '30 days'),
                    NOW() - (random() * interval '30 days')
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
