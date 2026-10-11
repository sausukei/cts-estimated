export const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
export const analyticsEnabled = /^G-[A-Z0-9]+$/.test(gaId);

export function trackEvent(name, parameters) {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('event', name, parameters);
}
