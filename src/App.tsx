import { useCallback, useState } from 'preact/hooks'
import { Point } from './components/SplineEditor'
import { SplinePanel } from './components/SplinePanel'
import { Toast } from './components/Toast'
import { useParser } from './hooks/useParser'
import { parseSource, updateSource } from './util'

export function App() {
	const [source, setSource] = useState(JSON.stringify({
		type: 'minecraft:spline',
		spline: {
			coordinate: 'minecraft:overworld/continents',
			points: [
				{ location: 0, value: 0, derivative: 0 },
				{ location: 0.23, value: 0.8, derivative: 0.3 },
				{ location: 0.4, value: 0.2, derivative: -0.4 },
			],
		},
	}, null, 2))
	const { value: points, errors } = useParser(source, parseSource)
	const setPoints = useCallback((points: Point[]) =>  {
		if (errors.length > 0) return
		setSource(updateSource(source, points))
	}, [source, errors])

	return <div class='h-screen'>
		<div class='h-full grid grid-cols-2 items-start'>
			<textarea class='p-3 bg-zinc-800 outline-none self-stretch font-mono' value={source} onInput={e => setSource((e.target as HTMLTextAreaElement).value)} spellcheck={false} />
			<div class={`relative ${errors.length > 0 ? 'pointer-events-none' : ''}`}>
				<SplinePanel points={points ?? []} setPoints={setPoints} />
				{errors.length > 0 && <div class='absolute inset-0 bg-white bg-opacity-20' />}
			</div>
		</div>
		<div class='fixed bottom-0 right-0 m-2'>
			{errors.map(e => <Toast color='warning' title={e} />)}
		</div>
	</div>
}
