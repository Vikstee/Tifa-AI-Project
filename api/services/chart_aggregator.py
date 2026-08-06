import pandas as pd
from services.db_helper import fetch_table_data

def process_chart_aggregation(db_client, request_data):
    try:
        table = request_data.get('table', 'data_po-cashin')
        group_by = request_data.get('group_by', 'portfolio')
        sum_col = request_data.get('sum_col', 'revenue')
        
        rows = fetch_table_data(table, f"`{group_by}`, `{sum_col}`")
        df = pd.DataFrame(rows)
        
        if df.empty:
            return {"data": []}
            
        df[sum_col] = pd.to_numeric(df[sum_col], errors='coerce').fillna(0)
        agg_df = df.groupby(group_by)[sum_col].sum().reset_index()
        
        # Sort descending and limit to top 15
        agg_df = agg_df.sort_values(by=sum_col, ascending=False)
        
        others_sum = 0
        if len(agg_df) > 15:
            others_sum = agg_df.iloc[15:][sum_col].sum()
            agg_df = agg_df.iloc[:15]
        
        # Format for Recharts
        chart_data = []
        for _, row in agg_df.iterrows():
            chart_data.append({
                "kategori": str(row[group_by]),
                "Total": float(row[sum_col])
            })
            
        if others_sum > 0:
            chart_data.append({
                "kategori": "Lainnya",
                "Total": float(others_sum)
            })
            
        return {"data": chart_data, "message": f"Data diagregasi dari {len(df)} baris (Top 15)."}
    except Exception as e:
        return {"error": str(e)}
