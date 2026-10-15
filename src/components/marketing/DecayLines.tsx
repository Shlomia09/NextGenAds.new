// Four creatives, one account, four different lifespans.
// Each line is a creative's profitable life; it ends where the creative stops paying.
// No numbers on purpose: the lifespan is different in every account.

const LINES = [
  { end: 0.92, flagged: false },
  { end: 0.58, flagged: false },
  { end: 0.76, flagged: false },
  { end: 0.41, flagged: true },  // the one Rouge names first
];

const W = 1000;
const LANE = 44;

export function DecayLines({ withAxis = false }: { withAxis?: boolean }) {
  const top = 12;
  const linesH = LINES.length * LANE;
  const h = top + linesH + (withAxis ? 48 : 8);
  const weeks = ['WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4'];

  return (
    <svg className="mk-decay" viewBox={`0 0 ${W} ${h}`} role="img"
      aria-label="Four creatives in one account, each with a different lifespan">
      {LINES.map((l, i) => {
        const y = top + i * LANE + 6;
        const x = W * l.end;
        // flat at first, then bending down as the creative tires
        const d = `M0,${y} L${x * 0.55},${y} C${x * 0.8},${y} ${x * 0.9},${y + 6} ${x},${y + 18}`;
        const cls = l.flagged ? ' flagged' : '';
        return (
          <g key={i}>
            <path className={`line${cls}`} d={d} />
            <circle className={`dot${cls}`} cx={x} cy={y + 18} r={5} />
          </g>
        );
      })}
      {withAxis && (
        <g>
          <line className="axis" x1={0} x2={W} y1={top + linesH + 14} y2={top + linesH + 14} />
          {weeks.map((w, i) => (
            <text key={w} className="tick" x={(W / 4) * i + 4} y={top + linesH + 38}>{w}</text>
          ))}
        </g>
      )}
    </svg>
  );
}
