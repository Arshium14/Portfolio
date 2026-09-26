(function () {
  "use strict";

  var taskbar = document.getElementById("taskbar");
  var tasklist = document.getElementById("tasklist");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function syncTaskbar() {
    taskbar.hidden = tasklist.children.length === 0;
  }

  document.querySelectorAll(".window").forEach(function (win) {
    var controls = win.querySelectorAll(".ctrl");
    var minBtn = controls[0];
    var maxBtn = controls[1];
    var closeBtn = controls[2];

    minBtn.addEventListener("click", function () {
      var collapsed = win.classList.toggle("is-min");
      minBtn.setAttribute("aria-expanded", String(!collapsed));
    });

    maxBtn.addEventListener("click", function () {
      var maxed = win.classList.toggle("is-max");
      maxBtn.setAttribute("aria-pressed", String(maxed));
    });

    closeBtn.addEventListener("click", function () {
      win.hidden = true;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "task-chip";
      chip.textContent = win.dataset.title;
      chip.setAttribute("aria-label", "Restore " + win.dataset.title + " window");
      chip.addEventListener("click", function () {
        win.hidden = false;
        chip.remove();
        syncTaskbar();
        win.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "start"
        });
      });
      tasklist.appendChild(chip);
      syncTaskbar();
    });
  });

  var copyBtn = document.querySelector("[data-copy]");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var handle = copyBtn.dataset.copy;
      var original = copyBtn.dataset.label || copyBtn.textContent;
      copyBtn.dataset.label = original;

      function flash() {
        copyBtn.textContent = "copied!";
        window.setTimeout(function () {
          copyBtn.textContent = original;
        }, 1200);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(handle).then(flash, flash);
      } else {
        flash();
      }
    });
  }

  var heatGrid = document.querySelector("[data-heat-grid]");
  if (heatGrid) {
    var heatTotal = document.querySelector("[data-heat-total]");
    var heatMonths = document.querySelector("[data-heat-months]");
    var HEAT_USER = "arshium14";
    var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    function renderHeat(data) {
      var days = data.contributions;
      var weeks = [];
      var i;
      for (i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      var labels = [];
      weeks.forEach(function (week) {
        var month = new Date(week[0].date + "T00:00:00").getMonth();
        var last = labels[labels.length - 1];
        if (last && last.month === month) {
          last.weeks += 1;
        } else {
          labels.push({ month: month, weeks: 1 });
        }
      });

      labels.forEach(function (label) {
        var span = document.createElement("span");
        span.className = "heat-month";
        span.textContent = MONTHS[label.month];
        span.style.flex = "0 0 calc(var(--heat-col) * " + label.weeks + " - var(--heat-gap))";
        if (label.weeks < 2) {
          span.style.visibility = "hidden";
        }
        heatMonths.appendChild(span);
      });

      weeks.forEach(function (week) {
        var col = document.createElement("div");
        col.className = "heat-week";
        for (var d = 0; d < 7; d += 1) {
          var cell = document.createElement("span");
          if (week[d]) {
            cell.className = "heat-cell lv" + week[d].level;
            cell.title = week[d].count + (week[d].count === 1 ? " commit on " : " commits on ") + week[d].date;
          } else {
            cell.className = "heat-cell blank";
          }
          col.appendChild(cell);
        }
        heatGrid.appendChild(col);
      });

      heatTotal.textContent = data.total.lastYear + " contributions in the last year";
    }

      fetch("https://github-contributions-api.jogruber.de/v4/" + HEAT_USER + "?y=last")
        .then(function (res) {
          if (!res.ok) {
            throw new Error("contributions api: http " + res.status);
          }
          return res.json();
        })
        .then(renderHeat)
        .catch(function () {
          heatGrid.classList.add("heat-error");
          heatGrid.textContent = "heatmap offline — see github.com/" + HEAT_USER + " for the live grid";
          heatTotal.textContent = "";
        });
    }

    /* ---------- Tetris Game ---------- */
    var tetrisCanvas = document.getElementById("tetris-canvas");
    if (tetrisCanvas) {
      var nextCanvas = document.getElementById("tetris-next-canvas");
      var scoreEl = document.getElementById("tetris-score");
      var linesEl = document.getElementById("tetris-lines");
      var levelEl = document.getElementById("tetris-level");
      var startBtn = document.getElementById("tetris-start-btn");
      var pauseBtn = document.getElementById("tetris-pause-btn");
      var overlay = document.getElementById("tetris-overlay");
      var overlayMsg = document.getElementById("tetris-overlay-msg");

      var ctx = tetrisCanvas.getContext("2d");
      var nextCtx = nextCanvas ? nextCanvas.getContext("2d") : null;

      var COLS = 10;
      var ROWS = 20;
      var BLOCK_SIZE = 20;

      var PIECE_COLORS = [
        null,
        "#7FCDE3", // cyan / I
        "#F4F6F7", // paper / O
        "#45B0CC", // deep teal / T
        "#A5E6F7", // light sky / S
        "#5CB8D1", // ocean cyan / Z
        "#2F8FA7", // dark cyan / J
        "#BEE9F6"  // pastel sky / L
      ];

      var PIECES = [
        [],
        [[1, 1, 1, 1]],
        [[2, 2], [2, 2]],
        [[0, 3, 0], [3, 3, 3]],
        [[0, 4, 4], [4, 4, 0]],
        [[5, 5, 0], [0, 5, 5]],
        [[6, 0, 0], [6, 6, 6]],
        [[0, 0, 7], [7, 7, 7]]
      ];

      var board = [];
      var currentPiece = null;
      var currentX = 0;
      var currentY = 0;
      var nextPieceType = 1;
      var score = 0;
      var lines = 0;
      var level = 1;
      var isRunning = false;
      var isPaused = false;
      var dropCounter = 0;
      var dropInterval = 1000;
      var lastTime = 0;
      var animationId = null;

      function createBoard() {
        board = [];
        for (var r = 0; r < ROWS; r++) {
          var row = [];
          for (var c = 0; c < COLS; c++) {
            row.push(0);
          }
          board.push(row);
        }
      }

      function randomPieceType() {
        return Math.floor(Math.random() * 7) + 1;
      }

      function rotate(matrix) {
        var N = matrix.length;
        var M = matrix[0].length;
        var result = [];
        for (var c = 0; c < M; c++) {
          var newRow = [];
          for (var r = N - 1; r >= 0; r--) {
            newRow.push(matrix[r][c]);
          }
          result.push(newRow);
        }
        return result;
      }

      function collide(b, piece, offset) {
        for (var r = 0; r < piece.length; r++) {
          for (var c = 0; c < piece[r].length; c++) {
            if (piece[r][c] !== 0) {
              var newY = r + offset.y;
              var newX = c + offset.x;
              if (newX < 0 || newX >= COLS || newY >= ROWS) {
                return true;
              }
              if (newY >= 0 && b[newY][newX] !== 0) {
                return true;
              }
            }
          }
        }
        return false;
      }

      function merge(b, piece, offset) {
        for (var r = 0; r < piece.length; r++) {
          for (var c = 0; c < piece[r].length; c++) {
            if (piece[r][c] !== 0) {
              if (r + offset.y >= 0) {
                b[r + offset.y][c + offset.x] = piece[r][c];
              }
            }
          }
        }
      }

      function clearLines() {
        var linesCleared = 0;
        for (var r = ROWS - 1; r >= 0; r--) {
          var full = true;
          for (var c = 0; c < COLS; c++) {
            if (board[r][c] === 0) {
              full = false;
              break;
            }
          }
          if (full) {
            board.splice(r, 1);
            var newRow = [];
            for (var c = 0; c < COLS; c++) newRow.push(0);
            board.unshift(newRow);
            linesCleared++;
            r++;
          }
        }

        if (linesCleared > 0) {
          var points = [0, 100, 300, 500, 800];
          score += (points[linesCleared] || 100) * level;
          lines += linesCleared;
          level = Math.floor(lines / 10) + 1;
          dropInterval = Math.max(120, 1000 - (level - 1) * 90);
          updateUI();
        }
      }

      function spawnPiece() {
        var type = nextPieceType;
        nextPieceType = randomPieceType();
        currentPiece = PIECES[type].map(function (row) { return row.slice(); });
        currentX = Math.floor((COLS - currentPiece[0].length) / 2);
        currentY = 0;

        if (collide(board, currentPiece, { x: currentX, y: currentY })) {
          gameOver();
          return false;
        }
        drawNext();
        return true;
      }

      function updateUI() {
        scoreEl.textContent = String(score);
        linesEl.textContent = String(lines);
        levelEl.textContent = String(level);
      }

      // Clean, simple flat retro block with crisp 1px separation
      function drawBlock(cContext, x, y, color, size) {
        cContext.fillStyle = color;
        cContext.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      }

      function draw() {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

        // Subtle clean grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        for (var r = 0; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * BLOCK_SIZE);
          ctx.lineTo(tetrisCanvas.width, r * BLOCK_SIZE);
          ctx.stroke();
        }
        for (var c = 0; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * BLOCK_SIZE, 0);
          ctx.lineTo(c * BLOCK_SIZE, tetrisCanvas.height);
          ctx.stroke();
        }

        // Settled pieces
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var val = board[r][c];
            if (val !== 0) {
              drawBlock(ctx, c, r, PIECE_COLORS[val], BLOCK_SIZE);
            }
          }
        }

        // Active piece
        if (currentPiece && isRunning) {
          for (var r = 0; r < currentPiece.length; r++) {
            for (var c = 0; c < currentPiece[r].length; c++) {
              if (currentPiece[r][c] !== 0) {
                drawBlock(ctx, currentX + c, currentY + r, PIECE_COLORS[currentPiece[r][c]], BLOCK_SIZE);
              }
            }
          }
        }
      }

      function drawNext() {
        if (!nextCtx) return;
        nextCtx.fillStyle = "#000000";
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        var piece = PIECES[nextPieceType];
        var pRows = piece.length;
        var pCols = piece[0].length;
        var size = 16;
        var offsetX = Math.floor((nextCanvas.width - pCols * size) / 2 / size);
        var offsetY = Math.floor((nextCanvas.height - pRows * size) / 2 / size);

        for (var r = 0; r < pRows; r++) {
          for (var c = 0; c < pCols; c++) {
            if (piece[r][c] !== 0) {
              drawBlock(nextCtx, offsetX + c, offsetY + r, PIECE_COLORS[piece[r][c]], size);
            }
          }
        }
      }

      function playerDrop() {
        currentY++;
        if (collide(board, currentPiece, { x: currentX, y: currentY })) {
          currentY--;
          merge(board, currentPiece, { x: currentX, y: currentY });
          clearLines();
          if (isRunning) {
            spawnPiece();
          }
        }
        dropCounter = 0;
      }

      function playerHardDrop() {
        var dropDist = 0;
        while (!collide(board, currentPiece, { x: currentX, y: currentY + 1 })) {
          currentY++;
          dropDist++;
        }
        score += dropDist * 2;
        merge(board, currentPiece, { x: currentX, y: currentY });
        clearLines();
        updateUI();
        if (isRunning) {
          spawnPiece();
        }
        dropCounter = 0;
      }

      function playerMove(dir) {
        currentX += dir;
        if (collide(board, currentPiece, { x: currentX, y: currentY })) {
          currentX -= dir;
        }
      }

      function playerRotate() {
        var rotated = rotate(currentPiece);
        var posX = currentX;
        var offset = 1;
        while (collide(board, rotated, { x: posX, y: currentY })) {
          posX += offset;
          offset = -(offset + (offset > 0 ? 1 : -1));
          if (offset > rotated[0].length) {
            return;
          }
        }
        currentPiece = rotated;
        currentX = posX;
      }

      function gameLoop(time) {
        if (!isRunning) return;
        if (!time) time = 0;
        var deltaTime = time - lastTime;
        lastTime = time;

        if (!isPaused) {
          dropCounter += deltaTime;
          if (dropCounter > dropInterval) {
            playerDrop();
          }
          draw();
        }

        animationId = requestAnimationFrame(gameLoop);
      }

      function startGame() {
        createBoard();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        dropCounter = 0;
        lastTime = performance.now();
        updateUI();

        nextPieceType = randomPieceType();
        isRunning = true;
        isPaused = false;
        pauseBtn.disabled = false;
        pauseBtn.textContent = "pause";
        startBtn.textContent = "restart";
        overlay.classList.add("is-hidden");

        spawnPiece();

        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
      }

      function togglePause() {
        if (!isRunning) return;
        isPaused = !isPaused;
        if (isPaused) {
          pauseBtn.textContent = "resume";
          overlayMsg.textContent = "paused (space / resume)";
          overlay.classList.remove("is-hidden");
        } else {
          pauseBtn.textContent = "pause";
          overlay.classList.add("is-hidden");
          lastTime = performance.now();
        }
      }

      function gameOver() {
        isRunning = false;
        currentPiece = null;
        pauseBtn.disabled = true;
        pauseBtn.textContent = "pause";
        startBtn.textContent = "start";
        overlayMsg.textContent = "game over — score: " + score;
        overlay.classList.remove("is-hidden");
        if (animationId) cancelAnimationFrame(animationId);
        draw();
      }

      startBtn.addEventListener("click", function () {
        startGame();
      });

      pauseBtn.addEventListener("click", function () {
        togglePause();
      });

      window.addEventListener("keydown", function (e) {
        var key = e.key.toLowerCase();

        if (key === " " || key === "w" || key === "a" || key === "s" || key === "d") {
          var tag = (document.activeElement && document.activeElement.tagName) || "";
          if (tag === "INPUT" || tag === "TEXTAREA") return;

          e.preventDefault();

          // Prevent key repeat on hard-drop and rotate to avoid accidental spam
          if (e.repeat && (key === " " || key === "w")) {
            return;
          }

          if (!isRunning) {
            if (key === " ") {
              startGame();
            }
            return;
          }

          if (isPaused) {
            if (key === " ") {
              togglePause();
            }
            return;
          }

          switch (key) {
            case "a":
              playerMove(-1);
              draw();
              break;
            case "d":
              playerMove(1);
              draw();
              break;
            case "w":
              playerRotate();
              draw();
              break;
            case "s":
              playerDrop();
              score += 1;
              updateUI();
              draw();
              break;
            case " ":
              playerHardDrop();
              draw();
              break;
          }
        }
      });

      createBoard();
      draw();
      drawNext();
    }
  })();
