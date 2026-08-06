import pandas as pd
from services.db_helper import fetch_table_data

def process_anomaly_detection(db_client, request_data):
    try:
        table = request_data.get('table', 'data_po-cashin')
        amount_col = request_data.get('amount_col', 'revenue')
        
        # Fetch data
        rows = fetch_table_data(table, f"`id`, `project_name`, `customer`, `{amount_col}`")
        df = pd.DataFrame(rows)
        
        if df.empty:
            return {"anomalies": [], "message": "Tidak ada data."}
            
        df['client_name'] = df['project_name'].fillna(df['customer']).fillna('Unknown Project')
            
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
            "message": "Deteksi Anomali Statistik (Z-Score & Duplication) berhasil dijalankan oleh Python pada database MySQL."
        }
    except Exception as e:
        return {"error": str(e)}
