# 🏥 Smart Hospital System (City-Wide Multi-Tenant Healthcare OS)

A modern, zero-trust, multi-tenant healthcare and clinic management platform with 6 specialized responsive web portals, dynamic QR code device pairing, and offline resilience.

## 🌟 The 6 Portals
1. **Patient Web/PWA**: Self-service appointment booking, AI symptom triage, slot booking, unified payments, dynamic appointment QR pass.
2. **Hospital Manager Console**: Central operations monitoring, dynamic TOTP-ECDSA pairing QR generator for staff workstations.
3. **Receptionist Desk**: Walk-in registration, cash fee collection, thermal paper slip printing, zero-leak HIPAA guard.
4. **Doctor Clinical Suite**: Scan patient QR to unlock longitudinal EHR, AI clinical briefings, clinical SOAP notes, Lab order QR, and E-Prescription QR.
5. **Diagnostic Lab Portal**: Specimen accessioning, tube barcode binding, panic value alerts, and signed PDF report uploads with live push notifications.
6. **Pharmacy POS**: Electronic dispensing, manufacturer pack barcode verification, near-expiry lockout, and anti-double-dispense locks.

## 🛠️ Technology Stack
- **Frontend**: Responsive Web Application (PWA) with HTML5 camera QR scanning (`html5-qrcode`)
- **Backend / FHIR Core**: Medplum (FHIR R4 compliant)
- **Identity & SSO**: Logto (Multi-tenant OIDC/OAuth2)
- **Database**: PostgreSQL 16
- **Cache & Pub/Sub**: Redis 7
- **Deployment**: Render.com (Docker Web Service)
- **Subdomain Routing**: `hospital.churuone.in`

---
*Created by mhdoremon | churuone.in*
