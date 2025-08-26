 (() => {
      const canvas = document.getElementById('tetris');
      const ctx = canvas.getContext('2d');
      const scoreElem = document.getElementById('score');
      const highscoreElem = document.getElementById('highscore');
      const stepsElem = document.getElementById('steps');
      const startBtn = document.getElementById('startBtn');
      const popup = document.getElementById('endPopup');
      const popupMessage = document.getElementById('popupMessage');

      const BLOCK_SIZE = 20, COLS = 12, ROWS = 20;
      const COLORS = [null, '#FF5E5B','#FFD93D','#6EFACC','#FF9CEE','#FFB347','#A29BFE','#7BED9F','#FF6B81','#F8EFBA'];
      const SHAPES = [[],[[1,1,1],[0,1,0]],[[0,2,2],[2,2,0]],[[3,3,0],[0,3,3]],[[4,0,0],[4,4,4]],[[0,0,5],[5,5,5]],[[6,6,6,6]],[[7,7],[7,7]],[[0,8,0],[0,8,0]],[[9,0,0,0]]];

      class Piece {
        constructor(typeId) {
          this.typeId = typeId;
          this.shape = SHAPES[typeId];
          this.pos = { x: Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2), y: 0 };
        }
        rotate = () => {
          this.shape = this.shape[0].map((val, index) =>
            this.shape.map(row => row[index]).reverse()
          );
        }
      }

      const arena = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
      const userData = JSON.parse(localStorage.getItem('gameUser')) || { level: 'medium' };
      let level = userData.level;
      let dropInterval = (level === 'hard') ? 500 : 1000;
      document.getElementById('levelLabel').textContent = 'רמה: ' + (level === 'hard' ? 'קשה' : 'בינוני');

      let currentPiece = null;
      let dropCounter = 0;
      let lastTime = 0;
      let score = 0;
      let steps = 0;
      let highscore = JSON.parse(localStorage.getItem('tetrisHighscore')) || 0;
      highscoreElem.textContent = highscore;
      let gameOver = false;

      function drawBlock(x, y, colorId) {
        ctx.fillStyle = COLORS[colorId];
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }

      function draw() {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        arena.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0) drawBlock(x, y, val);
          });
        });
        if (currentPiece) {
          currentPiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
              if (val !== 0) drawBlock(currentPiece.pos.x + x, currentPiece.pos.y + y, val);
            });
          });
        }
      }

      function collide(arena, piece) {
        const m = piece.shape, o = piece.pos;
        for (let y = 0; y < m.length; y++) {
          for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
          }
        }
        return false;
      }

      function merge(arena, piece) {
        piece.shape.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0) arena[y + piece.pos.y][x + piece.pos.x] = val;
          });
        });
      }

      function sweep() {
        let rowCount = 0;
        outer: for (let y = arena.length - 1; y >= 0; y--) {
          if (arena[y].every(val => val !== 0)) {
            arena.splice(y, 1);
            arena.unshift(new Array(COLS).fill(0));
            rowCount++;
            y++;
          }
        }
        if (rowCount > 0) {
          score += rowCount * rowCount * 10;
          scoreElem.textContent = score;
          dropInterval = Math.max(100, dropInterval - rowCount * 20);
        }
      }

      function createPiece() {
        return new Piece(Math.floor(Math.random() * (SHAPES.length - 1)) + 1);
      }

      function move(dir) {
        currentPiece.pos.x += dir;
        if (collide(arena, currentPiece)) currentPiece.pos.x -= dir;
      }

      function rotatePiece() {
        const posX = currentPiece.pos.x;
        currentPiece.rotate();
        if (collide(arena, currentPiece)) {
          currentPiece.rotate(); currentPiece.rotate(); currentPiece.rotate();
          currentPiece.pos.x = posX;
        }
      }

      function drop() {
        currentPiece.pos.y++;
        steps++;
        stepsElem.textContent = steps;
        if (collide(arena, currentPiece)) {
          currentPiece.pos.y--;
          merge(arena, currentPiece);
          sweep();
          currentPiece = createPiece();
          if (collide(arena, currentPiece)) {
            gameOver = true;
            showPopup('סיימת! ניקוד: ' + score);
            if (score > highscore) {
              localStorage.setItem('tetrisHighscore', JSON.stringify(score));
              highscore = score;
              highscoreElem.textContent = highscore;
              showPopup('שברת שיא! ניקוד חדש: ' + score);
            }
            const bestSteps = JSON.parse(localStorage.getItem('tetrisStepsHigh')) || 0;
            if (steps > bestSteps) {
              localStorage.setItem('tetrisStepsHigh', JSON.stringify(steps));
            }
            localStorage.setItem('tetrisGameData', JSON.stringify({
              score,
              steps,
              level,
              timestamp: Date.now()
            }));
          }
        }
        dropCounter = 0;
      }

      function showPopup(message) {
        popupMessage.innerText = message;
        popup.style.display = 'block';
      }

      function update(time = 0) {
        if (gameOver) return;
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) drop();
        draw();
        requestAnimationFrame(update);
      }

      window.addEventListener('keydown', e => {
        if (gameOver) return;
        if (e.key === 'ArrowLeft') move(-1);
        else if (e.key === 'ArrowRight') move(1);
        else if (e.key === 'ArrowDown') drop();
        else if (e.key === 'ArrowUp') rotatePiece();
      });

      startBtn.addEventListener('click', e => {
        e.preventDefault();
        for (let y = 0; y < arena.length; y++) arena[y].fill(0);
        score = 0;
        steps = 0;
        dropInterval = (level === 'hard') ? 500 : 1000;
        scoreElem.textContent = 0;
        stepsElem.textContent = 0;
        gameOver = false;
        currentPiece = createPiece();
        update();
      });
    })();