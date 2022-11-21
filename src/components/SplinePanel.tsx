import { useMemo } from 'preact/hooks'
import { Point, Region, SplineEditor } from './SplineEditor'


const MARGINS = [0.2, 1]

interface Props {
	points: Point[]
	setPoints: (points: Point[]) => void
}
export function SplinePanel({ points, setPoints }: Props) {
	const region = useMemo<Region>(() => {
		let [minX, maxX, minY, maxY] = [0, 0, 0, 0]
		for (const p of points) {
			minX = Math.min(p.x, minX)
			maxX = Math.max(p.x, maxX)
			minY = Math.min(p.y, minY)
			maxY = Math.max(p.y, maxY)
		}
		return {
			x1: minX - MARGINS[0],
			y1: minY - MARGINS[1],
			x2: maxX + MARGINS[0],
			y2: maxY + MARGINS[1],
		}
	}, [points])

	return <SplineEditor region={region} points={points} setPoints={setPoints} axis />
}
