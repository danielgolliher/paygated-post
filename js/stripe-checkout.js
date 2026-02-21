// ============================================
// STRIPE CHECKOUT — Frontend Integration
// ============================================
//
// Access persistence:
//   1. After payment: stores signed token in localStorage
//   2. On repeat visits: sends token to /verify-token for instant access
//   3. Lost access: "Already purchased?" → enter email → magic link
// ============================================

const API_BASE = 'https://paygated-post-api.danielgolliher.workers.dev';
const TOKEN_KEY = 'tvr_access_token';

// ---- On page load ----
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);

    // Case 1: Returning from Stripe checkout
    const sessionId = params.get('session_id');
    if (sessionId) {
        await verifyPaymentAndUnlock(sessionId);
        return;
    }

    // Case 2: Arriving via magic link
    const magicToken = params.get('token');
    if (magicToken) {
        await verifyTokenAndUnlock(magicToken, true);
        return;
    }

    // Case 3: Repeat visit — check localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
        await verifyTokenAndUnlock(storedToken, false);
        return;
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
        btn.textContent = 'Unlock the Full Essay \u2192';
        btn.disabled = false;
        alert('Something went wrong. Please try again.');
    }
}

// ---- Verify Stripe payment and unlock ----
async function verifyPaymentAndUnlock(sessionId) {
    try {
        const response = await fetch(`${API_BASE}/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Verification failed');

        // Store the access token for future visits
        if (data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
        }

        showEssay(data.content, true);

        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);

    } catch (err) {
        console.error('Payment verification error:', err);
    }
}

// ---- Verify stored/magic token and unlock ----
async function verifyTokenAndUnlock(token, isMagicLink) {
    try {
        const response = await fetch(`${API_BASE}/verify-token?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
            // Token invalid or expired — clear it
            localStorage.removeItem(TOKEN_KEY);
            return;
        }

        // Store/refresh the token
        localStorage.setItem(TOKEN_KEY, token);

        showEssay(data.content, isMagicLink);

        // Clean the URL if from magic link
        if (isMagicLink) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } catch (err) {
        console.error('Token verification error:', err);
        localStorage.removeItem(TOKEN_KEY);
    }
}

// ---- Show the essay ----
function showEssay(content, showBanner) {
    const paywall = document.getElementById('paywall');
    const fullContent = document.getElementById('full-content');
    const essayBody = document.getElementById('essay-body');
    const successBanner = document.getElementById('success-banner');

    if (paywall) paywall.style.display = 'none';

    if (essayBody && content) {
        essayBody.innerHTML = content;
    }

    if (fullContent) {
        fullContent.style.display = 'block';
        fullContent.style.opacity = '0';
        fullContent.style.transition = 'opacity 0.8s ease';
        requestAnimationFrame(() => {
            fullContent.style.opacity = '1';
        });
    }

    if (successBanner && showBanner) {
        successBanner.style.display = 'block';
    }
}

// ---- "Already purchased?" magic link flow ----
async function requestMagicLink() {
    const emailInput = document.getElementById('restore-email');
    const statusEl = document.getElementById('restore-status');
    const btn = document.getElementById('restore-btn');
    const email = emailInput?.value?.trim();

    if (!email) {
        statusEl.textContent = 'Please enter your email.';
        statusEl.style.color = 'var(--color-accent)';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    statusEl.textContent = '';

    try {
        const response = await fetch(`${API_BASE}/resend-magic-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        // Always show success (don't reveal whether email exists)
        statusEl.textContent = 'If that email has a purchase on file, a magic link has been sent. Check your inbox.';
        statusEl.style.color = 'var(--color-success)';
        btn.textContent = 'Sent!';

    } catch (err) {
        console.error('Magic link error:', err);
        statusEl.textContent = 'Something went wrong. Please try again.';
        statusEl.style.color = 'var(--color-accent)';
        btn.textContent = 'Send Magic Link';
        btn.disabled = false;
    }
}
