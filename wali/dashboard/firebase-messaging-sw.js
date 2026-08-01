/*
 * CAHAYA APP — Firebase Cloud Messaging Service Worker
 * Ditempatkan bersama index.html dan beranda.html di wali/dashboard/.
 */

importScripts(
  "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js"
);

importScripts("../../config/firebase-worker-config.js");

firebase.initializeApp(self.CAHAYA_FIREBASE_CONFIG);

const messaging =
  firebase.messaging();

messaging.onBackgroundMessage(
  payload => {
    const data =
      payload.data || {};

    const notification =
      payload.notification || {};

    const title =
      notification.title ||
      data.title ||
      "Pesan Baru dari Pesantren";

    const roomId =
      data.roomId ||
      "";

    const relativeLink =
      roomId
        ? (
            "index.html" +
            "?openChat=1&room=" +
            encodeURIComponent(roomId)
          )
        : "index.html";

    const requestedLink =
      data.link ||
      relativeLink;

    const resolvedLink =
      new URL(
        requestedLink,
        self.registration.scope
      ).href;

    const iconUrl =
      new URL(
        "../../assets/logofi.png",
        self.registration.scope
      ).href;

    const options = {
      body:
        notification.body ||
        data.body ||
        "Ada pesan atau pemberitahuan baru.",

      icon:
        iconUrl,

      badge:
        iconUrl,

      tag:
        roomId ||
        data.notificationId ||
        "cahaya-wali",

      renotify:
        true,

      data: {
        link:
          resolvedLink,

        roomId
      }
    };

    return self.registration
      .showNotification(
        title,
        options
      );
  }
);

self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();

    const targetUrl =
      event.notification
        .data
        ?.link ||
      new URL(
        "index.html",
        self.registration.scope
      ).href;

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled:
            true
        })
        .then(windowClients => {
          for (
            const client
            of windowClients
          ) {
            if (
              "navigate" in client
            ) {
              client.navigate(
                targetUrl
              );
            }

            if (
              "focus" in client
            ) {
              return client.focus();
            }
          }

          if (
            clients.openWindow
          ) {
            return clients.openWindow(
              targetUrl
            );
          }

          return null;
        })
    );
  }
);
