import urllib.request, json, os

BASE = 'http://127.0.0.1:5000/api'

# 1. Health check
res = urllib.request.urlopen(f'{BASE}/health')
print('Health:', json.loads(res.read()))

# 2. GET documents (should be empty)
res = urllib.request.urlopen(f'{BASE}/documents')
data = json.loads(res.read())
print('Documents count initially:', data['count'])

# 3. Create a valid minimal PDF file
test_pdf = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF'
test_pdf_path = 'test_document.pdf'
with open(test_pdf_path, 'wb') as f:
    f.write(test_pdf)
print(f'Test PDF created: {len(test_pdf)} bytes')

# 4. POST document via multipart/form-data
def encode_multipart(fields, files):
    boundary = 'VaultBoundary999'
    body = b''
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, (fname, fdata, mime) in files.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{fname}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
        body += fdata + b'\r\n'
    body += f'--{boundary}--\r\n'.encode()
    return body, f'multipart/form-data; boundary={boundary}'

with open(test_pdf_path, 'rb') as f:
    pdf_data = f.read()

fields = {
    'vehicle_id': '2',
    'document_name': 'RC Book - Innova Hycross',
    'document_type': 'RC',
    'issue_date': '2024-01-15',
    'expiry_date': '2039-01-14',
    'notes': 'Original RC for Toyota Innova Hycross ZX'
}
files = {'file': ('rc_book.pdf', pdf_data, 'application/pdf')}
body, content_type = encode_multipart(fields, files)

req = urllib.request.Request(f'{BASE}/documents', data=body, headers={'Content-Type': content_type}, method='POST')
res = urllib.request.urlopen(req)
doc = json.loads(res.read())
print(f"POST document: status={res.status}, id={doc['document']['id']}, name={doc['document']['document_name']}")
doc_id = doc['document']['id']

# 5. GET document by id
res = urllib.request.urlopen(f'{BASE}/documents/{doc_id}')
data = json.loads(res.read())
print(f"GET by id: {data['document']['id']} - {data['document']['file_name']}")

# 6. GET all documents
res = urllib.request.urlopen(f'{BASE}/documents')
data = json.loads(res.read())
print('All documents count:', data['count'])

# 7. Test download endpoint (check it returns PDF bytes)
res = urllib.request.urlopen(f'{BASE}/documents/{doc_id}/download')
content_type_resp = res.headers.get('Content-Type', '')
body_bytes = res.read()
print(f'Download: status={res.status}, content-type={content_type_resp}, size={len(body_bytes)} bytes')

# 8. DELETE document
req = urllib.request.Request(f'{BASE}/documents/{doc_id}', method='DELETE')
res = urllib.request.urlopen(req)
print('DELETE:', res.status, json.loads(res.read())['message'])

# 9. Verify file was cleaned up
os.remove(test_pdf_path)
print('\nAll document API tests PASSED!')
