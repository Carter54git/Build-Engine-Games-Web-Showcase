from pathlib import Path

data = Path(r'c:\Users\user\Desktop\BuildWebGames\8779-duke-vacation\eduke32.data').read_bytes()
checks = [
    b"definevolumename 1 LIFE'S A BEACH",
    b'VACATION DUKEMATCH',
    b'VACA1.map',
    b'definelevelname 1 0 VACA1.map',
]
for s in checks:
    print(repr(s.decode('latin1', 'replace')), data.find(s))
