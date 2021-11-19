import React from 'react';
import ReactDOM from 'react-dom';

import "./scss/cs/isaac.scss";
import { Sandbox } from './app/Sandbox';

import {Provider} from 'react-redux';
import {reduxStore} from "./app/redux/ReduxStore";

ReactDOM.render(
	<Provider store={reduxStore}>
		<Sandbox />
	</Provider>,
	document.getElementById("root")
);