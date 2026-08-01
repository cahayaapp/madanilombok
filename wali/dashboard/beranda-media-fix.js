/*
 * CAHAYA APP — Media Sosial Beranda Fix
 * Mendukung format database lama dan baru.
 * Penting: embed YouTube/Instagram memerlukan halaman HTTP/HTTPS.
 */

(function () {
  "use strict";

  let normalizedMedia = [];

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function valueList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    return [value];
  }

  function firstText(...values) {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return "";
  }

  function youtubeIdFrom(value) {
    const raw = firstText(
      typeof value === "object" ? value.id : "",
      typeof value === "object" ? value.videoId : "",
      typeof value === "object" ? value.youtubeId : "",
      typeof value === "object" ? value.url : "",
      typeof value === "object" ? value.url_asli : "",
      typeof value === "object" ? value.link : "",
      typeof value === "object" ? value.embed_url : "",
      typeof value !== "object" ? value : ""
    );

    if (!raw) return "";

    if (/^[A-Za-z0-9_-]{6,20}$/.test(raw)) {
      return raw;
    }

    const patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{6,20})/i,
      /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,20})/i,
      /youtube\.com\/(?:shorts|live|v)\/([A-Za-z0-9_-]{6,20})/i,
      /[?&]v=([A-Za-z0-9_-]{6,20})/i
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) return match[1];
    }

    return "";
  }

  function instagramDataFrom(value) {
    const raw = firstText(
      typeof value === "object" ? value.url : "",
      typeof value === "object" ? value.url_asli : "",
      typeof value === "object" ? value.link : "",
      typeof value === "object" ? value.embed_url : "",
      typeof value !== "object" ? value : ""
    );

    const objectId = firstText(
      typeof value === "object" ? value.id : "",
      typeof value === "object" ? value.instagramId : "",
      typeof value === "object" ? value.postId : "",
      typeof value === "object" ? value.shortcode : ""
    );

    const objectKind = firstText(
      typeof value === "object" ? value.kind : "",
      typeof value === "object" ? value.jenis : "",
      typeof value === "object" ? value.type : ""
    ).toLowerCase();

    const match = raw.match(
      /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i
    );

    if (match) {
      return {
        id: match[2],
        kind: match[1].toLowerCase() === "reel" ? "reel" : "post"
      };
    }

    if (/^[A-Za-z0-9_-]{5,40}$/.test(objectId)) {
      return {
        id: objectId,
        kind: objectKind.includes("reel") ? "reel" : "post"
      };
    }

    return null;
  }

  function addMedia(map, item) {
    if (!item?.type) return;

    const key = item.type === "youtube"
      ? `youtube:${item.id}`
      : `instagram:${item.kind}:${item.id}`;

    const previous = map.get(key);
    const currentTime = item.timestamp || "";
    const previousTime = previous?.timestamp || "";

    if (!previous || currentTime >= previousTime) {
      map.set(key, item);
    }
  }

  function parseMediaSettings(data = {}) {
    const items = new Map();

    valueList(data.instagram).forEach(value => {
      const parsed = instagramDataFrom(value);
      if (!parsed) return;

      addMedia(items, {
        type: "instagram",
        ...parsed,
        sourceUrl: firstText(value?.url_asli, value?.url, value?.link),
        timestamp: firstText(value?.waktu_input, value?.createdAt, value?.waktu)
      });
    });

    valueList(data.youtube).forEach(value => {
      const id = youtubeIdFrom(value);
      if (!id) return;

      addMedia(items, {
        type: "youtube",
        id,
        sourceUrl: firstText(value?.url_asli, value?.url, value?.link),
        timestamp: firstText(value?.waktu_input, value?.createdAt, value?.waktu)
      });
    });

    valueList(data.media || data.items || data.daftar).forEach(value => {
      if (!value) return;

      const platform = firstText(
        value.platform,
        value.jenis_platform,
        value.provider,
        value.type
      ).toLowerCase();

      if (platform.includes("youtube") || platform === "yt") {
        const id = youtubeIdFrom(value);
        if (id) {
          addMedia(items, {
            type: "youtube",
            id,
            sourceUrl: firstText(value.url_asli, value.url, value.link),
            timestamp: firstText(value.waktu_input, value.createdAt, value.waktu)
          });
        }
        return;
      }

      if (platform.includes("instagram") || platform === "ig") {
        const parsed = instagramDataFrom(value);
        if (parsed) {
          addMedia(items, {
            type: "instagram",
            ...parsed,
            sourceUrl: firstText(value.url_asli, value.url, value.link),
            timestamp: firstText(value.waktu_input, value.createdAt, value.waktu)
          });
        }
      }
    });

    normalizedMedia = [...items.values()]
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  }

  function mediaQueue() {
    // Pola feed wali: 2 status → 1 foto → 2 status → 1 video → berulang.
    // Instagram post dianggap foto. YouTube dan Instagram Reel dianggap video.
    const photos = normalizedMedia.filter(
      item => item.type === "instagram" && item.kind !== "reel"
    );
    const videos = normalizedMedia.filter(
      item => item.type === "youtube" || (item.type === "instagram" && item.kind === "reel")
    );
    const queue = [];
    let photoIndex = 0;
    let videoIndex = 0;

    while (photoIndex < photos.length || videoIndex < videos.length) {
      if (photoIndex < photos.length) queue.push(photos[photoIndex++]);
      if (videoIndex < videos.length) queue.push(videos[videoIndex++]);
    }

    return queue;
  }

  function mediaHeader(label, icon, className) {
    return `
      <div class="media-header">
        <div class="icon-brand ${className}">${icon}</div>
        <div class="kabar-info">
          <span class="kabar-name">@fajrulislammedia</span>
          <span class="kabar-time">${escapeHtml(label)}</span>
        </div>
      </div>
    `;
  }

  function isFileMode() {
    return window.location.protocol === "file:";
  }

  function youtubeCard(media) {
    const id = encodeURIComponent(media.id);
    const sourceUrl = `https://www.youtube.com/watch?v=${id}`;

    if (isFileMode()) {
      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader("Video Pesantren Cahaya", "▶", "yt-brand")}
          <div class="media-frame-wrap youtube-file-fallback">
            <img
              src="https://i.ytimg.com/vi/${id}/hqdefault.jpg"
              alt="Pratinjau video YouTube"
              loading="lazy"
            >
            <a class="media-play-overlay" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
              <span class="media-play-button">▶</span>
            </a>
          </div>
          <a class="media-source-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
            Dibuka dari file:// — putar langsung di YouTube ↗
          </a>
        </article>
      `;
    }

    const origin = encodeURIComponent(window.location.origin);
    const embedUrl = `https://www.youtube.com/embed/${id}?rel=0&playsinline=1&origin=${origin}`;

    return `
      <article class="kabar-card fade-in media-card">
        ${mediaHeader("Video Pesantren Cahaya", "▶", "yt-brand")}
        <div class="media-frame-wrap youtube">
          <iframe
            src="${embedUrl}"
            title="Video YouTube Pesantren Cahaya"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="origin-when-cross-origin"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
        <a class="media-source-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
          Buka langsung di YouTube ↗
        </a>
      </article>
    `;
  }

  function instagramCard(media) {
    const route = media.kind === "reel" ? "reel" : "p";
    const id = encodeURIComponent(media.id);
    const sourceUrl = `https://www.instagram.com/${route}/${id}/`;

    if (isFileMode()) {
      return `
        <article class="kabar-card fade-in media-card">
          ${mediaHeader(media.kind === "reel" ? "Reel Pesantren Cahaya" : "Foto Pesantren Cahaya", "◎", "ig-brand")}
          <div class="instagram-file-fallback">
            <div>
              <span class="ig-mark">◎</span>
              <strong>Postingan Instagram siap dibuka</strong>
              <span>Instagram tidak menyediakan frame embed yang stabil dari halaman file://. Buka portal melalui Live Server atau hosting agar postingan tampil di dalam linimasa.</span>
            </div>
          </div>
          <a class="media-source-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
            Buka langsung di Instagram ↗
          </a>
        </article>
      `;
    }

    const ratio = media.kind === "reel" ? "instagram-reel" : "instagram-post";

    return `
      <article class="kabar-card fade-in media-card">
        ${mediaHeader(media.kind === "reel" ? "Reel Pesantren Cahaya" : "Foto Pesantren Cahaya", "◎", "ig-brand")}
        <div class="media-frame-wrap ${ratio}">
          <iframe
            src="https://www.instagram.com/${route}/${id}/embed/"
            title="Instagram Pesantren Cahaya"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            loading="lazy"
          ></iframe>
        </div>
        <a class="media-source-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
          Buka langsung di Instagram ↗
        </a>
      </article>
    `;
  }

  function renderMedia(media) {
    if (!media) return "";
    if (media.type === "youtube" && media.id) return youtubeCard(media);
    if (media.type === "instagram" && media.id) return instagramCard(media);
    return "";
  }

  function showFileProtocolNotice() {
    if (!isFileMode()) return;

    const timelineTitle = document.querySelector(".section-header");
    if (!timelineTitle || document.getElementById("mediaEnvironmentNotice")) return;

    const notice = document.createElement("div");
    notice.id = "mediaEnvironmentNotice";
    notice.className = "media-environment-notice";
    notice.innerHTML = `
      <span>⚠️</span>
      <div>
        <strong>Portal sedang dibuka sebagai file lokal.</strong><br>
        YouTube Error 153 dan Instagram tidak tampil karena alamat masih <code>file://</code>.
        Jalankan melalui Live Server atau buka <code>jalankan-portal-mac.command</code>.
      </div>
    `;

    timelineTitle.insertAdjacentElement("afterend", notice);
  }

  window.parsePengaturanMedia = parseMediaSettings;
  window.susunAntreanMedia = mediaQueue;
  window.renderKartuMedia = renderMedia;

  document.addEventListener("DOMContentLoaded", showFileProtocolNotice);
})();
