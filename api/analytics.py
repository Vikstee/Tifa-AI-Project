import os
import json
import pandas as pd
from flask import Flask, request, jsonify
from supabase import create_client, Client
import google.generativeai as genai

app = Flask(__name__)

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
gemini_key = os.environ.get("GEMINI_API_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None

if gemini_key:
    genai.configure(api_key=gemini_key.split(',')[0].strip())
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    model = None

@app.route('/api/analytics', methods=['POST', 'GET'])
def analyze_data():
    if request.method == 'POST':
        data = request.json or {}
        report_type = data.get('reportType', '')
        period = data.get('period', '')
    else:
        report_type = request.args.get('reportType', '')
        period = request.args.get('period', '')

    if not supabase:
        return jsonify({"analysis": ["Error: Supabase credentials not configured in Python."]})

    try:
        if "PO" in report_type or "Purchase" in report_type:
            response = supabase.table("purchase_orders").select("*").eq("status", "Outstanding").execute()
            df = pd.DataFrame(response.data)
            
            if df.empty:
                return jsonify({"analysis": ["RINGKASAN EKSEKUTIF", "Tidak ada PO Outstanding pada periode ini. Semua operasional berjalan sesuai SLA.", "", "REKOMENDASI", "Pertahankan kinerja baik ini."]})
            
            # Simple Pandas calculations
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
            total_outstanding = df['amount'].sum()
            top_vendors = df.groupby('vendor')['amount'].sum().sort_values(ascending=False)
            
            top_vendor_name = top_vendors.index[0] if not top_vendors.empty else "N/A"
            top_vendor_amount = top_vendors.iloc[0] if not top_vendors.empty else 0
            
            # Generate AI Insights based on Pandas summary
            if model:
                prompt = f"""Anda adalah TIFA, asisten keuangan. Buat 5-7 baris array string (insight) untuk PDF report "PO Outstanding".
Data ringkasan (dihitung via Python/Pandas):
- Total Outstanding: Rp {total_outstanding:,.0f}
- Jumlah PO aktif: {len(df)}
- Vendor dengan outstanding tertinggi: {top_vendor_name} (Rp {top_vendor_amount:,.0f})

Format HANYA JSON array of strings. Gunakan huruf kapital untuk judul seperti "RINGKASAN EKSEKUTIF". Beri rekomendasi strategis."""
                
                ai_resp = model.generate_content(prompt)
                text = ai_resp.text.replace('```json', '').replace('```', '').strip()
                analysis = json.loads(text)
            else:
                analysis = [
                    "RINGKASAN EKSEKUTIF (PYTHON NATIVE)",
                    f"Terdapat {len(df)} PO Outstanding dengan total nilai Rp {total_outstanding:,.0f}.",
                    "",
                    "ANALISIS VENDOR",
                    f"Konsentrasi terbesar ada pada {top_vendor_name} sebesar Rp {top_vendor_amount:,.0f}.",
                    "",
                    "REKOMENDASI STRATEGIS",
                    f"Fokuskan penyelesaian BAST untuk vendor {top_vendor_name} guna mencegah bottleneck operasional."
                ]
                
            return jsonify({"analysis": analysis})
            
        elif "Cash Flow" in report_type or "Cash_in" in report_type:
            response = supabase.table("cash_in").select("*").execute()
            df = pd.DataFrame(response.data)
            
            if df.empty:
                return jsonify({"analysis": ["Tidak ada aliran kas masuk yang tercatat."]})
                
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
            total_inflow = df['amount'].sum()
            
            if model:
                prompt = f"""Anda adalah TIFA. Buat 5-7 baris array string insight untuk report "Cash Flow".
Data (Python):
- Total Arus Kas Masuk: Rp {total_inflow:,.0f}
Format HANYA JSON array of strings. Beri rekomendasi investasi kas."""
                ai_resp = model.generate_content(prompt)
                text = ai_resp.text.replace('```json', '').replace('```', '').strip()
                analysis = json.loads(text)
            else:
                analysis = [
                    "RINGKASAN EKSEKUTIF (PYTHON NATIVE)",
                    f"Total kas masuk tercatat sebesar Rp {total_inflow:,.0f}.",
                    "",
                    "REKOMENDASI STRATEGIS",
                    "Pertimbangkan penempatan dana idle ke instrumen reksadana pasar uang."
                ]
            
            return jsonify({"analysis": analysis})
            
        else:
            return jsonify({"analysis": [
                "RINGKASAN EKSEKUTIF",
                "Data diolah secara Native menggunakan Python backend.",
                "Tidak ada deteksi anomali khusus pada set data ini."
            ]})
            
    except Exception as e:
        return jsonify({"analysis": [f"Python Execution Error: {str(e)}"]})

@app.route('/api/predict_cashflow', methods=['POST'])
def predict_cashflow():
    if not supabase:
        return jsonify({"error": "Supabase not configured"})
    try:
        data = request.json or {}
        months_ahead = data.get('months_ahead', 3)
        
        # Fetch cash flow data
        res_in = supabase.table("cash_in").select("date, amount").execute()
        res_out = supabase.table("cash_out").select("date, amount").execute()
        
        df_in = pd.DataFrame(res_in.data)
        df_out = pd.DataFrame(res_out.data)
        
        if df_in.empty and df_out.empty:
            return jsonify({"error": "No data available for forecasting"})
            
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
            return jsonify({"warning": "Not enough historical data to make an accurate prediction. We need at least 2 months of data.", "prediction": []})
            
        import numpy as np
        
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
            
        return jsonify({
            "trend": "Positive" if z[0] > 0 else "Negative",
            "predictions": predictions,
            "message": "Prediksi dihitung menggunakan Linear Regression dari riwayat data (Native Python)."
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/aggregate_chart', methods=['POST'])
def aggregate_chart():
    if not supabase:
        return jsonify({"error": "Supabase not configured"})
    try:
        data = request.json or {}
        table = data.get('table', 'purchase_orders')
        group_by = data.get('group_by', 'status')
        sum_col = data.get('sum_col', 'amount')
        
        res = supabase.table(table).select(f"{group_by}, {sum_col}").execute()
        df = pd.DataFrame(res.data)
        
        if df.empty:
            return jsonify({"data": []})
            
        df[sum_col] = pd.to_numeric(df[sum_col], errors='coerce').fillna(0)
        agg_df = df.groupby(group_by)[sum_col].sum().reset_index()
        
        # Format for Recharts
        chart_data = []
        for _, row in agg_df.iterrows():
            chart_data.append({
                "kategori": str(row[group_by]),
                "Total": float(row[sum_col])
            })
            
        return jsonify({"data": chart_data, "message": f"Data diagregasi dari {len(df)} baris menggunakan Pandas."})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(port=5000)
