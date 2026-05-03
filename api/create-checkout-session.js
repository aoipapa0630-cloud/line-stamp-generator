export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const stripe = await import('stripe');
    const stripeClient = stripe.default(process.env.STRIPE_SECRET_KEY);
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.VITE_STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `https://line-stamp-generator-eta.vercel.app?success=true`,
      cancel_url: `https://line-stamp-generator-eta.vercel.app?canceled=true`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
