// ==================== GAME STATE ====================
let gameScore = 0;
let currentLevel = 0;
let gameStartTime = 0;
let timerInterval = null;
let gameTimerInterval = null;
let codesSolved = 0;
let defconLevel = 5;
let missileCount = 0;
let missiles = [];
let mapMissiles = [];
let geoData = null;
let launchTimer = null;
let autoLaunchEnabled = false;
let scene, camera, renderer, globe;
let mapCanvas, mapCtx;
let systemMessagesInterval = null;
let sdiShieldActive = false;
let sdiSatellites = [];
let sdiMeshes = [];
let intelligenceInterval = null;
let transmissionInterval = null;
let gameTimeRemaining = 360;
let citiesRemaining = 10;
let interceptCount = 0;
let shieldDuration = 0;
let shieldTimer = null;

const countries = {
  USA: { lat: 39.8283, lon: -98.5795 },
  RUSSIA: { lat: 61.5240, lon: 105.3188 },
  CHINA: { lat: 35.8617, lon: 104.1954 },
  UK: { lat: 55.3781, lon: -3.4360 },
  FRANCE: { lat: 46.2276, lon: 2.2137 },
  GERMANY: { lat: 51.1657, lon: 10.4515 },
  INDIA: { lat: 20.5937, lon: 78.9629 },
  JAPAN: { lat: 36.2048, lon: 138.2529 },
  CANADA: { lat: 56.1304, lon: -106.3468 },
  AUSTRALIA: { lat: -25.2744, lon: 133.7751 },
  UK_TRIDENT: { lat: 20.0, lon: -160.0, mobile: true },
  UK_SUB_ATLANTIC: { lat: 40.0, lon: -30.0, mobile: true }
};

const puzzles = [
  { type: 'binary', question: 'CONVERT BINARY TO DECIMAL', binary: '11010101', answer: 213 },
  { type: 'logic', question: 'SOLVE: IF A=1, B=2, C=3... WHAT IS WOPR?', answer: 72 },
  { type: 'pattern', question: 'COMPLETE SEQUENCE: 2, 4, 8, 16, ?', answer: 32 }
];

let currentPuzzle = 0;

// ==================== AUDIO SYSTEM ====================
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playDefconAlarm() {
  const duration = 2;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, audioContext.currentTime);
  osc.frequency.setValueAtTime(400, audioContext.currentTime + 0.25);
  osc.frequency.setValueAtTime(800, audioContext.currentTime + 0.5);
  osc.frequency.setValueAtTime(400, audioContext.currentTime + 0.75);
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playMissileLaunch() {
  const duration = 1.5;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + duration);
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playExplosion() {
  const duration = 0.8;
  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + duration);
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  noise.start(audioContext.currentTime);
}

function playBeep() {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.1);
}

function playError() {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'square';
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.3);
}

function playSuccess() {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, audioContext.currentTime);
  osc.frequency.setValueAtTime(700, audioContext.currentTime + 0.1);
  osc.frequency.setValueAtTime(900, audioContext.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.3);
}

function playDialTone() {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.value = 350 + Math.random() * 200;
  gain.gain.setValueAtTime(0.15, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.15);
}

function playLaser() {
  const duration = 0.2;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + duration);
  gain.gain.setValueAtTime(0.12, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

// ==================== UTILITY FUNCTIONS ====================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function addScore(points) {
  gameScore += points;
  updateAllScores();
}

function updateAllScores() {
  document.querySelectorAll('[id^="score"]').forEach(el => {
    el.textContent = gameScore;
  });
  const finalScore = document.getElementById('final-score');
  if (finalScore) finalScore.textContent = gameScore;
}

// ==================== LEVEL 1-4 ====================
function startGame() {
  playBeep();
  gameScore = 0;
  currentLevel = 1;
  showScreen('level1-screen');
  startTimer();
  updateAllScores();
  
  setTimeout(() => {
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
      });
      passwordInput.focus();
    }
  }, 100);
}

function startTimer() {
  gameStartTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    const timer = document.getElementById('timer');
    if (timer) timer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function checkPassword() {
  const input = document.getElementById('password-input').value.toUpperCase();
  const feedback = document.getElementById('level1-feedback');
  
  if (input === 'JOSHUA') {
    playSuccess();
    clearInterval(timerInterval);
    const timeBonus = Math.max(0, 1000 - Math.floor((Date.now() - gameStartTime) / 10));
    addScore(1000 + timeBonus);
    feedback.innerHTML = '<div class="success-msg">ACCESS GRANTED - PASSWORD ACCEPTED</div>';
    setTimeout(() => startLevel2(), 2000);
  } else {
    playError();
    feedback.innerHTML = '<div class="error-msg">ACCESS DENIED - INCORRECT PASSWORD</div>';
    setTimeout(() => feedback.innerHTML = '', 2000);
  }
}

function startLevel2() {
  currentLevel = 2;
  showScreen('level2-screen');
  playBeep();
  
  const numbers = [
    '555-2341', '555-8821', '555-3902', '555-7743',
    '555-1092', '555-6634', '555-4419', '555-9201',
    '555-3387', '555-WOPR', '555-5566', '555-8834'
  ];
  
  const grid = document.getElementById('dialer-grid');
  grid.innerHTML = '';
  
  numbers.forEach((num, idx) => {
    const div = document.createElement('div');
    div.className = 'phone-number';
    div.textContent = num;
    div.id = `phone-${idx}`;
    grid.appendChild(div);
  });

  let current = 0;
  const scanInterval = setInterval(() => {
    playDialTone();
    document.querySelectorAll('.phone-number').forEach(p => p.classList.remove('scanning'));
    const phone = document.getElementById(`phone-${current}`);
    if (phone) phone.classList.add('scanning');
    
    if (current === 9) {
      clearInterval(scanInterval);
      setTimeout(() => {
        playSuccess();
        phone.classList.remove('scanning');
        phone.classList.add('found');
        document.getElementById('level2-feedback').innerHTML = 
          '<div class="success-msg">CONNECTION ESTABLISHED - WOPR SYSTEM FOUND</div>';
        addScore(2000);
        setTimeout(() => startLevel3(), 2500);
      }, 500);
    }
    current++;
  }, 400);
}

function startLevel3() {
  currentLevel = 3;
  showScreen('level3-screen');
  playBeep();
}

function selectGame(game) {
  const feedback = document.getElementById('level3-feedback');
  playBeep();
  
  if (game === 'GLOBAL THERMONUCLEAR WAR') {
    playSuccess();
    feedback.innerHTML = '<div class="success-msg">LOADING GLOBAL THERMONUCLEAR WAR...</div>';
    addScore(3000);
    setTimeout(() => startLevel4(), 2000);
  } else {
    playError();
    feedback.innerHTML = '<div class="error-msg">SECURITY ALERT - INVALID SELECTION</div>';
    setTimeout(() => feedback.innerHTML = '', 2000);
  }
}

function startLevel4() {
  currentLevel = 4;
  showScreen('level4-screen');
  codesSolved = 0;
  currentPuzzle = 0;
  playBeep();
  loadPuzzle();
}

function loadPuzzle() {
  const container = document.getElementById('puzzle-container');
  const puzzle = puzzles[currentPuzzle];
  
  let html = `<div class="code-puzzle"><div class="puzzle-title">CODE ${currentPuzzle + 1}/3: ${puzzle.question}</div>`;
  if (puzzle.binary) html += `<div class="binary-display">${puzzle.binary}</div>`;
  html += `<div class="input-group"><span class="input-label">ANSWER:</span><input type="number" class="game-input" id="puzzle-input" placeholder="ENTER NUMBER"><button class="submit-btn" onclick="window.checkPuzzle()">SUBMIT</button></div></div>`;
  container.innerHTML = html;
  
  setTimeout(() => {
    const puzzleInput = document.getElementById('puzzle-input');
    if (puzzleInput) {
      puzzleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPuzzle();
      });
      puzzleInput.focus();
    }
  }, 100);
}

function checkPuzzle() {
  const input = parseInt(document.getElementById('puzzle-input').value);
  const puzzle = puzzles[currentPuzzle];
  const feedback = document.getElementById('level4-feedback');
  
  if (input === puzzle.answer) {
    playSuccess();
    codesSolved++;
    addScore(1500);
    document.getElementById('codes-solved').textContent = codesSolved;
    feedback.innerHTML = '<div class="success-msg">CODE ACCEPTED - AUTHORIZATION GRANTED</div>';
    
    if (codesSolved === 3) {
      setTimeout(() => {
        feedback.innerHTML = '<div class="success-msg">ALL CODES VERIFIED - LAUNCHING MISSILE CONTROL SYSTEM</div>';
        addScore(500);
        setTimeout(() => startLevel5(), 2500);
      }, 1500);
    } else {
      currentPuzzle++;
      setTimeout(() => {
        feedback.innerHTML = '';
        loadPuzzle();
      }, 1500);
    }
  } else {
    playError();
    feedback.innerHTML = '<div class="error-msg">INCORRECT CODE - TRY AGAIN</div>';
    setTimeout(() => feedback.innerHTML = '', 2000);
  }
}

// ==================== LEVEL 5 ====================
function startLevel5() {
  currentLevel = 5;
  showScreen('norad-screen');
  document.getElementById('connection-status').classList.add('active');
  playBeep();
  citiesRemaining = 10;
  interceptCount = 0;
  gameTimeRemaining = 360;
  
  addTerminalLine('W.O.P.R SYSTEM ONLINE');
  addTerminalLine('INITIALIZING GLOBAL THERMONUCLEAR WAR SIMULATION');
  addTerminalLine('');
  addTerminalLine('OBJECTIVE: SURVIVE 6 MINUTES');
  addTerminalLine('DEFEND USA FROM ENEMY ATTACKS');
  addTerminalLine('');
  addTerminalLine('SDI SATELLITES DETECTED IN ORBIT');
  addTerminalLine('TYPE "SDI" TO ACTIVATE DEFENSE SHIELD');
  addTerminalLine('');
  addTerminalLine('COMMANDS AVAILABLE:');
  addTerminalLine('  LAUNCH [SOURCE] [TARGET] [COUNT] - Fire missiles');
  addTerminalLine('  SDI - Activate defensive shield');
  addTerminalLine('  LIST - Show countries');
  addTerminalLine('  STATUS - System status');
  addTerminalLine('  AUTO - Enable auto-retaliation');
  addTerminalLine('  HELP - Show commands');
  addTerminalLine('');

  loadGeoData();
  initGlobe();
  initMap();
  setupTerminal();
  initSystemMessages();
  startIntelligenceReports();
  startTransmissionPopups();
  startSubmarinePatrol();
  createSDISatellites();
  startGameTimer();
  startEnemyAttacks();
  launchTimer = setTimeout(() => endGame(), 360000);
}

function startGameTimer() {
  gameTimerInterval = setInterval(() => {
    gameTimeRemaining--;
    const mins = Math.floor(gameTimeRemaining / 60).toString().padStart(2, '0');
    const secs = (gameTimeRemaining % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('game-timer');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    if (gameTimeRemaining <= 0) endGame();
    if (gameTimeRemaining === 60) {
      addTerminalLine('⚠ WARNING: 60 SECONDS REMAINING', true);
      playDefconAlarm();
    }
  }, 1000);
}

function startEnemyAttacks() {
  let baseDelay = 8000;
  const launchEnemyMissile = () => {
    if (!autoLaunchEnabled && gameTimeRemaining > 0) {
      const enemies = ['RUSSIA', 'CHINA'];
      const source = enemies[Math.floor(Math.random() * enemies.length)];
      launchMissile(source, 'USA');
      baseDelay = Math.max(3000, baseDelay - 200);
      setTimeout(launchEnemyMissile, baseDelay + Math.random() * 3000);
    }
  };
  setTimeout(launchEnemyMissile, 5000);
}

// ==================== SDI SYSTEM ====================
function createSDISatellites() {
  const positions = [
    { lat: 50, lon: -100 },
    { lat: 35, lon: -120 },
    { lat: 35, lon: -80 },
    { lat: 42, lon: -100 }
  ];
  
  positions.forEach(pos => {
    sdiSatellites.push({ lat: pos.lat, lon: pos.lon, active: true });
    const satGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const satMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6
    });
    const satMesh = new THREE.Mesh(satGeometry, satMaterial);
    scene.add(satMesh);
    sdiMeshes.push(satMesh);
  });
}

function updateSatellitePositions() {
  const radius = 2.6;
  sdiSatellites.forEach((sat, idx) => {
    if (!sat.active || !sdiMeshes[idx]) return;
    const phi = (90 - sat.lat) * (Math.PI / 180);
    const theta = (sat.lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    sdiMeshes[idx].position.set(x, y, z);
  });
}

function showSDIPopup() {
  document.getElementById('sdi-popup').style.display = 'flex';
  playBeep();
}

function closeSDIPopup() {
  document.getElementById('sdi-popup').style.display = 'none';
  playBeep();
}

function confirmSDIActivation() {
  closeSDIPopup();
  if (sdiShieldActive) {
    addTerminalLine('SDI SHIELD ALREADY ACTIVE');
    return;
  }
  if (gameScore < 5000) {
    addTerminalLine('INSUFFICIENT FUNDS - NEED 5000 POINTS', true);
    playError();
    return;
  }
  gameScore -= 5000;
  sdiShieldActive = true;
  shieldDuration = 60;
  addTerminalLine('');
  addTerminalLine('ACTIVATING SDI DEFENSIVE SHIELD...');
  addTerminalLine('SATELLITE WEAPONS ONLINE');
  addTerminalLine('INTERCEPTOR TARGETING: USA');
  addTerminalLine('DURATION: 60 SECONDS');
  playSuccess();
  document.getElementById('shield-status').textContent = 'ACTIVE (60s)';
  document.getElementById('shield-status').classList.add('active');
  updateNoradStatus();
  startShieldTimer();
}

function startShieldTimer() {
  shieldTimer = setInterval(() => {
    shieldDuration--;
    document.getElementById('shield-status').textContent = `ACTIVE (${shieldDuration}s)`;
    if (shieldDuration <= 0) {
      deactivateShield();
    } else if (shieldDuration === 10) {
      addTerminalLine('⚠ SDI SHIELD: 10 SECONDS REMAINING', true);
      playBeep();
    }
  }, 1000);
}

function deactivateShield() {
  sdiShieldActive = false;
  if (shieldTimer) {
    clearInterval(shieldTimer);
    shieldTimer = null;
  }
  document.getElementById('shield-status').textContent = 'OFFLINE';
  document.getElementById('shield-status').classList.remove('active');
  addTerminalLine('');
  addTerminalLine('SDI SHIELD DEACTIVATED');
  addTerminalLine('');
}

function showSDIStatus() {
  addTerminalLine('');
  addTerminalLine('SDI SYSTEM STATUS:');
  addTerminalLine(`SATELLITES: ${sdiSatellites.filter(s => s.active).length}/4 OPERATIONAL`);
  addTerminalLine(`SHIELD: ${sdiShieldActive ? `ACTIVE (${shieldDuration}s)` : 'OFFLINE'}`);
  if (sdiShieldActive) {
    addTerminalLine('INTERCEPT MODE: AUTOMATED');
    addTerminalLine('SUCCESS RATE: 75%');
  }
  addTerminalLine('');
}

function attemptIntercept(missile) {
  if (!sdiShieldActive) return false;
  if (missile.target.lat !== countries.USA.lat) return false;
  if (Math.random() < 0.75) {
    missile.intercepted = true;
    interceptCount++;
    addTerminalLine('[SDI] MISSILE INTERCEPTED - THREAT NEUTRALIZED');
    playLaser();
    addScore(500);
    return true;
  }
  return false;
}

// ==================== INTELLIGENCE & TRANSMISSIONS ====================
const intelligenceReports = [
  'CIA REPORT: UNUSUAL ACTIVITY AT RUSSIAN SILOS',
  'NSA INTERCEPT: ENCRYPTED TRANSMISSION FROM BEIJING',
  'SATELLITE: THERMAL SIGNATURE DETECTED',
  'MI6 ALERT: SUBMARINE MOVEMENT IN NORTH ATLANTIC',
  'NORAD: EARLY WARNING RADAR CONTACT',
  'PENTAGON: STRATEGIC FORCES ON ALERT',
  'CIA: INTERCEPTED ENEMY COMMUNICATIONS',
  'SATELLITE RECON: MISSILE DOOR ACTIVITY'
];

const transmissionMessages = [
  { from: 'KREMLIN', message: 'WE HAVE DETECTED YOUR LAUNCH PREPARATIONS. STAND DOWN IMMEDIATELY.' },
  { from: 'BEIJING COMMAND', message: 'UNAUTHORIZED MISSILE ACTIVITY DETECTED. ESCALATION PROTOCOLS INITIATED.' },
  { from: 'UK COMMAND', message: 'TRIDENT SUBMARINES ON STANDBY. AWAITING ORDERS.' },
  { from: 'FRENCH COMMAND', message: 'FORCE DE FRAPPE AT READINESS LEVEL 2.' },
  { from: 'NORAD', message: 'MULTIPLE INBOUND CONTACTS. RECOMMEND IMMEDIATE DEFENSIVE ACTION.' },
  { from: 'SAC', message: 'STRATEGIC AIR COMMAND: ALL BOMBERS AIRBORNE.' },
  { from: 'RUSSIAN FLEET', message: 'SUBMARINE LAUNCHED BALLISTIC MISSILES ARMED AND READY.' }
];

function startIntelligenceReports() {
  intelligenceInterval = setInterval(() => {
    if (Math.random() < 0.3) {
      const report = intelligenceReports[Math.floor(Math.random() * intelligenceReports.length)];
      addTerminalLine(`[INTEL] ${report}`);
    }
  }, 8000);
}

function startTransmissionPopups() {
  transmissionInterval = setInterval(() => {
    if (Math.random() < 0.2) {
      const trans = transmissionMessages[Math.floor(Math.random() * transmissionMessages.length)];
      showTransmission(trans.from, trans.message);
    }
  }, 15000);
}

function showTransmission(from, message) {
  const container = document.getElementById('transmission-container');
  const popup = document.createElement('div');
  popup.className = 'transmission-popup';
  popup.style.left = `${50 + Math.random() * 400}px`;
  popup.style.top = `${100 + Math.random() * 300}px`;
  popup.innerHTML = `
    <div class="transmission-header">⚠ INCOMING TRANSMISSION</div>
    <div class="transmission-body">
      <div style="color: var(--warn); margin-bottom: 10px;">FROM: ${from}</div>
      <div>${message}</div>
    </div>
    <button class="transmission-dismiss" onclick="this.parentElement.remove()">DISMISS</button>
  `;
  container.appendChild(popup);
  playDefconAlarm();
  setTimeout(() => {
    if (popup.parentElement) popup.remove();
  }, 10000);
}

function startSubmarinePatrol() {
  setInterval(() => {
    if (countries.UK_TRIDENT) {
      countries.UK_TRIDENT.lat += (Math.random() - 0.5) * 2;
      countries.UK_TRIDENT.lon += (Math.random() - 0.5) * 2;
      countries.UK_TRIDENT.lat = Math.max(-30, Math.min(40, countries.UK_TRIDENT.lat));
      countries.UK_TRIDENT.lon = Math.max(-180, Math.min(-120, countries.UK_TRIDENT.lon));
    }
    if (countries.UK_SUB_ATLANTIC) {
      countries.UK_SUB_ATLANTIC.lat += (Math.random() - 0.5) * 2;
      countries.UK_SUB_ATLANTIC.lon += (Math.random() - 0.5) * 2;
      countries.UK_SUB_ATLANTIC.lat = Math.max(30, Math.min(60, countries.UK_SUB_ATLANTIC.lat));
      countries.UK_SUB_ATLANTIC.lon = Math.max(-60, Math.min(0, countries.UK_SUB_ATLANTIC.lon));
    }
  }, 30000);
}

// ==================== COMMAND PROCESSING ====================
function processCommand(command) {
  if (command.startsWith('LAUNCH ')) {
    const parts = command.split(' ');
    if (parts.length >= 3) {
      const source = parts[1];
      const target = parts[2];
      const count = parseInt(parts[3]) || 1;
      if (count > 1 && count <= 10) {
        addTerminalLine(`LAUNCHING ${count} MISSILE SALVO`);
        for (let i = 0; i < count; i++) {
          setTimeout(() => launchMissile(source, target), i * 300);
        }
      } else if (count === 1) {
        launchMissile(source, target);
      } else {
        addTerminalLine('ERROR: SALVO SIZE MUST BE 1-10', true);
        playError();
      }
    } else {
      addTerminalLine('ERROR: USAGE: LAUNCH [SOURCE] [TARGET] [COUNT]', true);
      playError();
    }
  } else if (command === 'SDI') {
    showSDIPopup();
  } else if (command === 'SDI STATUS') {
    showSDIStatus();
  } else if (command === 'AUTO') {
    autoLaunchEnabled = !autoLaunchEnabled;
    addTerminalLine(`AUTO-RETALIATION ${autoLaunchEnabled ? 'ENABLED' : 'DISABLED'}`);
    if (autoLaunchEnabled) startAutoLaunch();
  } else if (command === 'LIST') {
    addTerminalLine('');
    addTerminalLine('AVAILABLE COUNTRIES:');
    Object.keys(countries).forEach(country => {
      if (!countries[country].mobile) addTerminalLine('  - ' + country);
    });
    addTerminalLine('');
    addTerminalLine('MOBILE PLATFORMS:');
    addTerminalLine('  - UK_TRIDENT (Pacific)');
    addTerminalLine('  - UK_SUB_ATLANTIC (Atlantic)');
    addTerminalLine('');
  } else if (command === 'STATUS') {
    addTerminalLine('');
    addTerminalLine('SYSTEM STATUS:');
    addTerminalLine(`DEFCON LEVEL: ${defconLevel}`);
    addTerminalLine(`TIME REMAINING: ${Math.floor(gameTimeRemaining / 60)}:${(gameTimeRemaining % 60).toString().padStart(2, '0')}`);
    addTerminalLine(`MISSILES LAUNCHED: ${missileCount}`);
    addTerminalLine(`INTERCEPTIONS: ${interceptCount}`);
    addTerminalLine(`CITIES REMAINING: ${citiesRemaining}/10`);
    addTerminalLine(`SCORE: ${gameScore}`);
    addTerminalLine(`SDI SHIELD: ${sdiShieldActive ? `ACTIVE (${shieldDuration}s)` : 'OFFLINE'}`);
    addTerminalLine('');
  } else if (command === 'HELP') {
    addTerminalLine('');
    addTerminalLine('AVAILABLE COMMANDS:');
    addTerminalLine('  LAUNCH [SOURCE] [TARGET] [COUNT] - Fire missiles');
    addTerminalLine('  SDI - Activate defense shield ($5000, 60s)');
    addTerminalLine('  SDI STATUS - Show SDI system status');
    addTerminalLine('  LIST - Show countries and platforms');
    addTerminalLine('  STATUS - System status');
    addTerminalLine('  AUTO - Toggle auto-retaliation');
    addTerminalLine('  HELP - Show commands');
    addTerminalLine('');
  } else if (command) {
    addTerminalLine('UNKNOWN COMMAND. TYPE HELP', true);
    playError();
  }
}

function startAutoLaunch() {
  if (!autoLaunchEnabled) return;
  const countryList = Object.keys(countries).filter(c => !countries[c].mobile);
  const source = countryList[Math.floor(Math.random() * countryList.length)];
  const target = countryList[Math.floor(Math.random() * countryList.length)];
  if (source !== target) launchMissile(source, target);
  if (autoLaunchEnabled && missileCount < 100) {
    setTimeout(startAutoLaunch, 3000 + Math.random() * 2000);
  }
}

function addTerminalLine(text, isAlert = false) {
  const terminalOutput = document.getElementById('terminal-output');
  const line = document.createElement('div');
  line.className = 'terminal-line' + (isAlert ? ' alert' : '');
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function loadGeoData() {
  fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(response => response.json())
    .then(data => { geoData = data; })
    .catch(error => { console.log('GeoJSON load failed'); });
}

function setupTerminal() {
  const commandInput = document.getElementById('command-input');
  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.value.trim().toUpperCase();
      addTerminalLine('> ' + command);
      commandInput.value = '';
      playBeep();
      processCommand(command);
    }
  });
  commandInput.focus();
}

function launchMissile(source, target) {
  if (!countries[source] || !countries[target]) {
    addTerminalLine('ERROR: INVALID COUNTRY CODE', true);
    playError();
    return;
  }
  missileCount++;
  playMissileLaunch();
  const sourceLoc = countries[source];
  const targetLoc = countries[target];
  const isEnemyAttack = target === 'USA' && (source === 'RUSSIA' || source === 'CHINA');
  if (!isEnemyAttack) addScore(500);
  addTerminalLine('');
  addTerminalLine('█ MISSILE LAUNCH DETECTED █', true);
  addTerminalLine(`SOURCE: ${source}`);
  addTerminalLine(`TARGET: ${target}`);
  addTerminalLine(`ETA: ${Math.floor(Math.random() * 10 + 15)} MINUTES`);
  addTerminalLine('');
  const missile = {
    source: { lat: sourceLoc.lat, lon: sourceLoc.lon },
    target: { lat: targetLoc.lat, lon: targetLoc.lon },
    progress: 0,
    active: true,
    intercepted: false,
    isEnemyAttack: isEnemyAttack
  };
  if (attemptIntercept(missile)) missile.intercepted = true;
  missiles.push(missile);
  const mapCanvas = document.getElementById('mapCanvas');
  const sourceX = ((sourceLoc.lon + 180) / 360) * mapCanvas.width;
  const sourceY = ((90 - sourceLoc.lat) / 180) * mapCanvas.height;
  const targetX = ((targetLoc.lon + 180) / 360) * mapCanvas.width;
  const targetY = ((90 - targetLoc.lat) / 180) * mapCanvas.height;
  mapMissiles.push({
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
    progress: 0,
    active: true,
    explosion: null,
    intercepted: missile.intercepted,
    isEnemyAttack: isEnemyAttack
  });
  updateDefcon();
  updateNoradStatus();
  if (citiesRemaining <= 0) endGame();
}

function updateDefcon() {
  const oldDefcon = defconLevel;
  if (missileCount > 30 && defconLevel > 1) {
    defconLevel = 1;
    addTerminalLine('!!! DEFCON 1 - MAXIMUM READINESS !!!', true);
  } else if (missileCount > 15 && defconLevel > 2) {
    defconLevel = 2;
    addTerminalLine('!! DEFCON 2 - ARMED FORCES READY !!', true);
  } else if (missileCount > 5 && defconLevel > 3) {
    defconLevel = 3;
    addTerminalLine('! DEFCON 3 - INCREASE READINESS !', true);
  }
  if (oldDefcon !== defconLevel) playDefconAlarm();
}

function updateNoradStatus() {
  document.getElementById('track-count').textContent = missileCount;
  document.getElementById('defcon').textContent = defconLevel;
  document.getElementById('defcon').className = 'defcon-' + defconLevel;
  document.getElementById('final-score').textContent = gameScore;
  document.getElementById('cities-remaining').textContent = `${citiesRemaining}/10`;
}

function endGame() {
  if (launchTimer) clearTimeout(launchTimer);
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  if (intelligenceInterval) clearInterval(intelligenceInterval);
  if (transmissionInterval) clearInterval(transmissionInterval);
  if (shieldTimer) clearInterval(shieldTimer);
  autoLaunchEnabled = false;
  playDefconAlarm();
  setTimeout(() => {
    document.getElementById('end-score').textContent = gameScore;
    document.getElementById('end-missiles').textContent = missileCount;
    document.getElementById('end-intercepts').textContent = interceptCount;
    document.getElementById('end-cities').textContent = 10 - citiesRemaining;
    showScreen('end-screen');
  }, 2000);
}

// ==================== THREE.JS GLOBE ====================
function initGlobe() {
  const globeCanvas = document.getElementById('globeCanvas');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: globeCanvas, antialias: true });
  renderer.setClearColor(0x000000);
  const radius = 2;
  const segments = 12;
  const sphereGeometry = new THREE.SphereGeometry(radius, segments, segments);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  globe = new THREE.Mesh(sphereGeometry, wireframeMaterial);
  scene.add(globe);
  Object.entries(countries).forEach(([name, coords]) => {
    const phi = (90 - coords.lat) * (Math.PI / 180);
    const theta = (coords.lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const markerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, z);
    scene.add(marker);
  });
  camera.position.z = 5;
  resizeGlobe();
  animateGlobe();
}

function resizeGlobe() {
  const globeCanvas = document.getElementById('globeCanvas');
  const width = globeCanvas.clientWidth;
  const height = globeCanvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function createGlobeMissileArc(source, target, progress) {
  const phi1 = (90 - source.lat) * (Math.PI / 180);
  const theta1 = (source.lon + 180) * (Math.PI / 180);
  const phi2 = (90 - target.lat) * (Math.PI / 180);
  const theta2 = (target.lon + 180) * (Math.PI / 180);
  const radius = 2;
  const points = [];
  for (let i = 0; i <= progress * 50; i++) {
    const t = i / 50;
    const phi = phi1 + (phi2 - phi1) * t;
    const theta = theta1 + (theta2 - theta1) * t;
    const altitude = Math.sin(t * Math.PI) * 1;
    const x = -(radius + altitude) * Math.sin(phi) * Math.cos(theta);
    const y = (radius + altitude) * Math.cos(phi);
    const z = (radius + altitude) * Math.sin(phi) * Math.sin(theta);
    points.push(new THREE.Vector3(x, y, z));
  }
  if (points.length > 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geometry, material);
  }
  return null;
}

function animateGlobe() {
  requestAnimationFrame(animateGlobe);
  if (!globe) return;
  globe.rotation.y += 0.003;
  globe.rotation.x += 0.001;
  updateSatellitePositions();
  scene.children = scene.children.filter(child => 
    child === globe || 
    (child.geometry instanceof THREE.SphereGeometry && child.geometry.parameters.radius < 0.1) ||
    sdiMeshes.includes(child)
  );
  missiles.forEach(missile => {
    if (missile.active && !missile.intercepted) {
      missile.progress += 0.005;
      if (missile.progress >= 1) {
        missile.active = false;
        if (missile.isEnemyAttack) {
          citiesRemaining--;
          addTerminalLine(`⚠ CITY DESTROYED - ${citiesRemaining} REMAINING`, true);
          playExplosion();
          updateNoradStatus();
        }
      } else {
        const arc = createGlobeMissileArc(missile.source, missile.target, missile.progress);
        if (arc) scene.add(arc);
        if (sdiShieldActive && missile.progress > 0.3 && missile.progress < 0.8 && missile.isEnemyAttack && !missile.intercepted) {
          if (Math.random() < 0.05) {
            const nearestSat = sdiMeshes[Math.floor(Math.random() * sdiMeshes.length)];
            if (nearestSat && arc.geometry.attributes.position.count > 0) {
              const missilePos = arc.geometry.attributes.position;
              const lastPoint = new THREE.Vector3(
                missilePos.getX(missilePos.count - 1),
                missilePos.getY(missilePos.count - 1),
                missilePos.getZ(missilePos.count - 1)
              );
              const laserPoints = [nearestSat.position, lastPoint];
              const laserGeom = new THREE.BufferGeometry().setFromPoints(laserPoints);
              const laserMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
              const laser = new THREE.Line(laserGeom, laserMat);
              scene.add(laser);
            }
          }
        }
      }
    }
  });
  renderer.render(scene, camera);
}

// ==================== 2D MAP ====================
function initMap() {
  mapCanvas = document.getElementById('mapCanvas');
  mapCtx = mapCanvas.getContext('2d');
  resizeMap();
  animateMap();
}

function resizeMap() {
  mapCanvas.width = mapCanvas.clientWidth;
  mapCanvas.height = mapCanvas.clientHeight;
}

function projectToCanvas(lon, lat) {
  const x = ((lon + 180) / 360) * mapCanvas.width;
  const y = ((90 - lat) / 180) * mapCanvas.height;
  return { x, y };
}

function drawWorldMap() {
  if (!geoData) return;
  mapCtx.strokeStyle = '#33ff33';
  mapCtx.lineWidth = 1;
  mapCtx.shadowBlur = 5;
  mapCtx.shadowColor = '#33ff33';
  geoData.features.forEach(feature => {
    const geometry = feature.geometry;
    if (geometry.type === 'Polygon') {
      drawPolygon(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => drawPolygon(polygon));
    }
  });
}

function drawPolygon(coordinates) {
  coordinates.forEach(ring => {
    mapCtx.beginPath();
    ring.forEach((coord, index) => {
      const point = projectToCanvas(coord[0], coord[1]);
      if (index === 0) {
        mapCtx.moveTo(point.x, point.y);
      } else {
        mapCtx.lineTo(point.x, point.y);
      }
    });
    mapCtx.closePath();
    mapCtx.stroke();
  });
}

function drawCountryMarkers() {
  mapCtx.fillStyle = '#ff0000';
  mapCtx.shadowBlur = 8;
  mapCtx.shadowColor = '#ff0000';
  Object.entries(countries).forEach(([name, coords]) => {
    const point = projectToCanvas(coords.lon, coords.lat);
    mapCtx.beginPath();
    mapCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = '#33ff33';
    mapCtx.shadowBlur = 5;
    mapCtx.shadowColor = '#33ff33';
    mapCtx.font = '14px VT323';
    mapCtx.fillText(name, point.x + 8, point.y + 4);
    mapCtx.fillStyle = '#ff0000';
    mapCtx.shadowBlur = 8;
    mapCtx.shadowColor = '#ff0000';
  });
}

function drawMissileTrajectory(source, target, progress, intercepted) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const arcHeight = distance * 0.3;
  const color = intercepted ? '#ffff00' : '#ff0000';
  mapCtx.strokeStyle = color;
  mapCtx.lineWidth = 2;
  mapCtx.shadowBlur = 10;
  mapCtx.shadowColor = color;
  mapCtx.setLineDash([5, 5]);
  mapCtx.beginPath();
  mapCtx.moveTo(source.x, source.y);
  for (let i = 0; i <= progress; i += 0.02) {
    const x = source.x + dx * i;
    const y = source.y + dy * i - Math.sin(i * Math.PI) * arcHeight;
    mapCtx.lineTo(x, y);
  }
  mapCtx.stroke();
  mapCtx.setLineDash([]);
  if (progress < 1) {
    const currentX = source.x + dx * progress;
    const currentY = source.y + dy * progress - Math.sin(progress * Math.PI) * arcHeight;
    mapCtx.fillStyle = '#ffff00';
    mapCtx.shadowBlur = 15;
    mapCtx.shadowColor = '#ffff00';
    mapCtx.beginPath();
    mapCtx.arc(currentX, currentY, 3, 0, Math.PI * 2);
    mapCtx.fill();
  }
}

function drawExplosion(x, y, frame) {
  const maxFrames = 30;
  const radius = (frame / maxFrames) * 50;
  const opacity = 1 - (frame / maxFrames);
  mapCtx.shadowBlur = 20;
  mapCtx.shadowColor = '#ff0000';
  mapCtx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
  mapCtx.lineWidth = 3;
  mapCtx.beginPath();
  mapCtx.arc(x, y, radius, 0, Math.PI * 2);
  mapCtx.stroke();
  mapCtx.strokeStyle = `rgba(255, 255, 0, ${opacity})`;
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
  mapCtx.stroke();
  mapCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  mapCtx.beginPath();
  mapCtx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
  mapCtx.fill();
}

function animateMap() {
  requestAnimationFrame(animateMap);
  if (!mapCtx) return;
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  drawWorldMap();
  drawCountryMarkers();
  mapMissiles.forEach(missile => {
    if (missile.active) {
      missile.progress += 0.008;
      if (missile.progress >= 1 || missile.intercepted) {
        missile.active = false;
        if (!missile.intercepted) {
          missile.explosion = { frame: 0 };
          playExplosion();
          if (!missile.isEnemyAttack) addScore(100);
          updateNoradStatus();
        }
      } else {
        drawMissileTrajectory(missile.source, missile.target, missile.progress, missile.intercepted);
      }
    } else if (missile.explosion && missile.explosion.frame < 30) {
      drawExplosion(missile.target.x, missile.target.y, missile.explosion.frame);
      missile.explosion.frame++;
    }
  });
}

const systemMessages = [
  'TRACKING SATELLITE PASS OVER SECTOR 7',
  'RADAR CONTACT: UNKNOWN AIRCRAFT',
  'COMMUNICATIONS LINK ESTABLISHED',
  'EARLY WARNING SYSTEM: NOMINAL',
  'STRATEGIC AIR COMMAND: READY',
  'MISSILE SILO STATUS: ARMED',
  'SUBMARINE PATROL: ACTIVE',
  'CRYPTOGRAPHIC KEY ROTATION COMPLETE',
  'WEATHER SATELLITE DATA RECEIVED',
  'SECURE CHANNEL ENCRYPTED'
];

function initSystemMessages() {
  systemMessagesInterval = setInterval(() => {
    if (Math.random() < 0.4) {
      const msg = systemMessages[Math.floor(Math.random() * systemMessages.length)];
      addTerminalLine(`[SYSTEM] ${msg}`);
    }
  }, 5000);
}

function restartGame() {
  if (timerInterval) clearInterval(timerInterval);
  if (launchTimer) clearTimeout(launchTimer);
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  if (systemMessagesInterval) clearInterval(systemMessagesInterval);
  if (intelligenceInterval) clearInterval(intelligenceInterval);
  if (transmissionInterval) clearInterval(transmissionInterval);
  if (shieldTimer) clearInterval(shieldTimer);
  gameScore = 0;
  currentLevel = 0;
  gameStartTime = 0;
  codesSolved = 0;
  defconLevel = 5;
  missileCount = 0;
  missiles = [];
  mapMissiles = [];
  autoLaunchEnabled = false;
  sdiShieldActive = false;
  sdiSatellites = [];
  gameTimeRemaining = 360;
  citiesRemaining = 10;
  interceptCount = 0;
  shieldDuration = 0;
  if (scene) {
    scene.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    scene.children = [];
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  sdiMeshes.forEach(mesh => {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  });
  sdiMeshes = [];
  scene = null;
  camera = null;
  globe = null;
  document.getElementById('transmission-container').innerHTML = '';
  updateAllScores();
  showScreen('title-screen');
  playBeep();
}

window.addEventListener('resize', () => {
  if (renderer) resizeGlobe();
  if (mapCanvas) resizeMap();
});

window.startGame = startGame;
window.checkPassword = checkPassword;
window.selectGame = selectGame;
window.checkPuzzle = checkPuzzle;
window.restartGame = restartGame;
window.showSDIPopup = showSDIPopup;
window.closeSDIPopup = closeSDIPopup;
window.confirmSDIActivation = confirmSDIActivation;

document.addEventListener('DOMContentLoaded', () => {
  playBeep();
});
