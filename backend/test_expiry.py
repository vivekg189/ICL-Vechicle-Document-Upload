import urllib.request, json

def fetch(url):
    r = urllib.request.urlopen(url)
    return r.status, json.loads(r.read())

# 1. Stats endpoint
status, data = fetch('http://127.0.0.1:5000/api/stats')
print('GET /api/stats ->', status)
doc = data['documents']
print('  vehicles      :', data['vehicles'])
print('  total docs    :', doc['total'])
print('  valid         :', doc['valid'])
print('  expiring_soon :', doc['expiring_soon'])
print('  expired       :', doc['expired'])
print('  no_expiry     :', doc['no_expiry'])
alerts = data.get('alerts', [])
print('  alerts count  :', len(alerts))
for a in alerts:
    line = '    - ' + a['document_name'] + ' (' + a['document_type'] + ') : ' + a['label'] + ' (' + str(a['days_remaining']) + 'd)'
    print(line)

# 2. Documents with expiry_status field
status2, data2 = fetch('http://127.0.0.1:5000/api/documents')
print('\nGET /api/documents ->', status2, '(' + str(data2['count']) + ' docs)')
for d in data2['documents']:
    es = d.get('expiry_status', {})
    line = '  [' + str(es.get('status', '?')) + '] ' + d['document_name'] + ' | ' + str(es.get('label', '?')) + ' | days=' + str(es.get('days_remaining'))
    print(line)

print('\nAll expiry tracking API tests PASSED.')
