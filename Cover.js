export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health Check
    if (url.pathname === "/") {
      return new Response("Thumbnail Cover Bot Running ✅");
    }

    // Telegram Webhook
    if (url.pathname === "/webhook") {
      const update = await request.json();

      try {
        if (update.message) {
          await handleMessage(update.message, env);
        }
      } catch (e) {
        console.log(e);
      }

      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }
};

// =====================================
// Telegram API
// =====================================

function api(token) {
  return `https://api.telegram.org/bot${token}`;
}

async function tg(token, method, body) {
  const res = await fetch(`${api(token)}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return await res.json();
}

// =====================================
// HTML Escape
// =====================================

function escapeHTML(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// =====================================
// Main Handler
// =====================================

async function handleMessage(msg, env) {

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // -----------------------------
  // Save Thumbnail
  // -----------------------------

  if (msg.photo) {

    const photo = msg.photo[msg.photo.length - 1];

    const data = {
      file_id: photo.file_id,
      caption: msg.caption || ""
    };

    await env.THUMBNAILS.put(
  userId.toString(),
  JSON.stringify(data)
);

// Reset episode counter for this season
const seasonMatch = (msg.caption || "").match(/🎞\s*Season\s*:\s*(\d+)/i);

if (seasonMatch) {
  await env.THUMBNAILS.put(
    `${userId}_${seasonMatch[1]}`,
    "0"
  );
}

await tg(env.BOT_TOKEN, "sendMessage", {
  chat_id: chatId,
  text: "✅ Thumbnail saved.\n\nNow send a video."
});

    return;
  }

  // -----------------------------
  // Process Video
  // -----------------------------

  if (msg.video) {

    const saved = await env.THUMBNAILS.get(
      userId.toString()
    );

    if (!saved) {
      await tg(env.BOT_TOKEN, "sendMessage", {
        chat_id: chatId,
        text: "❌ No thumbnail found.\n\nSend a photo first."
      });
      return;
    }

    const thumb = JSON.parse(saved);

    const cover = thumb.file_id;
    let imageCaption = thumb.caption || "";

// Auto Episode Counter
const seasonMatch = imageCaption.match(/🎞\s*Season\s*:\s*(\d+)/i);

if (seasonMatch) {
  const season = seasonMatch[1];

  const key = `${userId}_${season}`;

  let episode = await env.THUMBNAILS.get(key);

  episode = episode ? parseInt(episode) + 1 : 1;

  await env.THUMBNAILS.put(key, episode.toString());

  imageCaption = imageCaption.replace(
    /🎞\s*Season\s*:\s*\d+/i,
    `🎞 Season : ${season} | Episode : ${episode}`
  );
}
    const videoCaption = msg.caption || "";

    const finalCaption =
      `<code>${escapeHTML(videoCaption)}</code>` +
      (imageCaption
        ? `\n\n<blockquote>${escapeHTML(imageCaption)}</blockquote>`
        : "");

    const processing = await tg(
      env.BOT_TOKEN,
      "sendMessage",
      {
        chat_id: chatId,
        text: "⏳ Processing..."
      }
    );

    const processingMessageId =
      processing.result.message_id;

    // Continue in Part 2...

      await processVideo(
      env,
      chatId,
      processingMessageId,
      msg.video.file_id,
      cover,
      finalCaption
    );

    return;
  }
}

// =====================================
// Edit Processing Message → Video
// =====================================

async function processVideo(
  env,
  chatId,
  messageId,
  videoFileId,
  coverFileId,
  caption
) {

  const result = await tg(
    env.BOT_TOKEN,
    "editMessageMedia",
    {
      chat_id: chatId,
      message_id: messageId,

      media: {
        type: "video",
        media: videoFileId,
        caption: caption,
        parse_mode: "HTML",
        supports_streaming: true,

        // Telegram Bot API 8+
        cover: coverFileId
      }
    }
  );

  // If editing fails, send the video normally.
  if (!result.ok) {

    console.log(result);

    await tg(env.BOT_TOKEN, "deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    });

    await tg(env.BOT_TOKEN, "sendVideo", {
      chat_id: chatId,
      video: videoFileId,
      cover: coverFileId,
      caption: caption,
      parse_mode: "HTML",
      supports_streaming: true
    });

    return;
  }

  console.log("Video sent successfully.");
}
