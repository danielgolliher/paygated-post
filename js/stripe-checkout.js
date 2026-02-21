// ============================================
// STRIPE CHECKOUT INTEGRATION
// ============================================
//
// SETUP REQUIRED:
// 1. Replace STRIPE_PUBLISHABLE_KEY with your Stripe publishable key
// 2. Replace STRIPE_PRICE_ID with a Price ID from your Stripe dashboard
//    (create a product for $1.00, then copy the price ID, e.g. price_xxxxx)
//
// HOW IT WORKS:
// - For a static site (GitHub Pages), we use Stripe Checkout in client-only mode
// - User clicks "Unlock" → redirected to Stripe's hosted checkout page
// - After payment → redirected back to post.html?session_id={CHECKOUT_SESSION_ID}
// - We detect the session_id param and unlock the content
//
// IMPORTANT: This is a DEMO. In production, you would:
// - Use a backend to create Checkout Sessions (more secure)
// - Verify payment server-side before revealing content
// - Store access tokens / user sessions
// - Not embed the full content in the HTML (it's viewable in source)
//
// For a demo, this client-side approach works perfectly.
// ============================================

// ---- CONFIGURATION ----
// Replace these with your actual Stripe values:
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_KEY';
const STRIPE_PRICE_ID = 'price_REPLACE_WITH_YOUR_PRICE_ID';

// The URL where Stripe redirects after successful payment
const SUCCESS_URL = window.location.origin + window.location.pathname + '?paid=true';
const CANCEL_URL = window.location.origin + window.location.pathname;

// ---- INITIALIZATION ----
let stripe = null;
try {
    if (STRIPE_PUBLISHABLE_KEY !== 'pk_test_REPLACE_WITH_YOUR_KEY') {
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    }
} catch (e) {
    console.log('Stripe not initialized - using demo mode');
}

// ---- CHECK FOR PAYMENT SUCCESS ----
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('paid') === 'true') {
        unlockContent();
    }
});

// ---- CHECKOUT HANDLER ----
function handleCheckout() {
    // Demo mode: if Stripe isn't configured, just unlock the content
    if (!stripe) {
        console.log('Demo mode: Stripe not configured. Unlocking content for preview.');

        // Show a demo notice then unlock
        const paywall = document.getElementById('paywall');
        if (paywall) {
            const demoNotice = document.createElement('div');
            demoNotice.className = 'demo-banner';
            demoNotice.innerHTML = '<p>DEMO MODE: Stripe keys not configured yet. Showing content preview.</p>';
            paywall.parentNode.insertBefore(demoNotice, paywall);
        }

        setTimeout(() => unlockContent(), 500);
        return;
    }

    // Real Stripe Checkout
    stripe.redirectToCheckout({
        lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
    }).then((result) => {
        if (result.error) {
            alert(result.error.message);
        }
    });
}

// ---- UNLOCK CONTENT ----
function unlockContent() {
    const paywall = document.getElementById('paywall');
    const fullContent = document.getElementById('full-content');
    const successBanner = document.getElementById('success-banner');

    if (paywall) {
        paywall.style.display = 'none';
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
        // Only show the success banner if this was a real payment (not demo mode)
        const params = new URLSearchParams(window.location.search);
        if (params.get('paid') === 'true') {
            successBanner.style.display = 'block';
        }
    }
}
