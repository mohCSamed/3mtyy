# -*- coding: utf-8 -*-
import hashlib
words = ['عمتيي', 'داليا', '3mtyy@Vault2026!']
for w in words:
    h = hashlib.sha256(w.lower().encode('utf-8')).hexdigest()
    print(f'{w!r} => {h}')
