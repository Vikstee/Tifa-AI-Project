import pandas as pd

def process_chart_aggregation(supabase, request_data):
    if not supabase:
        return {"error": "Supabase not configured"}
    try:
        table = request_data.get('table', 'purchase_orders')
        group_by = request_data.get('group_by', 'status')
        sum_col = request_data.get('sum_col', 'amount')
        
        res = supabase.table(table).select(f"{group_by}, {sum_col}").execute()
        df = pd.DataFrame(res.data)
        
        if df.empty:
            return {"data": []}
            
        df[sum_col] = pd.to_numeric(df[sum_col], errors='coerce').fillna(0)
        agg_df = df.groupby(group_by)[sum_col].sum().reset_index()
        
        # Format for Recharts
        chart_data = []
        for _, row in agg_df.iterrows():
            chart_data.append({
                "kategori": str(row[group_by]),
                "Total": float(row[sum_col])
            })
            
        return {"data": chart_data, "message": f"Data diagregasi dari {len(df)} baris menggunakan Pandas."}
    except Exception as e:
        return {"error": str(e)}
