import urllib.request
import json
from datetime import date

base_url = "http://localhost:5000"

print("--- 1. Testing GET /api/health ---")
try:
    req = urllib.request.urlopen(f"{base_url}/api/health")
    data = json.loads(req.read().decode('utf-8'))
    print("Health Status:", data)
except Exception as e:
    print("Health check error:", e)

print("\n--- 2. Testing Past Ready Date Submission (Server-side Validation) ---")
past_payload = json.dumps({
    "readyDate": "2025-05-10",
    "origin": {"id": "INNSA", "name": "Nhava Sheva"},
    "destination": {"id": "AEJEA", "name": "Jebel Ali"},
    "custName": "Test Shipper",
    "custEmail": "test@shipper.com"
}).encode('utf-8')

req = urllib.request.Request(f"{base_url}/api/generate-quote", data=past_payload, headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
    print("ERROR: Past date request unexpectedly succeeded!")
except urllib.error.HTTPError as e:
    resp_body = json.loads(e.read().decode('utf-8'))
    print(f"PASS: Rejection HTTP {e.code}:", resp_body)

print("\n--- 3. Testing Valid Ready Date Submission (Quote Generation Agent) ---")
today_str = date.today().strftime('%Y-%m-%d')
valid_payload = json.dumps({
    "readyDate": today_str,
    "origin": {"id": "INNSA", "code": "INNSA", "name": "Nhava Sheva, Mumbai"},
    "destination": {"id": "AEJEA", "code": "AEJEA", "name": "Jebel Ali, Dubai"},
    "mode": "ocean",
    "loadType": "fcl",
    "incoterm": "FOB",
    "items": [{"count": 2, "containerType": "40HC", "weight": 9200}],
    "declaredVal": 2000000,
    "chkHazardous": False,
    "chkInsurance": True,
    "custName": "Sharma Textiles",
    "custEmail": "sharma@textiles.in"
}).encode('utf-8')

req = urllib.request.Request(f"{base_url}/api/generate-quote", data=valid_payload, headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"PASS: HTTP {res.code} Agent Quote Generated:")
    print("  Quote ID:", data.get("quoteId"))
    print("  Agent Status:", data.get("agentStatus"))
    print("  Evaluation Time:", data.get("agentEvaluationTime"))
    print("  Formatted Price:", data.get("formattedPrice"))
    print("  Line Items:")
    for item in data.get("lineItems", []):
        print(f"    - {item['name']}: {item['formatted']}")
except Exception as e:
    print("Valid payload request error:", e)
