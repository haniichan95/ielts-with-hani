"use strict";

/* =============== WRITING AI (Fixed Criteria + Teacher Feedback + Gemini) =============== */

window.HANI_WRITING = (function(){
  var GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
  var deps = null;

  function esc(s){
    return deps.esc(s);
  }

  function gemKey(){
    return document.getElementById("gemKey").value.trim();
  }

  function setStatus(id, msg, cls){
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = "status-line " + (cls || "");
  }

  function currentTask(){
    return document.getElementById("wTask").value || "Task 2";
  }

  function activeFixedCriteria(task){
    var groups = deps.state.fixedCriteria[task] || [];
    return groups.map(function(g){
      return {
        code: g.code,
        name: g.name,
        points: (g.points || []).filter(function(p){ return p.active !== false; })
      };
    });
  }

  function activeTeacherRules(task){
    return (deps.state.teacherFeedback || []).filter(function(tf){
      return tf.active !== false && (tf.taskScope === "both" || tf.taskScope === task);
    }).sort(function(a, b){
      if (a.priority === b.priority) return 0;
      return a.priority === "high" ? -1 : 1;
    });
  }

  /* -------- Render Fixed Criteria Rubric -------- */
  function renderFixedCriteria(){
    var task = currentTask();
    var box = document.getElementById("fixedCriteriaGrid");
    var label = document.getElementById("fixedCriteriaTaskLabel");
    if (label) label.textContent = task;
    if (!box) return;

    var groups = deps.state.fixedCriteria[task] || [];
    box.innerHTML = "";

    groups.forEach(function(group, gIdx){
      var card = document.createElement("div");
      card.className = "rubric-box";
      var h4 = document.createElement("h4");
      h4.innerHTML = '<span>' + esc(group.name) + '</span><span class="badge pink">' + esc(group.code) + "</span>";
      card.appendChild(h4);

      var ul = document.createElement("ul");
      ul.className = "rubric-list";

      (group.points || []).forEach(function(pt, pIdx){
        var li = document.createElement("li");
        var lbl = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = pt.active !== false;
        cb.addEventListener("change", function(){
          pt.active = cb.checked;
          deps.saveState();
        });
        var span = document.createElement("span");
        span.textContent = pt.text;
        if (!cb.checked) span.style.opacity = "0.55";
        lbl.appendChild(cb);
        lbl.appendChild(span);

        var del = document.createElement("button");
        del.type = "button";
        del.className = "rubric-del";
        del.title = "Xóa tiêu chí này";
        del.textContent = "✕";
        del.addEventListener("click", function(){
          group.points.splice(pIdx, 1);
          deps.saveState();
          renderFixedCriteria();
        });

        li.appendChild(lbl);
        li.appendChild(del);
        ul.appendChild(li);
      });

      card.appendChild(ul);
      box.appendChild(card);
    });

    /* Sync dropdown options for adding fixed criterion */
    var sel = document.getElementById("fcGroupSelect");
    if (sel){
      var prev = sel.value;
      sel.innerHTML = "";
      groups.forEach(function(g){
        var o = document.createElement("option");
        o.value = g.code;
        o.textContent = g.code + " — " + g.name;
        sel.appendChild(o);
      });
      if (prev && groups.some(function(g){ return g.code === prev; })){
        sel.value = prev;
      }
    }
  }

  /* -------- Render Teacher Feedback List -------- */
  function renderTeacherFeedback(){
    var box = document.getElementById("teacherFeedbackList");
    var countEl = document.getElementById("tfActiveCount");
    var task = currentTask();
    var list = deps.state.teacherFeedback || [];
    var activeForTask = activeTeacherRules(task).length;

    if (countEl){
      countEl.textContent = activeForTask + " mục đang bật cho " + task + " (tổng " + list.length + ")";
    }
    if (!box) return;

    if (!list.length){
      box.innerHTML = '<div class="empty">Chưa có feedback cố định của giáo viên. Thêm từng mục ở form trên, dán danh sách hàng loạt, hoặc bấm "Nạp gợi ý mẫu".</div>';
      return;
    }

    box.innerHTML = "";
    list.forEach(function(tf, idx){
      var item = document.createElement("div");
      var isOn = tf.active !== false;
      var matchesTask = tf.taskScope === "both" || tf.taskScope === task;
      item.className = "entry" + (isOn ? "" : " inactive");

      var prioBadge = tf.priority === "high"
        ? '<span class="badge bad">Bắt buộc soi kỹ</span>'
        : '<span class="badge warn">Lưu ý thêm</span>';
      var scopeText = tf.taskScope === "both" ? "Task 1 & 2" : tf.taskScope;
      var scopeBadge = '<span class="badge ' + (matchesTask ? "pink" : "muted") + '">' + esc(scopeText) + "</span>";
      var critBadge = '<span class="badge muted">' + esc(tf.criterion || "Chung") + "</span>";

      item.innerHTML =
        '<div class="e-top">' +
          '<span class="e-name">' + esc(tf.title) + "</span>" +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' + prioBadge + critBadge + scopeBadge + "</div>" +
        "</div>" +
        (tf.example ? '<div class="e-meta">' + esc(tf.example) + "</div>" : "");

      var actions = document.createElement("div");
      actions.className = "e-actions";

      var toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn ghost xs";
      toggleBtn.textContent = isOn ? "Đang bật (bấm để tắt)" : "Đang tắt (bấm để bật)";
      toggleBtn.addEventListener("click", function(){
        tf.active = !isOn;
        deps.saveState();
        renderTeacherFeedback();
      });

      var prioBtn = document.createElement("button");
      prioBtn.type = "button";
      prioBtn.className = "btn ghost xs";
      prioBtn.textContent = tf.priority === "high" ? "Hạ xuống Lưu ý" : "Đặt Bắt buộc";
      prioBtn.addEventListener("click", function(){
        tf.priority = tf.priority === "high" ? "normal" : "high";
        deps.saveState();
        renderTeacherFeedback();
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger xs";
      delBtn.textContent = "Xóa";
      delBtn.addEventListener("click", function(){
        deps.state.teacherFeedback.splice(idx, 1);
        deps.saveState();
        renderTeacherFeedback();
      });

      actions.appendChild(toggleBtn);
      actions.appendChild(prioBtn);
      actions.appendChild(delBtn);
      item.appendChild(actions);
      box.appendChild(item);
    });
  }

  /* -------- Build Prompt -------- */
  function buildGradePrompt(){
    var task = currentTask();
    var target = document.getElementById("wTarget").value;
    var prompt = document.getElementById("wPrompt").value.trim();
    var essay = document.getElementById("wEssay").value.trim();

    var fixedGroups = activeFixedCriteria(task);
    var fixedText = fixedGroups.map(function(g){
      var pts = g.points.map(function(p){ return "  + " + p.text; }).join("\n");
      return "- " + g.name + " (" + g.code + "):\n" + (pts || "  + Đánh giá theo chuẩn IELTS chính thức.");
    }).join("\n");

    var rules = activeTeacherRules(task);
    var teacherText = rules.length
      ? rules.map(function(r, i){
          return (i + 1) + ". [" + (r.priority === "high" ? "BẮT BUỘC SOI KỸ" : "LƯU Ý") + " | " + (r.criterion || "Chung") + "] " + r.title +
            (r.example ? " (Ghi chú GV: " + r.example + ")" : "");
        }).join("\n")
      : "(Chưa có feedback riêng từ giáo viên — chấm theo bộ criteria cố định ở trên.)";

    var firstCriterionName = task === "Task 1" ? "Task Achievement" : "Task Response";

    return "Bạn là giám khảo IELTS Writing giàu kinh nghiệm (chuẩn Academic). Hãy chấm bài " + task +
      " dưới đây với band mục tiêu của học viên là " + target + ".\n\n" +
      "=== 1. BỘ CRITERIA CỐ ĐỊNH (" + task + ") ===\n" + fixedText + "\n\n" +
      "=== 2. NHỮNG PHẦN FEEDBACK CỦA GIÁO VIÊN (BẮT BUỘC KIỂM TRA TỪNG MỤC) ===\n" + teacherText + "\n\n" +
      "=== 3. ĐỀ BÀI ===\n" + (prompt || "(học viên không dán đề)") + "\n\n" +
      "=== 4. BÀI VIẾT CỦA HỌC VIÊN ===\n" + essay + "\n\n" +
      "YÊU CẦU ĐẦU RA:\n" +
      "Trả về DUY NHẤT một JSON hợp lệ (không markdown ```, không giải thích ngoài JSON) theo đúng schema sau:\n" +
      "{\n" +
      '  "overall_band": 6.5,\n' +
      '  "overall_comment": "Nhận xét tổng quan bằng tiếng Việt (2-4 câu), nêu rõ điểm mạnh nhất và rào cản lớn nhất để chạm band ' + target + '.",\n' +
      '  "criteria": [\n' +
      '    {"name": "' + firstCriterionName + '", "band": 6.5, "comment": "Nhận xét chi tiết bằng tiếng Việt đối chiếu theo criteria cố định"},\n' +
      '    {"name": "Coherence and Cohesion", "band": 6.5, "comment": "..."},\n' +
      '    {"name": "Lexical Resource", "band": 6.5, "comment": "..."},\n' +
      '    {"name": "Grammatical Range and Accuracy", "band": 6.5, "comment": "..."}\n' +
      "  ],\n" +
      '  "teacher_feedback_check": [\n' +
      '    {\n' +
      '      "rule": "Nguyên văn tên mục feedback của giáo viên (hoặc nếu trống thì để mảng rỗng [])",\n' +
      '      "status": "passed | partial | violated",\n' +
      '      "evidence": "Trích dẫn câu/đoạn trong bài làm bằng chứng (tiếng Anh nếu có)",\n' +
      '      "advice": "Nhận xét cụ thể bằng tiếng Việt: học viên đã khắc phục chưa hay còn tái phạm, cách sửa."\n' +
      "    }\n" +
      "  ],\n" +
      '  "errors": [\n' +
      '    {\n' +
      '      "original": "cụm/câu gốc sai trong bài",\n' +
      '      "correction": "cụm/câu đã sửa",\n' +
      '      "explanation": "giải thích ngắn gọn bằng tiếng Việt",\n' +
      '      "criterion": "TR/TA | CC | LR | GRA",\n' +
      '      "from_teacher_feedback": true\n' +
      "    }\n" +
      "  ],\n" +
      '  "corrected_version": "Toàn bộ bài viết đã sửa hết lỗi ngữ pháp/từ vựng nhưng giữ nguyên ý tưởng và cấu trúc của học viên.",\n' +
      '  "improved_version": "Toàn bộ bài viết nâng cấp đạt band ' + target + ' (tự nhiên, học thuật, đúng chuẩn IELTS).",\n' +
      '  "vocab_suggestions": [\n' +
      '    {"word": "từ/collocation hay trong bài nâng cấp", "pos": "noun/verb/adj/collocation", "meaning": "nghĩa tiếng Việt", "example": "1 câu ví dụ chuẩn IELTS"}\n' +
      "  ]\n" +
      "}\n" +
      "Lưu ý: Liệt kê tối đa 14 lỗi quan trọng nhất (ưu tiên các lỗi nằm trong phần feedback của giáo viên). " +
      "Nếu có mục feedback giáo viên, mảng teacher_feedback_check PHẢI kiểm tra đủ từng mục đó. " +
      "overall_band làm tròn theo quy tắc IELTS (0.5 gần nhất).";
  }

  /* -------- Render Grading Result -------- */
  function renderGradeResult(data, meta){
    meta = meta || {};
    var task = meta.task || currentTask();
    var target = meta.target || document.getElementById("wTarget").value;

    document.getElementById("resultCard").classList.remove("hidden");
    document.getElementById("overallBand").textContent = (data.overall_band != null ? Number(data.overall_band).toFixed(1) : "–");
    document.getElementById("overallComment").textContent = data.overall_comment || "";
    document.getElementById("resultSummary").textContent = task + " · mục tiêu band " + target + (meta.date ? " · " + meta.date : "");

    /* 4 IELTS Criteria */
    document.getElementById("critGrid").innerHTML = (data.criteria || []).map(function(c){
      return '<div class="crit"><div class="c-head"><span class="c-name">' + esc(c.name) + '</span><span class="c-band">' +
        (c.band != null ? Number(c.band).toFixed(1) : "–") + '</span></div><p>' + esc(c.comment || "") + "</p></div>";
    }).join("");

    /* Teacher Feedback Evaluation */
    var tfWrap = document.getElementById("tfResultWrap");
    var tfGrid = document.getElementById("tfResultGrid");
    var tfChecks = Array.isArray(data.teacher_feedback_check) ? data.teacher_feedback_check : [];
    if (tfChecks.length){
      tfWrap.classList.remove("hidden");
      tfGrid.innerHTML = tfChecks.map(function(item){
        var st = String(item.status || "partial").toLowerCase();
        if (st !== "passed" && st !== "violated" && st !== "partial") st = "partial";
        var badgeCls = st === "passed" ? "ok" : (st === "violated" ? "bad" : "warn");
        var badgeLabel = st === "passed" ? "Đã khắc phục ✓" : (st === "violated" ? "Còn tái phạm ✕" : "Cần cải thiện ~");
        return '<div class="tf-check-card status-' + st + '">' +
          '<div class="tf-check-head"><span>' + esc(item.rule || "") + '</span><span class="badge ' + badgeCls + '">' + badgeLabel + "</span></div>" +
          (item.evidence ? '<div class="tf-check-body"><b>Minh chứng:</b> “' + esc(item.evidence) + "”</div>" : "") +
          (item.advice ? '<div class="tf-check-body">' + esc(item.advice) + "</div>" : "") +
          "</div>";
      }).join("");
    } else {
      tfWrap.classList.add("hidden");
      tfGrid.innerHTML = "";
    }

    /* Errors */
    var errs = data.errors || [];
    document.getElementById("errList").innerHTML = errs.length ? errs.map(function(e){
      return '<div class="err-item">' +
        (e.criterion ? '<span class="tag">' + esc(e.criterion) + "</span>" : "") +
        (e.from_teacher_feedback ? '<span class="badge bad" style="margin-bottom:6px">Lỗi giáo viên từng nhắc</span>' : "") +
        '<div><span class="wrong">' + esc(e.original) + '</span> → <span class="right">' + esc(e.correction) + "</span></div>" +
        '<div class="why">' + esc(e.explanation || "") + "</div></div>";
    }).join("") : '<div class="empty">AI không tìm thấy lỗi đáng kể nào. Tốt lắm!</div>';

    /* Rewrites */
    document.getElementById("rewriteBox").textContent = data.corrected_version || "";
    document.getElementById("improvedBox").textContent = data.improved_version || "";

    /* Suggested Vocab -> Save directly to Vocab Tab */
    var sugWrap = document.getElementById("vocabSugWrap");
    var sugGrid = document.getElementById("vocabSugGrid");
    var sugs = Array.isArray(data.vocab_suggestions) ? data.vocab_suggestions : [];
    if (sugs.length){
      sugWrap.classList.remove("hidden");
      sugGrid.innerHTML = "";
      sugs.forEach(function(v){
        var card = document.createElement("div");
        card.className = "vocab-sug-card";
        card.innerHTML =
          '<div><div style="font-weight:800">' + esc(v.word) + (v.pos ? ' <span style="color:var(--ink-soft);font-size:.84rem">(' + esc(v.pos) + ")</span>" : "") + "</div>" +
          '<div style="font-size:.88rem;color:var(--ink-soft);font-weight:600;margin-top:3px">' + esc(v.meaning || "") + "</div>" +
          (v.example ? '<div style="font-size:.84rem;margin-top:4px;font-weight:600">VD: ' + esc(v.example) + "</div>" : "") +
          "</div>";

        var saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn ghost xs";
        var exists = deps.state.vocab.some(function(item){
          return item.word.toLowerCase() === String(v.word || "").trim().toLowerCase();
        });
        saveBtn.textContent = exists ? "Đã có trong Từ vựng ✓" : "+ Lưu vào Từ vựng";
        saveBtn.disabled = exists;
        saveBtn.addEventListener("click", function(){
          if (typeof deps.addVocabItem === "function"){
            deps.addVocabItem({
              word: v.word || "",
              pos: v.pos || "",
              meaning: v.meaning || "",
              topic: task + " AI",
              skill: "Writing",
              example: v.example || ""
            });
            saveBtn.textContent = "Đã lưu ✓";
            saveBtn.disabled = true;
          }
        });
        card.appendChild(saveBtn);
        sugGrid.appendChild(card);
      });
    } else {
      sugWrap.classList.add("hidden");
      sugGrid.innerHTML = "";
    }
  }

  /* -------- Portfolio -------- */
  function renderEssayList(){
    var box = document.getElementById("essayList");
    var list = deps.state.essays || [];
    if (!list.length){
      box.innerHTML = '<div class="empty">Chưa có bài nào được chấm. Chấm bài đầu tiên ở trên nhé.</div>';
      return;
    }
    box.innerHTML = "";
    list.forEach(function(e, idx){
      var div = document.createElement("div");
      div.className = "entry";
      div.innerHTML =
        '<div class="e-top"><span class="e-name">' + esc(e.task) + (e.prompt ? " — " + esc(e.prompt) : "") + "</span>" +
        '<span class="e-score">Band ≈ ' + (e.band != null ? Number(e.band).toFixed(1) : "–") + "</span></div>" +
        '<div class="e-meta">' + esc(e.date || "") + (e.target ? " · Mục tiêu " + esc(e.target) : "") +
        (e.wordCount ? " · " + e.wordCount + " từ" : "") + "</div>";

      var actions = document.createElement("div");
      actions.className = "e-actions";

      if (e.result){
        var viewBtn = document.createElement("button");
        viewBtn.type = "button";
        viewBtn.className = "btn ghost xs";
        viewBtn.textContent = "Xem lại kết quả chấm";
        viewBtn.addEventListener("click", function(){
          if (e.promptFull) document.getElementById("wPrompt").value = e.promptFull;
          if (e.essay) {
            document.getElementById("wEssay").value = e.essay;
            updateWordCount();
          }
          renderGradeResult(e.result, { task: e.task, target: e.target || "7.0", date: e.date });
          document.getElementById("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
        });
        actions.appendChild(viewBtn);
      }

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn danger xs";
      delBtn.textContent = "Xóa";
      delBtn.addEventListener("click", function(){
        deps.state.essays.splice(idx, 1);
        deps.saveState();
        renderEssayList();
        deps.refreshAll();
      });
      actions.appendChild(delBtn);

      div.appendChild(actions);
      box.appendChild(div);
    });
  }

  function updateWordCount(){
    var val = document.getElementById("wEssay").value.trim();
    var n = val ? val.split(/\s+/).length : 0;
    var minReq = currentTask() === "Task 1" ? 150 : 250;
    var el = document.getElementById("wordCount");
    if (el){
      el.textContent = n + " từ" + (n > 0 && n < minReq ? " (khuyến nghị tối thiểu " + minReq + " từ)" : n >= minReq ? " ✓ Đạt độ dài tối thiểu" : "");
    }
    return n;
  }

  function parseJsonResponse(raw){
    var clean = String(raw || "").trim();
    if (clean.indexOf("```") >= 0){
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }
    try {
      return JSON.parse(clean);
    } catch (e){
      var m = clean.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error("AI trả về định dạng chưa hợp lệ, hãy bấm chấm lại.");
    }
  }

  function populateModelSelect(models, preferred){
    var sel = document.getElementById("gemModel");
    sel.innerHTML = "";
    models.forEach(function(m){
      var o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      sel.appendChild(o);
    });
    var pick = preferred && models.indexOf(preferred) >= 0 ? preferred
      : models.indexOf("gemini-2.5-flash") >= 0 ? "gemini-2.5-flash"
      : models.indexOf("gemini-2.5-pro") >= 0 ? "gemini-2.5-pro"
      : models.indexOf("gemini-2.0-flash") >= 0 ? "gemini-2.0-flash"
      : models[0];
    if (pick){
      sel.value = pick;
      window.HANI_STORAGE.saveGeminiModel(pick);
    }
  }

  function init(context){
    deps = context;

    /* Restore Gemini key & model */
    var keyInput = document.getElementById("gemKey");
    var remBox = document.getElementById("rememberGemKey");
    remBox.checked = window.HANI_STORAGE.getRememberGeminiKey();
    keyInput.value = window.HANI_STORAGE.getGeminiKey();

    var savedModel = window.HANI_STORAGE.getGeminiModel();
    var modelSel = document.getElementById("gemModel");
    if (!Array.from(modelSel.options).some(function(o){ return o.value === savedModel; })){
      var opt = document.createElement("option");
      opt.value = savedModel;
      opt.textContent = savedModel;
      modelSel.appendChild(opt);
    }
    modelSel.value = savedModel;

    keyInput.addEventListener("input", function(){
      window.HANI_STORAGE.saveGeminiKey(gemKey());
    });
    remBox.addEventListener("change", function(){
      window.HANI_STORAGE.setRememberGeminiKey(remBox.checked);
      if (remBox.checked) window.HANI_STORAGE.saveGeminiKey(gemKey());
    });
    document.getElementById("clearGemKey").addEventListener("click", function(){
      keyInput.value = "";
      window.HANI_STORAGE.saveGeminiKey("");
      setStatus("modelStatus", "Đã xóa API key khỏi trình duyệt.", "");
    });
    modelSel.addEventListener("change", function(){
      window.HANI_STORAGE.saveGeminiModel(modelSel.value);
    });

    /* Load Models from Gemini API */
    document.getElementById("loadModels").addEventListener("click", function(){
      var key = gemKey();
      if (!key){
        setStatus("modelStatus", "Hãy dán Gemini API key trước nhé.", "bad");
        return;
      }
      setStatus("modelStatus", "Đang kiểm tra key & tải danh sách model…", "");
      fetch(GEMINI_BASE + "/models", { headers: { "x-goog-api-key": key } })
        .then(function(r){
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function(data){
          var models = (data.models || []).filter(function(m){
            return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0;
          }).map(function(m){ return m.name.replace(/^models\//, ""); });
          if (!models.length) throw new Error("Không có model nào hỗ trợ generateContent.");
          populateModelSelect(models, window.HANI_STORAGE.getGeminiModel());
          window.HANI_STORAGE.saveGeminiKey(key);
          setStatus("modelStatus", "Key hợp lệ — đã tải " + models.length + " model.", "ok");
        })
        .catch(function(e){
          setStatus("modelStatus", "Không tải được model (" + e.message + "). Hãy kiểm tra lại API key.", "bad");
        });
    });

    /* Task switch updates fixed criteria + teacher feedback highlight + word count */
    document.getElementById("wTask").addEventListener("change", function(){
      renderFixedCriteria();
      renderTeacherFeedback();
      updateWordCount();
    });
    document.getElementById("wEssay").addEventListener("input", updateWordCount);

    /* Add custom fixed criterion point */
    document.getElementById("addFixedPoint").addEventListener("click", function(){
      var txt = document.getElementById("newFixedPoint").value.trim();
      var code = document.getElementById("fcGroupSelect").value;
      if (!txt) return;
      var groups = deps.state.fixedCriteria[currentTask()] || [];
      var targetGroup = groups.find(function(g){ return g.code === code; }) || groups[0];
      if (!targetGroup) return;
      targetGroup.points.push({ id: "fc-" + Date.now(), text: txt, active: true });
      document.getElementById("newFixedPoint").value = "";
      deps.saveState();
      renderFixedCriteria();
    });

    document.getElementById("resetFixedCriteria").addEventListener("click", function(){
      var task = currentTask();
      deps.state.fixedCriteria[task] = JSON.parse(JSON.stringify(window.HANI_DATA.DEFAULT_FIXED_CRITERIA[task]));
      deps.saveState();
      renderFixedCriteria();
    });

    /* Add Teacher Feedback rule */
    document.getElementById("addTfBtn").addEventListener("click", function(){
      var title = document.getElementById("tfTitle").value.trim();
      if (!title) return;
      deps.state.teacherFeedback.unshift({
        id: "tf-" + Date.now(),
        title: title,
        criterion: document.getElementById("tfCrit").value,
        priority: document.getElementById("tfPriority").value,
        taskScope: document.getElementById("tfScope").value,
        example: document.getElementById("tfExample").value.trim(),
        active: true
      });
      document.getElementById("tfTitle").value = "";
      document.getElementById("tfExample").value = "";
      deps.saveState();
      renderTeacherFeedback();
    });

    /* Bulk Import Teacher Feedback */
    document.getElementById("toggleBulkTf").addEventListener("click", function(){
      document.getElementById("bulkTfBox").classList.toggle("hidden");
    });
    document.getElementById("importBulkTfBtn").addEventListener("click", function(){
      var raw = document.getElementById("bulkTfText").value;
      var lines = raw.split(/\r?\n/).map(function(l){
        return l.replace(/^[-*•\d.)\s]+/, "").trim();
      }).filter(Boolean);
      if (!lines.length) return;
      var scope = document.getElementById("bulkTfScope").value;
      lines.reverse().forEach(function(line, i){
        deps.state.teacherFeedback.unshift({
          id: "tf-bulk-" + Date.now() + "-" + i,
          title: line,
          criterion: "Chung",
          priority: "high",
          taskScope: scope,
          example: "",
          active: true
        });
      });
      document.getElementById("bulkTfText").value = "";
      document.getElementById("bulkTfBox").classList.add("hidden");
      deps.saveState();
      renderTeacherFeedback();
    });

    /* Sample suggestions */
    document.getElementById("loadSampleTfBtn").addEventListener("click", function(){
      var existing = deps.state.teacherFeedback.map(function(x){ return x.title.toLowerCase(); });
      window.HANI_DATA.SAMPLE_TEACHER_FEEDBACK.forEach(function(sample, i){
        if (existing.indexOf(sample.title.toLowerCase()) < 0){
          deps.state.teacherFeedback.push(Object.assign({ id: "tf-sample-" + Date.now() + "-" + i }, sample));
        }
      });
      deps.saveState();
      renderTeacherFeedback();
    });

    /* Copy Manual Prompt */
    document.getElementById("copyPromptBtn").addEventListener("click", function(){
      if (!document.getElementById("wEssay").value.trim()){
        setStatus("gradeStatus", "Hãy dán bài viết trước nhé.", "bad");
        return;
      }
      var text = buildGradePrompt();
      copyText(text, function(){
        setStatus("gradeStatus", "Đã copy prompt (kèm criteria cố định & feedback giáo viên) — dán vào Gemini/ChatGPT để chấm thủ công.", "ok");
      });
    });

    /* Copy Rewrite / Improved buttons */
    document.getElementById("copyCorrectedBtn").addEventListener("click", function(){
      copyText(document.getElementById("rewriteBox").textContent, function(){
        setStatus("gradeStatus", "Đã copy bài sửa lỗi.", "ok");
      });
    });
    document.getElementById("copyImprovedBtn").addEventListener("click", function(){
      copyText(document.getElementById("improvedBox").textContent, function(){
        setStatus("gradeStatus", "Đã copy phiên bản nâng band.", "ok");
      });
    });

    /* Grade Essay with Gemini */
    document.getElementById("gradeBtn").addEventListener("click", function(){
      var key = gemKey();
      var essay = document.getElementById("wEssay").value.trim();
      if (!essay){
        setStatus("gradeStatus", "Hãy dán bài viết trước nhé.", "bad");
        return;
      }
      if (!key){
        setStatus("gradeStatus", "Chưa có Gemini key — dán key ở trên, hoặc dùng nút “Tạo & copy prompt chấm thủ công”.", "bad");
        return;
      }
      window.HANI_STORAGE.saveGeminiKey(key);
      var model = document.getElementById("gemModel").value || "gemini-2.5-flash";
      var btn = this;
      btn.disabled = true;
      setStatus("gradeStatus", "AI đang chấm bài theo criteria cố định & feedback giáo viên… (10–30 giây)", "");

      var task = currentTask();
      var target = document.getElementById("wTarget").value;
      var promptFull = document.getElementById("wPrompt").value.trim();
      var wordCount = essay.split(/\s+/).length;

      fetch(GEMINI_BASE + "/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildGradePrompt() }] }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json"
          }
        })
      })
      .then(function(r){
        if (!r.ok){
          return r.text().then(function(t){
            throw new Error("HTTP " + r.status + " " + t.slice(0, 200));
          });
        }
        return r.json();
      })
      .then(function(data){
        var parts = (((data.candidates || [])[0] || {}).content || {}).parts;
        var raw = (parts || []).map(function(p){ return p.text || ""; }).join("");
        if (!raw) throw new Error("Gemini không trả về nội dung.");
        var parsed = parseJsonResponse(raw);
        var today = window.HANI_STORAGE.todayStr();
        renderGradeResult(parsed, { task: task, target: target, date: today });

        deps.state.essays.unshift({
          id: "essay-" + Date.now(),
          task: task,
          target: target,
          band: parsed.overall_band,
          date: today,
          wordCount: wordCount,
          prompt: promptFull.slice(0, 90),
          promptFull: promptFull,
          essay: essay,
          result: parsed
        });
        deps.saveState();
        renderEssayList();
        deps.refreshAll();
        setStatus("gradeStatus", "Chấm xong rồi! Kết quả đã được lưu vào Portfolio.", "ok");
        document.getElementById("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function(e){
        setStatus("gradeStatus", "Chấm thất bại: " + e.message, "bad");
      })
      .finally(function(){
        btn.disabled = false;
      });
    });

    render();
  }

  function copyText(text, onDone){
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(onDone, function(){
        fallbackCopy(text);
        onDone();
      });
    } else {
      fallbackCopy(text);
      onDone();
    }
  }

  function fallbackCopy(text){
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function render(){
    renderFixedCriteria();
    renderTeacherFeedback();
    renderEssayList();
    updateWordCount();
  }

  return {
    init: init,
    render: render
  };
})();
