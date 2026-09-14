const DRAFT_KEY = "saleProductsDraft";

let products = [];
let formImages = [];

function escapeHtml(str) {
	const div = document.createElement("div");
	div.textContent = str ?? "";
	return div.innerHTML;
}

function formatPrice(value) {
	const n = Number(value);
	return SITE_CONFIG.currencySymbol + (isNaN(n) ? "0.00" : n.toFixed(2));
}

function makeId() {
	return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function getImages(p) {
	if (Array.isArray(p.images)) return p.images.filter(Boolean);
	return p.image ? [p.image] : [];
}

function normalizeProduct(p) {
	p.images = getImages(p);
	delete p.image;
	return p;
}

function saveDraft() {
	localStorage.setItem(DRAFT_KEY, JSON.stringify(products));
}

function fileToCompressedDataUrl(file, maxWidth = 900, quality = 0.8) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = e => {
			const img = new Image();
			img.onload = () => {
				const scale = Math.min(1, maxWidth / img.width);
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", quality));
			};
			img.onerror = reject;
			img.src = e.target.result;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function renderTable() {
	const body = document.getElementById("productTableBody");
	document.getElementById("productCount").textContent = products.length;

	if (!products.length) {
		body.innerHTML = '<tr><td colspan="5" class="empty">No products yet. Add one above.</td></tr>';
		return;
	}

	body.innerHTML = products.map(p => {
		const images = getImages(p);
		return `
			<tr data-id="${escapeHtml(p.id)}">
				<td data-label="Photo">
					<div class="thumb-wrap">
						${images[0] ? `<img class="thumb" src="${escapeHtml(images[0])}" alt="">` : '<div class="thumb"></div>'}
						${images.length > 1 ? `<span class="thumb-badge">${images.length}</span>` : ""}
					</div>
				</td>
				<td data-label="Title">${escapeHtml(p.title)}</td>
				<td data-label="Price">${formatPrice(p.price)}</td>
				<td data-label="Status">${p.sold ? '<span class="sold-tag">SOLD</span>' : '<span class="active-tag">Available</span>'}</td>
				<td data-label="Actions">
					<div class="row-actions">
						<button type="button" class="btn btn-secondary btn-small" data-action="toggle-sold">${p.sold ? "Mark available" : "Mark sold"}</button>
						<button type="button" class="btn btn-secondary btn-small" data-action="edit">Edit</button>
						<button type="button" class="btn btn-danger btn-small" data-action="delete">Delete</button>
					</div>
				</td>
			</tr>
		`;
	}).join("");
}

function renderImageList() {
	const list = document.getElementById("imageList");
	if (!formImages.length) {
		list.innerHTML = '<p class="empty-note">No photos added yet.</p>';
		return;
	}
	list.innerHTML = formImages.map((src, i) => `
		<div class="image-item">
			<img src="${escapeHtml(src)}" alt="">
			${i === 0 ? '<span class="image-item-badge">Cover</span>' : ""}
			<div class="image-item-actions">
				<button type="button" class="img-move" data-index="${i}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Move left">&lsaquo;</button>
				<button type="button" class="img-move" data-index="${i}" data-dir="1" ${i === formImages.length - 1 ? "disabled" : ""} aria-label="Move right">&rsaquo;</button>
				<button type="button" class="img-remove" data-index="${i}" aria-label="Remove photo">&times;</button>
			</div>
		</div>
	`).join("");
}

function resetForm() {
	document.getElementById("productForm").reset();
	document.getElementById("editingId").value = "";
	document.getElementById("formTitle").textContent = "Add a product";
	document.getElementById("submitBtn").textContent = "Add product";
	document.getElementById("cancelEditBtn").hidden = true;
	formImages = [];
	renderImageList();
}

function startEdit(id) {
	const p = products.find(x => x.id === id);
	if (!p) return;
	document.getElementById("editingId").value = p.id;
	document.getElementById("title").value = p.title || "";
	document.getElementById("price").value = p.price ?? "";
	document.getElementById("description").value = p.description || "";
	document.getElementById("sold").checked = !!p.sold;
	formImages = getImages(p).slice();
	renderImageList();
	document.getElementById("formTitle").textContent = "Edit product";
	document.getElementById("submitBtn").textContent = "Save changes";
	document.getElementById("cancelEditBtn").hidden = false;
	window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadInitialProducts() {
	const draft = localStorage.getItem(DRAFT_KEY);
	if (draft) {
		try {
			products = JSON.parse(draft).map(normalizeProduct);
			document.getElementById("draftBanner").hidden = false;
			return;
		} catch (e) {
			localStorage.removeItem(DRAFT_KEY);
		}
	}
	try {
		const res = await fetch(SITE_CONFIG.productsUrl, { cache: "no-store" });
		products = res.ok ? (await res.json()).map(normalizeProduct) : [];
	} catch (e) {
		console.error(e);
		products = [];
	}
}

function downloadJson() {
	const blob = new Blob([JSON.stringify(products, null, "\t")], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "products.json";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

async function copyJson() {
	try {
		await navigator.clipboard.writeText(JSON.stringify(products, null, "\t"));
		alert("JSON copied to clipboard.");
	} catch (e) {
		alert("Could not copy automatically. Use the Download button instead.");
	}
}

(function init() {
	loadInitialProducts().then(renderTable);
	renderImageList();

	document.getElementById("addUrlBtn").addEventListener("click", () => {
		const input = document.getElementById("imageUrl");
		const url = input.value.trim();
		if (!url) return;
		formImages.push(url);
		input.value = "";
		renderImageList();
	});

	document.getElementById("imageFile").addEventListener("change", async e => {
		const files = Array.from(e.target.files || []);
		for (const file of files) {
			try {
				formImages.push(await fileToCompressedDataUrl(file));
			} catch (err) {
				console.error(err);
			}
		}
		e.target.value = "";
		renderImageList();
	});

	document.getElementById("imageList").addEventListener("click", e => {
		const moveBtn = e.target.closest(".img-move");
		const removeBtn = e.target.closest(".img-remove");
		if (moveBtn) {
			const i = parseInt(moveBtn.dataset.index, 10);
			const j = i + parseInt(moveBtn.dataset.dir, 10);
			if (j < 0 || j >= formImages.length) return;
			[formImages[i], formImages[j]] = [formImages[j], formImages[i]];
			renderImageList();
		} else if (removeBtn) {
			const i = parseInt(removeBtn.dataset.index, 10);
			formImages.splice(i, 1);
			renderImageList();
		}
	});

	document.getElementById("productForm").addEventListener("submit", e => {
		e.preventDefault();
		const editingId = document.getElementById("editingId").value;
		const title = document.getElementById("title").value.trim();
		const price = parseFloat(document.getElementById("price").value);
		const description = document.getElementById("description").value.trim();
		const sold = document.getElementById("sold").checked;
		const images = formImages.slice();

		if (!title || isNaN(price)) return;

		if (editingId) {
			const p = products.find(x => x.id === editingId);
			Object.assign(p, { title, price, description, images, sold });
		} else {
			products.push({ id: makeId(), title, price, description, images, sold });
		}

		saveDraft();
		renderTable();
		resetForm();
	});

	document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

	document.getElementById("productTableBody").addEventListener("click", e => {
		const btn = e.target.closest("button[data-action]");
		if (!btn) return;
		const id = btn.closest("tr").dataset.id;
		const action = btn.dataset.action;

		if (action === "delete") {
			if (!confirm("Delete this product?")) return;
			products = products.filter(p => p.id !== id);
			saveDraft();
			renderTable();
		} else if (action === "toggle-sold") {
			const p = products.find(x => x.id === id);
			p.sold = !p.sold;
			saveDraft();
			renderTable();
		} else if (action === "edit") {
			startEdit(id);
		}
	});

	document.getElementById("downloadBtn").addEventListener("click", downloadJson);
	document.getElementById("copyBtn").addEventListener("click", copyJson);

	document.getElementById("discardDraftBtn").addEventListener("click", async () => {
		if (!confirm("Discard unsaved changes and reload products.json?")) return;
		localStorage.removeItem(DRAFT_KEY);
		document.getElementById("draftBanner").hidden = true;
		try {
			const res = await fetch(SITE_CONFIG.productsUrl, { cache: "no-store" });
			products = res.ok ? (await res.json()).map(normalizeProduct) : [];
		} catch (e) {
			products = [];
		}
		renderTable();
	});
})();
