(function () {
  "use strict";
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");

  // If already logged in, skip straight to the dashboard.
  fetch("/api/auth/status")
    .then((r) => r.json())
    .then((s) => {
      if (s.loggedIn) window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {});

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.remove("show");
    const password = document.getElementById("password").value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        msg.textContent = data.error || "Login failed.";
        msg.classList.add("show");
        return;
      }
      window.location.href = "/admin/dashboard.html";
    } catch (err) {
      msg.textContent = "Could not reach the server. Please try again.";
      msg.classList.add("show");
    }
  });
})();
