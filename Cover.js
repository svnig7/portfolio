export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Telegram Cover Bot Running ✅");
    }

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
  },
};

// ================= CONFIG =================

const API = (token) => `https://api.telegram.org/bot${token}`;

// ================= TELEGRAM API =================

async function tg(token, method, data) {
  const res = await fetch(`${API(token)}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return res.json();
}

// ================= MESSAGE HANDLER =================

async function handleMessage(msg, env) {

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // ---------------- SAVE PHOTO ----------------

  if (msg.photo) {

    // largest size
    const photo = msg.photo[msg.photo.length - 1];

    await env.THUMBNAILS.put(
      userId.toString(),
      photo.file_id
    );

    await tg(env.BOT_TOKEN, "sendMessage", {
      chat_id: chatId,
      text: "✅ Thumbnail saved.\n\nNow send a video."
    });

    return;
  }

  // ---------------- VIDEO ----------------

  if (msg.video) {

    const cover = await env.THUMBNAILS.get(
      userId.toString()
    );

    if (!cover) {

      await tg(env.BOT_TOKEN, "sendMessage", {
        chat_id: chatId,
        text: "❌ No thumbnail found.\n\nSend a photo first."
      });

      return;
    }

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

    const caption = msg.caption || "";

    // Part 2 will edit this message into the final video.

    await processVideo(
      env,
      chatId,
      processingMessageId,
      msg.video.file_id,
      cover,
      caption
    );

    return;
  }

}

// ================= PROCESS VIDEO =================

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
        supports_streaming: true,

        // Telegram Bot API 8.0+
        cover: coverFileId
      }
    }
  );

  // If editMessageMedia fails, delete the
  // processing message and send the video normally.
  if (!result.ok) {

    console.log(result);

    await tg(env.BOT_TOKEN, "deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    });

    await tg(env.BOT_TOKEN, "sendVideo", {
      chat_id: chatId,
      video: videoFileId,
      caption: caption,
      supports_streaming: true,
      cover: coverFileId
    });

    return;
  }

  console.log("Video processed successfully.");
}
