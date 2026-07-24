'use client'

import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'

export type TransitEdgeData = {
  count: number
  carriedFlagged: boolean
} & Record<string, unknown>

export type TransitEdgeType = Edge<TransitEdgeData, 'transit'>

/**
 * A route between two stations, with parts visibly moving along it.
 *
 * The dots are SVG <animateMotion>, not a JS animation loop. That matters: the browser
 * runs them on the compositor, so twenty routes animating at once costs us basically
 * nothing and never fights React for the main thread.
 *
 * Thickness = how many parts have taken dis route. Speed = same thing, busier routes
 * move quicker. Red = something that came dis way is currently flagged, so you can see
 * WHERE a problem travelled, not just where it ended up.
 */
export function TransitEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<TransitEdgeType>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const count = data?.count ?? 1
  const isProblem = data?.carriedFlagged ?? false

  const stroke = isProblem ? '#ef4444' : '#10b981'
  // cap the width so one very busy route doesn't turn into a slab
  const width = Math.min(1.2 + count * 0.55, 5)
  // more traffic -> quicker dots, floored so it never gets silly
  const duration = Math.max(1.6, 4.5 - count * 0.35)
  // up to three dots in flight, staggered so it reads as a stream not a blink
  const dots = Math.min(count, 3)

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke, strokeWidth: width, opacity: isProblem ? 0.5 : 0.3 }}
      />

      {Array.from({ length: dots }).map((_, i) => (
        <circle key={i} r={4} fill={stroke} opacity={0.95}>
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            path={path}
            begin={`${(i * duration) / dots}s`}
          />
        </circle>
      ))}
    </>
  )
}
