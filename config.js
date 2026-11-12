// The address of the Cloudflare Worker that counts votes (no trailing slash).
window.ROBOT_API = "https://robot-vote.howtospeakdata.workers.dev";

// Upcoming talk: replaces the black "How To Speak Data" bar until `hideAfter`.
// For the next talk, edit these values. Set window.NEXT_TALK = null to turn it off.
window.NEXT_TALK = {
  when: "Fri 27 Nov, 9.30am",
  where: "Belgrade",
  event: "DSC Europe",
  url: "https://datasciconference.com/speakers/",
  icon: "", // no DSC logo: the banner shows text only
  animation: "decode", // "spin" (compass-style turn) or "decode" (text scrambles then resolves)
  hideAfter: "2026-11-27T11:00:00+01:00" // Belgrade time; the banner disappears after this
};

// "Round by round" panel: one bar per audience, in order.
// An event counts web votes cast between `from` and `until`: the event day plus 4 days after
// (Compass also includes the reception the evening before). Votes outside every window are ignored.
// Before `from`, an event shows as a "coming up" box with its date.
// `logoScale` enlarges a logo whose thin strokes read light at the shared size.
window.VOTE_HISTORY = [
  { name: "LinkedIn", logo: "assets/logo-linkedin.svg", seed: true },
  { name: "Compass Tech Summit", logo: "assets/logo-compass.png", date: "2 Oct", from: "2026-10-01T00:00:00+02:00", until: "2026-10-06T23:59:59+02:00" },
  { name: "Data Decoded", logo: "assets/logo-datadecoded.png", date: "14 Oct", from: "2026-10-14T00:00:00+01:00", until: "2026-10-18T23:59:59+01:00" },
  { name: "Hex Prompt", logo: "assets/logo-hex.png", date: "27 Oct", from: "2026-10-27T00:00:00-07:00", until: "2026-10-31T23:59:59-07:00" },
  { name: "Austin Tableau User Group", short: "Austin TUG", logo: "assets/logo-tableau.png", logoScale: 1.3, date: "12 Nov", from: "2026-11-12T00:00:00-06:00", until: "2026-11-16T23:59:59-06:00" },
  { name: "DSC Europe", logo: "", date: "27 Nov", from: "2026-11-27T00:00:00+01:00", until: "2026-12-01T23:59:59+01:00" }
];
