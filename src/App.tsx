import { useCallback, useMemo, useState } from 'preact/hooks'
import { Point, Region, SplineEditor } from './components/SplineEditor'
import { parseSource, updateSource } from './util'

const MARGINS = [0.2, 1]

export function App() {
	const [source, setSource] = useState(`{
		"type": "minecraft:spline",
		"spline": {
			"coordinate": "minecraft:overworld/continents",
			"points": [
				{ "location": 0, "value": 0, "derivative": 0 },
				{ "location": 0.23, "value": 0.8, "derivative": 0.3 },
				{ "location": 0.4, "value": 0.2, "derivative": -0.4 }
			]
		}
	}`)
	const points = useMemo(() => parseSource(source), [source])
	const setPoints = useCallback((points: Point[]) =>  {
		console.log('SET', points)
		setSource(updateSource(source, points))
	}, [source])

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

	return <div class='grid grid-cols-2 h-screen items-start'>
		<textarea class='p-2 bg-zinc-800 outline-none self-stretch' value={source} onInput={e => setSource((e.target as HTMLTextAreaElement).value)} spellcheck={false} />
		<div>
			<SplineEditor region={region} points={points} setPoints={setPoints} axis />
		</div>
	</div>
}
