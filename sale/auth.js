// Simple client-side password gate for the admin page. This is a static
// site with no server, so this is only a light deterrent (anyone reading
// the page source can find the password) — not real security.
const ADMIN_PASSWORD = "marinaAdmin";
const AUTH_KEY = "saleAdminAuthed";

(function () {
	const gate = document.getElementById("authGate");
	const content = document.getElementById("adminContent");
	const form = document.getElementById("authForm");
	const input = document.getElementById("authPassword");
	const error = document.getElementById("authError");

	function unlock() {
		gate.hidden = true;
		content.hidden = false;
		document.body.style.overflow = "";
	}

	if (sessionStorage.getItem(AUTH_KEY) === "1") {
		unlock();
	} else {
		document.body.style.overflow = "hidden";
		input.focus();
	}

	form.addEventListener("submit", e => {
		e.preventDefault();
		if (input.value === ADMIN_PASSWORD) {
			sessionStorage.setItem(AUTH_KEY, "1");
			error.hidden = true;
			unlock();
		} else {
			error.hidden = false;
			input.value = "";
			input.focus();
		}
	});
})();
