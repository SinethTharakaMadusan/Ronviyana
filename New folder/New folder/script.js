/* =========================================================
   RONVIANA — script.js
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     1. WALLPAPER DATA
     ========================================================= */
  function img(seed, w, h) {
    return "https://picsum.photos/seed/" + seed + "/" + w + "/" + h;
  }

  function shot(seed, device) {
    return device === "Mobile"
      ? { thumb: img(seed, 600, 1066), image: img(seed, 1440, 2560), ratio: "9 / 16" }
      : { thumb: img(seed, 900, 563),  image: img(seed, 2560, 1440), ratio: "16 / 10" };
  }

  function make(id, title, category, device, resolution, downloads, likes, isNew, isPopular, seed) {
    var s = shot(seed, device);
    return {
      id: id,
      title: title,
      category: category,
      device: device,
      resolution: resolution,
      type: "JPG",
      downloads: downloads,
      likes: likes,
      isNew: isNew,
      isPopular: isPopular,
      thumb: s.thumb,
      image: s.image,
      ratio: s.ratio
    };
  }

  var CATEGORIES = [
    "Nature", "Technology", "Space", "Minimal", "Cars", "AMOLED",
    "Abstract", "Anime", "Gaming", "Architecture", "City", "Fantasy"
  ];
  var FILTERS = ["All", "Nature", "Technology", "Space", "Minimal", "Cars", "AMOLED", "Abstract", "Anime", "Gaming", "Architecture", "City", "Fantasy", "Mobile", "Desktop", "4K"];

  var DEFAULT_WALLPAPERS = [
    {
      id: 1,
      title: "Midnight Mountain Aurora",
      category: "Nature",
      device: "Desktop",
      resolution: "5K",
      type: "JPG",
      downloads: 14820,
      likes: 3420,
      isNew: false,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 2,
      title: "Neon Cyber Metropolis",
      category: "Technology",
      device: "Desktop",
      resolution: "4K",
      type: "JPG",
      downloads: 18450,
      likes: 4910,
      isNew: true,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 3,
      title: "Deep Violet Galaxy",
      category: "Space",
      device: "Mobile",
      resolution: "4K",
      type: "JPG",
      downloads: 9840,
      likes: 2190,
      isNew: false,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&q=80",
      image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1440&q=85",
      ratio: "9 / 16"
    },
    {
      id: 4,
      title: "Minimal OLED Black",
      category: "AMOLED",
      device: "Mobile",
      resolution: "4K",
      type: "JPG",
      downloads: 12400,
      likes: 3820,
      isNew: false,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80",
      image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1440&q=85",
      ratio: "9 / 16"
    },
    {
      id: 5,
      title: "Crimson Velocity Hypercar",
      category: "Cars",
      device: "Desktop",
      resolution: "4K",
      type: "JPG",
      downloads: 16210,
      likes: 4180,
      isNew: true,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 6,
      title: "Fluid Iridescent Silk",
      category: "Abstract",
      device: "Desktop",
      resolution: "5K",
      type: "JPG",
      downloads: 8740,
      likes: 1980,
      isNew: true,
      isPopular: false,
      thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 7,
      title: "Tokyo Rain Reflections",
      category: "City",
      device: "Mobile",
      resolution: "4K",
      type: "JPG",
      downloads: 11620,
      likes: 2940,
      isNew: true,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&q=80",
      image: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1440&q=85",
      ratio: "9 / 16"
    },
    {
      id: 8,
      title: "Silent Horizon Geometry",
      category: "Minimal",
      device: "Mobile",
      resolution: "4K",
      type: "JPG",
      downloads: 7380,
      likes: 1510,
      isNew: false,
      isPopular: false,
      thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1440&q=85",
      ratio: "9 / 16"
    },
    {
      id: 9,
      title: "Cyber Arcade Synth",
      category: "Gaming",
      device: "Desktop",
      resolution: "4K",
      type: "JPG",
      downloads: 13910,
      likes: 3670,
      isNew: true,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80",
      image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 10,
      title: "Cherry Blossom Dream",
      category: "Anime",
      device: "Desktop",
      resolution: "4K",
      type: "JPG",
      downloads: 15400,
      likes: 4230,
      isNew: true,
      isPopular: true,
      thumb: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
      image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 11,
      title: "Futuristic Monolith Tower",
      category: "Architecture",
      device: "Desktop",
      resolution: "5K",
      type: "JPG",
      downloads: 6890,
      likes: 1420,
      isNew: false,
      isPopular: false,
      thumb: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=2560&q=85",
      ratio: "16 / 10"
    },
    {
      id: 12,
      title: "Floating Astral Citadel",
      category: "Fantasy",
      device: "Desktop",
      resolution: "5K",
      type: "JPG",
      downloads: 10240,
      likes: 2780,
      isNew: true,
      isPopular: false,
      thumb: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&q=85",
      ratio: "16 / 10"
    }
  ];

  var WALLPAPERS = DEFAULT_WALLPAPERS.slice();


  /* =========================================================
     2. HELPERS
     ========================================================= */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function compact(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function byId(id) {
    for (var i = 0; i < WALLPAPERS.length; i++) {
      if (WALLPAPERS[i].id === id) return WALLPAPERS[i];
    }
    return null;
  }

  function wallpaperUrl(id) {
    var url = new URL(window.location.href);
    url.hash = "wallpaper/" + id;
    return url.href;
  }

  var toastTimer;
  function toast(message) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 3200);
  }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  function fadeIn(el) {
    if (!el) return;
    if (el.complete && el.naturalWidth) { el.classList.add("is-loaded"); return; }
    el.addEventListener("load", function () { el.classList.add("is-loaded"); }, { once: true });
    el.addEventListener("error", function () { el.classList.add("is-loaded"); }, { once: true });
  }


  /* =========================================================
     3. FAVOURITES
     ========================================================= */
  var FAV_KEY = "ronviana:favorites";
  var favorites = store.get(FAV_KEY, store.get("wallora:favorites", []));

  function isFav(id) { return favorites.indexOf(id) !== -1; }

  function toggleFav(id) {
    var i = favorites.indexOf(id);
    if (i === -1) favorites.push(id);
    else favorites.splice(i, 1);

    store.set(FAV_KEY, favorites);
    syncFavUI(id);
    updateFavBadge();

    if (currentRoute === "favorites") renderFavorites();
    return isFav(id);
  }

  function syncFavUI(id) {
    $$('.card__fav[data-fav="' + id + '"]').forEach(function (btn) {
      btn.classList.toggle("is-on", isFav(id));
      btn.setAttribute("aria-pressed", String(isFav(id)));
      btn.setAttribute("aria-label", (isFav(id) ? "Remove " : "Save ") + (byId(id) || {}).title);
      btn.classList.remove("pop");
      void btn.offsetWidth;
      btn.classList.add("pop");
    });

    var modalFav = $("#modalFav");
    if (modalFav && Number(modalFav.dataset.id) === id) {
      modalFav.classList.toggle("is-on", isFav(id));
      var label = $("#modalFavLabel");
      if (label) label.textContent = isFav(id) ? "Saved" : "Save";
    }
  }

  function updateFavBadge() {
    var badge = $("#favCount");
    var link  = $(".icon-btn--fav");
    if (badge) {
      badge.textContent = favorites.length;
      badge.hidden = favorites.length === 0;
    }
    if (link) link.classList.toggle("has-items", favorites.length > 0);
  }


  /* =========================================================
     4. THEME
     ========================================================= */
  var THEME_KEY = "ronviana:theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = $("#themeToggle");
    if (btn) {
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#080808" : "#f4f5f7");
    store.set(THEME_KEY, theme);
  }

  function initTheme() {
    applyTheme(store.get(THEME_KEY, "dark"));
    var btn = $("#themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        toast(next === "dark" ? "Dark mode on" : "Light mode on");
      });
    }
  }


  /* =========================================================
     5. CARD RENDERING
     ========================================================= */
  var HEART = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 20s-7.2-4.4-9.1-8.5C1.3 8 3.2 4.6 6.6 4.6c2 0 3.4 1.1 4.3 2.4l1.1 1.5 1.1-1.5c.9-1.3 2.3-2.4 4.3-2.4 3.4 0 5.3 3.4 3.7 6.9C19.2 15.6 12 20 12 20z"/></svg>';
  var DOWN  = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/></svg>';

  function cardHTML(w, opts) {
    opts = opts || {};
    var badges = "";
    if (w.isNew)     badges += '<span class="badge badge--new">NEW</span>';
    if (w.isPopular) badges += '<span class="badge badge--popular">POPULAR</span>';

    var stats = opts.stats
      ? '<div class="card__stats">' +
          "<span>" + ARROW + compact(w.downloads) + " downloads</span>" +
          "<span>" + HEART + compact(w.likes) + "</span>" +
        "</div>"
      : "";

    return '' +
      '<article class="card reveal" data-open="' + w.id + '" tabindex="0" role="button" ' +
              'aria-label="Preview ' + w.title + '">' +
        '<img class="card__img" src="' + w.thumb + '" alt="' + w.title + ' — ' + w.category +
            ' wallpaper for ' + w.device.toLowerCase() + '" loading="lazy" decoding="async" ' +
            'style="--ratio:' + w.ratio + '" />' +
        '<span class="card__veil"></span>' +
        (badges ? '<div class="card__badges">' + badges + "</div>" : "") +
        '<button class="card__fav' + (isFav(w.id) ? " is-on" : "") + '" data-fav="' + w.id + '" ' +
                'aria-pressed="' + isFav(w.id) + '" aria-label="' +
                (isFav(w.id) ? "Remove " : "Save ") + w.title + '">' + HEART + "</button>" +
        '<div class="card__body">' +
          '<p class="card__cat">' + w.category + "</p>" +
          '<h3 class="card__title">' + w.title + "</h3>" +
          '<div class="card__meta">' +
            '<span class="tag">' + w.resolution + "</span>" +
            '<span class="tag">' + w.device + "</span>" +
            '<span class="tag">' + w.type + "</span>" +
          "</div>" +
          stats +
          '<button class="card__dl" data-download="' + w.id + '">' + DOWN + "Download</button>" +
        "</div>" +
      "</article>";
  }

  function renderInto(container, list, opts) {
    var el = typeof container === "string" ? $(container) : container;
    if (!el) return;
    el.innerHTML = list.map(function (w) { return cardHTML(w, opts); }).join("");
    $$(".card__img", el).forEach(fadeIn);
  }


  /* =========================================================
     6. FILTERS
     ========================================================= */
  function inCategory(w, cat) {
    if (cat === "All") return true;
    if (cat === "4K")  return w.resolution === "4K" || w.resolution === "5K";
    if (cat === "Dark") return ["AMOLED", "Space", "Minimal", "Abstract"].indexOf(w.category) !== -1;
    return w.category === cat;
  }

  function countIn(cat) {
    return WALLPAPERS.filter(function (w) { return inCategory(w, cat); }).length;
  }

  function buildFilterBar(barSel, gridSel, emptySel, limit) {
    var bar = $(barSel);
    if (!bar) return;

    bar.innerHTML = FILTERS.map(function (c, i) {
      return '<button class="chip' + (i === 0 ? " is-active" : "") + '" role="tab" ' +
             'aria-selected="' + (i === 0) + '" data-filter="' + c + '">' + c + "</button>";
    }).join("");

    function apply(cat) {
      var list = WALLPAPERS.filter(function (w) { return inCategory(w, cat); });
      if (limit) list = list.slice(0, limit);

      renderInto(gridSel, list);

      var empty = $(emptySel);
      if (empty) {
        empty.hidden = list.length > 0;
        empty.innerHTML = "<h3>No wallpapers in " + cat + " yet</h3>" +
                          "<p>Pick another category to keep browsing.</p>" +
                          '<button class="btn btn--ghost" data-filter-reset>Show all wallpapers</button>';
      }

      var countLabel = $("#wallCount");
      if (countLabel && barSel === "#filtersAll") {
        countLabel.textContent = list.length + " wallpaper" + (list.length === 1 ? "" : "s") +
                                 (cat === "All" ? " in the library." : " in " + cat + ".");
      }
    }

    bar.onclick = function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      $$(".chip", bar).forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-selected", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-selected", "true");
      apply(chip.dataset.filter);
    };

    apply("All");
    return { apply: apply, bar: bar };
  }

  function selectFilter(bar, cat) {
    var chip = $('.chip[data-filter="' + cat + '"]', bar);
    if (chip) { chip.click(); return true; }
    return false;
  }


  /* =========================================================
     7. CATEGORIES
     ========================================================= */
  function renderCategories() {
    var el = $("#catsGrid");
    if (!el) return;
    el.innerHTML = CATEGORIES.map(function (c) {
      var cover = WALLPAPERS.filter(function (w) { return inCategory(w, c); })[0];
      var src = cover ? cover.thumb : img("cat-" + slug(c), 700, 525);
      var n = countIn(c);
      return '<a class="cat" href="#wallpapers" data-cat="' + c + '">' +
               '<img src="' + src + '" alt="' + c + ' wallpapers" loading="lazy" decoding="async" />' +
               '<span class="cat__text">' +
                 '<span class="cat__name">' + c + "</span><br />" +
                 '<span class="cat__count">' + n + " wallpapers</span>" +
               "</span>" +
             "</a>";
    }).join("");
  }


  /* =========================================================
     8. SEARCH
     ========================================================= */
  function matches(w, q) {
    q = q.trim().toLowerCase();
    if (!q) return false;

    var haystack = [w.title, w.category, w.device, w.resolution].join(" ").toLowerCase();
    if (haystack.indexOf(q) !== -1) return true;

    var related = {
      mountain: ["mountains", "nature"],
      mountains: ["mountain", "nature"],
      phone: ["mobile"],
      pc: ["desktop"],
      black: ["amoled", "minimal", "dark"],
      dark: ["amoled", "minimal", "space"],
      car: ["cars"],
      tech: ["technology"]
    };
    var extras = related[q] || [];
    for (var i = 0; i < extras.length; i++) {
      if (haystack.indexOf(extras[i]) !== -1) return true;
    }
    return q.length > 3 && haystack.indexOf(q.slice(0, q.length - 1)) !== -1;
  }

function initSearch() {
    var overlay = $("#search");
    var input   = $("#searchInput");
    var results = $("#searchResults");
    if (!overlay || !input || !results) return;

    var hints = $("#searchHints");

    function renderSearchHints() {
      if (!hints) return;
      var searchCategories = CATEGORIES.length > 0 ? CATEGORIES : ["All"];
      hints.innerHTML = searchCategories
        .map(function (h) { return "<button>" + h + "</button>"; })
        .join("");
    }

    renderSearchHints();

    function open() {
      renderSearchHints(); 
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      setTimeout(function () { input.focus(); }, 60);
    }

    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
    }

    function run(q) {
      if (!q.trim()) { results.innerHTML = ""; return; }

      var found = WALLPAPERS.filter(function (w) { return matches(w, q); });

      if (!found.length) {
        results.innerHTML =
          '<div class="empty"><h3>No wallpapers found</h3><p>Try searching for something else.</p></div>';
        return;
      }

      results.innerHTML = found.map(function (w) {
        return '<button class="result" data-open="' + w.id + '">' +
                 '<img src="' + w.thumb + '" alt="" loading="lazy" />' +
                 "<span><strong>" + w.title + "</strong>" +
                 "<span>" + w.category + " · " + w.resolution + " · " + w.device + "</span></span>" +
               "</button>";
      }).join("");
    }

    var sOpen = $("#searchOpen");
    var sClose = $("#searchClose");
    if (sOpen) sOpen.addEventListener("click", open);
    if (sClose) sClose.addEventListener("click", close);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener("input", function () { run(input.value); });

    if (hints) {
      hints.addEventListener("click", function (e) {
        if (e.target.tagName !== "BUTTON") return;
        input.value = e.target.textContent;
        run(input.value);
        input.focus();
      });
    }

    results.addEventListener("click", function (e) {
      var row = e.target.closest("[data-open]");
      if (!row) return;
      close();
      openModal(Number(row.dataset.open));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
      if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        open();
      }
    });
  }


  /* =========================================================
     9. MODAL
     ========================================================= */
  var lastFocused = null;

  function openModal(id) {
    var w = byId(id);
    if (!w) return;

    try {
      var apiBase = window.location.port === "3000" ? "" : "http://localhost:3000";
      fetch(apiBase + "/api/public/view/" + id, { method: "POST" }).catch(function(){});
    } catch (e) {}

    lastFocused = document.activeElement;

    var modal = $("#modal");
    var image = $("#modalImg");
    if (!modal || !image) return;

    image.classList.remove("is-loaded");
    image.src = w.image;
    image.alt = w.title + " — " + w.category + " wallpaper";
    fadeIn(image);
    resetFitToScreen();

    var catEl = $("#modalCat");
    var titleEl = $("#modalTitle");
    var specsEl = $("#modalSpecs");
    if (catEl) catEl.textContent = w.category;
    if (titleEl) titleEl.textContent = w.title;

    if (specsEl) {
      specsEl.innerHTML = [
        ["Resolution", w.resolution],
        ["Device", w.device],
        ["File type", w.type],
        ["Downloads", compact(w.downloads)],
      ].map(function (row) {
        return "<div><dt>" + row[0] + "</dt><dd>" + row[1] + "</dd></div>";
      }).join("");
    }

    var favBtn = $("#modalFav");
    if (favBtn) {
      favBtn.dataset.id = String(w.id);
      favBtn.classList.toggle("is-on", isFav(w.id));
      var label = $("#modalFavLabel");
      if (label) label.textContent = isFav(w.id) ? "Saved" : "Save";
    }

    var dlBtn = $("#modalDownload");
    if (dlBtn) dlBtn.dataset.id = String(w.id);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    setTimeout(function () { 
      var closeBtn = $("#modalClose");
      if (closeBtn) closeBtn.focus(); 
    }, 60);
  }

  /* ---- Fit to Screen ----
     Clears any active "fit" state (used whenever a new wallpaper
     is loaded into the modal, so each wallpaper opens in the
     default preview layout). */
  function resetFitToScreen() {
    var modal = $("#modal");
    var image = $("#modalImg");
    var fitBtn = $("#modalFitScreen");
    var label = $("#modalFitScreenLabel");
    if (modal) modal.classList.remove("is-fit");
    if (image) { image.style.width = ""; image.style.height = ""; }
    if (fitBtn) fitBtn.setAttribute("aria-pressed", "false");
    if (label) label.textContent = "Fit to Screen";
  }

  /* Reads the wallpaper's real pixel dimensions and the current
     size of the modal's media pane (which is itself sized from
     the live viewport via CSS), then works out the largest box
     that preserves the original aspect ratio without stretching,
     cropping, or upscaling past native resolution. Runs the same
     way for portrait, landscape and square images — no manual
     device/orientation switch needed. */
  function applyFitToScreen(natW, natH) {
    var media = $(".modal__media");
    var image = $("#modalImg");
    if (!media || !image || !natW || !natH) return;

    media.dataset.orientation = Math.abs(natW - natH) < 2
      ? "square"
      : (natH > natW ? "portrait" : "landscape");

    var availW = media.clientWidth;
    var availH = media.clientHeight;
    if (!availW || !availH) return;

    var scale = Math.min(availW / natW, availH / natH, 1);
    image.style.width = Math.round(natW * scale) + "px";
    image.style.height = Math.round(natH * scale) + "px";
  }

  function toggleFitToScreen() {
    var modal = $("#modal");
    var image = $("#modalImg");
    var fitBtn = $("#modalFitScreen");
    var label = $("#modalFitScreenLabel");
    if (!modal || !image || !fitBtn) return;

    if (modal.classList.contains("is-fit")) {
      resetFitToScreen();
      return;
    }

    var activate = function () {
      modal.classList.add("is-fit");
      fitBtn.setAttribute("aria-pressed", "true");
      if (label) label.textContent = "Default View";
      requestAnimationFrame(function () {
        applyFitToScreen(image.naturalWidth, image.naturalHeight);
      });
    };

    if (image.complete && image.naturalWidth) {
      activate();
    } else {
      image.addEventListener("load", activate, { once: true });
    }
  }

  var fitResizeTimer = null;
  function onFitViewportChange() {
    var modal = $("#modal");
    var image = $("#modalImg");
    if (!modal || !image || !modal.classList.contains("is-fit")) return;
    clearTimeout(fitResizeTimer);
    fitResizeTimer = setTimeout(function () {
      applyFitToScreen(image.naturalWidth, image.naturalHeight);
    }, 120);
  }

  function closeModal() {
    var modal = $("#modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    resetFitToScreen();

    if (/^#wallpaper\/\d+$/.test(location.hash)) {
      history.replaceState(null, "", window.location.pathname + window.location.search + "#home");
    }

    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function initModal() {
    var mClose = $("#modalClose");
    var mBack = $(".modal__backdrop");
    var mFav = $("#modalFav");
    var mDl = $("#modalDownload");
    var mCopy = $("#modalCopyLink");
    var mFit = $("#modalFitScreen");

    if (mClose) mClose.addEventListener("click", closeModal);
    if (mBack) mBack.addEventListener("click", closeModal);
    if (mFit) mFit.addEventListener("click", toggleFitToScreen);

    window.addEventListener("resize", onFitViewportChange);
    window.addEventListener("orientationchange", onFitViewportChange);

    if (mFav) {
      mFav.addEventListener("click", function () {
        toggleFav(Number(this.dataset.id));
      });
    }

    if (mDl) {
      mDl.addEventListener("click", function () {
        download(Number(this.dataset.id));
      });
    }

    if (mCopy) {
      mCopy.addEventListener("click", function () {
        var favBtn = $("#modalFav");
        if (favBtn) copyWallpaperLink(Number(favBtn.dataset.id));
      });
    }

    document.addEventListener("keydown", function (e) {
      var modal = $("#modal");
      if (e.key === "Escape" && modal && modal.classList.contains("is-open")) closeModal();
    });
  }

  function copyWallpaperLink(id) {
    var w = byId(id);
    if (!w) return;

    var link = wallpaperUrl(id);
    var done = function () {
      var label = $("#modalCopyLinkLabel");
      if (label) label.textContent = "Copied";
      toast("Wallpaper link copied");
      setTimeout(function () {
        if (label) label.textContent = "Copy link";
      }, 1800);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(done).catch(function () {
        fallbackCopy(link, done);
      });
    } else {
      fallbackCopy(link, done);
    }
  }

  function fallbackCopy(text, done) {
    var input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    try {
      if (document.execCommand("copy")) done();
      else toast("Copy failed — please copy the URL manually.");
    } catch (e) {
      toast("Copy failed — please copy the URL manually.");
    }
    document.body.removeChild(input);
  }


  /* =========================================================
     10. DOWNLOAD
     ========================================================= */
  function download(id) {
    var w = byId(id);
    if (!w) return;

    toast("Preparing " + w.title + "…");

    fetch(w.image, { mode: "cors" })
      .then(function (res) {
        if (!res.ok) throw new Error("bad response");
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = slug(w.title) + "-" + w.resolution.toLowerCase() + ".jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

        w.downloads += 1;
        toast("Downloaded " + w.title);

        try {
          var apiBase = window.location.port === "3000" ? "" : "http://localhost:3000";
          fetch(apiBase + "/api/public/download/" + id, { method: "POST" }).catch(function(){});
        } catch (e) {}
      })
      .catch(function () {
        window.open(w.image, "_blank", "noopener");
        toast("Opened in a new tab — right-click or long-press to save.");
      });
  }


  /* =========================================================
     11. ROUTING
     ========================================================= */
  var ROUTES = ["home", "wallpapers", "categories", "popular", "new", "favorites", "about", "contact"];
  var currentRoute = "home";
  var allFilters;

  var TITLES = {
    home:       "RONVIANA — Premium Wallpapers for Every Screen",
    wallpapers: "All Wallpapers — RONVIANA",
    categories: "Categories — RONVIANA",
    popular:    "Popular Wallpapers — RONVIANA",
    "new":      "New Wallpapers — RONVIANA",
    favorites:  "Your Favourites — RONVIANA",
    about:      "About — RONVIANA",
    contact:    "Contact Us — RONVIANA"
  };

  function go(route, opts) {
    opts = opts || {};
    if (ROUTES.indexOf(route) === -1) route = "home";
    currentRoute = route;

    ROUTES.forEach(function (r) {
      var page = $("#page-" + r);
      if (page) page.hidden = r !== route;
    });

    $$(".nav__links a").forEach(function (a) {
      var on = a.dataset.route === route;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    document.title = TITLES[route] || TITLES.home;

    if (route === "favorites") renderFavorites();

    if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: "auto" });

    var nLinks = $("#navLinks");
    var burger = $("#hamburger");
    if (nLinks) nLinks.classList.remove("is-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }

  function routeFromHash() {
    var hash = (location.hash || "#home").replace(/^#/, "");

    var match = hash.match(/^wallpaper\/(\d+)$/);
    if (match) {
      go("home");
      setTimeout(function () {
        openModal(Number(match[1]));
      }, 0);
      return;
    }

    go(hash);
  }

  function renderFavorites() {
    var list = favorites.map(byId).filter(Boolean);
    renderInto("#favGrid", list);

    var empty = $("#favEmpty");
    if (empty) {
      empty.hidden = list.length > 0;
      empty.innerHTML = "<h3>Your favourites are empty.</h3>" +
                        "<p>Tap the heart on any wallpaper to keep it here.</p>" +
                        '<a class="btn btn--primary" href="#wallpapers" data-route="wallpapers">Browse wallpapers</a>';
    }

    var clearBtn = $("#clearFavs");
    if (clearBtn) clearBtn.hidden = list.length === 0;
  }


  /* =========================================================
     12.1 HERO AUTO SLIDER
     ========================================================= */
  var heroSlider = {
    slides: [
      {
        title: "Midnight Mountain Aurora",
        category: "Nature",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2560&q=85"
      },
      {
        title: "Neon Cyber Metropolis",
        category: "Technology",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&q=85"
      },
      {
        title: "Crimson Velocity Hypercar",
        category: "Cars",
        image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2560&q=85"
      },
      {
        title: "Cyber Arcade Synth",
        category: "Gaming",
        image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=2560&q=85"
      },
      {
        title: "Cherry Blossom Dream",
        category: "Anime",
        image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=2560&q=85"
      }
    ],
    currentIndex: 0,
    timer: null,
    interval: 6000,
    isPaused: false,
    elements: {}
  };

  function initHeroSlider() {
    var container = $("#heroSlides");
    var dotsContainer = $("#heroDots");
    var titleEl = $("#heroSlideTitle");
    var prevBtn = $("#heroPrev");
    var nextBtn = $("#heroNext");
    var heroSection = $("#heroSection") || $(".hero");

    if (!container) return;

    heroSlider.elements = {
      container: container,
      dotsContainer: dotsContainer,
      titleEl: titleEl,
      heroSection: heroSection
    };

    renderHeroSlides();
    startHeroTimer();

    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.preventDefault();
        stepHeroSlide(-1);
        startHeroTimer();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.preventDefault();
        stepHeroSlide(1);
        startHeroTimer();
      });
    }

    if (heroSection) {
      heroSection.addEventListener("mouseenter", function () {
        heroSlider.isPaused = true;
        stopHeroTimer();
      });
      heroSection.addEventListener("mouseleave", function () {
        heroSlider.isPaused = false;
        startHeroTimer();
      });
      heroSection.addEventListener("touchstart", function () {
        heroSlider.isPaused = true;
      }, { passive: true });
      heroSection.addEventListener("touchend", function () {
        heroSlider.isPaused = false;
        startHeroTimer();
      }, { passive: true });
    }
  }

  function renderHeroSlides() {
    var container = heroSlider.elements.container;
    var dotsContainer = heroSlider.elements.dotsContainer;
    if (!container) return;

    container.innerHTML = "";
    if (dotsContainer) dotsContainer.innerHTML = "";

    heroSlider.slides.forEach(function (slide, idx) {
      var slideEl = document.createElement("div");
      slideEl.className = "hero__slide" + (idx === heroSlider.currentIndex ? " is-active" : "");
      slideEl.setAttribute("data-slide-index", String(idx));

      var imgEl = document.createElement("img");
      imgEl.src = slide.image;
      imgEl.alt = slide.title || "Wallpaper";
      imgEl.loading = idx === 0 ? "eager" : "lazy";

      slideEl.appendChild(imgEl);
      container.appendChild(slideEl);

      if (dotsContainer) {
        var dot = document.createElement("button");
        dot.className = "hero__dot" + (idx === heroSlider.currentIndex ? " is-active" : "");
        dot.setAttribute("aria-label", "Go to slide " + (idx + 1) + ": " + slide.title);
        dot.innerHTML = '<span class="hero__dot-progress"></span>';
        dot.addEventListener("click", function () {
          goToHeroSlide(idx);
          startHeroTimer();
        });
        dotsContainer.appendChild(dot);
      }
    });

    updateHeroBadge(heroSlider.currentIndex);
  }

  function updateHeroBadge(idx) {
    var titleEl = heroSlider.elements.titleEl;
    var current = heroSlider.slides[idx];
    if (titleEl && current) {
      titleEl.style.opacity = "0";
      setTimeout(function () {
        titleEl.textContent = current.title;
        titleEl.style.opacity = "1";
      }, 200);
    }
  }

  function goToHeroSlide(newIndex) {
    var total = heroSlider.slides.length;
    if (total === 0) return;
    newIndex = ((newIndex % total) + total) % total;

    if (newIndex === heroSlider.currentIndex) return;

    var prevIndex = heroSlider.currentIndex;
    heroSlider.currentIndex = newIndex;

    var slideEls = $$(".hero__slide", heroSlider.elements.container);
    var dotEls = $$(".hero__dot", heroSlider.elements.dotsContainer);

    slideEls.forEach(function (el, idx) {
      el.classList.remove("is-prev");
      if (idx === prevIndex) {
        el.classList.add("is-prev");
        el.classList.remove("is-active");
      } else if (idx === newIndex) {
        el.classList.add("is-active");
      } else {
        el.classList.remove("is-active");
      }
    });

    dotEls.forEach(function (el, idx) {
      var active = idx === newIndex;
      el.classList.toggle("is-active", active);
      if (active) {
        var prog = el.querySelector(".hero__dot-progress");
        if (prog) {
          prog.style.animation = "none";
          void prog.offsetWidth;
          prog.style.animation = "";
        }
      }
    });

    updateHeroBadge(newIndex);
  }

  function stepHeroSlide(dir) {
    goToHeroSlide(heroSlider.currentIndex + dir);
  }

  function startHeroTimer() {
    stopHeroTimer();
    heroSlider.timer = setInterval(function () {
      if (!heroSlider.isPaused) {
        stepHeroSlide(1);
      }
    }, heroSlider.interval);
  }

  function stopHeroTimer() {
    if (heroSlider.timer) {
      clearInterval(heroSlider.timer);
      heroSlider.timer = null;
    }
  }

  function updateHeroSliderFromWallpapers(wallpapers) {
    if (!wallpapers || wallpapers.length === 0) return;

    // Prefer wide (Desktop-ratio) wallpapers so the hero crop always looks
    // natural — a portrait/mobile wallpaper stretched into a wide hero band
    // would need heavy cropping. Fall back to any image if there aren't
    // enough wide ones available.
    var wide = wallpapers.filter(function (w) {
      return w.image && w.image.length > 5 && w.device === "Desktop";
    });
    var candidates = wide.length >= 5
      ? wide
      : wallpapers.filter(function (w) { return w.image && w.image.length > 5; });

    if (candidates.length >= 3) {
      var ranked = candidates.slice().sort(function (a, b) {
        return (b.downloads || 0) - (a.downloads || 0);
      });
      heroSlider.slides = ranked.slice(0, 5).map(function (w) {
        return {
          title: w.title,
          category: w.category || "Wallpaper",
          image: w.image
        };
      });
      heroSlider.currentIndex = 0;
      renderHeroSlides();
    }
  }

  /* =========================================================
     12. NAVBAR, MENU & GLOBAL EVENTS
     ========================================================= */
  function initChrome() {
    var nav = $("#nav");

    var onScroll = function () { if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var burger = $("#hamburger");
    if (burger) {
      burger.addEventListener("click", function () {
        var nLinks = $("#navLinks");
        var open = nLinks ? nLinks.classList.toggle("is-open") : false;
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
    }

    // Initialize automatic hero image slider
    initHeroSlider();

    var stat = $("#statCount");
    if (stat) stat.textContent = WALLPAPERS.length;

    var clearFavs = $("#clearFavs");
    if (clearFavs) {
      clearFavs.addEventListener("click", function () {
        favorites = [];
        store.set(FAV_KEY, favorites);
        $$(".card__fav").forEach(function (b) { b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false"); });
        updateFavBadge();
        renderFavorites();
        toast("Favourites cleared");
      });
    }

    document.addEventListener("click", function (e) {
      var favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        var added = toggleFav(Number(favBtn.dataset.fav));
        toast(added ? "Saved to favourites" : "Removed from favourites");
        return;
      }

      var dlBtn = e.target.closest("[data-download]");
      if (dlBtn) {
        e.preventDefault();
        e.stopPropagation();
        download(Number(dlBtn.dataset.download));
        return;
      }

      var catLink = e.target.closest("[data-cat]");
      if (catLink) {
        var cat = catLink.dataset.cat;
        go("wallpapers");
        if (allFilters && !selectFilter(allFilters.bar, cat)) {
          $$(".chip", allFilters.bar).forEach(function (c) {
            c.classList.remove("is-active");
            c.setAttribute("aria-selected", "false");
          });
          allFilters.apply(cat);
        }
        return;
      }

      var routeLink = e.target.closest("[data-route]");
      if (routeLink) return;

      var card = e.target.closest("[data-open]");
      if (card) openModal(Number(card.dataset.open));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var card = e.target.closest(".card[data-open]");
      if (!card) return;
      e.preventDefault();
      openModal(Number(card.dataset.open));
    });

    window.addEventListener("hashchange", routeFromHash);
  }


  function getPublicApiBase() {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.protocol === "file:") {
      return "http://127.0.0.1:8000";
    }
    if (window.location.port === "3000" || window.location.port === "8000") {
      return "";
    }
    if (window.location.pathname.includes("/Ronviana/") || window.location.pathname.includes("/ronviana/")) {
      return window.location.pathname.includes("/Ronviana/") ? "/Ronviana" : "/ronviana";
    }
    return "";
  }

  /* =========================================================
     13. BOOT & API SYNC
     ========================================================= */
  async function syncFromApi() {
    try {
      var apiBase = getPublicApiBase();

      // 1. Fetch Categories
      try {
        var catRes = await fetch(apiBase + "/api/public/categories");
        if (catRes.ok) {
          var catData = await catRes.json();
          var catList = catData.categories || catData;
          if (Array.isArray(catList) && catList.length > 0) {
            CATEGORIES = catList.map(function (c) {
              return typeof c === 'object' ? (c.name || c.title) : c;
            });
            FILTERS = ["All"].concat(CATEGORIES);
          }
        }
      } catch (catErr) {
        console.error("Categories fetch error:", catErr);
      }

      // 2. Fetch Wallpapers
      try {
        var res = await fetch(apiBase + "/api/public/wallpapers?limit=100");
        if (res.ok) {
          var data = await res.json();
          var wallList = data.wallpapers || data || [];

          if (Array.isArray(wallList)) {
            WALLPAPERS = wallList.map(function (w) {
              var thumbUrl = w.thumbnail_url || w.image_url || '';
              var imgUrl = w.image_url || w.thumbnail_url || '';

              return {
                id: w.id,
                title: w.title,
                category: w.category_name || "General",
                device: w.device || "Universal",
                resolution: w.resolution || "HD",
                type: w.file_type || "JPG",
                downloads: w.downloads || 0,
                likes: w.favorites || 0,
                isNew: Boolean(w.is_new),
                isPopular: Boolean(w.is_popular),
                thumb: (thumbUrl.startsWith('http') || thumbUrl.startsWith('/')) ? thumbUrl : (apiBase + '/' + thumbUrl),
                image: (imgUrl.startsWith('http') || imgUrl.startsWith('/')) ? imgUrl : (apiBase + '/' + imgUrl),
                ratio: w.device === "Mobile" ? "9 / 16" : "16 / 10"
              };
            });
          }
        }
      } catch (wallErr) {
        console.error("Wallpapers fetch error:", wallErr);
      }

      // 3. Re-build UI Elements with Live Data
      buildFilterBar("#filters", "#featuredGrid", "#featuredEmpty", 12);
      allFilters = buildFilterBar("#filtersAll", "#allGrid", "#allEmpty");

      var popular = WALLPAPERS.filter(function (w) { return w.isPopular; })
                              .sort(function (a, b) { return b.downloads - a.downloads; });
      var fresh   = WALLPAPERS.filter(function (w) { return w.isNew; });

      renderInto("#popularRail", popular.slice(0, 8), { stats: true });
      renderInto("#popularGrid", popular, { stats: true });
      renderInto("#newRail", fresh.slice(0, 8));
      renderInto("#newGrid", fresh);

      renderCategories();

      // Update hero slider with live synced wallpapers if available
      updateHeroSliderFromWallpapers(WALLPAPERS);

      var stat = $("#statCount");
      if (stat) stat.textContent = WALLPAPERS.length;

    } catch (e) {
      console.error("Failed to sync from API:", e);
    }
  }

  /* =========================================================
     13. CONTACT FORM (frontend-only — hands off to WhatsApp)
     ========================================================= */
  function initContactForm() {
    var form = $("#contactForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (form.name.value || "").trim();
      var email = (form.email.value || "").trim();
      var message = (form.message.value || "").trim();

      if (!name || !email || !message) {
        toast("Please fill in your name, email and message.");
        return;
      }

      var text = "Hello RONVIANA, my name is " + name + " (" + email + ").\n" + message;
      var url = "https://wa.me/94769819082?text=" + encodeURIComponent(text);

      window.open(url, "_blank", "noopener");
      toast("Opening WhatsApp with your message…");
    });
  }

  function init() {
    initTheme();
    updateFavBadge();

    buildFilterBar("#filters", "#featuredGrid", "#featuredEmpty", 12);
    allFilters = buildFilterBar("#filtersAll", "#allGrid", "#allEmpty");

    var popular = WALLPAPERS.filter(function (w) { return w.isPopular; })
                            .sort(function (a, b) { return b.downloads - a.downloads; });
    var fresh   = WALLPAPERS.filter(function (w) { return w.isNew; });

    renderInto("#popularRail", popular.slice(0, 8), { stats: true });
    renderInto("#popularGrid", popular, { stats: true });
    renderInto("#newRail", fresh.slice(0, 8));
    renderInto("#newGrid", fresh);

    renderCategories();
    initSearch();
    initModal();
    initChrome();
    initContactForm();

    routeFromHash();

    // Live API Hydration
    syncFromApi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();