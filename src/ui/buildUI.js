import { MODEL_OPTIONS } from '../models/loadGolfBall.js';

export function buildUI(root) {
  root.innerHTML = `
    <div class="app-shell">
      <main class="viewer-pane">
        <div class="viewer-frame">
          <canvas id="viewer"></canvas>

          <div class="toolbar">
            <button id="frontView" type="button">Front</button>
            <button id="rearView" type="button">Rear</button>
            <button id="isoView" type="button">Isometric</button>
            <button id="resetView" type="button">Reset</button>
          </div>

          <div id="errorOverlay" class="error-overlay">
            <div class="error-box">
              <h2>3D preview error</h2>
              <p id="errorMessage"></p>
              <pre id="errorDetails"></pre>
            </div>
          </div>
        </div>
      </main>

      <aside class="sidebar">
        <h1>Golf Ball Studio V2</h1>

        <section class="panel">
          <h2>Model</h2>
          <label>
            Golf ball
            <select id="modelSelect">
              ${Object.entries(MODEL_OPTIONS)
                .map(([key, option]) => `<option value="${key}">${option.label}</option>`)
                .join('')}
            </select>
          </label>
          <div id="modelDiagnostic" class="diagnostic-card">Waiting for model…</div>
        </section>

        <section class="panel">
          <h2>Cover</h2>
          <label>
            Appearance
            <select id="coverSelect">
              <option value="clean">Clean neutral</option>
              <option value="new">Supplied new-ball PBR</option>
              <option value="used">Supplied lightly-used PBR</option>
            </select>
          </label>

          <label>
            Ball color
            <input id="ballColor" type="color" value="#f8f8f5" />
          </label>

          <label>
            Roughness
            <input id="roughness" type="range" min="0.05" max="1" step="0.01" value="0.30" />
          </label>

          <label>
            Clearcoat
            <input id="clearcoat" type="range" min="0" max="1" step="0.01" value="0.36" />
          </label>
        </section>

        <section class="panel">
          <h2>Studio</h2>
          <label>
            Background
            <input id="backgroundColor" type="color" value="#22262b" />
          </label>

          <label>
            Floor
            <select id="floorSelect">
              <option value="dark">Dark studio</option>
              <option value="white">White studio</option>
              <option value="wood">Wood</option>
              <option value="grass">Grass</option>
              <option value="glass">Glass</option>
              <option value="brick">Brick</option>
            </select>
          </label>
        </section>

        <section class="panel">
          <h2>Status</h2>
          <div id="status" class="status-card">Starting renderer…</div>
        </section>
      </aside>
    </div>
  `;

  return {
    canvas: root.querySelector('#viewer'),
    modelSelect: root.querySelector('#modelSelect'),
    coverSelect: root.querySelector('#coverSelect'),
    ballColor: root.querySelector('#ballColor'),
    roughness: root.querySelector('#roughness'),
    clearcoat: root.querySelector('#clearcoat'),
    backgroundColor: root.querySelector('#backgroundColor'),
    floorSelect: root.querySelector('#floorSelect'),
    status: root.querySelector('#status'),
    modelDiagnostic: root.querySelector('#modelDiagnostic'),
    errorOverlay: root.querySelector('#errorOverlay'),
    errorMessage: root.querySelector('#errorMessage'),
    errorDetails: root.querySelector('#errorDetails'),
    frontView: root.querySelector('#frontView'),
    rearView: root.querySelector('#rearView'),
    isoView: root.querySelector('#isoView'),
    resetView: root.querySelector('#resetView')
  };
}
