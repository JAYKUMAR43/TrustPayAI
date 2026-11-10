/**
 * Centralized API Service Re-Export.
 * 
 * Safely redirects all legacy API calls to the authoritative centralized client (src/api.js).
 * Ensures that all requests use the configured VITE_API_URL and never query relative SPA paths.
 */

export * from '../api';
