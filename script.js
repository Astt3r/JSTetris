// ──────────────────────────────────────────────────────────────
// TETRIS JAVASCRIPT – script.js (versión corregida)
// ──────────────────────────────────────────────────────────────

// ─── CANVAS PRINCIPAL ─────────────────────────────────────────
const canvas = document.getElementById('Tetris');
const ctx = canvas.getContext('2d');

// ─── CANVAS “PRÓXIMA PIEZA” ───────────────────────────────────
const nextPieceCanvas = document.getElementById('nextpiececanvas'); // ← id en minúsculas
const nextCtx = nextPieceCanvas.getContext('2d');

// ─── CONSTANTES DEL TABLERO ───────────────────────────────────
const BOARD_WIDTH      = 10;
const BOARD_HEIGHT     = 20;
const CELL_SIZE        = 30;
const NEXT_CELL_SIZE   = 20;            // celdas más pequeñas para el preview

// ─── PIEZAS Y COLORES ─────────────────────────────────────────
const PIECES = [
  [[1, 1, 1, 1]],                             // I
  [[1, 1], [1, 1]],                           // O
  [[0, 1, 0], [1, 1, 1]],                     // T
  [[0, 1, 1], [1, 1, 0]],                     // S
  [[1, 1, 0], [0, 1, 1]],                     // Z
  [[1, 0, 0], [1, 1, 1]],                     // J
  [[0, 0, 1], [1, 1, 1]]                      // L
];
const PIECE_COLORS = ['#00ffff', '#ffff00', '#800080', '#00ff00', '#ff0000', '#0000ff', '#ffa500'];

// ─── ESTADO GENERAL ───────────────────────────────────────────
let board        = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
let currentPiece = null;
let nextPiece    = null;

let dropTimer    = 0;
let dropInterval = 500;
let lastTime     = 0;

let gameOver     = false;

// ──────────────────────────────────────────────────────────────
// FUNCIONES DE DIBUJO
// ──────────────────────────────────────────────────────────────

// Dibuja una celda en cualquier canvas
function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);

  context.strokeStyle = '#333';
  context.strokeRect(x * size, y * size, size, size);
}

// Dibuja el tablero completo
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    for (let col = 0; col < BOARD_WIDTH; col++) {
      const color = board[row][col] === 0 ? '#111' : '#00ff88';
      drawCell(ctx, col, row, color, CELL_SIZE);
    }
  }
}

// Dibuja la pieza activa
function drawPiece() {
  if (!currentPiece) return;
  const { shape, x, y, color } = currentPiece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        drawCell(ctx, x + col, y + row, color, CELL_SIZE);
      }
    }
  }
}

// Dibuja la próxima pieza en su canvas
function drawNextPiece() {
  if (!nextPiece) return;
  nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

  const { shape, color } = nextPiece;
  const pieceW = shape[0].length * NEXT_CELL_SIZE;
  const pieceH = shape.length  * NEXT_CELL_SIZE;
  const offsetX = ((nextPieceCanvas.width  - pieceW) / 2) / NEXT_CELL_SIZE;
  const offsetY = ((nextPieceCanvas.height - pieceH) / 2) / NEXT_CELL_SIZE;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        drawCell(nextCtx, offsetX + col, offsetY + row, color, NEXT_CELL_SIZE);
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
// LÓGICA DEL JUEGO
// ──────────────────────────────────────────────────────────────

// Genera una nueva pieza aleatoria
function createNewPiece() {
  const idx = Math.floor(Math.random() * PIECES.length);
  return {
    x: 4,
    y: 0,
    shape: PIECES[idx],
    color: PIECE_COLORS[idx],
    index: idx
  };
}

// Valida posición en el tablero
function isValidPosition(piece, newX, newY) {
  const { shape } = piece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        const boardX = newX + col;
        const boardY = newY + row;
        if (
          boardX < 0 || boardX >= BOARD_WIDTH || 
          boardY >= BOARD_HEIGHT || 
          (boardY >= 0 && board[boardY][boardX] !== 0)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

// Bloquea la pieza en el tablero y gestiona líneas
function lockPiece() {
  const { shape, x, y } = currentPiece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 1) {
        board[y + row][x + col] = 1;
      }
    }
  }

  const linesCleared = clearLines();
  if (linesCleared > 0) updateScore(linesCleared);

  // Cargar pieza siguiente
  currentPiece = nextPiece;
  currentPiece.x = 4;
  currentPiece.y = 0;
  nextPiece = createNewPiece();

  // ¿Game over?
  if (isGameOver()) {
    gameOver = true;
    showGameOverScreen();
  }
}

// Limpia líneas completas
function clearLines() {
  let cleared = 0;
  for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
    if (board[row].every(cell => cell !== 0)) {
      board.splice(row, 1);
      board.unshift(Array(BOARD_WIDTH).fill(0));
      cleared++;
      row++; // revisar misma fila otra vez
    }
  }
  return cleared;
}

// Comprueba si la pieza toca la parte superior
function isGameOver() {
  return !isValidPosition(currentPiece, currentPiece.x, currentPiece.y);
}

// Rotación 90° horaria
function rotatePiece(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows));
  for (let col = 0; col < cols; col++) {
    for (let row = rows - 1; row >= 0; row--) {
      rotated[col][rows - 1 - row] = shape[row][col];
    }
  }
  return rotated;
}

// ──────────────────────────────────────────────────────────────
// CONTROL DE ENTRADAS
// ──────────────────────────────────────────────────────────────
function handleKeyPress(e) {
  if (gameOver || !currentPiece) return;

  switch (e.code) {
    case 'ArrowLeft':
      if (isValidPosition(currentPiece, currentPiece.x - 1, currentPiece.y))
        currentPiece.x--;
      break;

    case 'ArrowRight':
      if (isValidPosition(currentPiece, currentPiece.x + 1, currentPiece.y))
        currentPiece.x++;
      break;

    case 'ArrowDown':
      dropPiece();
      break;

    case 'ArrowUp':
    case 'Space':
      const rotated = rotatePiece(currentPiece.shape);
      if (isValidPosition({ ...currentPiece, shape: rotated }, currentPiece.x, currentPiece.y))
        currentPiece.shape = rotated;
      break;

    case 'KeyW': // Hard‑drop
      hardDrop();
      break;
  }
}

// ──────────────────────────────────────────────────────────────
// ACCIONES DE PIEZA
// ──────────────────────────────────────────────────────────────
function dropPiece() {
  if (isValidPosition(currentPiece, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  } else {
    lockPiece();
  }
}

function hardDrop() {
  while (isValidPosition(currentPiece, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  }
  lockPiece();
}

// ──────────────────────────────────────────────────────────────
// PUNTUACIÓN Y UI
// ──────────────────────────────────────────────────────────────
function updateScore(lines) {
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = parseInt(scoreEl.textContent, 10) + lines * 100;
}

function showGameOverScreen() {
  document.getElementById('finalScore').textContent = document.getElementById('score').textContent;
  document.getElementById('gameoverscreen').style.display = 'block';
}

function resetGame() {
  board.forEach(row => row.fill(0));
  gameOver   = false;
  dropTimer  = 0;
  document.getElementById('score').textContent = '0';
  document.getElementById('gameoverscreen').style.display = 'none';

  currentPiece = createNewPiece();
  nextPiece    = createNewPiece();
  requestAnimationFrame(gameLoop);
}

// ──────────────────────────────────────────────────────────────
// BUCLE PRINCIPAL
// ──────────────────────────────────────────────────────────────
function gameLoop(time = 0) {
  if (gameOver) return;

  const delta = time - lastTime;
  lastTime = time;
  dropTimer += delta;

  if (dropTimer >= dropInterval) {
    dropPiece();
    dropTimer = 0;
  }

  drawBoard();
  drawPiece();
  drawNextPiece();
  requestAnimationFrame(gameLoop);
}

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────
function initGame() {
  currentPiece = createNewPiece();
  nextPiece    = createNewPiece();

  document.addEventListener('keydown', handleKeyPress);
  document.getElementById('restartButton')?.addEventListener('click', resetGame);

  requestAnimationFrame(gameLoop);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', initGame)
  : initGame();
