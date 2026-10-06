import urllib.request
import json

base = "http://localhost:8000"

def check(url):
    try:
        req = urllib.request.urlopen(base + url)
        print(f"GET {url} -> Status {req.getcode()}")
    except Exception as e:
        print(f"GET {url} -> Exception: {e}")

check("/docs")
check("/api/dashboard")
check("/api/projects")
check("/api/goals")
check("/api/tax/analysis")
check("/api/settings")
