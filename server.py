"""
Freight Quote System - Flask Server
Coordinates backend quote generation workflow between Retail Panel and Frigid Agent Panel.
"""

from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime, date
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent.quote_agent import (
    frigid_agent,
    STATUS_SUBMITTED,
    STATUS_WITH_FRIGID_AGENT,
    STATUS_PROCESSING,
    STATUS_QUOTE_GENERATED,
    STATUS_FAILED
)

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('.', path)):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "system": "Freight Quote Generation Engine",
        "agent": "Frigid Agent Engine v3.0",
        "serverTime": datetime.now().isoformat()
    })

@app.route('/api/validate-date', methods=['POST'])
def validate_date_endpoint():
    data = request.get_json(silent=True) or {}
    date_str = data.get('readyDate')
    
    if not date_str:
        return jsonify({"valid": False, "error": "Ready Date is required"}), 400
        
    try:
        req_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = date.today()
        if req_date < today:
            return jsonify({
                "valid": False,
                "error": f"Ready Date cannot be in the past. Current date is {today.strftime('%Y-%m-%d')}."
            }), 400
        return jsonify({"valid": True, "message": "Date is valid."}), 200
    except ValueError:
        return jsonify({"valid": False, "error": "Invalid date format. Expected YYYY-MM-DD."}), 400

@app.route('/api/generate-quote', methods=['POST'])
def generate_quote_endpoint():
    """
    Retailer Quote Request endpoint.
    Receives request from Retail Panel, performs server-side Ready Date validation,
    and routes request to Frigid Agent for evaluation & margin application.
    """
    data = request.get_json(silent=True) or {}
    
    # 1. Server-side Ready Date validation
    ready_date_str = data.get('readyDate')
    if ready_date_str:
        try:
            req_date = datetime.strptime(ready_date_str, "%Y-%m-%d").date()
            today = date.today()
            if req_date < today:
                return jsonify({
                    "success": False,
                    "status": STATUS_FAILED,
                    "error": f"Validation Error: Ready Date ({ready_date_str}) cannot be in the past. Current date is {today.strftime('%Y-%m-%d')}."
                }), 400
        except ValueError:
            return jsonify({
                "success": False,
                "status": STATUS_FAILED,
                "error": f"Validation Error: Invalid Ready Date format '{ready_date_str}'."
            }), 400

    # 2. Route to Frigid Agent for decision & margin calculation
    margin_pct = float(data.get('marginPct', 12.0))
    result = frigid_agent.evaluate_quote(data, margin_pct=margin_pct)
    
    if not result.get("success"):
        return jsonify(result), 400
        
    return jsonify(result), 200

@app.route('/api/frigid-agent/evaluate', methods=['POST'])
def frigid_agent_evaluate_endpoint():
    """
    Frigid Agent Panel evaluation endpoint. Allows Frigid Agent to evaluate requests
    with custom margin percentages.
    """
    data = request.get_json(silent=True) or {}
    margin_pct = float(data.get('marginPct', 15.0))
    result = frigid_agent.evaluate_quote(data, margin_pct=margin_pct)
    return jsonify(result), 200 if result.get("success") else 400

@app.route('/api/quote-requests', methods=['GET'])
def get_quote_requests():
    """
    Returns list of processed/evaluated quote requests for Frigid Agent & Admin queue.
    """
    requests_list = list(frigid_agent.quote_requests_db.values())
    return jsonify({
        "success": True,
        "count": len(requests_list),
        "requests": requests_list
    }), 200

if __name__ == '__main__':
    print("Freight Quote Server starting on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
