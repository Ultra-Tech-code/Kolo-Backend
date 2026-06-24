import re
with open('src/services/stellar.service.ts', 'r') as f:
    content = f.read()

def resolve_stellar(match):
    return match.group(2) # upstream

content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> upstream/main', resolve_stellar, content, flags=re.DOTALL)
with open('src/services/stellar.service.ts', 'w') as f:
    f.write(content)
