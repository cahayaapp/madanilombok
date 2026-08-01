/*
 * CAHAYA APP — PUSH NOTIFICATION BACKEND
 *
 * Trigger:
 * 1. Chat langsung dari pengurus ke wali.
 * 2. Notifikasi admin/sistem untuk satu wali.
 * 3. Pengumuman pusat untuk seluruh wali.
 *
 * Catatan:
 * - Sesuaikan DATABASE_REGION bila lokasi RTDB berbeda.
 * - Deploy menggunakan Firebase CLI.
 */

const {
  onValueCreated
} = require(
  "firebase-functions/v2/database"
);

const {
  initializeApp
} = require(
  "firebase-admin/app"
);

const {
  getDatabase
} = require(
  "firebase-admin/database"
);

const {
  getMessaging
} = require(
  "firebase-admin/messaging"
);

initializeApp();

const DATABASE_INSTANCE =
  process.env.CAHAYA_DATABASE_INSTANCE ||
  "YOUR_PROJECT_ID-default-rtdb";

const DATABASE_REGION =
  process.env.CAHAYA_DATABASE_REGION ||
  "asia-southeast1";

function clean(value = "") {
  return String(value)
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toLowerCase();
}

function safeKey(value = "") {
  return String(value)
    .trim()
    .replace(
      /[.#$\[\]\/]/g,
      "_"
    )
    .replace(
      /\s+/g,
      "_"
    )
    .toLowerCase();
}

function isStaffSender(
  message,
  staff
) {
  const senderUsername =
    clean(
      message.senderUsername
    );

  const senderDisplay =
    clean(
      message.senderDisplay ||
      message.pengirim
    );

  const staffUsername =
    clean(
      staff.username
    );

  const staffLabel =
    clean(
      staff.label
    );

  return Boolean(
    (
      senderUsername &&
      staffUsername &&
      senderUsername ===
        staffUsername
    ) ||
    (
      senderDisplay &&
      staffLabel &&
      senderDisplay ===
        staffLabel
    )
  );
}

function activeTokenEntries(
  tokenData = {}
) {
  return Object.entries(
    tokenData
  )
    .filter(
      ([, item]) =>
        item &&
        item.aktif !== false &&
        item.token
    );
}

function chunkArray(
  values,
  size = 500
) {
  const chunks = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}

async function markInvalidTokens(
  tokenRef,
  entries,
  responses
) {
  const updates = {};

  responses.forEach(
    (result, index) => {
      if (result.success) {
        return;
      }

      const code =
        result.error?.code ||
        "";

      if (
        code.includes(
          "registration-token-not-registered"
        ) ||
        code.includes(
          "invalid-registration-token"
        )
      ) {
        const tokenKey =
          entries[index]?.[0];

        if (tokenKey) {
          updates[
            `${tokenKey}/aktif`
          ] = false;

          updates[
            `${tokenKey}/errorTerakhir`
          ] = code;

          updates[
            `${tokenKey}/diperbarui`
          ] =
            new Date()
              .toISOString();
        }
      }
    }
  );

  if (
    Object.keys(updates).length
  ) {
    await tokenRef.update(
      updates
    );
  }
}

async function sendToOneWali({
  waliUsername,
  title,
  body,
  link = "index.html",
  roomId = "",
  notificationId = ""
}) {
  const database =
    getDatabase();

  const waliKey =
    safeKey(
      waliUsername
    );

  const tokenRef =
    database.ref(
      `/cahaya_app/fcm_tokens_wali/${waliKey}`
    );

  const tokenSnapshot =
    await tokenRef.get();

  const entries =
    activeTokenEntries(
      tokenSnapshot.val() ||
      {}
    );

  if (!entries.length) {
    console.log(
      "Belum ada token aktif:",
      waliKey
    );

    return {
      successCount: 0,
      failureCount: 0
    };
  }

  const tokens =
    entries.map(
      ([, item]) =>
        item.token
    );

  const response =
    await getMessaging()
      .sendEachForMulticast({
        tokens,

        /*
         * Data-only message.
         * Service worker menampilkan notifikasi agar tidak ganda.
         */
        data: {
          title:
            String(
              title ||
              "Notifikasi Pesantren"
            ),

          body:
            String(
              body ||
              "Ada pemberitahuan baru."
            ),

          link:
            String(
              link ||
              "index.html"
            ),

          roomId:
            String(
              roomId ||
              ""
            ),

          notificationId:
            String(
              notificationId ||
              ""
            )
        },

        webpush: {
          headers: {
            Urgency:
              "high"
          }
        }
      });

  await markInvalidTokens(
    tokenRef,
    entries,
    response.responses
  );

  return {
    successCount:
      response.successCount,

    failureCount:
      response.failureCount
  };
}

async function sendBroadcast({
  title,
  body,
  link = "index.html",
  roomId =
    "room_broadcast_wali"
}) {
  const database =
    getDatabase();

  const rootRef =
    database.ref(
      "/cahaya_app/fcm_tokens_wali"
    );

  const snapshot =
    await rootRef.get();

  const allUsers =
    snapshot.val() ||
    {};

  const flatEntries = [];

  Object.entries(allUsers)
    .forEach(
      ([waliKey, tokenData]) => {
        activeTokenEntries(
          tokenData
        )
          .forEach(
            ([tokenKey, item]) => {
              flatEntries.push({
                waliKey,
                tokenKey,
                token:
                  item.token
              });
            }
          );
      }
    );

  if (!flatEntries.length) {
    return {
      successCount: 0,
      failureCount: 0
    };
  }

  let successCount = 0;
  let failureCount = 0;

  const batches =
    chunkArray(
      flatEntries,
      500
    );

  for (
    const batch
    of batches
  ) {
    const response =
      await getMessaging()
        .sendEachForMulticast({
          tokens:
            batch.map(
              item =>
                item.token
            ),

          data: {
            title:
              String(
                title ||
                "Pengumuman Pesantren"
              ),

            body:
              String(
                body ||
                "Ada pengumuman baru."
              ),

            link:
              String(
                link ||
                "index.html"
              ),

            roomId:
              String(
                roomId ||
                "room_broadcast_wali"
              ),

            notificationId:
              ""
          },

          webpush: {
            headers: {
              Urgency:
                "high"
            }
          }
        });

    successCount +=
      response.successCount;

    failureCount +=
      response.failureCount;

    const updatesByUser =
      {};

    response.responses
      .forEach(
        (result, index) => {
          if (result.success) {
            return;
          }

          const code =
            result.error?.code ||
            "";

          if (
            !(
              code.includes(
                "registration-token-not-registered"
              ) ||
              code.includes(
                "invalid-registration-token"
              )
            )
          ) {
            return;
          }

          const entry =
            batch[index];

          if (!entry) {
            return;
          }

          updatesByUser[
            `${entry.waliKey}/${entry.tokenKey}/aktif`
          ] = false;

          updatesByUser[
            `${entry.waliKey}/${entry.tokenKey}/errorTerakhir`
          ] = code;

          updatesByUser[
            `${entry.waliKey}/${entry.tokenKey}/diperbarui`
          ] =
            new Date()
              .toISOString();
        }
      );

    if (
      Object.keys(
        updatesByUser
      ).length
    ) {
      await rootRef.update(
        updatesByUser
      );
    }
  }

  return {
    successCount,
    failureCount
  };
}

/*
 * Chat langsung dari role pengurus ke wali.
 */
exports.pushChatToWali =
  onValueCreated(
    {
      ref:
        "/cahaya_app/pesan_global/{roomId}/{messageId}",

      instance:
        DATABASE_INSTANCE,

      region:
        DATABASE_REGION
    },
    async event => {
      const message =
        event.data.val();

      const roomId =
        event.params.roomId;

      if (
        !message ||
        roomId ===
          "room_broadcast_wali" ||
        message.dihapus === true ||
        message.deleted === true
      ) {
        return null;
      }

      const database =
        getDatabase();

      const metaSnapshot =
        await database
          .ref(
            `/cahaya_app/pesan_meta/${roomId}`
          )
          .get();

      const meta =
        metaSnapshot.val();

      if (
        !meta?.wali?.username ||
        !meta?.staff
      ) {
        console.log(
          "Metadata ruang belum tersedia:",
          roomId
        );

        return null;
      }

      if (
        !isStaffSender(
          message,
          meta.staff
        )
      ) {
        return null;
      }

      const senderName =
        meta.staff.label ||
        message.pengirim ||
        "Pengurus Pesantren";

      const result =
        await sendToOneWali({
          waliUsername:
            meta.wali.username,

          title:
            `Pesan dari ${senderName}`,

          body:
            message.teks ||
            "Ada pesan baru.",

          roomId,

          link:
            (
              "index.html" +
              "?openChat=1&room=" +
              encodeURIComponent(
                roomId
              )
            )
        });

      console.log(
        "Push chat selesai",
        {
          roomId,
          ...result
        }
      );

      return result;
    }
  );

/*
 * Notifikasi admin/sistem untuk satu akun wali.
 */
exports.pushSystemNotificationToWali =
  onValueCreated(
    {
      ref:
        "/cahaya_app/notifikasi_wali/{waliUsername}/{notificationId}",

      instance:
        DATABASE_INSTANCE,

      region:
        DATABASE_REGION
    },
    async event => {
      const notification =
        event.data.val();

      if (
        !notification ||
        notification.dibaca ===
          true
      ) {
        return null;
      }

      const waliUsername =
        event.params.waliUsername;

      const notificationId =
        event.params.notificationId;

      const result =
        await sendToOneWali({
          waliUsername,

          title:
            notification.title ||
            notification.judul ||
            "Notifikasi Pesantren",

          body:
            notification.desc ||
            notification.pesan ||
            notification.keterangan ||
            "Ada pemberitahuan baru.",

          link:
            notification.link ||
            notification.url ||
            notification.halaman ||
            "index.html",

          notificationId
        });

      console.log(
        "Push sistem selesai",
        {
          waliUsername,
          notificationId,
          ...result
        }
      );

      return result;
    }
  );

/*
 * Pengumuman pusat untuk seluruh token wali.
 */
exports.pushBroadcastToAllWali =
  onValueCreated(
    {
      ref:
        "/cahaya_app/pesan_global/room_broadcast_wali/{messageId}",

      instance:
        DATABASE_INSTANCE,

      region:
        DATABASE_REGION
    },
    async event => {
      const message =
        event.data.val();

      if (
        !message ||
        message.dihapus === true ||
        message.deleted === true
      ) {
        return null;
      }

      const result =
        await sendBroadcast({
          title:
            message.judul ||
            "Pengumuman Pesantren",

          body:
            message.teks ||
            "Ada pengumuman baru.",

          link:
            "index.html",

          roomId:
            "room_broadcast_wali"
        });

      console.log(
        "Push pengumuman selesai",
        result
      );

      return result;
    }
  );

/*
 * Broadcast "Semua Pengguna" juga dikirim ke seluruh perangkat wali.
 * Pengurus menerima broadcast ini melalui listener dashboard.
 */
exports.pushBroadcastSemuaPenggunaToAllWali =
  onValueCreated(
    {
      ref:
        "/cahaya_app/pesan_global/room_broadcast_semua/{messageId}",

      instance:
        DATABASE_INSTANCE,

      region:
        DATABASE_REGION
    },
    async event => {
      const message =
        event.data.val();

      if (
        !message ||
        message.dihapus === true ||
        message.deleted === true
      ) {
        return null;
      }

      const result =
        await sendBroadcast({
          title:
            message.judul ||
            "Pengumuman untuk Semua Pengguna",

          body:
            message.teks ||
            "Ada pengumuman baru.",

          link:
            "index.html",

          roomId:
            "room_broadcast_semua"
        });

      console.log(
        "Push broadcast semua pengguna selesai",
        result
      );

      return result;
    }
  );

