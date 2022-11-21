import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

export function useCommitState<T>(value: T, setValue: (t: T) => void): [T, (t: T) => void, () => void] {
	const [buffer, setBuffer] = useState(value)
	useEffect(() => {
		setBuffer(value)
	}, [value])
	const dirty = useRef(false)

	const timeoutRef = useRef<number>()
	const commit = useCallback(() => {
		if (timeoutRef.current !== undefined) {
			clearTimeout(timeoutRef.current)
		}
		if (dirty.current) {
			timeoutRef.current = setTimeout(() => {
				setValue(buffer)
			}, 100)
		}
	}, [buffer, setValue])

	const set = useCallback((value: T) => {
		setBuffer(value)
		dirty.current = true
	}, [setBuffer])

	return [buffer, set, commit]
}
