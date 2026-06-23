import re
with open('src/__tests__/stellar.service.test.ts', 'r') as f:
    content = f.read()

def resolve_stellar_test(match):
    head = match.group(1)
    upstream = match.group(2)
    if 'expect(fillSpy)' in head:
        return """                expect(wallet.publicKey).toBe('G_MOCK_PUBLIC_KEY');
                expect(wallet.encryptedSecret).toBeDefined();
                expect(wallet.iv).toBeDefined();
                expect(wallet.authTag).toBeDefined();
                expect(fillSpy).toHaveBeenCalledWith(0);

                const decrypted = decrypt(wallet.encryptedSecret, wallet.iv, wallet.authTag);
                expect(decrypted).toBe('S_MOCK_SECRET_KEY');
            } finally {
                fillSpy.mockRestore();
            }"""
    if "should return a generated keypair with encrypted secret" in head:
        return ""
    if "should log and swallow friendbot failures" in head:
        return head
    return head

content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> upstream/main', resolve_stellar_test, content, flags=re.DOTALL)
with open('src/__tests__/stellar.service.test.ts', 'w') as f:
    f.write(content)
