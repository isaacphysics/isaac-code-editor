interface RunButtonProps {onClick: () => void, running: boolean, loaded: boolean}

export const RunButton = ({onClick, running, loaded}: RunButtonProps) => {
	return <div className={"text-center"}>
		<button className={"run-button btn btn-secondary"} onClick={onClick} disabled={!loaded || running}>{running ? "Running..." : "Run"}</button>
	</div>
}