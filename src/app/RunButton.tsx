import {Button} from "reactstrap";

interface RunButtonProps {onClick: () => void, running: boolean, loaded: boolean}

export const RunButton = ({onClick, running, loaded}: RunButtonProps) => {
	return <div className={"d-flex justify-content-center mb-3"}>
		<Button className={"run-button"} color={"secondary text-center"} onClick={onClick} disabled={!loaded || running}>
			{running ?
				"Running..."
				:
				<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="#000000"
					 className="bi bi-play" viewBox="0 0 16 16">
					<path
						d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
				</svg>
			}
		</Button>
	</div>
}