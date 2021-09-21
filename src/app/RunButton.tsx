import {useSelector} from "react-redux";

export const RunButton = (props: {handleClick: () => void}) => {
	const loaded = useSelector((state: any) => state?.loaded);
	const running = useSelector((state: any) => state?.running);

	return <div className={"text-center"}>
		<button className={"run-button btn btn-secondary"} onClick={props.handleClick} disabled={!loaded || running}>{running ? "Running..." : "Run"}</button>
	</div>
}