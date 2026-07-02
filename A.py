// ================================
// TMDb Telegram Bot
// Part 1/3
// ================================

interface Env {
  BOT_TOKEN: string;
  TMDB_API_KEY: string;
}

const TG = "https://api.telegram.org";
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

// --------------------
// Telegram API
// --------------------

async function telegram(
  env: Env,
  method: string,
  body: any
) {
  return fetch(`${TG}/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function sendMessage(
  env: Env,
  chatId: number,
  text: string
) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

async function sendPhoto(
  env: Env,
  chatId: number,
  photo: string,
  caption: string
) {
  return telegram(env, "sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML"
  });
}

// --------------------
// TMDb Search
// --------------------

async function tmdbSearch(
  env: Env,
  type: "movie" | "tv" | "person",
  query: string
) {
  const url =
    `${TMDB}/search/${type}` +
    `?api_key=${env.TMDB_API_KEY}` +
    `&query=${encodeURIComponent(query)}`;

  const res = await fetch(url);

  if (!res.ok) return null;

  const data: any = await res.json();

  if (!data.results || data.results.length === 0)
    return null;

  return data.results[0];
}

function poster(path?: string) {
  if (!path) return null;
  return `${IMG}${path}`;
}

// ================================
// Part 2 starts next
// ================================

// ================================
// Part 2/3
// Command Handlers
// ================================

async function handleCommand(
  env: Env,
  chatId: number,
  text: string
) {

  // /start
  if (text === "/start") {
    await sendMessage(
      env,
      chatId,
`🎬 <b>TMDb Telegram Bot</b>

Welcome!

Available Commands:

/movie Movie Name
/tv TV Show Name
/person Person Name

Example:
/movie Avatar`
    );
    return;
  }

  // -----------------------
  // /movie
  // -----------------------
  if (text.startsWith("/movie ")) {

    const query = text.replace("/movie", "").trim();

    if (!query) {
      await sendMessage(env, chatId, "Usage:\n/movie Movie Name");
      return;
    }

    const movie = await tmdbSearch(env, "movie", query);

    if (!movie) {
      await sendMessage(env, chatId, "❌ Movie not found.");
      return;
    }

    const caption =
`🎬 <b>${movie.title}</b>

⭐ Rating: ${movie.vote_average ?? "N/A"}

📅 Release:
${movie.release_date || "Unknown"}

📝
${movie.overview || "No overview available."}`;

    const img = poster(movie.poster_path);

    if (img) {
      await sendPhoto(env, chatId, img, caption);
    } else {
      await sendMessage(env, chatId, caption);
    }

    return;
  }

  // -----------------------
  // /tv
  // -----------------------
  if (text.startsWith("/tv ")) {

    const query = text.replace("/tv", "").trim();

    if (!query) {
      await sendMessage(env, chatId, "Usage:\n/tv TV Show Name");
      return;
    }

    const tv = await tmdbSearch(env, "tv", query);

    if (!tv) {
      await sendMessage(env, chatId, "❌ TV Show not found.");
      return;
    }

    const caption =
`📺 <b>${tv.name}</b>

⭐ Rating: ${tv.vote_average ?? "N/A"}

📅 First Air Date:
${tv.first_air_date || "Unknown"}

📝
${tv.overview || "No overview available."}`;

    const img = poster(tv.poster_path);

    if (img) {
      await sendPhoto(env, chatId, img, caption);
    } else {
      await sendMessage(env, chatId, caption);
    }

    return;
  }

  // -----------------------
  // /person
  // -----------------------
  if (text.startsWith("/person ")) {

    const query = text.replace("/person", "").trim();

    if (!query) {
      await sendMessage(env, chatId, "Usage:\n/person Person Name");
      return;
    }

    const person = await tmdbSearch(env, "person", query);

    if (!person) {
      await sendMessage(env, chatId, "❌ Person not found.");
      return;
    }

    const caption =
`🎭 <b>${person.name}</b>

Known For:
${person.known_for_department || "Unknown"}

Popularity:
${person.popularity || "N/A"}`;

    const img = poster(person.profile_path);

    if (img) {
      await sendPhoto(env, chatId, img, caption);
    } else {
      await sendMessage(env, chatId, caption);
    }

    return;
  }

  // Unknown command
  await sendMessage(
    env,
    chatId,
`Unknown command.

Try:

/movie Avatar
/tv Breaking Bad
/person Tom Cruise`
  );
}

// ================================
// Part 3/3 starts next
// ================================

  // ================================
// Part 3/3
// Cloudflare Worker Entry Point
// ================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {

    // Health check
    if (request.method === "GET") {
      return new Response("TMDb Telegram Bot is running ✅");
    }

    // Telegram sends POST requests
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405
      });
    }

    try {

      const update: any = await request.json();

      // Ignore non-message updates
      if (!update.message) {
        return new Response("OK");
      }

      const chatId = update.message.chat.id;
      const text = (update.message.text || "").trim();

      await handleCommand(env, chatId, text);

      return new Response("OK");

    } catch (err: any) {

      console.log(err);

      return new Response("Internal Server Error", {
        status: 500
      });

    }
  }
};
