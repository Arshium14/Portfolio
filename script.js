(function () {
  "use strict";

  var taskbar = document.getElementById("taskbar");
  var tasklist = document.getElementById("tasklist");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function syncTaskbar() {
    taskbar.hidden = tasklist.children.length === 0;
  }

  document.querySelectorAll(".window").forEach(function (win) {
    var controls = win.querySelectorAll(".ctrl");
    var minBtn = controls[0];
    var maxBtn = controls[1];
    var closeBtn = controls[2];

    minBtn.addEventListener("click", function () {
      var collapsed = win.classList.toggle("is-min");
      minBtn.setAttribute("aria-expanded", String(!collapsed));
    });

    maxBtn.addEventListener("click", function () {
      var maxed = win.classList.toggle("is-max");
      maxBtn.setAttribute("aria-pressed", String(maxed));
    });

    closeBtn.addEventListener("click", function () {
      win.hidden = true;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "task-chip";
      chip.textContent = win.dataset.title;
      chip.setAttribute("aria-label", "Restore " + win.dataset.title + " window");
      chip.addEventListener("click", function () {
        win.hidden = false;
        chip.remove();
        syncTaskbar();
        win.scrollIntoView({
          behavior: reduceMotion.matches ? "auto" : "smooth",
          block: "start"
        });
      });
      tasklist.appendChild(chip);
      syncTaskbar();
    });
  });

  var copyBtn = document.querySelector("[data-copy]");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var handle = copyBtn.dataset.copy;
      var original = copyBtn.dataset.label || copyBtn.textContent;
      copyBtn.dataset.label = original;

      function flash() {
        copyBtn.textContent = "copied!";
        window.setTimeout(function () {
          copyBtn.textContent = original;
        }, 1200);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(handle).then(flash, flash);
      } else {
        flash();
      }
    });
  }

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("contact-name").value.trim();
      var subject = document.getElementById("contact-subject").value.trim();
      var body = document.getElementById("contact-body").value.trim();
      var fullBody = name ? name + "\n\n" + body : body;
      window.location.href =
        "mailto:arshium01@gmail.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(fullBody);
    });
  }

  var heatGrid = document.querySelector("[data-heat-grid]");
  if (heatGrid) {
    var heatTotal = document.querySelector("[data-heat-total]");
    var heatMonths = document.querySelector("[data-heat-months]");
    var HEAT_USER = "arshium14";
    var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    function renderHeat(data) {
      var days = data.contributions;
      var weeks = [];
      var i;
      for (i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      var labels = [];
      weeks.forEach(function (week) {
        var month = new Date(week[0].date + "T00:00:00").getMonth();
        var last = labels[labels.length - 1];
        if (last && last.month === month) {
          last.weeks += 1;
        } else {
          labels.push({ month: month, weeks: 1 });
        }
      });

      labels.forEach(function (label) {
        var span = document.createElement("span");
        span.className = "heat-month";
        span.textContent = MONTHS[label.month];
        span.style.flex = "0 0 calc(var(--heat-col) * " + label.weeks + " - var(--heat-gap))";
        if (label.weeks < 2) {
          span.style.visibility = "hidden";
        }
        heatMonths.appendChild(span);
      });

      weeks.forEach(function (week) {
        var col = document.createElement("div");
        col.className = "heat-week";
        for (var d = 0; d < 7; d += 1) {
          var cell = document.createElement("span");
          if (week[d]) {
            cell.className = "heat-cell lv" + week[d].level;
            cell.title = week[d].count + (week[d].count === 1 ? " commit on " : " commits on ") + week[d].date;
          } else {
            cell.className = "heat-cell blank";
          }
          col.appendChild(cell);
        }
        heatGrid.appendChild(col);
      });

      heatTotal.textContent = data.total.lastYear + " contributions in the last year";
    }

      fetch("https://github-contributions-api.jogruber.de/v4/" + HEAT_USER + "?y=last")
        .then(function (res) {
          if (!res.ok) {
            throw new Error("contributions api: http " + res.status);
          }
          return res.json();
        })
        .then(renderHeat)
        .catch(function () {
          heatGrid.classList.add("heat-error");
          heatGrid.textContent = "heatmap offline — see github.com/" + HEAT_USER + " for the live grid";
          heatTotal.textContent = "";
        });
    }
  })();
