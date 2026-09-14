/* Zippr site — small progressive-enhancement helpers */
(function () {
  "use strict";

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("is-open");
    });
  }

  /* ---- Code sample tabs (Developers page) ---- */
  var tabs = document.querySelectorAll(".code-tab");
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-target");
        tabs.forEach(function (t) { t.classList.toggle("is-active", t === tab); });
        document.querySelectorAll(".code-panel").forEach(function (panel) {
          panel.hidden = panel.id !== target;
        });
      });
    });
  }

  /* ---- Copy-to-clipboard ---- */
  var copyBtn = document.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var active = document.querySelector(".code-panel:not([hidden]) code");
      if (!active) return;
      navigator.clipboard.writeText(active.innerText).then(function () {
        var original = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = original; }, 1600);
      }).catch(function () {
        copyBtn.textContent = "Press Ctrl+C";
      });
    });
  }

  /* ---- Notify form (Contact page) ---- */
  var form = document.querySelector("#notify-form");
  if (form) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(field, on) {
      field.classList.toggle("has-error", on);
    }

    function showSubmitError(message) {
      var el = form.querySelector(".submit-error");
      if (!el) {
        el = document.createElement("p");
        el.className = "submit-error";
        form.querySelector('button[type="submit"]').insertAdjacentElement("beforebegin", el);
      }
      el.textContent = message;
    }

    function clearSubmitError() {
      var el = form.querySelector(".submit-error");
      if (el) el.remove();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements.email;
      var consent = form.elements.consent;
      var valid = true;

      if (!emailRe.test(email.value.trim())) { setError(email.closest(".field"), true); valid = false; }
      else setError(email.closest(".field"), false);

      if (consent && !consent.checked) {
        setError(consent.closest(".field"), true);
        valid = false;
      } else if (consent) {
        setError(consent.closest(".field"), false);
      }

      if (!valid) return;

      clearSubmitError();
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      /* Sign-ups go through our own server, which holds the Kit API key —
         see server/README.md. The key never reaches the browser. */
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value.trim(), consent: consent.checked })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
            return data;
          });
        })
        .then(function () {
          form.closest(".form-card").classList.add("is-submitted");
        })
        .catch(function (err) {
          showSubmitError(err.message || "Something went wrong. Please try again.");
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }

  /* ---- Active nav link ---- */
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === here || (here === "" && href === "index.html")) {
      a.classList.add("is-active");
    }
  });
})();
