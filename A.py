import os
import time
import requests
from io import BytesIO
from PIL import Image
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# ---------------- CONFIG ---------------- #

TMDB_API = "315c5d1be103903d6c1283835d83da13"
BOT_TOKEN = "7970007527:AAEnvvj_N2-LR_HSYmT_7xaul2ejbmgo1ZI"

TMDB_IMG = "https://image.tmdb.org/t/p/original"

# ---------------- SIMPLE CACHE ---------------- #

CACHE = {}
CACHE_TTL = 3600  # 1 hour
IMG_CACHE = {}


def cache_get(key):
    data = CACHE.get(key)
    if not data:
        return None

    value, timestamp = data
    if time.time() - timestamp > CACHE_TTL:
        del CACHE[key]
        return None

    return value


def cache_set(key, value):
    CACHE[key] = (value, time.time())


# ---------------- TMDB ---------------- #

def tmdb_get(url, params=None):
    params = params or {}
    params["api_key"] = TMDB_API

    cache_key = url + str(sorted(params.items()))
    cached = cache_get(cache_key)
    if cached:
        return cached

    data = requests.get(url, params=params).json()
    cache_set(cache_key, data)
    return data


def get_external_ids(media_type, tmdb_id):
    url = f"https://api.themoviedb.org/3/{media_type}/{tmdb_id}/external_ids"
    return tmdb_get(url)


# ---------------- HD POSTER ---------------- #

def make_thumbnail(image_url):
    if image_url in IMG_CACHE:
        return IMG_CACHE[image_url]

    img_data = requests.get(image_url).content
    img = Image.open(BytesIO(img_data)).convert("RGB")

    # YouTube HD size
    img = img.resize((1280, 720), Image.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format="JPEG", quality=95, optimize=True)
    output.seek(0)

    IMG_CACHE[image_url] = output
    return output


# ---------------- MOVIE ---------------- #

async def movie(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args)
    if not query:
        await update.message.reply_text("Usage: /movie interstellar")
        return

    search = tmdb_get(
        "https://api.themoviedb.org/3/search/movie",
        {"query": query}
    )

    if not search.get("results"):
        await update.message.reply_text("No movie found.")
        return

    m = search["results"][0]
    tmdb_id = m["id"]

    details = tmdb_get(f"https://api.themoviedb.org/3/movie/{tmdb_id}")
    ext = get_external_ids("movie", tmdb_id)

    title = details.get("title", "Unknown")
    year = details.get("release_date", "N/A")[:4]
    genres = ", ".join([g["name"] for g in details.get("genres", [])])
    plot = details.get("overview", "N/A")
    imdb_id = ext.get("imdb_id", "N/A")

    poster = TMDB_IMG + details["poster_path"]

    caption = (
        f"🎬 *Title* : {title}\n"
        f"📅 *Year* : {year}\n"
        f"🎭 *Genre* : {genres}\n"
        f"📝 *Plot* : {plot}\n"
        f"🆔 *TMDB ID* : {tmdb_id} | *IMDb ID* : {imdb_id}"
    )

    img = make_thumbnail(poster)

    await update.message.reply_photo(
        photo=img,
        caption=caption,
        parse_mode="Markdown"
    )


# ---------------- TV ---------------- #

async def tv(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = " ".join(context.args)
    if not query:
        await update.message.reply_text("Usage: /tv breaking bad")
        return

    search = tmdb_get(
        "https://api.themoviedb.org/3/search/tv",
        {"query": query}
    )

    if not search.get("results"):
        await update.message.reply_text("No TV show found.")
        return

    t = search["results"][0]
    tmdb_id = t["id"]

    details = tmdb_get(f"https://api.themoviedb.org/3/tv/{tmdb_id}")
    ext = get_external_ids("tv", tmdb_id)

    title = details.get("name", "Unknown")
    genres = ", ".join([g["name"] for g in details.get("genres", [])])
    imdb_id = ext.get("imdb_id", "N/A")

    seasons = details.get("seasons", [])

    main_poster_path = details.get("poster_path")

    # ---------------- MAIN POSTER ---------------- #

    if main_poster_path:
        img = make_thumbnail(TMDB_IMG + main_poster_path)

        caption = (
            f"📺 *Title* : {title}\n"
            f"🎭 *Genre* : {genres}\n"
            f"🆔 *TMDB ID* : {tmdb_id} | *IMDb ID* : {imdb_id}"
        )

        await update.message.reply_photo(
            photo=img,
            caption=caption,
            parse_mode="Markdown"
        )

    # ---------------- SEASONS ---------------- #

    for season in seasons:
        season_no = season.get("season_number")
        if season_no == 0:
            continue

        season_data = tmdb_get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}/season/{season_no}"
        )

        plot = season_data.get("overview", "N/A")
        air_date = season_data.get("air_date", "N/A")[:4]

        poster_path = (
            season_data.get("poster_path")
            or season.get("poster_path")
            or main_poster_path
        )

        if not poster_path:
            continue

        img = make_thumbnail(TMDB_IMG + poster_path)

        caption = (
            f"📺 *Title* : {title}\n"
            f"🎞 *Season* : {season_no}\n"
            f"📅 *Year* : {air_date}\n"
            f"🎭 *Genre* : {genres}\n"
            f"📝 *Plot* : {plot[:300]}\n"
            f"🆔 *TMDB ID* : {tmdb_id} | *IMDb ID* : {imdb_id}"
        )

        await update.message.reply_photo(
            photo=img,
            caption=caption,
            parse_mode="Markdown"
        )


# ---------------- START ---------------- #

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎬 TMDB Bot Ready!\n\n"
        "/movie name\n"
        "/tv name"
    )


# ---------------- MAIN ---------------- #

def main():
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("movie", movie))
    app.add_handler(CommandHandler("tv", tv))

    print("Bot running...")
    app.run_polling()


if __name__ == "__main__":
    main()
