
document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const loadingScreen = document.getElementById('loading-screen');
    const nameScreen = document.getElementById('name-screen');
    const nameForm = document.getElementById('name-form');
    const nameInput = document.getElementById('name-input');
    const gameContainer = document.getElementById('game-container');
    const svgBiased = document.getElementById('svg-biased');
    const modifiedImageWrapper = document.getElementById('modified-image-wrapper');
    const errorsFoundSpan = document.getElementById('errors-found-count');
    const timerSpan = document.getElementById('timer');
    const hintBtn = document.getElementById('hint-btn');
    const hintsLeftSpan = document.getElementById('hints-left');
    const infoBtn = document.getElementById('info-btn');
    const exitBtn = document.getElementById('exit-btn');
    
    const victoryModal = document.getElementById('victory-modal');
    const infoModal = document.getElementById('info-modal');
    const closeInfoBtn = document.getElementById('close-info-btn');
    
    const playerNameVictorySpan = document.getElementById('player-name-victory');
    const finalTimeSpan = document.getElementById('final-time');
    const playAgainBtn = document.getElementById('play-again-btn');

 
    const TOTAL_ERRORS = 7;
    const TOTAL_HINTS = 3;
    const HINT_DURATION = 1500;

    let errorsFound = new Set();
    let hintsLeft, timerInterval, seconds, gameActive, playerName;
    let sounds = {};
    let audioReady = false;

    function setupSounds() {
        sounds.correct = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
        sounds.wrong = new Tone.Synth({ oscillator: { type: 'square', frequency: 'C3' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination();
        sounds.win = new Tone.PolySynth(Tone.Synth, { envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 0.5 } }).toDestination();
        sounds.click = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination();
        audioReady = true;
    }
    function celebrate() {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 101 };
        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        nameScreen.classList.remove('hidden');
        nameInput.focus();
    }, 1500);

    nameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        playerName = nameInput.value.trim();
        if (playerName) {
            if (!audioReady) {
                await Tone.start();
                setupSounds();
            }
            playerNameVictorySpan.textContent = playerName;
            nameScreen.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            startGame();
        }
    });
    
    function exitGame() {
        if (audioReady) sounds.click.triggerAttackRelease("C2", "8n");
        stopTimer();
        gameActive = false;
        gameContainer.classList.add('hidden');
        nameScreen.classList.remove('hidden');
        nameInput.value = ''; // Limpa o campo de nome
        nameInput.focus();
    }

    // --- FUNÇÕES DO JOGO ---
    function formatTime(totalSeconds) {
        const min = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const sec = (totalSeconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            seconds++;
            timerSpan.textContent = formatTime(seconds);
        }, 1000);
    }

    function stopTimer() { clearInterval(timerInterval); }

    function startGame() {
        errorsFound.clear();
        hintsLeft = TOTAL_HINTS;
        seconds = 0;
        gameActive = true;

        timerSpan.textContent = "00:00";
        errorsFoundSpan.textContent = "0";
        hintsLeftSpan.textContent = hintsLeft;
        hintBtn.disabled = false;

        document.querySelectorAll('.error-circle').forEach(c => c.remove());
        document.querySelectorAll('.error-hitbox').forEach(hb => hb.classList.remove('found'));
        victoryModal.classList.add('hidden');
        
        stopTimer();
        startTimer();
    }

    function checkWin() {
        if (errorsFound.size === TOTAL_ERRORS) {
            gameActive = false;
            stopTimer();
            if (audioReady) sounds.win.triggerAttackRelease(["C4", "E4", "G4"], "0.5s");
            finalTimeSpan.textContent = formatTime(seconds);
            victoryModal.classList.remove('hidden');
            celebrate();
        }
    }

    function markErrorAsFound(errorId) {
        if (errorsFound.has(errorId) || !gameActive) return;

        errorsFound.add(errorId);
        if (audioReady) sounds.correct.triggerAttackRelease("G4", "8n");
        errorsFoundSpan.textContent = errorsFound.size;

        const hitbox = document.querySelector(`.error-hitbox[data-error-id='${errorId}']`);
        hitbox.classList.add('found');
        
        const bbox = hitbox.getBBox();
        const svgRect = svgBiased.getBoundingClientRect();
        const viewBox = svgBiased.viewBox.baseVal;

        const circle = document.createElement('div');
        circle.className = 'error-circle';
        circle.style.left = `${((bbox.x + bbox.width / 2) / viewBox.width) * 100}%`;
        circle.style.top = `${((bbox.y + bbox.height / 2) / viewBox.height) * 100}%`;
        const size = Math.max(bbox.width, bbox.height) / viewBox.width * svgRect.width * 1.2;
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        modifiedImageWrapper.appendChild(circle);
        
        setTimeout(() => circle.classList.add('found'), 10);
        checkWin();
    }

    function showHint() {
        if (hintsLeft <= 0 || !gameActive) return;
        if (audioReady) sounds.click.triggerAttackRelease("C3", "8n");

        let unfoundErrorId = null;
        for (let i = 1; i <= TOTAL_ERRORS; i++) {
            if (!errorsFound.has(i.toString())) {
                unfoundErrorId = i.toString();
                break;
            }
        }

        if (unfoundErrorId) {
            hintsLeft--;
            hintsLeftSpan.textContent = hintsLeft;
            if (hintsLeft === 0) hintBtn.disabled = true;
            markErrorAsFound(unfoundErrorId);
        }
    }

    // --- EVENT LISTENERS ---
    svgBiased.addEventListener('click', (event) => {
        if (!gameActive) return;
        const target = event.target;
        if (target.classList.contains('error-hitbox')) {
            const errorId = target.getAttribute('data-error-id');
            markErrorAsFound(errorId);
        } else {
            if (audioReady) sounds.wrong.triggerAttackRelease("C3", "8n");
            modifiedImageWrapper.classList.add('wrong-click-feedback');
            setTimeout(() => modifiedImageWrapper.classList.remove('wrong-click-feedback'), 400);
        }
    });

    hintBtn.addEventListener('click', showHint);
    playAgainBtn.addEventListener('click', startGame);
    exitBtn.addEventListener('click', exitGame);
    
    infoBtn.addEventListener('click', () => {
        if (audioReady) sounds.click.triggerAttackRelease("C4", "8n");
        infoModal.classList.remove('hidden');
    });
    
    closeInfoBtn.addEventListener('click', () => {
        if (audioReady) sounds.click.triggerAttackRelease("C3", "8n");
        infoModal.classList.add('hidden');
    });
});
