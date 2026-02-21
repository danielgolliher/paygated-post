# The Vertical Republic — Paygated Post

A static website with a Stripe-powered paygated blog post, deployed on GitHub Pages with a Cloudflare Worker backend.

## Architecture

```
Frontend (GitHub Pages)          Backend (Cloudflare Worker)
danielgolliher.github.io/   →   paygated-post-api.danielgolliher.workers.dev
paygated-post/
                                 Endpoints:
index.html    (homepage)           POST /create-checkout-session
post.html     (paygated essay)     GET  /verify?session_id=xxx
css/style.css                      GET  /verify-token?token=xxx
js/main.js                         POST /resend-magic-link
js/stripe-checkout.js              GET  /magic?token=xxx
```

The essay content lives **only** in the Cloudflare Worker (`src/worker.js`). The frontend fetches it after payment verification. It is not embedded in the HTML.

## Payment & Access Flow

1. User clicks "Unlock" → frontend POSTs to `/create-checkout-session` → redirects to Stripe Checkout
2. After payment, Stripe redirects to `post.html?session_id=xxx`
3. Frontend calls `/verify?session_id=xxx` → worker checks Stripe, returns essay HTML + signed HMAC-SHA256 access token
4. Token is stored in `localStorage` under key `tvr_access_token`
5. On repeat visits, frontend sends stored token to `/verify-token` for instant access
6. If token is lost (cleared cache, new device), user clicks "Already purchased?" → enters email → worker looks up paid sessions in Stripe → sends magic link via Resend → link redirects through `/magic?token=xxx` back to frontend with a fresh token

## Worker Project

The Cloudflare Worker source lives in a **separate local directory**: `/Users/danielgolliher/Development/paygated-post-worker/`

- `src/worker.js` — all backend logic + essay content
- `wrangler.toml` — config (env vars for frontend URL, Stripe price ID)
- Secrets (stored in Cloudflare, not in code): `STRIPE_SECRET_KEY`, `RESEND_API_KEY`

Deploy the worker with: `cd ../paygated-post-worker && wrangler deploy`

## Key Config Values

- **Stripe Product**: `prod_U1OZm5KQkdzDmR`
- **Stripe Price** ($1.00): `price_1T3LmWFwJL4H85VAHLlw4xdD`
- **Worker URL**: `https://paygated-post-api.danielgolliher.workers.dev`
- **Frontend URL**: `https://danielgolliher.github.io/paygated-post`
- **Mode**: Test (using `pk_test_` / `sk_test_` keys)

## Switching to Live Mode

1. Get live Stripe keys from Dashboard → Developers → API keys
2. Create a live product + $1.00 price in Stripe
3. Update `wrangler.toml`: set new `STRIPE_PRICE_ID`
4. Set live secret key: `echo "sk_live_xxx" | wrangler secret put STRIPE_SECRET_KEY`
5. Update `js/stripe-checkout.js` if the worker URL changes
6. Verify a custom domain in Resend and update the `from` address in `worker.js`

## Services & Free Tiers

| Service | Role | Free tier |
|---|---|---|
| GitHub Pages | Static frontend hosting | Unlimited |
| Cloudflare Workers | Backend API | 100k requests/day |
| Stripe | Payment processing | No monthly fee, 2.9% + 30¢ per transaction |
| Resend | Magic link emails | 3k emails/month |

## Content Inspiration

The site design and essay content are inspired by [Maximum New York](https://maximumnewyork.com), whose local archive is at `/Users/danielgolliher/Development/maximumnewyork/`.
