import pandas as pd

def process_anomaly_detection(supabase, request_data):
    if not supabase:
        return {"error": "Supabase not configured"}
    try:
        table = request_data.get('table', 'invoices')
        amount_col = request_data.get('amount_col', 'amount')
        
        # Fetch data
        res = supabase.table(table).select(f"id, client_name, {amount_col}, status").execute()
        df = pd.DataFrame(res.data)
        
        if df.empty:
            return {"anomalies": [], "message": "Tidak ada data."}
            
        df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
        
        # Z-Score Anomaly Detection
        mean = df[amount_col].mean()
        std = df[amount_col].std()
        
        anomalies = []
        for _, row in df.iterrows():
            amt = float(row[amount_col])
            # If standard deviation is 0, we can't compute z-score properly
            if std > 0:
                z_score = abs((amt - mean) / std)
                # Threshold of 2.5 standard deviations
                if z_score > 2.5:
                    anomalies.append({
                        "id": row['id'],
                        "client": str(row.get('client_name', 'Unknown')),
                        "amount": amt,
                        "reason": f"Nilai transaksi terlalu ekstrem (Z-Score: {z_score:.2f}). Rata-rata adalah {mean:.2f}."
                    })
                    
        # Detect exact duplicates
        duplicates = df[df.duplicated(subset=['client_name', amount_col], keep=False)]
        for _, row in duplicates.iterrows():
            anomalies.append({
                "id": row['id'],
                "client": str(row.get('client_name', 'Unknown')),
                "amount": float(row[amount_col]),
                "reason": "Indikasi tagihan/pembayaran ganda (Duplicate Entry) untuk klien dengan nominal yang sama persis."
            })
            
        return {
            "total_data_analyzed": len(df),
            "anomalies_found": len(anomalies),
            "anomalies": anomalies,
            "message": "Deteksi Anomali Statistik (Z-Score & Duplication) berhasil dijalankan oleh Python."
        }
    except Exception as e:
        return {"error": str(e)}
