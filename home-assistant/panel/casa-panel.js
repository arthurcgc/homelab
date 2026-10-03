// Casa: a floor-plan control panel for Home Assistant, registered with panel_custom.
// Coordinates use a 2000 x 1117 grid that matches the hand-drawn house plan.

const ROOMS = [
  { name: "Guest Room", x: 65, y: 70, w: 840, h: 330, color: "#ffa94d" },
  { name: "Office", x: 65, y: 410, w: 840, h: 280, color: "#69db7c" },
  { name: "Living Room", x: 65, y: 700, w: 845, h: 390, color: "#4dabf7" },
  { name: "Bathroom 1", x: 915, y: 60, w: 250, h: 155, color: "#bcaaa4" },
  { name: "Corridor", x: 915, y: 225, w: 250, h: 865, color: "#b197fc" },
  { name: "Bedroom", x: 1175, y: 60, w: 755, h: 430, color: "#38d9a9" },
  { name: "Closet", x: 1175, y: 500, w: 450, h: 135, color: "#ffc078" },
  { name: "Bathroom 2", x: 1635, y: 500, w: 295, h: 135, color: "#bcaaa4" },
  { name: "Kitchen", x: 1175, y: 645, w: 755, h: 445, color: "#ffd43b" },
];

const FIXTURES = [
  { name: "sala-jantar-1", cx: 240, cy: 985, rx: 130, ry: 82 },
  { name: "sala-jantar-2", cx: 760, cy: 812, rx: 135, ry: 95 },
];

const LIGHTS = [
  { entity: "light.hospede_1_1", room: "Guest Room", x: 330, y: 250 },
  { entity: "light.hospede_1_2", room: "Guest Room", x: 640, y: 250 },
  { entity: "light.escritorio_1_1", room: "Office", x: 330, y: 560 },
  { entity: "light.escritorio_1_2", room: "Office", x: 640, y: 560 },
  { entity: "light.sala_jantar_1_1", label: "1-1", room: "Living Room", x: 170, y: 985 },
  { entity: "light.sala_jantar_1_2", label: "1-2", room: "Living Room", x: 310, y: 985 },
  { entity: "light.sala_2_2", label: "2-2", room: "Living Room", x: 760, y: 770 },
  { entity: "light.sala_jantar_2_1", label: "2-1", room: "Living Room", x: 690, y: 850 },
  { entity: "light.sala_jantar_2_3", label: "2-3", room: "Living Room", x: 830, y: 850 },
  { entity: "light.corredor_1", room: "Corridor", x: 1040, y: 660 },
  { entity: "light.quarto_1_1", room: "Bedroom", x: 1400, y: 300 },
  { entity: "light.quarto_1_2", room: "Bedroom", x: 1700, y: 300 },
  { entity: "light.closet_1_1", room: "Closet", x: 1400, y: 560 },
  { entity: "light.closet_1_2", room: "Closet", x: 1550, y: 560 },
];

const TV = { entity: "media_player.55_qled_qn55q60dagxzd", cast: "media_player.55_qled_2", x: 330, y: 716, w: 285, h: 70 };
const DOOR = { x: 612, y: 1068, w: 140 };
const PARTY = "input_boolean.living_room_party";

const STYLE = `
  :host { display: block; height: 100%; background: #0b0d12; color: #e9ecef;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .top { display: flex; align-items: center; gap: 12px; padding: 10px 16px; flex-wrap: wrap; }
  h1 { font-size: 20px; font-weight: 600; margin: 0; letter-spacing: .5px; }
  .status { color: #868e96; font-size: 14px; margin-right: auto; }
  button { font: inherit; font-size: 14px; border: 1px solid #343a40; background: #161a22; color: #e9ecef;
    border-radius: 999px; padding: 8px 16px; cursor: pointer; }
  button:hover { border-color: #868e96; }
  button.party.on { border-color: transparent; color: #0b0d12; font-weight: 600;
    background: linear-gradient(90deg, #ff6b6b, #ffd43b, #69db7c, #4dabf7, #b197fc, #ff6b6b);
    background-size: 300% 100%; animation: slide 4s linear infinite; }
  @keyframes slide { to { background-position: 300% 0; } }
  .plan { padding: 0 16px 16px; }
  svg { width: 100%; height: auto; max-height: calc(100vh - 80px); display: block; margin: 0 auto; }
  .room rect { fill: #141821; stroke-width: 5; cursor: pointer; transition: fill .3s; }
  .room:hover rect { fill: #1a1f2b; }
  .room text { font-size: 34px; font-weight: 600; pointer-events: none; }
  .room.lit rect { fill: #1d2230; }
  .fixture { fill: none; stroke: #4dabf7; stroke-width: 3; stroke-dasharray: 10 8; opacity: .55; pointer-events: none; }
  .fixture-label { fill: #74c0fc; font-size: 24px; opacity: .7; pointer-events: none; }
  .light { cursor: pointer; }
  .light .halo { opacity: 0; transition: opacity .35s, fill .35s; }
  .light .bulb { fill: #2b303b; stroke: #495057; stroke-width: 3; transition: fill .35s, stroke .35s; }
  .light.on .halo { opacity: .55; }
  .light.on .bulb { stroke: #f8f9fa; }
  .light.unavailable .bulb { fill: #1a1d24; stroke: #e03131; stroke-dasharray: 6 5; }
  .light text { fill: #adb5bd; font-size: 24px; pointer-events: none; }
  .light.unavailable text { fill: #e03131; }
  .tv { cursor: pointer; }
  .tv rect { fill: #0f1117; stroke: #4dabf7; stroke-width: 4; }
  .tv.on rect { fill: #13233a; }
  .tv text { fill: #e9ecef; font-size: 24px; pointer-events: none; }
  .door { stroke: #f8f9fa; stroke-width: 10; stroke-linecap: round; }
  .door-label { fill: #868e96; font-size: 20px; }
`;

class CasaPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
  }

  set narrow(v) { this._narrow = v; if (this._menu) this._menu.narrow = v; }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
    this._update();
  }

  _build() {
    const roomsSvg = ROOMS.map((r) => `
      <g class="room" data-room="${r.name}">
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="22" style="stroke:${r.color}"></rect>
        <text x="${r.x + 26}" y="${r.y + 48}" style="fill:${r.color}">${r.name}</text>
      </g>`).join("");
    const fixturesSvg = FIXTURES.map((f) => `
      <ellipse class="fixture" cx="${f.cx}" cy="${f.cy}" rx="${f.rx}" ry="${f.ry}"></ellipse>
      <text class="fixture-label" x="${f.cx}" y="${f.cy - f.ry - 10}" text-anchor="middle">${f.name}</text>`).join("");
    const lightsSvg = LIGHTS.map((l) => `
      <g class="light" data-entity="${l.entity}">
        <circle class="halo" cx="${l.x}" cy="${l.y}" r="70" filter="url(#glow)"></circle>
        <circle class="bulb" cx="${l.x}" cy="${l.y}" r="30"></circle>
        <text x="${l.x}" y="${l.y + 58}" text-anchor="middle">${l.label || l.entity.split(".")[1].replace(/_/g, "-")}</text>
      </g>`).join("");

    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="top">
        <ha-menu-button></ha-menu-button>
        <h1>Casa</h1>
        <span class="status"></span>
        <button class="party">Party mode</button>
        <button class="alloff">All lights off</button>
      </div>
      <div class="plan">
        <svg viewBox="40 40 1920 1070" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"></feGaussianBlur></filter>
          </defs>
          <rect x="50" y="50" width="1900" height="1050" rx="30" fill="none" stroke="#f8f9fa" stroke-width="6"></rect>
          ${roomsSvg}
          ${fixturesSvg}
          <g class="tv" data-tv>
            <rect x="${TV.x}" y="${TV.y}" width="${TV.w}" height="${TV.h}" rx="14"></rect>
            <text x="${TV.x + TV.w / 2}" y="${TV.y + TV.h / 2 + 8}" text-anchor="middle">TV</text>
          </g>
          <line class="door" x1="${DOOR.x}" y1="1100" x2="${DOOR.x + DOOR.w}" y2="1100"></line>
          <text class="door-label" x="${DOOR.x + DOOR.w / 2}" y="${DOOR.y}" text-anchor="middle">front door</text>
          ${lightsSvg}
        </svg>
      </div>`;

    this._menu = this.shadowRoot.querySelector("ha-menu-button");
    this._menu.narrow = this._narrow;
    this.shadowRoot.querySelector("svg").addEventListener("click", (ev) => this._onPlanClick(ev));
    this.shadowRoot.querySelector(".party").addEventListener("click", () =>
      this._hass.callService("input_boolean", "toggle", { entity_id: PARTY }));
    this.shadowRoot.querySelector(".alloff").addEventListener("click", () =>
      this._hass.callService("light", "turn_off", { entity_id: LIGHTS.map((l) => l.entity) }));
    this._built = true;
  }

  _onPlanClick(ev) {
    const light = ev.target.closest("[data-entity]");
    if (light) {
      this._hass.callService("light", "toggle", { entity_id: light.dataset.entity });
      return;
    }
    if (ev.target.closest("[data-tv]")) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: TV.entity }, bubbles: true, composed: true }));
      return;
    }
    const room = ev.target.closest("[data-room]");
    if (!room) return;
    const ids = LIGHTS.filter((l) => l.room === room.dataset.room).map((l) => l.entity);
    if (!ids.length) return;
    const anyOn = ids.some((id) => this._hass.states[id]?.state === "on");
    this._hass.callService("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
  }

  _update() {
    const states = this._hass.states;
    this._menu.hass = this._hass;
    let on = 0;
    const litRooms = new Set();
    for (const l of LIGHTS) {
      const s = states[l.entity];
      const g = this.shadowRoot.querySelector(`[data-entity="${l.entity}"]`);
      const state = s ? s.state : "unavailable";
      g.classList.toggle("on", state === "on");
      g.classList.toggle("unavailable", state === "unavailable" || state === "unknown");
      const bulb = g.querySelector(".bulb");
      const halo = g.querySelector(".halo");
      if (state === "on") {
        on += 1;
        litRooms.add(l.room);
        const rgb = s.attributes.rgb_color || [255, 214, 140];
        const alpha = 0.45 + 0.55 * ((s.attributes.brightness ?? 255) / 255);
        const color = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
        bulb.style.fill = color;
        halo.style.fill = color;
      } else {
        bulb.style.fill = "";
        halo.style.fill = "";
      }
    }
    for (const r of this.shadowRoot.querySelectorAll("[data-room]")) {
      r.classList.toggle("lit", litRooms.has(r.dataset.room));
    }
    const tvOn = states[TV.entity]?.state === "on";
    const cast = states[TV.cast];
    const tvText = this.shadowRoot.querySelector("[data-tv] text");
    this.shadowRoot.querySelector("[data-tv]").classList.toggle("on", tvOn);
    tvText.textContent = !tvOn ? "TV off" : cast?.attributes?.app_name ? `TV · ${cast.attributes.app_name}` : "TV on";

    const party = states[PARTY]?.state === "on";
    const btn = this.shadowRoot.querySelector(".party");
    btn.classList.toggle("on", party);
    btn.textContent = party ? "Party mode: on" : "Party mode";
    this.shadowRoot.querySelector(".status").textContent = `${on} of ${LIGHTS.length} lights on`;
  }
}

customElements.define("casa-panel", CasaPanel);
