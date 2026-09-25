"""
Frigid Agent - Freight Quote Decision & Evaluation Engine
Handles quote request evaluation, base cost estimation, business margin application,
and status transitions between Retailer and Frigid Agent.
"""

from datetime import datetime, date
import math
import random
import time

# Quote Status Constants
STATUS_SUBMITTED = "SUBMITTED"
STATUS_WITH_FRIGID_AGENT = "WITH_FRIGID_AGENT"
STATUS_PROCESSING = "PROCESSING"
STATUS_QUOTE_GENERATED = "QUOTE_GENERATED"
STATUS_FAILED = "FAILED"

class FrigidQuoteAgent:
    def __init__(self):
        # Base Tariff Rate Cards
        self.base_container_rates = {
            '20FT': 145000,
            '40FT': 225000,
            '40HC': 245000,
            '45HC': 290000
        }
        
        self.mode_multipliers = {
            'ocean': 1.0,
            'air': 2.4,
            'ground': 0.8,
            'express': 3.5
        }
        
        self.surcharges = {
            'thc_per_container': 18000,
            'customs_filing': 15000,
            'baf_pct': 0.12,
            'hazmat_flat': 25000,
            'insurance_rate': 0.0035,
            'min_insurance': 7000
        }
        
        # Default Business Margin % applied by Frigid Agent
        self.default_margin_pct = 12.0
        
        # In-memory quote requests database
        self.quote_requests_db = {}

    def validate_request(self, data):
        """
        Validates the incoming quote request payload.
        Enforces strict Ready Date check (readyDate >= currentDate).
        """
        errors = []
        
        # 1. Ready Date Validation
        ready_date_str = data.get('readyDate')
        if not ready_date_str:
            errors.append("Ready Date is required.")
        else:
            try:
                ready_date = datetime.strptime(ready_date_str, "%Y-%m-%d").date()
                today = date.today()
                if ready_date < today:
                    errors.append(f"Ready Date ({ready_date_str}) cannot be in the past. Current date is {today.strftime('%Y-%m-%d')}.")
            except ValueError:
                errors.append(f"Invalid Ready Date format: '{ready_date_str}'. Expected YYYY-MM-DD.")
                
        # 2. Required Fields
        if not data.get('origin'):
            errors.append("Origin port/airport is required.")
        if not data.get('destination'):
            errors.append("Destination port/airport is required.")
        if not data.get('custName'):
            errors.append("Contact full name is required.")
        if not data.get('custEmail'):
            errors.append("Contact email is required.")
            
        # 3. Hazardous cargo inputs
        if data.get('chkHazardous'):
            if not data.get('unNumber'):
                errors.append("UN Number is required for hazardous cargo.")
            if not data.get('imoClass'):
                errors.append("IMO Class is required for hazardous cargo.")

        return errors

    def evaluate_quote(self, data, margin_pct=None):
        """
        Frigid Agent evaluation workflow:
        1. Validate request
        2. Calculate base cost & surcharges
        3. Apply Frigid Agent business margin
        4. Generate final quote & update status to QUOTE_GENERATED
        """
        validation_errors = self.validate_request(data)
        if validation_errors:
            return {
                "success": False,
                "status": STATUS_FAILED,
                "error": "Validation Failed",
                "details": validation_errors
            }

        # Apply margin
        margin = margin_pct if margin_pct is not None else self.default_margin_pct
        
        # Simulate processing time for agent evaluation
        time.sleep(0.6)
        
        # Calculate cargo items
        items = data.get('items', [])
        total_containers = 0
        total_weight_kg = 0
        container_summary_parts = []
        
        if items:
            for item in items:
                count = int(item.get('count', 1))
                c_type = item.get('containerType', '40HC').upper()
                weight = float(item.get('weight', 9200))
                total_containers += count
                total_weight_kg += weight
                container_summary_parts.append(f"{count} × {c_type}")
        else:
            total_containers = 1
            total_weight_kg = float(data.get('totalWeight', 18400))
            container_summary_parts = ["1 × 40HC"]
            
        basis_str = ", ".join(container_summary_parts) if container_summary_parts else "1 × 40HC"
        
        mode = data.get('mode', 'ocean')
        mode_mult = self.mode_multipliers.get(mode, 1.0)
        
        # Base Costs
        raw_base_freight = total_containers * 145000 * mode_mult
        
        # Surcharges
        thc_cost = total_containers * self.surcharges['thc_per_container']
        customs_cost = self.surcharges['customs_filing']
        baf_cost = round(raw_base_freight * self.surcharges['baf_pct'])
        
        is_hazmat = bool(data.get('chkHazardous'))
        hazmat_cost = self.surcharges['hazmat_flat'] if is_hazmat else 0
        
        is_insurance = bool(data.get('chkInsurance'))
        declared_val = float(data.get('declaredVal', 2000000))
        insurance_cost = 0
        if is_insurance:
            calc_ins = round(declared_val * self.surcharges['insurance_rate'])
            insurance_cost = max(calc_ins, self.surcharges['min_insurance'])
            
        subtotal_base_costs = raw_base_freight + thc_cost + customs_cost + baf_cost + hazmat_cost + insurance_cost
        
        # Frigid Agent Margin Application
        margin_amount = round(subtotal_base_costs * (margin / 100.0))
        final_quote_amount = round(subtotal_base_costs + margin_amount)
        
        currency_code = data.get('currency', 'INR')
        formatted_price = f"₹ {final_quote_amount:,.0f}"
        
        quote_id = f"QT-2026-{random.randint(90000, 99999)}"
        
        # Line Items (Retailer View - internal margin hidden)
        line_items = [
            {"name": f"Base Freight ({basis_str})", "amount": raw_base_freight + margin_amount, "formatted": f"₹ {(raw_base_freight + margin_amount):,.0f}"},
            {"name": "Terminal Handling Charges (THC)", "amount": thc_cost, "formatted": f"₹ {thc_cost:,.0f}"},
            {"name": "Export & Import Customs Filing", "amount": customs_cost, "formatted": f"₹ {customs_cost:,.0f}"},
            {"name": "Bunker Fuel Adjustment (BAF 12%)", "amount": baf_cost, "formatted": f"₹ {baf_cost:,.0f}"}
        ]
        
        if is_hazmat:
            line_items.append({"name": "Hazardous Material (HAZMAT) Fee", "amount": hazmat_cost, "formatted": f"₹ {hazmat_cost:,.0f}"})
        if is_insurance:
            line_items.append({"name": "All-Risk Cargo Insurance", "amount": insurance_cost, "formatted": f"₹ {insurance_cost:,.0f}"})
            
        origin_info = data.get('origin', {})
        dest_info = data.get('destination', {})
        
        quote_result = {
            "success": True,
            "status": STATUS_QUOTE_GENERATED,
            "statusMessage": "Your final quote is ready.",
            "agentName": "Frigid Agent Engine",
            "quoteId": quote_id,
            "issueDate": date.today().strftime("%b %d, %Y"),
            "readyDate": data.get('readyDate'),
            "basis": basis_str,
            "totalContainers": total_containers,
            "totalWeightKg": total_weight_kg,
            
            # Financial metrics
            "baseEstimatedCost": subtotal_base_costs,
            "appliedMarginPct": margin,
            "marginAmount": margin_amount,
            "grandTotal": final_quote_amount,
            "currency": currency_code,
            "formattedPrice": formatted_price,
            "lineItems": line_items,
            
            "transitDays": "6–10 d",
            "estimatedArrival": "22 Aug",
            "agentNote": f"Quote finalized by Frigid Agent with {margin:.1f}% business margin."
        }
        
        # Save to internal DB
        self.quote_requests_db[quote_id] = quote_result
        return quote_result

# Global agent instance
frigid_agent = FrigidQuoteAgent()
