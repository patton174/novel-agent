import { STREAMING_PENCIL_CURSOR, STREAMING_PENCIL_SVG } from '@/lib/shimmerClasses'

/** 流式输出时的铅笔光标（内联跟随文字） */
export function StreamingPencilCursor() {
  return (
    <span className={STREAMING_PENCIL_CURSOR} aria-hidden data-testid="streaming-pencil-cursor">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className={STREAMING_PENCIL_SVG}
      >
        <defs>
          <clipPath id="pencil-eraser">
            <rect height={30} width={30} ry={5} rx={5} />
          </clipPath>
        </defs>
        <circle
          transform="rotate(-113,100,100)"
          strokeLinecap="round"
          strokeDashoffset="439.82"
          strokeDasharray="439.82 439.82"
          strokeWidth={2}
          stroke="currentColor"
          fill="none"
          r={70}
          className="streaming-pencil-cursor__stroke"
        />
        <g transform="translate(100,100)" className="streaming-pencil-cursor__rotate">
          <g fill="none">
            <circle
              transform="rotate(-90)"
              strokeDashoffset={402}
              strokeDasharray="402.12 402.12"
              strokeWidth={30}
              stroke="hsl(43, 85%, 52%)"
              r={64}
              className="streaming-pencil-cursor__body1"
            />
            <circle
              transform="rotate(-90)"
              strokeDashoffset={465}
              strokeDasharray="464.96 464.96"
              strokeWidth={10}
              stroke="hsl(43, 90%, 62%)"
              r={74}
              className="streaming-pencil-cursor__body2"
            />
            <circle
              transform="rotate(-90)"
              strokeDashoffset={339}
              strokeDasharray="339.29 339.29"
              strokeWidth={10}
              stroke="hsl(43, 80%, 42%)"
              r={54}
              className="streaming-pencil-cursor__body3"
            />
          </g>
          <g transform="rotate(-90) translate(49,0)" className="streaming-pencil-cursor__eraser">
            <g className="streaming-pencil-cursor__eraser-skew">
              <rect height={30} width={30} ry={5} rx={5} fill="hsl(43, 70%, 72%)" />
              <rect
                clipPath="url(#pencil-eraser)"
                height={30}
                width={5}
                fill="hsl(43, 65%, 58%)"
              />
              <rect height={20} width={30} fill="hsl(43, 15%, 92%)" />
              <rect height={20} width={15} fill="hsl(43, 12%, 78%)" />
              <rect height={20} width={5} fill="hsl(43, 12%, 85%)" />
              <rect height={2} width={30} y={6} fill="hsla(43, 10%, 10%, 0.15)" />
              <rect height={2} width={30} y={13} fill="hsla(43, 10%, 10%, 0.15)" />
            </g>
          </g>
          <g transform="rotate(-90) translate(49,-30)" className="streaming-pencil-cursor__point">
            <polygon points="15 0,30 30,0 30" fill="hsl(33, 90%, 70%)" />
            <polygon points="15 0,6 30,0 30" fill="hsl(33, 90%, 50%)" />
            <polygon points="15 0,20 10,10 10" fill="hsl(43, 25%, 18%)" />
          </g>
        </g>
      </svg>
    </span>
  )
}
