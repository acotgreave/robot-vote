// Shared by index.html ("Round by round" panel) and share.html (social images):
// turns the vote CSV into one red/blue tally per audience in window.VOTE_HISTORY.
(function () {
  "use strict";

  window.parseVoteCsv = function (text) {
    var lines = text.trim().split("\n"), head = lines.shift().split(",");
    var iTs = head.indexOf("timestamp_utc"), iRobot = head.indexOf("robot"), iSource = head.indexOf("source");
    return lines.map(function (l) {
      var cells = [], cur = "", q = false;
      for (var i = 0; i < l.length; i++) {
        var ch = l.charAt(i);
        if (ch === '"') q = !q;
        else if (ch === "," && !q) { cells.push(cur); cur = ""; }
        else cur += ch;
      }
      cells.push(cur);
      return { ts: cells[iTs], robot: cells[iRobot], source: (cells[iSource] || "").trim() };
    });
  };

  // An event counts web votes between its `from` and `until`; before `from` it is "coming up".
  window.tallyVoteHistory = function (events, votes) {
    var now = Date.now();
    return events.map(function (ev) {
      var from = ev.from ? Date.parse(ev.from) : 0, to = ev.until ? Date.parse(ev.until) : Infinity;
      var row = { ev: ev, red: 0, blue: 0, soon: !!ev.from && now < from };
      if (row.soon) return row;
      votes.forEach(function (v) {
        if (v.robot !== "red" && v.robot !== "blue") return;
        var t = Date.parse(v.ts);
        if (ev.seed ? v.source === "seed" : (v.source === "web" && t >= from && t <= to)) row[v.robot]++;
      });
      return row;
    });
  };

  // Logos are drawn as one-colour stencils; size each to the same visual area so wide
  // wordmarks and square icons carry the same weight.
  window.sizeVoteLogo = function (el, src, area, maxH) {
    var img = new Image();
    img.onload = function () {
      var aspect = img.naturalWidth / img.naturalHeight || 1;
      var h = Math.min(maxH, Math.sqrt(area / aspect));
      el.style.width = Math.round(h * aspect) + "px";
      el.style.height = Math.round(h) + "px";
    };
    img.src = src;
  };
})();
