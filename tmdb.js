export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // ---------------- HEALTH CHECK ---------------- //
      if (url.pathname === "/") {
        return new Response("🎬 TMDB Bot Worker Running");
      }

      // ---------------- WEBHOOK ---------------- //
      if (url.pathname === "/webhook") {
        let update;

        try {
          update = await request.json();
        } catch (e) {
          return new Response("no json");
        }

        return handleTelegram(update, env);
      }

      return new Response("ok");

    } catch (err) {
      return new Response("Worker Error: " + err.toString(), { status: 500 });
    }
  }
};

// ---------------- TMDB ---------------- //

async function tmdb(url, apiKey) {
  try {
    const res = await fetch(`${url}&api_key=${apiKey}`);
    return await res.json();
  } catch (e) {
    return {};
  }
}

async function getExternalIds(type, id, apiKey) {
  return tmdb(
    `https://api.themoviedb.org/3/${type}/${id}/external_ids?`,
    apiKey
  );
}

// ---------------- MAIN HANDLER ---------------- //

async function handleTelegram(update, env) {
  try {
    const msg = update.message;
    if (!msg || !msg.text) return new Response("ok");

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // ---------------- START ---------------- //
    if (text.startsWith("/start")) {
      await sendMessage(chatId,
        "🎬 TMDB Bot Ready\n\n/movie name\n/tv name",
        env
      );
      return new Response("ok");
    }

    // ---------------- MOVIE ---------------- //
    if (text.startsWith("/movie")) {

  const query = text.replace("/movie", "").trim();

  let details;
  let movie;

  // Search by TMDB ID
  if (/^\d+$/.test(query)) {

    details = await tmdb(
      `https://api.themoviedb.org/3/movie/${query}?`,
      env.TMDB_API
    );

    movie = details;

  } else {

    // Extract year from end
    const match = query.match(/(.+?)\s+(\d{4})$/);

    let name = query;
    let year = "";

    if (match) {
      name = match[1];
      year = match[2];
    }

    const search = await tmdb(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(name)}${year ? `&year=${year}` : ""}`,
      env.TMDB_API
    );

    if (!search.results?.length) {
      await sendMessage(chatId, "❌ Movie not found", env);
      return new Response("ok");
    }

    movie = search.results[0];

    details = await tmdb(
      `https://api.themoviedb.org/3/movie/${movie.id}?`,
      env.TMDB_API
    );
  }

  const ext = await getExternalIds("movie", details.id, env.TMDB_API);

  ...
    }

    // ---------------- TV ---------------- //
    if (text.startsWith("/tv")) {
      const query = text.replace("/tv", "").trim();

let details;
let tv;

// Search by TMDB ID
if (/^\d+$/.test(query)) {

  details = await tmdb(
    `https://api.themoviedb.org/3/tv/${query}?`,
    env.TMDB_API
  );

  tv = details;

} else {

  const match = query.match(/(.+?)\s+(\d{4})$/);

  let name = query;
  let year = "";

  if (match) {
    name = match[1];
    year = match[2];
  }

  const search = await tmdb(
    `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(name)}${year ? `&first_air_date_year=${year}` : ""}`,
    env.TMDB_API
  );

  if (!search.results?.length) {
    await sendMessage(chatId, "❌ TV show not found", env);
    return new Response("ok");
  }

  tv = search.results[0];

  details = await tmdb(
    `https://api.themoviedb.org/3/tv/${tv.id}?`,
    env.TMDB_API
  );
}

const ext = await getExternalIds("tv", details.id, env.TMDB_API);

    return new Response("ok");

  } catch (e) {
    console.log("HANDLER ERROR:", e);
    return new Response("ok");
  }
}

// ---------------- TELEGRAM ---------------- //

async function sendMessage(chatId, text, env) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

async function sendPhoto(chatId, photo, caption, env) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption
    })
  });
}
