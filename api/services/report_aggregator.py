import pandas as pd

def process_report_aggregation(supabase, request_data):
    if not supabase:
        return {"error": "Supabase not configured"}
    try:
        table = request_data.get('table', 'data_po-cashin')
        
        # Fetch all rows for complete aggregation
        res = supabase.table(table).select("*").execute()
        df = pd.DataFrame(res.data)
        
        if df.empty:
            return {"error": "Data table is empty"}

        # Standardize numeric columns
        num_cols = ['nilai_rkap', 'revenue', 'total_invoice', 'cash_in', 'pinalty', 'po_open', 'remaining_bast']
        for col in num_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            else:
                df[col] = 0

        # Calculate Overall Key Metrics
        total_rkap = float(df['nilai_rkap'].sum())
        total_revenue = float(df['revenue'].sum())
        total_invoice = float(df['total_invoice'].sum())
        total_cash_in = float(df['cash_in'].sum())
        total_outstanding = max(0.0, total_invoice - total_cash_in)

        pct_achievement = (total_revenue / total_rkap * 100) if total_rkap > 0 else 0
        pct_collection = (total_cash_in / total_invoice * 100) if total_invoice > 0 else 0
        pct_conversion = (total_cash_in / total_revenue * 100) if total_revenue > 0 else 0

        summary_kpi = {
            "total_rkap": total_rkap,
            "total_revenue": total_revenue,
            "total_invoice": total_invoice,
            "total_cash_in": total_cash_in,
            "total_outstanding": total_outstanding,
            "pct_achievement_rkap": round(pct_achievement, 2),
            "pct_collection_rate": round(pct_collection, 2),
            "pct_conversion_rate": round(pct_conversion, 2),
            "total_rows": len(df)
        }

        # 1. Monthly Trend
        monthly_trend = []
        if 'periode' in df.columns:
            m_df = df.groupby('periode').agg({
                'nilai_rkap': 'sum',
                'revenue': 'sum',
                'total_invoice': 'sum',
                'cash_in': 'sum'
            }).reset_index().sort_values('periode')
            
            for _, row in m_df.iterrows():
                rev = float(row['revenue'])
                inv = float(row['total_invoice'])
                cin = float(row['cash_in'])
                col_rate = (cin / inv * 100) if inv > 0 else 0.0
                monthly_trend.append({
                    "periode": str(row['periode']),
                    "rkap": float(row['nilai_rkap']),
                    "revenue": rev,
                    "invoice": inv,
                    "cash_in": cin,
                    "collection_rate": round(col_rate, 2)
                })

        # 2. Portfolio Breakdown
        portfolio_breakdown = []
        if 'portfolio' in df.columns:
            p_df = df.groupby('portfolio').agg({
                'nilai_rkap': 'sum',
                'revenue': 'sum',
                'cash_in': 'sum',
                'total_invoice': 'sum'
            }).reset_index().sort_values('revenue', ascending=False)

            for _, row in p_df.iterrows():
                cin = float(row['cash_in'])
                inv = float(row['total_invoice'])
                col_rate = (cin / inv * 100) if inv > 0 else 0.0
                portfolio_breakdown.append({
                    "portfolio": str(row['portfolio']),
                    "rkap": float(row['nilai_rkap']),
                    "revenue": float(row['revenue']),
                    "cash_in": cin,
                    "invoice": inv,
                    "collection_rate": round(col_rate, 2)
                })

        # 3. Segment Breakdown
        segment_breakdown = []
        if 'segment' in df.columns:
            s_df = df.groupby('segment').agg({
                'nilai_rkap': 'sum',
                'revenue': 'sum',
                'cash_in': 'sum',
                'total_invoice': 'sum'
            }).reset_index().sort_values('revenue', ascending=False)

            for _, row in s_df.iterrows():
                cin = float(row['cash_in'])
                inv = float(row['total_invoice'])
                col_rate = (cin / inv * 100) if inv > 0 else 0.0
                segment_breakdown.append({
                    "segment": str(row['segment']),
                    "rkap": float(row['nilai_rkap']),
                    "revenue": float(row['revenue']),
                    "cash_in": cin,
                    "invoice": inv,
                    "collection_rate": round(col_rate, 2)
                })

        # 4. Top Customers by Revenue
        top_customers = []
        cust_col = 'customer_name' if 'customer_name' in df.columns else ('customer' if 'customer' in df.columns else None)
        if cust_col:
            c_df = df.groupby(cust_col).agg({
                'revenue': 'sum',
                'cash_in': 'sum',
                'total_invoice': 'sum'
            }).reset_index().sort_values('revenue', ascending=False).head(10)

            for _, row in c_df.iterrows():
                cin = float(row['cash_in'])
                inv = float(row['total_invoice'])
                top_customers.append({
                    "customer": str(row[cust_col]),
                    "revenue": float(row['revenue']),
                    "cash_in": cin,
                    "outstanding": max(0.0, inv - cin)
                })

        # 5. Top LOP Groups by RKAP
        top_lop_groups = []
        lop_col = 'lop_group' if 'lop_group' in df.columns else None
        if lop_col:
            l_df = df.groupby(lop_col).agg({
                'nilai_rkap': 'sum',
                'revenue': 'sum'
            }).reset_index().sort_values('nilai_rkap', ascending=False).head(10)

            for _, row in l_df.iterrows():
                top_lop_groups.append({
                    "lop_group": str(row[lop_col]),
                    "rkap": float(row['nilai_rkap']),
                    "revenue": float(row['revenue'])
                })

        # 6. Data Quality Gaps & Anomaly Scanner
        quality_gaps = []
        for col in ['pinalty', 'po_open', 'remaining_bast']:
            if col in df.columns:
                non_zero_count = (df[col] != 0).sum()
                if non_zero_count == 0:
                    quality_gaps.append(f"Kolom '{col}' kosong (nilai 0) di seluruh {len(df)} baris data.")

        # Zero Cash In Segments Check
        zero_cin_segments = []
        for seg in segment_breakdown:
            if seg['revenue'] > 0 and seg['cash_in'] == 0:
                zero_cin_segments.append(seg['segment'])

        if zero_cin_segments:
            quality_gaps.append(f"Segmen berikut mencatatkan revenue tetapi belum mencatatkan cash-in sama sekali (0%): {', '.join(zero_cin_segments)}.")

        return {
            "summary_kpi": summary_kpi,
            "monthly_trend": monthly_trend,
            "portfolio_breakdown": portfolio_breakdown,
            "segment_breakdown": segment_breakdown,
            "top_customers": top_customers,
            "top_lop_groups": top_lop_groups,
            "quality_gaps": quality_gaps
        }
    except Exception as e:
        return {"error": str(e)}
