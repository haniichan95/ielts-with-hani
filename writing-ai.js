"use strict";

/* =============== WRITING AI (Fixed Criteria + Teacher Feedback + Gemini) =============== */

window.HANI_WRITING = (function(){
  var GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
  var MAX_IMAGES_PER_FIELD = 6;
  var deps = null;
  var initialized = false;
  var imageStore = { prompt: [], essay: [] };

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

  /* -------- Image Handling (Paste / Drop / Upload + Compression) -------- */
  function compressImageFile(file){
    return new Promise(function(resolve, reject){
      if (!file || !file.type || file.type.indexOf("image/") !== 0){
        reject(new Error("Chỉ hỗ trợ file ảnh."));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function(){ reject(new Error("Không đọc được file ảnh.")); };
      reader.onload = function(){
        var img = new Image();
        img.onerror = function(){ reject(new Error("File ảnh bị lỗi hoặc không hỗ trợ.")); };
        img.onload = function(){
          var maxSide = 1600;
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w > maxSide || h > maxSide){
            if (w >= h){
              h = Math.round(h * maxSide / w);
              w = maxSide;
            } else {
              w = Math.round(w * maxSide / h);
              h = maxSide;
            }
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          var mimeType = "image/jpeg";
          var dataUrl = canvas.toDataURL(mimeType, 0.88);
          var base64 = dataUrl.split(",")[1] || "";
          resolve({
            id: "img-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            name: file.name || ("pasted-" + new Date().toLocaleTimeString("vi-VN") + ".jpg"),
            mimeType: mimeType,
            base64: base64,
            dataUrl: dataUrl,
            width: w,
            height: h,
            sizeKB: Math.max(1, Math.round((base64.length * 3) / 4 / 1024))
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function addImagesToField(kind, files){
    var arr = Array.prototype.slice.call(files || []).filter(function(f){
      return f && f.type && f.type.indexOf("image/") === 0;
    });
    if (!arr.length) return;
    var room = MAX_IMAGES_PER_FIELD - imageStore[kind].length;
    if (room <= 0){
      setStatus("gradeStatus", "Tối đa " + MAX_IMAGES_PER_FIELD + " ảnh cho mỗi mục.", "bad");
      return;
    }
    var toProcess = arr.slice(0, room);
    Promise.all(toProcess.map(compressImageFile)).then(function(items){
      imageStore[kind] = imageStore[kind].concat(items);
      renderImagePreview(kind);
      updateWordCount();
      setStatus("gradeStatus", "Đã thêm " + items.length + " ảnh (" + (kind === "prompt" ? "Đề bài" : "Bài làm") + ").", "ok");
    }).catch(function(err){
      setStatus("gradeStatus", err.message, "bad");
    });
  }

  function openLightbox(item){
    document.getElementById("imgLightboxImg").src = item.dataUrl;
    document.getElementById("imgLightboxCaption").textContent = item.name + " (" + item.width + "×" + item.height + " · " + item.sizeKB + " KB)";
    document.getElementById("imgLightboxModal").classList.remove("hidden");
  }

  function renderImagePreview(kind){
    var isPrompt = kind === "prompt";
    var grid = document.getElementById(isPrompt ? "promptImgPreview" : "essayImgPreview");
    var ocrBtn = document.getElementById(isPrompt ? "ocrPromptBtn" : "ocrEssayBtn");
    var clearBtn = document.getElementById(isPrompt ? "clearPromptImgsBtn" : "clearEssayImgsBtn");
    var list = imageStore[kind];

    ocrBtn.classList.toggle("hidden", !list.length);
    clearBtn.classList.toggle("hidden", !list.length);
    grid.classList.toggle("hidden", !list.length);
    grid.innerHTML = "";

    list.forEach(function(item, idx){
      var card = document.createElement("div");
      card.className = "img-thumb";

      var img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = item.name;
      img.title = "Bấm để phóng to ảnh";
      img.addEventListener("click", function(){ openLightbox(item); });

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "img-rm";
      rm.textContent = "✕";
      rm.title = "Xóa ảnh này";
      rm.addEventListener("click", function(){
        imageStore[kind].splice(idx, 1);
        renderImagePreview(kind);
        updateWordCount();
      });

      var meta = document.createElement("div");
      meta.className = "img-meta";
      meta.textContent = item.width + "×" + item.height + " · " + item.sizeKB + "KB";

      card.appendChild(img);
      card.appendChild(rm);
      card.appendChild(meta);
      grid.appendChild(card);
    });
  }

  function extractClipboardImages(ev){
    var cd = ev.clipboardData || window.clipboardData;
    if (!cd) return [];
    var files = [];
    if (cd.items){
      for (var i = 0; i < cd.items.length; i++){
        var it = cd.items[i];
        if (it.kind === "file" && it.type && it.type.indexOf("image/") === 0){
          var f = it.getAsFile();
          if (f) files.push(f);
        }
      }
    } else if (cd.files){
      for (var j = 0; j < cd.files.length; j++){
        if (cd.files[j].type && cd.files[j].type.indexOf("image/") === 0){
          files.push(cd.files[j]);
        }
      }
    }
    return files;
  }

  function setupImageDropzone(kind, textareaId, dropzoneId, inputId, clearBtnId, ocrBtnId){
    var ta = document.getElementById(textareaId);
    var dz = document.getElementById(dropzoneId);
    var inp = document.getElementById(inputId);

    function handlePaste(ev){
      var imgs = extractClipboardImages(ev);
      if (imgs.length){
        ev.preventDefault();
        addImagesToField(kind, imgs);
      }
    }

    ta.addEventListener("paste", handlePaste);
    dz.addEventListener("paste", handlePaste);

    inp.addEventListener("change", function(){
      if (this.files && this.files.length) addImagesToField(kind, this.files);
      this.value = "";
    });

    dz.addEventListener("dragover", function(ev){
      ev.preventDefault();
      dz.classList.add("dragover");
    });
    dz.addEventListener("dragleave", function(){
      dz.classList.remove("dragover");
    });
    dz.addEventListener("drop", function(ev){
      ev.preventDefault();
      dz.classList.remove("dragover");
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length){
        addImagesToField(kind, ev.dataTransfer.files);
      }
    });

    document.getElementById(clearBtnId).addEventListener("click", function(){
      imageStore[kind] = [];
      renderImagePreview(kind);
      updateWordCount();
    });

    document.getElementById(ocrBtnId).addEventListener("click", function(){
      runImageOcr(kind, this);
    });
  }

  function runImageOcr(kind, btn){
    var list = imageStore[kind];
    if (!list.length) return;
    var key = gemKey();
    if (!key){
      setStatus("gradeStatus", "Hãy dán Gemini API key ở trên trước để AI nhận diện ảnh.", "bad");
      return;
    }
    window.HANI_STORAGE.saveGeminiKey(key);
    var model = document.getElementById("gemModel").value || "gemini-2.5-flash";
    btn.disabled = true;
    setStatus("gradeStatus", "AI đang nhận diện nội dung từ ảnh " + (kind === "prompt" ? "đề bài / biểu đồ / map / process" : "bài làm") + "…", "");

    var instruction = kind === "prompt"
      ? "Hãy đọc và trích xuất toàn bộ nội dung từ ảnh đề IELTS Writing này:\n" +
        "1. Ghi nguyên văn câu đề bài (tiếng Anh) nếu có trong ảnh.\n" +
        "2. Nếu có biểu đồ (Line/Bar/Pie/Table), bản đồ (Map) hoặc quy trình (Process/Diagram): " +
        "xác định loại hình ảnh và mô tả chi tiết các nhãn, trục, đơn vị, mốc thời gian, số liệu chính, các thay đổi trên bản đồ hoặc từng bước của quy trình để dùng cho việc chấm Task Achievement.\n" +
        "Trả về văn bản rõ ràng, không dùng markdown rườm rà."
      : "Hãy chép lại NGUYÊN VĂN toàn bộ bài viết tiếng Anh trong ảnh bài làm này.\n" +
        "QUAN TRỌNG: Giữ nguyên từng từ, chính tả, dấu câu, ngữ pháp và chia đoạn đúng như học viên đã viết (KHÔNG tự động sửa lỗi chính tả hay ngữ pháp). Chỉ trả về nội dung bài viết, không thêm lời bình luận.";

    var parts = [{ text: instruction }];
    list.forEach(function(img){
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    });

    fetch(GEMINI_BASE + "/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { temperature: 0.1 }
      })
    })
    .then(function(r){
      if (!r.ok){
        return r.text().then(function(t){ throw new Error("HTTP " + r.status + " " + t.slice(0, 180)); });
      }
      return r.json();
    })
    .then(function(data){
      var p = (((data.candidates || [])[0] || {}).content || {}).parts;
      var text = (p || []).map(function(x){ return x.text || ""; }).join("").trim();
      if (!text) throw new Error("AI không đọc được chữ/hình từ ảnh.");
      var ta = document.getElementById(kind === "prompt" ? "wPrompt" : "wEssay");
      ta.value = ta.value.trim() ? (ta.value.trim() + "\n\n" + text) : text;
      updateWordCount();
      setStatus("gradeStatus", "Đã nhận diện xong và điền vào ô " + (kind === "prompt" ? "Đề bài" : "Bài viết") + "!", "ok");
    })
    .catch(function(err){
      setStatus("gradeStatus", "Nhận diện ảnh thất bại: " + err.message, "bad");
    })
    .finally(function(){
      btn.disabled = false;
    });
  }

  /* -------- Build Prompt -------- */
  function buildGradePrompt(){
    var task = currentTask();
    var target = document.getElementById("wTarget").value;
    var prompt = document.getElementById("wPrompt").value.trim();
    var essay = document.getElementById("wEssay").value.trim();
    var hasPromptImgs = imageStore.prompt.length > 0;
    var hasEssayImgs = imageStore.essay.length > 0;

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

    var mediaNote = "";
    if (hasPromptImgs || hasEssayImgs){
      mediaNote = "\nHƯỚNG DẪN ĐỌC ẢNH ĐÍNH KÈM:\n" +
        (hasPromptImgs ? "- Có " + imageStore.prompt.length + " ảnh ĐỀ BÀI đính kèm: Hãy tự nhận diện toàn bộ đề chữ và phân tích chính xác nội dung trực quan (Line/Bar/Pie Chart, Table, Map, Process/Diagram: năm, đơn vị, số liệu nổi bật, thay đổi trên map hoặc các bước quy trình) trước khi chấm điểm Task Achievement/Task Response.\n" : "") +
        (hasEssayImgs ? "- Có " + imageStore.essay.length + " ảnh BÀI LÀM đính kèm: Hãy đọc kỹ chữ viết tay/ảnh chụp nguyên văn (KHÔNG tự sửa lỗi chính tả hay ngữ pháp khi đọc), kết hợp với phần text (nếu có) để chấm chính xác và ghi lại bản chép nguyên văn vào trường transcribed_essay.\n" : "");
    }

    return "Bạn là giám khảo IELTS Writing giàu kinh nghiệm (chuẩn Academic). Hãy chấm bài " + task +
      " dưới đây với band mục tiêu của học viên là " + target + ".\n" + mediaNote + "\n" +
      "=== 1. BỘ CRITERIA CỐ ĐỊNH (" + task + ") ===\n" + fixedText + "\n\n" +
      "=== 2. NHỮNG PHẦN FEEDBACK CỦA GIÁO VIÊN (BẮT BUỘC KIỂM TRA TỪNG MỤC) ===\n" + teacherText + "\n\n" +
      "=== 3. ĐỀ BÀI (TEXT) ===\n" + (prompt || (hasPromptImgs ? "(xem trong ảnh đề bài đính kèm bên dưới)" : "(học viên không dán đề)")) + "\n\n" +
      "=== 4. BÀI VIẾT CỦA HỌC VIÊN (TEXT) ===\n" + (essay || (hasEssayImgs ? "(xem trong ảnh bài làm đính kèm bên dưới)" : "")) + "\n\n" +
      "YÊU CẦU ĐẦU RA:\n" +
      "Trả về DUY NHẤT một JSON hợp lệ (không markdown ```, không giải thích ngoài JSON) theo đúng schema sau:\n" +
      "{\n" +
      '  "recognized_prompt_summary": "' + (hasPromptImgs ? 'Tóm tắt ngắn gọn đề bài và các số liệu/chi tiết chính đọc được từ ảnh chart/map/process (tiếng Việt + từ khóa đề)' : '') + '",\n' +
      '  "transcribed_essay": "' + (hasEssayImgs ? 'Chép lại nguyên văn toàn bộ bài viết tiếng Anh đọc được từ ảnh bài làm (giữ nguyên lỗi gốc để đối chiếu)' : '') + '",\n' +
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

  function buildGeminiParts(){
    var parts = [{ text: buildGradePrompt() }];
    if (imageStore.prompt.length){
      parts.push({ text: "--- ẢNH ĐỀ BÀI (PROMPT / CHART / MAP / PROCESS) ---" });
      imageStore.prompt.forEach(function(img){
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      });
    }
    if (imageStore.essay.length){
      parts.push({ text: "--- ẢNH BÀI LÀM CỦA HỌC VIÊN (ESSAY) ---" });
      imageStore.essay.forEach(function(img){
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      });
    }
    return parts;
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

    /* Recognized content from attached images */
    var recPrompt = (data.recognized_prompt_summary || "").trim();
    var recEssay = (data.transcribed_essay || "").trim();
    var recWrap = document.getElementById("recognizedWrap");
    var recPromptWrap = document.getElementById("recognizedPromptWrap");
    var recEssayWrap = document.getElementById("recognizedEssayWrap");
    if (recPrompt || recEssay){
      recWrap.classList.remove("hidden");
      recPromptWrap.classList.toggle("hidden", !recPrompt);
      document.getElementById("recognizedPromptBox").textContent = recPrompt;
      recEssayWrap.classList.toggle("hidden", !recEssay);
      document.getElementById("recognizedEssayBox").textContent = recEssay;
    } else {
      recWrap.classList.add("hidden");
    }

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
    var imgNote = imageStore.essay.length ? (" · +" + imageStore.essay.length + " ảnh bài làm (AI sẽ tự đọc chữ)") : "";
    if (el){
      el.textContent = n + " từ" +
        (n > 0 && n < minReq ? " (khuyến nghị tối thiểu " + minReq + " từ)" : n >= minReq ? " ✓ Đạt độ dài tối thiểu" : "") +
        imgNote;
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
    if (initialized){
      render();
      return;
    }
    initialized = true;

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

    /* Image Paste / Drop / Upload for Prompt & Essay */
    setupImageDropzone("prompt", "wPrompt", "promptDropZone", "promptImgInput", "clearPromptImgsBtn", "ocrPromptBtn");
    setupImageDropzone("essay", "wEssay", "essayDropZone", "essayImgInput", "clearEssayImgsBtn", "ocrEssayBtn");
    document.getElementById("closeImgLightbox").addEventListener("click", function(){
      document.getElementById("imgLightboxModal").classList.add("hidden");
    });
    document.getElementById("imgLightboxModal").addEventListener("click", function(ev){
      if (ev.target.id === "imgLightboxModal") ev.target.classList.add("hidden");
    });

    /* Copy Manual Prompt */
    document.getElementById("copyPromptBtn").addEventListener("click", function(){
      if (!document.getElementById("wEssay").value.trim() && !imageStore.essay.length){
        setStatus("gradeStatus", "Hãy dán bài viết (hoặc ảnh bài làm) trước nhé.", "bad");
        return;
      }
      var text = buildGradePrompt();
      var extraNote = (imageStore.prompt.length || imageStore.essay.length)
        ? " (Lưu ý: Bạn đang đính kèm ảnh — nhớ gửi kèm ảnh khi dán vào Gemini/ChatGPT hoặc bấm 'Nhận diện/Chép chữ' trước.)"
        : "";
      copyText(text, function(){
        setStatus("gradeStatus", "Đã copy prompt (kèm criteria cố định & feedback giáo viên)." + extraNote, "ok");
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

    /* Grade Essay with Gemini (supports text + prompt/essay images) */
    document.getElementById("gradeBtn").addEventListener("click", function(){
      var key = gemKey();
      var essay = document.getElementById("wEssay").value.trim();
      var hasEssayImgs = imageStore.essay.length > 0;
      if (!essay && !hasEssayImgs){
        setStatus("gradeStatus", "Hãy dán bài viết hoặc dán ảnh bài làm trước nhé.", "bad");
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
      setStatus("gradeStatus", "AI đang nhận diện ảnh (nếu có) & chấm bài theo criteria cố định & feedback giáo viên… (10–35 giây)", "");

      var task = currentTask();
      var target = document.getElementById("wTarget").value;
      var promptFull = document.getElementById("wPrompt").value.trim();
      var parts = buildGeminiParts();

      fetch(GEMINI_BASE + "/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: parts }],
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
        var respParts = (((data.candidates || [])[0] || {}).content || {}).parts;
        var raw = (respParts || []).map(function(p){ return p.text || ""; }).join("");
        if (!raw) throw new Error("Gemini không trả về nội dung.");
        var parsed = parseJsonResponse(raw);
        var today = window.HANI_STORAGE.todayStr();
        renderGradeResult(parsed, { task: task, target: target, date: today });

        var finalPrompt = promptFull || (parsed.recognized_prompt_summary || "");
        var finalEssay = essay || (parsed.transcribed_essay || "");
        var finalWordCount = finalEssay.trim() ? finalEssay.trim().split(/\s+/).length : 0;

        deps.state.essays.unshift({
          id: "essay-" + Date.now(),
          task: task,
          target: target,
          band: parsed.overall_band,
          date: today,
          wordCount: finalWordCount,
          prompt: finalPrompt.slice(0, 90) || (imageStore.prompt.length ? "(Đề bài từ ảnh)" : ""),
          promptFull: finalPrompt,
          essay: finalEssay,
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
    renderImagePreview("prompt");
    renderImagePreview("essay");
    updateWordCount();
  }

  return {
    init: init,
    render: render
  };
})();
