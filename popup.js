const siteColors = {
  "ChatGPT": "#10a37f",
  "Claude": "#cc785c",
  "Grok": "#8b5cf6",
  "Gemini": "#4285f4",
  "Copilot": "#0078d4",
  "Perplexity": "#6c47ff",
  "Unknown": "#555"
};

let allPrompts = [];
let currentTab = "prompts";

function loadPrompts(cb) {
  chrome.storage.local.get(["prompts"], (res) => {
    allPrompts = res.prompts || [];
    if (cb) cb();
  });
}

function savePrompts(cb) {
  chrome.storage.local.set({ prompts: allPrompts }, cb);
}

function renderCard(p, index) {
  const color = siteColors[p.site] || "#555";
  const isFav = p.favourite || false;
  return `
    <div class="prompt-item">
      <div class="prompt-top">
        <span class="site-badge" style="background:${color}">${p.site || "?"}</span>
        <span class="prompt-time">${p.time}</span>
      </div>
      <div class="prompt-text">${p.text}</div>
      <div class="prompt-actions">
        <button class="btn-fav ${isFav ? 'active' : ''}" data-action="fav" data-index="${index}">
          ${isFav ? 'Saved' : 'Favourite'}
        </button>
        <button class="btn-del" data-action="del" data-index="${index}">Delete</button>
      </div>
    </div>
  `;
}

// Event delegation — onclick instead of inline
document.addEventListener("click", function(e) {
  const action = e.target.getAttribute("data-action");
  const index = parseInt(e.target.getAttribute("data-index"));

  if (action === "fav" && !isNaN(index)) {
    allPrompts[index].favourite = !allPrompts[index].favourite;
    savePrompts(() => renderCurrentTab());
  }

  if (action === "del" && !isNaN(index)) {
    allPrompts.splice(index, 1);
    savePrompts(() => renderCurrentTab());
  }
});

function renderPrompts(filter = "") {
  const list = document.getElementById("promptsList");
  const reversed = [...allPrompts].map((p, i) => ({ ...p, realIndex: i })).reverse();
  const filtered = filter
    ? reversed.filter(p => p.text.toLowerCase().includes(filter.toLowerCase()) || (p.site || "").toLowerCase().includes(filter.toLowerCase()))
    : reversed;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty">No prompts found</div>`;
    return;
  }
  list.innerHTML = filtered.map(p => renderCard(p, p.realIndex)).join("");
}

function renderFavourites() {
  const list = document.getElementById("favList");
  const favs = allPrompts.map((p, i) => ({ ...p, realIndex: i })).filter(p => p.favourite).reverse();

  if (favs.length === 0) {
    list.innerHTML = `<div class="empty">No favourites yet</div>`;
    return;
  }
  list.innerHTML = favs.map(p => renderCard(p, p.realIndex)).join("");
}

function renderAnalytics() {
  const siteCounts = {};
  allPrompts.forEach(p => {
    const s = p.site || "Unknown";
    siteCounts[s] = (siteCounts[s] || 0) + 1;
  });

  const total = allPrompts.length;
  const favCount = allPrompts.filter(p => p.favourite).length;
  const sites = Object.keys(siteCounts).length;
  const today = allPrompts.filter(p => {
    try {
      return new Date(p.time).toDateString() === new Date().toDateString();
    } catch { return false; }
  }).length;

  document.getElementById("statGrid").innerHTML = `
    <div class="stat-box"><div class="num">${total}</div><div class="label">Total Prompts</div></div>
    <div class="stat-box"><div class="num">${today}</div><div class="label">Today</div></div>
    <div class="stat-box"><div class="num">${favCount}</div><div class="label">Favourites</div></div>
    <div class="stat-box"><div class="num">${sites}</div><div class="label">Sites Used</div></div>
  `;

  const max = Math.max(...Object.values(siteCounts), 1);
  document.getElementById("barChart").innerHTML = Object.entries(siteCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([site, count]) => {
      const color = siteColors[site] || "#555";
      const pct = Math.round((count / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${site}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="bar-count">${count}</div>
        </div>
      `;
    }).join("");
}

document.getElementById("exportCSV").addEventListener("click", () => {
  const rows = [["Site", "Prompt", "Time", "Favourite"]];
  allPrompts.forEach(p => rows.push([
    p.site || "",
    '"' + (p.text || "").replace(/"/g, '""') + '"',
    p.time || "",
    p.favourite ? "Yes" : "No"
  ]));
  download("prompts.csv", rows.map(r => r.join(",")).join("\n"), "text/csv");
});

document.getElementById("exportJSON").addEventListener("click", () => {
  download("prompts.json", JSON.stringify(allPrompts, null, 2), "application/json");
});

document.getElementById("exportTXT").addEventListener("click", () => {
  const txt = allPrompts.map(p => `[${p.site}] ${p.time}\n${p.text}`).join("\n\n---\n\n");
  download("prompts.txt", txt, "text/plain");
});

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    ["prompts", "favourites", "analytics", "export"].forEach(t => {
      document.getElementById(`tab-${t}`).style.display = t === currentTab ? "block" : "none";
    });
    renderCurrentTab();
  });
});

function renderCurrentTab() {
  document.getElementById("totalCount").textContent = allPrompts.length + " prompts";
  if (currentTab === "prompts") renderPrompts(document.getElementById("searchInput").value);
  if (currentTab === "favourites") renderFavourites();
  if (currentTab === "analytics") renderAnalytics();
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderPrompts(e.target.value);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("Sab prompts delete kar dein?")) {
    allPrompts = [];
    savePrompts(() => renderCurrentTab());
  }
});

loadPrompts(() => renderCurrentTab());