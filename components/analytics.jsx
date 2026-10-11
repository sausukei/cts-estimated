'use client';
import Script from 'next/script';
import { useEffect } from 'react';
import { gaId, analyticsEnabled, trackEvent } from '../lib/analytics.mjs';

export default function Analytics() {
  useEffect(() => {
    if (!analyticsEnabled) return;
    function onClick(event) {
      const link = event.target.closest?.('[data-switch]');
      if (!link || link.getAttribute('aria-current') === 'page') return;
      trackEvent('switch_' + link.dataset.switch, {
        airport: link.dataset.airport, mode: link.dataset.mode,
      });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  if (!analyticsEnabled) return null;
  return <>
    <Script id="ga-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
      window.gtag('js', new Date());
      window.gtag('config', '${gaId}');
    `}</Script>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
  </>;
}
