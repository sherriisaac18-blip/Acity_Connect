document.addEventListener("DOMContentLoaded", () => {

    // REGISTER
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.querySelector("input[name='name']").value;
            const email = document.querySelectorAll("input")[1].value;

            if (!email.endsWith("@acity.edu")) {
                alert("Use your ACity email");
                return;
            }

            const user = { name, email };
            localStorage.setItem("user", JSON.stringify(user));

            alert("Registration successful");
            window.location.href = "index.html";
        });
    }

    // DISPLAY LISTINGS
    const container = document.getElementById("listings");
    if (container) {
        let listings = JSON.parse(localStorage.getItem("listings")) || [];

        listings.forEach(item => {
            const div = document.createElement("div");
            div.className = "card";

            div.innerHTML = `
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Status:</strong> ${item.status}</p>
            `;

            container.appendChild(div);
        });
    }

    // CREATE LISTING
    const listingForm = document.getElementById("listingForm");
    if (listingForm) {
        listingForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const title = document.querySelector("input[placeholder='Title']").value;
            const description = document.querySelector("input[placeholder='Description']").value;
            const category = document.querySelectorAll("select")[0].value;
            const status = document.querySelectorAll("select")[1].value;

            const listing = { title, description, category, status };

            let listings = JSON.parse(localStorage.getItem("listings")) || [];
            listings.push(listing);

            localStorage.setItem("listings", JSON.stringify(listings));

            alert("Listing created!");
            window.location.href = "marketplace.html";
        });
    }

    // SEARCH
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("keyup", function () {
            let value = this.value.toLowerCase();
            let cards = document.querySelectorAll(".card");

            cards.forEach(card => {
                let text = card.innerText.toLowerCase();
                card.style.display = text.includes(value) ? "block" : "none";
            });
        });
    }

});