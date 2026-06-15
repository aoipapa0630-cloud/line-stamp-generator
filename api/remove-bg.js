export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ image: null, reason: 'no_api_key' });
  }
  try {
    const { image, type } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'image is required' });
    }
    const buffer = Buffer.from(image, 'base64');
    const blob = new Blob([buffer], { type: type || 'image/png' });
    const fd = new FormData();
    fd.append('image_file', blob, 'image.png');
    fd.append('size', 'auto');
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: fd,
    });
    if (!r.ok) {
      let reason = 'remove_bg_error';
      try {
        const errData = await r.json();
        reason = errData?.errors?.[0]?.title || reason;
      } catch (e) {}
      return res.status(200).json({ image: null, reason });
    }
    const outBuf = Buffer.from(await r.arrayBuffer());
    res.status(200).json({ image: outBuf.toString('base64') });
  } catch (err) {
    res.status(200).json({ image: null, reason: err.message });
  }
}
