console.log("AI Tracker content script loaded 🚀");

let lastMessage = "";

function getLatestPrompt() {
  const host = window.location.hostname;
  let messages = [];

  if (host.includes("chatgpt.com")) {
    messages = document.querySelectorAll("[data-message-author-role='user']");
    if (messages.length === 0)
      messages = document.querySelectorAll(".whitespace-pre-wrap");

  } else if (host.includes("claude.ai")) {
    messages = document.querySelectorAll("[data-testid='user-message']");
    if (messages.length === 0)
      messages = document.querySelectorAll(".font-user-message");

  }  else if (host.includes("grok.com")) {
    messages = document.querySelectorAll("p.py-2");

  } else if (host.includes("gemini.google.com")) {
    messages = document.querySelectorAll(".user-query-text, .query-text");

  } else if (host.includes("copilot.microsoft.com")) {
    messages = document.querySelectorAll("[data-content='user-message']");

  } else if (host.includes("perplexity.ai")) {
    messages = document.querySelectorAll(".my-md");
  }

  if (messages.length === 0) return null;
  return messages[messages.length - 1].innerText.trim();
}

function getSiteName() {
  const host = window.location.hostname;
  if (host.includes("chatgpt.com")) return "ChatGPT";
  if (host.includes("claude.ai")) return "Claude";
  if (host.includes("grok.com")) return "Grok";
  if (host.includes("gemini.google.com")) return "Gemini";
  if (host.includes("copilot.microsoft.com")) return "Copilot";
  if (host.includes("perplexity.ai")) return "Perplexity";
  return "Unknown";
}

function captureFromChat() {
  setInterval(() => {
    const latest = getLatestPrompt();
    if (!latest || latest === lastMessage) return;

    lastMessage = latest;
    const site = getSiteName();
    console.log(`✅ [${site}] Captured:`, latest);

    chrome.storage.local.get({ prompts: [] }, function (data) {
      const prompts = data.prompts;
      prompts.push({
        text: latest,
        site: site,
        time: new Date().toLocaleString()
      });
      chrome.storage.local.set({ prompts }, () => {
        console.log("💾 Saved. Total:", prompts.length);
      });
    });
  }, 2000);
}

setTimeout(captureFromChat, 4000);