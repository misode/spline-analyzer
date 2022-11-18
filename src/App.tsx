import { useMemo, useState } from 'preact/hooks'
import { Point, Region, SplineEditor } from './components/SplineEditor'
import { round } from './util'

const MARGINS = [0.2, 1]

export function App() {
	const [points, setPoints] = useState<Point[]>([
		{ x: 0, y: 0, slope: 0 },
		{ x: 0.23, y: 0.8, slope: 0.3 },
		{ x: 0.4, y: 0.2, slope: -0.4 },
	])

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

	const df = useMemo(() => ({
		type: 'minecraft:spline',
		spline: {
			coordinate: 'minecraft:overworld/continents',
			points: points.map(p => ({
				location: round(p.x),
				value: round(p.y),
				derivative: round(p.slope),
			})),
		},
	}), [points])

	return <div class='grid grid-cols-2 h-screen items-start'>
		<textarea class='p-2 bg-zinc-800 outline-none self-stretch' value={JSON.stringify(df, null, '\t')} readonly spellcheck={false} />
		<div>
			<SplineEditor region={region} points={points} setPoints={setPoints} axis />
		</div>
	</div>
}
