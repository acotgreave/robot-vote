// The address of the Cloudflare Worker that counts votes (no trailing slash).
window.ROBOT_API = "https://robot-vote.howtospeakdata.workers.dev";

// Upcoming talk: replaces the black "How To Speak Data" bar until `hideAfter`.
// For the next talk, edit these values. Set window.NEXT_TALK = null to turn it off.
window.NEXT_TALK = {
  when: "Wed 12pm",
  where: "Keynote Theatre",
  event: "Data Decoded",
  url: "https://datadecoded.com/mcr/seminars/keeping-humans-on-top-in-the-age-of-ai-analytics/",
  icon: "assets/talk-datadecoded.png",
  animation: "decode", // "spin" (compass-style turn) or "decode" (text scrambles then resolves)
  hideAfter: "2026-10-14T13:00:00+01:00" // UK time; the banner disappears after this
};
