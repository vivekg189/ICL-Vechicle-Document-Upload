"""
Seed test documents with different expiry dates to verify the tracking system.
Run once; clean up after verifying in the browser.
"""
import urllib.request, json
from datetime import date, timedelta

BASE = 'http://127.0.0.1:5000/api'

# Get vehicle id to seed against
r = urllib.request.urlopen(f'{BASE}/vehicles')
vehicles = json.loads(r.read())['vehicles']
if not vehicles:
    print('No vehicles found — add one first!')
    exit(1)

vid = vehicles[0]['id']
vreg = vehicles[0]['registration_number']
print(f'Seeding documents for vehicle {vreg} (id={vid})')

today = date.today()

DOCS_TO_SEED = [
    {'name': 'RC Book 2039', 'type': 'RC', 'expiry': (today + timedelta(days=3650)).isoformat()},
    {'name': 'Insurance Policy', 'type': 'Insurance', 'expiry': (today + timedelta(days=12)).isoformat()},
    {'name': 'PUC Certificate', 'type': 'PUC', 'expiry': (today + timedelta(days=3)).isoformat()},
    {'name': 'Old Pollution Certificate', 'type': 'Pollution Certificate', 'expiry': (today - timedelta(days=45)).isoformat()},
    {'name': 'Driving License (No Expiry)', 'type': 'Driving License', 'expiry': None},
]

# Minimal valid PDF (just %PDF- magic header)
PDF_BYTES = b'%PDF-1.4\n1 0 obj\n<</Type/Catalog>>endobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<</Size 1/Root 1 0 R>>\nstartxref\n9\n%%EOF'

def encode_multipart(fields, file_bytes):
    boundary = 'VaultSeedBoundary'
    body = b''
    for k, v in fields.items():
        body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="' + k + '"\r\n\r\n' + str(v) + '\r\n').encode()
    body += ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="doc.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()
    body += file_bytes + b'\r\n'
    body += ('--' + boundary + '--\r\n').encode()
    return body, 'multipart/form-data; boundary=' + boundary

seeded_ids = []
for doc_def in DOCS_TO_SEED:
    fields = {
        'vehicle_id': str(vid),
        'document_name': doc_def['name'],
        'document_type': doc_def['type'],
    }
    if doc_def['expiry']:
        fields['expiry_date'] = doc_def['expiry']

    body, ct = encode_multipart(fields, PDF_BYTES)
    req = urllib.request.Request(f'{BASE}/documents', data=body, headers={'Content-Type': ct}, method='POST')
    res = urllib.request.urlopen(req)
    saved = json.loads(res.read())['document']
    seeded_ids.append(saved['id'])
    print(f'  Seeded [{saved["id"]}] {saved["document_name"]} | expiry={saved["expiry_date"]}')

# Now hit /api/stats
r = urllib.request.urlopen(f'{BASE}/stats')
stats = json.loads(r.read())
print('\n/api/stats result:')
print(' total      :', stats['documents']['total'])
print(' valid      :', stats['documents']['valid'])
print(' expiring   :', stats['documents']['expiring_soon'])
print(' expired    :', stats['documents']['expired'])
print(' no_expiry  :', stats['documents']['no_expiry'])
print(' alerts     :')
for a in stats['alerts']:
    print('   -', a['document_name'], '|', a['label'], '| days_remaining:', a['days_remaining'])

print('\nSeeded document IDs (to delete from browser or DB):', seeded_ids)
print('\nAll done — open http://localhost:5173 to verify UI.')
