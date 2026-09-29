(function () {
  "use strict";

  var API = (window.ROBOT_API || "").replace(/\/+$/, "");
  var DEMO = !API || API.indexOf("YOUR-SUBDOMAIN") !== -1;
  var DEMO_COUNTS = { red: 75, blue: 32, total: 107, countries: 0 };
  var NAMES = { red: "Red Rocker", blue: "Blue Bomber" };

  var $ = function (id) { return document.getElementById(id); };
  var fightersEl = $("fighters");
  var fighters = document.querySelectorAll(".fighter");
  var resultsEl = $("results");
  var hintEl = $("hint");

  // ---------- storage (wrapped: private mode can throw) ----------
  function getStore(k) {
    try { var v = localStorage.getItem(k); if (v) return v; } catch (e) {}
    var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setStore(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    document.cookie = k + "=" + encodeURIComponent(v) + "; max-age=31536000; path=/; SameSite=Lax";
  }
  function clearStore(k) {
    try { localStorage.removeItem(k); } catch (e) {}
    document.cookie = k + "=; max-age=0; path=/; SameSite=Lax";
  }
  function newId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function voterId() {
    var id = getStore("robotVoter");
    if (!id) { id = newId(); setStore("robotVoter", id); }
    return id;
  }

  // ---------- URL switches ----------
  // ?e=dis26      tag votes with the event the QR code was handed out at
  // ?test         test mode: votes are stored as source=test and never counted
  // ?test=off     leave test mode
  var params = new URLSearchParams(location.search);
  if (params.has("e")) setStore("robotEvent", params.get("e").slice(0, 40));
  if (params.has("test")) {
    if (params.get("test") === "off") clearStore("robotTest");
    else setStore("robotTest", "1");
  }
  if (params.has("e") || params.has("test")) {
    history.replaceState(null, "", location.pathname + location.hash);
  }
  var TEST = getStore("robotTest") === "1";

  // ---------- network ----------
  function request(path, opts) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    opts = opts || {};
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(API + path, opts).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function fetchResults() {
    if (DEMO) return Promise.resolve(Object.assign({}, DEMO_COUNTS));
    return request("/results");
  }
  function postVote(robot) {
    if (DEMO) {
      var c = Object.assign({}, DEMO_COUNTS);
      if (!TEST) { c[robot] += 1; c.total += 1; }
      return new Promise(function (res) { setTimeout(function () { res({ ok: true, results: c }); }, 350); });
    }
    return request("/vote", {
      method: "POST",
      keepalive: true, // lets the vote finish even if they close the tab straight away
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ robot: robot, voter: voterId(), event: getStore("robotEvent") || "", test: TEST })
    });
  }

  // Keep trying until the vote lands: conference wifi is rarely kind.
  // The Worker ignores repeats from the same voter id, so retrying is safe.
  var sending = false;
  function flushPending() {
    var robot = getStore("robotPending");
    if (!robot || sending) return;
    sending = true;
    var delays = [0, 1500, 4000, 10000];
    (function attempt(i) {
      setTimeout(function () {
        postVote(robot).then(function (data) {
          sending = false;
          clearStore("robotPending");
          counts = data.results;
          render(getStore("robotVote"));
        }).catch(function () {
          if (i + 1 < delays.length) return attempt(i + 1);
          sending = false;
          $("tally").textContent = "Your vote is saved on this phone and will be sent as soon as you have signal.";
        });
      }, delays[i]);
    })(0);
  }
  window.addEventListener("online", flushPending);

  // ---------- rendering ----------
  var counts = null; // latest tally from the server (test votes excluded)
  var justVoted = false;

  function withMine(r, mine) {
    // In test mode the server never counts our vote, so add it locally for display.
    var c = Object.assign({}, r);
    if (mine && TEST) { c[mine] += 1; c.total += 1; }
    return c;
  }

  function markVoted(robot) {
    fightersEl.classList.add("voted");
    hintEl.hidden = true;
    fighters.forEach(function (f) {
      var isPick = f.getAttribute("data-robot") === robot;
      f.classList.toggle("is-pick", isPick);
      f.setAttribute("aria-disabled", "true");
      f.querySelector(".vote-btn").textContent = isPick ? "Your pick" : "";
    });
    document.body.classList.add("has-voted");
  }

  function render(mine) {
    resultsEl.hidden = false;
    $("kapow").style.display = justVoted ? "" : "none";
    $("thanks").textContent = justVoted ? "Vote counted!" : "You've voted. Here's the fight so far:";
    if (!counts) { $("tally").textContent = "Fetching the latest scores…"; return; }

    var r = withMine(counts, mine);
    var total = r.red + r.blue;
    var red = total ? Math.round((r.red / total) * 100) : 50, blue = 100 - red;

    requestAnimationFrame(function () {
      $("barRed").style.flexBasis = red + "%";
      $("barBlue").style.flexBasis = blue + "%";
    });
    $("pctRed").textContent = red >= 12 ? red + "%" : "";
    $("pctBlue").textContent = blue >= 12 ? blue + "%" : "";
    $("nRed").textContent = "(" + r.red.toLocaleString() + ")";
    $("nBlue").textContent = "(" + r.blue.toLocaleString() + ")";
    $("bar").setAttribute("aria-label", red + "% say AI is too dangerous, " + blue + "% say this AI tech is amazing");

    // The robot with fewer votes gets its block knocked off.
    fighters.forEach(function (f) {
      var me = f.getAttribute("data-robot"), other = me === "red" ? "blue" : "red";
      f.classList.toggle("knocked", r[me] < r[other]);
    });

    var line = "";
    if (r.red !== r.blue) {
      var win = r.red > r.blue ? "red" : "blue";
      line = NAMES[win] + " has knocked " + NAMES[win === "red" ? "blue" : "red"] + "'s block off! ";
    }
    line += r.total.toLocaleString() + " votes" + (r.countries > 1 ? " from " + r.countries + " countries" : "") + " so far.";
    if (mine) {
      var other = mine === "red" ? "blue" : "red";
      if (r[mine] > r[other]) line += " " + NAMES[mine] + " is winning. You're with the majority.";
      else if (r[mine] < r[other]) line += " " + NAMES[mine] + " is on the ropes. You're a contrarian!";
      else line += " It's a dead heat!";
    }
    if (DEMO) line += " (Demo mode: counter not connected yet.)";
    $("tally").textContent = line;
  }

  // ---------- voting ----------
  fighters.forEach(function (f) {
    f.addEventListener("click", function () {
      if (getStore("robotVote")) return;
      var robot = f.getAttribute("data-robot");
      setStore("robotVote", robot);
      setStore("robotPending", robot);
      f.classList.add("punch");
      markVoted(robot);
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }

      // Show the result straight away using the tally we already have,
      // then correct it when the server answers.
      if (counts && !TEST) { counts = Object.assign({}, counts); counts[robot] += 1; counts.total += 1; }
      justVoted = true;
      render(robot);
      setTimeout(function () { resultsEl.scrollIntoView({ behavior: "smooth", block: "start" }); }, 1700); // let the K.O. play first
      flushPending();
    });
  });

  // ---------- sticky CTA: appears once the in-card CTA has scrolled away ----------
  var sticky = $("sticky");
  var stickyClosed = false;
  $("stickyClose").addEventListener("click", function () { stickyClosed = true; sticky.classList.remove("show"); });
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var cta = $("resultCta");
      var show = document.body.classList.contains("has-voted") && !stickyClosed &&
        cta.getBoundingClientRect().bottom < 0 && !inView($("next")) && !inView($("about"));
      sticky.classList.toggle("show", show);
    });
  }, { passive: true });

  // ---------- test mode ----------
  if (TEST) {
    $("testbar").hidden = false;
    $("resetVote").addEventListener("click", function () {
      ["robotVote", "robotPending", "robotVoter"].forEach(clearStore);
      location.reload();
    });
  }

  // ---------- start-up ----------
  var already = getStore("robotVote");
  if (already === "red" || already === "blue") markVoted(already);
  fetchResults().then(function (r) {
    if (counts) return; // the vote response got here first and is newer
    counts = r;
    var mine = getStore("robotVote");
    if (!mine) return;
    if (getStore("robotPending") && !TEST) { counts[mine] += 1; counts.total += 1; }
    render(mine);
  }).catch(function () {
    if (already && !counts) $("tally").textContent = "Couldn't load the latest scores. Pull down to refresh.";
  });
  if (already) { render(already); flushPending(); }
})();
