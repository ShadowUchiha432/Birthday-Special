# Process — How to Use, Customize, and Host *A Garden of Wishes* on GitHub

This guide walks you step by step through everything in the project: running it locally, adding Selena Gomez's **Birthday** (`song.mp3`), hosting the website on **GitHub Pages**, connecting the optional **private GitHub keepsake photo storage**, and verifying every single feature before sharing it with your girlfriend.

---

## 1. What's Inside (All 7 Scenes & Features)

1. **Magical Intro (`src/components/Intro.tsx`)**
   - Opens on a quiet blank night screen for 3 seconds, then blooms softly into the pink garden with **"Explore your presents"**.
2. **Interactive Pink Flower Garden (`src/components/Garden.tsx`, `src/components/GardenArt.tsx`)**
   - 186 code-drawn pink flowers arranged across 3 depth layers (no AI images).
   - **Morning / Evening / Night** sky toggle with sun/crescent moon, twinkling stars, drifting petals, and clouds aligned naturally across the sky.
   - Continuous smooth **5-second rolling wind wave** across every flower stem, plus touch/pointer brushing so flowers sway wherever she glides her finger.
   - Persistent top header with **Explore again** (resets the whole journey) and **Song on/off** (loops your local `song.mp3`).
   - Cute, wholesome synthesized music-box/celesta sound effects play automatically on every tap (`src/lib/sfx.ts`).
3. **Hands-Free Guide (`src/components/Instructions.tsx`)**
   - Pops a **"Hello babe, it's me ^^"** greeting, explains propping her phone up hands-free, previews the 5 hand signs (👍 ✌️ 🙌 🫶 Ⅲ), and asks for camera permission directly from the **Enable camera** tap (for mobile browser compatibility).
4. **Full-Screen Virtual Ghost Hands & 5 Hand Signs (`src/components/CameraScene.tsx`, `src/lib/handDrawing.ts`, `src/lib/handTracking.ts`)**
   - Deep starry night background, circular live self-view at bottom-right, and full-screen translucent spirit hands that follow all 21 joints of both hands smoothly using MediaPipe HandLandmarker + One-Euro smoothing + frame interpolation.
   - **Real gesture validation only** (cannot be unlocked by tapping): after 10 seconds, she makes each sign and holds it for **5 seconds** with its own unique charge animation + ascending fairy-bell sound ticks (and tapping any sign icon plays a cute music-box note):
     - 👍 **Thumbs up** → Gift box badge
     - ✌️ **Peace** → Baby badge (*the day you arrived*)
     - 🙌 **Both open palms raised** → Birthday cake badge
     - 🫶 **Two-hand heart** → Crystal heart badge (*my whole heart*)
     - Ⅲ **Three fingers (index, middle, ring)** → Golden III badge (*three years of us*)
   - **Three interactive modes** above the camera:
     - **Pen (Princess Magic Ribbon)**: wave one finger to draw a glowing pastel-pink & starlight ribbon that follows her finger and softly disappears — no permanent lines, no eraser needed.
     - **Grab**: pinch thumb and index finger near any floating badge to carry it around inside a golden selection halo.
     - **Tap**: point and hold on any floating badge (or tap any unlocked sign icon in the bottom dock) to open its dark-glass love note card. She can close it by tapping outside, tapping ✕, or folding her hand into a fist over it.
   - Once all 5 wishes are collected, asks **"Ready to combine everything into one?"** (Yes / Not yet).
5. **Star of Wishes (`src/components/Combine.tsx`)**
   - All 5 badges float in, spiral together, and fuse into a glowing **Star of Wishes**, asking her to close her eyes and make a wish. After 15 seconds, invites her to **"One more surprise"**.
6. **Animated Love Letter (`src/components/Finale.tsx`)**
   - Falling pixel hearts, diamonds, and celebratory confetti rain down as an envelope drops in.
   - Tapping the heart seal opens a spacious, heart-filled letter displaying your full personalized message word-by-word, ending with **"Forever yours, with all my heart, Rex"** and a pressed wax love stamp.
   - **1 full minute (60 seconds)** of uninterrupted reading time. Once 1 minute passes, a single non-blocking notification appears below the letter — **"I got one more surprise for you, my babe"** — with a permanent **"Open my last surprise"** button that stays there so she can click whenever she's ready (no repeating pop-up countdown).
7. **Full-Screen Birthday Cake Blow-Out & Memories (`src/components/CakeScene.tsx`, `src/lib/keepsake.ts`)**
   - Full-viewport live camera with a two-tier pink & lavender birthday cake that tracks her position and grows as she leans closer.
   - Uses real microphone breath detection + closeness detection (no hold-to-blow cheat button): when she leans close and blows into the mic, the 5 flames bend and extinguish one by one into smoke trails, celebrating with **"Happy Birthday babe ^^"** and a warm birthday harp chord.
   - **Optional 10-Second Memories Mode**: visibly asks **"Babe, ready to keep this moment forever?"** If she taps **Start memories**, it takes a keepsake photo every 10 seconds while the tab is open (she can tap **Snap now** or **Stop** anytime, and it pauses automatically if the tab is hidden):
     - **Photo 1**: full scene with cake and celebratory banner.
     - **Photo 2**: birthday portrait with *"Happy Birthday babe ^^"*.
     - **Photo 3+**: face-only close-up portraits.
   - Each photo automatically downloads to her device and (if you configure the Cloudflare Worker below) uploads to your private GitHub repository.

---

## 2. Prerequisites

Install or create these before starting:

1. **Node.js 18 or newer** — download from [nodejs.org](https://nodejs.org/). Verify with:
   ```bash
   node -v
   npm -v
   ```
2. **Git** — download from [git-scm.com](https://git-scm.com/).
3. **A GitHub account** — for hosting the site on GitHub Pages (and optionally storing keepsake photos in a separate private repository).
4. *(Optional, only if you want photos saved to GitHub)* **A free Cloudflare account** — at [dash.cloudflare.com](https://dash.cloudflare.com/) to run the tiny upload Worker (`server/github-keepsake-worker.mjs`) so your GitHub token stays completely secret.

---

## 3. Step-by-Step: Local Setup & Adding Your Song

### Step 1: Install dependencies
In the project folder, open a terminal and run:
```bash
npm install
```

### Step 2: Add Selena Gomez — *Birthday* (`song.mp3`)
This project intentionally uses a clean local audio slot (`./song.mp3` in `src/lib/audio.ts`) rather than YouTube embeds.

1. Place your MP3 file inside the `public/` folder and name it **exactly**:
   ```text
   public/song.mp3
   ```
2. When you run `npm run dev` or `npm run build`, Vite automatically serves and copies `public/song.mp3` into `dist/song.mp3`.
3. Whenever she clicks **Song off → Song on** in the top-right header, `song.mp3` plays and loops smoothly across every scene. Clicking **Explore again** stops and rewinds it.
4. *(If you ever host `dist/index.html` by itself without Vite's build folder, just place `song.mp3` in the same folder right next to `index.html`.)*

### Step 3: Run and test locally
```bash
npm run dev
```
Open `http://localhost:5173` in Chrome, Edge, or Safari.
> **Note:** `localhost` counts as a secure context, so camera and microphone permissions work locally. On a phone over LAN IP (`http://192.168...`), browsers block camera/mic unless served over **HTTPS** — hosting on GitHub Pages gives you free HTTPS automatically!

### Step 4: Run automated checks & build
```bash
npx tsc --noEmit
npx tsx --test tests/gestures.test.ts
node --test tests/github-worker.test.mjs
npm run build
```
`npm run build` outputs the production bundle into `dist/` (including `dist/index.html`, `dist/mediapipe/`, and `dist/song.mp3` once you've added your MP3).

---

## 4. Step-by-Step: Hosting the Website on GitHub Pages (Free HTTPS)

GitHub Pages automatically serves your site over **HTTPS**, which is required for camera and microphone access on iPhones and Android phones.

### Step 1: Create a GitHub repository for the website
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (for example, `garden-of-wishes`).
3. Choose **Public** (free GitHub Pages requires a public repo on free plans; private repos also work on GitHub Pro) and click **Create repository**.

### Step 2: Add a GitHub Actions workflow to build & deploy automatically
Create a file at `.github/workflows/deploy.yml` in your project with this content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build site
        run: npm run build
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Push your project to GitHub
Run these commands from the project folder (replace `YOUR_USERNAME` and `garden-of-wishes`):

```bash
git init
git add .
git commit -m "Launch A Garden of Wishes birthday site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/garden-of-wishes.git
git push -u origin main
```

> **Tip about `public/mediapipe/`:** The bundled MediaPipe model & WASM files in `public/mediapipe/` are ~37 MB total (under GitHub's 100 MB per-file limit, so normal `git push` works fine!). Even if you choose not to commit `public/mediapipe/`, `src/lib/handTracking.ts` automatically falls back to MediaPipe's official CDN.

### Step 4: Turn on GitHub Pages
1. Open your repository on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab and wait ~1 minute for **Deploy to GitHub Pages** to turn green.
4. Your live HTTPS URL will be:
   ```text
   https://YOUR_USERNAME.github.io/garden-of-wishes/
   ```
5. Open that URL on both your phone and computer to test!

---

## 5. Step-by-Step: Connecting Keepsake Photos to Your Private GitHub Repository

> **Important Security Note:** Never paste a GitHub token directly into frontend code (`src/` or `dist/index.html`), because anyone who opens the page can read browser JavaScript. Always keep your token inside the server-side Cloudflare Worker (`server/github-keepsake-worker.mjs`) and upload to a **Private** GitHub repository.

### Step 1: Create a Private repository for photos
1. Go to [github.com/new](https://github.com/new).
2. Name it something like `birthday-memories-private`.
3. Select **Private** and initialize it with a README (so the default branch `main` exists).

### Step 2: Create a fine-grained GitHub Personal Access Token
1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Set **Repository access** → **Only select repositories** → pick `birthday-memories-private`.
3. Under **Repository permissions**, set **Contents** to **Read and write**.
4. Click **Generate token** and copy it somewhere safe (you'll paste it into Cloudflare in the next step).

### Step 3: Deploy the Cloudflare Worker (`server/github-keepsake-worker.mjs`)
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (for example, `birthday-keepsake-upload`) and click **Deploy**.
3. Click **Edit code**, replace the starter code with the entire contents of `server/github-keepsake-worker.mjs`, and click **Deploy**.
4. Go to your Worker's **Settings** → **Variables and Secrets** and add:
   - `GITHUB_TOKEN` (type: **Secret**) = your fine-grained token from Step 2.
   - `GITHUB_OWNER` (type: **Text**) = your GitHub username.
   - `GITHUB_REPO` (type: **Text**) = `birthday-memories-private`.
   - `ALLOWED_ORIGIN` (type: **Text**) = your exact GitHub Pages origin, with **no trailing slash**, e.g.:
     ```text
     https://YOUR_USERNAME.github.io
     ```
   - `GITHUB_BRANCH` *(optional)* = `main`.
5. Copy your Worker URL (for example, `https://birthday-keepsake-upload.YOUR_SUBDOMAIN.workers.dev`).

### Step 4: Connect the website to the Worker
1. Open `src/lib/keepsake.ts`.
2. Paste your Worker URL on line 3:
   ```ts
   export const GITHUB_UPLOAD_ENDPOINT = "https://birthday-keepsake-upload.YOUR_SUBDOMAIN.workers.dev";
   ```
3. Rebuild and push to GitHub:
   ```bash
   npm run build
   git add src/lib/keepsake.ts
   git commit -m "Connect GitHub keepsake upload endpoint"
   git push
   ```
4. Once deployed, whenever she taps **Start memories** after blowing out the candles, each PNG photo is downloaded to her phone **and** saved inside `birthday-keepsakes/YYYY-MM-DD/<uuid>.png` in your private repository!

*(If you leave `GITHUB_UPLOAD_ENDPOINT = ""`, photos still capture and download smoothly to her phone with zero errors.)*

---

## 6. Pre-Gift Checklist (Verify Every Feature)

Before sending her the link, run through the whole site once on a phone and a computer:

- [ ] **Intro**: Wait 3 seconds → **"Explore your presents"** blooms in cleanly.
- [ ] **Garden**:
  - Toggle **Morning / Evening / Night** — sky, sun/moon, stars, and lighting transition smoothly.
  - Watch the clouds drift across the sky and the 5-second wind wave ripple through the flowers.
  - Brush across the flowers with your finger/mouse — each brushed flower sways.
  - Click **Song off → Song on** — your `song.mp3` plays and loops.
  - Every button tap plays a cute, wholesome sound effect automatically.
- [ ] **Instructions**: **"Hello babe, it's me ^^"** appears, all 5 hand-sign icons display clearly, and **Enable camera** opens the camera scene.
- [ ] **Hand-Sign Magic**:
  - Make sure you're in good lighting so MediaPipe tracks both hands cleanly.
  - Hold each of the 5 signs (👍, ✌️, 🙌, 🫶, Ⅲ) for 5 seconds — watch the unique charge animation, hear the ascending fairy-bell ticks every second, and watch each badge bloom with a burst.
  - Test **Pen** mode: wave one finger and watch the glowing princess magic ribbon follow your finger and fade away cleanly (no permanent lines, no eraser needed).
  - Test **Grab** mode: pinch near a heart or cake badge and move it around — a clean golden ring highlights the held badge (no stray gift box).
  - Test **Tap** mode: point at a badge (or tap an unlocked icon in the bottom-left dock) to read its love note card; fold your hand into a fist or tap outside to close it.
- [ ] **Star of Wishes**: Confirm **"Yes, combine them for me"** merges all 5 badges into the glowing Star of Wishes, then wait 15 seconds for **"One more surprise"**.
- [ ] **Love Letter**:
  - Tap the heart seal to open the envelope and read your full 9-paragraph letter as the words animate in, signed **"Forever yours, with all my heart, Rex"** with the wax stamp.
  - Wait 1 full minute (60 seconds) — a single notification **"I got one more surprise for you, my babe"** + permanent **"Open my last surprise"** button appears at the bottom (no repeating pop-up countdown).
- [ ] **Birthday Cake Blow-Out**:
  - Allow camera + microphone, lean close until the guide turns green (**"Perfect — now blow!"**), and blow steadily into the mic until all 5 candles go out into smoke and **"Happy Birthday babe ^^"** celebrates.
  - Test **Start memories** to confirm the 10-second capture sequence (1: full scene, 2: birthday portrait, 3+: face close-up), local download, **Stop**, and (if configured) your private GitHub repository commits.
- [ ] **Explore again**: Click **Explore again** in the top header to verify everything resets cleanly back to the intro and stops the camera/music.

---

## 7. Troubleshooting

- **Camera or microphone blocked on phone**: Make sure the URL starts with `https://` (GitHub Pages does this automatically) and is opened directly in **Safari** (iOS) or **Chrome** (Android), not inside an in-app browser like Instagram/Messenger that can block camera permissions.
- **Hand signs take a moment on first load**: MediaPipe downloads its tracking model (~7.5 MB) once and caches it; after a few seconds it runs smoothly. Bright, even lighting facing her hands gives the best accuracy for two-hand signs (🙌 and 🫶).
- **Song doesn't play**: Confirm the file is named exactly `song.mp3` (all lowercase) inside `public/song.mp3` before running `npm run build` / pushing to GitHub.
- **GitHub upload says "GitHub not connected"**: You haven't pasted your deployed Cloudflare Worker URL into `GITHUB_UPLOAD_ENDPOINT` in `src/lib/keepsake.ts` yet, or you haven't rebuilt & redeployed after editing it.
