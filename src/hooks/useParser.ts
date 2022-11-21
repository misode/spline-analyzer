import { useEffect, useState } from 'preact/hooks'

export function useParser<In, Out>(data: In, parser: (data: In) => Out) {
	const [out, setOut] = useState<Out>()
	const [errors, setErrors] = useState<string[]>([])

	useEffect(() => {
		try {
			setOut(parser(data))
			setErrors([])
		} catch (e) {
			setErrors([e instanceof Error ? e.message : 'Unknown error'])
		}
	}, [data, parser])

	return { value: out, errors }
}
