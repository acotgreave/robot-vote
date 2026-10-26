// The address of the Cloudflare Worker that counts votes (no trailing slash).
window.ROBOT_API = "https://robot-vote.howtospeakdata.workers.dev";

// Upcoming talk: replaces the black "How To Speak Data" bar until `hideAfter`.
// For the next talk, edit these values. Set window.NEXT_TALK = null to turn it off.
window.NEXT_TALK = {
  when: "Tue 27 Oct",
  where: "San Francisco",
  event: "Hex Prompt",
  url: "https://hex.tech/prompt/agenda/",
  icon: "assets/talk-hex.png",
  iconShape: "wordmark", // "wordmark" = plain logo lettering; leave out for a round badge
  animation: "decode", // "spin" (compass-style turn) or "decode" (text scrambles then resolves)
  hideAfter: "2026-10-27T13:00:00-07:00" // San Francisco time (talk is 11.45am, Main stage); the banner disappears after this
};

// "Round by round" panel: one bar per audience, in order.
// An event counts web votes cast between `from` and `until`: the event day plus 4 days after
// (Compass also includes the reception the evening before). Votes outside every window are ignored.
// Before `from`, an event shows as a "coming up" box with its date.
window.VOTE_HISTORY = [
  { name: "LinkedIn", logo: "assets/logo-linkedin.svg", seed: true },
  { name: "Compass Tech Summit", logo: "assets/logo-compass.png", date: "2 Oct", from: "2026-10-01T00:00:00+02:00", until: "2026-10-06T23:59:59+02:00" },
  { name: "Data Decoded", logo: "assets/logo-datadecoded.png", date: "14 Oct", from: "2026-10-14T00:00:00+01:00", until: "2026-10-18T23:59:59+01:00" },
  { name: "Hex Prompt", logo: "assets/logo-hex.png", date: "27 Oct", from: "2026-10-27T00:00:00-07:00", until: "2026-10-31T23:59:59-07:00" },
  // TODO: talk day not confirmed yet (DSC runs 23-27 Nov); 26 Nov is a placeholder
  { name: "DSC Europe", logo: "", date: "26 Nov", from: "2026-11-26T00:00:00+01:00", until: "2026-11-30T23:59:59+01:00" }
];
