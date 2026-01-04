import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import hashlib
import json
import random
import time

router = APIRouter(prefix="/certificate", tags=["Certificate"])

# Paths for persistent storage
DB_PATH = os.path.join(os.path.dirname(__file__), "certificates.json")
LEDGER_PATH = os.path.join(os.path.dirname(__file__), "blockchain_ledger.json")

# Helper Functions
def load_json(path):
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except: return {}
    return {}

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=4)

@router.post("/issue")
def issue_certificate(data: dict): # Handle dict more flexibly
    cert_data = data
    student_email = data.get("student_email", "unknown@student.com")
    cert_string = json.dumps(cert_data, sort_keys=True)
    cert_hash = hashlib.sha256(cert_string.encode()).hexdigest()
    
    # 1. Simulate Real Blockchain Transaction
    tx_hash = f"0x{hashlib.sha256(str(time.time()).encode()).hexdigest()}"
    block_num = random.randint(1000000, 9999999)
    
    # 2. Add to BLOCKCHAIN LEDGER (Immutable Simulation)
    ledger = load_json(LEDGER_PATH)
    ledger[tx_hash] = {
        "cert_hash": cert_hash,
        "block": block_num,
        "timestamp": time.time(),
        "status": "Confirmed"
    }
    save_json(LEDGER_PATH, ledger)
    
    # 3. Store Metadata for App Usage
    cert_id = cert_hash[:10]
    db = load_json(DB_PATH)
    db[cert_id] = {
        "data": cert_data,
        "hash": cert_hash,
        "tx_hash": tx_hash,
        "student_email": student_email,
        "valid": True
    }
    save_json(DB_PATH, db)
    
    return {
        "message": "Issued & Mined successfully",
        "certificate_id": cert_id,
        "hash": cert_hash,
        "transaction_hash": tx_hash,
        "block": block_num
    }

@router.get("/wallet/{email}")
def get_wallet(email: str):
    db = load_json(DB_PATH)
    # Filter certificates by student email
    wallet_certs = []
    for cid, cert in db.items():
        if cert.get("student_email") == email:
            wallet_certs.append({
                "id": cid,
                "data": cert["data"],
                "tx_hash": cert["tx_hash"]
            })
    return {"wallet": wallet_certs}

@router.get("/verify/{query}")
def verify_certificate(query: str):
    db = load_json(DB_PATH)
    ledger = load_json(LEDGER_PATH)
    
    cert = None
    # Support searching by ID (10 chars) or TX Hash (start with 0x)
    if query.startswith("0x"):
        # Search by Transaction Hash
        for cid, record in db.items():
            if record.get("tx_hash") == query:
                cert = record
                break
    else:
        # Search by Cert ID
        cert = db.get(query)
        
    if not cert:
        raise HTTPException(status_code=404, detail="Not found on blockchain")

    # Double check against "Ledger"
    on_chain = ledger.get(cert["tx_hash"])
        
    return {
        "valid": cert["valid"] and (on_chain is not None),
        "data": cert["data"],
        "hash": cert["hash"],
        "blockchain": {
            "tx_hash": cert["tx_hash"],
            "block": on_chain.get("block") if on_chain else "Unknown",
            "timestamp": on_chain.get("timestamp") if on_chain else time.time(),
            "status": "Verified on Chain"
        }
    }
