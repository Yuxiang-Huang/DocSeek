import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AboutTheTeamPage } from "./AboutTheTeamPage";
import { App } from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
	throw new Error('Missing root element "#root"');
}

createRoot(rootEl).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/about-the-team" element={<AboutTheTeamPage />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
