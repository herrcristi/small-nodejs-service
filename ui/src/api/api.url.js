const API_URL = process.env.SMALL_API_URL || process.env.VUE_APP_SMALL_API_URL;
const API_CORS_ORIGIN = process.env.SMALL_API_CORS_ORIGIN || process.env.VUE_APP_SMALL_API_CORS_ORIGIN;

export const SMALL_API_URL = `${API_URL}/api/v1`; // Adjust the base URL as needed
export const SMALL_API_CORS_ORIGIN = `${API_CORS_ORIGIN}`; // Adjust the CORS origin as needed
