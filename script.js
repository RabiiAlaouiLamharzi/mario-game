/* script.js
   - Handles navigation (SPACE), modes, drag/drop demo, mini-simulation, and map interactions
*/
(() => {
  // Screens
  const tutorial = document.querySelector('#tutorial');
  const land = document.querySelector('#land');
  const screens = [tutorial, land];
  let activeScreen = 0; // 0 = tutorial, 1 = land

  // Keyboard: SPACE toggles between tutorial & land. When on land, SPACE cycles Mario between lands.
  window.addEventListener('keydown', (e) => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (activeScreen === 0) showScreen(1);
      else cycleMario();
    }
  });

  // show screen helper
  function showScreen(idx) {
    screens.forEach((s,i) => s.setAttribute('aria-hidden', i === idx ? 'false' : 'true'));
    activeScreen = idx;
  }

  // -------------------------
  // Interactive tutorial mode toggles
  // -------------------------
  const modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
  const blocksMode = document.getElementById('blocks-mode');
  const typingMode = document.getElementById('typing-mode');

  modeBtns.forEach(b => b.addEventListener('click', () => {
    modeBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const m = b.dataset.mode;
    if (m === 'blocks') {
      blocksMode.classList.remove('hidden');
      typingMode.classList.add('hidden');
    } else {
      blocksMode.classList.add('hidden');
      typingMode.classList.remove('hidden');
    }
  }));

  // "View Start Land" button
  document.getElementById('to-map').addEventListener('click', () => showScreen(1));

  // -------------------------
  // Drag & Drop demo (blocks mode)
  // -------------------------
  const draggables = document.querySelectorAll('.draggable');
  const sequence = document.getElementById('sequence');
  const slot = sequence.querySelector('.slot');
  let seq = []; // array of code strings

  draggables.forEach(d => {
    d.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', d.dataset.code || d.textContent);
      d.classList.add('dragging');
    });
    d.addEventListener('dragend', () => d.classList.remove('dragging'));
  });

  sequence.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    sequence.classList.add('drag-over');
  });
  sequence.addEventListener('dragleave', () => sequence.classList.remove('drag-over'));
  sequence.addEventListener('drop', (ev) => {
    ev.preventDefault();
    sequence.classList.remove('drag-over');
    const code = ev.dataTransfer.getData('text/plain');
    // add a visual chip
    const chip = document.createElement('div');
    chip.className = 'block chip';
    chip.textContent = code;
    chip.title = code;
    const remove = document.createElement('button');
    remove.textContent = '✕';
    remove.className = 'remove';
    remove.style.marginLeft = '8px';
    remove.style.background = 'transparent';
    remove.style.border = 'none';
    remove.style.color = '#fff';
    remove.style.cursor = 'pointer';
    remove.addEventListener('click', () => {
      seq = seq.filter(s => s !== code || (s === code && seq.splice(seq.indexOf(s),1)));
      chip.remove();
    });
    chip.appendChild(remove);
    slot.before(chip);
    seq.push(code);
    updateSeqResult();
  });

  function updateSeqResult() {
    const el = document.getElementById('seq-result');
    if (!seq.length) el.textContent = 'Sequence empty';
    else el.textContent = `Sequence: ${seq.join(' → ')}`;
  }

  document.getElementById('clear-seq').addEventListener('click', () => {
    // remove chips
    const chips = document.querySelectorAll('.chip');
    chips.forEach(c => c.remove());
    seq = [];
    updateSeqResult();
    document.getElementById('sim-log').textContent = 'Cleared sequence.';
    moveMiniMarioTo(0);
    resetCoins();
  });

  // Run sequence: simulate Mario moving across 5 cells, collecting coins if moveForward() occurs
  document.getElementById('run-seq').addEventListener('click', () => {
    if (!seq.length) {
      document.getElementById('sim-log').textContent = 'Add blocks first.';
      return;
    }
    runSequenceSimulation(seq);
  });

  // simulation helpers
  const miniMario = document.getElementById('mini-mario');
  const simLog = document.getElementById('sim-log');
  const cells = Array.from(document.querySelectorAll('.grid .cell'));
  function moveMiniMarioTo(cellIndex) {
    const pct = (cellIndex / Math.max(1, cells.length - 1)) * 100;
    miniMario.style.left = pct + '%';
  }
  function resetCoins() {
    cells.forEach(c => c.classList.toggle('collected', false));
    // reset coin visuals by removing attribute
    cells.forEach(c => c.dataset.collected = 'false');
    document.getElementById('portal-status')?.querySelector('span')?.textContent && (document.getElementById('portal-status').querySelector('span').textContent = 'Inactive');
  }

  function runSequenceSimulation(sequenceArr) {
    // Reset mini-state
    moveMiniMarioTo(0);
    cells.forEach(c => c.dataset.collected = 'false');
    simLog.textContent = '';
    let pos = 0;
    let actions = sequenceArr.slice(); // copy
    const step = () => {
      if (!actions.length) {
        simLog.textContent += `\nDone. Mario at cell ${pos}.`;
        checkPortalActivation();
        return;
      }
      const a = actions.shift();
      simLog.textContent += `\nExecuting: ${a}`;
      // interpret a few commands
      if (a.includes('moveForward')) {
        pos = Math.min(cells.length - 1, pos + 1);
        moveMiniMarioTo(pos);
      } else if (a.includes('turnLeft') || a.includes('turnRight')) {
        simLog.textContent += `\n (turn)`;
      } else if (a.includes('collectCoin')) {
        // if there's a coin at current pos, collect it
        const c = cells[pos];
        if (c && c.classList.contains('coin') && c.dataset.collected !== 'true') {
          c.dataset.collected = 'true';
          c.style.opacity = 0.2;
          simLog.textContent += `\n Collected coin at ${pos}!`;
        } else {
          simLog.textContent += `\n Nothing to collect here.`;
        }
      } else if (a.startsWith('for(')) {
        // simple for loop imitation: look for number and expand actions
        const nMatch = a.match(/for\\(.*?i=0; i<([0-9]+);.*?\\)/);
        const n = nMatch ? parseInt(nMatch[1], 10) : 2;
        // insert repeated moveForward() for demo
        for (let i = 0; i < n; i++) actions.unshift('moveForward()');
      } else {
        simLog.textContent += `\n (unknown)`;
      }
      // schedule next
      setTimeout(step, 600);
    };
    step();
  }

  function checkPortalActivation() {
    // portal activates if at least 3 coins collected in sim demo
    const collected = cells.filter(c => c.dataset.collected === 'true').length;
    const portalStatus = document.getElementById('portal-status');
    if (collected >= 3 && portalStatus) {
      portalStatus.innerHTML = 'Portal: <strong style="color:var(--green)">Active</strong>';
    } else if (portalStatus) {
      portalStatus.innerHTML = 'Portal: <span class="muted">Inactive</span>';
    }
  }

  // -------------------------
  // Typing mode (level 3) demo
  // -------------------------
  const editor = document.getElementById('code-editor');
  const codeResult = document.getElementById('code-result');
  document.getElementById('example-code').addEventListener('click', () => {
    editor.value = `public void collectRowOfCoins() {\n  for (int i = 0; i < 4; i++) {\n    moveForward();\n    collectCoin();\n  }\n}`;
  });
  document.getElementById('run-code').addEventListener('click', () => {
    const code = editor.value.trim();
    if (!code) { codeResult.textContent = 'Write some code first.'; return; }
    // very basic "syntax check" imitation: ensure braces and parentheses
    if ((code.match(/\\{/g) || []).length !== (code.match(/\\}/g) || []).length) {
      codeResult.textContent = 'Syntax: missing { or }';
      return;
    }
    if (!code.includes('moveForward') && !code.includes('collectCoin')) {
      codeResult.textContent = 'Try using moveForward() and collectCoin() in your method.';
      return;
    }
    codeResult.textContent = 'Code looks good — running demo (simulated)...';
    // run a simple simulated action: move 3 steps and collect coins
    runSequenceSimulation(['moveForward()', 'collectCoin()', 'moveForward()', 'collectCoin()', 'moveForward()', 'collectCoin()']);
  });

  // -------------------------
  // Map interactions
  // -------------------------
  const landAreas = Array.from(document.querySelectorAll('.land-area'));
  const landInfo = document.getElementById('land-info');
  const marioMini = document.getElementById('mario-mini');
  const coinsSVG = Array.from(document.querySelectorAll('.coin'));
  const portalGroup = document.getElementById('portal');
  const portalStatusSpan = document.getElementById('portal-status');

  // land data
  const lands = [
    { name: 'Mushroom Meadows', desc: 'Level 1 — Basics & Loops. Drag-and-drop blocks, collect coins to reveal the portal.', x: 180 },
    { name: 'Koopa Castle', desc: 'Level 2 — Conditionals & control flow. Build logic to avoid enemies and collect coins.', x: 500 },
    { name: 'Power-Up Plateau', desc: 'Level 3 — Write methods & parameters. Type code to create reusable functions.', x: 760 }
  ];
  let currentLand = 0;

  function renderLandInfo(idx) {
    landInfo.innerHTML = `<strong>${lands[idx].name}</strong><p class="muted small">${lands[idx].desc}</p>`;
    // move marioMini to appropriate x
    marioMini.setAttribute('transform', `translate(${lands[idx].x},230)`);
  }
  landAreas.forEach(la => {
    la.addEventListener('click', () => {
      const id = parseInt(la.dataset.land, 10);
      currentLand = id;
      renderLandInfo(id);
    });
  });

  // prev/next controls
  document.getElementById('prev-land').addEventListener('click', () => {
    currentLand = (currentLand - 1 + lands.length) % lands.length;
    renderLandInfo(currentLand);
  });
  document.getElementById('next-land').addEventListener('click', () => {
    currentLand = (currentLand + 1) % lands.length;
    renderLandInfo(currentLand);
  });

  // collect demo coins button
  document.getElementById('collect-all').addEventListener('click', () => {
    // animate coins opacity and set portal active
    coinsSVG.forEach((c, i) => {
      setTimeout(() => {
        c.style.opacity = 0.25;
        c.dataset.collected = 'true';
      }, i * 160);
    });
    setTimeout(() => {
      activatePortal(true);
    }, 180 * coinsSVG.length + 120);
  });

  function activatePortal(flag) {
    if (flag) {
      portalGroup.style.opacity = 1;
      portalStatusSpan.innerHTML = '<strong style="color:var(--green)">Active</strong>';
    } else {
      portalGroup.style.opacity = 0.3;
      portalStatusSpan.innerHTML = '<span class="muted">Inactive</span>';
    }
  }

  // initial render
  renderLandInfo(0);
  activatePortal(false);

  // cycleMario used by SPACE when on land
  function cycleMario() {
    currentLand = (currentLand + 1) % lands.length;
    renderLandInfo(currentLand);
  }

  // map coin clicking toggles
  coinsSVG.forEach(c => {
    c.addEventListener('click', () => {
      if (c.dataset.collected === 'true') {
        c.dataset.collected = 'false';
        c.style.opacity = 1;
      } else {
        c.dataset.collected = 'true';
        c.style.opacity = 0.25;
      }
      // check if all coins collected
      const collectedCount = coinsSVG.filter(x => x.dataset.collected === 'true').length;
      if (collectedCount >= 3) activatePortal(true);
      else activatePortal(false);
    });
  });

  // small accessibility: clicking character speech toggles a friendly hint
  document.getElementById('char-speech').addEventListener('click', () => {
    const s = document.getElementById('char-speech');
    s.textContent = s.textContent.includes('teach') ? "Tip: Use drag & drop for Levels 1–2, then type in Level 3." : "Hi! I'll show you how to teach me using code 🎮";
  });

  // bind tutorial <-> map navigation via footer button
  document.getElementById('to-map').addEventListener('click', () => showScreen(1));

})();
