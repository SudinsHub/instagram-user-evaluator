# 🛡️ Instagram Reach & Authenticity Evaluator — Web UI

An interactive, live-scraping parameter tuning and evaluation engine built with **React**, **Vite**, **Tailwind CSS**, **shadcn/ui default theme (Zinc)**, and **Vercel Serverless Functions**.

Designed to give stakeholders and users a **glass-box interface** to audit any Instagram username, inspect internal calculations, tweak all evaluation parameters in real time (0ms latency), and export tuned configurations back to Python with zero server overhead.

---

## 🌟 Highlights

1. **Live Instagram Username Scraper (`/api/scrape`)**:
   - Accepts any public Instagram username (without `@`).
   - Powered by **Bright Data Dataset `gd_l1vikfch901nx3by4`** with asynchronous snapshot handling and platform-level cache checking.
   - Secure serverless proxy: keeps your `BRIGHTDATA_API_KEY` safe and avoids browser CORS blocks.
2. **100% Free Hosting (Zero Server Required)**:
   - Deploys seamlessly to **Vercel Hobby** (100% free forever, includes 100,000 serverless function executions/month).
   - Zero servers, zero sleep delays, automated Git deployment.
3. **Glass-Box Mathematical Explainability**:
   - Step-by-step audit tabs displaying actual plugged-in values for every formula:
     - Follower Tier Component: $100 \times \frac{\log_{10}(\min(F, 50000) + 1)}{\log_{10}(50000 + 1)}$
     - Engagement Volume Component: $100 \times \frac{\log_{10}(\text{Volume} + 1)}{\log_{10}(5000 + 1)}$
     - Organic Engagement Corridor: $[ER_{\min}, ER_{\max}]$ band testing
     - Like-to-Comment Discussiveness Ratio ($S_{\text{lc}}$)
     - Population Variance Coefficient of Variation ($CV = \frac{\sigma}{\mu}$)
4. **Reactive Parameter Tuning**:
   - Over 15+ live sliders: Top-level Reach vs. Authenticity weight balance, sub-weights, logarithmic scaling caps, video view discounts, follower floors, and fraud detection trigger cutoffs.
5. **Preset Management & Export**:
   - Quick presets: *Default Balanced (40/60)*, *Strict Fraud Shield (25/75)*, *Audience Reach Priority (65/35)*, and *Emerging Nano Friendly*.
   - **1-Click Export**: Copies tuned configuration as a Python `ReachConfig(...)` class snippet or downloads `config.json`.
6. **Mobile-Optimized & Privacy-First**:
   - Slide-over parameter drawer on phone screens with floating action controls.
   - Neutral initial launch: No default user selected on launch.

---

## 🚀 How to Run Locally

```bash
# 1. Navigate to the project directory
cd instagram-evaluator-app

# 2. Install dependencies
npm install

# 3. Start local development server (includes dev proxy for /api/scrape)
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🌐 How to Host Freely on Vercel (2 Minutes)

1. Push this folder to a new repository on GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   * **Key**: `BRIGHTDATA_API_KEY`
   * **Value**: *your_brightdata_api_key_here*
5. Click **Deploy**.
6. That's it! Your app and its serverless scraping API (`/api/scrape`) are live with a free `*.vercel.app` URL and free SSL!

*(Alternatively, users can enter their own API key directly in the UI settings dialog, which is saved only in their local browser session).*
