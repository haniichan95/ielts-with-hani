"use strict";

/* =============== MAIN APP CONTROLLER =============== */

(function(){
  var DATA = window.HANI_DATA;
  var STORAGE = window.HANI_STORAGE;

  var state = STORAGE.loadState();
  var skill = "Listening";
  var selQ = {};
  var selErr = {};

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function saveState(){
    STORAGE.schedulePush(state);
  }

  /* =============== BAND PROFILE =============== */
  function calcOverall(arr, key){
    if (!arr || !arr.length) return 0;
    var sum = arr.reduce(function(acc, b){ return acc + Number(b[key] || 0); }, 0);
    return Math.round((sum / arr.length) * 2) / 2;
  }

  function renderBands(){
    var bands = state.bands || DATA.DEFAULT_BANDS;
    var nowOverall = calcOverall(bands, "now");
    var targetOverall = calcOverall(bands, "target");
    var lrTarget = ((bands[0].target + bands[1].target) / 2).toFixed(1).replace(/\.0$/, ".0");
    var swTarget = ((bands[2].target + bands[3].target) / 2).toFixed(1).replace(/\.0$/, ".0");

    var pills = document.getElementById("heroPills");
    if (pills){
      pills.innerHTML =
        '<span class="pill">Hiện tại <b>Overall ' + nowOverall.toFixed(1) + '</b></span>' +
        '<span class="pill">Mục tiêu <b>Overall ' + targetOverall.toFixed(1) + '</b></span>' +
        '<span class="pill">Listening / Reading đích <b>' + bands[0].target.toFixed(1) + ' / ' + bands[1].target.toFixed(1) + '</b></span>' +
        '<span class="pill">Writing / Speaking đích <b>' + bands[2].target.toFixed(1) + ' / ' + bands[3].target.toFixed(1) + '</b></span>';
      void lrTarget;
      void swTarget;
    }

    var html = "";
    bands.forEach(function(b){
      var pct = Math.min(100, Math.round(b.now / 9 * 100));
      var mark = Math.min(100, Math.round(b.target / 9 * 100));
      var gap = (b.target - b.now).toFixed(1);
      html += '<div class="band-card"><div class="skill"><span>' + esc(b.skill) + '</span>' +
        '<span class="nums">hiện tại <b>' + Number(b.now).toFixed(1) + '</b> · đích <b>' + Number(b.target).toFixed(1) + '</b></span></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i><span class="target-mark" style="left:' + mark + '%"></span></div>' +
        '<div class="gap-note">' + (Number(gap) > 0 ? ("Còn cách đích " + gap + " band") : "Đã chạm đích — giữ phong độ nhé!") + "</div></div>";
    });
    document.getElementById("bandGrid").innerHTML = html;
  }

  function openBandModal(){
    var box = document.getElementById("bandFormFields");
    box.innerHTML = "";
    state.bands.forEach(function(b, idx){
      var row = document.createElement("div");
      row.className = "frow";
      row.style.marginTop = idx > 0 ? "10px" : "0";
      row.innerHTML =
        '<div><label class="fl">' + esc(b.skill) + ' — Hiện tại</label>' +
        '<input type="number" step="0.5" min="0" max="9" data-band-idx="' + idx + '" data-band-field="now" value="' + b.now + '" /></div>' +
        '<div><label class="fl">' + esc(b.skill) + ' — Mục tiêu</label>' +
        '<input type="number" step="0.5" min="0" max="9" data-band-idx="' + idx + '" data-band-field="target" value="' + b.target + '" /></div>';
      box.appendChild(row);
    });
    document.getElementById("bandModal").classList.remove("hidden");
  }

  /* =============== TABS =============== */
  var tabBtns = document.querySelectorAll("nav.tabs button");
  tabBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      tabBtns.forEach(function(b){ b.setAttribute("aria-selected", "false"); });
      btn.setAttribute("aria-selected", "true");
      document.querySelectorAll("section.page").forEach(function(s){ s.classList.remove("active"); });
      document.getElementById("page-" + btn.getAttribute("data-tab")).classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* =============== GOALS =============== */
  function weekDone(key){
    if (key === "listening") return state.practice.Listening.length;
    if (key === "reading") return state.practice.Reading.length;
    if (key === "writing") return state.essays.length;
    if (key === "speaking") return state.topics.reduce(function(a, t){ return a + Number(t.done || 0); }, 0);
    if (key === "vocab") return state.vocab.length;
    return 0;
  }

  function stepperRow(def, store, refresh){
    var row = document.createElement("div");
    row.className = "goal-row";
    var info = document.createElement("div");
    info.className = "g-info";
    info.innerHTML = '<div class="g-name"></div><div class="g-detail"></div>';
    info.querySelector(".g-name").textContent = def.name;
    info.querySelector(".g-detail").textContent = def.hint || def.unit;

    var st = document.createElement("div");
    st.className = "stepper";
    var minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Giảm " + def.name);

    var input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = store[def.key];
    input.setAttribute("aria-label", def.name);
    if (def.max) input.max = def.max;

    var plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Tăng " + def.name);

    var unit = document.createElement("span");
    unit.className = "unit";
    unit.textContent = def.unit;

    function setVal(v){
      v = Math.max(0, Math.floor(Number(v) || 0));
      if (def.max) v = Math.min(def.max, v);
      store[def.key] = v;
      input.value = v;
      saveState();
      refresh();
    }

    minus.addEventListener("click", function(){ setVal(store[def.key] - 1); });
    plus.addEventListener("click", function(){ setVal(store[def.key] + 1); });
    input.addEventListener("change", function(){ setVal(input.value); });

    st.appendChild(minus);
    st.appendChild(input);
    st.appendChild(plus);
    st.appendChild(unit);
    row.appendChild(info);
    row.appendChild(st);
    return row;
  }

  function renderGoals(){
    var wg = document.getElementById("weeklyGoals");
    wg.innerHTML = "";
    DATA.WEEK_DEFS.forEach(function(d){ wg.appendChild(stepperRow(d, state.goalsWeek, refreshAll)); });

    var dg = document.getElementById("dailyGoals");
    dg.innerHTML = "";
    DATA.DAILY_DEFS.forEach(function(d){ dg.appendChild(stepperRow(d, state.goalsDaily, refreshAll)); });
  }

  function weekDoneTodaySections(){
    return state.practice.Listening.length + state.practice.Reading.length;
  }

  var DAILY_TASKS = [
    { key: "study", label: "Học đủ thời gian mục tiêu", prog: function(){ return "mục tiêu " + state.goalsDaily.minutes + " phút"; } },
    { key: "sections", label: "Luyện đủ section / passage", prog: function(){ return weekDoneTodaySections() + " / " + state.goalsDaily.sections + " phần"; } },
    { key: "vocab", label: "Ôn từ vựng", prog: function(){ return "mục tiêu " + state.goalsDaily.vocabReview + " từ"; } },
    { key: "errors", label: "Xem lại lỗi sai của bài gần nhất", prog: function(){ return "ở tab Luyện đề / Writing"; } }
  ];

  function renderDailyChecklist(){
    var box = document.getElementById("dailyChecklist");
    box.innerHTML = "";
    DAILY_TASKS.forEach(function(t){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "daily-item" + (state.dailyDone[t.key] ? " done" : "");
      b.setAttribute("aria-pressed", state.dailyDone[t.key] ? "true" : "false");
      b.innerHTML = '<span class="box">' + (state.dailyDone[t.key] ? "✓" : "") + '</span><span></span><span class="d-prog"></span>';
      b.children[1].textContent = t.label;
      b.children[2].textContent = t.prog();
      b.addEventListener("click", function(){
        state.dailyDone[t.key] = !state.dailyDone[t.key];
        saveState();
        renderDailyChecklist();
      });
      box.appendChild(b);
    });
  }

  function renderWeekProgress(){
    var box = document.getElementById("weekProgress");
    box.innerHTML = "";
    DATA.WEEK_DEFS.forEach(function(d){
      var done = weekDone(d.key);
      var goal = state.goalsWeek[d.key];
      var pct = goal > 0 ? Math.min(100, Math.round(done / goal * 100)) : 100;
      var row = document.createElement("div");
      row.className = "goal-row";
      row.innerHTML = '<div class="g-info"><div class="g-name"></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
        '<div style="font-family:\'Baloo 2\';font-weight:800;color:var(--pink-deep);white-space:nowrap"></div>';
      row.querySelector(".g-name").textContent = d.name;
      row.lastElementChild.textContent = done + " / " + goal;
      box.appendChild(row);
    });
  }

  function renderTodayPlan(){
    var today = new Date();
    var daysLeft = 7 - ((today.getDay() + 6) % 7);
    var box = document.getElementById("todayPlan");
    box.innerHTML = "";
    var lines = [];
    DATA.WEEK_DEFS.forEach(function(d){
      var remain = Math.max(0, state.goalsWeek[d.key] - weekDone(d.key));
      if (remain > 0){
        lines.push("<b>" + esc(d.name) + ":</b> còn " + remain + " → khoảng " + Math.ceil(remain / daysLeft) + " mỗi ngày trong " + daysLeft + " ngày còn lại của tuần.");
      }
    });
    if (!lines.length){
      lines.push("Bạn đã hoàn thành mọi mục tiêu tuần — hôm nay cứ ôn nhẹ từ vựng và xem lại lỗi sai thôi.");
    }
    lines.push("<b>Nhịp daily:</b> " + state.goalsDaily.minutes + " phút học · " + state.goalsDaily.sections + " section/passage · ôn " + state.goalsDaily.vocabReview + " từ.");
    box.innerHTML = lines.map(function(l){ return '<p style="margin:8px 0;font-weight:600">' + l + "</p>"; }).join("");
  }

  function renderStats(){
    document.getElementById("stSessions").textContent = state.practice.Listening.length + state.practice.Reading.length;
    document.getElementById("stEssays").textContent = state.essays.length;
    var known = state.vocab.filter(function(v){ return v.known; }).length;
    document.getElementById("stVocab").innerHTML = known + '<span style="font-size:1.1rem;color:var(--ink-faint)"> / ' + state.vocab.length + "</span>";
    document.getElementById("stSpeaking").textContent = weekDone("speaking");
    document.getElementById("vocabStats").textContent = "Đã thuộc " + known + " / " + state.vocab.length + " từ.";
    renderTopErr("Listening", document.getElementById("topErrListening"));
    renderTopErr("Reading", document.getElementById("topErrReading"));
  }

  function refreshAll(){
    renderBands();
    renderWeekProgress();
    renderTodayPlan();
    renderDailyChecklist();
    renderStats();
  }

  /* =============== PRACTICE (LISTENING / READING) =============== */
  function bandFromRaw(skillName, raw){
    var L = [[39,9],[37,8.5],[35,8],[32,7.5],[30,7],[26,6.5],[23,6],[18,5.5],[16,5],[13,4.5],[10,4],[6,3.5],[0,3]];
    var R = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[6,3.5],[0,3]];
    var t = skillName === "Listening" ? L : R;
    for (var i = 0; i < t.length; i++){
      if (raw >= t[i][0]) return t[i][1];
    }
    return 3;
  }

  function wrongCount(){
    var c = document.getElementById("pCorrect").value;
    return c === "" ? 0 : Math.max(0, 40 - Number(c));
  }

  function errTotal(){
    var s = 0;
    for (var k in selErr) s += selErr[k];
    return s;
  }

  function updateErrAssigned(){
    document.getElementById("errAssigned").textContent = "Đã gán " + errTotal() + " / " + wrongCount() + " câu sai";
  }

  function renderChips(){
    var qc = document.getElementById("qTypeChips");
    qc.innerHTML = "";
    DATA.Q_TYPES[skill].forEach(function(q){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", selQ[q] ? "true" : "false");
      b.textContent = q;
      b.addEventListener("click", function(){
        selQ[q] = !selQ[q];
        renderChips();
      });
      qc.appendChild(b);
    });

    var ec = document.getElementById("errChips");
    ec.innerHTML = "";
    DATA.ERRORS[skill].concat(state.customErrors[skill] || []).forEach(function(e){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      var n = selErr[e] || 0;
      b.setAttribute("aria-pressed", n > 0 ? "true" : "false");
      b.appendChild(document.createTextNode(e));
      if (n > 0){
        var c = document.createElement("span");
        c.className = "cnt";
        c.textContent = n;
        b.appendChild(c);
      }
      b.title = "Bấm để cộng 1 câu · Alt+bấm (hoặc chuột phải) để bớt";
      b.addEventListener("click", function(ev){
        if (ev.altKey){
          selErr[e] = Math.max(0, (selErr[e] || 0) - 1);
          if (!selErr[e]) delete selErr[e];
        } else {
          selErr[e] = (selErr[e] || 0) + 1;
        }
        renderChips();
        updateErrAssigned();
      });
      b.addEventListener("contextmenu", function(ev){
        ev.preventDefault();
        selErr[e] = Math.max(0, (selErr[e] || 0) - 1);
        if (!selErr[e]) delete selErr[e];
        renderChips();
        updateErrAssigned();
      });
      ec.appendChild(b);
    });
    updateErrAssigned();
  }

  function setSkill(s){
    skill = s;
    selQ = {};
    selErr = {};
    document.getElementById("segListening").setAttribute("aria-pressed", s === "Listening" ? "true" : "false");
    document.getElementById("segReading").setAttribute("aria-pressed", s === "Reading" ? "true" : "false");
    document.getElementById("practiceTitle").textContent = "Ghi bài " + s;
    document.getElementById("listTitle").textContent = "Các bài " + s + " đã ghi";
    renderChips();
    renderPracticeList();
  }

  function aggregateErrors(s){
    var agg = {};
    (state.practice[s] || []).forEach(function(e){
      for (var k in e.errors){
        agg[k] = (agg[k] || 0) + e.errors[k];
      }
    });
    return Object.keys(agg).map(function(k){ return { name: k, n: agg[k] }; }).sort(function(a, b){ return b.n - a.n; });
  }

  function renderFreqErr(){
    var agg = aggregateErrors(skill);
    var box = document.getElementById("freqErr");
    if (!agg.length){
      box.innerHTML = '<div class="empty">Chưa có dữ liệu lỗi cho ' + skill + ".</div>";
      return;
    }
    box.innerHTML = '<table class="mini"><tr><th>Lý do sai</th><th class="num">Tổng số câu</th></tr>' +
      agg.map(function(r){ return '<tr><td>' + esc(r.name) + '</td><td class="num">' + r.n + "</td></tr>"; }).join("") + "</table>";
  }

  function renderTopErr(s, box){
    var agg = aggregateErrors(s).slice(0, 5);
    if (!agg.length){
      box.innerHTML = '<div class="empty">Chưa có dữ liệu — ghi bài ' + s + " đầu tiên ở tab Luyện đề.</div>";
      return;
    }
    box.innerHTML = '<table class="mini"><tr><th>Lý do sai</th><th class="num">Câu</th></tr>' +
      agg.map(function(r){ return '<tr><td>' + esc(r.name) + '</td><td class="num">' + r.n + "</td></tr>"; }).join("") + "</table>";
  }

  function renderPracticeList(){
    var box = document.getElementById("practiceList");
    var list = state.practice[skill] || [];
    if (!list.length){
      box.innerHTML = '<div class="empty">Chưa ghi bài ' + skill + " nào.</div>";
      renderFreqErr();
      return;
    }
    box.innerHTML = "";
    list.forEach(function(e, idx){
      var errs = Object.keys(e.errors || {}).map(function(k){ return esc(k) + " ×" + e.errors[k]; }).join(" · ");
      var div = document.createElement("div");
      div.className = "entry";
      div.innerHTML =
        '<div class="e-top"><span class="e-name">' + esc(e.name) + '</span>' +
        '<span class="e-score">' + e.correct + "/40 · Band ≈ " + Number(e.band).toFixed(1) + "</span></div>" +
        '<div class="e-meta">' + esc(e.date || "") + (e.qtypes && e.qtypes.length ? " · " + esc(e.qtypes.join(", ")) : "") +
        (e.link ? ' · <a href="' + esc(e.link) + '" target="_blank" rel="noopener">Link đề</a>' : "") + "</div>" +
        (errs ? '<div class="e-errs">Lỗi: ' + errs + "</div>" : "") +
        (e.note ? '<div class="e-errs">Ghi chú: ' + esc(e.note) + "</div>" : "");

      var actions = document.createElement("div");
      actions.className = "e-actions";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn danger xs";
      del.textContent = "Xóa";
      del.addEventListener("click", function(){
        state.practice[skill].splice(idx, 1);
        saveState();
        renderPracticeList();
        refreshAll();
      });
      actions.appendChild(del);
      div.appendChild(actions);
      box.appendChild(div);
    });
    renderFreqErr();
  }

  /* =============== SPEAKING =============== */
  var timerId = null;
  var timerLeft = 0;
  var currentTopic = -1;

  function fmtTime(s){
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function stopTimer(){
    if (timerId){
      clearInterval(timerId);
      timerId = null;
    }
  }

  function playGentleBeep(){
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  function startTimer(sec, phase){
    stopTimer();
    timerLeft = sec;
    document.getElementById("timerFace").textContent = fmtTime(timerLeft);
    document.getElementById("timerPhase").textContent = phase;
    timerId = setInterval(function(){
      timerLeft--;
      document.getElementById("timerFace").textContent = fmtTime(Math.max(0, timerLeft));
      if (timerLeft <= 0){
        stopTimer();
        document.getElementById("timerPhase").textContent = "Hết giờ!";
        playGentleBeep();
      }
    }, 1000);
  }

  function renderTopics(){
    var box = document.getElementById("topicList");
    if (!state.topics.length){
      box.innerHTML = '<div class="empty">Chưa có chủ đề nào.</div>';
      return;
    }
    box.innerHTML = "";
    state.topics.forEach(function(t, i){
      var d = document.createElement("div");
      d.className = "entry";
      d.innerHTML = '<div class="e-top"><span class="e-name"></span><span class="e-score"></span></div><div class="e-meta"></div>';
      d.querySelector(".e-name").textContent = t.name;
      d.querySelector(".e-score").textContent = "Đã luyện " + t.done + " lần";
      d.querySelector(".e-meta").textContent = t.part;

      var actions = document.createElement("div");
      actions.className = "e-actions";

      var pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.className = "btn ghost xs";
      pickBtn.textContent = currentTopic === i ? "Đang chọn ✓" : "Chọn luyện chủ đề này";
      pickBtn.addEventListener("click", function(){
        currentTopic = i;
        document.getElementById("timerTopic").textContent = "Chủ đề: " + t.name + " (" + t.part + ")";
        document.getElementById("timerPhase").textContent = "Sẵn sàng — bấm “Chuẩn bị 1 phút” hoặc “Nói 2 phút”.";
        renderTopics();
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger xs";
      delBtn.textContent = "Xóa";
      delBtn.addEventListener("click", function(){
        state.topics.splice(i, 1);
        if (currentTopic === i) currentTopic = -1;
        else if (currentTopic > i) currentTopic--;
        saveState();
        renderTopics();
        refreshAll();
      });

      actions.appendChild(pickBtn);
      actions.appendChild(delBtn);
      d.appendChild(actions);
      box.appendChild(d);
    });
  }

  /* =============== VOCAB =============== */
  var flashIdx = 0;
  var flashFlipped = false;
  var fillIdx = -1;
  var trIdx = 0;

  function addVocabItem(item){
    state.vocab.unshift({
      id: "voc-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      word: String(item.word || "").trim(),
      pos: String(item.pos || "").trim(),
      meaning: String(item.meaning || "").trim(),
      topic: String(item.topic || "").trim(),
      skill: item.skill || "Writing",
      example: String(item.example || "").trim(),
      known: false
    });
    saveState();
    renderVocabList();
    showFlash(0);
    refreshAll();
  }

  function renderVocabList(){
    var box = document.getElementById("vocabList");
    if (!state.vocab.length){
      box.innerHTML = '<div class="empty">Chưa có từ nào. Thêm từ đầu tiên từ bài luyện hoặc từ phần gợi ý của Writing AI nhé.</div>';
      return;
    }
    box.innerHTML = "";
    state.vocab.forEach(function(v, idx){
      var div = document.createElement("div");
      div.className = "entry";
      div.innerHTML =
        '<div class="e-top"><span class="e-name">' + esc(v.word) +
        (v.pos ? ' <span style="color:var(--ink-soft);font-size:.88rem">(' + esc(v.pos) + ")</span>" : "") + "</span>" +
        '<span class="badge ' + (v.known ? "ok" : "pink") + '">' + (v.known ? "Đã thuộc ✓" : "Đang ôn") + "</span></div>" +
        '<div class="e-meta">' + esc(v.meaning) + " · " + esc(v.skill) + (v.topic ? " · " + esc(v.topic) : "") + "</div>" +
        (v.example ? '<div class="e-errs">VD: ' + esc(v.example) + "</div>" : "");

      var actions = document.createElement("div");
      actions.className = "e-actions";

      var toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn ghost xs";
      toggleBtn.textContent = v.known ? "Đánh dấu cần ôn lại" : "Đã thuộc ✓";
      toggleBtn.addEventListener("click", function(){
        v.known = !v.known;
        saveState();
        renderVocabList();
        refreshAll();
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger xs";
      delBtn.textContent = "Xóa";
      delBtn.addEventListener("click", function(){
        state.vocab.splice(idx, 1);
        saveState();
        renderVocabList();
        showFlash(flashIdx);
        refreshAll();
      });

      actions.appendChild(toggleBtn);
      actions.appendChild(delBtn);
      div.appendChild(actions);
      box.appendChild(div);
    });
  }

  function showFlash(i){
    if (!state.vocab.length){
      document.getElementById("flashWord").textContent = "Chưa có từ nào";
      document.getElementById("flashPos").textContent = "Thêm từ đầu tiên ở form trên nhé";
      document.getElementById("flashBack").classList.add("hidden");
      document.getElementById("flashTap").textContent = "Chạm để lật thẻ";
      return;
    }
    flashIdx = ((i % state.vocab.length) + state.vocab.length) % state.vocab.length;
    flashFlipped = false;
    var v = state.vocab[flashIdx];
    document.getElementById("flashWord").textContent = v.word;
    document.getElementById("flashPos").textContent = (v.pos || "") + (v.topic ? " · " + v.topic : "");
    var back = document.getElementById("flashBack");
    back.textContent = v.meaning + (v.example ? "\nVD: " + v.example : "");
    back.style.whiteSpace = "pre-wrap";
    back.classList.add("hidden");
    document.getElementById("flashTap").textContent = "Chạm để lật thẻ · " + (flashIdx + 1) + " / " + state.vocab.length;
  }

  function fillCandidates(){
    return state.vocab.filter(function(v){
      return v.example && v.word && v.example.toLowerCase().indexOf(v.word.toLowerCase().split(" ")[0]) >= 0;
    });
  }

  function newFill(){
    var cands = fillCandidates();
    var st = document.getElementById("fillStatus");
    st.textContent = "";
    st.className = "status-line";
    if (!cands.length){
      document.getElementById("fillSentence").textContent = "Cần ít nhất 1 từ có câu ví dụ chứa chính từ đó để luyện điền từ.";
      fillIdx = -1;
      return;
    }
    fillIdx = Math.floor(Math.random() * cands.length);
    var v = cands[fillIdx];
    var re = new RegExp(v.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    document.getElementById("fillSentence").textContent = "Điền từ còn thiếu (" + v.meaning + "):  " + v.example.replace(re, "______");
    document.getElementById("fillInput").value = "";
  }

  function newTranslation(){
    var ans = document.getElementById("trAnswer");
    ans.classList.add("hidden");
    ans.textContent = "";
    document.getElementById("trInput").value = "";
    var v = state.vocab.length ? state.vocab[flashIdx] : null;
    if (v && v.example){
      document.getElementById("trSentence").innerHTML = "Đặt / dịch sang tiếng Anh câu chứa từ <b>" + esc(v.word) + "</b>:<br>“" +
        "Hãy dùng từ «" + esc(v.word) + "» (" + esc(v.meaning) + ") trong một câu về chủ đề " + esc(v.topic || v.skill) + ", rồi đối chiếu với câu ví dụ mẫu bên dưới.”";
      ans.textContent = "Đáp án mẫu: " + v.example;
      return;
    }
    var item = DATA.TR_BANK[trIdx % DATA.TR_BANK.length];
    trIdx++;
    document.getElementById("trSentence").innerHTML = "Dịch câu sau sang tiếng Anh:<br>“" + esc(item.vi) + "”";
    ans.textContent = "Đáp án mẫu: " + item.en;
  }

  /* =============== CLOUD SYNC MODAL =============== */
  function setSyncPill(kind, text){
    var dot = document.getElementById("syncDot");
    var lbl = document.getElementById("syncText");
    if (dot) dot.className = "dot " + (kind === "ok" ? "ok" : kind === "syncing" ? "syncing" : kind === "bad" ? "bad" : "");
    if (lbl) lbl.textContent = text;
  }

  function setSyncModalStatus(msg, cls){
    var el = document.getElementById("syncModalStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "status-line " + (cls || "");
  }

  function openSyncModal(){
    var cfg = STORAGE.getCloudConfig();
    document.getElementById("sbUrl").value = cfg.url;
    document.getElementById("sbKey").value = cfg.anonKey;
    document.getElementById("sbSyncId").value = cfg.syncId;
    document.getElementById("sbAutoSync").checked = cfg.autoSync;
    setSyncModalStatus("", "");
    document.getElementById("syncModal").classList.remove("hidden");
  }

  function applyRemoteState(newState){
    state = newState;
    renderAll();
  }

  function renderAll(){
    renderGoals();
    renderTopics();
    renderVocabList();
    showFlash(0);
    renderPracticeList();
    refreshAll();
    window.HANI_WRITING.init({
      state: state,
      saveState: saveState,
      refreshAll: refreshAll,
      addVocabItem: addVocabItem,
      esc: esc
    });
  }

  /* =============== WIRE EVENTS =============== */
  document.getElementById("editBandsBtn").addEventListener("click", openBandModal);
  document.getElementById("closeBandModal").addEventListener("click", function(){
    document.getElementById("bandModal").classList.add("hidden");
  });
  document.getElementById("saveBandsBtn").addEventListener("click", function(){
    var inputs = document.querySelectorAll("#bandFormFields input[data-band-idx]");
    inputs.forEach(function(inp){
      var idx = Number(inp.getAttribute("data-band-idx"));
      var field = inp.getAttribute("data-band-field");
      var v = Math.max(0, Math.min(9, Math.round((Number(inp.value) || 0) * 2) / 2));
      state.bands[idx][field] = v;
    });
    saveState();
    renderBands();
    document.getElementById("bandModal").classList.add("hidden");
  });

  /* Practice events */
  document.getElementById("segListening").addEventListener("click", function(){ setSkill("Listening"); });
  document.getElementById("segReading").addEventListener("click", function(){ setSkill("Reading"); });
  document.getElementById("pCorrect").addEventListener("input", function(){
    var v = this.value;
    if (v === ""){
      document.getElementById("bandHint").textContent = "Band quy đổi sẽ hiện ở đây khi bạn nhập số câu đúng.";
    } else {
      document.getElementById("bandHint").textContent = "Band " + skill + " quy đổi (Academic): ≈ " + bandFromRaw(skill, Number(v)).toFixed(1) + " · sai " + wrongCount() + " câu.";
    }
    updateErrAssigned();
  });
  document.getElementById("addCustomErr").addEventListener("click", function(){
    var v = document.getElementById("pCustomErr").value.trim();
    if (!v) return;
    if (DATA.ERRORS[skill].indexOf(v) < 0 && state.customErrors[skill].indexOf(v) < 0){
      state.customErrors[skill].push(v);
      saveState();
    }
    document.getElementById("pCustomErr").value = "";
    renderChips();
  });
  document.getElementById("resetPractice").addEventListener("click", function(){
    document.getElementById("practiceForm").reset();
    selQ = {};
    selErr = {};
    setSkill(skill);
    document.getElementById("pDate").value = STORAGE.todayStr();
  });
  document.getElementById("practiceForm").addEventListener("submit", function(ev){
    ev.preventDefault();
    var correct = Number(document.getElementById("pCorrect").value);
    var entry = {
      id: "pr-" + Date.now(),
      name: document.getElementById("pName").value.trim(),
      link: document.getElementById("pLink").value.trim(),
      correct: correct,
      band: bandFromRaw(skill, correct),
      date: document.getElementById("pDate").value,
      qtypes: Object.keys(selQ).filter(function(k){ return selQ[k]; }),
      errors: JSON.parse(JSON.stringify(selErr)),
      note: document.getElementById("pNote").value.trim()
    };
    state.practice[skill].unshift(entry);
    saveState();
    document.getElementById("resetPractice").click();
    renderPracticeList();
    refreshAll();
  });

  /* Speaking events */
  document.getElementById("timerPrep").addEventListener("click", function(){ startTimer(60, "Đang chuẩn bị — ghi ý chính ra giấy"); });
  document.getElementById("timerSpeak").addEventListener("click", function(){ startTimer(120, "Đang nói — nói liền mạch, đừng dừng lâu"); });
  document.getElementById("timerStop").addEventListener("click", function(){
    stopTimer();
    document.getElementById("timerFace").textContent = "02:00";
    document.getElementById("timerPhase").textContent = "Sẵn sàng";
  });
  document.getElementById("timerDone").addEventListener("click", function(){
    if (currentTopic < 0 || !state.topics[currentTopic]){
      document.getElementById("timerPhase").textContent = "Chọn một chủ đề trước nhé.";
      return;
    }
    state.topics[currentTopic].done++;
    saveState();
    renderTopics();
    refreshAll();
    document.getElementById("timerPhase").textContent = "Đã ghi nhận 1 lượt luyện cho chủ đề này ✓";
  });
  document.getElementById("addTopic").addEventListener("click", function(){
    var v = document.getElementById("spTopic").value.trim();
    if (!v) return;
    state.topics.unshift({ id: "sp-" + Date.now(), name: v, part: document.getElementById("spPart").value, done: 0 });
    document.getElementById("spTopic").value = "";
    saveState();
    renderTopics();
  });

  /* Vocab events */
  document.getElementById("vocabForm").addEventListener("submit", function(ev){
    ev.preventDefault();
    addVocabItem({
      word: document.getElementById("vWord").value,
      pos: document.getElementById("vPos").value,
      meaning: document.getElementById("vMeaning").value,
      topic: document.getElementById("vTopic").value,
      skill: document.getElementById("vSkill").value,
      example: document.getElementById("vExample").value
    });
    this.reset();
  });
  document.getElementById("flashCard").addEventListener("click", function(){
    if (!state.vocab.length) return;
    flashFlipped = !flashFlipped;
    document.getElementById("flashBack").classList.toggle("hidden", !flashFlipped);
    document.getElementById("flashTap").textContent = flashFlipped ? "Chạm để úp thẻ lại" : "Chạm để lật thẻ · " + (flashIdx + 1) + " / " + state.vocab.length;
  });
  document.getElementById("flashNext").addEventListener("click", function(){ showFlash(flashIdx + 1); });
  document.getElementById("flashPrev").addEventListener("click", function(){ showFlash(flashIdx - 1); });
  document.getElementById("flashShuffle").addEventListener("click", function(){
    for (var i = state.vocab.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = state.vocab[i];
      state.vocab[i] = state.vocab[j];
      state.vocab[j] = t;
    }
    saveState();
    showFlash(0);
    renderVocabList();
  });
  document.getElementById("flashKnown").addEventListener("click", function(){
    if (!state.vocab.length) return;
    state.vocab[flashIdx].known = !state.vocab[flashIdx].known;
    saveState();
    renderVocabList();
    refreshAll();
    showFlash(flashIdx + 1);
  });

  var modeBtns = document.querySelectorAll("[data-mode]");
  modeBtns.forEach(function(b){
    b.addEventListener("click", function(){
      modeBtns.forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      ["flash", "fill", "translate"].forEach(function(m){
        document.getElementById("mode" + m.charAt(0).toUpperCase() + m.slice(1)).classList.toggle("hidden", m !== b.getAttribute("data-mode"));
      });
      if (b.getAttribute("data-mode") === "fill") newFill();
      if (b.getAttribute("data-mode") === "translate") newTranslation();
    });
  });
  document.getElementById("fillNext").addEventListener("click", newFill);
  document.getElementById("fillCheck").addEventListener("click", function(){
    var cands = fillCandidates();
    if (fillIdx < 0 || !cands[fillIdx]) return;
    var want = cands[fillIdx].word.trim().toLowerCase();
    var got = document.getElementById("fillInput").value.trim().toLowerCase();
    var st = document.getElementById("fillStatus");
    if (got === want){
      st.textContent = "Đúng rồi! Từ cần điền là “" + cands[fillIdx].word + "”.";
      st.className = "status-line ok";
    } else {
      st.textContent = "Chưa đúng — đáp án là “" + cands[fillIdx].word + "”. Thử câu khác nhé.";
      st.className = "status-line bad";
    }
  });
  document.getElementById("trNew").addEventListener("click", function(){
    if (state.vocab.length) showFlash(flashIdx + 1);
    newTranslation();
  });
  document.getElementById("trShow").addEventListener("click", function(){
    document.getElementById("trAnswer").classList.remove("hidden");
  });

  /* Cloud Sync & Backup Modal Events */
  document.getElementById("syncPillBtn").addEventListener("click", openSyncModal);
  document.getElementById("closeSyncModal").addEventListener("click", function(){
    document.getElementById("syncModal").classList.add("hidden");
  });

  function readCloudFormAndSave(){
    return STORAGE.saveCloudConfig({
      url: document.getElementById("sbUrl").value,
      anonKey: document.getElementById("sbKey").value,
      syncId: document.getElementById("sbSyncId").value,
      autoSync: document.getElementById("sbAutoSync").checked
    });
  }

  document.getElementById("saveCloudCfgBtn").addEventListener("click", function(){
    var cfg = readCloudFormAndSave();
    if (!STORAGE.isCloudConfigured(cfg)){
      setSyncPill("idle", "Lưu trên máy (Local)");
      setSyncModalStatus("Đã lưu cấu hình trống — app đang chạy ở chế độ lưu trên máy (Local).", "");
      return;
    }
    setSyncModalStatus("Đang kiểm tra kết nối & đồng bộ…", "");
    STORAGE.syncSmart(state).then(function(res){
      setSyncModalStatus("Kết nối Supabase thành công! Trạng thái: " + res.action + ".", "ok");
    }).catch(function(err){
      setSyncModalStatus("Lỗi kết nối Supabase: " + err.message, "bad");
    });
  });

  document.getElementById("pushCloudBtn").addEventListener("click", function(){
    readCloudFormAndSave();
    setSyncModalStatus("Đang đẩy dữ liệu lên Cloud…", "");
    STORAGE.pushToCloud(state).then(function(){
      setSyncModalStatus("Đã đẩy toàn bộ dữ liệu hiện tại lên Supabase!", "ok");
    }).catch(function(err){
      setSyncModalStatus("Đẩy thất bại: " + err.message, "bad");
    });
  });

  document.getElementById("pullCloudBtn").addEventListener("click", function(){
    readCloudFormAndSave();
    setSyncModalStatus("Đang tải dữ liệu từ Cloud…", "");
    STORAGE.pullFromCloud().then(function(remote){
      if (!remote){
        setSyncModalStatus("Chưa có dữ liệu cho Sync ID này trên Cloud.", "bad");
        return;
      }
      STORAGE.saveStateLocal(remote, false);
      applyRemoteState(remote);
      setSyncModalStatus("Đã tải và khôi phục dữ liệu từ Cloud thành công!", "ok");
    }).catch(function(err){
      setSyncModalStatus("Tải thất bại: " + err.message, "bad");
    });
  });

  document.getElementById("exportJsonBtn").addEventListener("click", function(){
    STORAGE.exportJson(state);
    setSyncModalStatus("Đã tải xuống file sao lưu JSON.", "ok");
  });

  document.getElementById("importJsonInput").addEventListener("change", function(ev){
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var imported = STORAGE.parseImportedJson(reader.result);
        state = imported;
        saveState();
        applyRemoteState(state);
        setSyncModalStatus("Đã khôi phục dữ liệu từ file JSON thành công!", "ok");
      } catch (err){
        setSyncModalStatus("File JSON lỗi: " + err.message, "bad");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  document.getElementById("resetAllDataBtn").addEventListener("click", function(){
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu học tập trên trình duyệt này về mặc định không?")) return;
    state = STORAGE.defaultState();
    saveState();
    applyRemoteState(state);
    setSyncModalStatus("Đã đặt lại toàn bộ dữ liệu về mặc định.", "");
  });

  /* Close modals on backdrop click */
  ["bandModal", "syncModal"].forEach(function(id){
    document.getElementById(id).addEventListener("click", function(ev){
      if (ev.target.id === id) ev.target.classList.add("hidden");
    });
  });

  /* =============== INIT =============== */
  document.getElementById("pDate").value = STORAGE.todayStr();
  STORAGE.setHandlers({
    onStatus: setSyncPill,
    onRemoteApply: function(remote){
      applyRemoteState(remote);
    }
  });

  setSkill("Listening");
  renderAll();
  STORAGE.syncSmart(state).catch(function(){ /* badge updates automatically */ });
})();
