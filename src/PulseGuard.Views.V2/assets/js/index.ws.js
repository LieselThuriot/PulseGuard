"use strict";

/**
 * Represents information about a pulse event.
 *
 * @typedef {Object} PulseEventInfo
 * @property {string} id - The unique identifier of the pulse event.
 * @property {string} group - The group to which the pulse event belongs.
 * @property {string} name - The name of the pulse event.
 * @property {string} state - The current state of the pulse event.
 * @property {Date} creation - The creation timestamp of the pulse event.
 * @property {number} elapsedMilliseconds - The elapsed time in milliseconds since the event was created.
 */

(function () {
  /** @type {WebSocket} */
  let socket;

  /** @type {Chart} */
  let pulseChart;

  function hasSocketConnection() {
    return (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    );
  }

  function openPulseSocket(options) {
    if (hasSocketConnection()) {
      console.warn("WebSocket is already open or connecting.");
      return false;
    }

    if (pulseChart) {
      pulseChart.destroy();
      pulseChart = null;
    }

    const ctx = document
      .getElementById("live-pulse-view-chart")
      .getContext("2d");

    pulseChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              displayFormats: {
                millisecond: "HH:mm:ss.SSS",
                second: "HH:mm:ss",
                minute: "HH:mm",
              },
            },
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            suggestedMin: 0,
            title: {
              display: true,
              text: "Response times (ms)",
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            align: "start",
            title: {
              position: "start",
            },
          },
          tooltip: {
            callbacks: {
              footer: (tooltipItems) => `State: ${tooltipItems[0].raw.state}`,
            },
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                modifierKey: "ctrl",
              },
              drag: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "x",
            },
            pan: {
              enabled: true,
              mode: "x",
              modifierKey: "ctrl",
            },
            limits: {
              x: {
                min: "original",
                max: "original",
              },
            },
          },
        },
      },
    });

    let route = "ws/";

    let prefixWithGroup = true;

    if (!options) {
      options = {};
    } else if (typeof options === "function") {
      options = {
        filter: options,
      };
    } else {
      if (options.group) {
        route += `group/${encodeURIComponent(options.group)}/`;
        prefixWithGroup = false;
      } else if (options.id) {
        route += `application/${encodeURIComponent(options.id)}/`;
        prefixWithGroup = false;
      }
    }

    if (!options.filter) {
      options.filter = function () {
        return true;
      };
    }

    socket = new WebSocket(route);

    socket.addEventListener("message", function (event) {
      try {
        /** @type {PulseEventInfo} */
        const pulseEvent = JSON.parse(event.data);

        if (options.filter(pulseEvent)) {
          handlePulseEvent(pulseEvent, prefixWithGroup);
        }
      } catch (e) {
        console.error("Invalid JSON received:", event.data);
      }
    });

    // socket.addEventListener("open", function () {
    //   console.log("WebSocket connection opened.");
    // });

    // socket.addEventListener("close", function () {
    //   console.log("WebSocket connection closed.");
    // });

    socket.addEventListener("error", function (error) {
      bootstrap.showToast({
        header: "❌ PulseGuard",
        headerSmall: "",
        closeButton: true,
        closeButtonLabel: "close",
        closeButtonClass: "",
        animation: true,
        delay: 5000,
        position: "bottom-0 end-0",
        direction: "append",
        ariaLive: "assertive",
        body: "Live Events: error occurred.",
        toastClass: "toast-danger",
      });

      console.error("WebSocket error:", error);

      // Close the live pulse view offcanvas when an error occurs
      const liveOffcanvas = document.getElementById("live-pulse-view");
      if (liveOffcanvas) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(liveOffcanvas);
        if (bsOffcanvas) {
          bsOffcanvas.hide();
        }
      }
    });

    return true;
  }

  function closePulseSocket() {
    if (hasSocketConnection()) {
      socket.close();
      //console.log("WebSocket connection closing...");
      socket = null;
    }

    if (pulseChart) {
      pulseChart.destroy();
      pulseChart = null;
    }
  }

  /**
   * Returns a color code based on the given state and requested brightness level.
   *
   * @param {string} state - The state for which the color is determined.
   *                         Possible values: "Healthy", "Degraded", "Unhealthy", "TimedOut", or others.
   * @param {boolean} bright - If true, returns a brighter color; otherwise, returns a paler color.
   * @returns {string} The corresponding color code in hexadecimal format.
   */
  function getStateColor(state, bright) {
    switch (state) {
      case "Healthy":
        return bright ? "#198754" : "#75b798";
      case "Degraded":
        return bright ? "#ffc107" : "#ffda6a";
      case "Unhealthy":
        return bright ? "#dc3545" : "#ea868f";
      case "TimedOut":
        return bright ? "#d63384" : "#e685b5";
      default:
        return bright ? "#6c757d" : "#a7acb1";
    }
  }

  /**
   * Generates a color based on the given index.
   * The function cycles through a predefined array of colors.
   *
   * @param {number} index - The index used to select a color from the array.
   * @returns {string} A color in the format rgb(r, g, b).
   */
  function getGraphColor(index) {
    // Use index as seed for consistent colors per dataset
    const seed = index * 2654435761; // Large prime for better distribution

    // Generate random values based on the seed
    const random1 = Math.abs(Math.sin(seed)) * 10000;
    const random2 = Math.abs(Math.sin(seed * 1.1)) * 10000;
    const random3 = Math.abs(Math.sin(seed * 1.3)) * 10000;

    // Focus on blue, teal, and purple hues (180-300 degrees on color wheel)
    const hue = 180 + (random1 % 120); // 180-300 range

    // Ensure good saturation and lightness for visibility
    const saturation = 60 + (random2 % 40); // 60-100%
    const lightness = 40 + (random3 % 30); // 40-70%

    // Convert HSL to RGB
    const c = ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness / 100 - c / 2;

    let r, g, b;
    if (hue < 60) {
      [r, g, b] = [c, x, 0];
    } else if (hue < 120) {
      [r, g, b] = [x, c, 0];
    } else if (hue < 180) {
      [r, g, b] = [0, c, x];
    } else if (hue < 240) {
      [r, g, b] = [0, x, c];
    } else if (hue < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    // Convert to 0-255 range
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Handles incoming pulse event data.
   *
   * @param {PulseEventInfo} data - The data associated with the pulse event.
   * @param {boolean} prefixWithGroup - Whether to prefix the event type with the group name.
   */
  function handlePulseEvent(data, prefixWithGroup) {
    const eventType =
      prefixWithGroup && !!data.group
        ? `${data.group} > ${data.name}`
        : data.name;
    const timestamp = new Date(data.creation);

    // Find or create dataset for this event type
    let dataset = pulseChart.data.datasets.find((ds) => ds.label === eventType);
    if (!dataset) {
      const graphColor = getGraphColor(pulseChart.data.datasets.length);

      dataset = {
        label: eventType,
        data: [],
        borderColor: graphColor,
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        pointBackgroundColor: [],
        pointBorderColor: graphColor,
        fill: false,
        tension: 0.2,
      };

      pulseChart.data.datasets.push(dataset);
    }

    // Add new data point (using elapsed time as y-value for visualization)
    dataset.data.push({
      x: timestamp,
      y: data.elapsedMilliseconds || 1,
      state: data.state,
    });

    dataset.pointBackgroundColor.push(getStateColor(data.state, true));

    // Update chart
    clearTimeout(window.liveChartUpdateTimeout);
    window.liveChartUpdateTimeout = setTimeout(() => {
      pulseChart.update("none");
    }, 100);
  }

  const livePulseViewAction = document.getElementById("live-pulse-view-action");
  if (livePulseViewAction) {
    livePulseViewAction.removeAttribute("disabled");
    livePulseViewAction.addEventListener("click", function () {
      openPulseSocket();
    });
  } else {
    console.warn("Live pulse view action button not found.");
  }

  const detailLivePulseViewAction = document.getElementById(
    "detail-live-pulse-view-action"
  );

  if (detailLivePulseViewAction) {
    detailLivePulseViewAction.removeAttribute("disabled");
    new bootstrap.Tooltip(detailLivePulseViewAction);
    detailLivePulseViewAction.addEventListener("click", function () {
      const urlParams = new URLSearchParams(window.location.search);
      const sqid = urlParams.get("details");
      const sqids = [sqid, ...urlParams.getAll("overlay")];

      if (sqids.length === 1) {
        openPulseSocket({ id: sqid });
      } else {
        openPulseSocket(function (pulseEvent) {
          return sqids.indexOf(pulseEvent.id) !== -1;
        });
      }
    });
  } else {
    console.warn("Detail Live pulse view action button not found.");
  }

  var myOffcanvas = document.getElementById("live-pulse-view");
  if (myOffcanvas) {
    myOffcanvas.addEventListener("hidden.bs.offcanvas", function () {
      closePulseSocket();
    });
  } else {
    console.warn("Live pulse view offcanvas not found.");
  }

  window.addEventListener("pulseTreeLoaded", function () {
    const livePulseButtons = document.querySelectorAll(
      "[data-live-pulse-type]"
    );

    livePulseButtons.forEach((button) => {
      if (!button.classList.contains("d-none")) {
        return; // already initialized
      }

      button.classList.remove("d-none");

      const value = button.getAttribute("data-live-pulses");
      if (!value) {
        console.warn("Live pulse button missing value:", button);
        return;
      }

      const type = button.getAttribute("data-live-pulse-type");

      let openPulseFunction;
      if (type === "group") {
        openPulseFunction = function () {
          return openPulseSocket({ group: value });
        };
      } else if (type === "pulse") {
        openPulseFunction = function () {
          return openPulseSocket({ id: value });
        };
      } else {
        console.warn("Unknown live pulse type:", type);
        return;
      }

      button.setAttribute("data-bs-target", "#live-pulse-view");
      button.setAttribute("data-bs-toggle", "offcanvas");

      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPulseFunction();
      });
    });
  });
})();
