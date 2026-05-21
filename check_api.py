import urllib.request, json, ssl, urllib.parse

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

APP_ID   = "app.donkeymobile.pknwoudenberghervormd"
BASE     = "https://donkeymobile.com"
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
    try:
        with urllib.request.urlopen(r, context=ctx) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]

token = post("/api/v1/session/signin", {
    "emailAddress": "debreedaan@gmail.com",
    "password": "CXkZf8:qJjA:-8Y",
    "applicationId": APP_ID
})["accessToken"]
print("Logged in")

# Fetch user by ID (Paul Haring's creatorId from search result)
user_id = "63f51fadadc286d83923ecf0"
status, u = get(f"/api/v1/users/{user_id}", token)
print(f"User by ID: status={status}")
if isinstance(u, dict):
    print("  Keys:", list(u.keys()))
    img = u.get("image")
    print("  image:", json.dumps(img))
else:
    print("  Response:", u[:200])

# Try groups
print()
for path in ["/api/v3/groups?limit=10", "/api/v1/groups?limit=10"]:
    status, groups = get(path, token)
    print(f"Groups {path}: status={status}")
    if status == 200:
        gl = groups if isinstance(groups, list) else groups.get("data", [])
        print(f"  Count: {len(gl)}")
        for g in gl[:3]:
            name = g.get("name", "?")
            gid = g.get("id") or g.get("_id", "?")
            print(f"  - {name} ({gid})")
        break
