const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const ACITY_DOMAINS = ["@acity.edu", "@acity.edu.gh", "@acity.ac.gh"];
const sessions = {};

const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
};

function seedData() {
    return {
        users: [
            {
                id: "admin-user",
                name: "Acity Admin",
                email: "admin@acity.edu.gh",
                passwordHash: hashPassword("admin123"),
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
                passwordHash: hashPassword("password123"),
                roll: "ACITY001",
                role: "student",
                bio: "Computer Science student",
                skillsOffered: "Python tutoring",
                skillsNeeded: "Public speaking"
            }
        ],
        listings: [
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
        ],
        interactions: []
    };
}

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        writeData(seedData());
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, data, extraHeaders = {}) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        ...extraHeaders
    });
    res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
    sendJson(res, status, { message });
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (body.length > 1000000) {
                reject(new Error("Request body is too large."));
            }
        });
        req.on("end", () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error("Invalid JSON."));
            }
        });
    });
}

function cookies(req) {
    return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map(cookie => {
        const [key, ...value] = cookie.trim().split("=");
        return [key, decodeURIComponent(value.join("="))];
    }));
}

function publicUser(user) {
    if (!user) return null;
    const { password, passwordHash, ...safeUser } = user;
    return safeUser;
}

function hashPassword(password) {
    return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function currentUser(req, data) {
    const token = cookies(req).acity_session;
    const email = sessions[token];
    return data.users.find(user => user.email === email);
}

function requireUser(req, res, data) {
    const user = currentUser(req, data);
    if (!user) {
        sendError(res, 401, "Please login first.");
        return null;
    }
    return user;
}

function requireAdmin(req, res, data) {
    const user = requireUser(req, res, data);
    if (!user) return null;
    if (user.role !== "admin") {
        sendError(res, 403, "Admin access only.");
        return null;
    }
    return user;
}

function createSession(res, user) {
    const token = crypto.randomBytes(24).toString("hex");
    sessions[token] = user.email;
    return {
        "Set-Cookie": `acity_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
    };
}

function clearSession(req) {
    const token = cookies(req).acity_session;
    delete sessions[token];
    return {
        "Set-Cookie": "acity_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    };
}

function isInstitutionalEmail(email) {
    return ACITY_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
}

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function handleApi(req, res, pathname) {
    const data = readData();

    if (req.method === "GET" && pathname === "/api/me") {
        sendJson(res, 200, { user: publicUser(currentUser(req, data)) });
        return;
    }

    if (req.method === "POST" && pathname === "/api/register") {
        const body = await parseBody(req);
        const email = String(body.email || "").trim().toLowerCase();

        if (!isInstitutionalEmail(email)) {
            sendError(res, 400, "Registration is restricted to valid Academic City email addresses.");
            return;
        }

        if (data.users.some(user => user.email === email)) {
            sendError(res, 409, "This email is already registered. Please login instead.");
            return;
        }

        const user = {
            id: makeId("user"),
            name: String(body.name || "").trim(),
            email,
            roll: String(body.roll || "").trim(),
            passwordHash: hashPassword(body.password || ""),
            role: "student",
            bio: "",
            skillsOffered: String(body.skillsOffered || "").trim(),
            skillsNeeded: String(body.skillsNeeded || "").trim()
        };

        data.users.push(user);
        writeData(data);
        sendJson(res, 201, { user: publicUser(user) }, createSession(res, user));
        return;
    }

    if (req.method === "POST" && pathname === "/api/login") {
        const body = await parseBody(req);
        const email = String(body.email || "").trim().toLowerCase();
        const passwordHash = hashPassword(body.password || "");
        const user = data.users.find(savedUser => {
            return savedUser.email === email && (savedUser.passwordHash === passwordHash || savedUser.password === body.password);
        });

        if (!user) {
            sendError(res, 401, "Invalid login details.");
            return;
        }

        sendJson(res, 200, { user: publicUser(user) }, createSession(res, user));
        return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
        sendJson(res, 200, { message: "Logged out." }, clearSession(req));
        return;
    }

    if (req.method === "PATCH" && pathname === "/api/profile") {
        const user = requireUser(req, res, data);
        if (!user) return;

        const body = await parseBody(req);
        Object.assign(user, {
            name: String(body.name || "").trim(),
            roll: String(body.roll || "").trim(),
            bio: String(body.bio || "").trim(),
            skillsOffered: String(body.skillsOffered || "").trim(),
            skillsNeeded: String(body.skillsNeeded || "").trim()
        });

        writeData(data);
        sendJson(res, 200, { user: publicUser(user) });
        return;
    }

    if (req.method === "GET" && pathname === "/api/listings") {
        sendJson(res, 200, {
            listings: data.listings.filter(listing => listing.approval === "Approved" && !listing.flagged)
        });
        return;
    }

    if (req.method === "POST" && pathname === "/api/listings") {
        const user = requireUser(req, res, data);
        if (!user) return;

        const body = await parseBody(req);
        const listing = {
            id: makeId("listing"),
            title: String(body.title || "").trim(),
            description: String(body.description || "").trim(),
            category: body.category === "Skill" ? "Skill" : "Item",
            type: body.type === "Request" ? "Request" : "Offer",
            status: ["Available", "Sold", "Swapped"].includes(body.status) ? body.status : "Available",
            approval: user.role === "admin" ? "Approved" : "Pending",
            flagged: false,
            ownerEmail: user.email
        };

        data.listings.push(listing);
        writeData(data);
        sendJson(res, 201, { listing });
        return;
    }

    if (req.method === "GET" && pathname === "/api/interactions") {
        const user = requireUser(req, res, data);
        if (!user) return;

        const interactions = data.interactions.filter(interaction => {
            return user.role === "admin" || interaction.requesterEmail === user.email || interaction.ownerEmail === user.email;
        });
        sendJson(res, 200, { interactions });
        return;
    }

    if (req.method === "POST" && pathname === "/api/interactions") {
        const user = requireUser(req, res, data);
        if (!user) return;

        const body = await parseBody(req);
        const listing = data.listings.find(item => item.id === body.listingId && item.approval === "Approved" && !item.flagged);
        if (!listing) {
            sendError(res, 404, "Listing not found.");
            return;
        }

        const interaction = {
            id: makeId("request"),
            listingId: listing.id,
            listingTitle: listing.title,
            requesterEmail: user.email,
            ownerEmail: listing.ownerEmail,
            message: `${user.name} is interested in ${listing.title}.`,
            status: "Pending"
        };

        data.interactions.push(interaction);
        writeData(data);
        sendJson(res, 201, { interaction });
        return;
    }

    const interactionMatch = pathname.match(/^\/api\/interactions\/([^/]+)$/);
    if (req.method === "PATCH" && interactionMatch) {
        const user = requireUser(req, res, data);
        if (!user) return;

        const interaction = data.interactions.find(item => item.id === interactionMatch[1]);
        if (!interaction) {
            sendError(res, 404, "Request not found.");
            return;
        }

        if (user.role !== "admin" && interaction.ownerEmail !== user.email) {
            sendError(res, 403, "You can only update requests for your own listings.");
            return;
        }

        const body = await parseBody(req);
        interaction.status = body.status === "Accepted" ? "Accepted" : "Rejected";
        writeData(data);
        sendJson(res, 200, { interaction });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/stats") {
        if (!requireAdmin(req, res, data)) return;
        sendJson(res, 200, {
            listings: data.listings.length,
            interactions: data.interactions.length,
            pending: data.listings.filter(item => item.approval === "Pending").length,
            flagged: data.listings.filter(item => item.flagged).length
        });
        return;
    }

    if (req.method === "GET" && pathname === "/api/admin/listings") {
        if (!requireAdmin(req, res, data)) return;
        sendJson(res, 200, { listings: data.listings });
        return;
    }

    const adminListingMatch = pathname.match(/^\/api\/admin\/listings\/([^/]+)$/);
    if (adminListingMatch) {
        if (!requireAdmin(req, res, data)) return;

        const listing = data.listings.find(item => item.id === adminListingMatch[1]);
        if (!listing) {
            sendError(res, 404, "Listing not found.");
            return;
        }

        if (req.method === "PATCH") {
            const body = await parseBody(req);
            Object.assign(listing, {
                title: body.title === undefined ? listing.title : String(body.title).trim(),
                description: body.description === undefined ? listing.description : String(body.description).trim(),
                approval: body.approval === undefined ? listing.approval : body.approval,
                flagged: body.flagged === undefined ? listing.flagged : Boolean(body.flagged)
            });
            writeData(data);
            sendJson(res, 200, { listing });
            return;
        }

        if (req.method === "DELETE") {
            data.listings = data.listings.filter(item => item.id !== listing.id);
            data.interactions = data.interactions.filter(item => item.listingId !== listing.id);
            writeData(data);
            sendJson(res, 200, { message: "Listing deleted." });
            return;
        }
    }

    sendError(res, 404, "API route not found.");
}

function serveStatic(req, res, pathname) {
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.join(__dirname, requestedPath);

    if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
    }

    const extension = path.extname(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (pathname.startsWith("/api/")) {
            await handleApi(req, res, pathname);
            return;
        }

        serveStatic(req, res, pathname);
    } catch (error) {
        sendError(res, 500, error.message);
    }
});

server.listen(PORT, () => {
    console.log(`Acity Connect server running on port ${PORT}`);
});
