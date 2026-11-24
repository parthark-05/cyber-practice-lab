const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiBaseUrl =
  configuredApiUrl === undefined
    ? import.meta.env.PROD
      ? ""
      : "http://localhost:4000"
    : configuredApiUrl.replace(/\/+$/, "");

export function apiUrl(path) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
