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
