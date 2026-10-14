type AnalyticsEventValue = string | number | boolean

export type AnalyticsEventParameters = Record<string, AnalyticsEventValue>

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, parameters?: AnalyticsEventParameters) => void
  }
}

/**
 * Sends non-identifying product-usage events to the Google tag initialized in
 * index.html. User-entered content must never be included in these parameters.
 */
export const trackAnalyticsEvent = (eventName: string, parameters: AnalyticsEventParameters = {}) => {
  if (typeof window === 'undefined') return
  window.gtag?.('event', eventName, parameters)
}
