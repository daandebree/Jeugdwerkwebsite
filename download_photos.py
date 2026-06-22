"""
Download full-size photos from Donkey Mobile.
Strategy: search by name -> get creatorId -> fetch user profile -> download image.key
"""
import urllib.request, json, ssl, urllib.parse, os, re, sys

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
    for a, b in [("ë","e"),("é","e"),("è","e"),("ê","e"),("ä","a"),("à","a"),("â","a"),
                 ("ö","o"),("ó","o"),("ò","o"),("ü","u"),("ú","u"),("û","u"),("ï","i"),
                 ("í","i"),("î","i"),("ñ","n"),("ç","c"),("&","en"),("'",""),("'","")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def name_matches(creator_name, search_parts):
    """Check if all search parts appear in creator_name."""
    cn = creator_name.lower()
    return all(p.lower() in cn for p in search_parts if len(p) > 1)

def find_photo(display_name, search_query, token):
    """Search for a person and return their full-size image key, or None."""
    search_parts = search_query.split()
    try:
        results = get(f"/api/v1/search?query={urllib.parse.quote(search_query)}", token)
        posts = results.get("results", {}).get("postsAndComments", [])
        for post_item in posts:
            creator_name = post_item.get("creatorName", "")
            creator_id   = post_item.get("creatorId", "")
            creator_img  = post_item.get("creatorImage", {})
            if not name_matches(creator_name, search_parts):
                continue
            # Try to get full profile for better image
            if creator_id:
                try:
                    user = get(f"/api/v1/users/{creator_id}", token)
                    full_img = user.get("image", {})
                    if full_img.get("key"):
                        print(f"    Match: {creator_name} (profile photo {full_img.get('width','?')}x{full_img.get('height','?')})")
                        return full_img["key"]
                except Exception:
                    pass
            # Fallback to post's creatorImage
            if creator_img.get("key"):
                print(f"    Match: {creator_name} (post photo fallback)")
                return creator_img["key"]
    except Exception as e:
        print(f"    Search error: {e}")
    return None

def download_key(key, out_path):
    url = CDN + "/" + urllib.parse.quote(key, safe="/-_.")
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(r, context=ctx, timeout=20) as resp:
            data = resp.read()
        with open(out_path, "wb") as f:
            f.write(data)
        return len(data)
    except Exception as e:
        print(f"    Download error: {e}")
        return 0

# Targets: (display_name, search_query)
TARGETS = [
    # Catechese mentoren wijk 2
    ("Greta Leeuwdrenth",          "Greta Leeuwdrent"),
    ("Paul Haring",                "Paul Haring"),
    ("Hans Veldkamp",              "Hans Veldkamp"),
    ("Lisa van Maanen",            "Lisa van Maanen"),
    ("Jantine Vos",                "Jantine Vos"),
    ("Willeke van Werkhoven",      "Willeke Werkhoven"),
    ("Jonathan van Grol",          "Jonathan Grol"),
    ("Corine van Vliet",           "Corine Vliet"),
    ("Harm Olde",                  "Harm Olde"),
    ("Jolanda Dees",               "Jolanda Dees"),
    ("Alex Wessels",               "Alex Wessels"),
    ("Anneke Verkaik",             "Anneke Verkaik"),
    # Woensdagmiddagclub
    ("Anne Lubbers - van den Berge", "Anne Lubbers"),
    ("Rhode de Jager-de Boer",    "Rhode Jager"),
    ("Marieke Veenendaal - Noort", "Marieke Veenendaal"),
    # Jongensclub
    ("Arnout van Maanen",          "Arnout Maanen"),
    ("Jan-Paul Hooydonk",          "Jan-Paul Hooydonk"),
    ("Jonan Harrewijn",            "Jonan Harrewijn"),
    ("Wim Westeneng",              "Wim Westeneng"),
    ("Aart-Jan van der Wind",      "Aart-Jan Wind"),
    ("Henk Langelaar",             "Henk Langelaar"),
    # Meisjesclub

    ("Alinda van Burg",            "Alinda Burg"),
    # Connect
    ("Bert-Jan van den Brink",     "Bert-Jan Brink"),
    ("Geraldine van Hell-Geurs",   "Geraldine Hell"),
    ("Hanneke van Laar",           "Hanneke Laar"),
    ("Marleen van der Steeg",      "Marleen Steeg"),
    # Bijbeluur
    ("Martha Doeven",              "Martha Doeven"),
    ("Marisca Wind-ter Burg",      "Marisca Wind"),
    ("Pieter de Pater",            "Pieter Pater"),
    ("Kees van Dam",               "Kees Dam"),
    ("Hans Staring",               "Hans Staring"),
    ("Karin Staring-Popping",      "Karin Staring"),
    ("Annemarie van Driel",        "Annemarie Driel"),
    ("Levi Lokhorst",              "Levi Lokhorst"),
    ("Alie van Veluw",             "Alie Veluw"),
    ("Aline van Viegen",           "Aline Viegen"),
    ("Corine Blokhuis",            "Corine Blokhuis"),
    ("Marlinde Blok",              "Marlinde Blok"),
    ("Henriette van der Linden",   "Henriette Linden"),
    # Oppas
    ("Anika Bastiani",             "Anika Bastiani"),
    ("Marijke Hardeman-van Beek",  "Marijke Hardeman"),
    ("Lida Slijkhuis-den Hertog",  "Lida Slijkhuis"),
    ("Jacoline Bos-Westeneng",     "Jacoline Bos"),
    ("Charlotte Foran",            "Charlotte Foran"),
    ("Corianne Zijl",              "Corianne Zijl"),
    ("Julia Leeuwdrent",           "Julia Leeuwdrent"),
    ("Naomi van de Zandschulp",    "Naomi Zandschulp"),
    ("Madelief Louter",            "Madelief Louter"),
    # Catecheten wijk 1 (new)
    ("Willeke Hazeleger",          "Willeke Hazeleger"),
    ("Dina Wever",                 "Dina Wever"),
    ("Herbert van den Belt",       "Herbert Belt"),
]

print("=== Donkey Mobile Photo Downloader (full-size) ===")
print("Logging in...")
token = post("/api/v1/session/signin", {
    "emailAddress": "debreedaan@gmail.com",
    "password": "CXkZf8:qJjA:-8Y",
    "applicationId": APP_ID
})["accessToken"]
print("OK\n")

os.makedirs("images/leiding", exist_ok=True)

downloaded = 0
not_found = []
done_slugs = set()

for display_name, search_query in TARGETS:
    slug = slugify(display_name)
    if slug in done_slugs:
        continue
    done_slugs.add(slug)
    out_path = f"images/leiding/{slug}.jpg"

    print(f"[{display_name}]")
    key = find_photo(display_name, search_query, token)

    if key:
        size = download_key(key, out_path)
        if size:
            print(f"  Saved {slug}.jpg ({size // 1024} KB)")
            downloaded += 1
        else:
            print(f"  Download failed")
            not_found.append(display_name)
    else:
        print(f"  Not found")
        not_found.append(display_name)

print(f"\n=== Done: {downloaded}/{len(TARGETS)} downloaded ===")
if not_found:
    print("Not found:")
    for n in not_found:
        print(f"  - {n}")
