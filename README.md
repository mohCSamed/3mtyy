# Private Photo Collection

Luxury digital photo album — wooden library, flipbook albums, fullscreen viewer.

## Structure

```
index.html          ← main site
style.css
script.js
Dalia-WebP/
  Images/
    cover.webp      ← album cover (shelf + book front)
    images.json     ← list of photos (auto-generated)
    001.webp
    002.webp
    ...
  fun/
  5tobtyyy/
  ...
```

The site reads **only** from `images.json` — never hardcoded filenames in code.

## Add or update photos

1. Put `.webp` files in the album folder (`001.webp`, `002.webp`, …).
2. Add or keep `cover.webp` for the album cover.
3. Run sync:

```bash
python tools/sync-images.py
```

Verify without writing:

```bash
python tools/sync-images.py --check
```

## Local preview

```bash
python -m http.server 8765
```

Open: http://localhost:8765

> Do not open `index.html` directly (`file://`) — browsers block `fetch()` for local JSON.

## Deploy to GitHub Pages

**Total size ~720 MB** — you must use [Git LFS](https://git-lfs.com/):

```bash
git lfs install
git lfs track "*.webp"
git add .gitattributes
git add .
git commit -m "Initial photo collection"
git push
```

In the repo: **Settings → Pages → Source: Deploy from branch `main` / root**.

Site URL: `https://<username>.github.io/<repo-name>/`

Passwords are checked in the browser only — the album files remain publicly accessible if someone knows the image URLs. For true privacy, use a private host or Cloudflare Access.

## Albums

| Folder        | Title         |
|---------------|---------------|
| Images        | Images        |
| 5tobtyyy      | 5tobtyyy      |
| fun           | fun           |
| 5tobt Gamal   | 5tobt Gamal   |
| after edit    | after edit    |
| 2014          | 2014          |
