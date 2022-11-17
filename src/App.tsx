import { useMemo, useState } from 'preact/hooks'
import { Point, SplineEditor } from './components/SplineEditor'
import { round } from './util'


export function App() {
	const [points, setPoints] = useState<Point[]>([
		{ x: 10, y: 50, slope: 0 },
		{ x: 40, y: 25, slope: 0.3 },
		{ x: 70, y: 40, slope: -0.4 },
	])

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

	return <div class='grid grid-cols-2'>
		<textarea class='p-2 bg-zinc-800 outline-none' value={JSON.stringify(df, null, '\t')} readonly spellcheck={false} />
		<SplineEditor points={points} setPoints={setPoints} />
	</div>
}
