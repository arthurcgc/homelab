const FAYE_NUMBER = "5521972177517";

function createFayeButton(url, title) {
  const message = `Read this article and summarize it for me in markdown. Save it as a note.\n\n${title}\n${url}`;
  const waLink = `https://wa.me/${FAYE_NUMBER}?text=${encodeURIComponent(message)}`;

  const btn = document.createElement("a");
  btn.href = waLink;
  btn.target = "_blank";
  btn.rel = "noreferrer";
  btn.textContent = "faye";
  btn.className = "faye-btn";
  return btn;
}

function injectFayeButtons() {
  const items = document.querySelectorAll(".list-horizontal-text");

  for (const item of items) {
    if (item.querySelector(".faye-btn")) continue;

    const parent = item.closest("li");
    if (!parent) continue;

    const link = parent.querySelector("a.size-title-dynamic, a.color-primary-if-not-visited");
    if (!link) continue;

    const url = link.href;
    const title = link.textContent.trim();

    const li = document.createElement("li");
    li.className = "shrink-0 faye-li";
    li.appendChild(createFayeButton(url, title));
    item.appendChild(li);
  }
}

function createRefreshButton() {
  const btn = document.createElement("button");
  btn.className = "widget-refresh-btn";
  btn.title = "Refresh";
  btn.innerHTML = "&#x21bb;";
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    btn.classList.add("spinning");
    try {
      const resp = await fetch(`${pageData.baseURL}/api/pages/${pageData.slug}/content/`);
      await resp.text();
    } catch (_) {}
    location.reload();
  });
  return btn;
}

function injectRefreshButtons() {
  const headers = document.querySelectorAll(".widget-header");
  for (const header of headers) {
    if (header.querySelector(".widget-refresh-btn")) continue;
    header.style.position = "relative";
    header.appendChild(createRefreshButton());
  }
}

// widgets load async, so observe DOM changes
const observer = new MutationObserver(() => {
  injectFayeButtons();
  injectRefreshButtons();
});
observer.observe(document.body, { childList: true, subtree: true });
