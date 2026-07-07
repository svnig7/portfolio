export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);

      // Health Check
      if (request.method === "GET" && url.pathname === "/") {
        return jsonResponse(
          {
            status: "ok",
            message: "Telegram Image Upload Worker Running",
          },
          200,
          corsHeaders
        );
      }

      // Only POST Upload Allowed
      if (request.method !== "POST") {
        return jsonResponse(
          {
            error: "Method Not Allowed",
          },
          405,
          corsHeaders
        );
      }


      // Check Content-Type
      const contentType = request.headers.get("content-type") || "";

      if (!contentType.includes("multipart/form-data")) {
        return jsonResponse(
          {
            error: "Only multipart/form-data allowed",
          },
          400,
          corsHeaders
        );
      }


      // Parse Multipart Form Data
      let formData;

      try {
        formData = await request.formData();
      } catch (err) {
        return jsonResponse(
          {
            error: "Failed to parse form data",
            details: err.message,
          },
          400,
          corsHeaders
        );
      }


      // Get Image File
      const image = formData.get("image");

      if (!image) {
        return jsonResponse(
          {
            error: "No image uploaded. Field name should be 'image'",
          },
          400,
          corsHeaders
        );
      }


      // Validate File
      if (!(image instanceof File)) {
        return jsonResponse(
          {
            error: "Invalid image file",
          },
          400,
          corsHeaders
        );
      }


      // Allowed Image Types
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];


      if (!allowedTypes.includes(image.type)) {
        return jsonResponse(
          {
            error: "Only JPG, PNG and WEBP images allowed",
          },
          400,
          corsHeaders
        );
      }


      // File Size Limit (10MB)
      if (image.size > 10 * 1024 * 1024) {
        return jsonResponse(
          {
            error: "Image size must be below 10MB",
          },
          400,
          corsHeaders
        );
      }


      // Convert Image To ArrayBuffer
      const imageBuffer = await image.arrayBuffer();


      // Get Optional Caption
      const caption =
        formData.get("caption") || "New Image Upload";


      // Continue in Part 2
      return await sendToTelegram(
        imageBuffer,
        image.name,
        image.type,
        caption,
        env,
        corsHeaders
      );


    } catch (error) {
      return jsonResponse(
        {
          error: "Internal Server Error",
          details: error.message,
        },
        500,
        corsHeaders
      );
    }
  },
};


// JSON Response Helper
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}


// Telegram Upload Function
async function sendToTelegram(
  imageBuffer,
  fileName,
  mimeType,
  caption,
  env,
  corsHeaders
) {

  const BOT_TOKEN = env.BOT_TOKEN;
  const CHAT_ID = "@stremio_updates";


  if (!BOT_TOKEN) {
    return jsonResponse(
      {
        error: "BOT_TOKEN secret is missing",
      },
      500,
      corsHeaders
    );
  }


  const telegramUrl =
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;


  try {

    const form = new FormData();


    // Convert buffer to Blob
    const blob = new Blob(
      [imageBuffer],
      {
        type: mimeType,
      }
    );


    form.append(
      "chat_id",
      CHAT_ID
    );


    form.append(
      "photo",
      blob,
      fileName
    );


    form.append(
      "caption",
      caption
    );


    form.append(
      "parse_mode",
      "HTML"
    );


    const telegramResponse = await fetch(
      telegramUrl,
      {
        method: "POST",
        body: form,
      }
    );


    const telegramData =
      await telegramResponse.json();


    if (!telegramResponse.ok || !telegramData.ok) {

      return jsonResponse(
        {
          error: "Telegram API Error",
          telegram: telegramData,
        },
        500,
        corsHeaders
      );

    }


    return jsonResponse(
      {
        success: true,
        message: "Image sent to Telegram",
        telegram_message_id:
          telegramData.result.message_id,
      },
      200,
      corsHeaders
    );


  } catch (error) {

    return jsonResponse(
      {
        error: "Telegram upload failed",
        details: error.message,
      },
      500,
      corsHeaders
    );

  }

}
