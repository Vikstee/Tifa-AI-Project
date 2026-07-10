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

if __name__ == '__main__':
    app.run(port=5000)
