// script.js - Robust Tetris Game

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('tetris-canvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nextCtx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const restartBtn = document.getElementById('restart-btn');
  const highScoreListEl = document.getElementById('high-score-list');
  const viewAllBtn = document.getElementById('view-all-btn');
  const nameModal = document.getElementById('name-modal');
  const allScoresModal = document.getElementById('all-scores-modal');
  const playerNameInput = document.getElementById('player-name-input');
  const saveScoreBtn = document.getElementById('save-score-btn');
  const closeScoresBtn = document.getElementById('close-scores-btn');
  const allScoresBody = document.getElementById('all-scores-body');

  // Mobile Controls
  const moveLeftBtn = document.getElementById('move-left');
  const moveRightBtn = document.getElementById('move-right');
  const rotateBtn = document.getElementById('rotate-btn');
  const softDropBtn = document.getElementById('soft-drop');
  const hardDropBtn = document.getElementById('hard-drop');

  // Dimensions
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;
  const NEXT_BLOCK_SIZE = 25;

  // Game state
  let board = createBoard();
  let currentPiece = null;
  let nextPiece = null;
  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let score = 0;
  let level = 1;
  let linesCleared = 0;
  let gameOver = false;
  let animationId = null;
  let bag = [];

  const TETROMINOES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    O: [[4, 4], [4, 4]],
    S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
  };

  const COLORS = [
    null,
    'hsl(190, 100%, 50%)', // I
    'hsl(220, 100%, 50%)', // J
    'hsl(30, 100%, 50%)',  // L
    'hsl(50, 100%, 50%)',  // O
    'hsl(120, 100%, 45%)', // S
    'hsl(280, 80%, 60%)',  // T
    'hsl(0, 100%, 50%)'    // Z
  ];

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function createPiece(type) {
    const matrix = TETROMINOES[type];
    const col = Math.floor((COLS - matrix[0].length) / 2);
    return { matrix: matrix.map(row => [...row]), pos: { x: col, y: 0 }, type };
  }

  function getRandomType() {
    if (bag.length === 0) {
      bag = 'IJLOSTZ'.split('');
      // Fisher-Yates shuffle
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function spawnPiece() {
    if (!nextPiece) {
      nextPiece = createPiece(getRandomType());
    }
    currentPiece = nextPiece;
    nextPiece = createPiece(getRandomType());
    currentPiece.pos.y = 0;

    if (collide(board, currentPiece)) {
      gameOver = true;
      handleGameOver();
    }
    drawNext();
  }

  function drawMatrix(matrix, offset, context, scale, colorOverride = null) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = colorOverride || COLORS[value];
          const px = (x + offset.x) * scale;
          const py = (y + offset.y) * scale;
          context.fillRect(px, py, scale, scale);
          context.strokeStyle = 'rgba(255,255,255,0.15)';
          context.strokeRect(px, py, scale, scale);
        }
      });
    });
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const matrix = nextPiece.matrix;
    const offset = {
      x: (nextCanvas.width / NEXT_BLOCK_SIZE - matrix[0].length) / 2,
      y: (nextCanvas.height / NEXT_BLOCK_SIZE - matrix.length) / 2
    };
    drawMatrix(matrix, offset, nextCtx, NEXT_BLOCK_SIZE);
  }

  function getGhostPiece() {
    const ghost = {
      pos: { x: currentPiece.pos.x, y: currentPiece.pos.y },
      matrix: currentPiece.matrix
    };
    while (!collide(board, ghost)) {
      ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost;
  }

  function drawBoard() {
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          ctx.fillStyle = COLORS[value];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      });
    });
  }

  function collide(board, piece) {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0) {
          const row = board[y + o.y];
          if (!row || row[x + o.x] === undefined || row[x + o.x] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function mergePiece() {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          board[y + currentPiece.pos.y][x + currentPiece.pos.x] = value;
        }
      });
    });
  }

  function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
  }

  function playerRotate(dir) {
    const pos = currentPiece.pos.x;
    let offset = 1;
    rotate(currentPiece.matrix, dir);
    while (collide(board, currentPiece)) {
      currentPiece.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > currentPiece.matrix[0].length) {
        rotate(currentPiece.matrix, -dir);
        currentPiece.pos.x = pos;
        return;
      }
    }
  }

  function playerDrop() {
    if (gameOver) return;
    currentPiece.pos.y++;
    if (collide(board, currentPiece)) {
      currentPiece.pos.y--;
      mergePiece();
      spawnPiece();
      sweepLines();
    }
    dropCounter = 0;
  }

  function handleGameOver() {
    startBtn.innerText = 'New Game';
    startBtn.style.display = 'block';
    startBtn.disabled = false;
    pauseBtn.style.display = 'none';
    restartBtn.style.display = 'none';

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // High Score Handling
    const scores = loadScores();
    const isNewHigh = scores.length < 5 || score > scores[scores.length - 1].score;

    if (score > 0) {
      setTimeout(() => {
        nameModal.style.display = 'flex';
        playerNameInput.focus();
      }, 500);
    } else {
      alert('Game Over! Final Score: ' + score);
    }
  }

  function loadScores() {
    return JSON.parse(localStorage.getItem('tetris-scores') || '[]');
  }

  function saveScore(name) {
    const scores = loadScores();
    scores.push({
      name: name || 'Anonymous',
      score: score,
      date: new Date().toLocaleDateString()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tetris-scores', JSON.stringify(scores));
    updateHighScoreList();
  }

  function updateHighScoreList() {
    const scores = loadScores().slice(0, 5);
    highScoreListEl.innerHTML = scores.map(s => `
      <li class="score-item">
        <span>${s.name}</span>
        <strong>${s.score}</strong>
      </li>
    `).join('') || '<li class="score-item">No scores yet</li>';
  }

  function showAllScores() {
    const scores = loadScores();
    allScoresBody.innerHTML = scores.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.score}</td>
        <td>${s.date}</td>
      </tr>
    `).join('') || '<tr><td colspan="3">No history available</td></tr>';
    allScoresModal.style.display = 'flex';
  }

  function sweepLines() {
    let rowCount = 0;
    for (let y = ROWS - 1; y >= 0; --y) {
      if (board[y].every(value => value !== 0)) {
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        rowCount++;
        y++;
      }
    }
    if (rowCount > 0) {
      canvas.classList.remove('flash-white');
      void canvas.offsetWidth;
      canvas.classList.add('flash-white');

      linesCleared += rowCount;
      score += [0, 100, 300, 500, 800][rowCount] * level;
      if (linesCleared >= level * 10) {
        level++;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      }
      updateUI();
    }
  }

  function updateUI() {
    scoreEl.innerText = score;
    levelEl.innerText = level;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * BLOCK_SIZE, 0); ctx.lineTo(i * BLOCK_SIZE, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * BLOCK_SIZE); ctx.lineTo(canvas.width, i * BLOCK_SIZE); ctx.stroke();
    }

    drawBoard();

    if (currentPiece && !gameOver) {
      const ghost = getGhostPiece();
      drawMatrix(ghost.matrix, ghost.pos, ctx, BLOCK_SIZE, 'rgba(255,255,255,0.15)');
      drawMatrix(currentPiece.matrix, currentPiece.pos, ctx, BLOCK_SIZE);
    }
  }

  function update(time = 0) {
    if (gameOver) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) playerDrop();
    draw();
    animationId = requestAnimationFrame(update);
  }

  document.addEventListener('keydown', e => {
    if (gameOver || !currentPiece) return;

    // Prevent default behavior for handled keys (especially Space)
    const handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];
    if (handledKeys.includes(e.key)) {
      e.preventDefault();
    }

    if (animationId === null && e.key !== ' ') return; // Only allow Hard Drop if you want, but better to block all if paused

    if (e.key === 'ArrowLeft') {
      currentPiece.pos.x--;
      if (collide(board, currentPiece)) currentPiece.pos.x++;
    } else if (e.key === 'ArrowRight') {
      currentPiece.pos.x++;
      if (collide(board, currentPiece)) currentPiece.pos.x--;
    } else if (e.key === 'ArrowDown') {
      playerDrop();
    } else if (e.key === 'ArrowUp') {
      playerRotate(1);
    } else if (e.key === ' ') {
      if (animationId === null) return; // Don't allow hard drop while paused
      const ghost = getGhostPiece();
      currentPiece.pos.y = ghost.pos.y;
      playerDrop();
    }
  });

  function initGame() {
    board = createBoard();
    score = 0; level = 1; linesCleared = 0; gameOver = false;
    dropInterval = 1000;
    nextPiece = null;
    updateUI();
    spawnPiece();
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    pauseBtn.disabled = false;
    pauseBtn.innerText = 'Pause';
    restartBtn.style.display = 'none';
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(update);
  }

  startBtn.addEventListener('click', () => {
    initGame();
    startBtn.blur();
  });

  restartBtn.addEventListener('click', () => {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    initGame();
    restartBtn.blur();
  });

  pauseBtn.addEventListener('click', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
      pauseBtn.innerText = 'Resume';
      restartBtn.style.display = 'block';
    } else {
      pauseBtn.innerText = 'Pause';
      restartBtn.style.display = 'none';
      lastTime = performance.now();
      animationId = requestAnimationFrame(update);
    }
    pauseBtn.blur();
  });

  // Mobile Controls Event Listeners
  const handleMobileControl = (callback) => {
    if (gameOver || !currentPiece || animationId === null) return;
    callback();
  };

  moveLeftBtn.addEventListener('click', () => {
    handleMobileControl(() => {
      currentPiece.pos.x--;
      if (collide(board, currentPiece)) currentPiece.pos.x++;
    });
  });

  moveRightBtn.addEventListener('click', () => {
    handleMobileControl(() => {
      currentPiece.pos.x++;
      if (collide(board, currentPiece)) currentPiece.pos.x--;
    });
  });

  rotateBtn.addEventListener('click', () => {
    handleMobileControl(() => playerRotate(1));
  });

  softDropBtn.addEventListener('click', () => {
    handleMobileControl(() => playerDrop());
  });

  hardDropBtn.addEventListener('click', () => {
    handleMobileControl(() => {
      const ghost = getGhostPiece();
      currentPiece.pos.y = ghost.pos.y;
      playerDrop();
    });
  });

  // Prevent scrolling when touching the game (important for mobile)
  window.addEventListener('touchmove', (e) => {
    if (animationId !== null && !gameOver) {
      if (e.target.closest('.game-container')) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  saveScoreBtn.addEventListener('click', () => {
    saveScore(playerNameInput.value);
    nameModal.style.display = 'none';
    playerNameInput.value = '';
  });

  viewAllBtn.addEventListener('click', showAllScores);
  closeScoresBtn.addEventListener('click', () => {
    allScoresModal.style.display = 'none';
  });

  // Load initial high scores
  updateHighScoreList();

  // Initial draw to show the grid
  draw();
});