"use strict";

/* =============== PERSISTENCE (localStorage + Supabase Cloud Sync + JSON) =============== */

window.HANI_STORAGE = (function(){
  var STATE_KEY = "ielts_hani_state_v1";
  var GEM_KEY_STORAGE = "ielts_hani_gemini_key";
  var GEM_REMEMBER_STORAGE = "ielts_hani_gemini_remember";
  var GEM_MODEL_STORAGE = "ielts_hani_gemini_model";
  var CLOUD_CFG_KEY = "ielts_hani_supabase_cfg_v1";

  var pushTimer = null;
  var onSyncStatusChange = null;
  var onRemoteApply = null;

  function clone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function todayStr(){
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function defaultState(){
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      bands: clone(window.HANI_DATA.DEFAULT_BANDS),
      practice: { Listening: [], Reading: [] },
      customErrors: { Listening: [], Reading: [] },
      essays: [],
      topics: [
        { id: "sp-1", name: "Describe a journey you took by public transport", part: "Part 2", done: 0 },
        { id: "sp-2", name: "Talk about traffic problems in your city", part: "Part 3", done: 0 }
      ],
      vocab: [],
      fixedCriteria: clone(window.HANI_DATA.DEFAULT_FIXED_CRITERIA),
      teacherFeedback: [],
      goalsWeek: { listening: 2, reading: 2, writing: 1, speaking: 1, vocab: 20 },
      goalsDaily: { minutes: 60, vocabReview: 15, sections: 2 },
      dailyDone: {},
      dailyDate: todayStr()
    };
  }

  function normalizeState(raw){
    var def = defaultState();
    if (!raw || typeof raw !== "object") return def;

    var s = Object.assign({}, def, raw);
    if (!Array.isArray(s.bands) || s.bands.length !== 4) s.bands = def.bands;
    if (!s.practice || typeof s.practice !== "object") s.practice = def.practice;
    if (!Array.isArray(s.practice.Listening)) s.practice.Listening = [];
    if (!Array.isArray(s.practice.Reading)) s.practice.Reading = [];
    if (!s.customErrors || typeof s.customErrors !== "object") s.customErrors = def.customErrors;
    if (!Array.isArray(s.customErrors.Listening)) s.customErrors.Listening = [];
    if (!Array.isArray(s.customErrors.Reading)) s.customErrors.Reading = [];
    if (!Array.isArray(s.essays)) s.essays = [];
    if (!Array.isArray(s.topics)) s.topics = def.topics;
    if (!Array.isArray(s.vocab)) s.vocab = [];

    if (!s.fixedCriteria || typeof s.fixedCriteria !== "object"){
      s.fixedCriteria = def.fixedCriteria;
    } else {
      if (!Array.isArray(s.fixedCriteria["Task 1"]) || !s.fixedCriteria["Task 1"].length){
        s.fixedCriteria["Task 1"] = def.fixedCriteria["Task 1"];
      }
      if (!Array.isArray(s.fixedCriteria["Task 2"]) || !s.fixedCriteria["Task 2"].length){
        s.fixedCriteria["Task 2"] = def.fixedCriteria["Task 2"];
      }
    }

    if (!Array.isArray(s.teacherFeedback)){
      s.teacherFeedback = [];
    }
    /* Migrate legacy simple string criteria array if present */
    if (Array.isArray(raw.criteria) && raw.criteria.length && !s.teacherFeedback.length){
      s.teacherFeedback = raw.criteria.map(function(txt, idx){
        return {
          id: "tf-mig-" + Date.now() + "-" + idx,
          title: String(txt),
          criterion: "Chung",
          priority: "high",
          taskScope: "both",
          example: "",
          active: true
        };
      });
    }

    s.goalsWeek = Object.assign({}, def.goalsWeek, s.goalsWeek || {});
    s.goalsDaily = Object.assign({}, def.goalsDaily, s.goalsDaily || {});
    s.dailyDone = (s.dailyDone && typeof s.dailyDone === "object") ? s.dailyDone : {};

    /* Reset daily checklist if a new day has begun */
    var today = todayStr();
    if (s.dailyDate !== today){
      s.dailyDone = {};
      s.dailyDate = today;
    }

    return s;
  }

  function loadState(){
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function saveStateLocal(state, touchTimestamp){
    if (touchTimestamp !== false){
      state.updatedAt = new Date().toISOString();
    }
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      /* Ignore quota errors gracefully */
    }
  }

  /* Gemini API Key & Model (stored locally only) */
  function getRememberGeminiKey(){
    var v = localStorage.getItem(GEM_REMEMBER_STORAGE);
    return v === null ? true : v === "true";
  }
  function setRememberGeminiKey(flag){
    localStorage.setItem(GEM_REMEMBER_STORAGE, flag ? "true" : "false");
    if (!flag) localStorage.removeItem(GEM_KEY_STORAGE);
  }
  function getGeminiKey(){
    if (!getRememberGeminiKey()) return "";
    return localStorage.getItem(GEM_KEY_STORAGE) || "";
  }
  function saveGeminiKey(key){
    if (!getRememberGeminiKey()){
      localStorage.removeItem(GEM_KEY_STORAGE);
      return;
    }
    if (key) localStorage.setItem(GEM_KEY_STORAGE, key);
    else localStorage.removeItem(GEM_KEY_STORAGE);
  }
  function getGeminiModel(){
    return localStorage.getItem(GEM_MODEL_STORAGE) || "gemini-2.5-flash";
  }
  function saveGeminiModel(model){
    if (model) localStorage.setItem(GEM_MODEL_STORAGE, model);
  }

  /* Cloud Sync (Supabase REST API) */
  function getCloudConfig(){
    try {
      var raw = localStorage.getItem(CLOUD_CFG_KEY);
      if (!raw) return { url: "", anonKey: "", syncId: "", autoSync: true };
      var c = JSON.parse(raw);
      return {
        url: (c.url || "").trim().replace(/\/+$/, ""),
        anonKey: (c.anonKey || "").trim(),
        syncId: (c.syncId || "").trim(),
        autoSync: c.autoSync !== false
      };
    } catch (e) {
      return { url: "", anonKey: "", syncId: "", autoSync: true };
    }
  }

  function saveCloudConfig(cfg){
    var clean = {
      url: (cfg.url || "").trim().replace(/\/+$/, ""),
      anonKey: (cfg.anonKey || "").trim(),
      syncId: (cfg.syncId || "").trim(),
      autoSync: cfg.autoSync !== false
    };
    localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(clean));
    return clean;
  }

  function isCloudConfigured(cfg){
    cfg = cfg || getCloudConfig();
    return Boolean(cfg.url && cfg.anonKey && cfg.syncId);
  }

  function setStatus(kind, text){
    if (typeof onSyncStatusChange === "function"){
      onSyncStatusChange(kind, text);
    }
  }

  function supabaseHeaders(cfg){
    return {
      "Content-Type": "application/json",
      "apikey": cfg.anonKey,
      "Authorization": "Bearer " + cfg.anonKey
    };
  }

  function pushToCloud(state){
    var cfg = getCloudConfig();
    if (!isCloudConfigured(cfg)){
      return Promise.reject(new Error("Chưa cấu hình Supabase URL, Anon Key và Sync ID."));
    }
    setStatus("syncing", "Đang lưu lên Cloud…");
    var payload = {
      id: cfg.syncId,
      data: state,
      updated_at: state.updatedAt || new Date().toISOString()
    };
    var headers = supabaseHeaders(cfg);
    headers["Prefer"] = "resolution=merge-duplicates,return=representation";

    return fetch(cfg.url + "/rest/v1/hani_profiles?on_conflict=id", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    })
    .then(function(r){
      if (!r.ok){
        return r.text().then(function(t){
          throw new Error("Supabase HTTP " + r.status + ": " + t.slice(0, 140));
        });
      }
      return r.json();
    })
    .then(function(){
      var t = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      setStatus("ok", "Đã đồng bộ Cloud (" + t + ")");
      return true;
    })
    .catch(function(err){
      setStatus("bad", "Lỗi đồng bộ Cloud");
      throw err;
    });
  }

  function pullFromCloud(){
    var cfg = getCloudConfig();
    if (!isCloudConfigured(cfg)){
      return Promise.reject(new Error("Chưa cấu hình Supabase URL, Anon Key và Sync ID."));
    }
    setStatus("syncing", "Đang tải từ Cloud…");
    var endpoint = cfg.url + "/rest/v1/hani_profiles?id=eq." + encodeURIComponent(cfg.syncId) + "&select=id,data,updated_at";
    return fetch(endpoint, {
      method: "GET",
      headers: supabaseHeaders(cfg)
    })
    .then(function(r){
      if (!r.ok){
        return r.text().then(function(t){
          throw new Error("Supabase HTTP " + r.status + ": " + t.slice(0, 140));
        });
      }
      return r.json();
    })
    .then(function(rows){
      if (!Array.isArray(rows) || !rows.length){
        setStatus("ok", "Cloud chưa có dữ liệu");
        return null;
      }
      var row = rows[0];
      var remote = normalizeState(row.data);
      if (row.updated_at && (!remote.updatedAt || new Date(row.updated_at) > new Date(remote.updatedAt))){
        remote.updatedAt = row.updated_at;
      }
      setStatus("ok", "Đã tải dữ liệu Cloud");
      return remote;
    })
    .catch(function(err){
      setStatus("bad", "Lỗi kết nối Cloud");
      throw err;
    });
  }

  function syncSmart(localState){
    var cfg = getCloudConfig();
    if (!isCloudConfigured(cfg)){
      setStatus("idle", "Lưu trên máy (Local)");
      return Promise.resolve({ action: "local", state: localState });
    }
    return pullFromCloud().then(function(remote){
      if (!remote){
        return pushToCloud(localState).then(function(){
          return { action: "pushed", state: localState };
        });
      }
      var localTs = Date.parse(localState.updatedAt || 0) || 0;
      var remoteTs = Date.parse(remote.updatedAt || 0) || 0;
      if (remoteTs > localTs + 1000){
        saveStateLocal(remote, false);
        if (typeof onRemoteApply === "function"){
          onRemoteApply(remote);
        }
        return { action: "pulled", state: remote };
      }
      if (localTs > remoteTs + 1000){
        return pushToCloud(localState).then(function(){
          return { action: "pushed", state: localState };
        });
      }
      setStatus("ok", "Cloud đã khớp");
      return { action: "synced", state: localState };
    });
  }

  function schedulePush(state){
    saveStateLocal(state, true);
    var cfg = getCloudConfig();
    if (!isCloudConfigured(cfg) || !cfg.autoSync) return;
    if (pushTimer) clearTimeout(pushTimer);
    setStatus("syncing", "Đang chờ lưu Cloud…");
    pushTimer = setTimeout(function(){
      pushToCloud(state).catch(function(){ /* status already updated */ });
    }, 1200);
  }

  function exportJson(state){
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ielts-with-hani-backup-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function parseImportedJson(text){
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("File JSON không hợp lệ.");
    return normalizeState(parsed);
  }

  return {
    todayStr: todayStr,
    defaultState: defaultState,
    normalizeState: normalizeState,
    loadState: loadState,
    saveStateLocal: saveStateLocal,
    schedulePush: schedulePush,
    getRememberGeminiKey: getRememberGeminiKey,
    setRememberGeminiKey: setRememberGeminiKey,
    getGeminiKey: getGeminiKey,
    saveGeminiKey: saveGeminiKey,
    getGeminiModel: getGeminiModel,
    saveGeminiModel: saveGeminiModel,
    getCloudConfig: getCloudConfig,
    saveCloudConfig: saveCloudConfig,
    isCloudConfigured: isCloudConfigured,
    pushToCloud: pushToCloud,
    pullFromCloud: pullFromCloud,
    syncSmart: syncSmart,
    exportJson: exportJson,
    parseImportedJson: parseImportedJson,
    setHandlers: function(handlers){
      onSyncStatusChange = handlers && handlers.onStatus;
      onRemoteApply = handlers && handlers.onRemoteApply;
    }
  };
})();
