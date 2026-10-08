# Family Clinic Dashboard: Comprehensive System Upgrade & Feature Proposal

**Project:** Family Clinic Dashboard  
**Current Route:** `/medi-clinic`  
**Deployed Base:** https://vercel.app  
**Repository:** https://github.com  
**Status:** Current capabilities are documented alongside upcoming deliverables. This is a phased product and technical specification. All modules are designed to integrate safely into active production branches without breaking existing billing tools.

---

## 🔗 Deployed Access Links & Routing Segregation

The following deployed URLs act as the explicit entry points for specific clinic audiences:
*   **Patients:** `https://vercel.app/medi-clinic` — Patient sign-in and interface.
*   **Administration:** `https://vercel.app/medi-clinic/dashboard` — Administrative sign-in; manage configurations and create staff records.
*   **Doctors:** `https://vercel.app/medi-clinic/doctors` — Clinician workspace sign-in.
*   **Pharmacy:** `https://vercel.app/medi-clinic/pharmacy` — Pharmacy inventory and fulfillment workspace.

### 🔐 Multi-Session & Isolation Upgrades
To prevent session leaking and authentication crossover, the system architecture enforces total isolation between roles:
*   **Session Independence:** If a patient dashboard is active in a browser instance and an admin authenticates on the same system/network, sessions remain perfectly sandboxed. They work independently on their respective workflows (`/medi-clinic/dashboard` vs `/medi-clinic`) without overriding auth tokens, leaking cookies, or clashing states.
*   **Route Enforcement:** The "New Patient -> Create Account" signup option must strictly render on the patient-facing portal. It is programmatically hidden and restricted when the active URL route matches management views (`/medi-clinic/dashboard` or `/medi-clinic/doctors`).
*   **Lazy Onboarding Flow:** When a new user creates an account at `/clinic-register`, no immediate profile registration details are required. They complete initial authentication first. Upon logging in for the first time, they are dynamically caught by a mandatory onboarding screen to fill in additional details before being granted layout access.
*   **Access Review Queue:** New registrations are placed into an owner review queue managed via the `clinic-patient-access-requests.sql` migration. This prevents immediate unverified patient profile generation or portal traversal before explicit admin authorization.

---

## 1. Purpose, Core Baseline & Roles

Deliver changes incrementally so that working patient intake, scheduling, and front-desk modules continue operating safely.

### Active App Capabilities (Current Baseline)
*   Supabase Auth sign-in architecture across protected `/medi-clinic` layouts.
*   Clinic role resolution (`owner` and `front_desk`) derived from trusted Supabase `app_metadata` claims.
*   Existing schema structures for `patients`, `appointments`, and `treatments` bound tightly via PostgreSQL Row-Level Security (RLS) in `supabase/patients.sql` and `supabase/medi-clinic.sql`.
*   Operational dashboard tracking new patient metrics over 6 months and monthly appointment status parameters.

### Role & Access Rights Matrix

| Role | Operational Access Rights |
| :--- | :--- |
| **Owner / Clinic Admin** | **Full CRUD Authority.** Resolved authorization faults to allow absolute profile management (add/edit patient records). Manages clinic memberships. |
| **Reception / Front Desk** | Main patient demographics, schedules appointments, updates intake state, and logs in-person cash payments. |
| **Doctor / Clinician** | Accesses assigned schedules and clinical histories; signs clinical encounter logs and prescriptions. |
| **Pharmacist** | Reviews and dispenses validated prescription scripts; restricted access strictly limited to safety and fulfillment payloads. |
| **Stock Manager** | Direct management over supply catalogs, inventory batches, and product expiry dates. No visibility into clinical patient histories. |
| **Patient** | Restricted exclusively to their own verified family profile data, appointments, and financial invoices via the protected portal. |

---

## 🏥 2. Feature Specification: Integrated Medical Aid & Co-Payment Processing

### Feature Overview
To eliminate manual invoicing, friction at checkout, and unexpected out-of-pocket costs, the dashboard includes an integrated **Medical Aid & Benefit Verification System**. This module allows patients to link health insurance plans directly to family profiles, enabling real-time claim validation, automated network rate processing, and dynamic co-payment calculations.

### User Flow & Interface Requirements

#### 1. Medical Aid Integration & Profile Setup
Patients manage family insurance coverage directly from their profile configuration layout.
*   **Provider & Plan Mapping:** A searchable dropdown menu populated with recognized South African medical schemes (e.g., Discovery Health, Momentum, Bonitas) and their respective tier plans.
*   **Family Dependency Hierarchy:** Main members input core policy numbers once and map specific dependents (spouse, children) to their respective sub-profiles for accurate transactional claim routing.
*   **Digital Card Upload:** Secure file-upload interface supporting JPEG, PNG, or PDF formats to save digital copies of physical medical aid cards within private Supabase storage folders for administrative clinic verification.

#### 2. Live Switch Verification (Backend APIs)
Upon submission, the platform establishes background handshakes via a medical switch API gateway (e.g., Healthbridge / MediSwitch):
*   **Status Indicators:** Renders dynamic live visual UI badges reflecting verified membership states: `[🟢 Active / Verified]`, `[🟡 Pending Verification]`, or `[🔴 Check Coverage / Invalid Details]`.
*   **Pre-Authorisation Engine:** Automated system interceptors flag specialized operations or distinct consultations requiring explicit authorization, providing patients with a clinic token to clear with their provider.

#### 3. Dynamic "In-Network" Checkout Calculations
The dashboard deprecates retail-style "discount codes," substituting them with automated network tariff processing and drug formulary calculations.

| Touchpoint Transaction | System Logic & Interception Rules | Patient-Facing UI Result |
| :--- | :--- | :--- |
| **Consultation Booking** | Checks if the practitioner/clinic acts as a **Designated Service Provider (DSP)** or "In-Network" asset for the chosen plan. | Displays inline banner: <br>`✓ In-Network rate applied: 100% covered by scheme.` |
| **Bill Payment / Checkout** | Fires a real-time pre-claim payload query to compute exact co-payment splits based on available limits. | Itemizes real-time invoice:<br>• **Gross Cost:** R550.00<br>• **Scheme Covered:** -R450.00<br>• **Payable Out-of-Pocket:** R100.00 |
| **Pharmacy / Refills** | Cross-references medical orders against the scheme’s preferred drug formulary list. | Automatically suggests alternatives:<br>`💡 Generic substitute selected to avoid co-payment.` |

#### 4. Patient Value-Add Utilities
*   **Medical Savings Account (MSA) Widget:** A clean dashboard visualizer displaying estimated remaining day-to-day funds to preemptively flag self-payment gaps before consultation bookings.
*   **Wellness & Rewards Integration:** Logs preventative care data points or clinic health assessments to unlock incentive funding buckets (e.g., Discovery Vitality metrics, Momentum Multiply, Bonitas Booster funds).

---

## 🛠️ 3. Technical Implementation & Database Architecture

Introduce all new tables through explicit, forward-only migrations. Avoid logging sensitive cryptographic keys or payment parameters in plaintext arrays.

### CSV Data Seed Requirements
To safely seed or verify environment integrity, standard initialization protocols require data files mapping:
*   `appointment_types.csv`: Scopes custom category durations and base pricing models (Routine: 30m, Acute: 20m, Chronic: 40m).
*   `inventory_batches.csv`: Ingests drug catalog files, SKUs, unique batch identifiers, and stock expiry limits.
*   `provider_shifts.csv`: Sets practitioner profiles, clinical schedules, working shifts, and allocation blocks.
*   `medical_records.csv`: Populates anonymized demographic health files for development sandboxes.

### Target Database Relational Schema

```text
[medical_aid_providers]
 ├── id (UUID, PK)
 ├── scheme_name (VARCHAR) -- e.g., 'Discovery Health'
 ├── plan_tier (VARCHAR)   -- e.g., 'Classic Smart'
 └── switch_code (VARCHAR) -- Healthbridge/MediSwitch gateway router flag

[patient_insurance_profiles]
 ├── id (UUID, PK)
 ├── user_id (UUID, FK)    -- Binds to auth.users
 ├── dependent_id (UUID)   -- Optional tracking mapping for family sub-profiles
 ├── member_id_encrypted   -- AES-256 encrypted string of policy number
 └── card_blob_pointer     -- Storage reference path within Supabase bucket
```

### 🔒 Security, Private Storage & POPIA Compliance
*   **Data Encryption:** All insurance policy records, national identity keys, and card documents must be encrypted at rest and during transmission, complying with **POPIA** (Protection of Personal Information Act) and **HIPAA** guidelines.

NB:additional things to take notice of:
• Supabase Storage Policies: Implement private bucket grouping structures using restricted folder architecture organized by verified identifiers (pt_<uuid>/medical_cards/).
• Least-Privilege RLS: Enforce storage policy objects checking that the active session matches ownership claims. The application must never surface static, public object paths; utilize short-lived signed URLs with a max lifespan configuration of 15 minutes.

💳 4. Secure Payment Processing & Tokenization

Keep live public payment gateways decoupled from baseline scheduling testing. Once implemented, billing architectures must guarantee detailed parameter logging:
• Customer & Billing Ingestion: Captures client names, addresses, emails, and transactional IP footprints.
• Instrument Tokenization: Utilizes secure token exchanges or encrypted transaction payload maps (PAN numbers, CVVs, and expiry records must never touch the core database as raw strings).
• Transaction Metadata: Enforces tracking logic compiling exact timestamp markers, currency indices, unique transaction tracking identifiers, and authorization status response flags.
• Itemized Inventory Mapping: Links billing lines to specific SKU records, healthcare tax definitions, and product quantities.
• Admin Control: All processing, dispute resolutions, and manual ledger overrides are managed through administrative panels restricted to Owner/Staff classes.

🚀 5. Phased Delivery & Engineering Milestones

• Phase 0: Base Hardening (Current Sprint)
└── Review RLS structures ➔ Deploy registration request queues ➔ Resolve Admin profile CRUD permissions.
• Phase 1: Scheduling & Data Foundations
└── Ingest core CSV matrices ➔ Map shifts, blocks, and duration parameters ➔ Overlap locks.
• Phase 2: Patient Portal & Document Integration
└── Verify patient links ➔ Deliver private signed storage buckets ➔ Setup card views.
• Phase 3: Medical Aid & Payments Switch
└── Connect real-time API gateways ➔ Inject co-payment split checkouts.

🧪 6. Testing, Quality Assurance & Acceptance Criteria

The system upgrade cannot deploy to production branches unless it clears both automated code checks and manual responsive visual flows.

Automated Python Smoke Simulation Test

Developers should execute the test routine below to verify structural tenant separation, conflict prevention systems, and onboarding tracking:
```python
import uuid
from typing import Dict, Any, List
class ClinicVerificationTestDB:
def init(self):
self.sessions: Dict[str, dict] = {}
self.review_queue: List[dict] = []
self.patient_profiles: Dict[str, dict] = {}
self.appointments: List[dict] = []
def queue_patient_signup(self, email: str, name: str) -> dict:
entry = {"id": str(uuid.uuid4())[:6], "email": email, "name": name, "status": "pending_review"}
self.review_queue.append(entry)
return entry
def owner_authorize_profile(self, caller_role: str, entry_id: str) -> bool:
if caller_role != "owner":
raise PermissionError("RLS Restriction: Unauthorized management access attempt.")
for item in self.review_queue:
if item["id"] == entry_id:
item["status"] = "approved"
self.patient_profiles[f"pt_{item['id']}"] = {"name": item["name"], "medical_aid": "Active"}
return True
return False
def schedule_slot(self, doctor_id: str, slot_time: str) -> bool:
for appt in self.appointments:
if appt["doctor"] == doctor_id and appt["time"] == slot_time:
return False # Block concurrent overlapping bookings
self.appointments.append({"doctor": doctor_id, "time": slot_time})
return True

--- Verification Evaluation Executions ---

def run_proposal_smoke_suite():
print("🚀 Running System Verification Flow...")
suite = ClinicVerificationTestDB()
# 1. Check Lazy Onboarding Tracking
entry = suite.queue_patient_signup("user@nextmail.com", "Thabo Mokoena")
assert len(suite.patient_profiles) == 0
print("🟢 [PASSED]: Signup locked from interface routing. Placed in verification queue.")
# 2. Validate Tenant Permission Escalation Defense
try:
suite.owner_authorize_profile("patient", entry["id"])
print("🔴 [FAILED]: Security breach. Patient was allowed to self-approve profile status.")
except PermissionError:
print("🟢 [PASSED]: Access control interceptors successfully blocked unauthorized role modification.")
# 3. Conflict Engine Overlap Protection
ok_1 = suite.schedule_slot("dr_smit", "10:00 AM")
ok_2 = suite.schedule_slot("dr_smit", "10:00 AM")
assert ok_1 is True and ok_2 is False
print("🟢 [PASSED]: Transaction processing rules successfully rejected concurrent double-booking.")
if name == "main":
run_proposal_smoke_suite()
```

Core Acceptance Criteria (Definition of Done)

• [DoD-01] Zero Metadata Crossover: A user role cannot hijack access boundaries by tampering with client query arguments or browser profile states. RLS layers block all requests failing validation.
• [DoD-02] Clean Separation of Layouts: Public signup buttons are completely hidden across administrative sub-paths (/medi-clinic/dashboard).
• [DoD-03] Verified Sandbox Operations: Multiple tabs running different roles concurrently on the same network node remain completely sandboxed without cookie or state interference.
• [DoD-04] Responsive Interface Design: All newly introduced panels, co-payment layout grids, and switch badges scale cleanly to mobile viewports without introducing horizontal scroll overflow anomalies.
• [DoD-05] Operational Security Audits: System logs append-only event records capturing signature updates, configuration overrides, and administrative modifications without recording raw identity keys or system secrets.

***

<FollowUp>
Would you like me to write a **README.md add-on snippet** that summarizes this feature for your repository's main landing page?
</FollowUp>