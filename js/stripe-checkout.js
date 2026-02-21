// ============================================
// STRIPE CHECKOUT — Frontend Integration
// ============================================
// Talks to the Cloudflare Worker backend at:
//   https://paygated-post-api.danielgolliher.workers.dev
//
// Flow:
//   1. User clicks "Unlock" → POST /create-checkout-session → redirect to Stripe
//   2. Stripe redirects back with ?session_id=cs_xxx
//   3. Frontend calls GET /verify?session_id=cs_xxx → gets essay HTML
//   4. Essay is injected into the page
// ============================================

const API_BASE = 'https://paygated-post-api.danielgolliher.workers.dev';

// ---- On page load: check for returning session ----
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
        await verifyAndUnlock(sessionId);
    }
});

// ---- Checkout button handler ----
async function handleCheckout() {
    const btn = document.getElementById('checkout-btn');
    btn.textContent = 'Redirecting to Stripe...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Failed to create checkout session');
        }
    } catch (err) {
        console.error('Checkout error:', err);
        btn.textContent = 'Unlock the Full Essay →';
        btn.disabled = false;
        alert('Something went wrong. Please try again.');
    }
}

// ---- Verify payment and fetch essay content ----
async function verifyAndUnlock(sessionId) {
    const paywall = document.getElementById('paywall');
    const fullContent = document.getElementById('full-content');
    const essayBody = document.getElementById('essay-body');
    const successBanner = document.getElementById('success-banner');

    try {
        const response = await fetch(`${API_BASE}/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        // Payment verified — inject the essay content
        if (paywall) paywall.style.display = 'none';

        if (essayBody && data.content) {
            essayBody.innerHTML = data.content;
        }

        if (fullContent) {
            fullContent.style.display = 'block';
            fullContent.style.opacity = '0';
            fullContent.style.transition = 'opacity 0.8s ease';
            requestAnimationFrame(() => {
                fullContent.style.opacity = '1';
            });
        }

        if (successBanner) {
            successBanner.style.display = 'block';
        }

        // Clean the URL (remove session_id param)
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

    } catch (err) {
        console.error('Verification error:', err);
        // If verification fails, keep showing the paywall
    }
}
