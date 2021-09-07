import {useSelector} from "react-redux";

export const RunButton = (props: {handleClick: () => void}) => {
	const running = useSelector((state: any) => state?.running);

	return <div className={"text-center"}>
		<button className={"run-button btn btn-secondary"} onClick={props.handleClick} disabled={running}>{running ? "Running..." : "Run"}</button>
	</div>
}