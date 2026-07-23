import os
# Fix for Python 3.14 Protobuf compatibility issue
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

from dotenv import load_dotenv
# Load .env.local if it exists
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))

import json
from flask import Flask, request, jsonify
from flask_caching import Cache
from supabase import create_client, Client
import google.generativeai as genai

from services.chart_aggregator import process_chart_aggregation
from services.forecasting import process_cashflow_prediction
from services.rag_parser import process_document_parsing
from services.vector_search import search_vector_db
from services.anomaly_detector import process_anomaly_detection

app = Flask(__name__)

# Cache configuration (5 minutes TTL)
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300})
cache.init_app(app)

def make_cache_key(*args, **kwargs):
    """Custom cache key generator that includes JSON payload"""
    return request.path + str(json.dumps(request.json, sort_keys=True)) if request.json else request.path

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
gemini_key = os.environ.get("GEMINI_API_KEY")

import re
original_match = re.match

def mock_match(pattern, string, flags=0):
    if string == supabase_key:
        class DummyMatch:
            pass
        return DummyMatch()
    return original_match(pattern, string, flags)

if supabase_url and supabase_key:
    re.match = mock_match
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
    finally:
        re.match = original_match
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
@cache.cached(make_cache_key=make_cache_key)
def predict_cashflow():
    data = request.json or {}
    result = process_cashflow_prediction(supabase, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/aggregate_chart', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
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

@app.route('/api/search_document', methods=['POST'])
def search_document():
    data = request.json or {}
    result = search_vector_db(data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/detect_anomaly', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def detect_anomaly():
    data = request.json or {}
    result = process_anomaly_detection(supabase, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

from services.sql_agent import process_sql_query

@app.route('/api/ask_sql', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def ask_sql():
    data = request.json or {}
    result = process_sql_query(data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000)
