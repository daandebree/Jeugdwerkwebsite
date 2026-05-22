import urllib.request, json, ssl, urllib.parse

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

token = post("/api/v1/session/signin", {
    "emailAddress": "debreedaan@gmail.com",
    "password": "CXkZf8:qJjA:-8Y",
    "applicationId": APP_ID
})["accessToken"]
print("Ingelogd\n")

# Fetch ALL search results for Willeke Hazeleger
results = get("/api/v1/search?query=Willeke+Hazeleger", token)
posts = results.get("results", {}).get("postsAndComments", [])
print(f"Zoekresultaten: {len(posts)}\n")

seen_users = {}
for i, p in enumerate(posts):
    cname  = p.get("creatorName", "")
    cid    = p.get("creatorId", "")
    cimg   = p.get("creatorImage", {})
    group  = p.get("groupName", "")
    msg    = p.get("message", "")[:60]

    if "hazeleger" not in cname.lower():
        continue

    if cid not in seen_users:
        # Fetch full profile
        try:
            user = get(f"/api/v1/users/{cid}", token)
            img  = user.get("image", {})
            email = user.get("emailAddress", "")
            funcs = user.get("functions", [])
        except:
            img, email, funcs = cimg, "", []

        seen_users[cid] = {
            "name": cname,
            "id": cid,
            "email": email,
            "functions": funcs,
            "image": img,
            "groups": set(),
        }

    seen_users[cid]["groups"].add(group)

print(f"Unieke personen met naam 'Hazeleger': {len(seen_users)}\n")
for uid, info in seen_users.items():
    print(f"Naam:      {info['name']}")
    print(f"ID:        {uid}")
    print(f"E-mail:    {info['email']}")
    print(f"Functies:  {info['functions']}")
    print(f"Groepen:   {info['groups']}")
    img = info["image"]
    if img.get("key"):
        print(f"Foto:      {img['width']}x{img['height']} -> {img['key'][:50]}")
        thumb_url = CDN + "/" + urllib.parse.quote(img["key"], safe="/-_.")
        print(f"CDN URL:   {thumb_url[:80]}")
    print()
