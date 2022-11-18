import { useCallback, useMemo, useRef } from 'preact/hooks'
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

interface Drag {
	type: 'point' | 'handle'
	index: number
}

interface Props {
	region: Region
	points: Point[]
	setPoints: (points: Point[]) => void
	axis?: boolean
}
export function SplineEditor({ region, points, setPoints, axis }: Props) {
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

	const setPoint = useCallback((j: number, point: Partial<Point>) => {
		setPoints(points.map((p, i) => {
			if (i !== j) return p
			const minX = points[i-1]?.x ?? -Infinity
			const maxX = points[i+1]?.x ?? Infinity
			return {
				x: point.x ? clamp(point.x, minX, maxX) : p.x,
				y: point.y ?? p.y,
				slope: point.slope ?? p.slope,
			}
		}))
	}, [points])

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
			const i = drag.current.index
			const [x, y] = computePoint(event)
			if (drag.current.type === 'point') {
				setPoint(i, { x, y })
			} else {
				const slope = (y - points[i].y) / (x - points[i].x)
				setPoint(i, { slope })
			}
		}
	}, [points, computePoint, setPoint])

	const mouseUp = useCallback(() => {
		drag.current = undefined
	}, [])

	const startDrag = useCallback((type: Drag['type'], index: number) => (event: MouseEvent) => {
		if (event.button === 0) {
			drag.current = { type, index }
			mouseMove(event)
		} else if (event.button === 2) {
			if (type === 'point' && points[index].slope === 0) {
				if (points.length > 2) {
					const newPoints = points.slice()
					newPoints.splice(index, 1)
					setPoints(newPoints)
				}
			} else {
				setPoint(index, { slope: 0 })
			}
		}
	}, [points, mouseMove, setPoints, setPoint])

	const splitSegment = useCallback((event: MouseEvent) => {
		if (svg.current) {
			const [x, y] = computePoint(event)
			const insert = points.findIndex(p => p.x > x) ?? points.length
			const newPoints = points.slice()
			newPoints.splice(insert, 0, { x, y, slope: 0 })
			setPoints(newPoints)
		}
	}, [points, computePoint, setPoints])

	return <svg ref={svg} width='1' height='1' viewBox='0 0 1 1' onContextMenu={onContextMenu} onMouseMove={mouseMove} onMouseUp={mouseUp} class='w-full h-full aspect-square bg-zinc-700'>
		{axis && <>
			<line x1={X(region.x1)} y1={Y(0)} x2={X(region.x2)} y2={Y(0)} class='stroke-zinc-500' style={{ strokeWidth: `${S(0.5)}px` }} />
			{Array(100).fill(0).map((_, i) =>	
				<line x1={X(i/10-5)} y1={Y(0)} x2={X(i/10-5)} y2={Y(0)+S(i % 10 === 0 ? 3 : 1.5)} class='stroke-zinc-500' style={{ strokeWidth: `${S(0.5)}px` }} />,
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
		{points.map((p, i) => <circle cx={X(p.x)} cy={Y(p.y)} r={S(2)} class='fill-orange-300' onMouseDown={startDrag('point', i)} />)}
	</svg>
}
