import { useCallback, useMemo, useRef } from 'preact/hooks'
import { clamp, safeSlope } from '../util'

export interface Point {
	x: number
	y: number
	slope: number
}

interface Drag {
	type: 'point' | 'handle'
	index: number
}

interface Props {
	points: Point[]
	setPoints: (points: Point[]) => void
}
export function SplineEditor({ points, setPoints }: Props) {
	const setPoint = useCallback((j: number, point: Partial<Point>) => {
		setPoints(points.map((p, i) => i === j ? {
			x: point.x ? clamp(point.x, points[i-1]?.x ?? -Infinity, points[i+1]?.x ?? Infinity) : p.x,
			y: point.y ?? p.y,
			slope: point.slope ?? p.slope,
		} : p ))
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

	const svg = useRef<SVGSVGElement | null>(null)
	const drag = useRef<Drag | undefined>()

	const computePoint = useCallback((event: MouseEvent) => {
		const x = event.offsetX / (svg.current!.clientWidth / svg.current!.width.baseVal.value)
		const y = event.offsetY / (svg.current!.clientHeight / svg.current!.height.baseVal.value)
		return [x, y]
	}, [])

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
	}, [points])

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
	}, [points, mouseMove])

	const splitSegment = useCallback((event: MouseEvent) => {
		const [x, y] = computePoint(event)
		const insert = points.findIndex(p => p.x > x) ?? points.length
		const newPoints = points.slice()
		newPoints.splice(insert, 0, { x, y, slope: 0 })
		setPoints(newPoints)
	}, [points])

	return <svg ref={svg} width='100' height='100' viewBox='0 0 100 100' onContextMenu={onContextMenu} onMouseMove={mouseMove} onMouseUp={mouseUp} class='w-full h-full aspect-square'>
		{segments.map((s, i) => <>
			<path d={`M ${s.x0} ${s.y0} L ${s.x1} ${s.y1}`} class='stroke-orange-200' onMouseDown={startDrag('handle', i)} />
			<path d={`M ${s.x2} ${s.y2} L ${s.x3} ${s.y3}`} class='stroke-orange-200' onMouseDown={startDrag('handle', i + 1)} />
		</>)}
		<path d={segments.map(s => `M ${s.x0} ${s.y0} C ${s.x1} ${s.y1}, ${s.x2} ${s.y2}, ${s.x3} ${s.y3}`).join(' ')} class='stroke-orange-300' fill='none' onMouseDown={splitSegment} />
		{segments.map((s, i) => <>
			<circle cx={s.x1} cy={s.y1} r='1.5' class='fill-orange-200' onMouseDown={startDrag('handle', i)} />
			<circle cx={s.x2} cy={s.y2} r='1.5' class='fill-orange-200' onMouseDown={startDrag('handle', i + 1)} />
		</>)}
		{points.map((p, i) => <circle cx={p.x} cy={p.y} r='2' class='fill-orange-300' onMouseDown={startDrag('point', i)} />)}
	</svg>
}
