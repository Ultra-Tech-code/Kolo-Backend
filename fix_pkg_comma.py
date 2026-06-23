with open('package.json', 'r') as f:
    content = f.read()
content = content.replace('"react": "^19.2.7"\n    "supertest"', '"react": "^19.2.7",\n    "supertest"')
with open('package.json', 'w') as f:
    f.write(content)
