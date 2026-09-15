// ---------------------------------------------------------------
// Tickets start empty — each one gets added when you use the
// "Generate Support Reply" form below. Swap this for a real
// fetch() to your backend once the Express API exists.
// ---------------------------------------------------------------
const tickets = [];
let nextTicketId = 1;

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
let currentFilter = "all";
let currentSort = "newest";
let searchTerm = "";
let currentPage = 1;
const PAGE_SIZE = 4;

// ---------------------------------------------------------------
// Element references
// ---------------------------------------------------------------
const ticketListEl = document.getElementById("ticketList");
const ticketCountEl = document.getElementById("ticketCount");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const filterBtns = document.querySelectorAll(".filter-btn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageNumberEl = document.getElementById("pageNumber");

const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statResolved = document.getElementById("statResolved");

const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const emailOutput = document.getElementById("emailOutput");
const confidenceScoreEl = document.getElementById("confidenceScore");

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
}

function getFilteredTickets() {
    let result = tickets.filter((t) => {
        const matchesFilter = currentFilter === "all" || t.status === currentFilter;
        const matchesSearch =
            t.customer.toLowerCase().includes(searchTerm) ||
            t.subject.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    result.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return currentSort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return result;
}

// ---------------------------------------------------------------
// Render
// ---------------------------------------------------------------
function renderStats() {
    statTotal.textContent = tickets.length;
    statPending.textContent = tickets.filter((t) => t.status === "pending").length;
    statResolved.textContent = tickets.filter((t) => t.status === "resolved").length;
}

function renderTickets() {
    const filtered = getFilteredTickets();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    // Keep currentPage in range if filtering/searching shrank the list
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    ticketCountEl.textContent = `${filtered.length} ticket${filtered.length === 1 ? "" : "s"}`;
    pageNumberEl.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    ticketListEl.innerHTML = "";

    if (pageItems.length === 0) {
        const message = tickets.length === 0
            ? "No tickets yet — use the form below to generate a reply and create one."
            : "No tickets match your search.";
        ticketListEl.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">${message}</p>`;
        return;
    }

    pageItems.forEach((ticket) => {
        const card = document.createElement("div");
        card.className = "ticket-card";
        card.innerHTML = `
            <div class="ticket-main">
                <div class="ticket-customer">${ticket.customer}</div>
                <div class="ticket-subject">${ticket.subject}</div>
                <div class="ticket-meta">${ticket.category} &bull; ${timeAgo(ticket.createdAt)}</div>
            </div>
            <div class="ticket-tags">
                <span class="tag tag-${ticket.priority}">${ticket.priority}</span>
                <span class="tag tag-${ticket.status}">${ticket.status}</span>
            </div>
        `;
        ticketListEl.appendChild(card);
    });
}

// ---------------------------------------------------------------
// Event listeners — search, sort, filter, pagination
// ---------------------------------------------------------------
searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTickets();
});

sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderTickets();
});

filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.status;
        currentPage = 1;
        renderTickets();
    });
});

prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage -= 1;
        renderTickets();
    }
});

nextBtn.addEventListener("click", () => {
    currentPage += 1;
    renderTickets();
});

// ---------------------------------------------------------------
// Reply generator — calls our backend, which calls the Gemini API.
// Backend URL: change this if your server runs somewhere else.
// ---------------------------------------------------------------
const API_BASE = "http://localhost:5000";

generateBtn.addEventListener("click", async () => {
    const name = document.getElementById("customerName").value.trim();
    const issue = document.getElementById("issue").value.trim();
    const priority = document.getElementById("priority").value;
    const tone = document.getElementById("tone").value;

    if (!issue) {
        emailOutput.innerHTML = `<p class="empty-message" style="color:var(--text-danger, #c0392b);">Please describe the customer's issue first.</p>`;
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
    emailOutput.innerHTML = `<p class="empty-message">Generating reply...</p>`;

    try {
        const res = await fetch(`${API_BASE}/api/generate-reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, issue, tone, priority }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Server error");
        }

        const data = await res.json();

        emailOutput.textContent = data.reply;
        confidenceScoreEl.textContent = `${data.confidence}%`;

        // Add this as a real ticket in the list above
        tickets.push({
            id: nextTicketId++,
            customer: name || "Anonymous customer",
            subject: issue.length > 60 ? issue.slice(0, 60) + "..." : issue,
            category: data.category || "General",
            status: "open",
            priority: priority,
            createdAt: new Date().toISOString(),
        });

        renderStats();
        renderTickets();
    } catch (err) {
        console.error(err);
        emailOutput.innerHTML = `<p class="empty-message" style="color:var(--text-danger, #c0392b);">${err.message || "Couldn't reach the AI server."}</p>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate AI Reply";
    }
});

copyBtn.addEventListener("click", () => {
    const text = emailOutput.textContent.trim();
    if (!text || emailOutput.querySelector(".empty-message")) return;

    navigator.clipboard.writeText(text).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = original), 1500);
    });
});

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
renderStats();
renderTickets();