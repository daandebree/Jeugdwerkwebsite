// Netlify Function: upload-photo
// Ontvangt een base64-foto + naam, commit naar GitHub → Netlify rebuild volgt automatisch.
//
// Vereiste environment variables in Netlify dashboard:
//   GITHUB_TOKEN  — Personal Access Token met 'repo' scope
//   GITHUB_REPO   — "eigenaar/reponaam"  (bijv. "daand/kerk-website")
//   GITHUB_BRANCH — branch om naar te committen (default: "main")

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // --- Parse body ---
  let naam, imageBase64;
  try {
    ({ naam, imageBase64 } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ongeldige aanvraag' }) };
  }

  if (!naam || typeof naam !== 'string' || naam.length > 200) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Naam ontbreekt of is ongeldig' }) };
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Foto ontbreekt' }) };
  }

  // Strip data URI prefix indien aanwezig
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  // Valideer dat het een afbeelding is via magic bytes (JPEG, PNG, WebP, GIF)
  const firstBytes = Buffer.from(base64Data.slice(0, 16), 'base64');
  const isJpeg = firstBytes[0] === 0xff && firstBytes[1] === 0xd8;
  const isPng  = firstBytes[0] === 0x89 && firstBytes[1] === 0x50;
  const isWebp = firstBytes[8] === 0x57 && firstBytes[9] === 0x45; // "WE" van WEBP
  if (!isJpeg && !isPng && !isWebp) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Alleen JPEG, PNG of WebP is toegestaan' }) };
  }

  // Max ~10 MB base64 (~7.5 MB afbeelding)
  if (base64Data.length > 10 * 1024 * 1024) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Foto is te groot (max 7 MB)' }) };
  }

  // --- GitHub config ---
  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_REPO   = process.env.GITHUB_REPO;
  const BRANCH        = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.error('Ontbrekende environment variables: GITHUB_TOKEN of GITHUB_REPO');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Serverconfiguratie ontbreekt' }) };
  }

  const [owner, repo] = GITHUB_REPO.split('/');

  const ghFetch = (path, options = {}) =>
    fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, {
      ...options,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

  // --- Haal photo_map.json op van GitHub ---
  const mapRes = await ghFetch(`contents/images/leiding/photo_map.json?ref=${BRANCH}`);
  if (!mapRes.ok) {
    console.error('Kan photo_map.json niet ophalen:', await mapRes.text());
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Serverfout bij ophalen fotolijst' }) };
  }
  const mapData   = await mapRes.json();
  const mapSha    = mapData.sha;
  const photoMap  = JSON.parse(Buffer.from(mapData.content, 'base64').toString('utf-8'));

  // --- Bepaal doelpad ---
  // Normaliseer naam voor zoeken (HTML entities)
  const naamNorm  = naam.replace(/&amp;/g, '&').trim();
  const naamHtml  = naam.replace(/&/g, '&amp;').trim();

  // Zoek de bijbehorende key in photo_map
  const mapKey = Object.keys(photoMap).find(
    k => k === naam || k === naamNorm || k === naamHtml
  );

  let targetPath;
  let needsMapUpdate = false;

  if (mapKey && photoMap[mapKey]) {
    // Bestaand pad gebruiken
    targetPath = photoMap[mapKey];
  } else {
    // Genereer pad op basis van slug
    targetPath = `images/leiding/${slugify(naamNorm)}.jpg`;
    needsMapUpdate = true;
    if (mapKey) {
      photoMap[mapKey] = targetPath;
    } else {
      // Naam niet in map: voeg toe
      photoMap[naamNorm] = targetPath;
    }
  }

  // Valideer dat het pad binnen images/leiding/ valt (voorkom path traversal)
  if (!targetPath.startsWith('images/leiding/') || targetPath.includes('..')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ongeldig doelpad' }) };
  }

  // --- Haal SHA op van bestaand bestand (nodig voor overschrijven) ---
  let fileSha;
  const existingRes = await ghFetch(`contents/${targetPath}?ref=${BRANCH}`);
  if (existingRes.ok) {
    const existing = await existingRes.json();
    fileSha = existing.sha;
  }

  // --- Commit afbeelding ---
  const commitBody = {
    message: `Foto bijgewerkt: ${naamNorm}`,
    content: base64Data,
    branch: BRANCH,
  };
  if (fileSha) commitBody.sha = fileSha;

  const uploadRes = await ghFetch(`contents/${targetPath}`, {
    method: 'PUT',
    body: JSON.stringify(commitBody),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('GitHub upload mislukt:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Upload naar server mislukt' }) };
  }

  // --- Update photo_map.json indien nodig ---
  if (needsMapUpdate) {
    const newMapContent = Buffer.from(JSON.stringify(photoMap, null, 2)).toString('base64');
    const mapUpdateRes = await ghFetch('contents/images/leiding/photo_map.json', {
      method: 'PUT',
      body: JSON.stringify({
        message: `photo_map bijgewerkt: ${naamNorm}`,
        content: newMapContent,
        sha: mapSha,
        branch: BRANCH,
      }),
    });
    if (!mapUpdateRes.ok) {
      console.warn('photo_map update mislukt (foto zelf is wel opgeslagen)');
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, path: targetPath }),
  };
};

function slugify(name) {
  return name
    .replace(/&amp;|&/g, 'en')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
