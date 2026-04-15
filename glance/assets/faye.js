const FAYE_NUMBER = "5521972177517";

function createFayeButton(articleUrl, discussionUrl, title) {
  const message = `Read this article, summarize it, check the discussion for key points, and save it all as a note. Don't paste the summary in chat.\n\nTitle: ${title}\nArticle: ${articleUrl}\nDiscussion: ${discussionUrl}`;
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

    const discussionLink = parent.querySelector("a.size-title-dynamic, a.color-primary-if-not-visited");
    if (!discussionLink) continue;

    const articleLink = item.querySelector("a.visited-indicator");
    const articleUrl = articleLink ? articleLink.href : discussionLink.href;
    const discussionUrl = discussionLink.href;
    const title = discussionLink.textContent.trim();

    const li = document.createElement("li");
    li.className = "shrink-0 faye-li";
    li.appendChild(createFayeButton(articleUrl, discussionUrl, title));
    item.appendChild(li);
  }
}

// widgets load async, so observe DOM changes
const observer = new MutationObserver(() => injectFayeButtons());
observer.observe(document.body, { childList: true, subtree: true });
