(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animated = typeof window.gsap !== "undefined" && !reduce;
  if (animated) gsap.defaults({ ease: "power2.out" });

  /* 1. 顶部滚动进度条 + 光斑视差 */
  var bar = document.getElementById("scroll-bar");
  var par = document.querySelectorAll(".fx-parallax");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(1, y / h) * 100 : 0) + "%";
    }
    if (!reduce && par.length) {
      var p = Math.min(1, y / 900);
      par[0].style.transform = "translate3d(0," + (p * 90) + "px,0)";
      par[1] && (par[1].style.transform = "translate3d(0," + (p * -70) + "px,0)");
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* 2. 时间线竖线随进入绘制 */
  var tl = document.getElementById("tl-line");
  if (tl) {
    if (!reduce && "IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { tl.classList.add("drawn"); tio.disconnect(); }
      }, { threshold: 0.05 });
      tio.observe(tl.parentElement || tl);
    } else {
      tl.classList.add("drawn");
    }
  }

  /* 3. Hero 粒子网络 */
  (function particles() {
    var cv = document.getElementById("fx-particles");
    if (!cv || reduce || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, pts = [], R = 132;
    function resize() {
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(72, Math.max(26, Math.round(W * H / 26000)));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .24, vy: (Math.random() - .5) * .24
      });
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    }
    // ponytail: O(n²) 两两连线，n≤72 够用；点多了换空间网格
    (function draw() {
      if (visible && W > 0) {
        ctx.clearRect(0, 0, W, H);
        var i, j, a, b, dx, dy, d2;
        for (i = 0; i < pts.length; i++) {
          a = pts[i]; a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
        for (i = 0; i < pts.length; i++) {
          for (j = i + 1; j < pts.length; j++) {
            a = pts[i]; b = pts[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              ctx.strokeStyle = "rgba(255,255,255," + ((1 - Math.sqrt(d2) / R) * .22).toFixed(3) + ")";
              ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
        for (i = 0; i < pts.length; i++) {
          ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.4, 0, 6.2832);
          ctx.fillStyle = "rgba(125,211,232,.45)"; ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    })();
  })();

  /* 信息栏光晕：鼠标位置写入 --mx/--my，供 CSS 径向光晕使用（纯 CSS 变量，不依赖 GSAP） */
  document.querySelectorAll(".stack-cell, .stat-num").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
    });
  });

  /* 11. 导航栏水滴照片框：掉落 → 停留 5s → 折叠收起（留三角形展开按钮） */
  (function photoDrop() {
    var drop = document.getElementById("photo-drop");
    var toggle = document.getElementById("photo-drop-toggle");
    if (!drop || !toggle) return;
    /* 移动端照片框被 CSS 隐藏（桌面导航项不显示，无锚点可依附），跳过位置计算与动画 */
    if (window.matchMedia("(max-width: 767px)").matches) return;
    var header = document.getElementById("main-header");

    /* 滚动时导航栏会缩高（main.js 切 pt-12 → py-4），top 需跟着走 */
    var lastTop = "";
    function syncTop() {
      var h = header ? header.offsetHeight : 0;
      var top = (h > 20 ? h + 10 : 96) + "px";
      if (top === lastTop) return;
      lastTop = top;
      drop.style.top = top;
      toggle.style.top = top;
    }

    /* 落在「团队」与「联系我」之间；窄屏或元素隐藏时回落到页面居中 */
    function place() {
      syncTop();
      var team = document.querySelector('#main-nav a[href="#why-us"]');
      var cta = document.querySelector('#main-nav > a[href="#contact"]');
      var mid = null;
      if (team && cta && team.offsetParent !== null && cta.offsetParent !== null) {
        mid = (team.getBoundingClientRect().right + cta.getBoundingClientRect().left) / 2;
      }
      drop.style.left = mid === null ? "50%" : mid + "px";
      drop.style.marginLeft = -(drop.offsetWidth / 2) + "px";
      toggle.style.left = mid === null ? "50%" : mid + "px";
      toggle.style.marginLeft = -(toggle.offsetWidth / 2) + "px";
    }
    place();
    window.addEventListener("resize", place, { passive: true });
    window.addEventListener("scroll", syncTop, { passive: true });

    var closeBtn = drop.querySelector(".photo-drop__close");
    var timer;
    function fold() {
      clearTimeout(timer);
      drop.setAttribute("aria-hidden", "true");
      if (animated) {
        gsap.to(drop, { y: -170, opacity: 0, duration: 0.6, ease: "power3.in",
          onComplete: function () { drop.classList.remove("is-open"); toggle.classList.add("is-shown"); } });
      } else {
        drop.classList.remove("is-open");
        toggle.classList.add("is-shown");
      }
    }
    function open() {
      clearTimeout(timer);
      toggle.classList.remove("is-shown");
      drop.removeAttribute("aria-hidden");
      drop.classList.add("is-open");
      if (animated) {
        gsap.fromTo(drop, { y: -170, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "back.out(1.45)" });
      }
      timer = setTimeout(fold, 5000);
    }
    if (closeBtn) closeBtn.addEventListener("click", fold);
    toggle.addEventListener("click", open);
    setTimeout(open, 1400);
  })();

  if (!animated) return;

  /* 4. Hero 标题逐字解码（等 Hero 淡入后再启动，避免被父级 opacity 动画遮住） */
  var dec = document.querySelector("[data-decode]");
  if (dec) setTimeout(function () {
    var finalText = dec.getAttribute("data-decode") || dec.textContent;
    var glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789#$%&*+=<>";
    var dur = 1.15, t0 = performance.now(), n = finalText.length;
    (function frame(now) {
      var p = Math.min(1, (now - t0) / (dur * 1000)), out = "";
      for (var i = 0; i < n; i++) {
        var lock = (i / n) * 0.62 + 0.34;
        out += (p >= lock) ? finalText[i] : (p >= lock - 0.34 ? glyphs[(Math.random() * glyphs.length) | 0] : " ");
      }
      dec.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else dec.textContent = finalText;
    })(t0);
  }, 480);

  /* 5. 数字滚动（HTML 内已写最终值，JS 可用时才归零做动画） */
  if ("IntersectionObserver" in window) {
    var fmt = function (el, v) {
      var s = el.getAttribute("data-suffix") || "", u = el.getAttribute("data-unit") || "";
      return Math.round(v) +
        (s ? '<span class="u">' + s + "</span>" : "") +
        (u ? '<span class="u">' + u + "</span>" : "");
    };
    var counters = document.querySelectorAll("[data-count]");
    counters.forEach(function (el) { el.innerHTML = fmt(el, 0); });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, end = parseFloat(el.getAttribute("data-count")) || 0;
        var o = { v: 0 };
        gsap.to(o, { v: end, duration: 1.4, onUpdate: function () { el.innerHTML = fmt(el, o.v); } });
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* 6. 入场动效：GSAP 接管 [data-animate]，替代模板的 CSS transition */
  var revealEls = [];
  document.querySelectorAll("[data-animate]").forEach(function (el) {
    el.style.transition = "none";
    revealEls.push(el);
  });
  document.querySelectorAll("[data-stagger]:not([data-animate])").forEach(function (el) {
    revealEls.push(el);
  });
  revealEls.forEach(function (el) {
    gsap.set(el, { opacity: 0 });
    if (el.hasAttribute("data-stagger")) gsap.set(el.children, { opacity: 0 });
  });
  if ("IntersectionObserver" in window) {
    var aio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        aio.unobserve(e.target);
        var el = e.target;
        var delay = (parseInt(el.getAttribute("data-delay") || "0", 10)) * 0.09;
        if (!el.hasAttribute("data-stagger")) {
          gsap.fromTo(el, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, delay: delay });
        } else {
          /* 容器自己也被 gsap.set 归零过，必须还原，否则只有 data-stagger 的块会永久隐形 */
          gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.7, delay: delay });
          gsap.fromTo(el.children, { y: 14, opacity: 0, scale: 0.97 },
            { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, delay: delay + 0.12, ease: "back.out(1.6)" });
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { aio.observe(el); });
  }

  /* 7. 鼠标聚光 */
  var glow = document.getElementById("fx-cursor");
  if (glow && window.matchMedia("(hover: hover)").matches) {
    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      glow.style.opacity = 1;
      gsap.to(glow, { x: e.clientX, y: e.clientY, duration: 0.55, ease: "power2.out" });
    });
    document.addEventListener("pointerleave", function () { glow.style.opacity = 0; });
  }

  /* 8. 磁吸按钮 */
  document.querySelectorAll("[data-magnetic]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.22, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.4 });
    });
    el.addEventListener("pointerleave", function () { gsap.to(el, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1,0.5)" }); });
  });

  /* 9. 聚光高光 + 3D 倾斜 */
  document.querySelectorAll("[data-spot]").forEach(function (el) {
    var tilt = el.hasAttribute("data-tilt");
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", (px * 100) + "%");
      el.style.setProperty("--my", (py * 100) + "%");
      if (tilt) gsap.to(el, { rotationY: (px - .5) * 7, rotationX: (.5 - py) * 7, y: -6, transformPerspective: 900, duration: 0.5 });
    });
    el.addEventListener("pointerleave", function () {
      if (tilt) gsap.to(el, { rotationX: 0, rotationY: 0, y: 0, duration: 0.6 });
    });
  });

  /* 10. 导航滚动高亮 */
  if ("IntersectionObserver" in window) {
    /* 只接管真正的导航项：Logo 和「联系我」胶囊没有 text-muted-foreground，不该被改色 */
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll('#main-nav a.text-muted-foreground[href^="#"], #mobile-menu a[href^="#"]')
    );
    var seen = {};
    var secs = [];
    navLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec && !seen[id]) { seen[id] = 1; secs.push(sec); }
    });
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("text-foreground", on);
          a.classList.toggle("text-muted-foreground", !on);
        });
      });
    }, { threshold: 0.01, rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(function (s) { nio.observe(s); });
  }
})();