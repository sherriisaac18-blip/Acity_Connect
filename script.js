document.addEventListener("DOMContentLoaded", () => {
    seedDemoData();
    updateNavigation();
    setupRegistration();
    setupLogin();
    setupListingForm();
    setupListings();
    setupProfile();
    setupInteractions();
    setupAdmin();
});

const ACITY_DOMAINS = ["@acity.edu", "@acity.edu.gh", "@acity.ac.gh"];

function getData(key, fallback) {
    return JSON.parse(localStorage.getItem(key)) || fallback;
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function currentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
}

function isInstitutionalEmail(email) {
    return ACITY_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
}

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function seedDemoData() {
    const users = getData("users", []);
    if (!users.length) {
        setData("users", [
            {
                id: "admin-user",
                name: "Acity Admin",
                email: "admin@acity.edu.gh",
                password: "admin123",
                roll: "ADMIN001",
                role: "admin",
                bio: "Platform moderator",
                skillsOffered: "Moderation, campus support",
                skillsNeeded: ""
            },
            {
                id: "student-user",
                name: "Test Student",
                email: "student@acity.edu.gh",
                password: "password123",
                roll: "ACITY001",
                role: "student",
                bio: "Computer Science student",
                skillsOffered: "Python tutoring",
                skillsNeeded: "Public speaking"
            }
        ]);
    }

    const listings = getData("listings", []);
    if (!listings.length) {
        setData("listings", [
            {
                id: "listing-laptop",
                title: "HP Laptop",
                description: "Clean second-hand laptop for assignments and coding. Price: GHS 3,500.",
                category: "Item",
                type: "Offer",
                status: "Available",
                approval: "Approved",
                flagged: false,
                ownerEmail: "student@acity.edu.gh"
            },
            {
                id: "listing-textbook",
                title: "Engineering Mathematics Textbook",
                description: "Lightly used textbook available for sale near the library. Price: GHS 120.",
                category: "Item",
                type: "Offer",
                status: "Available",
                approval: "Approved",
                flagged: false,
                ownerEmail: "student@acity.edu.gh"
            },
            {
                id: "listing-tutoring",
                title: "Python Tutoring",
                description: "Offering beginner Python lessons for first-year students.",
                category: "Skill",
                type: "Offer",
                status: "Available",
                approval: "Approved",
                flagged: false,
                ownerEmail: "student@acity.edu.gh"
            }
        ]);
    }
}

function updateNavigation() {
    const user = currentUser();
    document.querySelectorAll(".links").forEach(nav => {
        if (user) {
            const loginLink = nav.querySelector("a[href='login.html']");
            if (loginLink) {
                loginLink.textContent = user.role === "admin" ? "Admin Login" : "Logged In";
            }
        }
    });
}

function setupRegistration() {
    const registerForm = document.getElementById("registerForm");
    if (!registerForm) return;

    registerForm.addEventListener("submit", event => {
        event.preventDefault();

        const user = {
            id: makeId("user"),
            name: registerForm.elements.name.value.trim(),
            email: registerForm.elements.email.value.trim().toLowerCase(),
            roll: registerForm.elements.roll.value.trim(),
            password: registerForm.elements.password.value,
            role: "student",
            bio: "",
            skillsOffered: registerForm.elements.skillsOffered.value.trim(),
            skillsNeeded: registerForm.elements.skillsNeeded.value.trim()
        };

        if (!isInstitutionalEmail(user.email)) {
            alert("Registration is restricted to valid Academic City email addresses.");
            return;
        }

        const users = getData("users", []);
        if (users.some(existingUser => existingUser.email === user.email)) {
            alert("This email is already registered. Please login instead.");
            return;
        }

        users.push(user);
        setData("users", users);
        localStorage.setItem("currentUser", JSON.stringify(user));
        alert("Registration successful. Your profile has been created.");
        window.location.href = "profile.html";
    });
}

function setupLogin() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", event => {
        event.preventDefault();

        const email = loginForm.elements.email.value.trim().toLowerCase();
        const password = loginForm.elements.password.value;
        const user = getData("users", []).find(savedUser => savedUser.email === email && savedUser.password === password);

        if (!user) {
            alert("Invalid login details.");
            return;
        }

        localStorage.setItem("currentUser", JSON.stringify(user));
        alert("Login successful.");
        window.location.href = user.role === "admin" ? "admin.html" : "marketplace.html";
    });
}

function setupListingForm() {
    const listingForm = document.getElementById("listingForm");
    if (!listingForm) return;

    listingForm.addEventListener("submit", event => {
        event.preventDefault();
        const user = currentUser();

        if (!user) {
            alert("Please login before creating a listing.");
            window.location.href = "login.html";
            return;
        }

        const listing = {
            id: makeId("listing"),
            title: listingForm.elements.title.value.trim(),
            description: listingForm.elements.description.value.trim(),
            category: listingForm.elements.category.value,
            type: listingForm.elements.type.value,
            status: listingForm.elements.status.value,
            approval: user.role === "admin" ? "Approved" : "Pending",
            flagged: false,
            ownerEmail: user.email
        };

        const listings = getData("listings", []);
        listings.push(listing);
        setData("listings", listings);

        alert("Listing created. It will appear after admin approval.");
        window.location.href = "marketplace.html";
    });
}

function setupListings() {
    const marketplaceContainer = document.getElementById("listings");
    const skillContainer = document.getElementById("skillListings");
    if (!marketplaceContainer && !skillContainer) return;

    const render = () => {
        const container = marketplaceContainer || skillContainer;
        const search = document.getElementById("search")?.value.toLowerCase() || "";
        const category = document.getElementById("categoryFilter")?.value || (skillContainer ? "Skill" : "All");
        const status = document.getElementById("statusFilter")?.value || "All";
        const listings = getData("listings", []).filter(listing => listing.approval === "Approved" && !listing.flagged);

        const filtered = listings.filter(listing => {
            const matchesSearch = `${listing.title} ${listing.description} ${listing.category}`.toLowerCase().includes(search);
            const matchesCategory = category === "All" || listing.category === category;
            const matchesStatus = status === "All" || listing.status === status;
            return matchesSearch && matchesCategory && matchesStatus;
        });

        container.innerHTML = filtered.length ? "" : "<p>No listings match your search.</p>";
        filtered.forEach(listing => container.appendChild(listingCard(listing)));
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

function expressInterest(listingId) {
    const user = currentUser();
    if (!user) {
        alert("Please login before expressing interest.");
        window.location.href = "login.html";
        return;
    }

    const listings = getData("listings", []);
    const listing = listings.find(item => item.id === listingId);
    if (!listing) return;

    const interactions = getData("interactions", []);
    interactions.push({
        id: makeId("request"),
        listingId,
        listingTitle: listing.title,
        requesterEmail: user.email,
        ownerEmail: listing.ownerEmail,
        message: `${user.name} is interested in ${listing.title}.`,
        status: "Pending"
    });
    setData("interactions", interactions);
    alert("Interest sent. Track the request on the Requests page.");
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

    profileForm.addEventListener("submit", event => {
        event.preventDefault();
        const users = getData("users", []);
        const updatedUser = {
            ...user,
            name: profileForm.elements.name.value.trim(),
            roll: profileForm.elements.roll.value.trim(),
            bio: profileForm.elements.bio.value.trim(),
            skillsOffered: profileForm.elements.skillsOffered.value.trim(),
            skillsNeeded: profileForm.elements.skillsNeeded.value.trim()
        };

        setData("users", users.map(savedUser => savedUser.id === user.id ? updatedUser : savedUser));
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        alert("Profile updated.");
    });

    document.getElementById("logoutButton").addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        alert("You have logged out.");
        window.location.href = "index.html";
    });
}

function setupInteractions() {
    const list = document.getElementById("interactionList");
    if (!list) return;

    const user = currentUser();
    if (!user) {
        list.innerHTML = "<p>Please login to track your trade requests.</p>";
        return;
    }

    const interactions = getData("interactions", []).filter(interaction => {
        return user.role === "admin" || interaction.requesterEmail === user.email || interaction.ownerEmail === user.email;
    });

    list.innerHTML = interactions.length ? "" : "<p>No requests yet.</p>";
    interactions.forEach(interaction => {
        const card = document.createElement("div");
        card.className = "card compact-card";
        card.innerHTML = `
            <h3>${interaction.listingTitle}</h3>
            <p>${interaction.message}</p>
            <p><strong>From:</strong> ${interaction.requesterEmail}</p>
            <p><strong>To:</strong> ${interaction.ownerEmail}</p>
            <p><strong>Status:</strong> ${interaction.status}</p>
        `;

        if (interaction.ownerEmail === user.email || user.role === "admin") {
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
}

function updateInteraction(id, status) {
    const interactions = getData("interactions", []).map(interaction => {
        return interaction.id === id ? { ...interaction, status } : interaction;
    });
    setData("interactions", interactions);
    window.location.reload();
}

function setupAdmin() {
    const adminListings = document.getElementById("adminListings");
    if (!adminListings) return;

    const user = currentUser();
    const notice = document.getElementById("adminNotice");
    if (!user || user.role !== "admin") {
        notice.textContent = "Admin access only. Login with admin@acity.edu.gh / admin123.";
        adminListings.innerHTML = "";
        return;
    }

    const listings = getData("listings", []);
    const interactions = getData("interactions", []);
    document.getElementById("activityStats").innerHTML = `
        <div><strong>${listings.length}</strong><span>Listings</span></div>
        <div><strong>${interactions.length}</strong><span>Interactions</span></div>
        <div><strong>${listings.filter(item => item.approval === "Pending").length}</strong><span>Pending</span></div>
        <div><strong>${listings.filter(item => item.flagged).length}</strong><span>Flagged</span></div>
    `;

    adminListings.innerHTML = listings.length ? "" : "<p>No listings to moderate.</p>";
    listings.forEach(listing => {
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
}

function updateListing(id, updates) {
    const listings = getData("listings", []).map(listing => {
        return listing.id === id ? { ...listing, ...updates } : listing;
    });
    setData("listings", listings);
    window.location.reload();
}

function editListing(listing) {
    const title = prompt("Edit title", listing.title);
    if (title === null) return;
    const description = prompt("Edit description", listing.description);
    if (description === null) return;
    updateListing(listing.id, { title: title.trim(), description: description.trim() });
}

function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    setData("listings", getData("listings", []).filter(listing => listing.id !== id));
    window.location.reload();
}
