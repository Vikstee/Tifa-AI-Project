import pandas as pd
import numpy as np

def process_cashflow_prediction(supabase, request_data):
    if not supabase:
        return {"error": "Supabase not configured"}
    try:
        months_ahead = request_data.get('months_ahead', 3)
        
        # Fetch cash flow data
        res_in = supabase.table("cash_in").select("date, amount").execute()
        res_out = supabase.table("cash_out").select("date, amount").execute()
        
        df_in = pd.DataFrame(res_in.data)
        df_out = pd.DataFrame(res_out.data)
        
        if df_in.empty and df_out.empty:
            return {"error": "No data available for forecasting"}
            
        df_in['date'] = pd.to_datetime(df_in['date'])
        df_out['date'] = pd.to_datetime(df_out['date'])
        df_in['amount'] = pd.to_numeric(df_in['amount'], errors='coerce').fillna(0)
        df_out['amount'] = pd.to_numeric(df_out['amount'], errors='coerce').fillna(0)
        
        # Resample to monthly
        df_in_m = df_in.resample('ME', on='date').sum()
        df_out_m = df_out.resample('ME', on='date').sum()
        
        # Combine
        df_net = pd.DataFrame({'in': df_in_m['amount'], 'out': df_out_m['amount']}).fillna(0)
        df_net['net'] = df_net['in'] - df_net['out']
        
        if len(df_net) < 2:
            return {"warning": "Not enough historical data to make an accurate prediction. We need at least 2 months of data.", "prediction": []}
            
        # Simple Linear Regression
        x = np.arange(len(df_net))
        y = df_net['net'].values
        
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        last_date = df_net.index[-1]
        
        predictions = []
        for i in range(1, months_ahead + 1):
            pred_x = len(df_net) - 1 + i
            pred_y = p(pred_x)
            pred_date = last_date + pd.DateOffset(months=i)
            predictions.append({
                "month": pred_date.strftime('%B %Y'),
                "predicted_net_cashflow": int(pred_y)
            })
            
        return {
            "trend": "Positive" if z[0] > 0 else "Negative",
            "predictions": predictions,
            "message": "Prediksi dihitung menggunakan Linear Regression dari riwayat data (Native Python)."
        }
    except Exception as e:
        return {"error": str(e)}
