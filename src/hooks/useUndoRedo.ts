import { StateUpdater, useCallback, useState } from 'preact/hooks'

export function useUndoRedo<T>(initialState: T): [T, StateUpdater<T>, () => void, () => void] {
	const [history, setHistory] = useState([initialState])
	const [current, setCurrent] = useState(0)

	const undo = useCallback(() => {
		if (current === 0) return
		setCurrent(current - 1)
	}, [current, setCurrent])

	const redo = useCallback(() => {
		if (current < history.length - 1) {
			setCurrent(current + 1)
		}
	}, [current, history, setCurrent])

	const setter = useCallback<StateUpdater<T>>(value => {
		const newValue = value instanceof Function ? value(history[current]) : value
		const newHistory = history.slice(0, current + 1)
		newHistory.push(newValue)
		setHistory(newHistory)
		setCurrent(current + 1)
	}, [history, current])

	return [history[current], setter, undo, redo]
}
