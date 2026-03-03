// Runtime config — reads from /config.json at runtime (not build time)
// To change URLs after build: just edit config.json in the deployed folder

interface AppConfig {
  API_URL: string;
  EDP_PORTAL_URL: string;
}

let _promise: Promise<AppConfig> | null = null;

function initConfig(): Promise<AppConfig> {
  if (_promise) return _promise;

  _promise = fetch("/config.json", { cache: "no-store" })
    .then((res) => res.json())
    .then((json) => json as AppConfig);

  return _promise;
}

export function getApiUrl(): Promise<string> {
  return initConfig().then((c) => c.API_URL);
}

export function getEdpPortalUrl(): Promise<string> {
  return initConfig().then((c) => c.EDP_PORTAL_URL);
}
