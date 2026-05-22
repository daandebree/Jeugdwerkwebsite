import urllib.request, json, ssl, urllib.parse, os, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

APP_ID   = "app.donkeymobile.pknwoudenberghervormd"
BASE     = "https://donkeymobile.com"
CDN      = "https://cdn.donkeymobile.com"
app_info = json.dumps({"version": None, "build": 0, "platform": "WEB_APP", "applicationId": APP_ID})

def post(path, data):
    h = {"Content-Type": "application/json", "donkey-app-info": app_info,
         "User-Agent": "Mozilla/5.0", "Accept": "application/json",
         "Origin": "https://web.donkeymobile.com"}
    r = urllib.request.Request(BASE + path, data=json.dumps(data).encode(), headers=h, method="POST")
    with urllib.request.urlopen(r, context=ctx) as resp:
        return json.loads(resp.read())

def get(path, token):
    h = {"donkey-app-info": app_info, "User-Agent": "Mozilla/5.0",
         "Accept": "application/json", "Origin": "https://web.donkeymobile.com",
         "Authorization": "Bearer " + token}
    r = urllib.request.Request(BASE + path, headers=h)
    with urllib.request.urlopen(r, context=ctx, timeout=15) as resp:
        return json.loads(resp.read())

def slugify(name):
    s = name.lower()
    for a, b in [("ë","e"),("é","e"),("è","e"),("ê","e"),("ä","a"),("ö","o"),
                 ("ü","u"),("ï","i"),("ñ","n"),("ç","c"),("'",""),("'","")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def find_and_download(display_name, search_query, token):
    slug = slugify(display_name)
    out_path = f"images/leiding/{slug}.jpg"
    parts = search_query.lower().split()

    try:
        results = get(f"/api/v1/search?query={urllib.parse.quote(search_query)}", token)
        posts = results.get("results", {}).get("postsAndComments", [])
        for p in posts:
            cn = p.get("creatorName", "").lower()
            if all(part in cn for part in parts if len(part) > 1):
                uid = p.get("creatorId", "")
                img = {}
                if uid:
                    try:
                        user = get(f"/api/v1/users/{uid}", token)
                        img = user.get("image", {})
                    except Exception:
                        pass
                if not img.get("key"):
                    img = p.get("creatorImage", {})
                if img.get("key"):
                    key = img["key"]
                    url = CDN + "/" + urllib.parse.quote(key, safe="/-_.")
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                        data = resp.read()
                    with open(out_path, "wb") as f:
                        f.write(data)
                    w, h2 = img.get("width","?"), img.get("height","?")
                    print(f"  OK  {display_name} ({len(data)//1024} KB, {w}x{h2})")
                    return slug
    except Exception as e:
        print(f"  ERR {display_name}: {e}")

    print(f"  --- {display_name}: niet gevonden")
    return None

print("Inloggen...")
token = post("/api/v1/session/signin", {
    "emailAddress": "debreedaan@gmail.com",
    "password": "CXkZf8:qJjA:-8Y",
    "applicationId": APP_ID
})["accessToken"]
print("OK\n")

os.makedirs("images/leiding", exist_ok=True)

targets = [
    ("Ilona van Milligen",    "Ilona Milligen"),
    ("Rozemarijn de Zwarte",  "Rozemarijn Zwarte"),
    ("Ruben Uijl",            "Ruben Uijl"),
    ("Petra de Voogd",        "Petra Voogd"),
    ("Lois van Pijckeren",    "Lois Pijckeren"),
    ("Jaap van Dam",          "Jaap Dam"),
]

results = {}
for display, query in targets:
    slug = find_and_download(display, query, token)
    results[display] = slug

print("\nResultaat:")
for name, slug in results.items():
    print(f"  {name}: {'images/leiding/'+slug+'.jpg' if slug else 'GEEN FOTO'}")
