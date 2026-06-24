import json
with open('package.json', 'r') as f:
    content = f.read()
import re
content = re.sub(r'<<<<<<< HEAD.*?=======\n(.*?)\n>>>>>>> upstream/main', r'\1\n    "supertest": "^7.2.2"', content, flags=re.DOTALL)
with open('package.json', 'w') as f:
    f.write(content)
