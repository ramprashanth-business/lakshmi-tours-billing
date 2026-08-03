# Lakshmi Tours and Travels — Billing System

A billing, customer, trip, and reporting system for Lakshmi Tours and Travels.
Data is stored in Firebase (a real cloud database), and the site is hosted free on GitHub Pages.

There are three parts to set up, in order: **Firebase** (database + login) → **local test run** → **GitHub Pages** (going live).

---

## Part 1 — Firebase setup (the database + login)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project**, name it (e.g. `lakshmi-tours-billing`), and finish the wizard (you can skip Google Analytics).
3. In the left sidebar, click **Build → Authentication → Get started**.
   - Click the **Sign-in method** tab → enable **Email/Password**.
   - Go to the **Users** tab → **Add user** → enter the email and password your client will use to log in. (Only add the people who should have access — there's no public sign-up page.)
4. In the left sidebar, click **Build → Firestore Database → Create database**.
   - Choose a location close to India (e.g. `asia-south1`).
   - Start in **production mode**.
5. Once created, go to the **Rules** tab of Firestore, delete everything there, and paste in the contents of `firestore.rules` from this project. Click **Publish**.
6. Go to **Project settings** (gear icon, top left) → scroll to **Your apps** → click the **</>** (web) icon → register an app (any nickname) → **do not** check "also set up Firebase Hosting".
7. Firebase will show you a `firebaseConfig` object. Copy those values into `src/firebase.js` in this project, replacing the placeholder text (`YOUR_API_KEY`, etc).

That's it for Firebase — no server to run, no billing required for this usage level.

---

## Part 2 — Run it locally to test

You'll need [Node.js](https://nodejs.org) installed (version 18 or later).

```bash
cd lakshmi-tours-billing
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Log in with the email/password you created in Firebase step 3. Add a customer, a trip, an invoice — confirm it all works before going further.

---

## Part 3 — Put it on GitHub and go live

1. Create a new repository on [github.com](https://github.com/new). **Name it exactly `lakshmi-tours-billing`** (or, if you pick a different name, update the `base` value in `vite.config.js` to match).
2. In this project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial billing app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/lakshmi-tours-billing.git
   git push -u origin main
   ```
3. On GitHub, open your repo → **Settings → Pages** → under "Build and deployment", set **Source** to **GitHub Actions**.
4. That's it — the workflow in `.github/workflows/deploy.yml` will automatically build and publish the site every time you push to `main`. Watch progress under the **Actions** tab of your repo.
5. Once it finishes (a green check), your live site is at:
   ```
   https://YOUR-USERNAME.github.io/lakshmi-tours-billing/
   ```

Any time you make changes later, just `git add . && git commit -m "update" && git push` and it redeploys automatically.

---

## Notes

- **The Firebase config in `src/firebase.js` is not a secret** — it's normal for it to be visible in the deployed site's code. The actual protection is the Firestore rules file, which only lets a signed-in user read/write their *own* records.
- **Adding more logins later:** go to Firebase → Authentication → Users → Add user. No code changes needed.
- **Free tier limits:** Firebase's free (Spark) plan comfortably covers a small business like this — the limits are generous for one team billing customers.
- If the live site loads blank, it's almost always the `base` path in `vite.config.js` not matching the GitHub repo name exactly — double check that first.
