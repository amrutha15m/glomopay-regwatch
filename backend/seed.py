"""
Seed utility for local dev/testing. Run: python seed.py
Creates sample documents without hitting live sources.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from database import SessionLocal, create_tables
from models.models import Document, AIAnalysis

SEED_DATA = [
    {
        "title": "IFSCA Circular on AML/CFT Framework for IFSC Units",
        "source": "IFSCA",
        "publication_date": "2024-01-15",
        "source_url": "https://ifsca.gov.in/CommonDirect/GetFileView?id=d575554ec59b09e7fde503d3a8b10bd3&fileName=Circular_CMI_reporting_final_pdf_20260409_1010.pdf&TitleName=Legal",
        "raw_text": "This circular establishes the AML/CFT framework for units operating in IFSC. All IFSC units including payment institutions must implement a risk-based AML/CFT program. The framework requires appointment of a dedicated MLRO, establishment of transaction monitoring systems, and filing of STRs within 7 days. Compliance timeline: 90 days from issuance.",
        "ingestion_status": "parsed",
        "analysis": {
            "summary": "IFSCA has issued comprehensive AML/CFT guidelines applicable to all payment institutions in GIFT City, requiring a risk-based framework within 90 days.",
            "why_it_matters": "GlomoPay as an IFSC-licensed payment institution must update its AML/CFT policies to comply with these guidelines within 90 days. The circular directly impacts LRS remittance workflows and KYC processes.",
            "impacted_functions": ["compliance", "risk", "operations"],
            "action_items": ["Update AML policy document within 30 days", "Appoint or designate MLRO", "Implement transaction monitoring system", "File acknowledgment with IFSCA"],
            "tags": ["AML", "CFT", "KYC", "IFSC", "Compliance", "MLRO"],
            "relevance_score": 0.95,
        },
    },
    {
        "title": "RBI Master Circular on KYC Norms 2024",
        "source": "RBI",
        "publication_date": "2024-02-01",
        "source_url": "https://www.rbi.org.in/scripts/sample-kyc-2024",
        "raw_text": "This master circular consolidates all KYC instructions issued by RBI. Payment institutions must implement Customer Due Diligence (CDD) measures for all new accounts. Enhanced Due Diligence (EDD) is required for high-risk customers. Periodic KYC updates must be completed every 2 years for high-risk and 10 years for low-risk customers.",
        "ingestion_status": "parsed",
        "analysis": {
            "summary": "RBI has consolidated all KYC norms into this master circular, requiring payment institutions to implement CDD and EDD measures with updated timelines.",
            "why_it_matters": "GlomoPay must review its KYC onboarding flow under LRS to ensure alignment with updated CDD/EDD requirements. The periodic re-KYC timelines will impact operational workflows.",
            "impacted_functions": ["compliance", "product", "operations"],
            "action_items": ["Audit current KYC onboarding process", "Update LRS customer documentation", "Implement EDD for high-value remittance customers", "Set up periodic KYC renewal tracking"],
            "tags": ["KYC", "LRS", "RBI", "Remittance", "Due Diligence", "CDD", "EDD"],
            "relevance_score": 0.88,
        },
    },
    {
        "title": "FATF Guidance on Virtual Assets and Virtual Asset Service Providers",
        "source": "SEBI",
        "publication_date": "2024-03-10",
        "source_url": "https://www.sebi.gov.in/legal/circulars/apr-2026/one-time-relaxation-with-respect-to-validity-of-sebi-observations_100786.html",
        "raw_text": "FATF has updated its guidance on virtual assets and VASPs. Countries must ensure VASPs are registered or licensed. The travel rule applies to virtual asset transfers above USD 1,000. IFSCA-regulated entities must comply with FATF recommendations as adopted by India.",
        "ingestion_status": "parsed",
        "analysis": {
            "summary": "Updated FATF guidance on virtual assets extends travel rule obligations to transfers above USD 1,000 for all licensed VASPs and payment institutions.",
            "why_it_matters": "GlomoPay's cross-border payment flows may be impacted by the travel rule requirements. Sanctions screening and correspondent banking arrangements must be reviewed.",
            "impacted_functions": ["compliance", "risk", "product"],
            "action_items": ["Review travel rule applicability to remittance flows", "Assess sanctions screening adequacy", "Update correspondent banking agreements"],
            "tags": ["FATF", "Sanctions", "Correspondent Banking", "Cross-Border", "AML"],
            "relevance_score": 0.72,
        },
    },
]

if __name__ == "__main__":
    create_tables()
    db = SessionLocal()
    try:
        added = 0
        for item in SEED_DATA:
            existing = db.query(Document).filter(Document.source_url == item["source_url"]).first()
            if existing:
                print(f"Skip (exists): {item['title']}")
                continue
            doc = Document(
                title=item["title"], source=item["source"], publication_date=item["publication_date"],
                source_url=item["source_url"], raw_text=item["raw_text"], ingestion_status=item["ingestion_status"],
            )
            db.add(doc)
            db.flush()
            a = item["analysis"]
            analysis = AIAnalysis(
                document_id=doc.id, summary=a["summary"], why_it_matters=a["why_it_matters"],
                impacted_functions=json.dumps(a["impacted_functions"]),
                action_items=json.dumps(a["action_items"]),
                tags=json.dumps(a["tags"]),
                relevance_score=a["relevance_score"],
            )
            db.add(analysis)
            added += 1
        db.commit()
        print(f"Seeded {added} documents successfully.")
    finally:
        db.close()
