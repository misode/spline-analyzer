import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { clamp, distance, safeSlope } from '../util'

export interface Point {
	x: number
	y: number
	slope: number
}

export interface Region {
	x1: number
	y1: number
	x2: number
	y2: number
}

type Drag = {
	type: 'point' | 'handle'
	index: number
	rels?: Map<number, { x: number, y: number }>
} | {
	type: 'selection'
	x: number
	y: number
}

interface Props {
	region: Region
	points: Point[]
	setPoints: (points: Point[]) => void
	commitPoints?: () => void
	axis?: boolean
}
export function SplineEditor({ region, points, setPoints, commitPoints, axis }: Props) {
	const [box, setBox] = useState<Region | undefined>(undefined)

	const [selected, setSelected] = useState<number[]>([])

	const { width, height } = useMemo(() => {
		return {
			width: region.x2 - region.x1,
			height: region.y2 - region.y1,
		}
	}, [region])

	const { S, X, Y } = useMemo(() => {
		return {
			S: (n: number) => n * 0.01,
			X: (x: number) => (x - region.x1) / width,
			Y: (y: number) => 1 - (y - region.y1) / height,
		}
	}, [region, width, height])

	const updatePoints = useCallback((newPoints: Map<number, Partial<Point>>) => {
		setPoints(points.map((p, i) => {
			const point = newPoints.get(i)
			if (point === undefined) return p
			const minX = points[i-1]?.x ?? -Infinity
			const maxX = points[i+1]?.x ?? Infinity
			return {
				x: point.x ? clamp(point.x, minX, maxX) : p.x,
				y: point.y ?? p.y,
				slope: point.slope ?? p.slope,
			}
		}))
	}, [points, setPoints])
	const setPoint = useCallback((i: number, point: Partial<Point>) => {
		updatePoints(new Map([[i, point]]))
	}, [updatePoints])

	const segments = useMemo(() => {
		return points.slice(1).map((next, i) => {
			const prev: Point = points[i]
			const d = (next.x - prev.x) / 3
			return {
				x0: prev.x, y0: prev.y,
				x1: prev.x + d, y1: safeSlope(prev.y + prev.slope * d),
				x2: next.x - d, y2: safeSlope(next.y - next.slope * d),
				x3: next.x, y3: next.y,
			}
		})
	}, [points])

	const handles = useMemo(() => {
		return segments.map(s => {
			const d1 = S(8) / clamp(distance(X(s.x0), Y(s.y0), X(s.x1), Y(s.y1)), 0.0001, Infinity)
			const d2 = S(8) / clamp(distance(X(s.x2), Y(s.y2), X(s.x3), Y(s.y3)), 0.0001, Infinity)
			return {
				...s,
				x1: (s.x1 - s.x0) * d1 + s.x0,
				y1: (s.y1 - s.y0) * d1 + s.y0,
				x2: (s.x2 - s.x3) * d2 + s.x3,
				y2: (s.y2 - s.y3) * d2 + s.y3,
			}
		})
	}, [segments, S, X, Y])

	const svg = useRef<SVGSVGElement | null>(null)
	const drag = useRef<Drag | undefined>()

	const computePoint = useCallback((event: MouseEvent) => {
		const x = event.offsetX / (svg.current!.clientWidth / width) + region.x1
		const y = height - (event.offsetY / (svg.current!.clientHeight / height)) + region.y1
		return [x, y]
	}, [region, width, height])

	const onContextMenu = useCallback((event: MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()
	}, [])

	const mouseMove = useCallback((event: MouseEvent) => {
		if (drag.current !== undefined && svg.current) {
			if (drag.current.type === 'selection') {
				const [x, y] = computePoint(event)
				const d = distance(X(x), Y(y), X(drag.current.x), Y(drag.current.y))
				setBox(d === 0 ? undefined : { x1: drag.current.x, y1: drag.current.y, x2: x, y2: y })
			} else {
				setBox(undefined)
				const i = drag.current.index
				const [x, y] = computePoint(event)
				if (drag.current.type === 'point') {
					const updates = new Map<number, Partial<Point>>()
					if (drag.current.rels) {
						for (const [j, s] of drag.current.rels.entries()) {
							if (i === j) continue
							updates.set(j, { x: x + s.x, y: y + s.y })
						}
					}
					updates.set(i, { x, y })
					updatePoints(updates)
				} else {
					const slope = (y - points[i].y) / (x - points[i].x)
					setPoint(i, { slope })
				}
			}
		}
	}, [points, selected, computePoint, setPoint, S, X, Y])

	const mouseUp = useCallback(() => {
		if (drag.current?.type === 'selection') {
			if (box) {
				setSelected(points.flatMap((p, i) => p.x >= Math.min(box.x1, box.x2) && p.x <= Math.max(box.x1, box.x2) && p.y >= Math.min(box.y1, box.y2) && p.y <= Math.max(box.y1, box.y2) ? [i] : []))
			} else {
				setSelected([])
			}
		}
		drag.current = undefined
		setBox(undefined)
		commitPoints?.()
	}, [points, box, commitPoints])

	const startDrag = useCallback((type: 'point' | 'handle', i: number) => (event: MouseEvent) => {
		if (event.button === 0) {
			if (selected.length > 0 && selected.includes(i)) {
				const rels = new Map(selected.map(s => [s, {
					x: points[s].x - points[i].x,
					y: points[s].y - points[i].y,
				}]))
				drag.current = { type, index: i, rels }
			} else {
				drag.current = { type, index: i }
			}
			mouseMove(event)
		} else if (event.button === 2) {
			if (type === 'point' && points[i].slope === 0) {
				if (points.length > 2) {
					const newPoints = points.slice()
					newPoints.splice(i, 1)
					setPoints(newPoints)
				}
			} else {
				setPoint(i, { slope: 0 })
			}
		}
		event.stopPropagation()
	}, [points, selected, mouseMove, updatePoints, setPoint])

	const splitSegment = useCallback((event: MouseEvent) => {
		if (svg.current) {
			const [x, y] = computePoint(event)
			const insert = points.findIndex(p => p.x > x) ?? points.length
			const newPoints = points.slice()
			newPoints.splice(insert, 0, { x, y, slope: 0 })
			setPoints(newPoints)
		}
		event.stopPropagation()
	}, [points, computePoint, updatePoints])

	const startSelection = useCallback((event: MouseEvent) => {
		const [x, y] = computePoint(event)
		drag.current = { type: 'selection', x, y }
	}, [computePoint])

	return <svg ref={svg} width='1' height='1' viewBox='0 0 1 1' onContextMenu={onContextMenu} onMouseDown={startSelection} onMouseMove={mouseMove} onMouseUp={mouseUp} class='w-full h-full aspect-square bg-zinc-700'>
		{axis && <>
			<line x1={X(region.x1)} y1={Y(0)} x2={X(region.x2)} y2={Y(0)} class='stroke-zinc-500' style={{ strokeWidth: `${S(0.5)}px` }} />
			{[...Array(100)].map((_, i) => [X(i/10 - 5), i]).filter(([x]) => x >= 0 && x <= 1).map(([x, i]) =>	
				<line x1={x} y1={Y(0)} x2={x} y2={Y(0)+S(i % 10 === 0 ? 3 : 1.5)} class='stroke-zinc-500' style={{ strokeWidth: `${S(0.5)}px` }} />,
			)}
		</>}

		{handles.map((s, i) => <>
			<path d={`M ${X(s.x0)} ${Y(s.y0)} L ${X(s.x1)} ${Y(s.y1)}`} class='stroke-orange-200' style={{ strokeWidth: `${S(1)}px` }} onMouseDown={startDrag('handle', i)} />
			<path d={`M ${X(s.x2)} ${Y(s.y2)} L ${X(s.x3)} ${Y(s.y3)}`} class='stroke-orange-200' style={{ strokeWidth: `${S(1)}px` }} onMouseDown={startDrag('handle', i + 1)} />
		</>)}
		<path d={segments.map(s => `M ${X(s.x0)} ${Y(s.y0)} C ${X(s.x1)} ${Y(s.y1)}, ${X(s.x2)} ${Y(s.y2)}, ${X(s.x3)} ${Y(s.y3)}`).join(' ')} class='stroke-orange-300' style={{ strokeWidth: `${S(1)}px` }} fill='none' onMouseDown={splitSegment} />
		{handles.map((s, i) => <>
			<circle cx={X(s.x1)} cy={Y(s.y1)} r={S(1.5)} class='fill-orange-200' onMouseDown={startDrag('handle', i)} />
			<circle cx={X(s.x2)} cy={Y(s.y2)} r={S(1.5)} class='fill-orange-200' onMouseDown={startDrag('handle', i + 1)} />
		</>)}
		{points.map((p, i) => <circle cx={X(p.x)} cy={Y(p.y)} r={S(2)} class={selected.includes(i) ? 'fill-sky-400' : 'fill-orange-300'} onMouseDown={startDrag('point', i)} />)}

		{box && <path d={`M ${X(box.x1)} ${Y(box.y1)} L ${X(box.x1)} ${Y(box.y2)} L ${X(box.x2)} ${Y(box.y2)} L ${X(box.x2)} ${Y(box.y1)} L ${X(box.x1)} ${Y(box.y1)}`} class='stroke-sky-600 fill-sky-900 opacity-30' fill='none' style={{ strokeWidth: `${S(1)}px` }} stroke-linejoin='round' stroke-linecap='round' />}
	</svg>
}
