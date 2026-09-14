function escapeHtml(str) {
	const div = document.createElement("div");
	div.textContent = str ?? "";
	return div.innerHTML;
}

function formatPrice(value) {
	const n = Number(value);
	return SITE_CONFIG.currencySymbol + (isNaN(n) ? "0.00" : n.toFixed(2));
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

	grid.innerHTML = filtered.map(p => `
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
			</div>
		</div>
	`).join("");
}

(async function init() {
	document.getElementById("siteTitle").textContent = SITE_CONFIG.title;
	document.getElementById("siteSubtitle").textContent = SITE_CONFIG.subtitle;

	const contactLink = document.getElementById("contactLink");
	if (SITE_CONFIG.contactWhatsapp) {
		contactLink.href = SITE_CONFIG.contactWhatsapp;
		contactLink.textContent = "Contact via WhatsApp";
	} else {
		contactLink.href = "mailto:" + SITE_CONFIG.contactEmail;
		contactLink.textContent = "Contact via Email";
	}

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
