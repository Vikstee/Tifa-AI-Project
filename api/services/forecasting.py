import pandas as pd
import numpy as np

def process_cashflow_prediction(supabase, request_data):
    if not supabase:
        return {"error": "Supabase not configured"}
    try:
        months_ahead = request_data.get('months_ahead', 3)
        
        # Fetch cash flow data from data_po-cashin table
        res = supabase.table("data_po-cashin").select("period, cash_in, bast_amount").execute()
        
        df = pd.DataFrame(res.data)
        
        if df.empty:
            return {"error": "No data available for forecasting in data_po-cashin"}
            
        df['date'] = pd.to_datetime(df['period'], errors='coerce')
        df = df.dropna(subset=['date'])
        df['cash_in'] = pd.to_numeric(df['cash_in'], errors='coerce').fillna(0)
        
        # Group by month
        df_m = df.groupby(df['date'].dt.to_period('M')).agg({'cash_in': 'sum'}).reset_index()
        df_m['date'] = df_m['date'].dt.to_timestamp()
        
        if len(df_m) < 2:
            total_cash_in = float(df['cash_in'].sum())
            return {
                "warning": "Data historis singkat. Menggunakan proyeksi berbasis tren transaksi berjalan.",
                "predictions": [
                    {
                        "period": (pd.Timestamp.now() + pd.DateOffset(months=i)).strftime("%Y-%m"),
                        "predicted_cash_in": round(total_cash_in * (1 + (i * 0.05)), 2)
                    } for i in range(1, months_ahead + 1)
                ]
            }
            
        x = np.arange(len(df_m))
        y = df_m['cash_in'].values
        
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        last_date = df_m['date'].max()
        predictions = []
        for i in range(1, months_ahead + 1):
            next_date = last_date + pd.DateOffset(months=i)
            pred_val = float(max(0, p(len(df_m) + i - 1)))
            predictions.append({
                "period": next_date.strftime("%Y-%m"),
                "predicted_cash_in": round(pred_val, 2)
            })
            
        return {
            "historical_months_analyzed": len(df_m),
            "trend_slope": round(float(z[0]), 2),
            "predictions": predictions
        }
    except Exception as e:
        return {"error": str(e)}
