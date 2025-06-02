"use strict";

/**
 * Represents a health check group with monitoring data
 * @typedef {Object} PulseDetailResultGroup
 * @property {string} group - The category or provider name of the health check group
 * @property {string} name - The specific name or identifier of the health check endpoint
 * @property {Array<PulseDetailResult>} items - Collection of health check results
 */

/**
 * Represents a single health check result
 * @typedef {Object} PulseDetailResult
 * @property {string} state - The status of the health check (e.g., "Healthy", "Degraded", "Unhealthy", "TimedOut")
 * @property {number} timestamp - unix time in seconds
 * @property {number} elapsedMilliseconds - The response time in milliseconds
 */

/**
 * Represents a single health check result
 * @typedef {Object} UptimeResult
 * @property {number} Healthy
 * @property {number} Degraded
 * @property {number} Unhealthy
 * @property {number} TimedOut
 * @property {number} Unknown
 */

/**
 * Represents the DOM elements we use
 * @typedef {Object} DetailDomElements
 * @property {HTMLElement|null} spinner - The spinner element for loading state.
 * @property {HTMLElement|null} chart - The chart element displaying data.
 * @property {HTMLElement|null} header - The header element of the detail card.
 * @property {HTMLElement|null} healthBar - The health bar element.
 * @property {HTMLElement|null} healthBarMd - The medium-sized health bar element.
 * @property {HTMLElement|null} uptime - The element displaying uptime information.
 * @property {HTMLElement|null} since - The element displaying the "since" timestamp.
 * @property {HTMLElement|null} averageResponse - The element displaying average response time.
 * @property {HTMLElement|null} errorRate - The element displaying the error rate.
 * @property {HTMLElement|null} timeOutRate - The element displaying the timeout rate.
 * @property {HTMLElement|null} volatility - The element displaying the volitality.
 * @property {HTMLElement|null} badge - The badge element.
 * @property {HTMLElement|null} decimationSelect - The dropdown for chart decimation options.
 * @property {HTMLElement|null} percentileSelect - The dropdown for chart percentile options.
 * @property {HTMLElement|null} fromSelect - The dropdown for selecting the start date/time.
 * @property {HTMLElement|null} toSelect - The dropdown for selecting the end date/time.
 */

(async function () {
  /** @type {Chart|null} */
  let detailCardChart = null;

  /** @type {Function|null} */
  let renderChartListener = null;

  /** @type {string|null} */
  let currentSqid = null;

  /** @type {string[]} */
  let overlaySqids = [];

  /** @type {AbortController|null} */
  let fetchAbortController;

  /**
   * Handles changes to the query parameters in the URL.
   * If the "details" query parameter is present, it updates the currentSqid and refreshes the data.
   * It also shows or hides the detail card container based on the presence of the "details" query parameter.
   */
  function handleQueryParamChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const sqid = urlParams.get("details");
    const overlays = urlParams.getAll("overlay");

    const detailCardContainer = document.querySelector(
      "#detail-card-container"
    );
    const detailCardPlaceholder = document.querySelector(
      "#pulse-detail-placeholder"
    );

    function showElement(el, show) {
      if (!el) return;
      el.classList.toggle("d-none", !show);
    }

    if (sqid) {
      const overlaysKey = JSON.stringify([...overlays].sort());
      if (currentSqid !== sqid || overlaySqids !== overlaysKey) {
        currentSqid = sqid;
        overlaySqids = overlaysKey;
        refreshData(sqid, overlays);
      }
      showElement(detailCardContainer, true);
      showElement(detailCardPlaceholder, false);
    } else {
      showElement(detailCardContainer, false);
      showElement(detailCardPlaceholder, true);
    }
  }

  window.addEventListener("popstate", handleQueryParamChange);
  window.addEventListener("pushstate", handleQueryParamChange);
  window.addEventListener("replacestate", handleQueryParamChange);

  // Initial call to handle the current query param value
  handleQueryParamChange();

  /**
   * Retrieves DOM elements used in the detail card view.
   *
   * @returns {DetailDomElements} An object containing references to various DOM elements used in the detail card view.
   */
  function getDetailCardElements() {
    return {
      spinner: document.querySelector("#detail-card-spinner"),
      chart: document.querySelector("#detail-card-chart"),
      header: document.querySelector("#detail-card-header"),
      healthBar: document.querySelector("#detail-card-healthbar"),
      healthBarMd: document.querySelector("#detail-card-healthbar-md"),
      uptime: document.querySelector("#detail-card-uptime"),
      since: document.querySelector("#detail-card-since"),
      averageResponse: document.querySelector("#detail-card-average-response"),
      errorRate: document.querySelector("#detail-card-error-rate"),
      timeOutRate: document.querySelector("#detail-card-timeout-rate"),
      volatility: document.querySelector("#detail-card-volatility"),
      badge: document.querySelector("#detail-card-badge"),
      decimationSelect: document.querySelector("#detail-card-chart-decimation"),
      percentileSelect: document.querySelector("#detail-card-chart-percentile"),
      fromSelect: document.querySelector("#detail-card-chart-from"),
      toSelect: document.querySelector("#detail-card-chart-to"),
      heatmap: document.querySelector("#detail-card-heatmap"),
    };
  }

  (function () {
    const { fromSelect, toSelect } = getDetailCardElements();

    [
      { id: "detail-card-filter-1", days: 1 },
      { id: "detail-card-filter-7", days: 7 },
      { id: "detail-card-filter-14", days: 14 },
      { id: "detail-card-filter-30", days: 30 },
      { id: "detail-card-filter-90", days: 90 },
      { id: "detail-card-filter-all", days: null },
    ].forEach(({ id, days }) => {
      const button = document.getElementById(id);
      if (!button) {
        console.error(`Error getting button with id ${id}`);
        return;
      }

      button.addEventListener("click", () => {
        if (days) {
          const toDate = new Date();
          const fromDate = new Date(toDate);

          fromDate.setDate(toDate.getDate() - days);
          toDate.setHours(23, 59 - toDate.getTimezoneOffset(), 59, 0);

          if (days !== 1) {
            fromDate.setHours(0, 0, 0, 0);
          }

          fromDate.setMinutes(
            fromDate.getMinutes() - fromDate.getTimezoneOffset()
          );

          const urlParams = new URLSearchParams(window.location.search);

          if (fromSelect) {
            fromSelect.value = fromDate.toISOString().slice(0, 16);
            urlParams.set("from", fromSelect.value);
          } else {
            urlParams.delete("from");
          }

          if (toSelect) {
            toSelect.value = toDate.toISOString().slice(0, 16);
            urlParams.set("to", toSelect.value);
          } else {
            urlParams.delete("to");
          }

          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.pushState({}, "", newUrl);
        } else {
          if (fromSelect) {
            fromSelect.value = "";
          }
          if (toSelect) {
            toSelect.value = "";
          }

          const urlParams = new URLSearchParams(window.location.search);
          urlParams.delete("from");
          urlParams.delete("to");
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.pushState({}, "", newUrl);
        }

        if (!!renderChartListener) {
          renderChartListener();
        }
      });
    });
  })();

  /**
   * Fetches pulse details data from the API and handles the response.
   * @param {string} sqid - The unique identifier for the pulse details.
   * @param {string[]} sqidOverlays - The unique identifier for the pulse details used as overlays.
   * @returns {Promise<void>} A promise that resolves when the data has been fetched and handled.
   */
  function refreshData(sqid, sqidOverlays) {
    resetDetails();

    if (fetchAbortController) {
      fetchAbortController.abort(`Starting new request for ${sqid}.`);
    }

    fetchAbortController = new AbortController();

    const uniqueSqidOverlays = new Set(sqidOverlays || []);
    uniqueSqidOverlays.delete(sqid);

    const promises = [sqid, ...uniqueSqidOverlays].map((id) =>
      fetch(`api/1.0/pulses/details/${id}`, {
        method: "get",
        signal: fetchAbortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              "Network response was not ok " + response.statusText
            );
          }
          /** @type {PulseDetailResultGroup} */
          const data = response.json();
          return data;
        })
        .catch((error) => {
          // if (error && error.name === "AbortError") {
          //   //console.debug("Fetch aborted");
          // } else {
          //   console.error(
          //     "There has been a problem with your fetch operation:",
          //     error
          //   );
          // }

          return null;
        })
    );

    Promise.all(promises)
      .then(([data, ...overlays]) => {
        if (!data) {
          let toast = {
            header: "PulseGuard",
            headerSmall: "",
            closeButton: true,
            closeButtonLabel: "close",
            closeButtonClass: "",
            animation: true,
            delay: 5000,
            position: "bottom-0 end-0",
            direction: "append",
            ariaLive: "assertive",
          };

          toast.header = "❌ PulseGuard";
          toast.body = "Failed to resolve details for the selected pulse.";
          toast.toastClass = "toast-danger";
          bootstrap.showToast(toast);

          resetDetails(false);
          return;
        }

        const overlayData = (overlays || []).filter((o) => o !== null);
        handleData(data, overlayData);
      })
      .finally(() => {
        fetchAbortController = null;
      });
  }

  /**
   * Destroys the existing chart instance if it exists.
   * This function ensures that the `detailCardChart` is properly destroyed
   * and its reference is set to `null` to free up resources.
   */
  function destroyChart() {
    if (detailCardChart) {
      detailCardChart.destroy();
      detailCardChart = null;
    }
  }

  /**
   * Resets the details card by destroying the chart, showing the spinner,
   * and resetting the content of various elements to their default states.
   */
  function resetDetails(spinning = true) {
    destroyChart();

    const detailCardElements = getDetailCardElements();

    toggleSpinner(detailCardElements.spinner, spinning);
    toggleElementVisibility(detailCardElements.chart, false);
    resetTextContent(detailCardElements.header, "...");
    resetTextContent(detailCardElements.uptime, "...");
    resetTextContent(detailCardElements.errorRate, "...");
    resetTextContent(detailCardElements.timeOutRate, "...");
    resetTextContent(detailCardElements.since, "...");
    resetTextContent(detailCardElements.averageResponse, "...");
    resetTextContent(detailCardElements.volatility, "...");
    resetInnerHTML(detailCardElements.healthBar);
    resetInnerHTML(detailCardElements.healthBarMd);
    resetBadge(detailCardElements.badge);
  }

  /**
   * Handles the data by sorting, formatting, and displaying it.
   * @param {PulseDetailResultGroup} data - The data to handle.
   * @param {PulseDetailResultGroup[]} overlays - The data to handle.
   */
  function handleData(data, overlays) {
    destroyChart();

    const detailCardElements = getDetailCardElements();

    resetTextContent(
      detailCardElements.header,
      !!data.group ? `${data.group} > ${data.name}` : data.name
    );

    const updateChart = function () {
      if (detailCardChart) {
        detailCardChart.destroy();
        detailCardChart = null;
      }

      const filteredData = filterDataByDateRange(
        data.items,
        detailCardElements.fromSelect,
        detailCardElements.toSelect
      );

      const newDecimation = detailCardElements.decimationSelect
        ? parseInt(detailCardElements.decimationSelect.value, 10)
        : 15;

      const newPercentile = detailCardElements.percentileSelect
        ? parseInt(detailCardElements.percentileSelect.value, 10)
        : 0;

      const timeMap = createTimeMap(filteredData);
      const overlayTimeMaps = overlays.map((o) => {
        const group = data.group === o.group ? "" : o.group;
        return {
          graphLabel: !!group ? `${group} > ${o.name}` : o.name,
          map: createTimeMap(
            filterDataByDateRange(
              o.items,
              detailCardElements.fromSelect,
              detailCardElements.toSelect
            )
          ),
        };
      });

      const minTimestamp = Math.min(...timeMap.keys());
      const maxTimestamp = Math.max(...timeMap.keys());

      detailCardChart = renderChart(
        newDecimation,
        newPercentile,
        [
          {
            graphLabel: "Response times (ms)",
            map: timeMap,
          },
          ...overlayTimeMaps,
        ],
        minTimestamp,
        maxTimestamp
      );

      updateHealthBars(
        detailCardElements.healthBar,
        detailCardElements.healthBarMd,
        timeMap,
        minTimestamp,
        maxTimestamp
      );

      const uptimes = calculateUptimes(filteredData);
      updateUptime(detailCardElements, uptimes, minTimestamp, filteredData);
    };

    renderChartListener = updateChart;
    updateChart();

    setBadge(detailCardElements.badge, data.items);
    renderHeatMap(detailCardElements.heatmap, data.items);

    toggleSpinner(detailCardElements.spinner, false);
    toggleElementVisibility(detailCardElements.chart, true);
  }

  /**
   * Renders a GitHub-style heatmap visualization into the specified container using the provided data.
   *
   * @param {HTMLElement} heatmapContainer - The DOM element where the heatmap will be rendered.
   * @param {Array<PulseDetailResult>} data - Array of data points
   *
   * @description
   * - Groups data by day and computes state statistics for each day.
   * - Displays a 52-week heatmap (weeks as columns, days as rows, Monday as first day).
   * - Colors cells based on state and intensity.
   * - Shows tooltips with detailed stats on hover.
   * - Allows clicking a cell to update date range selectors and URL parameters.
   * - Uses Bootstrap tooltips for interactivity.
   */
  function renderHeatMap(heatmapContainer, data) {
    heatmapContainer.innerHTML = "";

    // Group data by day
    const dayBuckets = {};
    data.forEach((item) => {
      const date = new Date(item.timestamp * 1000);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dayBuckets[dayKey]) dayBuckets[dayKey] = [];
      dayBuckets[dayKey].push(item);
    });

    // Get the range of days (last 52 weeks, like GitHub), weeks start on Monday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the most recent Monday (today if today is Monday)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMonday);

    // Start date is 52 weeks ago, on a Monday
    const startDate = new Date(lastMonday);
    startDate.setDate(lastMonday.getDate() - 7 * 52 + 1);

    const days = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Build a 2D array: columns = weeks, rows = days (Mon-Sun)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Combined function to determine state and stats for a day
    function getDayStateAndStats(items) {
      if (!items || items.length === 0) {
        return { state: "Unknown", stats: "No data", intensity: 1 };
      }

      // Fast single-pass: count states and sum elapsedMilliseconds
      const counts = {
        Healthy: 0,
        Degraded: 0,
        Unhealthy: 0,
        TimedOut: 0,
        Unknown: 0,
      };
      let sum = 0;
      for (const x of items) {
        counts[x.state] = (counts[x.state] || 0) + 1;
        sum += x.elapsedMilliseconds || 0;
      }
      const total = items.length;

      let state = "Degraded";
      let intensity = 0.5;
      const timedOutPct = (counts["TimedOut"] || 0) / total;
      const unhealthyPct = (counts["Unhealthy"] || 0) / total;
      const healthyPct = (counts["Healthy"] || 0) / total;
      if (unhealthyPct >= timedOutPct && unhealthyPct >= 0.02) {
        state = "Unhealthy";
        intensity = 0.33 + 0.67 * ((unhealthyPct - 0.02) / 0.13);
      } else if (timedOutPct >= 0.02) {
        state = "TimedOut";
        intensity = 0.33 + 0.67 * ((timedOutPct - 0.02) / 0.13);
      } else if (healthyPct >= 0.98) {
        state = "Healthy";
        intensity = 0.33 + 0.67 * ((healthyPct - 0.98) / 0.02);
      } else {
        intensity = 0.33 + 0.67 * ((counts[state] || 0) / total);
      }

      intensity = Math.max(0.33, Math.min(1, intensity));

      // Build stats string
      const lines = [];
      for (const s of [
        "Healthy",
        "Degraded",
        "Unhealthy",
        "TimedOut",
        "Unknown",
      ]) {
        if (counts[s]) {
          lines.push(
            `${s}: ${counts[s]} (${((counts[s] / total) * 100).toFixed(2)}%)`
          );
        }
      }
      lines.push(`Avg: ${total ? (sum / total).toFixed(2) : "?"}ms`);

      return {
        state,
        stats: lines.join("<br>"),
        intensity,
      };
    }
    // Canvas dimensions and layout
    const weekCount = weeks.length;
    const dayCount = 7;
    const cellSize = 12;
    const cellGap = 2;
    const cellRadius = 5;
    const leftAxisWidth = 36;
    const topAxisHeight = 18;
    const font = "10px sans-serif";
    const canvasWidth =
      leftAxisWidth + weekCount * (cellSize + cellGap) + cellGap;
    const canvasHeight =
      topAxisHeight + dayCount * (cellSize + cellGap) + cellGap;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.background = "transparent";
    canvas.style.display = "block";
    canvas.style.cursor = "pointer";
    heatmapContainer.appendChild(canvas);

    // Precompute cell info for hit detection
    const cellInfo = [];

    // Draw
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Y axis (days)
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#888";
    for (let d = 0; d < dayCount; d++) {
      // Use a reference Monday to get the day name
      const refDate = new Date(2025, 0, 6 + d); // 2025-01-06 is a Monday
      ctx.fillText(
        refDate.toLocaleDateString(undefined, { weekday: "short" }),
        leftAxisWidth - 6,
        topAxisHeight + d * (cellSize + cellGap) + cellSize / 2
      );
    }
    ctx.restore();

    // Draw X axis (months)
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#888";
    let lastMonth = null;
    for (let w = 0; w < weekCount; w++) {
      const week = weeks[w];
      if (!week[0]) continue;
      const month = week[0].getMonth();
      if (month !== lastMonth) {
        ctx.fillText(
          week[0].toLocaleDateString(undefined, { month: "short" }),
          leftAxisWidth + w * (cellSize + cellGap) + cellSize,
          2
        );
        lastMonth = month;
      }
    }
    ctx.restore();

    const computedStyle = getComputedStyle(document.body);
    const strokeStyle =
      computedStyle.getPropertyValue("--bs-secondary-border-subtle").trim() ||
      "#dee2e6";

    // Draw cells
    for (let w = 0; w < weekCount; w++) {
      const week = weeks[w];
      for (let d = 0; d < dayCount; d++) {
        const day = week[d];
        if (!day) continue;
        const dayKey = day.toISOString().slice(0, 10);
        const { state, stats, intensity } = getDayStateAndStats(
          dayBuckets[dayKey]
        );
        const x = leftAxisWidth + w * (cellSize + cellGap) + cellGap;
        const y = topAxisHeight + d * (cellSize + cellGap) + cellGap;

        // Color
        // Use -rgb CSS variables for color, fallback to hardcoded if not available
        // Map state to CSS variable and fallback RGB
        const stateColorVars = {
          Healthy: ["--bs-success-rgb", "25,135,84"],
          Degraded: ["--bs-warning-rgb", "255,193,7"],
          Unhealthy: ["--bs-danger-rgb", "220,53,69"],
          TimedOut: ["--bs-pink-rgb", "214,51,132"],
          Unknown: ["--bs-secondary-rgb", "167,172,177"],
        };
        const [cssVar, fallback] =
          stateColorVars[state] || stateColorVars.Unknown;
        const rgb =
          computedStyle.getPropertyValue(cssVar).replaceAll(/\s+/g, "") ||
          fallback;
        const color = `rgba(${rgb},${intensity})`;

        // Adjust size to account for 1px border inside the cell
        const borderWidth = 1;
        const innerSize = cellSize - borderWidth;
        const innerRadius = Math.max(0, cellRadius - borderWidth / 2);
        const offset = borderWidth / 2;

        // Draw rounded rect with border
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + offset + innerRadius, y + offset);
        ctx.lineTo(x + offset + innerSize - innerRadius, y + offset);
        ctx.quadraticCurveTo(
          x + offset + innerSize,
          y + offset,
          x + offset + innerSize,
          y + offset + innerRadius
        );
        ctx.lineTo(
          x + offset + innerSize,
          y + offset + innerSize - innerRadius
        );
        ctx.quadraticCurveTo(
          x + offset + innerSize,
          y + offset + innerSize,
          x + offset + innerSize - innerRadius,
          y + offset + innerSize
        );
        ctx.lineTo(x + offset + innerRadius, y + offset + innerSize);
        ctx.quadraticCurveTo(
          x + offset,
          y + offset + innerSize,
          x + offset,
          y + offset + innerSize - innerRadius
        );
        ctx.lineTo(x + offset, y + offset + innerRadius);
        ctx.quadraticCurveTo(
          x + offset,
          y + offset,
          x + offset + innerRadius,
          y + offset
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.setLineDash([]); // solid
        ctx.stroke();
        ctx.restore();

        // Store for hit detection
        cellInfo.push({
          x,
          y,
          w: cellSize,
          h: cellSize,
          dayKey,
          state,
          stats,
          week: w,
          day: d,
        });
      }
    }

    const tooltipDiv = document.createElement("div");
    tooltipDiv.className = "heatmap-tooltip";
    tooltipDiv.setAttribute("data-bs-toggle", "tooltip");
    tooltipDiv.setAttribute("data-bs-html", "true");
    tooltipDiv.setAttribute("data-bs-delay", '{"show": 250,"hide": 500}');
    tooltipDiv.setAttribute("data-bs-title", "Heatmap");
    heatmapContainer.appendChild(tooltipDiv);

    const tooltip = bootstrap.Tooltip.getOrCreateInstance(tooltipDiv);

    let lastCellFound = null;
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const cell of cellInfo) {
        if (
          mouseX >= cell.x &&
          mouseX <= cell.x + cell.w &&
          mouseY >= cell.y &&
          mouseY <= cell.y + cell.h
        ) {
          found = cell;
          break;
        }
      }

      if (found && lastCellFound != found) {
        const content = `<strong>${found.dayKey}: ${found.state}</strong><br>${found.stats}`;

        tooltipDiv.setAttribute("data-bs-title", content);
        tooltipDiv.setAttribute("data-pulse-day", found.dayKey);

        const parentRect = heatmapContainer.getBoundingClientRect();

        const x =
          rect.left -
          parentRect.left +
          found.x +
          found.w / 2 -
          tooltipDiv.offsetWidth / 2;

        const y =
          rect.top -
          parentRect.top +
          found.y +
          found.h -
          tooltipDiv.offsetHeight;

        tooltipDiv.style.left = `${x}px`;
        tooltipDiv.style.top = `${Math.max(y, 0)}px`;

        lastCellFound = found;

        tooltip.setContent({ ".tooltip-inner": content });
        tooltip.update();
      }
    });

    tooltipDiv.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const currentDayKey = tooltipDiv.getAttribute("data-pulse-day");
      if (!currentDayKey) return;
      const { fromSelect, toSelect, decimationSelect } =
        getDetailCardElements();
      const fromIso = `${currentDayKey}T00:00`;
      const toIsoStr = `${currentDayKey}T23:59`;

      if (fromSelect) fromSelect.value = fromIso;
      if (toSelect) toSelect.value = toIsoStr;
      if (decimationSelect) decimationSelect.value = "5";

      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("from", fromIso);
      urlParams.set("to", toIsoStr);
      urlParams.set("decimation", "5");
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}?${urlParams}`
      );

      if (renderChartListener) {
        renderChartListener();
      }
    });

    // Also observe theme changes in the current window (for Bootstrap 5 theme toggler)
    const html = document.documentElement;
    if (window._pulseguardHeatmapMutationObserver) {
      window._pulseguardHeatmapMutationObserver.disconnect();
    }
    window._pulseguardHeatmapMutationObserver = new MutationObserver(
      (mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-bs-theme"
          ) {
            renderHeatMap(heatmapContainer, data);
          }
        }
      }
    );
    window._pulseguardHeatmapMutationObserver.observe(html, {
      attributes: true,
    });
  }

  /**
   * Toggles the visibility of a spinner element by adding or removing the "d-none" class.
   *
   * @param {HTMLElement} spinner - The spinner element to show or hide.
   * @param {boolean} show - A boolean indicating whether to show (true) or hide (false) the spinner.
   */
  function toggleSpinner(spinner, show) {
    if (spinner) {
      spinner.classList.toggle("d-none", !show);
    } else {
      console.error("Error getting spinner element");
    }
  }

  /**
   * Toggles the visibility of a given HTML element by adding or removing the "d-none" class.
   *
   * @param {HTMLElement} element - The HTML element whose visibility is to be toggled.
   * @param {boolean} visible - A boolean indicating whether the element should be visible (true) or hidden (false).
   */
  function toggleElementVisibility(element, visible) {
    if (element) {
      element.classList.toggle("d-none", !visible);
    } else {
      console.error("Error getting element");
    }
  }

  /**
   * Resets the text content of a given DOM element.
   *
   * @param {HTMLElement} element - The DOM element whose text content will be reset.
   * @param {string} text - The new text content to set for the element.
   */
  function resetTextContent(element, text) {
    if (element) {
      element.textContent = text;
    } else {
      console.error("Error resetting text content");
    }
  }

  /**
   * Resets the innerHTML of the specified DOM element to an empty string.
   *
   * @param {HTMLElement} element - The DOM element whose innerHTML will be reset.
   *                                If null or undefined, an error will be logged to the console.
   */
  function resetInnerHTML(element) {
    if (element) {
      element.innerHTML = "";
    } else {
      console.error("Error resetting inner HTML");
    }
  }

  /**
   * Resets the content and visibility of a badge element.
   *
   * @param {HTMLElement} badge - The badge element to reset. If null or undefined, an error is logged to the console.
   */
  function resetBadge(badge) {
    if (badge) {
      badge.textContent = "";
      badge.className = "d-none";
    } else {
      console.error("Error resetting badge");
    }
  }

  /**
   * Filters an array of items based on a date range specified by two HTML select elements.
   *
   * @param {Array<PulseDetailResult>} items - The array of items to filter. Each item is expected to have a `timestamp` property.
   * @param {HTMLSelectElement} fromSelect - The HTML select element representing the start date of the range.
   *                                         Its `value` should be a valid date string.
   * @param {HTMLSelectElement} toSelect - The HTML select element representing the end date of the range.
   *                                       Its `value` should be a valid date string.
   * @returns {Array<PulseDetailResult>} The filtered array of items that fall within the specified date range.
   */
  function filterDataByDateRange(items, fromSelect, toSelect) {
    const from = fromSelect?.value ? Date.parse(fromSelect.value) / 1000 : null;
    const to = toSelect?.value ? Date.parse(toSelect.value) / 1000 : null;

    if (from === null && to === null) {
      return items;
    }

    return items.filter(
      (item) =>
        (from === null || item.timestamp >= from) &&
        (to === null || item.timestamp <= to)
    );
  }

  /**
   * Creates a Map where the keys are timestamps (rounded to the nearest minute)
   * and the values are the corresponding items from the input array.
   *
   * @param {Array<PulseDetailResult>} items - An array of objects, each containing a `timestamp` property.
   * @returns {Map<number, PulseDetailResult>} A Map with keys as rounded timestamps (in milliseconds since epoch)
   * and values as the corresponding items.
   */
  function createTimeMap(items) {
    const timeMap = new Map();
    items.forEach((item) => {
      const itemTime = new Date(item.timestamp * 1000);
      itemTime.setSeconds(0, 0);
      timeMap.set(itemTime.getTime(), item);
    });
    return timeMap;
  }

  /**
   * Updates the content of the health bars by clearing their current content
   * and appending newly created health bar elements based on the provided parameters.
   *
   * @param {HTMLElement} healthBar - The HTML element representing the primary health bar.
   * @param {HTMLElement} healthBarMd - The HTML element representing the medium health bar.
   * @param {Map<number, PulseDetailResult>} timeMap - A mapping of time-related data used to create the health bars.
   * @param {number} minTimestamp - The minimum timestamp value for the health bar range.
   * @param {number} maxTimestamp - The maximum timestamp value for the health bar range.
   */
  function updateHealthBars(
    healthBar,
    healthBarMd,
    timeMap,
    minTimestamp,
    maxTimestamp
  ) {
    if (healthBar) {
      healthBar.innerHTML = "";
      healthBar.appendChild(
        createHealthBar(144, timeMap, minTimestamp, maxTimestamp)
      );
    } else {
      console.error("Error updating health bar");
    }

    if (healthBarMd) {
      healthBarMd.innerHTML = "";
      healthBarMd.appendChild(
        createHealthBar(72, timeMap, minTimestamp, maxTimestamp)
      );
    } else {
      console.error("Error updating medium health bar");
    }
  }

  /**
   * Updates the UI elements with uptime, error rate, average response time, and the earliest timestamp.
   *
   * @param {DetailDomElements} elements - The DOM elements to update.
   * @param {UptimeResult} uptimes - An object containing uptime percentages.
   * @param {number} uptimes.Healthy - The percentage of healthy uptime.
   * @param {number} uptimes.Unhealthy - The percentage of unhealthy uptime (error rate).
   * @param {number} uptimes.TimedOut - The percentage of timeouts.
   * @param {number} minTimestamp - The earliest timestamp in milliseconds.
   * @param {Array<PulseDetailResult>} filteredData - The filtered data used to calculate the average response time.
   */
  function updateUptime(elements, uptimes, minTimestamp, filteredData) {
    const formatPercentage = (value) =>
      !isNaN(value) ? `${value.toFixed(2)}%` : "0.00%";

    resetTextContent(elements.uptime, formatPercentage(uptimes.Healthy));
    resetTextContent(elements.errorRate, formatPercentage(uptimes.Unhealthy));
    resetTextContent(elements.timeOutRate, formatPercentage(uptimes.TimedOut));

    resetTextContent(
      elements.since,
      minTimestamp && !isNaN(minTimestamp)
        ? new Date(minTimestamp).toLocaleString()
        : "..."
    );

    const responseTime = calculateAverageResponseTime(filteredData);
    resetTextContent(
      elements.averageResponse,
      !isNaN(responseTime) ? `${responseTime.toFixed(2)}ms` : "..."
    );

    const volatility = calculateVolatility(filteredData);
    resetTextContent(elements.volatility, formatPercentage(volatility));
  }

  /**
   * Calculates the volatility of state changes in the provided data.
   * Volatility is determined as the percentage of state changes relative to the total number of states.
   *
   * @param {Array<PulseDetailResult>} filteredData - An array of objects, each containing a `state` property.
   * @returns {number} The volatility percentage, representing the frequency of state changes.
   */
  function calculateVolatility(filteredData) {
    const states = filteredData.map((item) => item.state);
    const stateChanges = states.reduce((count, state, index, array) => {
      if (index > 0 && state !== array[index - 1]) {
        count++;
      }
      return count;
    }, 0);

    return (stateChanges / states.length) * 100;
  }

  /**
   * Sets up event listeners for chart-related elements and updates the chart when changes occur.
   */
  (function setupChartListeners() {
    const elements = getDetailCardElements();
    const selectElements = [
      { select: elements.decimationSelect, id: "decimation" },
      { select: elements.percentileSelect, id: "percentile" },
      { select: elements.fromSelect, id: "from" },
      { select: elements.toSelect, id: "to" },
    ];

    selectElements.forEach((item) => {
      const select = item.select;
      if (select) {
        select.removeAttribute("disabled");
        // Set initial state based on URL query params
        const urlParams = new URLSearchParams(window.location.search);

        const id = item.id;
        if (urlParams.has(id)) {
          select.value = urlParams.get(id);
        }

        select.addEventListener("change", () => {
          const urlParams = new URLSearchParams(window.location.search);

          if (!!select.value) {
            urlParams.set(id, select.value);
          } else {
            urlParams.delete(id);
          }

          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.pushState({}, "", newUrl);
          if (renderChartListener) {
            renderChartListener();
          }
        });
      } else {
        console.error("Could not find " + item.id);
      }
    });
  })();

  /**
   * Updates the badge element with the state of the last item in the provided list.
   *
   * @param {HTMLElement|null} badge - The badge element to update.
   * @param {Array<PulseDetailResult>} items - An array of items where each item contains a `state` property.
   */
  function setBadge(badge, items) {
    if (badge) {
      const state = items[items.length - 1].state;
      badge.textContent = state.replace(/([a-z])([A-Z])/g, "$1 $2");
      badge.className = `badge my-auto mx-2 ${getBadgeColor(state)}`;
    } else {
      console.error("Error getting detail-card-badge");
    }
  }

  /**
   * Determines the appropriate badge color class based on the given state.
   *
   * @param {string} state - The state of the item (e.g., "Healthy", "Degraded", "Unhealthy", "TimedOut").
   * @returns {string} - The corresponding CSS class for the badge color.
   */
  function getBadgeColor(state) {
    switch (state) {
      case "Healthy":
        return "text-bg-success";
      case "Degraded":
        return "text-bg-warning";
      case "Unhealthy":
        return "text-bg-danger";
      case "TimedOut":
        return "text-bg-pink";
      default:
        return "text-bg-secondary";
    }
  }

  /**
   * Renders a line chart using Chart.js with the provided data and configuration.
   *
   * @param {boolean} decimation - Indicates whether data decimation is enabled.
   * @param {number} percentile - The percentile value used for data processing.
   * @param {{graphLabel:string, map:Array<Map<number, PulseDetailResult>>}[]} timeMaps - An array of time map objects containing data points.
   * @param {number} minTimestamp - The minimum timestamp for the chart's x-axis.
   * @param {number} maxTimestamp - The maximum timestamp for the chart's x-axis.
   * @returns {Chart} A Chart.js instance representing the rendered chart.
   */
  function renderChart(
    decimation,
    percentile,
    timeMaps,
    minTimestamp,
    maxTimestamp
  ) {
    const interval = 60000;

    const labels = [];
    for (let time = minTimestamp; time <= maxTimestamp; time += interval) {
      labels.push(new Date(time));
    }

    const datasets = timeMaps.map((timeMap, index) =>
      generateDataSet(
        interval,
        decimation,
        labels,
        timeMap.map,
        percentile,
        index,
        timeMap.graphLabel,
        timeMaps.length > 1
      )
    );

    const ctx = document.getElementById("detail-card-chart").getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              unit: getTimeUnit(maxTimestamp, minTimestamp),
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
  }

  /**
   * Determines the appropriate time unit based on the difference between two timestamps.
   *
   * @param {number} maxTimestamp - The maximum timestamp in milliseconds.
   * @param {number} minTimestamp - The minimum timestamp in milliseconds.
   * @returns {string} The time unit as a string: "minute" if the difference is less than or equal to 1 hour,
   *                   "hour" if the difference is less than or equal to 1 day, or "day" otherwise.
   */
  function getTimeUnit(maxTimestamp, minTimestamp) {
    const timeDiff = maxTimestamp - minTimestamp;

    if (timeDiff <= 3600000) {
      // less than or equal to 1 hour
      return "minute";
    }

    if (timeDiff <= 86400000) {
      // less than or equal to 1 day
      return "hour";
    }

    return "day";
  }

  /**
   * Generates a dataset for a graph based on provided timestamps, state mappings, and other parameters.
   *
   * @param {number} interval - The interval between data points in milliseconds.
   * @param {number} decimation - The decimation factor to reduce the number of data points.
   * @param {Date[]} timestamps - An array of timestamps representing the data points.
   * @param {Map<number, PulseDetailResult>} timeMap - A map of timestamp values to their corresponding elapsed time and state.
   * @param {number} percentile - The percentile to calculate for the response times in each bucket.
   * @param {number} graphIndex - The index of the graph for determining its color.
   * @param {string} graphLabel - The label to use for the graph dataset
   * @param {boolean} multiDataset - Whether the dataset is part of a multi-dataset graph.
   * @returns {Object} A dataset object formatted for use in a charting library, including calculated response times, states, and styling information.
   */
  function generateDataSet(
    interval,
    decimation,
    timestamps,
    timeMap,
    percentile,
    graphIndex,
    graphLabel,
    multiDataset
  ) {
    const timestampDecimation = interval * decimation;
    const buckets = [];
    let currentBucket = null;

    const healthStates = [
      "Healthy",
      "Degraded",
      "Unhealthy",
      "TimedOut",
      "Unknown",
    ];

    for (const timestamp of timestamps) {
      const time = timestamp.getTime();
      const item = timeMap.get(time);

      const [elapsedMilliseconds, state] = item
        ? [item.elapsedMilliseconds, item.state]
        : [NaN, "Unknown"];

      if (
        decimation === 1 ||
        !currentBucket ||
        ((!percentile ||
          [state, currentBucket.state].indexOf("Unknown") >= 0) &&
          state !== currentBucket.state) ||
        time - currentBucket.timestamps[0] >= timestampDecimation
      ) {
        if (currentBucket) {
          buckets.push(currentBucket);

          if (
            (decimation > 1 ||
              [state, currentBucket.state].indexOf("Unknown") >= 0) &&
            state !== currentBucket.state &&
            currentBucket.items.length > 1
          ) {
            const lastItem = timeMap.get(time - interval);
            if (lastItem) {
              buckets.push({
                timestamps: [new Date(time - interval)],
                state: lastItem.state,
                items: [lastItem.elapsedMilliseconds],
              });
            }
          }
        }

        currentBucket = {
          timestamps: [timestamp],
          state: state,
          items: [elapsedMilliseconds],
        };
      } else {
        currentBucket.timestamps.push(timestamp);
        currentBucket.items.push(elapsedMilliseconds);

        const worstStateIndex = Math.max(
          healthStates.indexOf(state),
          healthStates.indexOf(currentBucket.state)
        );

        if (worstStateIndex !== -1) {
          currentBucket.state = healthStates[worstStateIndex];
        }
      }
    }

    if (currentBucket) {
      buckets.push(currentBucket);
    }

    const skipped = (ctx, value) =>
      ctx.p0.skip || ctx.p1.skip ? value : undefined;

    const healthColor = (ctx) => getStateColor(ctx.p0.raw.state, false) + "80";

    const graphColor = getGraphColor(graphIndex);
    const dataset = {
      label: graphLabel,
      data: buckets.map((x) => {
        const centerTimestamp =
          x.timestamps.length === 1
            ? x.timestamps[0]
            : new Date(
                (x.timestamps[0].getTime() +
                  x.timestamps[x.timestamps.length - 1].getTime()) /
                  2
              );

        centerTimestamp.setSeconds(0, 0);

        return {
          x: centerTimestamp,
          y: calculatePercentile(x.items, percentile),
          state: x.state,
        };
      }),
      borderColor: graphColor,
      backgroundColor: "rgba(75, 192, 192, 0.2)",
      fill: false,
      tension: 0.2,
      pointBackgroundColor: buckets.map((x) => getStateColor(x.state, true)),
      pointBorderColor: graphColor,
      segment: {
        borderDash: (ctx) => skipped(ctx, [6, 6]),
        borderColor: multiDataset
          ? undefined
          : (ctx) =>
              skipped(ctx, getStateColor("Unknown", false)) || healthColor(ctx),
      },
      spanGaps: true,
    };

    return dataset;
  }
  /**
   * Generates a color based on the given index.
   * The function cycles through a predefined array of colors.
   *
   * @param {number} index - The index used to select a color from the array.
   * @returns {string} A color in the format rgb(r, g, b).
   */
  function getGraphColor(index) {
    switch (index) {
      case 0:
        return "rgb(75, 192, 192)"; // Teal
      case 1:
        return "rgb(54, 163, 235)"; // Blue
      case 2:
        return "rgb(153, 102, 255)"; // Purple
      case 3:
        return "rgb(102, 204, 255)"; // Light Blue
      case 4:
        return "rgb(0, 128, 128)"; // Dark Teal
      case 5:
        return "rgb(0, 102, 204)"; // Medium Blue
      case 6:
        return "rgb(51, 153, 255)"; // Sky Blue
      case 7:
        return "rgb(102, 153, 204)"; // Steel Blue
      case 8:
        return "rgb(0, 153, 153)"; // Aqua
      case 9:
        return "rgb(51, 102, 153)"; // Slate Blue
      case 10:
        return "rgb(0, 76, 153)"; // Navy Blue
      case 11:
        return "rgb(102, 178, 255)"; // Light Sky Blue
      case 12:
        return "rgb(0, 102, 102)"; // Deep Aqua
      case 13:
        return "rgb(51, 153, 204)"; // Cerulean
      case 14:
        return "rgb(0, 51, 102)"; // Midnight Blue
      case 15:
        return "rgb(102, 204, 255)"; // Pale Blue
      default:
        return "rgb(128, 128, 128)"; // Default to Gray for all the rest
    }
  }

  /**
   * Calculates the Xth percentile (PX) of an array of timings.
   *
   * @param {Array<number>} values - An array of timing values.
   * @param {number} percentile - The PX value to calculate.
   * @returns {number} The PX value from the sorted array of latencies.
   */
  function calculatePercentile(values, percentile) {
    if (values.length === 1) {
      return values[0];
    }

    if (!percentile) {
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    values.sort((a, b) => a - b);

    if (percentile === 100) {
      return values[values.length - 1];
    }

    const index = Math.max(
      0,
      Math.ceil((percentile / 100) * values.length) - 1
    );
    return values[index];
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
   * Calculates the uptime and error rate percentages based on the given items.
   *
   * @param {Array<PulseDetailResult>} items - An array of items to check. Each item should have a `state` property.
   * @returns {UptimeResult} An object containing the uptime and error rate percentages.
   */
  function calculateUptimes(items) {
    const totalChecks = items.length;
    const stateCounts = items.reduce((counts, item) => {
      counts[item.state] = (counts[item.state] || 0) + 1;
      return counts;
    }, {});

    const percentages = {};
    for (const [state, count] of Object.entries(stateCounts)) {
      percentages[state] = (count / totalChecks) * 100;
    }

    return percentages;
  }

  /**
   * Calculates the average response time based on the provided items.
   *
   * @param {Array<PulseDetailResult>} items - An array of objects representing the checks.
   * @returns {number} The average response time calculated as the sum of all response times divided by the number of items.
   */
  function calculateAverageResponseTime(items) {
    const totalResponseTime = items.reduce(
      (acc, item) => acc + (item.elapsedMilliseconds || 0),
      0
    );
    const averageResponseTime = totalResponseTime / items.length;
    return averageResponseTime;
  }

  /**
   * Creates a health bar element representing the health status over time.
   *
   * @param {number} bucketCount - The number of buckets to divide the time range into.
   * @param {Array<PulseDetailResult>} timeMap - An array of objects representing the time and state of each pulse.
   * @param {number} minTimestamp - The minimum timestamp of the time range.
   * @param {number} maxTimestamp - The maximum timestamp of the time range.
   * @returns {HTMLDivElement} The health bar element.
   */
  function createHealthBar(bucketCount, timeMap, minTimestamp, maxTimestamp) {
    const healthBar = document.createElement("div");
    healthBar.className =
      "healthbar d-flex flex-row border rounded p-1 gap-1 bg-body-secondary m-auto";

    if (timeMap.length === 0) {
      return healthBar;
    }

    const totalHours = (maxTimestamp - minTimestamp) / (1000 * 60 * 60);
    const bucketSize = totalHours / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      start: new Date(minTimestamp + i * bucketSize * 60 * 60 * 1000),
      end: new Date(minTimestamp + (i + 1) * bucketSize * 60 * 60 * 1000),
      state: "Unknown",
    }));

    const healthStates = ["Healthy", "Degraded", "Unhealthy", "TimedOut"];
    timeMap.forEach((pulse, time) => {
      buckets.forEach((bucket) => {
        if (time >= bucket.start.getTime() && time < bucket.end.getTime()) {
          const worstStateIndex = Math.max(
            healthStates.indexOf(pulse.state),
            healthStates.indexOf(bucket.state)
          );

          if (worstStateIndex !== -1) {
            bucket.state = healthStates[worstStateIndex];
          }
        }
      });
    });

    buckets.forEach((bucket) => {
      const bucketDiv = document.createElement("div");
      bucketDiv.className = "rounded";
      bucketDiv.setAttribute("data-bs-toggle", "tooltip");
      const startDate = bucket.start.toLocaleDateString();
      const startTime = bucket.start.toLocaleTimeString();
      const endDate = bucket.end.toLocaleDateString();
      const endTime = bucket.end.toLocaleTimeString();
      const tooltipText =
        startDate === endDate
          ? `${startDate} ${startTime} - ${endTime}`
          : `${startDate} ${startTime} - ${endDate} ${endTime}`;
      bucketDiv.setAttribute("data-bs-title", tooltipText);
      new bootstrap.Tooltip(bucketDiv);

      if (bucket.state === "Healthy") {
        bucketDiv.classList.add("text-bg-success");
      } else if (bucket.state === "Degraded") {
        bucketDiv.classList.add("text-bg-warning");
      } else if (bucket.state === "Unhealthy") {
        bucketDiv.classList.add("text-bg-danger");
      } else if (bucket.state === "TimedOut") {
        bucketDiv.classList.add("text-bg-pink");
      } else {
        bucketDiv.classList.add("text-bg-secondary");
      }

      healthBar.appendChild(bucketDiv);
    });

    return healthBar;
  }
})();
