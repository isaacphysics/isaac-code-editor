import {Table} from "reactstrap";

interface OutputTableProps {
    rows: string[][];
    columnNames: string[];
    error?: string;
    message?: string;
}

export const OutputTable = ({rows, columnNames, error, message}: OutputTableProps) => {
    return <>
        {message && <div className={"sql-message"}>{message}</div>}
        <div className="output-table-container">
            {error
                ? <div className={"sql-error"}>{error}</div>
                : <Table>
                    <thead>
                        <tr>
                            {columnNames.map((c, i) => {
                                return <th key={i}>{c}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                    {rows.map((r, i) => {
                        return <tr key={i} className={i % 2 ? "bg-light" : "bg-dark"}>
                            {r.map((c, j) => {
                                return <td key={j}>{c}</td>;
                            })}
                        </tr>;
                    })}
                    </tbody>
                </Table>
            }
        </div>
    </>;
}
