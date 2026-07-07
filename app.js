// ==============================
// TMDB Thumbnail Generator
// Part 1 - Variables & Search
// ==============================

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");

const seasonSelect = document.getElementById("seasonSelect");
const episodeInput = document.getElementById("episodeInput");
const tvSection = document.getElementById("tvSection");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const captionBox = document.getElementById("caption");
const statusBox = document.getElementById("status");

const hiddenPoster = document.getElementById("hiddenPoster");

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const telegramBtn = document.getElementById("telegramBtn");

canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;

// ==============================
// Search
// ==============================

searchBtn.onclick = searchTMDB;

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        searchTMDB();
    }
});

async function searchTMDB() {

    const query = searchInput.value.trim();

    if (!query) return;

    statusBox.innerText = "Searching...";

    results.innerHTML = "";

    tvSection.classList.add("hidden");

    const url =
`https://api.themoviedb.org/3/search/multi?api_key=${CONFIG.TMDB_API_KEY}&query=${encodeURIComponent(query)}`;

    const res = await fetch(url);

    const data = await res.json();

    displayResults(data.results || []);

    statusBox.innerText =
`${data.results.length} result(s) found`;

}

// ==============================
// Display Search Results
// ==============================

function displayResults(items) {

    results.innerHTML = "";

    if (!items.length) {
        results.innerHTML = "<p>No results found.</p>";
        return;
    }

    items.forEach(item => {

        // Ignore people
        if (item.media_type === "person") return;

        const card = document.createElement("div");
        card.className = "card";

        const title =
            item.title ||
            item.name ||
            "Unknown";

        const year =
            (item.release_date || item.first_air_date || "")
            .slice(0,4);

        const type =
            item.media_type === "movie"
                ? "🎬 Movie"
                : "📺 TV";

        const poster = item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster";

        card.innerHTML = `
            <img src="${poster}" alt="${title}">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-sub">${year}</div>
                <div class="card-sub">${type}</div>
            </div>
        `;

        card.onclick = () => {

            selectedItem = item;

            currentPoster = poster;

            if (item.media_type === "movie") {

                tvSection.classList.add("hidden");

                loadMovie(item.id);

            } else {

                tvSection.classList.remove("hidden");

                loadTV(item.id);

            }

        };

        results.appendChild(card);

    });

}

// ==============================
// Load Movie
// ==============================

async function loadMovie(movieId) {

    statusBox.innerText = "Loading movie...";

    const movieRes = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${CONFIG.TMDB_API_KEY}`
    );

    const movie = await movieRes.json();

    const extRes = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/external_ids?api_key=${CONFIG.TMDB_API_KEY}`
    );

    const ext = await extRes.json();

    selectedItem = movie;

    imdbId = ext.imdb_id || "N/A";

    genres = movie.genres.map(g => g.name).join(", ");

    releaseYear = movie.release_date
        ? movie.release_date.slice(0,4)
        : "";

    plot = movie.overview || "";

    currentPoster =
        `https://image.tmdb.org/t/p/original${movie.poster_path}`;

    statusBox.innerText = "Movie loaded.";

}

// ==============================
// Load TV
// ==============================

async function loadTV(tvId) {

    statusBox.innerText = "Loading TV show...";

    const tvRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}?api_key=${CONFIG.TMDB_API_KEY}`
    );

    const tv = await tvRes.json();

    const extRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tvId}/external_ids?api_key=${CONFIG.TMDB_API_KEY}`
    );

    const ext = await extRes.json();

    selectedItem = tv;

    imdbId = ext.imdb_id || "N/A";

    genres = tv.genres.map(g => g.name).join(", ");

    plot = tv.overview || "";

    seasonSelect.innerHTML =
        `<option value="">Select Season</option>`;

    tv.seasons.forEach(season => {

        if (season.season_number < 0) return;

        seasonSelect.innerHTML += `
            <option value="${season.season_number}">
                ${season.name}
            </option>
        `;

    });

    statusBox.innerText =
        "Select a season.";

}

// ==============================
// Load Season
// ==============================

seasonSelect.addEventListener("change", async () => {

    if (!seasonSelect.value) return;

    statusBox.innerText = "Loading season...";

    const seasonNumber = seasonSelect.value;

    const res = await fetch(
        `https://api.themoviedb.org/3/tv/${selectedItem.id}/season/${seasonNumber}?api_key=${CONFIG.TMDB_API_KEY}`
    );

    const season = await res.json();

    selectedSeason = season;

    // --------------------------
    // Season Poster
    // --------------------------

    if (season.poster_path) {

        currentPoster =
            `https://image.tmdb.org/t/p/original${season.poster_path}`;

    } else if (selectedItem.poster_path) {

        currentPoster =
            `https://image.tmdb.org/t/p/original${selectedItem.poster_path}`;

    }

    // --------------------------
    // Plot
    // Season -> TV -> Empty
    // --------------------------

    if (
        season.overview &&
        season.overview.trim() !== ""
    ) {

        plot = season.overview.trim();

    } else if (
        selectedItem.overview &&
        selectedItem.overview.trim() !== ""
    ) {

        plot = selectedItem.overview.trim();

    } else {

        plot = "";

    }

    // --------------------------
    // Year
    // --------------------------

    if (season.air_date) {

        releaseYear =
            season.air_date.substring(0,4);

    } else if (selectedItem.first_air_date) {

        releaseYear =
            selectedItem.first_air_date.substring(0,4);

    } else {

        releaseYear = "";

    }

    statusBox.innerText =
        "Season loaded successfully.";

});

// ==============================
// Generate Thumbnail & Caption
// ==============================

generateBtn.addEventListener("click", generateThumbnail);

async function generateThumbnail() {

    if (!currentPoster) {
        alert("Please select a movie or TV show.");
        return;
    }

    statusBox.innerText = "Generating thumbnail...";

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Stretch poster to 1280×720
        ctx.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Export image
        canvas.toBlob(blob => {
            generatedBlob = blob;
        }, "image/png");

        buildCaption();

        statusBox.innerText = "Thumbnail generated.";

    };

    img.onerror = () => {
        alert("Unable to load poster.");
    };

    img.src = currentPoster;

}

// ==============================
// Caption
// ==============================

function buildCaption() {

    // Telegram caption safety
    let shortPlot = plot || "";

    const MAX_PLOT = 750;

    if (shortPlot.length > MAX_PLOT) {
        shortPlot =
            shortPlot.substring(0, MAX_PLOT).trim() + "...";
    }

    // ==========================
    // Movie
    // ==========================

    if (selectedItem.title) {

        captionBox.value =
`🎬 Title : ${selectedItem.title}
📅 Year : ${releaseYear}
🎭 Genre : ${genres}
📝 Plot : ${shortPlot}
🆔 TMDB ID : ${selectedItem.id} | IMDb ID : ${imdbId}`;

        return;
    }

    // ==========================
    // TV
    // ==========================

    const episode =
        episodeInput.value || "1";

    const season =
        seasonSelect.value || "1";

    captionBox.value =
`📺 Title : ${selectedItem.name}
🎞 Season : ${season} | Episode : ${episode}
📅 Year : ${releaseYear}
🎭 Genre : ${genres}
📝 Plot : ${shortPlot}
🆔 TMDB ID : ${selectedItem.id} | IMDb ID : ${imdbId}`;

}

// ==============================
// Download PNG
// ==============================

downloadBtn.addEventListener("click", () => {

    if (!generatedBlob) {
        alert("Generate a thumbnail first.");
        return;
    }

    const url = URL.createObjectURL(generatedBlob);

    const a = document.createElement("a");

    const fileName =
        selectedItem.title ||
        selectedItem.name ||
        "thumbnail";

    a.href = url;
    a.download = `${fileName}-1280x720.png`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

});

// ==============================
// Upload to Telegram
// ==============================

telegramBtn.addEventListener("click", uploadTelegram);

async function uploadTelegram() {
async function uploadTelegram() {

    if (!generatedBlob) {
        alert("Generate a thumbnail first.");
        return;
    }

    if (!CONFIG.WORKER_URL) {
        alert("Set your Cloudflare Worker URL first.");
        return;
    }

    statusBox.innerText = "Uploading to Telegram...";

    try {

        const form = new FormData();

        form.append(
            "image",
            generatedBlob,
            "thumbnail.png"
        );

        form.append(
            "caption",
            captionBox.value
        );


        const response = await fetch(
            CONFIG.WORKER_URL,
            {
                method: "POST",
                body: form
            }
        );


        const result = await response.json();


        if (result.success) {

            statusBox.innerText =
                "✅ Uploaded successfully.";

        } else {

            statusBox.innerText =
                "❌ Upload failed.";

            alert(
                result.error || 
                "Telegram upload failed."
            );

        }


    } catch (err) {

        console.error(err);

        statusBox.innerText =
            "❌ Network error.";

        alert(err.message);

    }

}
