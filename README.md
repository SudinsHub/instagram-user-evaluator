# 🛡️ Instagram Reach & Authenticity Evaluator — Web UI

An interactive, client-side parameter tuning and evaluation engine built with **React**, **Vite**, **Tailwind CSS**, and **shadcn/ui default theme (Zinc)**.

Designed to give stakeholders and users a **glass-box interface** to test, inspect internal formulas, tweak all evaluation parameters in real time (0ms latency), and export tuned configurations back to Python with zero server overhead.

---

## 🌟 Highlights

1. **100% Free Static Hosting (Zero Server Required)**:
   - Pure client-side deterministic evaluation math (logarithmic scaling, linear interpolations, weighted sums, variance CV).
   - Can be hosted freely forever on **Vercel**, **GitHub Pages**, or **Cloudflare Pages**.
2. **Glass-Box Mathematical Explainability**:
   - Step-by-step audit tabs displaying actual plugged-in values for every formula:
     - Follower Tier Component: $100 \times \frac{\log_{10}(\min(F, 50000) + 1)}{\log_{10}(50000 + 1)}$
     - Engagement Volume Component: $100 \times \frac{\log_{10}(\text{Volume} + 1)}{\log_{10}(5000 + 1)}$
     - Organic Engagement Corridor: $[ER_{\min}, ER_{\max}]$ band testing
     - Like-to-Comment Discussiveness Ratio ($S_{\text{lc}}$)
     - Population Variance Coefficient of Variation ($CV = \frac{\sigma}{\mu}$)
3. **Reactive Parameter Tuning**:
   - Over 15+ live sliders: Top-level Reach vs. Authenticity weight balance, sub-weights, logarithmic scaling caps, video view discounts, follower floors, and fraud detection trigger cutoffs.
4. **Preset Management & Export**:
   - Quick presets: *Default Balanced (40/60)*, *Strict Fraud Shield (25/75)*, *Audience Reach Priority (65/35)*, and *Emerging Nano Friendly*.
   - **1-Click Export**: Copies tuned configuration as a Python `ReachConfig(...)` class snippet or downloads `config.json`.
5. **Archetype Test Profiles**:
   - Preloaded with real Bright Data snapshots (including `@___yukiii_____` with hidden like imputation) as well as authentic nano, bot farm pump, engagement pod, ghost follower, and verified macro creators.

---

## 🚀 How to Run Locally

```bash
# 1. Navigate to the project directory
cd instagram-evaluator-app

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🌐 How to Host Freely

### Option A: Vercel (Recommended — 2 Minutes, Zero Maintenance)

1. Push this folder to a new repository on GitHub (see instructions below).
2. Go to [vercel.com](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Framework Preset will auto-detect as **Vite**.
5. Click **Deploy**.
6. Your app is live with a free `*.vercel.app` URL and free SSL!

### Option B: GitHub Pages (100% Free Forever)

1. Push to GitHub.
2. In your GitHub repo, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Choose the standard **Static HTML** or Vite GitHub Action workflow.
5. The app already uses relative assets (`base: './'` in `vite.config.ts`), so it works on any GitHub Pages subpath out of the box!

---

## 📦 Pushing to a New GitHub Repository

```bash
# Initialize git inside instagram-evaluator-app
git init
git add .
git commit -m "feat: initial commit for instagram evaluator web UI"

# Link to your new GitHub repository
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```
