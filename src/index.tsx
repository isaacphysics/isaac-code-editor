import "./scss/cs/isaac.scss";
import { createRoot } from 'react-dom/client';
import { Sandbox } from "./app/Sandbox";

const root = createRoot(document.getElementById('root')!);

root.render(<Sandbox />);
