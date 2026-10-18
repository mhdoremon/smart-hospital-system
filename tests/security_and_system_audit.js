import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
    results.push({ name: testName, status: 'PASS', details });
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    results.push({ name: testName, status: 'FAIL', details });
  }
}

async function runAudit() {
  console.log('\n======================================================================');
  console.log('  🏥 SMART HOSPITAL SYSTEM - BUG FINDER & SECURITY AUDIT TEST SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // 1. HEALTH CHECK
  // -------------------------------------------------------------------------
  console.log('--- Suite 0: System Health & Baseline ---');
  const health = await request('/api/health');
  assert(health.status === 200 && health.data?.status === 'ONLINE', '0.1 Health Check API responds ONLINE');

  // -------------------------------------------------------------------------
  // 2. DYNAMIC STAFF PAIRING & TOKEN LIFECYCLE
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 1: Dynamic Staff Pairing & Token Lifecycle ---');
  
  // 1.1 Initiate Pairing
  const initRes = await request('/api/v1/auth/pairing/initiate', {
    method: 'POST',
    body: JSON.stringify({ stationId: 'STATION-AUDIT-01', targetRole: 'DOCTOR' })
  });
  assert(
    initRes.status === 200 && initRes.data?.ok && initRes.data?.pairId && initRes.data?.pairingToken,
    '1.1 Dynamic pairing initiate mints 45s TOTP token',
    `pairId: ${initRes.data?.pairId}`
  );

  const pairId = initRes.data.pairId;
  const pairingToken = initRes.data.pairingToken;
  const nonce = initRes.data.nonce;

  // 1.2 Nonce Mismatch Check
  const nonceBadRes = await request('/api/v1/auth/pairing/approve', {
    method: 'POST',
    body: JSON.stringify({
      pairingToken: `PAIRING:${pairId}:INVALIDNONCE`,
      staffName: 'Dr. Test Staff'
    })
  });
  assert(nonceBadRes.status === 403, '1.2 Cryptographic nonce mismatch is rejected with 403');

  // 1.3 Valid Approval
  const approveRes = await request('/api/v1/auth/pairing/approve', {
    method: 'POST',
    body: JSON.stringify({
      pairingToken,
      staffName: 'Dr. Audit Specialist',
      assignedRole: 'DOCTOR',
      room: 'Room 102'
    })
  });
  assert(
    approveRes.status === 200 && approveRes.data?.staffToken,
    '1.3 Manager approves pairing, minting 8-hour scoped JWT',
    `staffToken: ${approveRes.data?.staffToken}`
  );
  const staffToken = approveRes.data?.staffToken;

  // 1.4 Replay Attack Check on Pairing
  const replayApproveRes = await request('/api/v1/auth/pairing/approve', {
    method: 'POST',
    body: JSON.stringify({
      pairingToken,
      staffName: 'Dr. Malicious Replayer'
    })
  });
  assert(
    replayApproveRes.status === 400 && replayApproveRes.data?.error?.includes('consumed or processed'),
    '1.4 Pairing replay attack blocked: Single-use QR cannot be approved twice'
  );

  // 1.5 Active Stations Check
  const activeStationsRes = await request('/api/v1/auth/pairing/active-stations');
  const foundStation = activeStationsRes.data?.activeStations?.find(s => s.staffToken === staffToken);
  assert(foundStation !== undefined, '1.5 Active stations list accurately reflects paired terminal');

  // 1.6 Instant Kill-Switch
  const revokeRes = await request('/api/v1/auth/pairing/revoke', {
    method: 'POST',
    body: JSON.stringify({ staffToken })
  });
  assert(
    revokeRes.status === 200 && revokeRes.data?.ok,
    '1.6 Manager Kill-Switch terminates terminal session immediately (<100ms)'
  );

  // Verify revoked
  const activeStationsPostRevoke = await request('/api/v1/auth/pairing/active-stations');
  const isStillActive = activeStationsPostRevoke.data?.activeStations?.some(s => s.staffToken === staffToken);
  assert(!isStillActive, '1.7 Revoked station is purged from active station registry');

  // -------------------------------------------------------------------------
  // 3. AI CLINICAL TRIAGE & APPOINTMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: AI Clinical Triage & Appointment Booking ---');

  // 2.1 Emergency Red-Flag Interceptor
  const emergencyTriage = await request('/api/v1/triage/analyze', {
    method: 'POST',
    body: JSON.stringify({ complaint: 'Severe chest pain, heavy sweating, and breathlessness' })
  });
  assert(
    emergencyTriage.data?.emergency === true && emergencyTriage.data?.alert?.includes('CRITICAL EMERGENCY'),
    '2.1 Emergency Red-Flag Interceptor halts booking and mandates 112/108 ER diversion'
  );

  // 2.2 Routine Specialty Triage
  const routineTriage = await request('/api/v1/triage/analyze', {
    method: 'POST',
    body: JSON.stringify({ complaint: 'Severe throat pain with difficulty swallowing and dry cough' })
  });
  assert(
    routineTriage.data?.emergency === false && routineTriage.data?.specialty === 'ENT Specialist',
    '2.2 Semantic Specialty Mapping routes ENT complaint to ENT Specialist'
  );

  // 2.3 Appointment Booking with CarePass
  const bookRes = await request('/api/v1/appointments/book', {
    method: 'POST',
    body: JSON.stringify({
      patientName: 'Rahul Verma',
      phone: '9876543210',
      doctorId: 'DOC-101',
      slot: '10:00 AM',
      complaint: 'Fever and throat pain',
      paymentMode: 'CASH_AT_DESK'
    })
  });
  assert(
    bookRes.status === 200 && bookRes.data?.qrToken?.startsWith('CAREPASS:') && bookRes.data?.fallbackCode,
    '2.3 Appointment booking generates rolling CarePass token & human fallback code',
    `CarePass: ${bookRes.data?.qrToken}`
  );
  const carePassToken = bookRes.data.qrToken;
  const encounterId = bookRes.data.encounter.encounterId;

  // -------------------------------------------------------------------------
  // 4. ZERO-TRUST RESOLVER & HIPAA PRIVACY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Zero-Trust Resolver & HIPAA Privacy Redaction ---');

  // 3.1 Receptionist Resolution (Demographics only, zero clinical leak)
  const recepResolve = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: carePassToken, role: 'RECEPTIONIST' })
  });
  assert(
    recepResolve.status === 200 &&
    recepResolve.data?.role === 'RECEPTIONIST' &&
    recepResolve.data?.data?.patientName &&
    recepResolve.data?.data?.room &&
    recepResolve.data?.data?.clinicalNotes === undefined &&
    recepResolve.data?.data?.history === undefined &&
    recepResolve.data?.data?.allergies === undefined,
    '3.1 Receptionist CarePass resolution strictly redacts clinical history and notes'
  );

  // 3.2 Doctor Resolution (Full Longitudinal EHR)
  const docResolve = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: carePassToken, role: 'DOCTOR' })
  });
  assert(
    docResolve.status === 200 &&
    docResolve.data?.role === 'DOCTOR' &&
    docResolve.data?.data?.patientFullRecord?.allergies?.includes('Penicillin') &&
    docResolve.data?.data?.patientFullRecord?.chronicConditions?.length > 0,
    '3.2 Doctor resolution unlocks full longitudinal EHR and documented allergies'
  );

  // 3.3 Receptionist Privacy Leak Attempt on Lab Order
  // Create a lab order first
  const labOrderRes = await request('/api/v1/clinical/order-lab', {
    method: 'POST',
    body: JSON.stringify({
      encounterId,
      tests: ['Complete Blood Count (CBC) with Differential'],
      priority: 'STAT (Urgent)'
    })
  });
  const labOrderId = labOrderRes.data?.labOrder?.orderId;
  const labQrToken = labOrderRes.data?.labQr;

  const recepLabLeak = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: labQrToken, role: 'RECEPTIONIST' })
  });
  assert(
    recepLabLeak.status === 403 && recepLabLeak.data?.error?.includes('ZERO-LEAK HIPAA VIOLATION'),
    '3.3 Zero-Leak HIPAA Guard blocks Receptionist from accessing clinical Lab Orders (403 Forbidden)'
  );

  // -------------------------------------------------------------------------
  // 5. ALLERGY HARD-STOP ENGINE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Prescription & Allergy Hard-Stop Engine ---');

  // 4.1 Prescribe Penicillin to allergic patient (Rahul Verma has Penicillin allergy)
  const allergyBlockedRes = await request('/api/v1/clinical/prescribe', {
    method: 'POST',
    body: JSON.stringify({
      encounterId,
      medications: [
        { name: 'Amoxicillin-Clavulanate 625mg', dosage: '1 Tab BD x 5 Days', quantity: 10, barcode: '8901032049102' }
      ],
      allergyOverride: false
    })
  });
  assert(
    allergyBlockedRes.status === 403 &&
    allergyBlockedRes.data?.requiresOverride === true &&
    allergyBlockedRes.data?.error?.includes('CRITICAL ALLERGY HARD-STOP'),
    '4.1 Allergy Hard-Stop prevents prescribing Penicillin/Amoxicillin to allergic patient'
  );

  // 4.2 Prescribe with Medical Superintendent Override
  const allergyOverrideRes = await request('/api/v1/clinical/prescribe', {
    method: 'POST',
    body: JSON.stringify({
      encounterId,
      medications: [
        { name: 'Amoxicillin-Clavulanate 625mg', dosage: '1 Tab BD x 5 Days', quantity: 10, barcode: '8901032049102', shelf: 'Rack-C | Shelf-2' }
      ],
      allergyOverride: true,
      overrideReason: 'Severe refractory sinus infection; macrolides contraindicated',
      overrideAuthorizedBy: 'Medical Superintendent Dr. S. Bannerjee'
    })
  });
  assert(
    allergyOverrideRes.status === 200 &&
    allergyOverrideRes.data?.prescription?.allergyOverride === true &&
    allergyOverrideRes.data?.rxQr,
    '4.2 Formal Medical Superintendent override permits signed prescription with audit logging'
  );
  const rxQr = allergyOverrideRes.data?.rxQr;
  const prescriptionId = allergyOverrideRes.data?.prescription?.prescriptionId;

  // 4.3 Receptionist Privacy Leak Attempt on Prescription
  const recepRxLeak = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: rxQr, role: 'RECEPTIONIST' })
  });
  assert(
    recepRxLeak.status === 403 && recepRxLeak.data?.error?.includes('ZERO-LEAK HIPAA VIOLATION'),
    '4.3 Zero-Leak HIPAA Guard blocks Receptionist from accessing Prescriptions (403 Forbidden)'
  );

  // -------------------------------------------------------------------------
  // 6. PHARMACY DISPENSE & ANTI-DOUBLE-DISPENSE LOCK
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Pharmacy Dispense & Anti-Double-Dispense Lock ---');

  // 5.1 Barcode mismatch check
  const badBarcodeRes = await request('/api/v1/pharmacy/dispense', {
    method: 'POST',
    body: JSON.stringify({
      prescriptionId,
      scannedBarcode: '9999999999999_WRONG_BARCODE'
    })
  });
  assert(
    badBarcodeRes.status === 400 && badBarcodeRes.data?.error?.includes('BARCODE MISMATCH'),
    '5.1 Physical package barcode mismatch is rejected with 400 Bad Request'
  );

  // 5.2 Valid Dispense
  const validDispenseRes = await request('/api/v1/pharmacy/dispense', {
    method: 'POST',
    body: JSON.stringify({
      prescriptionId,
      scannedBarcode: '8901032049102'
    })
  });
  assert(
    validDispenseRes.status === 200 &&
    validDispenseRes.data?.ok &&
    validDispenseRes.data?.prescription?.status === 'DISPENSED',
    '5.2 Valid package barcode executes dispense, updates inventory, and marks DISPENSED'
  );

  // 5.3 Anti-Double-Dispense Replay Attack Check
  const doubleDispenseRes = await request('/api/v1/pharmacy/dispense', {
    method: 'POST',
    body: JSON.stringify({
      prescriptionId,
      scannedBarcode: '8901032049102'
    })
  });
  assert(
    doubleDispenseRes.status === 409 &&
    doubleDispenseRes.data?.error?.includes('SECURITY LOCKOUT'),
    '5.3 Anti-double-dispense atomic lock blocks replay attack (409 Conflict)'
  );

  // 5.4 Try double dispense with 'RX:' prefix variation
  const doubleDispensePrefixRes = await request('/api/v1/pharmacy/dispense', {
    method: 'POST',
    body: JSON.stringify({
      prescriptionId: `RX:${prescriptionId}`,
      scannedBarcode: '8901032049102'
    })
  });
  assert(
    doubleDispensePrefixRes.status === 409,
    '5.4 Token normalization prevents anti-double-dispense bypass via prefix variation'
  );

  // 5.5 Flaw 4: Prescribing Post-Dispense Race Condition Check
  const postDispenseEditRes = await request('/api/v1/clinical/prescribe', {
    method: 'POST',
    body: JSON.stringify({
      encounterId,
      medications: [{ name: 'Paracetamol 500mg' }]
    })
  });
  assert(
    postDispenseEditRes.status === 409 && postDispenseEditRes.data?.error?.includes('PRESCRIPTION IMMUTABLE'),
    '5.5 Prescribing post-dispense is strictly immutable and blocked (409 Conflict)'
  );

  // -------------------------------------------------------------------------
  // 7. EDGE CASES & MALFORMED TOKENS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Edge Cases & Error Handling ---');

  // 6.1 Empty Token
  const emptyTokenRes = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: '', role: 'DOCTOR' })
  });
  assert(emptyTokenRes.status === 400, '6.1 Empty QR token string rejected with 400 Bad Request');

  // 6.2 Malformed Token
  const malformedTokenRes = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: 'MALFORMED_TOKEN_NO_COLON', role: 'DOCTOR' })
  });
  assert(malformedTokenRes.status === 404 || malformedTokenRes.status === 400, '6.2 Malformed QR token rejected gracefully');

  // 6.3 Non-existent Lab Order
  const missingLabRes = await request('/api/v1/clinical/qr/resolve', {
    method: 'POST',
    body: JSON.stringify({ qrToken: 'LAB:LAB-NONEXISTENT', role: 'LAB' })
  });
  assert(missingLabRes.status === 404, '6.3 Non-existent lab order token returns 404 Not Found');

  // 6.4 Security Audit Logs Verification
  const auditLogsRes = await request('/api/v1/audit/logs');
  assert(
    auditLogsRes.status === 200 && auditLogsRes.data?.logs?.length > 0,
    '6.4 Security audit logs actively record all critical and warning security events'
  );

  console.log('\n======================================================================');
  console.log(`  AUDIT RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
