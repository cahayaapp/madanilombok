const IS_EMBEDDED_WALI_PORTAL = window.parent && window.parent !== window;
/*
 * BERANDA PORTAL WALI
 * WhatsApp-style live chat, robust media, read notifications,
 * and Firebase Cloud Messaging registration.
 */

(function () {
  const CHAT_ROLE_LABELS = {
    direktur: "Direktur",
    wakil_direktur: "Wakil Direktur",
    admin: "Admin",
    konselor: "Konselor"
  };

  let mediaItems = [];
  let allowedContacts = [];
  let renderedContacts = [];
  let chatRooms = {};
  let chatReadMap = {};
  let activeRoomId = "";
  let activeContact = null;
  let selectedRoomId = "";
  let longPressTimer = null;
  let chatSnapshotReady = false;
  let systemSnapshotReady = false;
  let systemNotifs = [];
  let broadcastNotifs = [];
  let pushMessaging = null;
  let pushRegistration = null;
  let readListenerInstalled = false;
  let systemListenerInstalled = false;
  let chatRoomsListenerInstalled = false;
  let pushPrepared = false;

  function esc(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escJs(value = "") {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n");
  }

  function safeKey(value = "") {
    return String(value)
      .trim()
      .replace(/[.#$\[\]\/]/g, "_")
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  function roleToken(value = "") {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function accountRoles(account = {}) {
    const raw = [
      account.akses,
      account.jabatan,
      account.roles,
      account.role,
      account.divisi,
      account.bidang
    ]
      .flatMap(value => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === "object") {
          return Object.values(value);
        }
        return [value];
      })
      .map(roleToken)
      .filter(Boolean);

    const expanded = new Set(raw);

    raw.forEach(role => {
      if (
        role === "wakil" ||
        role === "wadir" ||
        role.includes("wakil_direktur")
      ) {
        expanded.add("wakil_direktur");
      }

      if (
        role === "administrator" ||
        role.includes("admin")
      ) {
        expanded.add("admin");
      }

      if (role.includes("konselor")) {
        expanded.add("konselor");
      }

      if (
        role.includes("direktur") &&
        !role.includes("wakil")
      ) {
        expanded.add("direktur");
      }
    });

    return [...expanded];
  }

  function allowedRole(account = {}) {
    const roles = accountRoles(account);

    for (
      const key
      of [
        "direktur",
        "wakil_direktur",
        "admin",
        "konselor"
      ]
    ) {
      if (roles.includes(key)) {
        return key;
      }
    }

    return "";
  }

  function accountLabel(account = {}) {
    return String(
      account.label ||
      account.namaTampilan ||
      account.nama ||
      account.username ||
      "Pengurus"
    ).trim();
  }

  function accountPhoto(account = {}) {
    return (
      account.fotoProfil ||
      account.foto ||
      account.photoURL ||
      account.avatar ||
      ""
    );
  }

  function myAliases() {
    const account =
      window.CahayaWaliSession
        ? CahayaWaliSession.getAccount()
        : {};

    return [
      sapaanPenuh,
      userNameAsli,
      namaAnakUtuh,
      account.label,
      account.nama,
      account.namaTampilan,
      account.username,
      account.waliLabel
    ]
      .filter(Boolean)
      .map(value =>
        String(value)
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase()
      )
      .filter(Boolean)
      .filter(
        (value, index, array) =>
          array.indexOf(value) === index
      );
  }

  function isMine(message = {}) {
    const senderUsername =
      String(
        message.senderUsername || ""
      ).toLowerCase();

    if (
      senderUsername &&
      senderUsername ===
        String(userNameAsli).toLowerCase()
    ) {
      return true;
    }

    const sender =
      String(
        message.pengirim ||
        message.senderDisplay ||
        ""
      )
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

    return myAliases().includes(sender);
  }

  function buildContacts() {
    const unique = new Map();

    (pListUsers || []).forEach(account => {
      const roleKey = allowedRole(account);

      if (!roleKey) return;

      const username =
        String(
          account.username ||
          account.userName ||
          account.email?.split("@")[0] ||
          ""
        )
          .trim()
          .toLowerCase();

      const actualLabel =
        accountLabel(account);

      if (
        username ===
        String(userNameAsli).toLowerCase()
      ) {
        return;
      }

      const uniqueKey =
        username ||
        normalisasiNama(actualLabel);

      if (
        !uniqueKey ||
        unique.has(uniqueKey)
      ) {
        return;
      }

      const roomId =
        getChatRoomId(
          sapaanPenuh,
          actualLabel
        );

      unique.set(uniqueKey, {
        username,
        actualLabel,
        displayName: actualLabel,
        roleKey,
        roleLabel:
          CHAT_ROLE_LABELS[roleKey],
        photo: accountPhoto(account),
        defaultRoomId: roomId,
        roomId,
        account
      });
    });

    const order = {
      direktur: 1,
      wakil_direktur: 2,
      admin: 3,
      konselor: 4
    };

    allowedContacts =
      [...unique.values()]
        .sort((a, b) => {
          const roleDiff =
            order[a.roleKey] -
            order[b.roleKey];

          if (roleDiff !== 0) {
            return roleDiff;
          }

          return a.displayName.localeCompare(
            b.displayName,
            "id"
          );
        });

    allowedContacts.forEach(contact => {
      saveRoomMeta(contact);
    });

    renderContactList();
  }

  function findContact(value = "") {
    const clean =
      String(value)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

    if (!clean) return null;

    return (
      allowedContacts.find(contact => {
        const candidates = [
          contact.actualLabel,
          contact.displayName,
          contact.username,
          contact.account?.label,
          contact.account?.nama
        ]
          .filter(Boolean)
          .map(item =>
            String(item)
              .replace(/[^a-zA-Z0-9]/g, "")
              .toLowerCase()
          );

        return candidates.includes(clean);
      }) ||
      null
    );
  }

  function contactForRoom(
    roomId,
    messages = {}
  ) {
    const values =
      Object.values(messages || {});

    for (const message of values) {
      if (!message || isMine(message)) {
        continue;
      }

      const contact = findContact(
        message.senderUsername ||
        message.pengirim ||
        message.senderDisplay ||
        ""
      );

      if (contact) return contact;
    }

    const roomClean =
      String(roomId).toLowerCase();

    return (
      allowedContacts.find(contact => {
        return [
          contact.actualLabel,
          contact.username
        ]
          .filter(Boolean)
          .map(value =>
            String(value)
              .replace(/[^a-zA-Z0-9]/g, "")
              .toLowerCase()
          )
          .some(value =>
            roomClean.includes(value)
          );
      }) ||
      null
    );
  }

  async function saveRoomMeta(
    contact,
    roomId =
      contact?.roomId ||
      contact?.defaultRoomId
  ) {
    if (!contact || !roomId) return;

    try {
      await dbRT
        .ref(
          `cahaya_app/pesan_meta/${roomId}`
        )
        .update({
          roomId,
          wali: {
            username: userNameAsli,
            label: sapaanPenuh,
            namaAnak: namaAnakUtuh
          },
          staff: {
            username: contact.username,
            label: contact.actualLabel,
            role: contact.roleKey,
            roleLabel: contact.roleLabel
          },
          updatedAt:
            new Date().toISOString()
        });

      await updateInboxIndex(contact, roomId);
    } catch (error) {
      console.warn(
        "Metadata chat belum tersimpan:",
        error
      );
    }
  }

  async function updateInboxIndex(contact, roomId, message = null) {
    if (!contact || !roomId) return;
    const now = message?.waktu || new Date().toISOString();
    const myKey = safeKey(userNameAsli);
    const peerKey = safeKey(contact.username || contact.actualLabel);
    const baseForMe = {
      roomId,
      peerUsername: contact.username || "",
      peerLabel: contact.actualLabel || contact.displayName || "Pengurus",
      peerRole: contact.roleKey || "",
      updatedAt: now
    };
    const baseForPeer = {
      roomId,
      peerUsername: userNameAsli,
      peerLabel: sapaanPenuh,
      peerRole: "wali",
      namaAnak: namaAnakUtuh,
      updatedAt: now
    };
    if (message) {
      baseForMe.lastMessage = message;
      baseForPeer.lastMessage = message;
    }
    const updates = {};
    updates[`cahaya_app/pesan_inbox/${myKey}/${roomId}`] = baseForMe;
    updates[`cahaya_app/pesan_inbox/${peerKey}/${roomId}`] = baseForPeer;
    try { await dbRT.ref().update(updates); } catch (error) { console.warn("Indeks inbox belum tersimpan:", error); }
  }


  function messageValues(messages) {
    return Object.entries(messages || {})
      .map(([id, value]) => ({
        id,
        ...value
      }))
      .filter(message =>
        message &&
        (
          message.waktu ||
          message.createdAt
        )
      )
      .sort(
        (a, b) =>
          new Date(
            a.waktu ||
            a.createdAt ||
            0
          ) -
          new Date(
            b.waktu ||
            b.createdAt ||
            0
          )
      );
  }

  function latestMessage(messages) {
    const values = messageValues(messages);

    return values.length
      ? values[values.length - 1]
      : null;
  }

  function readTimestamp(roomId) {
    const local =
      localStorage.getItem(
        "chat_read_" + roomId
      ) || "0";

    const remote =
      chatReadMap[roomId]?.waktu ||
      chatReadMap[roomId] ||
      "0";

    return new Date(local) >
      new Date(remote)
      ? local
      : remote;
  }

  async function markRoomRead(
    roomId,
    time =
      new Date().toISOString()
  ) {
    if (!roomId) return;

    localStorage.setItem(
      "chat_read_" + roomId,
      time
    );

    chatReadMap[roomId] = {
      waktu: time
    };

    try {
      await dbRT
        .ref(
          `cahaya_app/pesan_dibaca/${safeKey(userNameAsli)}/${roomId}`
        )
        .set({
          waktu: time,
          username: userNameAsli,
          diperbarui:
            new Date().toISOString()
        });
    } catch (error) {
      console.warn(
        "Status baca chat belum tersimpan:",
        error
      );
    }
  }

  function listenReadReceipts() {
    if (readListenerInstalled) return;
    readListenerInstalled = true;

    dbRT
      .ref(
        `cahaya_app/pesan_dibaca/${safeKey(userNameAsli)}`
      )
      .on(
        "value",
        snapshot => {
          chatReadMap =
            snapshot.val() || {};

          if (
            Object.keys(chatRooms).length
          ) {
            processRooms(
              chatRooms,
              false
            );
          }
        },
        error => {
          console.warn(
            "Status baca chat belum dimuat:",
            error
          );
        }
      );
  }

  function listTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    if (
      date.toDateString() ===
      now.toDateString()
    ) {
      return date.toLocaleTimeString(
        "id-ID",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Kemarin";
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );
  }

  function contactItems() {
    const items =
      allowedContacts.map(contact => ({
        ...contact,
        roomId: contact.defaultRoomId,
        messages:
          chatRooms[contact.defaultRoomId] ||
          {}
      }));

    Object.entries(chatRooms || {})
      .forEach(([roomId, messages]) => {
        if (
          roomId ===
          "room_broadcast_wali"
        ) {
          return;
        }

        const belongsToMe =
          myAliases().some(alias =>
            roomId
              .toLowerCase()
              .includes(alias)
          );

        if (!belongsToMe) return;

        const contact =
          contactForRoom(
            roomId,
            messages
          );

        if (!contact) return;

        const index =
          items.findIndex(item =>
            item.username ===
              contact.username ||
            normalisasiNama(
              item.actualLabel
            ) ===
            normalisasiNama(
              contact.actualLabel
            )
          );

        if (index < 0) return;

        const current =
          latestMessage(
            items[index].messages
          );

        const candidate =
          latestMessage(messages);

        if (
          !current ||
          (
            candidate &&
            new Date(candidate.waktu) >
              new Date(current.waktu)
          )
        ) {
          items[index] = {
            ...items[index],
            roomId,
            messages
          };
        }
      });

    const order = {
      direktur: 1,
      wakil_direktur: 2,
      admin: 3,
      konselor: 4
    };

    return items
      .map(item => {
        const latest =
          latestMessage(item.messages);

        const unread =
          messageValues(item.messages)
            .filter(message => {
              if (isMine(message)) {
                return false;
              }

              return (
                new Date(
                  message.waktu || 0
                ) >
                new Date(
                  readTimestamp(item.roomId)
                )
              );
            });

        return {
          ...item,
          latest,
          unreadCount: unread.length,
          isUnread:
            unread.length > 0
        };
      })
      .sort((a, b) => {
        if (a.latest && b.latest) {
          return (
            new Date(b.latest.waktu) -
            new Date(a.latest.waktu)
          );
        }

        if (a.latest) return -1;
        if (b.latest) return 1;

        return (
          order[a.roleKey] -
          order[b.roleKey]
        );
      });
  }

  function avatarHtml(
    contact,
    className =
      "wa-contact-avatar"
  ) {
    const initial =
      String(
        contact?.displayName ||
        "P"
      )
        .charAt(0)
        .toUpperCase();

    if (contact?.photo) {
      return `
        <div class="${className}">
          <img
            src="${esc(contact.photo)}"
            alt="${esc(contact.displayName)}"
            onerror="
              this.remove();
              this.parentNode.textContent =
                '${escJs(initial)}';
            "
          >
        </div>
      `;
    }

    return `
      <div class="${className}">
        ${esc(initial)}
      </div>
    `;
  }

  function renderContactList() {
    const container =
      document.getElementById(
        "viewInbox"
      );

    if (!container) return;

    const query =
      String(
        document.getElementById(
          "chatContactSearch"
        )?.value || ""
      )
        .trim()
        .toLowerCase();

    renderedContacts =
      contactItems()
        .filter(item => {
          if (!query) return true;

          return [
            item.displayName,
            item.username,
            item.roleLabel
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

    if (!renderedContacts.length) {
      container.innerHTML = `
        <div class="wa-empty">
          Belum ditemukan akun aktif dengan role
          Direktur, Wakil Direktur, Admin, atau Konselor.
        </div>
      `;
      return;
    }

    container.innerHTML =
      renderedContacts
        .map((item, index) => {
          const preview =
            item.latest
              ? (
                item.latest.dihapus ||
                item.latest.deleted
                  ? "Pesan telah dihapus"
                  : item.latest.teks
              )
              : `Mulai chat dengan ${item.roleLabel}`;

          return `
            <article
              class="wa-contact"
              onclick="openAllowedContactByIndex(${index})"
            >
              ${avatarHtml(item)}

              <div class="wa-contact-main">
                <div class="wa-contact-row">
                  <span class="wa-contact-name">
                    ${esc(item.displayName)}
                  </span>

                  <time class="wa-contact-time ${item.isUnread ? "unread" : ""}">
                    ${esc(
                      listTime(
                        item.latest?.waktu
                      )
                    )}
                  </time>
                </div>

                <div class="wa-contact-row">
                  <span class="wa-contact-preview ${item.isUnread ? "unread" : ""}">
                    <span class="wa-contact-role">
                      ${esc(item.roleLabel)}
                    </span>

                    ${item.latest ? " • " : ""}

                    ${esc(preview)}
                  </span>

                  ${
                    item.unreadCount
                      ? `
                        <span class="wa-unread-count">
                          ${item.unreadCount}
                        </span>
                      `
                      : ""
                  }
                </div>
              </div>
            </article>
          `;
        })
        .join("");
  }

  function showToast(title, desc) {
    const titleElement =
      document.getElementById(
        "notifTitle"
      );

    const descElement =
      document.getElementById(
        "notifDesc"
      );

    if (!titleElement || !descElement) {
      return;
    }

    titleElement.textContent =
      title || "Pesan Baru";

    descElement.textContent =
      desc || "";

    const element =
      document.getElementById(
        "inAppNotif"
      );

    element.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer =
      setTimeout(
        () =>
          element.classList.remove(
            "show"
          ),
        4500
      );
  }

  function browserNotif(
    title,
    desc,
    roomId = ""
  ) {
    if (
      !("Notification" in window) ||
      Notification.permission !==
        "granted" ||
      !document.hidden
    ) {
      return;
    }

    try {
      const notification =
        new Notification(
          title || "Pesan Baru",
          {
            body: desc || "",
            icon:
              "../../assets/logofi.png",
            tag:
              roomId ||
              "cahaya-wali",
            renotify: true
          }
        );

      notification.onclick = () => {
        window.focus();

        if (roomId) {
          const contact =
            contactItems().find(item =>
              item.roomId === roomId
            );

          if (contact) {
            openChat(
              contact,
              roomId
            );
          }
        }

        notification.close();
      };
    } catch (error) {}
  }

  function processRooms(
    rooms,
    allowSound = true
  ) {
    chatRooms = rooms || {};

    const items =
      contactItems();

    const unreadItems =
      items.filter(item =>
        item.isUnread
      );

    const unreadTotal =
      unreadItems.reduce(
        (sum, item) =>
          sum + item.unreadCount,
        0
      );

    globalChatNotifs =
      unreadItems.map(item => ({
        type: "chat",
        key:
          "chat_" +
          item.roomId,
        roomId: item.roomId,
        title:
          "Pesan dari " +
          item.displayName,
        desc:
          item.latest?.dihapus ||
          item.latest?.deleted
            ? "Pesan telah dihapus"
            : (
              item.latest?.teks ||
              ""
            ),
        waktu:
          item.latest?.waktu ||
          new Date().toISOString(),
        contactLabel:
          item.actualLabel,
        contactDisplay:
          item.displayName
      }));

    const broadcastDefinitions = []; // broadcast baru diperlakukan sebagai pesan pribadi

    const unreadBroadcasts =
      broadcastDefinitions
        .map(definition => {
          const latest =
            latestMessage(
              chatRooms[
                definition.roomId
              ] || {}
            );

          const unread =
            Boolean(
              latest &&
              !isMine(latest) &&
              new Date(
                latest.waktu || 0
              ) >
              new Date(
                readTimestamp(
                  definition.roomId
                )
              )
            );

          return {
            ...definition,
            latest,
            unread
          };
        })
        .filter(item =>
          item.unread
        );

    broadcastNotifs =
      unreadBroadcasts
        .map(item => ({
          type:
            "broadcast",

          key:
            "broadcast_" +
            item.roomId,

          roomId:
            item.roomId,

          title:
            item.title,

          desc:
            item.latest
              ?.dihapus ||
            item.latest
              ?.deleted
              ? "Pengumuman telah dihapus"
              : (
                  item.latest
                    ?.teks ||
                  ""
                ),

          waktu:
            item.latest
              ?.waktu ||
            new Date()
              .toISOString()
        }));

    const newestBroadcast =
      unreadBroadcasts
        .sort(
          (a, b) =>
            new Date(
              b.latest?.waktu || 0
            ) -
            new Date(
              a.latest?.waktu || 0
            )
        )[0] ||
      null;

    const broadcastUnreadCount =
      unreadBroadcasts.length;

    const newest =
      unreadItems
        .sort(
          (a, b) =>
            new Date(
              b.latest?.waktu || 0
            ) -
            new Date(
              a.latest?.waktu || 0
            )
        )[0];

    if (
      allowSound &&
      chatSnapshotReady &&
      unreadTotal > lastUnreadCount &&
      newest
    ) {
      notifAudioChat
        .play()
        .catch(() => {});

      const desc =
        newest.latest?.teks ||
        "Pesan baru";

      showToast(
        newest.displayName,
        desc
      );

      browserNotif(
        "Pesan dari " +
        newest.displayName,
        desc,
        newest.roomId
      );
    }

    if (
      allowSound &&
      chatSnapshotReady &&
      newestBroadcast
    ) {
      const storageKey =
        "cahaya_last_broadcast_notified_" +
        newestBroadcast.roomId;

      const lastBroadcastTime =
        localStorage.getItem(
          storageKey
        ) || "0";

      if (
        new Date(
          newestBroadcast
            .latest
            ?.waktu ||
          0
        ) >
        new Date(
          lastBroadcastTime
        )
      ) {
        localStorage.setItem(
          storageKey,
          newestBroadcast
            .latest
            .waktu
        );

        notifSound
          .play()
          .catch(() => {});

        showToast(
          newestBroadcast.title,
          newestBroadcast
            .latest
            .teks ||
          "Ada pengumuman baru."
        );

        browserNotif(
          newestBroadcast.title,
          newestBroadcast
            .latest
            .teks ||
          "Ada pengumuman baru."
        );
      }
    }

    lastUnreadCount = unreadTotal;
    chatSnapshotReady = true;

    const badge =
      document.getElementById(
        "chatUnreadBadge"
      );

    const totalUnread =
      unreadTotal +
      broadcastUnreadCount;

    if (totalUnread > 0) {
      badge.textContent =
        totalUnread > 99
          ? "99+"
          : totalUnread;

      badge.style.setProperty(
        "display",
        "grid",
        "important"
      );
    } else {
      badge.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    renderContactList();
    renderDashboardNotifs();
  }

  function installChatListener() {
    buildContacts();
    if (chatRoomsListenerInstalled) return;
    chatRoomsListenerInstalled = true;
    dbRT.ref(`cahaya_app/pesan_inbox/${safeKey(userNameAsli)}`).limitToLast(100).on(
      "value",
      snapshot => {
        const index = snapshot.val() || {};
        const rooms = {};
        Object.values(index).forEach(item => {
          if (item?.roomId && item?.lastMessage) rooms[item.roomId] = { __last: item.lastMessage };
        });
        processRooms(rooms, true);
      },
      error => {
        console.warn("Inbox pesan belum dapat dimuat:", error);
        renderContactList();
      }
    );
  }

  function formatMessageDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
  }

  function formatMessageTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString(
      "id-ID",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }

  function renderConversation(
    messages,
    contact
  ) {
    const body =
      document.getElementById(
        "chatBody"
      );

    const values =
      messageValues(messages);

    body.innerHTML = "";

    if (!values.length) {
      body.innerHTML = `
        <div class="wa-empty">
          Belum ada pesan.<br>
          Mulai percakapan dengan
          <b>${esc(contact.displayName)}</b>.
        </div>
      `;
      return;
    }

    let lastDate = "";

    values.forEach(message => {
      const date = new Date(
        message.waktu ||
        message.createdAt
      );

      const dateKey =
        Number.isNaN(date.getTime())
          ? ""
          : date
            .toISOString()
            .slice(0, 10);

      if (
        dateKey &&
        dateKey !== lastDate
      ) {
        body.insertAdjacentHTML(
          "beforeend",
          `
            <div class="wa-date-chip">
              ${esc(
                formatMessageDate(
                  message.waktu ||
                  message.createdAt
                )
              )}
            </div>
          `
        );

        lastDate = dateKey;
      }

      const own = isMine(message);

      const deleted =
        message.dihapus === true ||
        message.deleted === true;

      const text =
        deleted
          ? "Pesan ini telah dihapus"
          : (
            message.teks || ""
          );

      const edited =
        !deleted &&
        (
          message.isEdited ||
          message.diedit
        );

      const action =
        own && !deleted
          ? `
            onclick="openMsgAction(
              '${escJs(message.id)}',
              '${escJs(message.teks || "")}',
              '${escJs(activeRoomId)}'
            )"

            oncontextmenu="
              event.preventDefault();
              openMsgAction(
                '${escJs(message.id)}',
                '${escJs(message.teks || "")}',
                '${escJs(activeRoomId)}'
              );
            "

            ontouchstart="
              startMessageLongPress(
                '${escJs(message.id)}',
                '${escJs(message.teks || "")}',
                '${escJs(activeRoomId)}'
              )
            "

            ontouchend="cancelMessageLongPress()"
            ontouchmove="cancelMessageLongPress()"
          `
          : "";

      body.insertAdjacentHTML(
        "beforeend",
        `
          <article
            class="chat-msg ${own ? "msg-self" : "msg-other"}"
            ${action}
          >
            <span class="wa-message-text ${deleted ? "wa-message-deleted" : ""}">
              ${esc(text)}
            </span>

            <span class="wa-message-meta">
              ${
                edited
                  ? `
                    <span class="wa-message-edited">
                      diedit
                    </span>
                  `
                  : ""
              }

              <time>
                ${esc(
                  formatMessageTime(
                    message.waktu ||
                    message.createdAt
                  )
                )}
              </time>

              ${
                own
                  ? `
                    <span class="wa-message-check">
                      ✓✓
                    </span>
                  `
                  : ""
              }
            </span>
          </article>
        `
      );
    });

    requestAnimationFrame(() => {
      body.scrollTop =
        body.scrollHeight;
    });
  }

  function headerContact(contact) {
    document.getElementById(
      "chatHeaderTitle"
    ).textContent =
      contact.displayName;

    document.getElementById(
      "chatHeaderSubtitle"
    ).textContent =
      contact.roleLabel;

    document.getElementById(
      "chatBackButton"
    ).style.display =
      "grid";

    const avatar =
      document.getElementById(
        "chatHeaderAvatar"
      );

    const initial =
      contact.displayName
        .charAt(0)
        .toUpperCase();

    if (contact.photo) {
      avatar.innerHTML = `
        <img
          src="${esc(contact.photo)}"
          alt="${esc(contact.displayName)}"
          onerror="
            this.remove();
            this.parentNode.textContent =
              '${escJs(initial)}';
          "
        >
      `;
    } else {
      avatar.textContent = initial;
    }
  }

  function openChat(
    contact,
    roomId =
      contact.roomId ||
      contact.defaultRoomId
  ) {
    if (!contact) return;

    activeContact = {
      ...contact,
      roomId
    };

    activeRoomId = roomId;
    targetAktifLabel =
      contact.actualLabel;
    targetAktifDisplay =
      contact.displayName;

    saveRoomMeta(contact, roomId);

    document.getElementById(
      "chatListView"
    ).style.display = "none";

    document.getElementById(
      "chatBody"
    ).style.display = "flex";

    document.getElementById(
      "chatFooter"
    ).style.display = "flex";

    headerContact(contact);

    if (chatListener) {
      dbRT
        .ref(
          `cahaya_app/pesan_global/${chatListener}`
        )
        .off();
    }

    chatListener = roomId;

    dbRT
      .ref(
        `cahaya_app/pesan_global/${roomId}`
      )
      .limitToLast(50)
      .on(
        "value",
        async snapshot => {
          const messages =
            snapshot.val() || {};

          renderConversation(
            messages,
            contact
          );

          const latest =
            latestMessage(messages);

          await markRoomRead(
            roomId,
            latest?.waktu ||
            new Date().toISOString()
          );

          processRooms(
            chatRooms,
            false
          );
        },
        error => {
          document.getElementById(
            "chatBody"
          ).innerHTML = `
            <div class="wa-empty">
              Percakapan belum dapat dimuat:
              ${esc(
                error?.message ||
                "Periksa koneksi."
              )}
            </div>
          `;
        }
      );

    setTimeout(() => {
      document.getElementById(
        "chatInput"
      ).focus();
    }, 160);
  }

  function showList() {
    if (chatListener) {
      dbRT
        .ref(
          `cahaya_app/pesan_global/${chatListener}`
        )
        .off();

      chatListener = null;
    }

    activeRoomId = "";
    activeContact = null;
    targetAktifLabel = "";
    targetAktifDisplay = "";
    editModeId = null;

    document.getElementById(
      "chatListView"
    ).style.display = "flex";

    document.getElementById(
      "chatBody"
    ).style.display = "none";

    document.getElementById(
      "chatFooter"
    ).style.display = "none";

    document.getElementById(
      "chatBackButton"
    ).style.display = "none";

    document.getElementById(
      "chatHeaderTitle"
    ).textContent =
      "WhatsApp Pesantren";

    document.getElementById(
      "chatHeaderSubtitle"
    ).textContent =
      "Direktur, Wakil Direktur, Admin, dan Konselor";

    document.getElementById(
      "chatHeaderAvatar"
    ).textContent = "C";

    const button =
      document.getElementById(
        "btnSendChat"
      );

    button.textContent = "➤";
    button.classList.remove(
      "editing"
    );

    renderContactList();
  }

  async function sendMessage() {
    const input =
      document.getElementById(
        "chatInput"
      );

    const text =
      input.value.trim();

    if (
      !text ||
      !activeRoomId ||
      !activeContact
    ) {
      return;
    }

    const button =
      document.getElementById(
        "btnSendChat"
      );

    button.disabled = true;

    try {
      if (editModeId) {
        await dbRT
          .ref(
            `cahaya_app/pesan_global/${activeRoomId}/${editModeId}`
          )
          .update({
            teks: text,
            isEdited: true,
            diedit: true,
            editedAt:
              new Date().toISOString()
          });

        editModeId = null;
        button.textContent = "➤";
        button.classList.remove(
          "editing"
        );
      } else {
        const messagePayload = {
          teks: text,
          pengirim: sapaanPenuh,
          senderDisplay: sapaanPenuh,
          senderUsername: userNameAsli,
          recipientDisplay: activeContact.actualLabel,
          recipientUsername: activeContact.username,
          senderRole: "wali",
          recipientRole: activeContact.roleKey,
          roomId: activeRoomId,
          waktu: new Date().toISOString()
        };
        await dbRT.ref(`cahaya_app/pesan_global/${activeRoomId}`).push(messagePayload);
        await updateInboxIndex(activeContact, activeRoomId, messagePayload);
      }

      await markRoomRead(
        activeRoomId,
        new Date().toISOString()
      );

      input.value = "";
      autoResize();
      input.focus();
    } catch (error) {
      alert(
        "Pesan belum dapat dikirim: " +
        (
          error?.message ||
          "Periksa koneksi Firebase."
        )
      );
    } finally {
      button.disabled = false;
    }
  }

  function autoResize() {
    const input =
      document.getElementById(
        "chatInput"
      );

    input.style.height = "auto";
    input.style.height =
      Math.min(
        input.scrollHeight,
        100
      ) + "px";
  }

  function getAllNotifs() {
    return [
      ...globalChatNotifs,
      ...globalCommentNotifs,
      ...broadcastNotifs,
      ...systemNotifs
    ]
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.waktu || 0) -
          new Date(a.waktu || 0)
      );
  }

  async function markCommentRead(key) {
    const read =
      JSON.parse(
        localStorage.getItem(
          "cahaya_read_notifs"
        ) || "[]"
      );

    if (!read.includes(key)) {
      read.push(key);

      localStorage.setItem(
        "cahaya_read_notifs",
        JSON.stringify(read)
      );
    }

    terapkanInteraksiKeUI();
  }

  async function markSystemRead(notif) {
    if (!notif?.notifId) return;

    systemNotifs =
      systemNotifs.filter(item =>
        item.key !== notif.key
      );

    renderDashboardNotifs();

    try {
      await dbRT
        .ref(
          `cahaya_app/notifikasi_wali/${userNameAsli}/${notif.notifId}`
        )
        .update({
          dibaca: true,
          waktuDibaca:
            new Date().toISOString()
        });
    } catch (error) {
      console.warn(
        "Status baca notifikasi belum tersimpan:",
        error
      );
    }
  }

  function listenSystemNotifs() {
    if (systemListenerInstalled) return;
    systemListenerInstalled = true;

    dbRT
      .ref(
        `cahaya_app/notifikasi_wali/${userNameAsli}`
      )
      .on(
        "value",
        snapshot => {
          const raw =
            snapshot.val() || {};

          const oldCount =
            systemNotifs.length;

          systemNotifs =
            Object.entries(raw)
              .map(([notifId, item]) => ({
                type: "system",
                key:
                  "system_" +
                  notifId,
                notifId,
                title:
                  item.title ||
                  item.judul ||
                  "Notifikasi Pesantren",
                desc:
                  item.desc ||
                  item.pesan ||
                  item.keterangan ||
                  "",
                waktu:
                  item.waktu ||
                  item.createdAt ||
                  item.tanggal ||
                  new Date().toISOString(),
                link:
                  item.link ||
                  item.url ||
                  item.halaman ||
                  "",
                dibaca:
                  item.dibaca === true
              }))
              .filter(item =>
                !item.dibaca
              )
              .sort(
                (a, b) =>
                  new Date(b.waktu) -
                  new Date(a.waktu)
              );

          if (
            systemSnapshotReady &&
            systemNotifs.length >
              oldCount &&
            systemNotifs[0]
          ) {
            const latest =
              systemNotifs[0];

            notifSound
              .play()
              .catch(() => {});

            showToast(
              latest.title,
              latest.desc
            );

            browserNotif(
              latest.title,
              latest.desc
            );
          }

          systemSnapshotReady = true;
          renderDashboardNotifs();
        },
        error => {
          console.warn(
            "Notifikasi sistem belum dimuat:",
            error
          );
        }
      );
  }

  function renderNotifs() {
    const combined =
      getAllNotifs();

    const container =
      document.getElementById(
        "notifListContainer"
      );

    const dashboard =
      document.getElementById(
        "notificationDashboard"
      );

    if (!container || !dashboard) {
      return;
    }

    if (!combined.length) {
      dashboard.style.display = "none";
      container.innerHTML = "";
      return;
    }

    dashboard.style.display = "block";
    container.innerHTML = "";

    const displayList =
      isShowingAllNotifs
        ? combined
        : combined.slice(0, 2);

    displayList.forEach(notif => {
      const iconClass =
        notif.type === "chat"
          ? "notif-icon-chat"
          : (
            (
              notif.type === "system" ||
              notif.type === "broadcast"
            )
              ? "notif-icon-system"
              : "notif-icon-comment"
          );

      const icon =
        notif.type === "chat"
          ? "💬"
          : (
            (
              notif.type === "system" ||
              notif.type === "broadcast"
            )
              ? "🔔"
              : "📝"
          );

      let time = "";

      try {
        const date =
          new Date(notif.waktu);
        const diff =
          (
            new Date() -
            date
          ) / 1000;

        if (diff < 60) {
          time = "Baru saja";
        } else if (diff < 3600) {
          time =
            Math.floor(diff / 60) +
            " mnt";
        } else if (diff < 86400) {
          time =
            Math.floor(diff / 3600) +
            " jam";
        } else {
          time =
            Math.floor(diff / 86400) +
            " hr";
        }
      } catch (error) {}

      container.insertAdjacentHTML(
        "beforeend",
        `
          <button
            type="button"
            class="notif-item"
            onclick="
              handleNotifClick(
                '${escJs(notif.type)}',
                '${escJs(notif.key)}'
              )
            "
            style="
              width:100%;
              text-align:left;
              border:1px solid rgba(224,232,244,.96);
            "
          >
            <div class="notif-icon-dash ${iconClass}">
              ${icon}
            </div>

            <div class="notif-info">
              <div class="notif-title-dash">
                ${esc(notif.title)}
              </div>

              <div class="notif-desc-dash">
                ${esc(notif.desc)}
              </div>
            </div>

            <div class="notif-time-dash">
              ${esc(time)}
            </div>
          </button>
        `
      );
    });

    if (
      combined.length > 2 &&
      !isShowingAllNotifs
    ) {
      container.insertAdjacentHTML(
        "beforeend",
        `
          <button
            type="button"
            class="notif-more"
            onclick="showAllDashboardNotifs()"
            style="width:100%;border:0;"
          >
            Lihat ${
              combined.length - 2
            } notifikasi lainnya...
          </button>
        `
      );
    }
  }

  async function clickNotif(type, key) {
    const notif =
      getAllNotifs().find(item =>
        item.type === type &&
        item.key === key
      );

    if (!notif) {
      renderNotifs();
      return;
    }

    if (
      type === "comment" ||
      type === "reply"
    ) {
      await markCommentRead(key);
      scrollToComment(notif.id);
      return;
    }

    if (type === "chat") {
      await markRoomRead(
        notif.roomId,
        notif.waktu
      );

      globalChatNotifs =
        globalChatNotifs.filter(item =>
          item.key !== key
        );

      renderNotifs();

      bukaChatDariNotifDashboard(
        notif.contactLabel,
        notif.contactDisplay,
        notif.roomId
      );

      return;
    }

    if (type === "broadcast") {
      await markRoomRead(
        notif.roomId,
        notif.waktu
      );

      broadcastNotifs =
        broadcastNotifs.filter(item =>
          item.key !== key
        );

      renderNotifs();
      return;
    }

    if (type === "system") {
      await markSystemRead(notif);

      const target =
        notif.link || "";

      if (target) {
        try {
          const frame =
            window.parent?.document
              ?.getElementById(
                "contentFrame"
              );

          if (frame) {
            frame.src = target;
            return;
          }
        } catch (error) {}

        window.location.href = target;
      }
    }
  }

  function parseYoutube(value, rawAllowed = false) {
    const raw =
      String(value || "").trim();

    if (!raw) return null;

    const match =
      raw.match(
        /(?:youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/(?:shorts|live)\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/i
      );

    if (match) {
      return {
        type: "youtube",
        id: match[1]
      };
    }

    if (
      rawAllowed &&
      /^[A-Za-z0-9_-]{6,20}$/.test(raw)
    ) {
      return {
        type: "youtube",
        id: raw
      };
    }

    return null;
  }

  function parseInstagram(value, rawAllowed = false) {
    const raw =
      String(value || "").trim();

    if (!raw) return null;

    const match =
      raw.match(
        /instagram\.com\/(p|reel|tv)\/([^/?#"'<>]+)/i
      );

    if (match) {
      return {
        type: "instagram",
        kind:
          match[1].toLowerCase() ===
          "reel"
            ? "reel"
            : "post",
        id: match[2]
      };
    }

    if (
      rawAllowed &&
      /^[A-Za-z0-9_-]{5,40}$/.test(raw)
    ) {
      return {
        type: "instagram",
        kind: "post",
        id: raw
      };
    }

    return null;
  }

  function parseDirect(value, hint = "") {
    const raw =
      String(value || "").trim();

    if (!raw) return null;

    const lowerHint =
      String(hint).toLowerCase();

    if (
      /^https?:\/\//i.test(raw) &&
      (
        /\.(?:jpg|jpeg|png|webp|gif)(?:[?#].*)?$/i.test(raw) ||
        lowerHint.includes("foto") ||
        lowerHint.includes("image") ||
        lowerHint.includes("gambar")
      )
    ) {
      return {
        type: "image",
        url: raw
      };
    }

    if (
      /^https?:\/\//i.test(raw) &&
      (
        /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(raw) ||
        lowerHint.includes("video")
      )
    ) {
      return {
        type: "video",
        url: raw
      };
    }

    return null;
  }

  function collectMedia(
    node,
    hint = "",
    output = []
  ) {
    if (
      node === null ||
      node === undefined
    ) {
      return output;
    }

    const lowerHint =
      String(hint).toLowerCase();

    if (
      typeof node === "string" ||
      typeof node === "number"
    ) {
      const youtube =
        parseYoutube(
          node,
          lowerHint.includes("youtube") ||
          lowerHint === "yt"
        );

      if (youtube) {
        output.push(youtube);
        return output;
      }

      const instagram =
        parseInstagram(
          node,
          lowerHint.includes("instagram") ||
          lowerHint === "ig" ||
          lowerHint.includes("shortcode")
        );

      if (instagram) {
        output.push(instagram);
        return output;
      }

      const direct =
        parseDirect(
          node,
          lowerHint
        );

      if (direct) {
        output.push(direct);
      }

      return output;
    }

    if (Array.isArray(node)) {
      node.forEach(item =>
        collectMedia(
          item,
          hint,
          output
        )
      );

      return output;
    }

    if (typeof node === "object") {
      const platform =
        String(
          node.platform ||
          node.jenis ||
          node.type ||
          node.tipe ||
          ""
        ).toLowerCase();

      const directValue =
        node.url ||
        node.link ||
        node.src ||
        node.embed ||
        node.videoId ||
        node.youtubeId ||
        node.instagramId ||
        node.postId ||
        node.shortcode ||
        node.id ||
        "";

      if (directValue) {
        if (
          platform.includes("youtube") ||
          platform === "yt"
        ) {
          const item =
            parseYoutube(
              directValue,
              true
            );
          if (item) output.push(item);
        } else if (
          platform.includes("instagram") ||
          platform === "ig"
        ) {
          const item =
            parseInstagram(
              directValue,
              true
            );

          if (item) {
            if (
              platform.includes("reel")
            ) {
              item.kind = "reel";
            }
            output.push(item);
          }
        } else {
          collectMedia(
            directValue,
            platform || hint,
            output
          );
        }
      }

      Object.entries(node)
        .forEach(([key, value]) => {
          if (
            [
              "url",
              "link",
              "src",
              "embed",
              "videoId",
              "youtubeId",
              "instagramId",
              "postId",
              "shortcode",
              "id",
              "platform",
              "jenis",
              "type",
              "tipe"
            ].includes(key)
          ) {
            return;
          }

          collectMedia(
            value,
            key,
            output
          );
        });
    }

    return output;
  }

  function parseMedia(data = {}) {
    const collected =
      collectMedia(data);

    const unique = new Map();

    collected.forEach(item => {
      const key =
        item.type === "youtube" ||
        item.type === "instagram"
          ? `${item.type}:${item.kind || ""}:${item.id}`
          : `${item.type}:${item.url}`;

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    mediaItems =
      [...unique.values()].reverse();
  }

  function mediaHeader(
    label,
    icon,
    cssClass
  ) {
    return `
      <div class="media-header">
        <div class="icon-brand ${cssClass}">
          ${icon}
        </div>

        <div class="kabar-info">
          <span class="kabar-name">
            @fajrulislammedia
          </span>

          <span class="kabar-time">
            ${label}
          </span>
        </div>
      </div>
    `;
  }

  function mediaCard(media) {
    if (!media) return "";

    if (
      media.type === "youtube" &&
      media.id
    ) {
      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader(
            "Video Pesantren Cahaya",
            "▶",
            "yt-brand"
          )}

          <div class="media-frame-wrap youtube">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.id)}?rel=0&playsinline=1&modestbranding=1"
              title="Video YouTube Pesantren Cahaya"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>

          <a
            class="media-source-link"
            href="https://www.youtube.com/watch?v=${encodeURIComponent(media.id)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka langsung di YouTube ↗
          </a>
        </article>
      `;
    }

    if (
      media.type === "instagram" &&
      media.id
    ) {
      const route =
        media.kind === "reel"
          ? "reel"
          : "p";

      const ratio =
        media.kind === "reel"
          ? "instagram-reel"
          : "instagram-post";

      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader(
            media.kind === "reel"
              ? "Reel Pesantren Cahaya"
              : "Foto Pesantren Cahaya",
            "◎",
            "ig-brand"
          )}

          <div class="media-frame-wrap ${ratio}">
            <iframe
              src="https://www.instagram.com/${route}/${encodeURIComponent(media.id)}/embed/captioned/"
              title="Instagram Pesantren Cahaya"
              allowtransparency="true"
              allow="encrypted-media"
              loading="lazy"
            ></iframe>
          </div>

          <a
            class="media-source-link"
            href="https://www.instagram.com/${route}/${encodeURIComponent(media.id)}/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka langsung di Instagram ↗
          </a>
        </article>
      `;
    }

    if (
      media.type === "image" &&
      media.url
    ) {
      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader(
            "Foto Pesantren Cahaya",
            "📷",
            "ig-brand"
          )}

          <div class="media-frame-wrap direct-image">
            <img
              src="${esc(media.url)}"
              alt="Foto Pesantren Cahaya"
              loading="lazy"
            >
          </div>
        </article>
      `;
    }

    if (
      media.type === "video" &&
      media.url
    ) {
      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader(
            "Video Pesantren Cahaya",
            "▶",
            "yt-brand"
          )}

          <div class="media-frame-wrap direct-video">
            <video
              src="${esc(media.url)}"
              controls
              playsinline
              preload="metadata"
            ></video>
          </div>
        </article>
      `;
    }

    return "";
  }

  function hidePushCard() {
    const card =
      document.getElementById(
        "pushPermissionCard"
      );

    if (!card) {
      return;
    }

    card.classList.remove(
      "show"
    );

    card.style.display =
      "none";
  }

  function pushCard(
    message,
    showButton = true
  ) {
    const card =
      document.getElementById(
        "pushPermissionCard"
      );

    const text =
      document.getElementById(
        "pushPermissionText"
      );

    const button =
      document.getElementById(
        "pushPermissionButton"
      );

    if (!card || !text || !button) {
      return;
    }

    text.textContent = message;
    button.style.display =
      showButton
        ? "inline-flex"
        : "none";

    card.classList.add("show");
  }

  async function preparePush() {
    if (pushPrepared) return;
    pushPrepared = true;

    if (
      !(
        "serviceWorker" in navigator &&
        "Notification" in window &&
        firebase.messaging
      )
    ) {
      /*
       * Chat tetap berfungsi normal.
       * Status teknis push tidak perlu ditampilkan kepada wali.
       */
      hidePushCard();
      return;
    }

    try {
      pushRegistration =
        await navigator.serviceWorker
          .register(
            "firebase-messaging-sw.js",
            {
              scope: "./"
            }
          );

      pushMessaging =
        firebase.messaging();

      pushMessaging.onMessage(payload => {
        const title =
          payload?.notification?.title ||
          payload?.data?.title ||
          "Pesan Baru";

        const body =
          payload?.notification?.body ||
          payload?.data?.body ||
          "";

        notifAudioChat
          .play()
          .catch(() => {});

        showToast(title, body);
      });

      if (
        Notification.permission ===
        "granted"
      ) {
        await registerToken();

        document.getElementById(
          "pushPermissionCard"
        )?.classList.remove("show");

        return;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        /*
         * Jangan tampilkan peringatan teknis di daftar chat.
         * Wali tetap dapat memakai chat realtime.
         */
        hidePushCard();
        return;
      }

      pushCard(
        "Aktifkan notifikasi agar balasan tetap muncul saat portal ditutup.",
        true
      );
    } catch (error) {
      console.warn(
        "Push notification belum siap:",
        error
      );

      /*
       * Kegagalan push tidak memengaruhi fungsi chat.
       * Pesan teknis disembunyikan dari antarmuka wali.
       */
      hidePushCard();
    }
  }

  async function registerToken() {
    if (
      !pushMessaging ||
      !pushRegistration
    ) {
      throw new Error(
        "Service worker belum siap."
      );
    }

    const snapshot =
      await dbRT
        .ref(
          "cahaya_app/pengaturan_notifikasi_web/vapidKey"
        )
        .once("value");

    const vapidKey =
      String(
        snapshot.val() || ""
      ).trim();

    if (!vapidKey) {
      throw new Error(
        "VAPID key belum dipasang di Firebase."
      );
    }

    const token =
      await pushMessaging.getToken({
        vapidKey,
        serviceWorkerRegistration:
          pushRegistration
      });

    if (!token) {
      throw new Error(
        "Token notifikasi belum dibuat."
      );
    }

    const tokenKey =
      safeKey(
        token.slice(-42)
      );

    await dbRT
      .ref(
        `cahaya_app/fcm_tokens_wali/${safeKey(userNameAsli)}/${tokenKey}`
      )
      .set({
        token,
        username: userNameAsli,
        namaAnak: namaAnakUtuh,
        aktif: true,
        userAgent:
          navigator.userAgent,
        diperbarui:
          new Date().toISOString()
      });

    return token;
  }

  function bootstrap() {
    let attempts = 0;

    const timer = setInterval(() => {
      attempts++;

      if (
        typeof dbRT !== "undefined" &&
        typeof pListUsers !== "undefined" &&
        Array.isArray(pListUsers)
      ) {
        clearInterval(timer);

        if (!IS_EMBEDDED_WALI_PORTAL) {
          buildContacts();
          listenReadReceipts();
          setTimeout(openFromUrl, 900);
        } else {
          const fab = document.getElementById("fabChat");
          const win = document.getElementById("chatWindow");
          if (fab) fab.style.display = "none";
          if (win) win.style.display = "none";
        }
        listenSystemNotifs();
        preparePush();
      }

      if (attempts > 50) {
        clearInterval(timer);
      }
    }, 180);
  }

  function openFromUrl() {
    let search = "";

    try {
      search =
        window.parent &&
        window.parent !== window
          ? window.parent.location.search
          : window.location.search;
    } catch (error) {
      search =
        window.location.search;
    }

    const params =
      new URLSearchParams(search);

    const roomId =
      params.get("room");

    if (
      params.get("openChat") !== "1" ||
      !roomId
    ) {
      return;
    }

    const contact =
      contactItems().find(item =>
        item.roomId === roomId
      );

    if (!contact) return;

    document.getElementById(
      "chatWindow"
    ).style.display = "flex";

    openChat(contact, roomId);
  }

  // Override media functions before the original DOMContentLoaded work.
  window.parsePengaturanMedia =
    parseMedia;

  window.susunAntreanMedia =
    function () {
      return [...mediaItems];
    };

  window.renderKartuMedia =
    mediaCard;

  // Override notification functions.
  window.renderDashboardNotifs =
    renderNotifs;

  window.showAllDashboardNotifs =
    function () {
      isShowingAllNotifs = true;
      renderNotifs();
    };

  window.handleNotifClick =
    clickNotif;

  // Override chat functions.
  window.listenToGlobalMessages =
    installChatListener;

  window.toggleChat =
    function () {
      if (IS_EMBEDDED_WALI_PORTAL) {
        try { window.parent.toggleWaliChat?.(); } catch (_) {}
        return;
      }
      const chatWindow =
        document.getElementById(
          "chatWindow"
        );

      if (
        chatWindow.style.display ===
        "flex"
      ) {
        chatWindow.style.display =
          "none";

        if (chatListener) {
          dbRT
            .ref(
              `cahaya_app/pesan_global/${chatListener}`
            )
            .off();

          chatListener = null;
        }
      } else {
        chatWindow.style.display =
          "flex";
        showList();
        unlockAudio();
      }
    };

  window.showChatContactList =
    showList;

  window.filterChatContacts =
    renderContactList;

  window.openAllowedContactByIndex =
    function (index) {
      const contact =
        renderedContacts[index];

      if (contact) {
        openChat(
          contact,
          contact.roomId
        );
      }
    };

  window.bukaChatDariNotif =
    function () {
      document.getElementById(
        "inAppNotif"
      ).classList.remove("show");

      window.toggleChat();
    };

  window.bukaChatDariNotifDashboard =
    function (
      actualLabel,
      display,
      roomId
    ) {
      const contact =
        contactItems().find(item =>
          item.roomId === roomId
        ) ||
        findContact(
          actualLabel ||
          display
        );

      document.getElementById(
        "chatWindow"
      ).style.display = "flex";

      if (contact) {
        openChat(
          contact,
          roomId
        );
      } else {
        showList();
      }
    };

  window.autoResizeChatInput =
    autoResize;

  window.sendChatMessage =
    sendMessage;

  window.handleChatEnter =
    function (event) {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }
    };

  window.startMessageLongPress =
    function (
      messageId,
      text,
      roomId
    ) {
      clearTimeout(longPressTimer);

      longPressTimer =
        setTimeout(() => {
          window.openMsgAction(
            messageId,
            text,
            roomId
          );
        }, 520);
    };

  window.cancelMessageLongPress =
    function () {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    };

  window.openMsgAction =
    function (
      messageId,
      text,
      roomId =
        activeRoomId
    ) {
      selectedMsgId = messageId;
      selectedMsgText = text;
      selectedRoomId = roomId;

      document.getElementById(
        "actionSheetOverlay"
      ).style.display = "flex";
    };

  window.closeActionSheet =
    function (event) {
      if (
        event &&
        event.target !==
        document.getElementById(
          "actionSheetOverlay"
        )
      ) {
        return;
      }

      document.getElementById(
        "actionSheetOverlay"
      ).style.display = "none";
    };

  window.deleteSelectedMsg =
    async function () {
      const roomId =
        selectedRoomId ||
        activeRoomId;

      if (
        !roomId ||
        !selectedMsgId
      ) {
        return;
      }

      if (
        !confirm(
          "Hapus pesan ini?"
        )
      ) {
        return;
      }

      try {
        await dbRT
          .ref(
            `cahaya_app/pesan_global/${roomId}/${selectedMsgId}`
          )
          .update({
            teks: "",
            dihapus: true,
            deleted: true,
            deletedAt:
              new Date().toISOString(),
            deletedBy:
              userNameAsli
          });

        window.closeActionSheet();
      } catch (error) {
        alert(
          "Pesan belum dapat dihapus: " +
          (
            error?.message ||
            "Periksa izin Firebase."
          )
        );
      }
    };

  window.editSelectedMsg =
    function () {
      if (!selectedMsgId) return;

      const input =
        document.getElementById(
          "chatInput"
        );

      input.value =
        selectedMsgText;

      editModeId =
        selectedMsgId;

      const button =
        document.getElementById(
          "btnSendChat"
        );

      button.textContent = "✓";
      button.classList.add(
        "editing"
      );

      autoResize();
      input.focus();
      window.closeActionSheet();
    };

  window.aktifkanPushNotification =
    async function () {
      if (
        !("Notification" in window)
      ) {
        alert(
          "Browser tidak mendukung notifikasi."
        );
        return;
      }

      const permission =
        await Notification
          .requestPermission();

      if (
        permission !== "granted"
      ) {
        pushCard(
          "Izin notifikasi belum diberikan.",
          true
        );
        return;
      }

      try {
        await registerToken();

        document.getElementById(
          "pushPermissionCard"
        ).classList.remove("show");

        alert(
          "Notifikasi HP berhasil diaktifkan."
        );
      } catch (error) {
        alert(
          "Notifikasi belum aktif: " +
          (
            error?.message ||
            "VAPID key belum tersedia."
          )
        );
      }
    };

  document.addEventListener(
    "DOMContentLoaded",
    bootstrap
  );
})();
