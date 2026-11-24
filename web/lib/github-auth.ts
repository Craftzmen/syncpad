export function isGitHubOAuthConfigured() {
  const id = process.env.AUTH_GITHUB_ID?.trim();
  const secret = process.env.AUTH_GITHUB_SECRET?.trim();
  return Boolean(id && secret);
}

export function getGitHubProviderConfig() {
  const clientId = process.env.AUTH_GITHUB_ID?.trim();
  const clientSecret = process.env.AUTH_GITHUB_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}