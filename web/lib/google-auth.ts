export function isGoogleOAuthConfigured() {
  const id = process.env.AUTH_GOOGLE_ID?.trim();
  const secret = process.env.AUTH_GOOGLE_SECRET?.trim();
  return Boolean(id && secret);
}

export function getGoogleProviderConfig() {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}
