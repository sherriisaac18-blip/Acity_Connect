document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUser();
    updateNavigation();
    setupRegistration();
    setupLogin();
    setupListingForm();
    setupListings();
    setupProfile();
    setupInteractions();
    setupAdmin();
});

let loggedInUser = null;

async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

async function loadCurrentUser() {
    try {
        const data = await apiRequest("/api/me");
        loggedInUser = data.user;
    } catch {
        loggedInUser = null;
    }
}

function currentUser() {
    return loggedInUser;
}

function updateNavigation() {
    document.querySelectorAll(".links").forEach(nav => {
        const loginLink = nav.querySelector("a[href='login.html']");
        if (loginLink && loggedInUser) {
            loginLink.textContent = loggedInUser.role === "admin" ? "Admin Login" : "Logged In";
        }
    });
}

function setupRegistration() {
    const registerForm = document.getElementById("registerForm");
    if (!registerForm) return;

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const user = {
            name: registerForm.elements.name.value.trim(),
            email: registerForm.elements.email.value.trim().toLowerCase(),
            roll: registerForm.elements.roll.value.trim(),
            password: registerForm.elements.password.value,
            skillsOffered: registerForm.elements.skillsOffered.value.trim(),
            skillsNeeded: registerForm.elements.skillsNeeded.value.trim()
        };

        try {
            const data = await apiRequest("/api/register", {
                method: "POST",
                body: JSON.stringify(user)
            });
            loggedInUser = data.user;
            alert("Registration successful. Your profile has been created.");
            window.location.href = "profile.html";
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupLogin() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        try {
            const data = await apiRequest("/api/login", {
                method: "POST",
                body: JSON.stringify({
                    email: loginForm.elements.email.value.trim().toLowerCase(),
                    password: loginForm.elements.password.value
                })
            });
            loggedInUser = data.user;
            alert("Login successful.");
            window.location.href = loggedInUser.role === "admin" ? "admin.html" : "marketplace.html";
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupListingForm() {
    const listingForm = document.getElementById("listingForm");
    if (!listingForm) return;

    listingForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!currentUser()) {
            alert("Please login before creating a listing.");
            window.location.href = "login.html";
            return;
        }

        try {
            await apiRequest("/api/listings", {
                method: "POST",
                body: JSON.stringify({
                    title: listingForm.elements.title.value.trim(),
                    description: listingForm.elements.description.value.trim(),
                    category: listingForm.elements.category.value,
                    type: listingForm.elements.type.value,
                    status: listingForm.elements.status.value
                })
            });
            alert("Listing created. It will appear after admin approval.");
            window.location.href = "marketplace.html";
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupListings() {
    const marketplaceContainer = document.getElementById("listings");
    const skillContainer = document.getElementById("skillListings");
    if (!marketplaceContainer && !skillContainer) return;

    const render = async () => {
        const container = marketplaceContainer || skillContainer;
        const search = document.getElementById("search")?.value.toLowerCase() || "";
        const category = document.getElementById("categoryFilter")?.value || (skillContainer ? "Skill" : "All");
        const status = document.getElementById("statusFilter")?.value || "All";

        try {
            const data = await apiRequest("/api/listings");
            const filtered = data.listings.filter(listing => {
                const matchesSearch = `${listing.title} ${listing.description} ${listing.category}`.toLowerCase().includes(search);
                const matchesCategory = category === "All" || listing.category === category;
                const matchesStatus = status === "All" || listing.status === status;
                return matchesSearch && matchesCategory && matchesStatus;
            });

            container.innerHTML = filtered.length ? "" : "<p>No listings match your search.</p>";
            filtered.forEach(listing => container.appendChild(listingCard(listing)));
        } catch (error) {
            container.innerHTML = `<p>${error.message}</p>`;
        }
    };

    ["search", "categoryFilter", "statusFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", render);
        document.getElementById(id)?.addEventListener("change", render);
    });

    render();
}

function listingCard(listing) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
        <span class="badge">${listing.type} ${listing.category}</span>
        <h3>${listing.title}</h3>
        <p>${listing.description}</p>
        <p><strong>Status:</strong> ${listing.status}</p>
        <p><strong>Posted by:</strong> ${listing.ownerEmail}</p>
        <button data-interest="${listing.id}">Interested</button>
    `;

    div.querySelector("[data-interest]").addEventListener("click", () => expressInterest(listing.id));
    return div;
}

async function expressInterest(listingId) {
    if (!currentUser()) {
        alert("Please login before expressing interest.");
        window.location.href = "login.html";
        return;
    }

    try {
        await apiRequest("/api/interactions", {
            method: "POST",
            body: JSON.stringify({ listingId })
        });
        alert("Interest sent. Track the request on the Requests page.");
    } catch (error) {
        alert(error.message);
    }
}

function setupProfile() {
    const profileForm = document.getElementById("profileForm");
    if (!profileForm) return;

    const user = currentUser();
    if (!user) {
        document.getElementById("profileNotice").textContent = "Please login to view and update your profile.";
        profileForm.querySelectorAll("input, textarea, button").forEach(field => field.disabled = true);
        return;
    }

    profileForm.elements.name.value = user.name || "";
    profileForm.elements.email.value = user.email || "";
    profileForm.elements.roll.value = user.roll || "";
    profileForm.elements.bio.value = user.bio || "";
    profileForm.elements.skillsOffered.value = user.skillsOffered || "";
    profileForm.elements.skillsNeeded.value = user.skillsNeeded || "";

    profileForm.addEventListener("submit", async event => {
        event.preventDefault();

        try {
            const data = await apiRequest("/api/profile", {
                method: "PATCH",
                body: JSON.stringify({
                    name: profileForm.elements.name.value.trim(),
                    roll: profileForm.elements.roll.value.trim(),
                    bio: profileForm.elements.bio.value.trim(),
                    skillsOffered: profileForm.elements.skillsOffered.value.trim(),
                    skillsNeeded: profileForm.elements.skillsNeeded.value.trim()
                })
            });
            loggedInUser = data.user;
            alert("Profile updated.");
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("logoutButton").addEventListener("click", async () => {
        await apiRequest("/api/logout", { method: "POST" });
        loggedInUser = null;
        alert("You have logged out.");
        window.location.href = "index.html";
    });
}

async function setupInteractions() {
    const list = document.getElementById("interactionList");
    if (!list) return;

    if (!currentUser()) {
        list.innerHTML = "<p>Please login to track your trade requests.</p>";
        return;
    }

    try {
        const data = await apiRequest("/api/interactions");
        list.innerHTML = data.interactions.length ? "" : "<p>No requests yet.</p>";
        data.interactions.forEach(interaction => {
            const card = document.createElement("div");
            card.className = "card compact-card";
            card.innerHTML = `
                <h3>${interaction.listingTitle}</h3>
                <p>${interaction.message}</p>
                <p><strong>From:</strong> ${interaction.requesterEmail}</p>
                <p><strong>To:</strong> ${interaction.ownerEmail}</p>
                <p><strong>Status:</strong> ${interaction.status}</p>
            `;

            if (interaction.ownerEmail === currentUser().email || currentUser().role === "admin") {
                const approveButton = document.createElement("button");
                approveButton.textContent = "Accept";
                approveButton.addEventListener("click", () => updateInteraction(interaction.id, "Accepted"));
                card.appendChild(approveButton);

                const rejectButton = document.createElement("button");
                rejectButton.textContent = "Reject";
                rejectButton.addEventListener("click", () => updateInteraction(interaction.id, "Rejected"));
                card.appendChild(rejectButton);
            }

            list.appendChild(card);
        });
    } catch (error) {
        list.innerHTML = `<p>${error.message}</p>`;
    }
}

async function updateInteraction(id, status) {
    await apiRequest(`/api/interactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
    window.location.reload();
}

async function setupAdmin() {
    const adminListings = document.getElementById("adminListings");
    if (!adminListings) return;

    const notice = document.getElementById("adminNotice");
    if (!currentUser() || currentUser().role !== "admin") {
        notice.textContent = "Admin access only. Login with admin@acity.edu.gh / admin123.";
        adminListings.innerHTML = "";
        return;
    }

    try {
        const stats = await apiRequest("/api/admin/stats");
        document.getElementById("activityStats").innerHTML = `
            <div><strong>${stats.listings}</strong><span>Listings</span></div>
            <div><strong>${stats.interactions}</strong><span>Interactions</span></div>
            <div><strong>${stats.pending}</strong><span>Pending</span></div>
            <div><strong>${stats.flagged}</strong><span>Flagged</span></div>
        `;

        const data = await apiRequest("/api/admin/listings");
        adminListings.innerHTML = data.listings.length ? "" : "<p>No listings to moderate.</p>";
        data.listings.forEach(listing => {
            const card = document.createElement("div");
            card.className = "card compact-card";
            card.innerHTML = `
                <span class="badge">${listing.approval}${listing.flagged ? " | Flagged" : ""}</span>
                <h3>${listing.title}</h3>
                <p>${listing.description}</p>
                <p><strong>Category:</strong> ${listing.category}</p>
                <p><strong>Status:</strong> ${listing.status}</p>
                <p><strong>Owner:</strong> ${listing.ownerEmail}</p>
                <button data-action="approve">Approve</button>
                <button data-action="edit">Edit</button>
                <button data-action="flag">Flag</button>
                <button data-action="delete">Delete</button>
            `;

            card.querySelector("[data-action='approve']").addEventListener("click", () => updateListing(listing.id, { approval: "Approved", flagged: false }));
            card.querySelector("[data-action='edit']").addEventListener("click", () => editListing(listing));
            card.querySelector("[data-action='flag']").addEventListener("click", () => updateListing(listing.id, { flagged: true }));
            card.querySelector("[data-action='delete']").addEventListener("click", () => deleteListing(listing.id));
            adminListings.appendChild(card);
        });
    } catch (error) {
        notice.textContent = error.message;
    }
}

async function updateListing(id, updates) {
    await apiRequest(`/api/admin/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
    });
    window.location.reload();
}

function editListing(listing) {
    const title = prompt("Edit title", listing.title);
    if (title === null) return;
    const description = prompt("Edit description", listing.description);
    if (description === null) return;
    updateListing(listing.id, { title: title.trim(), description: description.trim() });
}

async function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    await apiRequest(`/api/admin/listings/${id}`, { method: "DELETE" });
    window.location.reload();
}
