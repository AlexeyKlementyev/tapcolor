/* TapColor — game logic & UI */
const { useState, useEffect, useRef, useCallback } = React;

const TOL = 18;           // win tolerance (RGB euclidean distance)
const P = window.TapPalette;

function rgbStr(c) { return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`; }
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}
function matchPct(d) { return Math.max(0, (1 - d / P.MAX_DIST) * 100); }

// proximity wording + color, tuned so the meter is encouraging late-game
function proximity(d) {
  if (d <= TOL) return { word: 'Точно!', color: '#34c759' };
  if (d <= 40)  return { word: 'Совсем близко', color: '#30b85a' };
  if (d <= 80)  return { word: 'Горячо', color: '#ff9500' };
  if (d <= 150) return { word: 'Тепло', color: '#ffb000' };
  if (d <= 240) return { word: 'Прохладно', color: '#3aa0ff' };
  return { word: 'Холодно', color: '#5b9bd6' };
}

function ratingFor(attempts) {
  if (attempts <= 3) return 'Невероятный глаз! 🎯';
  if (attempts <= 6) return 'Отличное чувство цвета';
  if (attempts <= 10) return 'Хорошо сыграно';
  if (attempts <= 18) return 'Цель взята';
  return 'Получилось!';
}

function App() {
  const paletteRef = useRef(null);
  const confettiRef = useRef(null);
  const bufRef = useRef(null);

  const [target, setTarget] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [markers, setMarkers] = useState([]);
  const [last, setLast] = useState(null);      // {rgb, hex, d}
  const [won, setWon] = useState(false);
  const [winEnter, setWinEnter] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(0);

  // build palette buffer once, paint to visible canvas
  const paint = useCallback(() => {
    const buf = bufRef.current;
    const cv = paletteRef.current;
    if (!buf || !cv) return;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cv.clientWidth * DPR);
    cv.height = Math.round(cv.clientHeight * DPR);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf.canvas, 0, 0, cv.width, cv.height);
  }, []);

  const newGame = useCallback(() => {
    const buf = bufRef.current;
    if (!buf) return;
    setTarget(P.pickTarget(buf));
    setAttempts(0);
    setMarkers([]);
    setLast(null);
    setWon(false);
    setElapsed(0);
    startRef.current = performance.now();
    setRunning(true);
  }, []);

  useEffect(() => {
    bufRef.current = P.buildBuffer();
    paint();
    newGame();
    const onResize = () => paint();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((performance.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const handleClick = useCallback((e) => {
    if (won || !target || !bufRef.current) return;
    const cv = paletteRef.current;
    const rect = cv.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const rgb = P.sampleNorm(bufRef.current, nx, ny);
    const d = P.dist(rgb, target.rgb);
    const hit = d <= TOL;

    setAttempts(a => a + 1);
    setLast({ rgb, hex: P.toHex(rgb), d });
    setMarkers(m => [...m.map(x => ({ ...x, latest: false })), { nx, ny, latest: true, win: hit }]);

    if (hit) {
      setWon(true);
      setWinEnter(true);
      setRunning(false);
      setElapsed(Math.floor((performance.now() - startRef.current) / 1000));
      setTimeout(() => setWinEnter(false), 40);
      requestAnimationFrame(() => {
        if (confettiRef.current) window.TapConfetti.fire(confettiRef.current);
      });
    }
  }, [won, target]);

  const prox = last ? proximity(last.d) : null;
  const pct = last ? matchPct(last.d) : 0;

  return (
    <React.Fragment>
      <canvas id="palette" ref={paletteRef} onClick={handleClick}></canvas>

      <div className="markers">
        {markers.map((m, i) => (
          <div
            key={i}
            className={`marker${m.latest ? ' latest' : ''}${m.win ? ' win' : ''}`}
            style={{ left: `${m.nx * 100}%`, top: `${m.ny * 100}%` }}
          ></div>
        ))}
      </div>

      <div className="brand"><span className="dot"></span>TapColor</div>
      <button className="reset-btn" onClick={newGame} title="Новая цель">
        <span style={{ fontSize: '15px', lineHeight: 1 }}>↻</span> Новая игра
      </button>

      {/* HUD */}
      {target && (
        <div className="hud">
          <div className="hud-cell hud-target">
            <span className="hud-label">Найдите цвет</span>
            <span className="hud-code">{target.hex}</span>
            <span className="hud-rgb">{rgbStr(target.rgb)}</span>
          </div>
          <div className="hud-cell">
            <span className="hud-label">Попытки</span>
            <span className="hud-stat">{attempts}</span>
          </div>
          <div className="hud-cell">
            <span className="hud-label">Время</span>
            <span className="hud-stat">{fmtTime(elapsed)}</span>
          </div>
        </div>
      )}

      {/* Feedback */}
      {last && !won && (
        <div className="feedback">
          <div className="swatch-pair">
            <div className="swatch-col">
              <div className="swatch" style={{ background: rgbStr(target.rgb) }}></div>
              <span className="swatch-cap">Цель</span>
            </div>
            <span className="vs">→</span>
            <div className="swatch-col">
              <div className="swatch" style={{ background: rgbStr(last.rgb) }}></div>
              <span className="swatch-cap">Ваш выбор</span>
            </div>
          </div>
          <div className="match">
            <div className="match-top">
              <span className="match-val">{pct.toFixed(1)}%</span>
              <span className="match-word" style={{ color: prox.color }}>{prox.word}</span>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: `${pct}%`, background: prox.color }}></div>
            </div>
            <span className="hint">{last.hex} · ещё чуть-чуть точности</span>
          </div>
        </div>
      )}

      {/* Win */}
      {won && target && (
        <div className="win-wrap">
          <div className={`win-card${winEnter ? ' enter' : ''}`}>
            <div className="big-swatch" style={{ background: rgbStr(target.rgb) }}></div>
            <div className="win-title">Цвет найден!</div>
            <div className="win-code">{target.hex} · {rgbStr(target.rgb)}</div>
            <div className="win-stats">
              <div className="win-stat">
                <div className="v">{attempts}</div>
                <div className="l">Попытк{attempts % 10 === 1 && attempts % 100 !== 11 ? 'а' : 'и'}</div>
              </div>
              <div className="win-stat">
                <div className="v">{fmtTime(elapsed)}</div>
                <div className="l">Время</div>
              </div>
            </div>
            <div className="win-rating">{ratingFor(attempts)}</div>
            <button className="play-btn" onClick={newGame}>Играть снова</button>
          </div>
        </div>
      )}

      <canvas id="confetti" ref={confettiRef}></canvas>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
