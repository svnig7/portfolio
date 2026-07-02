// ======================================
// TMDb Telegram Bot
// Cloudflare Worker
// Part 1/3
// ======================================

const TG = "https://api.telegram.org";
const TMDB = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p/w500";

// ----------------------------
// Telegram API
// ----------------------------

async function telegram(env, method, body) {
  const res = await fetch(
    `${TG}/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  return res.json();
}

async function sendMessage(env, chatId, text) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

async function sendPhoto(env, chatId, photo, caption) {
  return telegram(env, "sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML"
  });
}

// ----------------------------
// TMDb Search
// ----------------------------

async function tmdbSearch(env, type, query) {

  const url =
    `${TMDB}/search/${type}` +
    `?api_key=${env.TMDB_API_KEY}` +
    `&query=${encodeURIComponent(query)}`;

  const res = await fetch(url);

  if (!res.ok)
    return null;

  const data = await res.json();

  if (!data.results || data.results.length === 0)
    return null;

  return data.results[0];
}

function poster(path) {
  if (!path) return null;
  return IMAGE + path;
}

// ----------------------------
// Movie
// ----------------------------

async function movie(env, chatId, query) {

  const data = await tmdbSearch(env, "movie", query);

  if (!data) {
    return sendMessage(env, chatId, "❌ Movie not found.");
  }

  const text =
`🎬 <b>${data.title}</b>

⭐ Rating: ${data.vote_average}

📅 Release:
${data.release_date || "Unknown"}

📝
${data.overview || "No overview available."}`;

  const img = poster(data.poster_path);

  if (img)
    return sendPhoto(env, chatId, img, text);

  return sendMessage(env, chatId, text);
}

// ======================================
// Part 2 continues below...
// ======================================

  // ======================================
// Part 2/3
// ======================================

// ----------------------------
// TV Search
// ----------------------------

async function tv(env, chatId, query) {

  const data = await tmdbSearch(env, "tv", query);

  if (!data) {
    return sendMessage(env, chatId, "❌ TV Show not found.");
  }

  const text =
`📺 <b>${data.name}</b>

⭐ Rating: ${data.vote_average}

📅 First Air Date:
${data.first_air_date || "Unknown"}

📝
${data.overview || "No overview available."}`;

  const img = poster(data.poster_path);

  if (img)
    return sendPhoto(env, chatId, img, text);

  return sendMessage(env, chatId, text);
}

// ----------------------------
// Person Search
// ----------------------------

async function person(env, chatId, query) {

  const data = await tmdbSearch(env, "person", query);

  if (!data) {
    return sendMessage(env, chatId, "❌ Person not found.");
  }

  const text =
`🎭 <b>${data.name}</b>

Known For:
${data.known_for_department || "Unknown"}

Popularity:
${Math.round(data.popularity || 0)}`;

  const img = poster(data.profile_path);

  if (img)
    return sendPhoto(env, chatId, img, text);

  return sendMessage(env, chatId, text);
}

// ----------------------------
// Command Handler
// ----------------------------

async function handleCommand(env, chatId, text) {

  if (!text) return;

  if (text === "/start") {

    return sendMessage(
      env,
      chatId,
`🎬 <b>Welcome to TMDb Bot</b>

Commands:

/movie Movie Name
/tv TV Show Name
/person Person Name

Examples:

/movie Avatar
/tv Breaking Bad
/person Tom Cruise`
    );

  }

  if (text.startsWith("/movie ")) {
    return movie(
      env,
      chatId,
      text.substring(7).trim()
    );
  }

  if (text.startsWith("/tv ")) {
    return tv(
      env,
      chatId,
      text.substring(4).trim()
    );
  }

  if (text.startsWith("/person ")) {
    return person(
      env,
      chatId,
      text.substring(8).trim()
    );
  }

  return sendMessage(
    env,
    chatId,
`❓ Unknown command.

Use:

/movie Movie Name
/tv TV Show Name
/person Person Name`
  );

}

// ======================================
// Part 3 continues below...
// ======================================

  // ======================================
// Part 3/3
// Cloudflare Worker Entry
// ======================================

export default {
  async fetch(request, env) {

    // Health check
    if (request.method === "GET") {
      return new Response(
        "✅ TMDb Telegram Bot is running!",
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        }
      );
    }

    // Only allow POST from Telegram
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405
      });
    }

    try {

      const update = await request.json();

      // Ignore non-message updates
      if (!update.message) {
        return new Response("OK");
      }

      const chatId = update.message.chat.id;
      const text = (update.message.text || "").trim();

      await handleCommand(env, chatId, text);

      return new Response("OK");

    } catch (error) {

      console.error(error);

      return new Response("Internal Server Error", {
        status: 500
      });

    }

  }
};
