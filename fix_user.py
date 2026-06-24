import re
with open('src/services/user.service.ts', 'r') as f:
    content = f.read()

# For user.service.ts, we want to keep upstream changes but insert our console.log
def resolve_user(match):
    head = match.group(1)
    upstream = match.group(2)
    return upstream

content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> upstream/main', resolve_user, content, flags=re.DOTALL)
content = content.replace("            });", "            });\n            console.log(`Created new user for ${phoneNumber} with wallet ${wallet.publicKey}`);")
with open('src/services/user.service.ts', 'w') as f:
    f.write(content)
