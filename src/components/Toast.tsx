import { Octicons } from './Octicons'

interface Props {
	title: string
	color: 'info' | 'warning' | 'danger'
	onDismiss?: () => void
}
export function Toast({ title, color, onDismiss }: Props) {
	return <div class={`flex items-center rounded p-1 ${color === 'warning' ? 'bg-yellow-800' : color === 'danger' ? 'bg-red-800' : 'bg-zinc-800'}`}>
		<div class='p-2'>
			{color === 'warning' ? Octicons.alert : color === 'danger' ? Octicons.alert : Octicons.bell}
		</div>
		<span class={`p-1 ${onDismiss ? '' : 'pr-3'}`}>{title}</span>
		{onDismiss && <div class='rounded p-2 bg-white bg-opacity-0 hover:bg-opacity-20 transition-colors cursor-pointer' onClick={onDismiss}>
			{Octicons.x}
		</div>}
	</div>
}
