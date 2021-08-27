

export const RunButton = (props: {handleClick: () => void}) => {
	return <div className={"text-center"}>
		<button className={"run-button btn btn-secondary"} onClick={props.handleClick}>Run</button>
	</div>
}