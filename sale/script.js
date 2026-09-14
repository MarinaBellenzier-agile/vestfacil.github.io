function escapeHtml(str) {
	const div = document.createElement("div");
	div.textContent = str ?? "";
	return div.innerHTML;
}

function formatPrice(value) {
	const n = Number(value);
	return SITE_CONFIG.currencySymbol + (isNaN(n) ? "0.00" : n.toFixed(2));
}

function whatsappLink(message) {
	return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

async function loadProducts() {
	try {
		const res = await fetch(SITE_CONFIG.productsUrl, { cache: "no-store" });
		if (!res.ok) throw new Error("Failed to load products.json");
		return await res.json();
	} catch (err) {
		console.error(err);
		return [];
	}
}

function renderProducts(products, state) {
	const grid = document.getElementById("productGrid");
	const search = (state.search || "").trim().toLowerCase();

	const filtered = products.filter(p => {
		if (!state.showSold && p.sold) return false;
		if (search) {
			const haystack = ((p.title || "") + " " + (p.description || "")).toLowerCase();
			if (!haystack.includes(search)) return false;
		}
		return true;
	});

	if (!filtered.length) {
		grid.innerHTML = '<p class="empty">No products to show.</p>';
		return;
	}

	grid.innerHTML = filtered.map(p => {
		const wantLink = whatsappLink(`Hi Marina! I want the "${p.title}".`);
		return `
			<div class="product-card${p.sold ? " sold" : ""}">
				<div class="product-image">
					${p.image
						? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy">`
						: '<div class="no-image">No photo</div>'}
					${p.sold ? '<span class="sold-badge">SOLD</span>' : ""}
				</div>
				<div class="product-info">
					<h3>${escapeHtml(p.title)}</h3>
					<p class="price">${formatPrice(p.price)}</p>
					<p class="description">${escapeHtml(p.description || "")}</p>
					${p.sold
						? '<span class="btn btn-cta btn-disabled">Sold out</span>'
						: `<a class="btn btn-cta" href="${wantLink}" target="_blank" rel="noopener">I want this!</a>`}
				</div>
			</div>
		`;
	}).join("");
}

(async function init() {
	document.getElementById("siteTitle").textContent = SITE_CONFIG.title;
	document.getElementById("siteSubtitle").textContent = SITE_CONFIG.subtitle;
	document.getElementById("contactLink").href = whatsappLink("Hi Marina! I have a question about your moving sale.");

	const products = await loadProducts();
	const state = { search: "", showSold: false };

	function update() {
		renderProducts(products, state);
	}
	update();

	document.getElementById("searchInput").addEventListener("input", e => {
		state.search = e.target.value;
		update();
	});
	document.getElementById("showSoldToggle").addEventListener("change", e => {
		state.showSold = e.target.checked;
		update();
	});
})();
