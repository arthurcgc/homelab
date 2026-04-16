import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const TagColors: QuartzComponent = (_props: QuartzComponentProps) => {
  return null
}

TagColors.afterDOMLoaded = `
function hashStringToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

function applyTagColors() {
  document.querySelectorAll("a.internal.tag-link").forEach(function(el) {
    const tagName = el.textContent.trim().toLowerCase();
    if (!tagName) return;
    const hue = hashStringToHue(tagName);
    el.style.backgroundColor = "hsl(" + hue + ", 65%, 72%)";
    el.style.color = "#1a1b26";
  });
}

applyTagColors();
document.addEventListener("nav", applyTagColors);
`

export default (() => TagColors) satisfies QuartzComponentConstructor
