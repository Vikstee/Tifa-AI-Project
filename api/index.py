import os
from flask import Flask, request, jsonify
from supabase import create_client, Client
import google.generativeai as genai

from services.chart_aggregator import process_chart_aggregation
from services.forecasting import process_cashflow_prediction
from services.rag_parser import process_document_parsing
from services.anomaly_detector import process_anomaly_detection

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
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

@app.route('/api/analytics', methods=['POST', 'GET'])
def analyze_data():
    if not supabase:
        return jsonify({"analysis": ["Error: Supabase credentials not configured in Python."]})
        
    try:
        # Backward compatibility for old simple reports if needed
        # Or this can be moved to a service too
        data = request.json or {}
        report_type = data.get('reportType', '')
        if "PO" in report_type:
            res = supabase.table("purchase_orders").select("*").limit(50).execute()
        elif "Cash Flow" in report_type:
            res = supabase.table("cash_in").select("*").limit(50).execute()
        else:
            return jsonify({"analysis": ["Report type not fully implemented in Python yet."]})
            
        return jsonify({"analysis": [f"Python successfully analyzed {len(res.data)} rows for {report_type}."]})
    except Exception as e:
        return jsonify({"analysis": [f"Python Execution Error: {str(e)}"]})

@app.route('/api/predict_cashflow', methods=['POST'])
def predict_cashflow():
    data = request.json or {}
    result = process_cashflow_prediction(supabase, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/aggregate_chart', methods=['POST'])
def aggregate_chart():
    data = request.json or {}
    result = process_chart_aggregation(supabase, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/parse_document', methods=['POST'])
def parse_document():
    data = request.json or {}
    result = process_document_parsing(data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/detect_anomaly', methods=['POST'])
def detect_anomaly():
    data = request.json or {}
    result = process_anomaly_detection(supabase, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000)
