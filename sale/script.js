let products = [];
let lightboxImages = [];
let lightboxIndex = 0;

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

function getImages(p) {
	if (Array.isArray(p.images) && p.images.length) return p.images.filter(Boolean);
	return p.image ? [p.image] : [];
}

function findProduct(id) {
	return products.find(p => p.id === id);
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

function renderProducts(list, state) {
	const grid = document.getElementById("productGrid");
	const search = (state.search || "").trim().toLowerCase();

	const filtered = list.filter(p => {
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
		const images = getImages(p);
		const wantLink = whatsappLink(`Hi Marina! I want the "${p.title}".`);
		return `
			<div class="product-card${p.sold ? " sold" : ""}" data-id="${escapeHtml(p.id)}">
				<div class="product-image" data-index="0">
					${images.length
						? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(p.title)}" loading="lazy">`
						: '<div class="no-image">No photo</div>'}
					${images.length > 1 ? `
						<button type="button" class="img-nav prev" aria-label="Previous photo">&lsaquo;</button>
						<button type="button" class="img-nav next" aria-label="Next photo">&rsaquo;</button>
						<span class="img-counter">1/${images.length}</span>
					` : ""}
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

/* ---- Lightbox ---- */

function renderLightbox() {
	document.getElementById("lightboxImg").src = lightboxImages[lightboxIndex];
	document.getElementById("lightboxCounter").textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
	const multi = lightboxImages.length > 1;
	document.getElementById("lightboxPrev").hidden = !multi;
	document.getElementById("lightboxNext").hidden = !multi;
	document.getElementById("lightboxCounter").hidden = !multi;
}

function openLightbox(images, index) {
	if (!images.length) return;
	lightboxImages = images;
	lightboxIndex = index;
	renderLightbox();
	document.getElementById("lightbox").hidden = false;
	document.body.style.overflow = "hidden";
}

function closeLightbox() {
	document.getElementById("lightbox").hidden = true;
	document.body.style.overflow = "";
}

function lightboxStep(dir) {
	lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
	renderLightbox();
}

(async function init() {
	document.getElementById("siteTitle").textContent = SITE_CONFIG.title;
	document.getElementById("siteSubtitle").textContent = SITE_CONFIG.subtitle;
	document.getElementById("contactLink").href = whatsappLink("Hi Marina! I have a question about your moving sale.");

	products = await loadProducts();
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

	document.getElementById("productGrid").addEventListener("click", e => {
		const imgWrap = e.target.closest(".product-image");
		if (!imgWrap) return;
		const card = imgWrap.closest(".product-card");
		const p = findProduct(card.dataset.id);
		if (!p) return;
		const images = getImages(p);
		if (!images.length) return;

		const navBtn = e.target.closest(".img-nav");
		let index = parseInt(imgWrap.dataset.index || "0", 10);

		if (navBtn) {
			index = navBtn.classList.contains("prev")
				? (index - 1 + images.length) % images.length
				: (index + 1) % images.length;
			imgWrap.dataset.index = index;
			imgWrap.querySelector("img").src = images[index];
			const counter = imgWrap.querySelector(".img-counter");
			if (counter) counter.textContent = `${index + 1}/${images.length}`;
			return;
		}

		openLightbox(images, index);
	});

	document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
	document.getElementById("lightboxPrev").addEventListener("click", () => lightboxStep(-1));
	document.getElementById("lightboxNext").addEventListener("click", () => lightboxStep(1));

	document.getElementById("lightbox").addEventListener("click", e => {
		if (e.target.id === "lightbox") closeLightbox();
	});

	document.addEventListener("keydown", e => {
		const lightbox = document.getElementById("lightbox");
		if (lightbox.hidden) return;
		if (e.key === "Escape") closeLightbox();
		else if (e.key === "ArrowLeft") lightboxStep(-1);
		else if (e.key === "ArrowRight") lightboxStep(1);
	});
})();
