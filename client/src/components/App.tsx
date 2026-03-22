export function App() {
	return (
		<main className="page-wrap px-4 py-16">
			<section className="panel">
				<p className="eyebrow">DocSeek</p>
				<h1>Find the best UPMC doctors for your specific needs.</h1>
				<p className="lede">
					Type your symptoms and preferences, and we'll show you the top doctors
					that match your criteria. Our AI-powered search engine analyzes
					thousands of doctor profiles and performance histories to help you
					make informed decisions about your healthcare.
				</p>
				<div className="actions">
					<a href="http://localhost:3000">API on port 3000</a>
					<span>Client on port 5173</span>
				</div>
			</section>
		</main>
	);
}
