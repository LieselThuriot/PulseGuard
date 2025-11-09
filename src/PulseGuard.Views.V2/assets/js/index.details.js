"use strict";

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
 * @property {HTMLElement|null} heatmapSpinner - The spinner element for loading state.
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
 * @property {HTMLElement|null} heatmap - The heatmap element.
 * @property {HTMLElement|null} detailMetrics - The detail metrics container element.
 * @property {HTMLElement|null} metricsCpuContainer - The CPU metrics container element.
 * @property {HTMLElement|null} metricsCpuSpinner - The spinner element for CPU metrics loading state.
 * @property {HTMLElement|null} metricsCpuChart - The CPU metrics chart element.
 * @property {HTMLElement|null} metricsMemoryContainer - The memory metrics container element.
 * @property {HTMLElement|null} metricsMemorySpinner - The spinner element for memory metrics loading state.
 * @property {HTMLElement|null} metricsMemoryChart - The memory metrics chart element.
 * @property {HTMLElement|null} metricsIoContainer - The IO metrics container element.
 * @property {HTMLElement|null} metricsIoSpinner - The spinner element for IO metrics loading state.
 * @property {HTMLElement|null} metricsIoChart - The IO metrics chart element.
 */

(async function () {
  /**
   * Represents a single deployment
   * @typedef {Object} PulseDeployment
   * @property {string} status
   * @property {string} from - ISO 8601 timestamp
   * @property {string|null} to - ISO 8601 timestamp
   * @property {string|null} author
   * @property {string|null} type
   * @property {string|null} commitId
   * @property {string|null} buildNumber
   */

  /**
   * PulseDetailResult message: Represents a single health check result
   * @typedef {Object} PulseDetailResult
   * @property {string} state
   * @property {number|Long} timestamp
   * @property {number|Long} elapsedMilliseconds
   */
  class PulseDetailResult {
    constructor() {
      this.state = "Unknown";
      this.timestamp = 0;
      this.elapsedMilliseconds = 0;
    }
    static decode(reader, length) {
      if (!(reader instanceof protobuf.Reader))
        reader = protobuf.Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length;
      let message = new PulseDetailResult();
      while (reader.pos < end) {
        let tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            switch (reader.int32()) {
              case 1:
                message.state = "Healthy";
                break;
              case 2:
                message.state = "Degraded";
                break;
              case 3:
                message.state = "Unhealthy";
                break;
              case 4:
                message.state = "TimedOut";
                break;
              default:
                message.state = "Unknown";
                break;
            }
            break;
          case 2:
            message.timestamp = reader.int64();
            break;
          case 3:
            message.elapsedMilliseconds = reader.int64();
            break;
          default:
            reader.skipType(tag & 7);
            break;
        }
      }
      return message;
    }
  }

  /**
   * PulseDetailResultGroup message: Represents a health check group with monitoring data
   * @typedef {Object} PulseDetailResultGroup
   * @property {string} group
   * @property {string} name
   * @property {PulseDetailResult[]} items
   */
  class PulseDetailResultGroup {
    constructor() {
      this.group = "";
      this.name = "";
      this.items = [];
    }
    static decode(reader, length) {
      if (!(reader instanceof protobuf.Reader))
        reader = protobuf.Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length;
      let message = new PulseDetailResultGroup();
      while (reader.pos < end) {
        let tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.group = reader.string();
            break;
          case 2:
            message.name = reader.string();
            break;
          case 3:
            message.items.push(
              PulseDetailResult.decode(reader, reader.uint32())
            );
            break;
          default:
            reader.skipType(tag & 7);
            break;
        }
      }
      return message;
    }
  }

  /**
   * PulseMetricsResult message: Represents metrics snapshot
   * @typedef {Object} PulseMetricsResult
   * @property {number|Long} timestamp
   * @property {number|null} cpu
   * @property {number|null} memory
   * @property {number|null} io
   */
  class PulseMetricsResult {
    constructor() {
      this.timestamp = 0;
      this.cpu = null;
      this.memory = null;
      this.io = null;
    }
    static decode(reader, length) {
      if (!(reader instanceof protobuf.Reader))
        reader = protobuf.Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length;
      let message = new PulseMetricsResult();
      while (reader.pos < end) {
        let tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.timestamp = reader.int64();
            break;
          case 2:
            message.cpu = reader.double();
            break;
          case 3:
            message.memory = reader.double();
            break;
          case 4:
            message.io = reader.double();
            break;
          default:
            reader.skipType(tag & 7);
            break;
        }
      }
      return message;
    }
  }

  /**
   * PulseMetricsResultGroup message: Represents a group of metric details
   * @typedef {Object} PulseMetricsResultGroup
   * @property {PulseMetricsResult[]} items
   */
  class PulseMetricsResultGroup {
    constructor() {
      this.items = [];
    }
    static decode(reader, length) {
      if (!(reader instanceof protobuf.Reader))
        reader = protobuf.Reader.create(reader);
      let end = length === undefined ? reader.len : reader.pos + length;
      let message = new PulseMetricsResultGroup();
      while (reader.pos < end) {
        let tag = reader.uint32();
        switch (tag >>> 3) {
          case 1:
            message.items.push(
              PulseMetricsResult.decode(reader, reader.uint32())
            );
            break;
          default:
            reader.skipType(tag & 7);
            break;
        }
      }
      return message;
    }
  }

  /** @type {Chart|null} */
  let detailCardChart = null;

  /** @type {Chart|null} */
  let detailMetricsCpuChart = null;

  /** @type {Chart|null} */
  let detailMetricsMemoryChart = null;

  /** @type {Chart|null} */
  let detailMetricsIoChart = null;

  /** @type {Function|null} */
  let renderChartListener = null;

  /** @type {string|null} */
  let currentSqid = null;

  /** @type {string[]} */
  let overlaySqids = [];

  /** @type {PulseMetricsResultGroup|null} */
  let currentMetrics = null;

  /** @type {PulseDeployment[]|null} */
  let currentDeployments = null;

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

  handleQueryParamChange();

  /**
   * Retrieves DOM elements used in the detail card view.
   *
   * @returns {DetailDomElements} An object containing references to various DOM elements used in the detail card view.
   */
  function getDetailCardElements() {
    return {
      spinner: document.querySelector("#detail-card-spinner"),
      heatmapSpinner: document.querySelector("#detail-heatmap-spinner"),
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
      detailMetrics: document.querySelector("#detail-metrics"),
      metricsCpuContainer: document.querySelector("#detail-metrics-cpu"),
      metricsCpuSpinner: document.querySelector("#detail-metrics-cpu-spinner"),
      metricsCpuChart: document.querySelector("#detail-metrics-cpu-chart"),
      metricsMemoryContainer: document.querySelector("#detail-metrics-memory"),
      metricsMemorySpinner: document.querySelector(
        "#detail-metrics-memory-spinner"
      ),
      metricsMemoryChart: document.querySelector(
        "#detail-metrics-memory-chart"
      ),
      metricsIoContainer: document.querySelector("#detail-metrics-io"),
      metricsIoSpinner: document.querySelector("#detail-metrics-io-spinner"),
      metricsIoChart: document.querySelector("#detail-metrics-io-chart"),
    };
  }

  (function () {
    const { fromSelect, toSelect } = getDetailCardElements();

    function getRangeForDays(days) {
      const toDate = new Date();
      const fromDate = new Date(toDate);

      if (days < 1) {
        fromDate.setHours(toDate.getHours() - 24 * days);
      } else {
        fromDate.setDate(toDate.getDate() - days);
      }

      toDate.setHours(23, 59 - toDate.getTimezoneOffset(), 59, 0);

      if (days >= 7) {
        fromDate.setHours(0, 0, 0, 0);
      }

      fromDate.setMinutes(fromDate.getMinutes() - fromDate.getTimezoneOffset());

      return {
        fromDate: fromDate.toISOString().slice(0, 16),
        toDate: toDate.toISOString().slice(0, 16),
      };
    }

    {
      const { fromDate, toDate } = getRangeForDays(1);
      fromSelect.value = fromDate;
      toSelect.value = toDate;
    }

    [
      { id: "detail-card-filter-0-5", days: 0.5 },
      { id: "detail-card-filter-1", days: 1 },
      { id: "detail-card-filter-2", days: 2 },
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
          const { fromDate, toDate } = getRangeForDays(days);

          const urlParams = new URLSearchParams(window.location.search);

          if (fromSelect) {
            fromSelect.value = fromDate;
            urlParams.set("from", fromSelect.value);
          } else {
            urlParams.delete("from");
          }

          if (toSelect) {
            toSelect.value = toDate;
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
    const abortSignal = fetchAbortController.signal;

    const uniqueSqidOverlays = new Set(sqidOverlays || []);
    uniqueSqidOverlays.delete(sqid);

    const promises = [sqid, ...uniqueSqidOverlays].map((id) =>
      fetch(`api/1.0/pulses/details/${id}`, {
        method: "get",
        signal: abortSignal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              "Network response was not ok " + response.statusText
            );
          }

          const buffer = await response.arrayBuffer();
          const view = new Uint8Array(buffer);

          /** @type {PulseDetailResultGroup} */
          return PulseDetailResultGroup.decode(view);
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

    const metricsPromise = fetch(`api/1.0/metrics/${sqid}`, {
      method: "get",
      signal: abortSignal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        const buffer = await response.arrayBuffer();
        const view = new Uint8Array(buffer);
        /** @type {PulseMetricsResultGroup} */
        return PulseMetricsResultGroup.decode(view);
      })
      .catch((error) => {
        // Silently ignore aborts; otherwise log minimal info for troubleshooting
        if (!(error && error.name === "AbortError")) {
          // console.warn("Failed to fetch metrics for", sqid, error);
        }
      });

    const deploymentsPromise = fetch(
      `api/1.0/pulses/application/${sqid}/deployments`,
      {
        method: "get",
        signal: abortSignal,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          // Return null if deployments not found (404 is expected when no deployments exist)
          return null;
        }
        return response.json();
      })
      .catch((error) => {
        // Silently ignore aborts and errors
        if (!(error && error.name === "AbortError")) {
          // console.warn("Failed to fetch deployments for", sqid, error);
        }
        return null;
      });

    Promise.all([...promises, metricsPromise, deploymentsPromise])
      .then((results) => {
        /** @type {PulseDetailResultGroup|null} */
        const data = results[0];

        /** @type {PulseMetricsResultGroup|null} */
        const metrics = results[results.length - 2];

        /** @type {{id: string, items: PulseDeployment[]}|null} */
        const deploymentsResponse = results[results.length - 1];

        /** @type {PulseDeployment[]|null} */
        const deployments = deploymentsResponse?.items || null;

        /** @type {PulseDetailResultGroup[]|null} */
        const overlays = results.slice(1, -2);

        if (!data && !abortSignal.aborted) {
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
        handleData(data, overlayData, metrics, deployments);
      })
      .finally(() => {
        fetchAbortController = null;
      });
  }

  /**
   * Destroys all chart instances if they exist.
   * This function ensures that all charts are properly destroyed
   * and their references are set to `null` to free up resources.
   */
  function destroyAllCharts() {
    if (detailCardChart) {
      detailCardChart.destroy();
      detailCardChart = null;
    }

    if (detailMetricsCpuChart) {
      detailMetricsCpuChart.destroy();
      detailMetricsCpuChart = null;
    }

    if (detailMetricsMemoryChart) {
      detailMetricsMemoryChart.destroy();
      detailMetricsMemoryChart = null;
    }

    if (detailMetricsIoChart) {
      detailMetricsIoChart.destroy();
      detailMetricsIoChart = null;
    }
  }

  /**
   * Resets the details card by destroying the chart, showing the spinner,
   * and resetting the content of various elements to their default states.
   */
  function resetDetails(spinning = true) {
    destroyAllCharts();

    currentMetrics = null;
    currentDeployments = null;

    // Reset forecast module if available
    if (window.PulseGuardForecast) {
      window.PulseGuardForecast.reset();
    }

    const detailCardElements = getDetailCardElements();

    toggleSpinner(detailCardElements.spinner, spinning);
    toggleSpinner(detailCardElements.heatmapSpinner, spinning);
    toggleSpinner(detailCardElements.metricsCpuSpinner, spinning);
    toggleSpinner(detailCardElements.metricsMemorySpinner, spinning);
    toggleElementVisibility(detailCardElements.chart, false);
    toggleElementVisibility(detailCardElements.detailMetrics, false);
    resetTextContent(detailCardElements.header, "...");
    resetTextContent(detailCardElements.uptime, "...");
    resetTextContent(detailCardElements.errorRate, "...");
    resetTextContent(detailCardElements.timeOutRate, "...");
    resetTextContent(detailCardElements.since, "...");
    resetTextContent(detailCardElements.averageResponse, "...");
    resetTextContent(detailCardElements.volatility, "...");
    resetInnerHTML(detailCardElements.healthBar);
    resetInnerHTML(detailCardElements.healthBarMd);
    resetInnerHTML(detailCardElements.heatmap);
    resetBadge(detailCardElements.badge);
  }

  /**
   * Handles the data by sorting, formatting, and displaying it.
   * @param {PulseDetailResultGroup} data - The data to handle.
   * @param {PulseDetailResultGroup[]} overlays - The data to handle.
   * @param {PulseMetricsResultGroup | null} metrics - The metrics for the current data.
   * @param {PulseDeployment[] | null} deployments - The deployments for the current data.
   */
  function handleData(data, overlays, metrics, deployments) {
    currentMetrics = metrics;
    currentDeployments = deployments;

    // Pass data to forecast module if available
    if (window.PulseGuardForecast && data.items) {
      window.PulseGuardForecast.setPulseData(data.items);
    }

    const detailCardElements = getDetailCardElements();

    resetTextContent(
      detailCardElements.header,
      !!data.group ? `${data.group} > ${data.name}` : data.name
    );

    const updateChart = function () {
      destroyAllCharts();

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

      function calculateMinMaxTimestamps() {
        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;
        for (const key of timeMap.keys()) {
          if (key < minTimestamp) minTimestamp = key;
          if (key > maxTimestamp) maxTimestamp = key;
        }
        return { minTimestamp, maxTimestamp };
      }

      const { minTimestamp, maxTimestamp } = calculateMinMaxTimestamps();

      // Filter deployments based on the selected date range
      const filteredDeployments = currentDeployments
        ? filterDeploymentsByDateRange(
            currentDeployments,
            detailCardElements.fromSelect,
            detailCardElements.toSelect
          )
        : [];

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
        maxTimestamp,
        filteredDeployments
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

      updateMetricsCharts(
        detailCardElements,
        currentMetrics,
        newDecimation,
        newPercentile
      );
    };

    renderChartListener = updateChart;
    updateChart();

    setBadge(detailCardElements.badge, data.items);
    renderHeatMap(detailCardElements.heatmap, data.items);

    toggleSpinner(detailCardElements.spinner, false);
    toggleSpinner(detailCardElements.heatmapSpinner, false);
    toggleElementVisibility(detailCardElements.chart, true);
  }

  /**
   * Renders a calendar-style heatmap visualization into the specified container element.
   * The heatmap displays daily aggregated states (e.g., Healthy, Degraded, Unhealthy, TimedOut, Unknown)
   * over the past year, grouped by week and day, with color intensity reflecting the proportion of each state.
   * Tooltips and click events allow users to inspect and filter data for specific days.
   *
   * @param {HTMLElement} heatmapContainer - The DOM element where the heatmap will be rendered.
   * @param {Array<PulseDetailResult>} data - Array of PulseDetailResult objects, each representing a measurement or event.
   */
  function renderHeatMap(heatmapContainer, data) {
    heatmapContainer.innerHTML = "";

    // --- Helpers ---
    /**
     * Returns a string representing the given date in UTC, formatted as 'YYYY-MM-DD'.
     *
     * @param {Date} date - The date object to format.
     * @returns {string} The formatted date string in 'YYYY-MM-DD' format (UTC).
     */
    function getDayKey(date) {
      return date.toISOString().slice(0, 10);
    }

    /**
     * Groups an array of data objects by day based on their Unix timestamp.
     *
     * @param {Array<PulseDetailResult>} data - The array of data objects, each containing a `timestamp` property (in seconds).
     * @returns {Object} An object where each key is a day identifier (as returned by `getDayKey(date)`), and the value is an array of data objects for that day.
     */
    function groupDataByDay(data) {
      const buckets = {};
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        date.setUTCFullYear(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        date.setUTCHours(0, 0, 0, 0);
        const key = getDayKey(date);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(item);
      });
      return buckets;
    }

    /**
     * Calculates the date range for a heatmap visualization.
     * The range starts from the Monday 52 weeks before the current week and ends at today (UTC, start of day).
     *
     * @returns {{ startDate: Date, today: Date }} An object containing:
     *   - startDate: The Date object representing the Monday 52 weeks ago (UTC, start of day).
     *   - today: The Date object representing today (UTC, start of day).
     */
    function getHeatmapRange() {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const dayOfWeek = today.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const lastMonday = new Date(today);
      lastMonday.setUTCDate(today.getUTCDate() - daysSinceMonday);
      const startDate = new Date(lastMonday);
      startDate.setUTCDate(lastMonday.getUTCDate() - 7 * 52);
      return { startDate, today };
    }

    /**
     * Generates an array of Date objects representing each day between the given start and end dates (inclusive).
     *
     * @param {Date} startDate - The start date of the range.
     * @param {Date} endDate - The end date of the range.
     * @returns {Date[]} An array of Date objects for each day in the range.
     */
    function buildDaysArray(startDate, endDate) {
      const days = [];
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        days.push(new Date(d));
      }
      return days;
    }

    /**
     * Splits an array of days into an array of weeks, where each week contains up to 7 days.
     *
     * @param {Array} days - The array of day items to be grouped into weeks.
     * @returns {Array<Array>} An array of weeks, each week being an array of up to 7 days.
     */
    function buildWeeks(days) {
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }
      return weeks;
    }

    /**
     * Calculates the overall state, statistics, and intensity for a given array of items representing day states.
     *
     * @param {Array<PulseDetailResult>} items - The array of items, each with a `state` property (one of "Healthy", "Degraded", "Unhealthy", "TimedOut", "Unknown") and an optional `elapsedMilliseconds` property.
     * @returns {PulseDetailResult} A PulseDetailResult
     */
    function getDayStateAndStats(items) {
      if (!items || items.length === 0) {
        return { state: "Unknown", stats: "No data", intensity: 1 };
      }
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
      return { state, stats: lines.join("<br>"), intensity };
    }

    /**
     * Returns the CSS variable name and RGB value associated with a given state.
     *
     * @param {string} state - The state to get the color variables for. Possible values: "Healthy", "Degraded", "Unhealthy", "TimedOut", or any other string for default.
     * @returns {[string, string]} An array where the first element is the CSS variable name (e.g., "--bs-success-rgb") and the second element is the corresponding RGB value as a string (e.g., "25,135,84").
     */
    function getStateColorVars(state) {
      switch (state) {
        case "Healthy":
          return ["--bs-success-rgb", "25,135,84"];
        case "Degraded":
          return ["--bs-warning-rgb", "255,193,7"];
        case "Unhealthy":
          return ["--bs-danger-rgb", "220,53,69"];
        case "TimedOut":
          return ["--bs-pink-rgb", "214,51,132"];
        default:
          return ["--bs-secondary-rgb", "167,172,177"];
      }
    }

    // --- Data Preparation ---
    const dayBuckets = groupDataByDay(data);
    const { startDate, today } = getHeatmapRange();
    const days = buildDaysArray(startDate, today);
    const weeks = buildWeeks(days);

    // --- Canvas Layout ---
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

    // --- Canvas Setup ---
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    Object.assign(canvas.style, {
      width: `${canvasWidth}px`,
      height: `${canvasHeight}px`,
      background: "transparent",
      display: "block",
      cursor: "pointer",
    });
    heatmapContainer.appendChild(canvas);

    // --- Drawing ---
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Y axis (days)
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#888";
    for (let d = 0; d < dayCount; d++) {
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

    // Draw cells and collect hit info
    const cellInfo = {};
    for (let w = 0; w < weekCount; w++) {
      const week = weeks[w];
      cellInfo[w] = {};

      for (let d = 0; d < dayCount; d++) {
        const day = week[d];
        if (!day) continue;
        const dayKey = getDayKey(day);
        const { state, stats, intensity } = getDayStateAndStats(
          dayBuckets[dayKey]
        );
        const x = leftAxisWidth + w * (cellSize + cellGap) + cellGap;
        const y = topAxisHeight + d * (cellSize + cellGap) + cellGap;
        const [cssVar, fallback] = getStateColorVars(state);
        const rgb =
          computedStyle.getPropertyValue(cssVar).replaceAll(/\s+/g, "") ||
          fallback;
        const color = `rgba(${rgb},${intensity})`;
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
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();

        cellInfo[w][d] = {
          x,
          y,
          dayKey,
          state,
          stats,
          week: w,
          day: d,
        };
      }
    }

    // --- Tooltip ---
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

      // Compute which cell (week, day) the mouse is over
      const week = Math.floor((mouseX - leftAxisWidth) / (cellSize + cellGap));
      const day = Math.floor((mouseY - topAxisHeight) / (cellSize + cellGap));

      let found = cellInfo[week] ? cellInfo[week][day] : null;

      // Extra check in case of gaps or missing cells
      if (
        found &&
        (mouseX < found.x ||
          mouseX > found.x + cellSize ||
          mouseY < found.y ||
          mouseY > found.y + cellSize)
      ) {
        found = null;
      }

      if (found && lastCellFound !== found) {
        const content = `<strong>${found.dayKey}: ${found.state}</strong><br>${found.stats}`;
        tooltipDiv.setAttribute("data-bs-title", content);
        tooltipDiv.setAttribute("data-pulse-day", found.dayKey);
        const parentRect = heatmapContainer.getBoundingClientRect();
        const x =
          rect.left -
          parentRect.left +
          found.x +
          cellSize / 2 -
          tooltipDiv.offsetWidth / 2 +
          heatmapContainer.scrollLeft;
        const y =
          rect.top -
          parentRect.top +
          found.y +
          cellSize -
          tooltipDiv.offsetHeight +
          heatmapContainer.scrollTop;
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

    // --- Theme Change Observer ---
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
   * Filters an array of deployments based on a date range specified by two HTML select elements.
   *
   * @param {Array<PulseDeployment>} deployments - The array of deployments to filter.
   * @param {HTMLSelectElement} fromSelect - The HTML select element representing the start date of the range.
   * @param {HTMLSelectElement} toSelect - The HTML select element representing the end date of the range.
   * @returns {Array<PulseDeployment>} The filtered array of deployments that overlap with the specified date range.
   */
  function filterDeploymentsByDateRange(deployments, fromSelect, toSelect) {
    if (!deployments || deployments.length === 0) {
      return [];
    }

    const from = fromSelect?.value ? Date.parse(fromSelect.value) : null;
    const to = toSelect?.value ? Date.parse(toSelect.value) : null;

    if (from === null && to === null) {
      return deployments;
    }

    return deployments.filter((deployment) => {
      const deploymentStart = Date.parse(deployment.from);
      const deploymentEnd = deployment.to
        ? Date.parse(deployment.to)
        : Date.now();

      // Include deployment if it overlaps with the selected range
      if (from !== null && deploymentEnd < from) {
        return false; // Deployment ended before range start
      }
      if (to !== null && deploymentStart > to) {
        return false; // Deployment started after range end
      }
      return true;
    });
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
   * @param {Array<PulseDeployment>} deployments - Array of deployments to visualize as zones on the chart.
   * @returns {Chart} A Chart.js instance representing the rendered chart.
   */
  function renderChart(
    decimation,
    percentile,
    timeMaps,
    minTimestamp,
    maxTimestamp,
    deployments = []
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
              displayFormats: {
                minute: "HH:mm",
                hour: "MMM dd HH:mm",
                day: "MMM dd",
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
          tooltip: {
            callbacks: {
              footer: (tooltipItems) => `State: ${tooltipItems[0].raw.state}`,
            },
          },
          annotation: {
            common: {
              drawTime: "afterDatasetsDraw",
            },
            annotations: Object.fromEntries(
              deployments.flatMap((deployment, index) => {
                const deploymentStart = Date.parse(deployment.from);
                const deploymentEnd = deployment.to
                  ? Date.parse(deployment.to)
                  : maxTimestamp;

                // Determine color based on status
                let backgroundColor = "rgba(75, 192, 192, 0.1)"; // Default teal
                let borderColor = "rgba(75, 192, 192, 0.5)";

                if (
                  deployment.status === "Failed" ||
                  deployment.status === "failed"
                ) {
                  backgroundColor = "rgba(255, 99, 132, 0.1)"; // Red
                  borderColor = "rgba(255, 99, 132, 0.5)";
                } else if (
                  deployment.status === "Succeeded" ||
                  deployment.status === "succeeded"
                ) {
                  backgroundColor = "rgba(75, 192, 192, 0.1)"; // Teal
                  borderColor = "rgba(75, 192, 192, 0.5)";
                } else if (
                  deployment.status === "InProgress" ||
                  deployment.status === "in_progress"
                ) {
                  backgroundColor = "rgba(255, 206, 86, 0.1)"; // Yellow
                  borderColor = "rgba(255, 206, 86, 0.5)";
                }

                // Build common deployment info lines
                const deploymentInfoLines = [
                  deployment.status ? `Status: ${deployment.status}` : null,
                  deployment.type ? `Type: ${deployment.type}` : null,
                  deployment.author ? `Author: ${deployment.author}` : null,
                  deployment.commitId ? `Commit: ${deployment.commitId}` : null,
                  deployment.buildNumber ? `Build: ${deployment.buildNumber}` : null,
                ].filter(Boolean);

                const startDate = new Date(deploymentStart).toLocaleString();
                const endDate = deployment.to
                  ? new Date(Date.parse(deployment.to)).toLocaleString()
                  : "In Progress";

                // Check if deployment start and end are on the same second (instant deployment)
                const isInstantDeployment = deployment.to && Math.floor(deploymentStart / 1000) === Math.floor(deploymentEnd / 1000);

                const startTooltipLines = isInstantDeployment 
                  ? ["Deployment", `Time: ${startDate}`, ...deploymentInfoLines]
                  : ["Deployment Start", `Time: ${startDate}`, ...deploymentInfoLines];
                const endTooltipLines = ["Deployment End", `Time: ${endDate}`, ...deploymentInfoLines];

                // Determine line color based on status
                let lineColor = "rgba(108, 117, 125, 0.8)"; // Default gray
                let markerColor = "rgba(108, 117, 125, 1)";
                let labelBgColor = "rgba(108, 117, 125, 0.95)";
                
                if (deployment.status === "Failed" || deployment.status === "failed") {
                  lineColor = "rgba(220, 53, 69, 0.8)"; // Red
                  markerColor = "rgba(220, 53, 69, 1)";
                  labelBgColor = "rgba(220, 53, 69, 0.95)";
                } else if (deployment.status === "Succeeded" || deployment.status === "succeeded") {
                  lineColor = "rgba(25, 135, 84, 0.8)"; // Green
                  markerColor = "rgba(25, 135, 84, 1)";
                  labelBgColor = "rgba(25, 135, 84, 0.95)";
                } else if (deployment.status === "InProgress" || deployment.status === "in_progress") {
                  lineColor = "rgba(255, 193, 7, 0.8)"; // Amber/Orange
                  markerColor = "rgba(255, 193, 7, 1)";
                  labelBgColor = "rgba(255, 193, 7, 0.95)";
                }

                // Helper function to create deployment line annotation
                const createLineAnnotation = (xValue, tooltipLines) => ({
                  type: "line",
                  xMin: xValue,
                  xMax: xValue,
                  yMin: (ctx) => ctx.chart.scales.y.min,
                  yMax: (ctx) => ctx.chart.scales.y.max,
                  borderColor: lineColor,
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    display: false,
                    content: tooltipLines,
                    position: "center",
                    textAlign: "left",
                    backgroundColor: labelBgColor,
                    color: "#fff",
                    borderRadius: 4,
                    padding: 8,
                    font: { size: 11 },
                    yAdjust: 10,
                  },
                  enter({element}) {
                    element.label.options.display = true;
                    return true;
                  },
                  leave({element}) {
                    element.label.options.display = false;
                    return true;
                  },
                });

                // Helper function to create triangle marker with linked label
                const createTriangleAnnotation = (xValue, lineId) => ({
                  type: "point",
                  xValue: xValue,
                  yValue: (ctx) => ctx.chart.scales.y.max,
                  backgroundColor: markerColor,
                  borderColor: markerColor,
                  borderWidth: 2,
                  radius: 8,
                  pointStyle: "triangle",
                  rotation: 180,
                  enter(ctx) {
                    const annotations = ctx.chart.options.plugins.annotation.annotations;
                    if (annotations[lineId]?.label) {
                      annotations[lineId].label.display = true;
                      ctx.chart.update('none');
                    }
                  },
                  leave(ctx) {
                    const annotations = ctx.chart.options.plugins.annotation.annotations;
                    if (annotations[lineId]?.label) {
                      annotations[lineId].label.display = false;
                      ctx.chart.update('none');
                    }
                  },
                });

                // Create start annotations
                const startLineId = `deployment-start-line-${index}`;
                const startTriangleId = `deployment-start-triangle-${index}`;
                const startLine = createLineAnnotation(deploymentStart, startTooltipLines);
                const startTriangle = createTriangleAnnotation(deploymentStart, startLineId);

                // For instant deployments (same start and end), only show one marker
                if (isInstantDeployment) {
                  return [[startLineId, startLine], [startTriangleId, startTriangle]];
                }

                // Create end annotations (if deployment has ended and not instant)
                const endLineId = `deployment-end-line-${index}`;
                const endTriangleId = `deployment-end-triangle-${index}`;
                const endLine = deployment.to ? createLineAnnotation(deploymentEnd, endTooltipLines) : null;
                const endTriangle = deployment.to ? createTriangleAnnotation(deploymentEnd, endLineId) : null;

                // Return all annotations
                const annotations = [
                  [startLineId, startLine],
                  [startTriangleId, startTriangle]
                ];
                if (endLine) {
                  annotations.push([endLineId, endLine]);
                }
                if (endTriangle) {
                  annotations.push([endTriangleId, endTriangle]);
                }
                return annotations;
              })
            ),
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
    if (maxTimestamp === null && minTimestamp === null) {
      return "minute";
    }

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
      counts[item.state] = (counts[item.state] || 0.0) + 1.0;
      return counts;
    }, {});

    const percentages = {};
    for (const [state, count] of Object.entries(stateCounts)) {
      percentages[state] = (count / totalChecks) * 100.0;
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

  /**
   * Filters an array of metric items based on a date range specified by two HTML select elements.
   *
   * @param {Array<PulseMetricsResult>} items - The array of metric items to filter.
   * @param {HTMLSelectElement} fromSelect - The HTML select element representing the start date of the range.
   * @param {HTMLSelectElement} toSelect - The HTML select element representing the end date of the range.
   * @returns {Array<PulseMetricsResult>} The filtered array of metric items that fall within the specified date range.
   */
  function filterMetricsByDateRange(items, fromSelect, toSelect) {
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
   * Renders a line chart for metrics (CPU, Memory, or IO) using Chart.js.
   *
   * @param {HTMLCanvasElement} canvas - The canvas element to render the chart on.
   * @param {Object} timeStructures - Pre-calculated time structures containing timeMap, minTimestamp, maxTimestamp, labels, and interval.
   * @param {string} metricType - The type of metric ('cpu', 'memory', or 'io').
   * @param {string} label - The label for the chart dataset.
   * @param {string} color - The color for the chart line.
   * @param {number} decimation - The decimation factor for data grouping.
   * @param {number} percentile - The percentile value for data processing.
   * @returns {Chart} A Chart.js instance representing the rendered chart.
   */
  function renderMetricsChart(
    canvas,
    timeStructures,
    metricType,
    label,
    color,
    decimation,
    percentile
  ) {
    const { timeMap, minTimestamp, maxTimestamp, labels, interval } =
      timeStructures;

    let data;

    if (decimation > 1) {
      // Apply decimation - group data by time intervals
      const decimationInterval = interval * decimation;
      const buckets = new Map();

      // Group metrics into buckets based on decimation interval and labels
      labels.forEach((timestamp) => {
        const time = timestamp.getTime();
        const item = timeMap.get(time);

        if (
          item &&
          item[metricType] !== null &&
          item[metricType] !== undefined
        ) {
          const bucketKey =
            Math.floor(time / decimationInterval) * decimationInterval;

          if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, []);
          }

          buckets.get(bucketKey).push(item[metricType]);
        }
      });

      // Create data points for ALL time buckets in the range, not just the ones with data
      data = [];
      for (
        let time = minTimestamp;
        time <= maxTimestamp;
        time += decimationInterval
      ) {
        const bucketKey =
          Math.floor(time / decimationInterval) * decimationInterval;

        if (buckets.has(bucketKey)) {
          const values = buckets.get(bucketKey);
          values.sort((a, b) => a - b);
          let value;

          if (percentile === 0) {
            // Use average for percentile 0
            value = values.reduce((sum, val) => sum + val, 0) / values.length;
          } else {
            // Calculate percentile
            const index = Math.ceil((percentile / 100) * values.length) - 1;
            value = values[Math.max(0, index)];
          }

          if (metricType === "io") {
            value = value / 1024 / 1024; // Convert to MB/s
          }

          data.push({
            x: new Date(bucketKey),
            y: value,
          });
        } else {
          // No data for this bucket - create a gap
          data.push({
            x: new Date(bucketKey),
            y: null,
          });
        }
      }
    } else {
      data = labels.map((timestamp) => {
        const time = timestamp.getTime();
        const item = timeMap.get(time);

        if (
          item &&
          item[metricType] !== null &&
          item[metricType] !== undefined
        ) {
          let value = item[metricType];

          if (metricType === "io") {
            value = value / 1024 / 1024; // Convert to MB/s
          }

          return {
            x: timestamp,
            y: value,
          };
        } else {
          return {
            x: timestamp,
            y: null,
          };
        }
      });
    }

    while (data.length > 0 && data[0].y === null) {
      data.shift();
    }

    while (data.length > 0 && data[data.length - 1].y === null) {
      data.pop();
    }

    const filteredMinTimestamp = data.length > 0 ? data[0].x : null;
    const filteredMaxTimestamp =
      data.length > 0 ? data[data.length - 1].x : null;
    const timeUnit = getTimeUnit(filteredMaxTimestamp, filteredMinTimestamp);

    const config = {
      type: "line",
      data: {
        datasets: [
          {
            label: label,
            data: data,
            borderColor: color,
            backgroundColor: color + "20",
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 1,
            pointHoverRadius: 4,
            segment: {
              borderDash: (ctx) =>
                ctx.p0.skip || ctx.p1.skip ? [6, 6] : undefined,
            },
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              unit: timeUnit,
              displayFormats: {
                minute: "HH:mm",
                hour: "MMM dd HH:mm",
                day: "MMM dd",
              },
            },
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: metricType !== "io" ? 100 : undefined,
            title: {
              display: true,
              text: label,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: function (context) {
                return new Date(context[0].parsed.x).toLocaleString();
              },
              label: function (context) {
                const value = context.parsed.y;
                return metricType === "io"
                  ? `${label}: ${value.toFixed(2)}MB/s`
                  : `${label}: ${value.toFixed(1)}%`;
              },
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
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
      },
    };

    return new Chart(canvas, config);
  }

  /**
   * Creates common time structures used by CPU, Memory, and IO charts.
   *
   * @param {Array<PulseMetricsResult>} filteredMetrics - The filtered metrics data.
   * @returns {Object|null} An object containing timeMap, minTimestamp, maxTimestamp, and labels, or null if no valid data.
   */
  function createMetricsTimeStructures(filteredMetrics) {
    // Filter out null/undefined values and sort by timestamp
    const validMetrics = filteredMetrics
      //.filter((x) => (x.cpu !== null && x.cpu !== undefined) || (x.memory !== null && x.memory !== undefined))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (validMetrics.length === 0) {
      return null;
    }

    const interval = 60000; // 1 minute interval like renderChart

    // Create a time map for quick lookup
    const timeMap = new Map();
    validMetrics.forEach((item) => {
      const itemTime = new Date(item.timestamp * 1000);
      itemTime.setSeconds(0, 0);
      timeMap.set(itemTime.getTime(), item);
    });

    // Calculate min/max timestamps from the map keys
    const minTimestamp = Math.min(...timeMap.keys());
    const maxTimestamp = Math.max(...timeMap.keys());

    // Build labels array like renderChart does
    const labels = [];
    for (let time = minTimestamp; time <= maxTimestamp; time += interval) {
      labels.push(new Date(time));
    }

    return {
      timeMap,
      minTimestamp,
      maxTimestamp,
      labels,
      interval,
    };
  }

  /**
   * Checks if a specific metric type has any valid data in the filtered metrics.
   *
   * @param {Array<PulseMetricsResult>} filteredMetrics - The filtered metrics data.
   * @param {string} metricType - The metric type to check ('cpu', 'memory', or 'io').
   * @returns {boolean} True if the metric type has valid data, false otherwise.
   */
  function hasMetricData(filteredMetrics, metricType) {
    return filteredMetrics.some(
      (item) => item[metricType] !== null && item[metricType] !== undefined
    );
  }

  /**
   * Updates or creates metrics charts based on the provided metrics data.
   *
   * @param {DetailDomElements} elements - The DOM elements for the detail card.
   * @param {PulseMetricsResultGroup|null} metrics - The metrics data to display.
   * @param {number} decimation - The decimation factor for data grouping.
   * @param {number} percentile - The percentile value for data processing.
   */
  function updateMetricsCharts(elements, metrics, decimation, percentile) {
    if (!metrics || !metrics.items || metrics.items.length === 0) {
      toggleElementVisibility(elements.detailMetrics, false);
      return;
    }

    const filteredMetrics = filterMetricsByDateRange(
      metrics.items,
      elements.fromSelect,
      elements.toSelect
    );

    if (filteredMetrics.length === 0) {
      toggleElementVisibility(elements.detailMetrics, false);
      return;
    }

    const hasCpuData = hasMetricData(filteredMetrics, "cpu");
    const hasMemoryData = hasMetricData(filteredMetrics, "memory");
    const hasIoData = hasMetricData(filteredMetrics, "io");

    if (!hasCpuData && !hasMemoryData && !hasIoData) {
      toggleElementVisibility(elements.detailMetrics, false);
      return;
    }

    const timeStructures = createMetricsTimeStructures(filteredMetrics);
    if (!timeStructures) {
      toggleElementVisibility(elements.detailMetrics, false);
      return;
    }

    toggleElementVisibility(elements.detailMetrics, true);

    if (
      hasCpuData &&
      elements.metricsCpuContainer &&
      elements.metricsCpuChart
    ) {
      toggleElementVisibility(elements.metricsCpuContainer, true);
      toggleSpinner(elements.metricsCpuSpinner, false);
      detailMetricsCpuChart = renderMetricsChart(
        elements.metricsCpuChart,
        timeStructures,
        "cpu",
        "CPU Usage",
        "rgb(54, 162, 235)",
        decimation,
        percentile
      );
    } else if (elements.metricsCpuContainer) {
      toggleElementVisibility(elements.metricsCpuContainer, false);
    }

    if (
      hasMemoryData &&
      elements.metricsMemoryContainer &&
      elements.metricsMemoryChart
    ) {
      toggleElementVisibility(elements.metricsMemoryContainer, true);
      toggleSpinner(elements.metricsMemorySpinner, false);
      detailMetricsMemoryChart = renderMetricsChart(
        elements.metricsMemoryChart,
        timeStructures,
        "memory",
        "Memory Usage",
        "rgb(255, 99, 132)",
        decimation,
        percentile
      );
    } else if (elements.metricsMemoryContainer) {
      toggleElementVisibility(elements.metricsMemoryContainer, false);
    }

    if (hasIoData && elements.metricsIoContainer && elements.metricsIoChart) {
      toggleElementVisibility(elements.metricsIoContainer, true);
      toggleSpinner(elements.metricsIoSpinner, false);
      detailMetricsIoChart = renderMetricsChart(
        elements.metricsIoChart,
        timeStructures,
        "io",
        "IO Usage",
        "rgb(75, 192, 104)",
        decimation,
        percentile
      );
    } else if (elements.metricsIoContainer) {
      toggleElementVisibility(elements.metricsIoContainer, false);
    }
  }
})();
