/*
 * CAHAYA APP — Portal Wali Core 2026/2027
 * Satu sumber sesi untuk seluruh halaman di folder wali/dashboard.
 *
 * Prinsip:
 * - cahayaCurrentUser tetap menyimpan akun wali hasil login.
 * - cahayaWaliAccount menyimpan salinan akun wali.
 * - cahayaWaliStudentProfile menyimpan identitas santri yang dipantau.
 * - Tidak mewajibkan Firebase Authentication.
 */
(function (global) {
  "use strict";

  const KEYS = {
    current: "cahayaCurrentUser",
    account: "cahayaWaliAccount",
    student: "cahayaWaliStudentProfile"
  };

  let state = {
    account: null,
    student: null,
    ready: false,
    valid: false,
    source: "local"
  };

  let readyPromise = null;

  function safeParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function cleanText(value = "") {
    return String(value ?? "").trim();
  }

  function normalizeRoles(profile = {}) {
    let roles =
      profile.akses ??
      profile.jabatan ??
      profile.roles ??
      profile.role ??
      [];

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    return roles
      .map(item => cleanText(item).toLowerCase())
      .filter(Boolean);
  }

  function hasStudentName(profile = {}) {
    return Boolean(
      cleanText(
        profile.namaAnak ||
        profile.namaSantri ||
        profile.namaAnanda ||
        profile.studentName ||
        profile.anak
      )
    );
  }

  function isWaliProfile(profile = {}) {
    const roles = normalizeRoles(profile);

    return (
      roles.includes("wali") ||
      profile.isPortalWali === true ||
      cleanText(profile.portalMode).toLowerCase() === "wali" ||
      hasStudentName(profile)
    );
  }

  function candidateScore(profile = {}) {
    if (!profile || typeof profile !== "object") {
      return -1;
    }

    let score = 0;

    if (hasStudentName(profile)) score += 100;
    if (isWaliProfile(profile)) score += 45;
    if (profile.isPortalWali === true) score += 15;
    if (profile.waliUsername) score += 12;
    if (profile.username) score += 8;
    if (profile.uid) score += 3;

    return score;
  }

  function readStorageProfile(key) {
    return safeParse(localStorage.getItem(key), null);
  }

  function chooseAccount() {
    const current =
      readStorageProfile(
        KEYS.current
      );

    const saved =
      readStorageProfile(
        KEYS.account
      );

    /*
     * Login terbaru selalu menulis cahayaCurrentUser.
     * Prioritaskan key itu bila memang berisi akun wali/santri,
     * agar akun wali sebelumnya tidak terbawa ke login baru.
     */
    if (
      current &&
      typeof current === "object" &&
      (
        isWaliProfile(current) ||
        hasStudentName(current)
      )
    ) {
      return {
        account: {
          ...current
        },
        source:
          KEYS.current
      };
    }

    if (
      saved &&
      typeof saved === "object"
    ) {
      return {
        account: {
          ...saved
        },
        source:
          KEYS.account
      };
    }

    return {
      account: null,
      source: "none"
    };
  }


  function getAccountUsername(account = {}) {
    return cleanText(
      account.waliUsername ||
      account.username ||
      account.userName ||
      (
        account.email
          ? String(account.email).split("@")[0]
          : ""
      )
    ).toLowerCase();
  }

  function studentNameFrom(account = {}, storedStudent = {}) {
    return cleanText(
      account.namaAnak ||
      account.namaSantri ||
      account.namaAnanda ||
      account.studentName ||
      account.anak ||
      storedStudent.namaAnak ||
      storedStudent.namaSantri ||
      storedStudent.namaAnanda ||
      storedStudent.studentName ||
      storedStudent.label ||
      storedStudent.nama ||
      (
        normalizeRoles(account)
          .includes("wali")
          ? (
              account.label ||
              account.namaTampilan ||
              account.nama ||
              ""
            )
          : ""
      )
    );
  }

  function buildStudentProfile(account = {}) {
    const storedStudent =
      readStorageProfile(KEYS.student) || {};

    const studentName =
      studentNameFrom(account, storedStudent);

    const waliUsername =
      getAccountUsername(account) ||
      cleanText(storedStudent.waliUsername);

    const photo =
      cleanText(
        account.fotoAnak ||
        account.fotoSantri ||
        account.studentPhoto ||
        account.photoSantri ||
        account.fotoProfil ||
        account.foto ||
        storedStudent.fotoProfil ||
        storedStudent.fotoAnak ||
        storedStudent.fotoSantri
      );

    return {
      ...storedStudent,

      portalMode: "wali",
      isPortalWali: true,

      waliUsername,
      waliLabel: cleanText(
        account.waliLabel ||
        account.label ||
        account.nama ||
        account.namaTampilan ||
        account.username ||
        "Wali Santri"
      ),

      username: waliUsername,

      namaAnak: studentName,
      namaSantri: studentName,
      namaAnanda: studentName,
      studentName,
      label: studentName,
      nama: studentName,
      namaTampilan: studentName,

      kelas: cleanText(
        account.kelasSantri ||
        account.kelas ||
        storedStudent.kelasSantri ||
        storedStudent.kelas
      ),

      kelasSantri: cleanText(
        account.kelasSantri ||
        account.kelas ||
        storedStudent.kelasSantri ||
        storedStudent.kelas
      ),

      usrah: cleanText(
        account.usrah ||
        account.namaUsrah ||
        storedStudent.usrah ||
        storedStudent.namaUsrah
      ),

      namaUsrah: cleanText(
        account.namaUsrah ||
        account.usrah ||
        storedStudent.namaUsrah ||
        storedStudent.usrah
      ),

      naqib: cleanText(
        account.naqib ||
        account.namaNaqib ||
        storedStudent.naqib ||
        storedStudent.namaNaqib
      ),

      namaNaqib: cleanText(
        account.namaNaqib ||
        account.naqib ||
        storedStudent.namaNaqib ||
        storedStudent.naqib
      ),

      fotoProfil: photo,
      fotoAnak: photo,
      fotoSantri: photo,

      tahunAjaran: cleanText(
        account.tahunAjaran ||
        storedStudent.tahunAjaran ||
        "2026/2027"
      ),

      akses: ["wali"],
      jabatan: ["santri"],
      role: "santri",
      roleLabel: "Santri"
    };
  }

  function ensureWaliRole(account = {}) {
    const roles = normalizeRoles(account);

    if (
      roles.includes("wali") ||
      !hasStudentName(account)
    ) {
      return { ...account };
    }

    const akses = Array.isArray(account.akses)
      ? [...account.akses]
      : roles;

    if (!akses.map(item => String(item).toLowerCase()).includes("wali")) {
      akses.push("wali");
    }

    return {
      ...account,
      akses
    };
  }

  function saveState(account, source = "local") {
    const normalizedAccount =
      ensureWaliRole({
        ...account,
        waliUsername:
          account.waliUsername ||
          getAccountUsername(account)
      });

    const student =
      buildStudentProfile(normalizedAccount);

    state = {
      account: normalizedAccount,
      student,
      ready: true,
      valid: Boolean(
        normalizedAccount &&
        (
          isWaliProfile(normalizedAccount) ||
          hasStudentName(normalizedAccount)
        ) &&
        studentNameFrom(normalizedAccount, student)
      ),
      source
    };

    localStorage.setItem(
      KEYS.account,
      JSON.stringify(normalizedAccount)
    );

    localStorage.setItem(
      KEYS.student,
      JSON.stringify(student)
    );

    /*
     * cahayaCurrentUser dipertahankan sebagai AKUN WALI.
     * Halaman portal tidak lagi memakai key ini langsung untuk nama santri.
     */
    localStorage.setItem(
      KEYS.current,
      JSON.stringify(normalizedAccount)
    );

    global.cahayaWaliAccount =
      normalizedAccount;

    global.cahayaWaliStudentProfile =
      student;

    try {
      global.dispatchEvent(
        new CustomEvent(
          "CAHAYA_WALI_SESSION_READY",
          {
            detail: {
              account: normalizedAccount,
              student
            }
          }
        )
      );
    } catch (error) {}

    return state;
  }

  async function readFirestoreAccount(
    firestore,
    account
  ) {
    const username =
      getAccountUsername(account);

    if (
      !firestore ||
      !username ||
      typeof firestore.collection !== "function"
    ) {
      return null;
    }

    try {
      const snapshot =
        await firestore
          .collection("users")
          .doc(username)
          .get();

      if (snapshot.exists) {
        return snapshot.data();
      }
    } catch (error) {
      console.warn(
        "Profil Firestore belum dapat diperbarui:",
        error
      );
    }

    return null;
  }

  async function ready(options = {}) {
    const force =
      options.force === true;

    if (
      readyPromise &&
      !force
    ) {
      return readyPromise;
    }

    readyPromise =
      (async () => {
        const selected =
          chooseAccount();

        if (!selected.account) {
          state = {
            account: null,
            student: null,
            ready: true,
            valid: false,
            source: "none"
          };

          return state;
        }

        let account = {
          ...selected.account
        };

        const remote =
          await readFirestoreAccount(
            options.firestore,
            account
          );

        if (remote) {
          /*
           * Data lokal yang berisi nama anak tidak boleh hilang
           * hanya karena dokumen Firestore lama belum punya field itu.
           */
          account = {
            ...account,
            ...remote,

            namaAnak:
              remote.namaAnak ||
              remote.namaSantri ||
              remote.namaAnanda ||
              account.namaAnak ||
              account.namaSantri ||
              account.namaAnanda ||
              "",

            waliUsername:
              account.waliUsername ||
              account.username ||
              remote.username ||
              ""
          };

          return saveState(
            account,
            "firestore"
          );
        }

        return saveState(
          account,
          selected.source
        );
      })();

    return readyPromise;
  }

  function getAccount() {
    if (state.account) {
      return { ...state.account };
    }

    const selected =
      chooseAccount();

    return selected.account
      ? { ...selected.account }
      : {};
  }

  function getStudent() {
    if (state.student) {
      return { ...state.student };
    }

    return buildStudentProfile(
      getAccount()
    );
  }

  function studentName(profile = getStudent()) {
    return studentNameFrom(
      profile,
      profile
    );
  }

  function normalizeName(value = "") {
    let text =
      String(value ?? "")
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toLowerCase()
        .trim();

    /*
     * Variasi lama yang sah:
     * M. Fulan, M Fulan, Mhd. Fulan, Mohd Fulan,
     * Mohammad Fulan, Mohamad Fulan.
     *
     * Semuanya dibakukan menjadi "muhammad ...".
     * Nama seperti "Mika" tidak berubah karena huruf M-nya
     * bukan token/awalan yang berdiri sendiri.
     */
    text = text
      .replace(
        /\bm\.\s*/g,
        "muhammad "
      )
      .replace(
        /\bm(?=\s+|$)/g,
        "muhammad"
      )
      .replace(
        /\b(?:mhd|muh|mohd)\.?(?=\s+|$)/g,
        "muhammad"
      )
      .replace(
        /\b(?:mohammad|mohamad)\b/g,
        "muhammad"
      )
      .replace(
        /\bmuhammad\b/g,
        "muhammad"
      );

    return text
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function namesMatch(a, b) {
    const left =
      normalizeName(a);

    const right =
      normalizeName(b);

    if (
      !left ||
      !right
    ) {
      return false;
    }

    /*
     * Hanya pencocokan kanonik yang pasti.
     * Tidak memakai "mirip sebagian" agar data santri tidak
     * salah alamat ketika ada nama yang hampir sama.
     */
    if (
      left === right
    ) {
      return true;
    }

    return (
      left.replace(/\s+/g, "") ===
      right.replace(/\s+/g, "")
    );
  }

  function memberName(value) {
    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return cleanText(value);
    }

    if (
      !value ||
      typeof value !== "object"
    ) {
      return "";
    }

    return cleanText(
      value.namaSantri ||
      value.nama_santri ||
      value.namaAnak ||
      value.namaAnanda ||
      value.nama ||
      value.label ||
      value.santri ||
      value.studentName ||
      ""
    );
  }

  function directMemberNames(value) {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map(memberName)
        .filter(Boolean);
    }

    if (
      typeof value === "object"
    ) {
      const directName =
        memberName(value);

      if (directName) {
        return [
          directName
        ];
      }

      return Object.values(value)
        .map(memberName)
        .filter(Boolean);
    }

    const single =
      memberName(value);

    return single
      ? [single]
      : [];
  }

  function findStudentGroup(
    source,
    studentName
  ) {
    if (
      !source ||
      typeof source !== "object"
    ) {
      return null;
    }

    for (
      const [groupName, value]
      of Object.entries(source)
    ) {
      const directNames =
        directMemberNames(value);

      if (
        directNames.some(name =>
          namesMatch(
            name,
            studentName
          )
        )
      ) {
        return {
          groupName:
            cleanText(groupName),

          matchedName:
            directNames.find(name =>
              namesMatch(
                name,
                studentName
              )
            ) || ""
        };
      }
    }

    /*
     * Fallback untuk struktur lama yang masih bertingkat,
     * misalnya rumpun -> kelas -> daftar santri.
     */
    for (
      const [parentName, value]
      of Object.entries(source)
    ) {
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        continue;
      }

      const nested =
        findStudentGroup(
          value,
          studentName
        );

      if (nested) {
        return {
          ...nested,
          parentName:
            nested.parentName ||
            cleanText(parentName)
        };
      }
    }

    return null;
  }

  function formatClassDisplay(value = "") {
    const clean =
      cleanText(value);

    if (!clean) {
      return "Kelas belum tersedia";
    }

    return /^(kelas|class)\b/i.test(clean)
      ? clean
      : `Kelas ${clean}`;
  }

  function normalizeUsrahLabel(value = "") {
    const clean =
      cleanText(value)
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    const match =
      clean.match(
        /^(?:usrah|usro|usroh)\s*([1-8])$/
      );

    if (!match) {
      return "";
    }

    return `Usrah ${match[1]}`;
  }

  function isValidUsrahLabel(value = "") {
    return Boolean(
      normalizeUsrahLabel(
        value
      )
    );
  }

  function findStudentUsrah(
    source,
    studentName,
    inheritedUsrah = ""
  ) {
    if (
      !source ||
      typeof source !== "object"
    ) {
      return null;
    }

    for (
      const [key, value]
      of Object.entries(source)
    ) {
      const currentUsrah =
        normalizeUsrahLabel(
          key
        ) ||
        inheritedUsrah;

      const directNames =
        directMemberNames(
          value
        );

      if (
        currentUsrah &&
        directNames.some(name =>
          namesMatch(
            name,
            studentName
          )
        )
      ) {
        return {
          groupName:
            currentUsrah,

          matchedName:
            directNames.find(name =>
              namesMatch(
                name,
                studentName
              )
            ) || ""
        };
      }

      if (
        value &&
        typeof value === "object"
      ) {
        const nested =
          findStudentUsrah(
            value,
            studentName,
            currentUsrah
          );

        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  function formatUsrahDisplay(value = "") {
    const normalized =
      normalizeUsrahLabel(
        value
      );

    return normalized ||
      "Usrah belum tersedia";
  }

  async function resolveStudentIdentity(
    database,
    studentName,
    fallbackProfile = {}
  ) {
    const target =
      cleanText(
        studentName ||
        studentNameFrom(
          fallbackProfile,
          fallbackProfile
        )
      );

    const [
      directClassResult,
      legacyClassResult,
      usrahResult
    ] = await Promise.all([
      readRTDB(
        database,
        "cahaya_app/master_akademik/kelas"
      ),

      readRTDB(
        database,
        "cahaya_app/master_akademik/halqah/Halqah Ilmiyah"
      ),

      readRTDB(
        database,
        "cahaya_app/master_usrah"
      )
    ]);

    const directClassMatch =
      findStudentGroup(
        directClassResult.value,
        target
      );

    const legacyClassMatch =
      directClassMatch
        ? null
        : findStudentGroup(
            legacyClassResult.value,
            target
          );

    const usrahMatch =
      findStudentUsrah(
        usrahResult.value,
        target
      );

    const kelas =
      cleanText(
        directClassMatch?.groupName ||
        legacyClassMatch?.groupName ||
        fallbackProfile.kelas ||
        fallbackProfile.kelasSantri ||
        ""
      );

    const usrah =
      normalizeUsrahLabel(
        usrahMatch?.groupName ||
        fallbackProfile.usrah ||
        fallbackProfile.namaUsrah ||
        ""
      );

    const patch = {};

    if (kelas) {
      patch.kelas =
        kelas;

      patch.kelasSantri =
        kelas;
    }

    if (usrah) {
      patch.usrah =
        usrah;

      patch.namaUsrah =
        usrah;
    }

    if (
      Object.keys(patch).length
    ) {
      updateStudent(
        patch
      );
    }

    return {
      kelas,
      usrah,

      kelasDisplay:
        formatClassDisplay(
          kelas
        ),

      usrahDisplay:
        formatUsrahDisplay(
          usrah
        ),

      classSource:
        directClassMatch
          ? "master_akademik/kelas"
          : (
              legacyClassMatch
                ? "master_akademik/halqah/Halqah Ilmiyah"
                : "profile"
            ),

      usrahSource:
        usrahMatch
          ? "master_usrah"
          : "profile"
    };
  }


  function toArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "object") {
      return Object.values(value);
    }

    return [value];
  }

  async function readRTDB(database, path, options = {}) {
    try {
      const indexMap = {
        "cahaya_app/asesmen_cahaya_santri":"asesmen",
        "cahaya_app/setoran_tahfiz":"tahfiz",
        "cahaya_app/nilai_ujian_bulanan":"nilai_bulanan",
        "cahaya_app/absensi_program_harian":"program",
        "cahaya_app/absensi_pembelajaran":"pembelajaran",
        "cahaya_app/log_lapor_inisiatif":"laporan",
        "cahaya_app/poin_manual":"poin_manual",
        "cahaya_app/buku_kasus_konselor":"kasus_konselor",
        "cahaya_app/laporan_penindakan":"penindakan"
      };
      const currentName = studentName();
      const studentKey = normalizeName(currentName).replace(/[^a-z0-9]/g, "");
      if (studentKey && indexMap[path]) {
        const indexed = await database.ref(`cahaya_app/wali_index/${studentKey}/${indexMap[path]}`).limitToLast(Number(options.limit || 300)).once("value");
        if (indexed.exists()) {
          return { ok:true, snapshot:indexed, value:indexed.val(), indexed:true };
        }
      }
      const snapshot = window.CahayaBandwidth
        ? await window.CahayaBandwidth.readCompat(database, path, options)
        : await database.ref(path).limitToLast(Number(options.limit || 300)).once("value");

      return {
        ok: true,
        snapshot,
        value: snapshot.val()
      };
    } catch (error) {
      console.warn(
        `Data ${path} belum dapat dibaca:`,
        error
      );

      return {
        ok: false,
        snapshot: null,
        value: null,
        error
      };
    }
  }

  async function readSnapshot(database, path) {
    const result =
      await readRTDB(
        database,
        path
      );

    return result.snapshot;
  }

  function updateStudent(patch = {}) {
    const account =
      getAccount();

    const currentStudent =
      getStudent();

    const nextStudent = {
      ...currentStudent,
      ...patch
    };

    const nextName =
      cleanText(
        patch.namaAnak ||
        patch.namaSantri ||
        patch.namaAnanda ||
        patch.label ||
        patch.nama ||
        currentStudent.namaAnak
      );

    const nextPhoto =
      cleanText(
        patch.fotoProfil ||
        patch.fotoAnak ||
        patch.fotoSantri ||
        currentStudent.fotoProfil
      );

    const nextAccount = {
      ...account,

      namaAnak:
        nextName ||
        account.namaAnak,

      namaSantri:
        nextName ||
        account.namaSantri,

      fotoAnak:
        nextPhoto ||
        account.fotoAnak,

      fotoSantri:
        nextPhoto ||
        account.fotoSantri,

      fotoProfil:
        nextPhoto ||
        account.fotoProfil,

      kelasSantri:
        patch.kelasSantri ||
        patch.kelas ||
        account.kelasSantri ||
        account.kelas,

      usrah:
        patch.usrah ||
        patch.namaUsrah ||
        account.usrah,

      naqib:
        patch.naqib ||
        patch.namaNaqib ||
        account.naqib
    };

    const nextState =
      saveState(
        nextAccount,
        "updated"
      );

    localStorage.setItem(
      KEYS.student,
      JSON.stringify({
        ...nextState.student,
        ...nextStudent,
        namaAnak:
          nextName ||
          nextState.student.namaAnak,
        namaSantri:
          nextName ||
          nextState.student.namaSantri,
        label:
          nextName ||
          nextState.student.label,
        nama:
          nextName ||
          nextState.student.nama,
        fotoProfil:
          nextPhoto ||
          nextState.student.fotoProfil
      })
    );

    state.student =
      readStorageProfile(
        KEYS.student
      );

    return {
      account:
        { ...state.account },
      student:
        { ...state.student }
    };
  }

  function updateAccount(patch = {}) {
    return saveState(
      {
        ...getAccount(),
        ...patch
      },
      "updated"
    );
  }

  function clear() {
    Object.values(KEYS)
      .forEach(key =>
        localStorage.removeItem(key)
      );

    state = {
      account: null,
      student: null,
      ready: false,
      valid: false,
      source: "none"
    };

    readyPromise = null;
  }

  function notifyParent() {
    try {
      if (
        global.parent &&
        global.parent !== global
      ) {
        global.parent.postMessage(
          {
            type:
              "CAHAYA_STUDENT_UPDATED",

            profile:
              getStudent(),

            account:
              getAccount()
          },
          "*"
        );
      }
    } catch (error) {}
  }

  global.addEventListener(
    "message",
    event => {
      if (
        event.data?.type ===
          "CAHAYA_PROFILE_SYNC" &&
        event.data.profile
      ) {
        const account = {
          ...getAccount(),
          ...(event.data.account || {}),

          namaAnak:
            event.data.profile.namaAnak ||
            event.data.profile.namaSantri ||
            getAccount().namaAnak,

          fotoAnak:
            event.data.profile.fotoProfil ||
            getAccount().fotoAnak
        };

        saveState(
          account,
          "parent"
        );
      }
    }
  );

  global.CahayaWaliSession = {
    KEYS,
    ready,
    getAccount,
    getStudent,
    studentName,
    normalizeRoles,
    isWaliProfile,
    hasStudentName,
    normalizeName,
    namesMatch,
    memberName,
    directMemberNames,
    findStudentGroup,
    normalizeUsrahLabel,
    isValidUsrahLabel,
    findStudentUsrah,
    formatClassDisplay,
    formatUsrahDisplay,
    resolveStudentIdentity,
    toArray,
    readRTDB,
    readSnapshot,
    updateStudent,
    updateAccount,
    notifyParent,
    clear,
    safeParse
  };
})(window);
