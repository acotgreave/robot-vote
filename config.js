// The address of the Cloudflare Worker that counts votes (no trailing slash).
window.ROBOT_API = "https://robot-vote.howtospeakdata.workers.dev";

// Upcoming talk: replaces the black "How To Speak Data" bar until `hideAfter`.
// For the next talk, edit these values. Set window.NEXT_TALK = null to turn it off.
window.NEXT_TALK = {
  when: "Fri 9.25am",
  where: "Data Stage",
  event: "Compass Tech",
  url: "https://compassaitechsummit.com/talks/andy-cotgreaves-talk/",
  icon: "assets/talk-compass.png",
  hideAfter: "2026-10-02T10:30:00+02:00" // Budapest time; the banner disappears after this
};
