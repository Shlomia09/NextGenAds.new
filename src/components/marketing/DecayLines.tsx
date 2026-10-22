import { useEffect, useRef, useState } from 'react';

// Four creatives, one account, four different lifespans. Each line is a creative's profitable
// life and ends where it stops paying. No numbers on purpose: the lifespan differs per account.
// Lives in the problem section only. Draws once when scrolled into view (900ms), never loops,
// and appears already drawn under prefers-reduced-motion.
//
// The coordinate system is the container's real pixel width, so stroke widths, the dot and the
// labels stay at their true size from 390px to desktop instead of scaling with a viewBox.

const LINES = [
  { end: 0.92, flagged: false },
  { end: 0.58, flagged: false },
  { end: 0.76, flagged: false },
  { end: 0.41, flagged: true },   // the one Rouge names first
];

const LANE = 44;
const TOP = 12;

export function DecayLines() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDrawn(true); return () => ro.disconnect(); }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setDrawn(true); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  const linesH = LINES.length * LANE;
  const axisY = TOP + linesH + 14;
  const h = axisY + 34;
  const weeks = ['WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4'];
  const labelRoom = 70;                    // keeps "flagged" inside the box on narrow screens
  const span = Math.max(0, w - labelRoom);

  return (
    <div ref={wrapRef} className="mk-decay-wrap">
      {w > 0 && (
        <svg className={`mk-decay${drawn ? ' drawn' : ''}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`}
          role="img" aria-label="Four creatives in one account, each with a different lifespan; one is flagged">
          {LINES.map((l, i) => {
            const y = TOP + i * LANE + 6;
            const x = span * l.end;
            // flat at first, then bending down as the creative tires
            const d = `M0,${y} L${x * 0.55},${y} C${x * 0.8},${y} ${x * 0.9},${y + 6} ${x},${y + 18}`;
            const cls = l.flagged ? ' flagged' : '';
            return (
              <g key={i}>
                <path className={`line${cls}`} d={d} pathLength={1} />
                {l.flagged && (
                  <>
                    <circle className="dot flagged" cx={x} cy={y + 18} r={4} />
                    <text className="flag-label" x={x + 12} y={y + 22}>flagged</text>
                  </>
                )}
              </g>
            );
          })}
          <line className="axis" x1={0} x2={w} y1={axisY} y2={axisY} />
          {weeks.map((wk, i) => (
            <text key={wk} className="tick" x={(w / 4) * i} y={axisY + 24}>{wk}</text>
          ))}
        </svg>
      )}
    </div>
  );
}
