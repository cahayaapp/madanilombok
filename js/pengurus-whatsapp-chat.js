/*
 * CAHAYA APP — LIVE CHAT PENGURUS
 * WhatsApp-style, role-aware, compatible with Portal Wali.
 */

(function () {
  "use strict";

  const PRIVILEGED_ROLES =
    new Set([
      "admin",
      "direktur",
      "wakil",
      "konselor"
    ]);

  const BROADCASTS = [
    {
      id: "semua",
      roomId:
        "room_broadcast_semua",
      title:
        "Broadcast Semua Pengguna",
      subtitle:
        "Pengurus dan seluruh wali santri",
      icon:
        "📣",
      audience:
        "semua"
    },
    {
      id: "pengurus",
      roomId:
        "room_broadcast_pengurus",
      title:
        "Broadcast Seluruh Pengurus",
      subtitle:
        "Seluruh akun pengurus CAHAYA",
      icon:
        "👥",
      audience:
        "pengurus"
    },
    {
      id: "wali",
      roomId:
        "room_broadcast_wali",
      title:
        "Broadcast Seluruh Wali",
      subtitle:
        "Seluruh akun wali santri",
      icon:
        "👨‍👩‍👦",
      audience:
        "wali"
    }
  ];

  const state = {
    rooms: {},
    meta: {},
    readMap: {},
    contacts: [],
    renderedContacts: [],
    renderedBroadcasts: [],
    active: null,
    selectedMessage: null,
    longPressTimer: null,
    listenersInstalled: false,
    initialRoomsLoaded: false,
    latestNotifiedTime: 0,
    dbNotifications: []
  };

  const oldShowInAppNotif =
    typeof showInAppNotif ===
    "function"
      ? showInAppNotif
      : null;

  function esc(
    value = ""
  ) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escJs(
    value = ""
  ) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n");
  }

  function cleanIdentity(
    value = ""
  ) {
    return String(value)
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9]/g,
        ""
      )
      .toLowerCase();
  }

  function safeFirebaseKey(
    value = ""
  ) {
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

  function normalizeRoleLocal(
    value = ""
  ) {
    const raw =
      String(value)
        .toLowerCase()
        .trim();

    const aliases = {
      administrator:
        "admin",
      "admin / tu":
        "admin",
      "wakil direktur":
        "wakil",
      wakil_direktur:
        "wakil",
      wadir:
        "wakil",
      "wakil direktur bidang":
        "wakil",
      counselor:
        "konselor",
      konseling:
        "konselor",
      wali_santri:
        "wali",
      "wali santri":
        "wali"
    };

    if (
      typeof normalisasiRole ===
      "function"
    ) {
      return normalisasiRole(
        aliases[raw] ||
        raw
      );
    }

    return aliases[raw] ||
      raw;
  }

  function rolesOf(
    user = {}
  ) {
    let raw =
      user.akses ??
      user.jabatan ??
      user.roles ??
      user.role ??
      [];

    if (
      !Array.isArray(raw)
    ) {
      if (
        raw &&
        typeof raw ===
        "object"
      ) {
        raw =
          Object.values(raw);
      } else {
        raw = [raw];
      }
    }

    return [
      ...new Set(
        raw
          .flatMap(value => {
            if (
              typeof value ===
              "string" &&
              value.includes(",")
            ) {
              return value.split(",");
            }

            return [value];
          })
          .map(
            normalizeRoleLocal
          )
          .filter(Boolean)
      )
    ];
  }

  function isPrivilegedRoles(
    roles = []
  ) {
    return roles.some(role =>
      PRIVILEGED_ROLES.has(
        role
      )
    );
  }

  function currentIsPrivileged() {
    const roleCandidates = [
      ...(Array.isArray(myRoles) ? myRoles : []),
      ...rolesOf(pUserSafe || {}),
      ...rolesOf(currentUserProfile())
    ]
      .map(normalizeRoleLocal)
      .filter(Boolean);

    return isPrivilegedRoles(
      [...new Set(roleCandidates)]
    );
  }

  function roleLabelLocal(
    role
  ) {
    if (
      typeof labelRole ===
      "function"
    ) {
      return labelRole(role);
    }

    const labels = {
      admin:
        "Administrator",
      direktur:
        "Direktur",
      wakil:
        "Wakil Direktur",
      konselor:
        "Konselor",
      guru:
        "Guru",
      naqib:
        "Naqib",
      supervisor:
        "Supervisor",
      yayasan:
        "Ketua Yayasan",
      kesehatan:
        "Tim Kesehatan",
      sarpras:
        "Kepala Sarpras",
      layanan:
        "Tim Layanan",
      cla:
        "CLA",
      wali:
        "Wali Santri"
    };

    return labels[role] ||
      role;
  }

  function userUsername(
    user = {}
  ) {
    return String(
      user.username ||
      user.userName ||
      user.email
        ?.split("@")[0] ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function userLabel(
    user = {}
  ) {
    return String(
      user.label ||
      user.namaTampilan ||
      user.nama ||
      user.username ||
      "Pengguna CAHAYA"
    ).trim();
  }

  function userPhoto(
    user = {}
  ) {
    return (
      user.fotoProfil ||
      user.foto ||
      user.photoURL ||
      user.avatar ||
      ""
    );
  }

  function isWaliUser(
    user = {}
  ) {
    return rolesOf(user)
      .includes("wali");
  }

  function waliChildName(
    user = {}
  ) {
    return String(
      user.namaAnak ||
      user.namaSantri ||
      user.nama_anak ||
      user.anak ||
      user.label ||
      user.username ||
      "Santri"
    ).trim();
  }

  function smartCallName(
    value = ""
  ) {
    if (
      typeof getPanggilanCerdas ===
      "function"
    ) {
      return getPanggilanCerdas(
        String(value)
          .toUpperCase()
      );
    }

    const parts =
      String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return parts[0] ||
      "Santri";
  }

  function chatIdentityFor(
    user = {}
  ) {
    if (
      isWaliUser(user)
    ) {
      return (
        "Abi Ummi " +
        smartCallName(
          waliChildName(user)
        )
      );
    }

    return userLabel(user);
  }

  function displayNameFor(
    user = {}
  ) {
    if (
      isWaliUser(user)
    ) {
      return (
        "Wali dari " +
        waliChildName(user)
      );
    }

    return userLabel(user);
  }

  function roleSummaryFor(
    user = {}
  ) {
    const roles =
      rolesOf(user);

    if (
      roles.includes("wali")
    ) {
      return (
        "Wali Santri • " +
        chatIdentityFor(user)
      );
    }

    return roles
      .map(roleLabelLocal)
      .join(" • ") ||
      "Pengguna CAHAYA";
  }

  function currentUserProfile() {
    return {
      ...(pUserSafe || {}),
      username:
        realUsername ||
        pUserSafe?.username ||
        "",
      label:
        namaSaya ||
        pUserSafe?.label ||
        "",
      akses:
        Array.isArray(myRoles)
          ? myRoles
          : []
    };
  }

  function isSelfUser(
    user = {}
  ) {
    const username =
      userUsername(user);

    if (
      username &&
      username ===
        String(
          realUsername ||
          ""
        ).toLowerCase()
    ) {
      return true;
    }

    const uid =
      String(
        user.uid ||
        ""
      );

    if (
      uid &&
      pUserSafe?.uid &&
      uid ===
        String(
          pUserSafe.uid
        )
    ) {
      return true;
    }

    return false;
  }

  function canChatWith(
    user = {}
  ) {
    if (
      !user ||
      isSelfUser(user)
    ) {
      return false;
    }

    if (
      currentIsPrivileged()
    ) {
      return true;
    }

    return isPrivilegedRoles(
      rolesOf(user)
    );
  }

  function defaultRoomId(
    contact
  ) {
    const myIdentity =
      chatIdentityFor(
        currentUserProfile()
      ) ||
      namaSaya;

    const theirIdentity =
      contact.chatIdentity;

    if (
      typeof pGetRoomId ===
      "function"
    ) {
      return pGetRoomId(
        myIdentity,
        theirIdentity
      );
    }

    return (
      "chat_" +
      [
        cleanIdentity(
          myIdentity
        ),
        cleanIdentity(
          theirIdentity
        )
      ]
        .sort()
        .join("_")
    );
  }

  function normalizeContact(
    user = {}
  ) {
    const username =
      userUsername(user);

    const roles =
      rolesOf(user);

    return {
      id:
        username ||
        cleanIdentity(
          userLabel(user)
        ),
      username,
      roles,
      isWali:
        roles.includes(
          "wali"
        ),
      displayName:
        displayNameFor(user),
      chatIdentity:
        chatIdentityFor(user),
      roleSummary:
        roleSummaryFor(user),
      photo:
        userPhoto(user),
      raw:
        user
    };
  }

  function buildContacts() {
    const unique =
      new Map();

    (
      Array.isArray(pListUsers)
        ? pListUsers
        : []
    )
      .filter(canChatWith)
      .map(normalizeContact)
      .forEach(contact => {
        if (
          !contact.id ||
          unique.has(contact.id)
        ) {
          return;
        }

        unique.set(
          contact.id,
          contact
        );
      });

    state.contacts =
      [...unique.values()]
        .sort((a, b) => {
          const aPrivileged =
            isPrivilegedRoles(
              a.roles
            );

          const bPrivileged =
            isPrivilegedRoles(
              b.roles
            );

          if (
            aPrivileged !==
            bPrivileged
          ) {
            return aPrivileged
              ? -1
              : 1;
          }

          return a.displayName
            .localeCompare(
              b.displayName,
              "id"
            );
        });

    renderAccessNote();
  }

  function renderAccessNote() {
    const element =
      document.getElementById(
        "pwAccessNote"
      );

    if (!element) {
      return;
    }

    if (
      currentIsPrivileged()
    ) {
      element.textContent =
        "Akses pimpinan: dapat menghubungi seluruh pengguna dan mengirim broadcast.";
    } else {
      element.textContent =
        "Akses terbatas: Anda hanya dapat menghubungi Direktur, Wakil Direktur, Admin, dan Konselor.";
    }
  }

  function messageValues(
    messages
  ) {
    return Object.entries(
      messages || {}
    )
      .map(
        ([id, value]) => ({
          id,
          ...value
        })
      )
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

  function latestMessage(
    roomId
  ) {
    const values =
      messageValues(
        state.rooms[
          roomId
        ]
      );

    return values.length
      ? values[
          values.length -
          1
        ]
      : null;
  }

  function isOwnMessage(
    message = {}
  ) {
    const senderUsername =
      String(
        message.senderUsername ||
        ""
      ).toLowerCase();

    if (
      senderUsername &&
      senderUsername ===
        String(
          realUsername ||
          ""
        ).toLowerCase()
    ) {
      return true;
    }

    const sender =
      cleanIdentity(
        message.pengirim ||
        message.senderDisplay ||
        ""
      );

    return [
      cleanIdentity(
        namaSaya
      ),
      cleanIdentity(
        userLabel(
          currentUserProfile()
        )
      ),
      cleanIdentity(
        chatIdentityFor(
          currentUserProfile()
        )
      ),
      cleanIdentity(
        realUsername
      )
    ]
      .filter(Boolean)
      .includes(sender);
  }

  function metaHasPair(
    meta,
    contact
  ) {
    if (!meta) {
      return false;
    }

    const serialized =
      JSON.stringify(meta)
        .toLowerCase();

    const myCandidates = [
      realUsername,
      namaSaya,
      userLabel(
        currentUserProfile()
      ),
      chatIdentityFor(
        currentUserProfile()
      )
    ]
      .filter(Boolean)
      .map(value =>
        String(value)
          .toLowerCase()
      );

    const contactCandidates = [
      contact.username,
      contact.displayName,
      contact.chatIdentity
    ]
      .filter(Boolean)
      .map(value =>
        String(value)
          .toLowerCase()
      );

    return (
      myCandidates.some(value =>
        serialized.includes(value)
      ) &&
      contactCandidates.some(value =>
        serialized.includes(value)
      )
    );
  }

  function messagesHavePair(
    messages,
    contact
  ) {
    const myUsername =
      String(
        realUsername ||
        ""
      ).toLowerCase();

    const contactUsername =
      String(
        contact.username ||
        ""
      ).toLowerCase();

    return messageValues(messages)
      .some(message => {
        const sender =
          String(
            message.senderUsername ||
            ""
          ).toLowerCase();

        const recipient =
          String(
            message.recipientUsername ||
            ""
          ).toLowerCase();

        if (
          myUsername &&
          contactUsername &&
          (
            (
              sender ===
                myUsername &&
              recipient ===
                contactUsername
            ) ||
            (
              sender ===
                contactUsername &&
              recipient ===
                myUsername
            )
          )
        ) {
          return true;
        }

        const senderDisplay =
          cleanIdentity(
            message.pengirim ||
            message.senderDisplay ||
            ""
          );

        const recipientDisplay =
          cleanIdentity(
            message.recipientDisplay ||
            ""
          );

        const myLabels = [
          namaSaya,
          userLabel(
            currentUserProfile()
          ),
          chatIdentityFor(
            currentUserProfile()
          )
        ]
          .map(
            cleanIdentity
          )
          .filter(Boolean);

        const contactLabels = [
          contact.displayName,
          contact.chatIdentity
        ]
          .map(
            cleanIdentity
          )
          .filter(Boolean);

        return (
          (
            myLabels.includes(
              senderDisplay
            ) &&
            contactLabels.includes(
              recipientDisplay
            )
          ) ||
          (
            contactLabels.includes(
              senderDisplay
            ) &&
            myLabels.includes(
              recipientDisplay
            )
          )
        );
      });
  }

  function resolveRoomId(
    contact
  ) {
    for (
      const [roomId, meta]
      of Object.entries(
        state.meta ||
        {}
      )
    ) {
      if (
        metaHasPair(
          meta,
          contact
        )
      ) {
        return roomId;
      }
    }

    for (
      const [roomId, messages]
      of Object.entries(
        state.rooms ||
        {}
      )
    ) {
      if (
        roomId.startsWith(
          "room_broadcast_"
        )
      ) {
        continue;
      }

      if (
        messagesHavePair(
          messages,
          contact
        )
      ) {
        return roomId;
      }
    }

    const fallback =
      defaultRoomId(contact);

    if (
      state.rooms[
        fallback
      ]
    ) {
      return fallback;
    }

    const myClean =
      cleanIdentity(
        chatIdentityFor(
          currentUserProfile()
        )
      );

    const contactClean =
      cleanIdentity(
        contact.chatIdentity
      );

    const existing =
      Object.keys(
        state.rooms ||
        {}
      )
        .find(roomId => {
          const room =
            roomId.toLowerCase();

          return (
            !room.startsWith(
              "room_broadcast_"
            ) &&
            room.includes(
              myClean
            ) &&
            room.includes(
              contactClean
            )
          );
        });

    return existing ||
      fallback;
  }

  function readTimestamp(
    roomId
  ) {
    const local =
      localStorage.getItem(
        "chat_read_" +
        roomId
      ) ||
      "0";

    const remote =
      state.readMap[
        roomId
      ]?.waktu ||
      state.readMap[
        roomId
      ] ||
      "0";

    return new Date(local) >
      new Date(remote)
      ? local
      : remote;
  }

  async function markRoomRead(
    roomId,
    time =
      new Date()
        .toISOString()
  ) {
    if (!roomId) {
      return;
    }

    const value =
      time ||
      new Date()
        .toISOString();

    localStorage.setItem(
      "chat_read_" +
      roomId,
      value
    );

    state.readMap[
      roomId
    ] = {
      waktu:
        value
    };

    try {
      await dbRT
        .ref(
          `cahaya_app/pesan_dibaca/${safeFirebaseKey(realUsername)}/${roomId}`
        )
        .set({
          waktu:
            value,
          username:
            realUsername,
          diperbarui:
            new Date()
              .toISOString()
        });
    } catch (error) {
      console.warn(
        "Status baca chat belum tersimpan:",
        error
      );
    }
  }

  function unreadMessages(
    roomId
  ) {
    const parsedLastRead =
      new Date(
        readTimestamp(
          roomId
        )
      );

    const lastReadTime =
      Number.isNaN(
        parsedLastRead.getTime()
      )
        ? 0
        : parsedLastRead.getTime();

    return messageValues(
      state.rooms[
        roomId
      ]
    )
      .filter(message => {
        if (
          isOwnMessage(
            message
          )
        ) {
          return false;
        }

        const parsedMessageTime =
          new Date(
            message.waktu ||
            message.createdAt ||
            0
          );

        const messageTime =
          parsedMessageTime.getTime();

        if (
          !Number.isFinite(
            messageTime
          )
        ) {
          return false;
        }

        const hasSender =
          Boolean(
            message.senderUsername ||
            message.pengirim ||
            message.senderDisplay ||
            message.senderUid ||
            message.pengirimUid
          );

        const hasMessageContent =
          Boolean(
            String(
              message.teks ||
              ""
            ).trim()
          ) ||
          message.dihapus === true ||
          message.deleted === true;

        if (
          !hasSender ||
          !hasMessageContent
        ) {
          return false;
        }

        return (
          messageTime >
          lastReadTime
        );
      });
  }

  function formatListTime(
    value
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const now =
      new Date();

    if (
      date.toDateString() ===
      now.toDateString()
    ) {
      return date
        .toLocaleTimeString(
          "id-ID",
          {
            hour:
              "2-digit",
            minute:
              "2-digit"
          }
        );
    }

    const yesterday =
      new Date(now);

    yesterday.setDate(
      now.getDate() -
      1
    );

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Kemarin";
    }

    return date
      .toLocaleDateString(
        "id-ID",
        {
          day:
            "2-digit",
          month:
            "2-digit"
        }
      );
  }

  function contactItems() {
    return state.contacts
      .map(contact => {
        const roomId =
          resolveRoomId(
            contact
          );

        const latest =
          latestMessage(
            roomId
          );

        const unread =
          unreadMessages(
            roomId
          );

        return {
          ...contact,
          roomId,
          latest,
          unreadCount:
            unread.length,
          isUnread:
            unread.length >
            0
        };
      })
      .sort((a, b) => {
        if (
          a.latest &&
          b.latest
        ) {
          return (
            new Date(
              b.latest.waktu ||
              0
            ) -
            new Date(
              a.latest.waktu ||
              0
            )
          );
        }

        if (a.latest) {
          return -1;
        }

        if (b.latest) {
          return 1;
        }

        return a.displayName
          .localeCompare(
            b.displayName,
            "id"
          );
      });
  }

  function broadcastItems() {
    if (!currentIsPrivileged()) {
      return [];
    }

    return BROADCASTS.map(item => ({
      ...item,
      latest: null,
      unreadCount: 0,
      isUnread: false,
      canSend: true
    }));
  }

  function avatarHtml(
    contact
  ) {
    const initial =
      String(
        contact.displayName ||
        "P"
      )
        .charAt(0)
        .toUpperCase();

    if (
      contact.photo
    ) {
      return `
        <div class="pw-contact-avatar">
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
      <div class="pw-contact-avatar">
        ${esc(initial)}
      </div>
    `;
  }

  function renderBroadcastList() {
    const container =
      document.getElementById(
        "pwBroadcastList"
      );

    if (!container) {
      return;
    }

    const query =
      String(
        document.getElementById(
          "pwContactSearch"
        )?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    state.renderedBroadcasts =
      broadcastItems()
        .filter(item => {
          if (!query) {
            return true;
          }

          return (
            item.title +
            " " +
            item.subtitle
          )
            .toLowerCase()
            .includes(query);
        });

    container.innerHTML =
      state.renderedBroadcasts
        .map(
          (item, index) => `
            <article
              class="pw-broadcast-card"
              onclick="openPengurusBroadcastById('${escJs(item.id)}')"
            >
              <div class="pw-broadcast-icon">
                ${item.icon}
              </div>

              <div class="pw-broadcast-copy">
                <strong>
                  ${esc(item.title)}
                </strong>

                <span>
                  ${
                    item.latest
                      ? esc(
                          item.latest.dihapus ||
                          item.latest.deleted
                            ? "Pesan telah dihapus"
                            : (
                              item.latest.teks ||
                              item.subtitle
                            )
                        )
                      : esc(item.subtitle)
                  }
                </span>
              </div>

              ${
                item.unreadCount
                  ? `
                    <span class="pw-broadcast-badge">
                      ${item.unreadCount}
                    </span>
                  `
                  : ""
              }
            </article>
          `
        )
        .join("");
  }

  function renderContactList() {
    const container =
      document.getElementById(
        "viewInbox"
      );

    if (!container) {
      return;
    }

    const query =
      String(
        document.getElementById(
          "pwContactSearch"
        )?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    state.renderedContacts =
      contactItems()
        .filter(item => {
          if (!query) {
            return true;
          }

          return [
            item.displayName,
            item.chatIdentity,
            item.username,
            item.roleSummary
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

    if (
      !state.renderedContacts.length
    ) {
      container.innerHTML = `
        <div class="pw-empty">
          Tidak ada kontak yang sesuai dengan akses role Anda.
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.renderedContacts
        .map(
          (item, index) => {
            const preview =
              item.latest
                ? (
                  item.latest.dihapus ||
                  item.latest.deleted
                    ? "Pesan telah dihapus"
                    : (
                      item.latest.teks ||
                      ""
                    )
                )
                : "Mulai percakapan";

            return `
              <article
                class="pw-contact-card"
                onclick="openPengurusContactById('${escJs(item.id)}')"
              >
                ${avatarHtml(item)}

                <div class="pw-contact-main">
                  <div class="pw-contact-row">
                    <span class="pw-contact-name">
                      ${esc(item.displayName)}
                    </span>

                    <time
                      class="pw-contact-time ${item.isUnread ? "unread" : ""}"
                    >
                      ${esc(
                        formatListTime(
                          item.latest?.waktu ||
                          item.latest?.createdAt
                        )
                      )}
                    </time>
                  </div>

                  <div class="pw-contact-row">
                    <span
                      class="pw-contact-preview ${item.isUnread ? "unread" : ""}"
                    >
                      <span class="pw-contact-role">
                        ${esc(item.roleSummary)}
                      </span>

                      ${item.latest ? " • " : ""}

                      ${esc(preview)}
                    </span>

                    ${
                      item.unreadCount
                        ? `
                          <span class="pw-unread-count">
                            ${item.unreadCount}
                          </span>
                        `
                        : ""
                    }
                  </div>
                </div>
              </article>
            `;
          }
        )
        .join("");
  }

  function renderChatList() {
    buildContacts();
    renderBroadcastList();
    renderContactList();
  }

  function totalUnreadCount() {
    const privateTotal =
      contactItems()
        .reduce(
          (total, item) =>
            total +
            item.unreadCount,
          0
        );

    const broadcastTotal =
      broadcastItems()
        .reduce(
          (total, item) =>
            total +
            item.unreadCount,
          0
        );

    return (
      privateTotal +
      broadcastTotal
    );
  }

  function updateChatBadge() {
    const badge =
      document.getElementById(
        "chatUnreadBadge"
      );

    if (!badge) {
      return;
    }

    const total =
      totalUnreadCount();

    if (total > 0) {
      badge.textContent =
        total > 99
          ? "99+"
          : total;

      badge.style.display =
        "grid";
    } else {
      badge.style.display =
        "none";
    }
  }

  function chatNotifications() {
    const privateNotifs =
      contactItems()
        .filter(item =>
          item.isUnread
        )
        .map(item => ({
          tipe:
            "chat",
          title:
            "Pesan Baru: " +
            item.displayName,
          desc:
            item.latest
              ?.dihapus ||
            item.latest
              ?.deleted
              ? "Pesan telah dihapus"
              : (
                item.latest
                  ?.teks ||
                ""
              ),
          waktu:
            item.latest
              ?.waktu ||
            new Date()
              .toISOString(),
          roomId:
            item.roomId,
          opponentActualLabel:
            item.chatIdentity,
          opponentDisplay:
            item.displayName,
          isUnread:
            true
        }));

    const broadcastNotifs =
      broadcastItems()
        .filter(item =>
          item.isUnread
        )
        .map(item => ({
          tipe:
            "chat",
          title:
            item.title,
          desc:
            item.latest
              ?.dihapus ||
            item.latest
              ?.deleted
              ? "Pesan telah dihapus"
              : (
                item.latest
                  ?.teks ||
                ""
              ),
          waktu:
            item.latest
              ?.waktu ||
            new Date()
              .toISOString(),
          roomId:
            item.roomId,
          opponentActualLabel:
            "BROADCAST_" +
            item.audience
              .toUpperCase(),
          opponentDisplay:
            item.title,
          isUnread:
            true
        }));

    return [
      ...privateNotifs,
      ...broadcastNotifs
    ];
  }

  function showChatToast(
    title,
    description
  ) {
    const titleElement =
      document.getElementById(
        "notifTitle"
      );

    const descElement =
      document.getElementById(
        "notifDesc"
      );

    const toast =
      document.getElementById(
        "inAppNotif"
      );

    if (
      !titleElement ||
      !descElement ||
      !toast
    ) {
      if (
        oldShowInAppNotif
      ) {
        oldShowInAppNotif(
          title,
          description
        );
      }

      return;
    }

    titleElement.textContent =
      title ||
      "Pesan Baru";

    descElement.textContent =
      description ||
      "";

    toast.classList.add(
      "show"
    );

    clearTimeout(
      showChatToast.timer
    );

    showChatToast.timer =
      setTimeout(() => {
        toast.classList.remove(
          "show"
        );
      }, 4300);
  }

  function maybeNotifyNewMessages() {
    if (
      !state.initialRoomsLoaded
    ) {
      state.initialRoomsLoaded =
        true;

      const latestTime =
        chatNotifications()
          .reduce(
            (max, item) =>
              Math.max(
                max,
                new Date(
                  item.waktu ||
                  0
                ).getTime()
              ),
            0
          );

      state.latestNotifiedTime =
        latestTime;

      return;
    }

    const newest =
      chatNotifications()
        .sort(
          (a, b) =>
            new Date(
              b.waktu ||
              0
            ) -
            new Date(
              a.waktu ||
              0
            )
        )[0];

    if (!newest) {
      return;
    }

    const newestTime =
      new Date(
        newest.waktu ||
        0
      ).getTime();

    if (
      newestTime <=
      state.latestNotifiedTime
    ) {
      return;
    }

    state.latestNotifiedTime =
      newestTime;

    try {
      notifSound
        .play()
        .catch(
          () => {}
        );
    } catch (error) {}

    showChatToast(
      newest.title,
      newest.desc
    );

    if (
      "Notification" in window &&
      Notification.permission ===
        "granted" &&
      document.hidden
    ) {
      try {
        const notification =
          new Notification(
            newest.title,
            {
              body:
                newest.desc,
              icon:
                "assets/logofi.png",
              tag:
                newest.roomId,
              renotify:
                true
            }
          );

        notification.onclick =
          () => {
            window.focus();

            bukaChatDariPanel(
              newest.opponentActualLabel,
              newest.opponentDisplay,
              newest.roomId
            );

            notification.close();
          };
      } catch (error) {}
    }
  }

  function formatNotifTime(
    value
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date
      .toLocaleString(
        "id-ID",
        {
          day:
            "numeric",
          month:
            "short",
          hour:
            "2-digit",
          minute:
            "2-digit"
        }
      );
  }

  function renderNotificationPanel(
    arrChat,
    arrDb
  ) {
    allGlobalNotifs = [
      ...(arrChat || []),
      ...(arrDb || [])
    ]
      .sort(
        (a, b) =>
          new Date(
            b.waktu ||
            0
          ) -
          new Date(
            a.waktu ||
            0
          )
      );

    const countUnread =
      allGlobalNotifs
        .filter(item =>
          item.isUnread ||
          item.dibaca ===
            false
        )
        .length;

    const sidebarBadge =
      document.getElementById(
        "sidebarNotifBadge"
      );

    const topBadge =
      document.getElementById(
        "topNotifBadge"
      );

    if (countUnread > 0) {
      if (sidebarBadge) {
        sidebarBadge.style.display =
          "inline-block";

        sidebarBadge.textContent =
          countUnread;
      }

      if (topBadge) {
        topBadge.style.display =
          "grid";

        topBadge.textContent =
          countUnread;
      }
    } else {
      if (sidebarBadge) {
        sidebarBadge.style.display =
          "none";
      }

      if (topBadge) {
        topBadge.style.display =
          "none";
      }
    }

    const container =
      document.getElementById(
        "listNotifikasi"
      );

    if (!container) {
      return;
    }

    if (
      !allGlobalNotifs.length
    ) {
      container.innerHTML = `
        <div style="
          text-align:center;
          color:#94a3b8;
          margin-top:20px;
          font-size:.85rem;
        ">
          Belum ada pemberitahuan.
        </div>
      `;

      return;
    }

    container.innerHTML =
      allGlobalNotifs
        .map(item => {
          const unread =
            item.tipe ===
              "chat"
              ? item.isUnread
              : item.dibaca ===
                false;

          let click =
            "";

          if (
            item.tipe ===
            "chat"
          ) {
            click = `
              onclick="
                bukaChatDariPanel(
                  '${escJs(item.opponentActualLabel)}',
                  '${escJs(item.opponentDisplay)}',
                  '${escJs(item.roomId)}'
                )
              "
            `;
          } else if (
            item.tipe ===
              "komentar" &&
            item.eventId
          ) {
            click = `
              onclick="
                bukaKomentarDariPanel(
                  '${escJs(item.eventId)}',
                  '${escJs(item.notifId)}'
                )
              "
            `;
          } else if (
            item.notifId
          ) {
            click = `
              onclick="
                bukaNotifikasiPengurus(
                  '${escJs(item.notifId)}',
                  '${escJs(
                    item.link ||
                    item.url ||
                    item.halaman ||
                    ""
                  )}'
                )
              "
            `;
          }

          return `
            <article
              class="notif-card ${unread ? "unread" : ""}"
              ${click}
            >
              <div class="notif-title">
                ${esc(
                  item.title ||
                  item.judul ||
                  "Notifikasi"
                )}
              </div>

              <div class="notif-desc">
                ${esc(
                  item.desc ||
                  item.pesan ||
                  item.keterangan ||
                  ""
                )}
              </div>

              <span class="notif-time">
                ${esc(
                  formatNotifTime(
                    item.waktu
                  )
                )}
              </span>
            </article>
          `;
        })
        .join("");
  }

  async function openDatabaseNotification(
    notifId,
    target = ""
  ) {
    if (
      notifId
    ) {
      try {
        await dbRT
          .ref(
            `cahaya_app/notifikasi_wali/${realUsername}/${notifId}`
          )
          .update({
            dibaca:
              true,
            waktuDibaca:
              new Date()
                .toISOString()
          });
      } catch (error) {
        console.warn(
          "Notifikasi belum ditandai dibaca:",
          error
        );
      }
    }

    if (
      typeof toggleNotifPanel ===
      "function"
    ) {
      toggleNotifPanel();
    }

    if (!target) {
      return;
    }

    const menu =
      typeof cariMenuBerdasarkanUrl ===
      "function"
        ? cariMenuBerdasarkanUrl(
            target
          )
        : null;

    if (
      menu &&
      typeof loadPage ===
      "function"
    ) {
      loadPage(
        target,
        menu
      );

      return;
    }

    const frame =
      document.getElementById(
        "contentFrame"
      );

    if (frame) {
      frame.src =
        target;
    }
  }

  async function savePrivateRoomMeta(
    contact,
    roomId
  ) {
    const me =
      currentUserProfile();

    const myRecord = {
      username:
        realUsername,
      label:
        namaSaya,
      chatIdentity:
        chatIdentityFor(me),
      roles:
        Array.isArray(myRoles)
          ? myRoles
          : []
    };

    const contactRecord = {
      username:
        contact.username,
      label:
        contact.displayName,
      chatIdentity:
        contact.chatIdentity,
      roles:
        contact.roles
    };

    const payload = {
      roomId,
      type:
        "private",
      participants: {
        [safeFirebaseKey(
          realUsername ||
          namaSaya
        )]:
          myRecord,
        [safeFirebaseKey(
          contact.username ||
          contact.chatIdentity
        )]:
          contactRecord
      },
      updatedAt:
        new Date()
          .toISOString()
    };

    if (
      contact.isWali
    ) {
      payload.wali = {
        username:
          contact.username,
        label:
          contact.chatIdentity,
        displayName:
          contact.displayName,
        namaAnak:
          waliChildName(
            contact.raw
          )
      };

      payload.staff = {
        username:
          realUsername,
        label:
          namaSaya,
        roles:
          Array.isArray(myRoles)
            ? myRoles
            : []
      };
    }

    try {
      await dbRT
        .ref(
          `cahaya_app/pesan_meta/${roomId}`
        )
        .update(payload);

      await updateInboxIndex(contact, roomId);
    } catch (error) {
      console.warn(
        "Metadata ruang chat belum tersimpan:",
        error
      );
    }
  }

  function buildInboxIndexUpdates(contact, roomId, message = null) {
    if (!contact || !roomId) return {};
    const now = message?.waktu || new Date().toISOString();
    const myKey = safeFirebaseKey(realUsername || namaSaya);
    const peerKey = safeFirebaseKey(contact.username || contact.chatIdentity);
    const myEntry = {
      roomId,
      peerUsername: contact.username || "",
      peerLabel: contact.chatIdentity || contact.displayName || "Pengguna",
      peerRoles: Array.isArray(contact.roles) ? contact.roles : [],
      updatedAt: now,
      ...(message ? { lastMessage: message } : {})
    };
    const peerEntry = {
      roomId,
      peerUsername: realUsername || "",
      peerLabel: namaSaya,
      peerRoles: Array.isArray(myRoles) ? myRoles : [],
      updatedAt: now,
      ...(message ? { lastMessage: message } : {})
    };
    return {
      [`cahaya_app/pesan_inbox/${myKey}/${roomId}`]: myEntry,
      [`cahaya_app/pesan_inbox/${peerKey}/${roomId}`]: peerEntry
    };
  }

  async function updateInboxIndex(contact, roomId, message = null) {
    const updates = buildInboxIndexUpdates(contact, roomId, message);
    if (!Object.keys(updates).length) return;
    try { await dbRT.ref().update(updates); }
    catch (error) { console.warn("Indeks inbox belum tersimpan:", error); }
  }

  async function saveBroadcastMeta(
    broadcast
  ) {
    try {
      await dbRT
        .ref(
          `cahaya_app/pesan_meta/${broadcast.roomId}`
        )
        .update({
          roomId:
            broadcast.roomId,
          type:
            "broadcast",
          audience:
            broadcast.audience,
          title:
            broadcast.title,
          updatedBy:
            realUsername,
          updatedAt:
            new Date()
              .toISOString()
        });
    } catch (error) {
      console.warn(
        "Metadata broadcast belum tersimpan:",
        error
      );
    }
  }

  function setHeaderAvatar(
    active
  ) {
    const avatar =
      document.getElementById(
        "pwHeaderAvatar"
      );

    if (!avatar) {
      return;
    }

    if (
      active.type ===
      "broadcast"
    ) {
      avatar.textContent =
        active.icon;

      return;
    }

    const initial =
      active.displayName
        .charAt(0)
        .toUpperCase();

    if (
      active.photo
    ) {
      avatar.innerHTML = `
        <img
          src="${esc(active.photo)}"
          alt="${esc(active.displayName)}"
          onerror="
            this.remove();
            this.parentNode.textContent =
              '${escJs(initial)}';
          "
        >
      `;
    } else {
      avatar.textContent =
        initial;
    }
  }

  function openConversation(
    active
  ) {
    state.active =
      active;

    targetAktifLabel =
      active.type ===
        "broadcast"
        ? (
          "BROADCAST_" +
          active.audience
            .toUpperCase()
        )
        : active.chatIdentity;

    targetAktifDisplay =
      active.title ||
      active.displayName;

    document.getElementById(
      "pwListView"
    ).style.display =
      "none";

    document.getElementById(
      "pChatBody"
    ).style.display =
      "flex";

    const footer =
      document.getElementById(
        "pChatFooter"
      );

    const input =
      document.getElementById(
        "pChatInput"
      );

    const canSend =
      active.type ===
        "private" ||
      (
        active.type ===
          "broadcast" &&
        active.canSend
      );

    footer.style.display =
      canSend
        ? "flex"
        : "none";

    input.disabled =
      !canSend;

    input.placeholder =
      active.type ===
        "broadcast"
        ? (
          active.canSend
            ? "Ketik pengumuman"
            : "Broadcast hanya dapat dikirim pimpinan"
        )
        : "Ketik pesan";

    document.getElementById(
      "pwBackButton"
    ).style.display =
      "grid";

    document.getElementById(
      "pwSearchToggle"
    ).style.display =
      "none";

    document.getElementById(
      "chatHeaderTitle"
    ).textContent =
      active.title ||
      active.displayName;

    document.getElementById(
      "pwHeaderSubtitle"
    ).textContent =
      active.type ===
        "broadcast"
        ? (
          active.canSend
            ? "Broadcast • Anda dapat mengirim"
            : "Broadcast • Hanya baca"
        )
        : active.roleSummary;

    setHeaderAvatar(
      active
    );

    if (
      pChatListener
    ) {
      dbRT
        .ref(
          `cahaya_app/pesan_global/${pChatListener}`
        )
        .off();
    }

    if (active.type === "broadcast") {
      pChatListener = null;
      state.rooms[active.roomId] = {};
      document.getElementById("pwHeaderSubtitle").textContent =
        "Broadcast pribadi • setiap penerima mendapat salinan di chat pribadinya";
      document.getElementById("pChatBody").innerHTML = `
        <div class="pw-empty">
          <strong>📣 Mode Broadcast Pribadi</strong><br>
          Pesan yang Anda kirim di sini akan disalin ke ruang chat pribadi setiap penerima.
          Balasan penerima hanya masuk ke percakapan pribadinya dengan Anda.
        </div>
      `;
      setTimeout(() => { if (canSend) input.focus(); }, 160);
      return;
    }

    pChatListener =
      active.roomId;

    dbRT
      .ref(
        `cahaya_app/pesan_global/${active.roomId}`
      )
      .limitToLast(50)
      .on(
        "value",
        async snapshot => {
          state.rooms[
            active.roomId
          ] =
            snapshot.val() ||
            {};

          renderConversation();

          const latest =
            latestMessage(
              active.roomId
            );

          await markRoomRead(
            active.roomId,
            latest?.waktu ||
            latest?.createdAt ||
            new Date()
              .toISOString()
          );

          renderChatList();
          updateChatBadge();

          renderNotificationPanel(
            chatNotifications(),
            state.dbNotifications
          );
        },
        error => {
          document.getElementById(
            "pChatBody"
          ).innerHTML = `
            <div class="pw-empty">
              Percakapan belum dapat dimuat:
              ${esc(
                error?.message ||
                "Periksa koneksi Firebase."
              )}
            </div>
          `;
        }
      );

    if (
      active.type ===
      "private"
    ) {
      savePrivateRoomMeta(
        active,
        active.roomId
      );
    }

    setTimeout(() => {
      if (canSend) {
        input.focus();
      }
    }, 160);
  }

  function formatMessageDate(
    value
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date
      .toLocaleDateString(
        "id-ID",
        {
          weekday:
            "long",
          day:
            "numeric",
          month:
            "long",
          year:
            "numeric"
        }
      );
  }

  function formatMessageTime(
    value
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date
      .toLocaleTimeString(
        "id-ID",
        {
          hour:
            "2-digit",
          minute:
            "2-digit"
        }
      );
  }

  function senderNameForMessage(
    message
  ) {
    if (
      isOwnMessage(
        message
      )
    ) {
      return "Anda";
    }

    return (
      message.senderDisplay ||
      message.pengirim ||
      state.active
        ?.displayName ||
      "Pengguna"
    );
  }

  function renderConversation() {
    const body =
      document.getElementById(
        "pChatBody"
      );

    if (
      !body ||
      !state.active
    ) {
      return;
    }

    const values =
      messageValues(
        state.rooms[
          state.active.roomId
        ]
      );

    if (!values.length) {
      body.innerHTML = `
        <div class="pw-empty">
          Belum ada pesan.<br>
          ${
            state.active.type ===
            "broadcast"
              ? (
                state.active.canSend
                  ? "Tulis pengumuman pertama untuk kelompok ini."
                  : "Belum ada broadcast untuk Anda."
              )
              : (
                "Mulai percakapan dengan <b>" +
                esc(
                  state.active.displayName
                ) +
                "</b>."
              )
          }
        </div>
      `;

      return;
    }

    let lastDateKey =
      "";

    body.innerHTML =
      "";

    values.forEach(message => {
      const timestamp =
        message.waktu ||
        message.createdAt;

      const date =
        new Date(timestamp);

      const dateKey =
        Number.isNaN(
          date.getTime()
        )
          ? ""
          : date
            .toISOString()
            .slice(0, 10);

      if (
        dateKey &&
        dateKey !==
        lastDateKey
      ) {
        body.insertAdjacentHTML(
          "beforeend",
          `
            <div class="pw-date-chip">
              ${esc(
                formatMessageDate(
                  timestamp
                )
              )}
            </div>
          `
        );

        lastDateKey =
          dateKey;
      }

      const mine =
        isOwnMessage(
          message
        );

      const deleted =
        message.dihapus ===
          true ||
        message.deleted ===
          true;

      const text =
        deleted
          ? "Pesan ini telah dihapus"
          : (
            message.teks ||
            ""
          );

      const edited =
        !deleted &&
        (
          message.diedit ||
          message.isEdited
        );

      const clickable =
        !deleted;

      const senderLine =
        state.active.type ===
          "broadcast" &&
        !mine
          ? `
            <span class="pw-message-sender">
              ${esc(
                senderNameForMessage(
                  message
                )
              )}
            </span>
          `
          : "";

      const handlers =
        clickable
          ? `
            onclick="
              openPengurusMessageActions(
                '${escJs(message.id)}'
              )
            "

            oncontextmenu="
              event.preventDefault();
              openPengurusMessageActions(
                '${escJs(message.id)}'
              );
            "

            ontouchstart="
              startPengurusMessageLongPress(
                '${escJs(message.id)}'
              )
            "

            ontouchend="
              cancelPengurusMessageLongPress()
            "

            ontouchmove="
              cancelPengurusMessageLongPress()
            "
          `
          : "";

      body.insertAdjacentHTML(
        "beforeend",
        `
          <article
            class="
              p-chat-msg
              pw-message
              ${mine ? "mine" : "other"}
              ${clickable ? "clickable" : ""}
            "
            ${handlers}
          >
            ${senderLine}

            <span
              class="
                pw-message-text
                ${deleted ? "deleted" : ""}
              "
            >
              ${esc(text)}
            </span>

            <span class="pw-message-meta">
              ${
                edited
                  ? `
                    <span class="pw-message-edited">
                      diedit
                    </span>
                  `
                  : ""
              }

              <time>
                ${esc(
                  formatMessageTime(
                    timestamp
                  )
                )}
              </time>

              ${
                mine
                  ? `
                    <span class="pw-message-check">
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

  function activeMessageById(
    messageId
  ) {
    if (
      !state.active
    ) {
      return null;
    }

    const raw =
      state.rooms[
        state.active.roomId
      ]?.[messageId];

    return raw
      ? {
        id:
          messageId,
        ...raw
      }
      : null;
  }

  function openMessageActions(
    messageId
  ) {
    const message =
      activeMessageById(
        messageId
      );

    if (!message) {
      return;
    }

    const mine =
      isOwnMessage(
        message
      );

    state.selectedMessage = {
      ...message,
      mine,
      roomId:
        state.active.roomId
    };

    document.getElementById(
      "pwActionTitle"
    ).textContent =
      mine
        ? "Opsi Pesan Anda"
        : "Opsi Pesan";

    document.getElementById(
      "pwEditAction"
    ).style.display =
      mine
        ? "flex"
        : "none";

    document.getElementById(
      "pwDeleteAction"
    ).style.display =
      mine
        ? "flex"
        : "none";

    document.getElementById(
      "pwCopyAction"
    ).style.display =
      "flex";

    document.getElementById(
      "pwActionOverlay"
    ).style.display =
      "flex";
  }

  function closeActionSheet(
    event
  ) {
    const overlay =
      document.getElementById(
        "pwActionOverlay"
      );

    if (
      event &&
      event.target !==
        overlay
    ) {
      return;
    }

    overlay.style.display =
      "none";
  }

  function broadcastRecipients(audience) {
    buildContacts();

    return state.contacts.filter(contact => {
      if (!contact || !contact.username) return false;
      if (audience === "wali") return contact.isWali;
      if (audience === "pengurus") return !contact.isWali;
      return true;
    });
  }

  async function sendBroadcastAsPrivate(active, text) {
    const recipients = broadcastRecipients(active.audience);

    if (!recipients.length) {
      throw new Error("Tidak ada penerima broadcast yang sesuai.");
    }

    const now = new Date().toISOString();
    const batchId = `broadcast_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

    await Promise.all(
      recipients.map(async contact => {
        const roomId = resolveRoomId(contact);
        await savePrivateRoomMeta(contact, roomId);

        const payload = {
          teks: text,
          pengirim: namaSaya,
          senderDisplay: namaSaya,
          senderUsername: realUsername,
          senderRoles: Array.isArray(myRoles) ? myRoles : [],
          recipientDisplay: contact.chatIdentity,
          recipientUsername: contact.username,
          recipientRoles: contact.roles,
          roomId,
          waktu: now,
          isBroadcastCopy: true,
          broadcastAudience: active.audience,
          broadcastTitle: active.title,
          broadcastBatchId: batchId
        };

        const messageRef = dbRT.ref(`cahaya_app/pesan_global/${roomId}`).push();
        payload.id = messageRef.key;
        const updates = buildInboxIndexUpdates(contact, roomId, payload);
        updates[`cahaya_app/pesan_global/${roomId}/${messageRef.key}`] = payload;
        updates[`cahaya_app/pesan_meta/${roomId}/updatedAt`] = now;
        updates[`cahaya_app/pesan_meta/${roomId}/type`] = "private";
        await dbRT.ref().update(updates);
      })
    );

    await dbRT
      .ref(`cahaya_app/broadcast_log/${batchId}`)
      .set({
        id: batchId,
        judul: active.title || "Broadcast",
        audience: active.audience || "semua",
        senderUsername: realUsername,
        senderDisplay: namaSaya,
        jumlahPenerima: recipients.length,
        waktu: now
      });

    return recipients.length;
  }

  async function sendMessage() {
    const input =
      document.getElementById(
        "pChatInput"
      );

    const text =
      input.value
        .trim();

    if (
      !text ||
      !state.active
    ) {
      return;
    }

    if (
      state.active.type ===
        "broadcast" &&
      !state.active.canSend
    ) {
      alert(
        "Role Anda hanya dapat membaca broadcast ini."
      );

      return;
    }

    const sendButton =
      document.getElementById(
        "pwSendButton"
      );

    sendButton.disabled =
      true;

    try {
      if (
        editModeId
      ) {
        await dbRT
          .ref(
            `cahaya_app/pesan_global/${state.active.roomId}/${editModeId}`
          )
          .update({
            teks:
              text,
            diedit:
              true,
            isEdited:
              true,
            editedAt:
              new Date()
                .toISOString()
          });

        editModeId =
          null;

        sendButton.textContent =
          "➤";

        sendButton.classList
          .remove(
            "editing"
          );
      } else if (state.active.type === "broadcast") {
        const recipientCount = await sendBroadcastAsPrivate(state.active, text);
        if (typeof showToast === "function") {
          showToast(`Broadcast terkirim sebagai pesan pribadi ke ${recipientCount} akun.`);
        }
      } else {
        const payload = {
          teks: text,
          pengirim: namaSaya,
          senderDisplay: namaSaya,
          senderUsername: realUsername,
          senderRoles: Array.isArray(myRoles) ? myRoles : [],
          roomId: state.active.roomId,
          waktu: new Date().toISOString(),
          recipientDisplay: state.active.chatIdentity,
          recipientUsername: state.active.username,
          recipientRoles: state.active.roles
        };

        const messageRef = dbRT.ref(`cahaya_app/pesan_global/${state.active.roomId}`).push();
        payload.id = messageRef.key;
        const updates = buildInboxIndexUpdates(state.active, state.active.roomId, payload);
        updates[`cahaya_app/pesan_global/${state.active.roomId}/${messageRef.key}`] = payload;
        updates[`cahaya_app/pesan_meta/${state.active.roomId}/updatedAt`] = payload.waktu;
        updates[`cahaya_app/pesan_meta/${state.active.roomId}/type`] = "private";
        await dbRT.ref().update(updates);
      }

      if (state.active.type !== "broadcast") {
        await markRoomRead(
          state.active.roomId,
          new Date().toISOString()
        );
      }

      input.value =
        "";

      autoResizeInput();

      input.focus();
    } catch (error) {
      alert(
        "Pesan belum dapat dikirim: " +
        (
          error?.message ||
          "Periksa koneksi dan izin Firebase."
        )
      );
    } finally {
      sendButton.disabled =
        false;
    }
  }

  function autoResizeInput() {
    const input =
      document.getElementById(
        "pChatInput"
      );

    if (!input) {
      return;
    }

    input.style.height =
      "auto";

    input.style.height =
      Math.min(
        input.scrollHeight,
        104
      ) +
      "px";
  }

  async function editSelectedMessage() {
    const selected =
      state.selectedMessage;

    if (
      !selected ||
      !selected.mine
    ) {
      return;
    }

    const input =
      document.getElementById(
        "pChatInput"
      );

    input.value =
      selected.teks ||
      "";

    editModeId =
      selected.id;

    const button =
      document.getElementById(
        "pwSendButton"
      );

    button.textContent =
      "✓";

    button.classList.add(
      "editing"
    );

    closeActionSheet();

    autoResizeInput();

    input.focus();
  }

  async function deleteSelectedMessage() {
    const selected =
      state.selectedMessage;

    if (
      !selected ||
      !selected.mine
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
      /*
       * Soft delete: pesan hilang bagi kedua pihak,
       * tetapi urutan percakapan tetap terjaga.
       */
      await dbRT
        .ref(
          `cahaya_app/pesan_global/${selected.roomId}/${selected.id}`
        )
        .update({
          teks:
            "",
          dihapus:
            true,
          deleted:
            true,
          deletedAt:
            new Date()
              .toISOString(),
          deletedBy:
            realUsername
        });

      closeActionSheet();

      state.selectedMessage =
        null;
    } catch (error) {
      alert(
        "Pesan belum dapat dihapus: " +
        (
          error?.message ||
          "Periksa izin Firebase."
        )
      );
    }
  }

  async function copySelectedMessage() {
    const selected =
      state.selectedMessage;

    if (!selected) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(
          selected.teks ||
          ""
        );

      closeActionSheet();
    } catch (error) {
      alert(
        "Teks belum dapat disalin."
      );
    }
  }

  function showList() {
    state.active =
      null;

    targetAktifLabel =
      "";

    targetAktifDisplay =
      "";

    editModeId =
      null;

    document.getElementById(
      "pwListView"
    ).style.display =
      "flex";

    document.getElementById(
      "pChatBody"
    ).style.display =
      "none";

    document.getElementById(
      "pChatFooter"
    ).style.display =
      "none";

    document.getElementById(
      "pwBackButton"
    ).style.display =
      "none";

    document.getElementById(
      "pwSearchToggle"
    ).style.display =
      "grid";

    document.getElementById(
      "chatHeaderTitle"
    ).textContent =
      "WhatsApp CAHAYA";

    document.getElementById(
      "pwHeaderSubtitle"
    ).textContent =
      currentIsPrivileged()
        ? "Chat seluruh pengguna • Broadcast"
        : "Chat pimpinan dan layanan utama";

    document.getElementById(
      "pwHeaderAvatar"
    ).textContent =
      "C";

    const sendButton =
      document.getElementById(
        "pwSendButton"
      );

    sendButton.textContent =
      "➤";

    sendButton.classList
      .remove(
        "editing"
      );

    if (
      pChatListener
    ) {
      dbRT
        .ref(
          `cahaya_app/pesan_global/${pChatListener}`
        )
        .off();

      pChatListener =
        null;
    }

    renderChatList();
  }

  function toggleSearch() {
    const bar =
      document.getElementById(
        "pwSearchBar"
      );

    const input =
      document.getElementById(
        "pwContactSearch"
      );

    const hidden =
      getComputedStyle(bar)
        .display ===
      "none";

    bar.style.display =
      hidden
        ? "block"
        : "none";

    if (hidden) {
      setTimeout(
        () =>
          input.focus(),
        80
      );
    }
  }

  function openContactByIndex(
    index
  ) {
    const contact =
      state.renderedContacts[
        index
      ];

    if (!contact) {
      return;
    }

    openConversation({
      ...contact,
      type:
        "private",
      roomId:
        contact.roomId
    });
  }

  function openBroadcastByIndex(
    index
  ) {
    const broadcast =
      state.renderedBroadcasts[
        index
      ];

    if (!broadcast) {
      return;
    }

    openConversation({
      ...broadcast,
      type:
        "broadcast"
    });
  }


  function openContactById(
    contactId
  ) {
    const normalizedId =
      String(contactId || "")
        .toLowerCase();

    const contact =
      state.renderedContacts
        .find(item =>
          String(item.id || "")
            .toLowerCase() ===
          normalizedId
        ) ||
      contactItems()
        .find(item =>
          String(item.id || "")
            .toLowerCase() ===
          normalizedId
        );

    if (!contact) {
      renderChatList();
      return;
    }

    openConversation({
      ...contact,
      type:
        "private",
      roomId:
        contact.roomId
    });
  }

  function openBroadcastById(
    broadcastId
  ) {
    const normalizedId =
      String(broadcastId || "")
        .toLowerCase();

    const broadcast =
      state.renderedBroadcasts
        .find(item =>
          String(item.id || "")
            .toLowerCase() ===
          normalizedId
        ) ||
      broadcastItems()
        .find(item =>
          String(item.id || "")
            .toLowerCase() ===
          normalizedId
        );

    if (!broadcast) {
      renderChatList();
      return;
    }

    openConversation({
      ...broadcast,
      type:
        "broadcast"
    });
  }

  function startChatByLegacy(
    opponentActualLabel,
    opponentDisplay,
    existingRoomId =
      null
  ) {
    const broadcast =
      BROADCASTS.find(item =>
        item.roomId ===
          existingRoomId ||
        opponentActualLabel ===
          (
            "BROADCAST_" +
            item.audience
              .toUpperCase()
          ) ||
        (
          existingRoomId ===
            "room_broadcast_wali" &&
          item.audience ===
            "wali"
        )
      );

    if (broadcast) {
      openConversation({
        ...broadcast,
        type:
          "broadcast",
        latest:
          latestMessage(
            broadcast.roomId
          ),
        unreadCount:
          unreadMessages(
            broadcast.roomId
          ).length,
        canSend:
          currentIsPrivileged()
      });

      return;
    }

    buildContacts();

    const cleanLabel =
      cleanIdentity(
        opponentActualLabel ||
        opponentDisplay
      );

    const contact =
      contactItems()
        .find(item =>
          item.roomId ===
            existingRoomId ||
          [
            item.chatIdentity,
            item.displayName,
            item.username
          ]
            .map(
              cleanIdentity
            )
            .includes(
              cleanLabel
            )
        );

    if (!contact) {
      alert(
        "Kontak tidak ditemukan atau tidak diizinkan untuk role Anda."
      );

      return;
    }

    openConversation({
      ...contact,
      type:
        "private",
      roomId:
        existingRoomId ||
        contact.roomId
    });
  }

  function currentUnreadNewest() {
    return chatNotifications()
      .sort(
        (a, b) =>
          new Date(
            b.waktu ||
            0
          ) -
          new Date(
            a.waktu ||
            0
          )
      )[0] ||
      null;
  }

  function installListeners() {
    if (state.listenersInstalled) { renderChatList(); return; }
    state.listenersInstalled = true;
    buildContacts();

    dbRT.ref(`cahaya_app/pesan_dibaca/${safeFirebaseKey(realUsername)}`).on(
      "value",
      snapshot => {
        state.readMap = snapshot.val() || {};
        renderChatList();
        updateChatBadge();
        renderNotificationPanel(chatNotifications(), state.dbNotifications);
      },
      error => console.warn("Status baca belum dimuat:", error)
    );

    dbRT.ref(`cahaya_app/pesan_inbox/${safeFirebaseKey(realUsername || namaSaya)}`).limitToLast(100).on(
      "value",
      snapshot => {
        const index = snapshot.val() || {};
        const previousRooms = state.rooms || {};
        const nextRooms = {};
        state.meta = {};
        Object.values(index).forEach(item => {
          if (!item?.roomId) return;
          state.meta[item.roomId] = { roomId:item.roomId, type:"private", inbox:item, updatedAt:item.updatedAt || "" };
          const previous = previousRooms[item.roomId];
          const hasLoadedConversation = previous && Object.keys(previous).some(key => key !== "__last");
          if (hasLoadedConversation) nextRooms[item.roomId] = previous;
          else if (item.lastMessage) nextRooms[item.roomId] = { __last:item.lastMessage };
        });
        state.rooms = nextRooms;
        buildContacts();
        renderChatList();
        updateChatBadge();
        // Percakapan aktif dirender oleh listener ruang chat. Inbox tidak boleh
        // menimpa 50 pesan yang sudah dimuat dengan satu lastMessage saja.
        if (state.active?.type === "broadcast") renderConversation();
        maybeNotifyNewMessages();
        renderNotificationPanel(chatNotifications(), state.dbNotifications);
        lastUnreadCount = totalUnreadCount();
      },
      error => {
        console.error("Inbox pesan belum dapat dimuat:", error);
        const inbox = document.getElementById("viewInbox");
        if (inbox) inbox.innerHTML = `<div class="pw-empty">Pesan belum dapat dimuat.<br>Periksa koneksi dan aturan Firebase.</div>`;
      }
    );

    dbRT.ref(`cahaya_app/notifikasi_wali/${realUsername}`).limitToLast(100).on(
      "value",
      snapshot => {
        const value = snapshot.val() || {};
        state.dbNotifications = Object.entries(value).map(([notifId,item])=>({...item,notifId,tipe:item.tipe||"database"})).filter(item=>item.dibaca!==true);
        renderNotificationPanel(chatNotifications(), state.dbNotifications);
      },
      error => console.warn("Notifikasi database belum dimuat:", error)
    );
  }

  function toggleChat() {
    if (
      !bolehAksesMenu(
        "menu-chat"
      )
    ) {
      tampilkanPesanTidakBerwenang(
        "menu-chat"
      );

      return;
    }

    const windowElement =
      document.getElementById(
        "pengurusChatWindow"
      );

    if (
      windowElement.style
        .display ===
      "flex"
    ) {
      windowElement.style.display =
        "none";

      if (
        pChatListener
      ) {
        dbRT
          .ref(
            `cahaya_app/pesan_global/${pChatListener}`
          )
          .off();

        pChatListener =
          null;
      }

      return;
    }

    windowElement.style.display =
      "flex";

    showList();

    try {
      notifSound
        .play()
        .then(() => {
          notifSound.pause();
          notifSound.currentTime =
            0;
        })
        .catch(
          () => {}
        );
    } catch (error) {}
  }

  function handleEnter(
    event
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  function startLongPress(
    messageId
  ) {
    clearTimeout(
      state.longPressTimer
    );

    state.longPressTimer =
      setTimeout(() => {
        openMessageActions(
          messageId
        );
      }, 520);
  }

  function cancelLongPress() {
    clearTimeout(
      state.longPressTimer
    );

    state.longPressTimer =
      null;
  }

  async function hideConversationLocally(
    roomId
  ) {
    if (!roomId) {
      return;
    }

    const latest =
      latestMessage(
        roomId
      );

    localStorage.setItem(
      `chat_hidden_${safeFirebaseKey(realUsername)}_${roomId}`,
      latest?.waktu ||
      new Date()
        .toISOString()
    );

    showList();
  }

  function bootstrap() {
    let attempts = 0;
    let timer = null;

    const runtimeReady = () =>
      typeof dbRT !== "undefined" &&
      typeof bolehAksesMenu === "function" &&
      typeof realUsername !== "undefined";

    const usersReady = () =>
      window.__cahayaChatUsersLoaded === true ||
      (
        Array.isArray(pListUsers) &&
        pListUsers.length > 0
      );

    const initialize = () => {
      attempts += 1;

      if (!runtimeReady()) {
        if (attempts > 160 && timer) {
          clearInterval(timer);
        }
        return;
      }

      renderAccessNote();

      if (usersReady()) {
        buildContacts();
        renderChatList();
        installListeners();
        updateChatBadge();

        if (timer) {
          clearInterval(timer);
        }
        return;
      }

      if (attempts > 160) {
        buildContacts();
        renderChatList();
        installListeners();
        updateChatBadge();

        if (timer) {
          clearInterval(timer);
        }
      }
    };

    window.addEventListener(
      "cahaya:chat-users-ready",
      initialize
    );

    initialize();
    timer = setInterval(initialize, 120);
  }

  /* =======================================================
     Override API dashboard lama
     ======================================================= */

  window.initChatFilter =
    function () {
      buildContacts();
      renderChatList();
    };

  window.listenToGlobalMessagesAndNotifs =
    installListeners;

  window.renderInboxUI =
    function () {
      renderChatList();
    };

  window.togglePengurusChat =
    toggleChat;

  window.switchChatTab =
    function () {
      showList();
    };

  window.showPengurusChatList =
    showList;

  window.togglePengurusSearch =
    toggleSearch;

  window.filterPengurusContacts =
    function () {
      renderBroadcastList();
      renderContactList();
    };

  window.openPengurusContact =
    openContactByIndex;

  window.openPengurusContactById =
    openContactById;

  window.openPengurusBroadcast =
    openBroadcastByIndex;

  window.openPengurusBroadcastById =
    openBroadcastById;

  window.startChat =
    startChatByLegacy;

  window.loadPengurusTujuan =
    function () {
      renderChatList();
    };

  window.openChatFromDropdown =
    function () {};

  window.sendPengurusMessage =
    sendMessage;

  window.handlePengurusChatEnter =
    handleEnter;

  window.autoResizePengurusInput =
    autoResizeInput;

  window.openPengurusMessageActions =
    openMessageActions;

  window.startPengurusMessageLongPress =
    startLongPress;

  window.cancelPengurusMessageLongPress =
    cancelLongPress;

  window.closePengurusActionSheet =
    closeActionSheet;

  window.editSelectedPengurusMsg =
    editSelectedMessage;

  window.deleteSelectedPengurusMsg =
    deleteSelectedMessage;

  window.copySelectedPengurusMsg =
    copySelectedMessage;

  window.showMsgOptions =
    function (
      event,
      messageId
    ) {
      event?.stopPropagation();
      openMessageActions(
        messageId
      );
    };

  window.editPesan =
    function (
      roomId,
      messageId,
      oldText
    ) {
      state.active =
        state.active || {
          roomId,
          type:
            "private",
          canSend:
            true
        };

      state.selectedMessage = {
        id:
          messageId,
        teks:
          oldText,
        roomId,
        mine:
          true
      };

      editSelectedMessage();
    };

  window.hapusPesan =
    function (
      roomId,
      messageId
    ) {
      const message =
        state.rooms[
          roomId
        ]?.[messageId] ||
        {};

      state.selectedMessage = {
        id:
          messageId,
        roomId,
        mine:
          true,
        ...message
      };

      deleteSelectedMessage();
    };

  window.salinTeks =
    async function (
      text
    ) {
      try {
        await navigator.clipboard
          .writeText(text);
      } catch (error) {
        alert(
          "Teks belum dapat disalin."
        );
      }
    };

  window.showInboxOptions =
    function (
      event,
      roomId
    ) {
      event?.preventDefault();
      event?.stopPropagation();

      if (
        confirm(
          "Sembunyikan obrolan ini dari daftar Anda?"
        )
      ) {
        hideConversationLocally(
          roomId
        );
      }
    };

  window.hapusObrolan =
    function (
      event,
      roomId
    ) {
      event?.stopPropagation();
      hideConversationLocally(
        roomId
      );
    };

  window.updateNotificationPanel =
    renderNotificationPanel;

  window.bukaNotifikasiPengurus =
    openDatabaseNotification;

  window.bukaChatDariPanel =
    async function (
      label,
      display,
      roomId
    ) {
      if (
        typeof toggleNotifPanel ===
        "function"
      ) {
        const panel =
          document.getElementById(
            "sideNotifPanel"
          );

        if (
          panel?.classList
            .contains("open")
        ) {
          toggleNotifPanel();
        }
      }

      document.getElementById(
        "pengurusChatWindow"
      ).style.display =
        "flex";

      await markRoomRead(
        roomId,
        latestMessage(
          roomId
        )?.waktu ||
        new Date()
          .toISOString()
      );

      startChatByLegacy(
        label,
        display,
        roomId
      );
    };

  window.CahayaPengurusChat = {
    rolesOf,
    isPrivilegedRoles,
    currentIsPrivileged,
    canChatWith,
    normalizeContact,
    buildContacts,
    defaultRoomId,
    broadcastItems,
    contactItems,
    state
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      bootstrap,
      { once: true }
    );
  } else {
    bootstrap();
  }
})();
