// SPDX-License-Identifier: MPL-2.0
//
// Blue Screen of App - Analytics module (plain ES module, in-memory).
//
// Hand-written JavaScript, allowed under CLAUDE.md ("JavaScript: only where
// AffineScript cannot"). src/Analytics.affine is the intended source, but it is
// a legacy mechanical port of the old ReScript and does not parse, and the
// AffineScript JS backend emits no `export` and cannot compile `extern fn`
// (needed for Date.now). Keep behaviour in step with the .affine file.
//
// The view counters are keyed by request input (`style` comes from the query
// string), so they are null-prototype objects: a key such as "__proto__" or
// "constructor" is then an ordinary counter, not a prototype lookup or write.

function emptyCounter() {
  return Object.create(null);
}

const analytics = {
  totalVisits: 0,
  styleViews: emptyCounter(),
  errorCodeViews: emptyCounter(),
  customMessages: 0,
  apiCalls: 0,
  startTime: Date.now(),
};

function incrementCounter(counter, key) {
  const k = String(key);
  counter[k] = (counter[k] ?? 0) + 1;
}

/** Record a page visit. */
export function trackVisit(style, errorCode, isCustom) {
  analytics.totalVisits += 1;
  incrementCounter(analytics.styleViews, style);
  incrementCounter(analytics.errorCodeViews, errorCode);
  if (isCustom) {
    analytics.customMessages += 1;
  }
}

/** Record an API call. */
export function trackApiCall() {
  analytics.apiCalls += 1;
}

/** The live statistics record. */
export function getStats() {
  return analytics;
}

/** Seconds since the module was loaded. */
export function getUptime() {
  return (Date.now() - analytics.startTime) / 1000;
}

/** Reset all counters (development only). startTime is kept. */
export function resetStats() {
  analytics.totalVisits = 0;
  analytics.styleViews = emptyCounter();
  analytics.errorCodeViews = emptyCounter();
  analytics.customMessages = 0;
  analytics.apiCalls = 0;
}

/** Statistics as a JSON-friendly object. */
export function getStatsObject() {
  return {
    totalVisits: analytics.totalVisits,
    styleViews: analytics.styleViews,
    errorCodeViews: analytics.errorCodeViews,
    customMessages: analytics.customMessages,
    apiCalls: analytics.apiCalls,
    uptime: getUptime(),
  };
}
