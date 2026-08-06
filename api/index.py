import os
# Fix for Python 3.14 Protobuf compatibility issue
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

from dotenv import load_dotenv
# Load .env.local if it exists
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))

import json
from flask import Flask, request, jsonify
from flask_caching import Cache

from services.chart_aggregator import process_chart_aggregation
from services.forecasting import process_cashflow_prediction
from services.rag_parser import process_document_parsing
from services.vector_search import search_vector_db
from services.anomaly_detector import process_anomaly_detection
from services.report_aggregator import process_report_aggregation
from services.sql_agent import process_sql_query
from services.db_helper import fetch_table_data

app = Flask(__name__)

# Cache configuration (5 minutes TTL)
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 300})
cache.init_app(app)

def make_cache_key(*args, **kwargs):
    """Custom cache key generator that includes JSON payload"""
    return request.path + str(json.dumps(request.json, sort_keys=True)) if request.json else request.path

@app.route('/api/analytics', methods=['POST', 'GET'])
def analyze_data():
    try:
        data = request.json or {}
        report_type = data.get('reportType', '')
        rows = fetch_table_data("data_po-cashin", "*")
        return jsonify({"analysis": [f"Python successfully analyzed {len(rows)} rows for {report_type} in MySQL."]})
    except Exception as e:
        return jsonify({"analysis": [f"Python Execution Error: {str(e)}"]})

@app.route('/api/predict_cashflow', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def predict_cashflow():
    data = request.json or {}
    result = process_cashflow_prediction(None, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/aggregate_chart', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def aggregate_chart():
    data = request.json or {}
    result = process_chart_aggregation(None, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/aggregate_report_data', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def aggregate_report_data():
    data = request.json or {}
    result = process_report_aggregation(None, data)
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
    result = process_anomaly_detection(None, data)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result)

@app.route('/api/ask_sql', methods=['POST'])
@cache.cached(make_cache_key=make_cache_key)
def ask_sql():
    data = request.json or {}
    result = process_sql_query(None, data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000)
