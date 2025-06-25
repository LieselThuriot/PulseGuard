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

  function openPulseSocket() {
    if (hasSocketConnection()) {
      console.warn("WebSocket is already open or connecting.");
      return;
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

    socket = new WebSocket("ws");

    socket.addEventListener("message", function (event) {
      try {
        /** @type {PulseEventInfo} */
        const pulseEvent = JSON.parse(event.data);
        handlePulseEvent(pulseEvent);
      } catch (e) {
        console.error("Invalid JSON received:", event.data);
      }
    });

    socket.addEventListener("open", function () {
      console.log("WebSocket connection opened.");
    });

    socket.addEventListener("close", function () {
      console.log("WebSocket connection closed.");
    });

    socket.addEventListener("error", function (error) {
      console.error("WebSocket error:", error);
    });
  }

  function closePulseSocket() {
    if (hasSocketConnection()) {
      socket.close();
      console.log("WebSocket connection closing...");
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
    const colors = [
      "rgb(75, 192, 192)", // Teal
      "rgb(54, 163, 235)", // Blue
      "rgb(153, 102, 255)", // Purple
      "rgb(102, 204, 255)", // Light Blue
      "rgb(0, 128, 128)", // Dark Teal
      "rgb(0, 102, 204)", // Medium Blue
      "rgb(51, 153, 255)", // Sky Blue
      "rgb(102, 153, 204)", // Steel Blue
      "rgb(0, 153, 153)", // Aqua
      "rgb(51, 102, 153)", // Slate Blue
      "rgb(0, 76, 153)", // Navy Blue
      "rgb(102, 178, 255)", // Light Sky Blue
      "rgb(0, 102, 102)", // Deep Aqua
      "rgb(51, 153, 204)", // Cerulean
      "rgb(0, 51, 102)", // Midnight Blue
      "rgb(102, 204, 255)", // Pale Blue
      "rgb(128, 255, 255)", // Light Cyan
      "rgb(72, 191, 227)", // Medium Sky Blue
      "rgb(176, 196, 222)", // Light Steel Blue
      "rgb(70, 130, 180)", // Steel Blue Variant
      "rgb(95, 158, 160)", // Cadet Blue
      "rgb(135, 206, 235)", // Sky Blue Light
      "rgb(30, 144, 255)", // Dodger Blue
      "rgb(65, 105, 225)", // Royal Blue
      "rgb(100, 149, 237)", // Cornflower Blue
      "rgb(123, 104, 238)", // Medium Slate Blue
      "rgb(147, 112, 219)", // Medium Purple
      "rgb(138, 43, 226)", // Blue Violet
      "rgb(72, 61, 139)", // Dark Slate Blue
      "rgb(106, 90, 205)", // Slate Blue Light
      "rgb(25, 25, 112)", // Midnight Blue Dark
      "rgb(0, 191, 255)", // Deep Sky Blue
      "rgb(135, 206, 250)", // Light Sky Blue Variant
      "rgb(176, 224, 230)", // Powder Blue
      "rgb(173, 216, 230)", // Light Blue Variant
      "rgb(240, 248, 255)", // Alice Blue
      "rgb(64, 224, 208)", // Turquoise
      "rgb(72, 209, 204)", // Medium Turquoise
      "rgb(32, 178, 170)", // Light Sea Green
      "rgb(95, 158, 160)", // Cadet Blue Variant
      "rgb(20, 150, 170)", // Teal Blue
      "rgb(80, 200, 220)", // Light Turquoise
      "rgb(40, 120, 140)", // Deep Teal
      "rgb(90, 180, 200)", // Soft Blue
      "rgb(110, 160, 180)", // Grayish Blue
      "rgb(50, 140, 160)", // Ocean Blue
      "rgb(120, 190, 210)", // Pale Turquoise
      "rgb(30, 110, 130)", // Dark Cyan
      "rgb(85, 170, 190)", // Medium Aqua
      "rgb(55, 155, 175)", // Steel Cyan
      "rgb(75, 145, 165)", // Blue Gray
      "rgb(186, 85, 211)", // Medium Orchid
      "rgb(221, 160, 221)", // Plum
      "rgb(238, 130, 238)", // Violet
      "rgb(218, 112, 214)", // Orchid
      "rgb(199, 21, 133)", // Medium Violet Red
      "rgb(148, 0, 211)", // Dark Violet
      "rgb(139, 69, 19)", // Saddle Brown
      "rgb(160, 82, 45)", // Sienna
      "rgb(210, 180, 140)", // Tan
      "rgb(222, 184, 135)", // Burlywood
    ];

    if (index < colors.length) {
      return colors[index];
    }

    return "rgb(128, 128, 128)"; // Default to Gray for indices beyond the array
  }

  /**
   * Handles incoming pulse event data.
   *
   * @param {PulseEventInfo} data - The data associated with the pulse event.
   */
  function handlePulseEvent(data) {
    const eventType = !!data.group ? `${data.group} > ${data.name}` : data.name;
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
        segment: {
          borderColor: (ctx) => getStateColor(ctx.p0.raw.state, false) + "80",
        },
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

  const livePulseViewClose = document.getElementById("live-pulse-view-close");
  if (livePulseViewClose) {
    livePulseViewClose.addEventListener("click", function () {
      closePulseSocket();
    });
  } else {
    console.warn("Live pulse view close button not found.");
  }
})();
