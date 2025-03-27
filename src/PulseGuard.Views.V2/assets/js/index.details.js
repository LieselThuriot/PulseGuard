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
 * @property {string} state - The status of the health check (e.g., "Healthy", "Degraded", "Unhealthy")
 * @property {string} timestamp - ISO 8601 formatted timestamp with timezone information
 * @property {number} elapsedMilliseconds - The response time in milliseconds
 */

/**
 * Represents a single health check result
 * @typedef {Object} UptimeResult
 * @property {number} Healthy
 * @property {number} Degraded
 * @property {number} Unhealthy
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
 * @property {HTMLElement|null} badge - The badge element.
 * @property {HTMLElement|null} decimationSelect - The dropdown for chart decimation options.
 * @property {HTMLElement|null} fromSelect - The dropdown for selecting the start date/time.
 * @property {HTMLElement|null} toSelect - The dropdown for selecting the end date/time.
 */

(async function () {
  /** @type {Chart} */
  let detailCardChart = null;
  let renderChartListener = null;

  /** @type {string} */
  let currentSqid = null;

  /** @type {AbortController} */
  let fetchAbortController;

  /**
   * Handles changes to the query parameters in the URL.
   * If the "details" query parameter is present, it updates the currentSqid and refreshes the data.
   * It also shows or hides the detail card container based on the presence of the "details" query parameter.
   */
  function handleQueryParamChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const sqid = urlParams.get("details");
    const detailCardContainer = document.querySelector(
      "#detail-card-container"
    );

    if (sqid) {
      if (currentSqid !== sqid) {
        currentSqid = sqid;
        refreshData(sqid);
      }
      if (detailCardContainer) {
        detailCardContainer.classList.remove("d-none");
      } else {
        console.error("Error getting detail-card-container");
      }
    } else {
      if (detailCardContainer) {
        detailCardContainer.classList.add("d-none");
      } else {
        console.error("Error getting detail-card-container");
      }
    }
  }

  window.addEventListener("popstate", handleQueryParamChange);
  window.addEventListener("pushstate", handleQueryParamChange);
  window.addEventListener("replacestate", handleQueryParamChange);

  // Initial call to handle the current query param value
  handleQueryParamChange();

  /**
   * Fetches pulse details data from the API and handles the response.
   * @param {string} sqid - The unique identifier for the pulse details.
   * @returns {Promise<void>} A promise that resolves when the data has been fetched and handled.
   */
  function refreshData(sqid) {
    resetDetails();

    if (fetchAbortController) {
      fetchAbortController.abort(`Starting new request for ${sqid}.`);
    }

    fetchAbortController = new AbortController();

    fetch(`../api/1.0/pulses/details/${sqid}`, {
      method: "get",
      signal: fetchAbortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        /** @type {PulseDetailResultGroup} */
        const data = response.json();
        return data;
      })
      .then((data) => {
        handleData(data);
      })
      .catch((error) => {
        if (error && error.name === "AbortError") {
          //console.log("Fetch aborted");
        } else {
          console.error(
            "There has been a problem with your fetch operation:",
            error
          );
        }
      })
      .finally(() => {
        fetchAbortController = null;
      });
  }

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
      badge: document.querySelector("#detail-card-badge"),
      decimationSelect: document.querySelector("#detail-card-chart-decimation"),
      fromSelect: document.querySelector("#detail-card-chart-from"),
      toSelect: document.querySelector("#detail-card-chart-to"),
    };
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
  function resetDetails() {
    destroyChart();

    const detailCardElements = getDetailCardElements();

    toggleSpinner(detailCardElements.spinner, true);
    toggleElementVisibility(detailCardElements.chart, false);
    resetTextContent(detailCardElements.header, "...");
    resetTextContent(detailCardElements.uptime, "...");
    resetTextContent(detailCardElements.since, "...");
    resetTextContent(detailCardElements.averageResponse, "...");
    resetTextContent(detailCardElements.errorRate, "...");
    resetInnerHTML(detailCardElements.healthBar);
    resetInnerHTML(detailCardElements.healthBarMd);
    resetBadge(detailCardElements.badge);
    disableSelectElements([
      detailCardElements.decimationSelect,
      detailCardElements.fromSelect,
      detailCardElements.toSelect,
    ]);
  }

  /**
   * Handles the data by sorting, formatting, and displaying it.
   * @param {PulseDetailResultGroup} data - The data to handle.
   */
  function handleData(data) {
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

      const timeMap = createTimeMap(filteredData);
      const minTimestamp = Math.min(...timeMap.keys());
      const maxTimestamp = Math.max(...timeMap.keys());

      detailCardChart = renderChart(
        newDecimation,
        timeMap,
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
      updateUptimeAndErrorRate(
        detailCardElements,
        uptimes,
        minTimestamp,
        filteredData
      );
    };

    setupChartListeners(detailCardElements, updateChart, renderChartListener);

    updateChart();

    setBadge(detailCardElements.badge, data.items);

    toggleSpinner(detailCardElements.spinner, false);
    toggleElementVisibility(detailCardElements.chart, true);
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
   * Disables a list of <select> elements by setting the "disabled" attribute.
   *
   * @param {HTMLSelectElement[]} selectElements - An array of <select> elements to disable.
   */
  function disableSelectElements(selectElements) {
    selectElements.forEach((select) => {
      if (select) {
        select.setAttribute("disabled", "");
      } else {
        console.error("Error disabling select element");
      }
    });
  }

  /**
   * Filters an array of items based on a date range specified by two HTML select elements.
   *
   * @param {Array<Object>} items - The array of items to filter. Each item is expected to have a `timestamp` property.
   * @param {HTMLSelectElement} fromSelect - The HTML select element representing the start date of the range.
   *                                         Its `value` should be a valid date string.
   * @param {HTMLSelectElement} toSelect - The HTML select element representing the end date of the range.
   *                                       Its `value` should be a valid date string.
   * @returns {Array<Object>} The filtered array of items that fall within the specified date range.
   */
  function filterDataByDateRange(items, fromSelect, toSelect) {
    let filteredData = items;
    const fromDate =
      fromSelect && fromSelect.value ? new Date(fromSelect.value) : null;
    const toDate = toSelect && toSelect.value ? new Date(toSelect.value) : null;

    if (fromDate) {
      filteredData = filteredData.filter(
        (item) => new Date(item.timestamp) >= fromDate
      );
    }
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter(
        (item) => new Date(item.timestamp) <= toDate
      );
    }

    return filteredData;
  }

  /**
   * Creates a Map where the keys are timestamps (rounded to the nearest minute)
   * and the values are the corresponding items from the input array.
   *
   * @param {Array<Object>} items - An array of objects, each containing a `timestamp` property.
   * @returns {Map<number, Object>} A Map with keys as rounded timestamps (in milliseconds since epoch)
   * and values as the corresponding items.
   */
  function createTimeMap(items) {
    const timeMap = new Map();
    items.forEach((item) => {
      const itemTime = new Date(item.timestamp);
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
   * @param {Object} timeMap - A mapping of time-related data used to create the health bars.
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
        createHealthBar(100, timeMap, minTimestamp, maxTimestamp)
      );
    } else {
      console.error("Error updating health bar");
    }

    if (healthBarMd) {
      healthBarMd.innerHTML = "";
      healthBarMd.appendChild(
        createHealthBar(50, timeMap, minTimestamp, maxTimestamp)
      );
    } else {
      console.error("Error updating medium health bar");
    }
  }

  /**
   * Updates the UI elements with uptime, error rate, average response time, and the earliest timestamp.
   *
   * @param {Object} elements - The DOM elements to update.
   * @param {HTMLElement} elements.uptime - The element to display the healthy uptime percentage.
   * @param {HTMLElement} elements.since - The element to display the earliest timestamp.
   * @param {HTMLElement} elements.averageResponse - The element to display the average response time.
   * @param {HTMLElement} elements.errorRate - The element to display the unhealthy uptime percentage (error rate).
   * @param {Object} uptimes - An object containing uptime percentages.
   * @param {number} uptimes.Healthy - The percentage of healthy uptime.
   * @param {number} uptimes.Unhealthy - The percentage of unhealthy uptime (error rate).
   * @param {number} minTimestamp - The earliest timestamp in milliseconds.
   * @param {Array<Object>} filteredData - The filtered data used to calculate the average response time.
   */
  function updateUptimeAndErrorRate(
    elements,
    uptimes,
    minTimestamp,
    filteredData
  ) {
    resetTextContent(
      elements.uptime,
      !isNaN(uptimes.Healthy) ? `${uptimes.Healthy.toFixed(2)}%` : "0.00%"
    );

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

    resetTextContent(
      elements.errorRate,
      !isNaN(uptimes.Unhealthy) ? `${uptimes.Unhealthy.toFixed(2)}%` : "0.00%"
    );
  }

  /**
   * Sets up event listeners for chart-related elements and updates the chart when changes occur.
   *
   * @param {Object} elements - An object containing the DOM elements to attach listeners to.
   * @param {HTMLElement} elements.decimationSelect - The dropdown element for decimation selection.
   * @param {HTMLElement} elements.fromSelect - The dropdown element for the "from" selection.
   * @param {HTMLElement} elements.toSelect - The dropdown element for the "to" selection.
   * @param {Function} updateChart - The callback function to update the chart when an event occurs.
   * @param {Function|null} listener - The existing event listener to be removed, if any.
   */
  function setupChartListeners(elements, updateChart, listener) {
    if (elements.decimationSelect) {
      if (listener) {
        elements.decimationSelect.removeEventListener("change", listener);
        elements.fromSelect.removeEventListener("change", listener);
        elements.toSelect.removeEventListener("change", listener);
      }

      renderChartListener = updateChart;

      elements.decimationSelect.addEventListener("change", renderChartListener);
      elements.fromSelect.addEventListener("change", renderChartListener);
      elements.toSelect.addEventListener("change", renderChartListener);

      elements.decimationSelect.removeAttribute("disabled");
      elements.fromSelect.removeAttribute("disabled");
      elements.toSelect.removeAttribute("disabled");
    }
  }

  /**
   * Updates the badge element with the state of the last item in the provided list.
   *
   * @param {HTMLElement|null} detailCardBadge - The badge element to update.
   * @param {Array<PulseDetailResult>} items - An array of items where each item contains a `state` property.
   */
  function setBadge(detailCardBadge, items) {
    const lastItem = items[items.length - 1];

    if (detailCardBadge) {
      detailCardBadge.textContent = lastItem.state;
      detailCardBadge.className = `badge text-bg-${getBadgeColor(
        lastItem.state
      )}`;
    } else {
      console.error("Error getting detail-card-badge");
    }
  }

  /**
   * Returns the badge color based on the given state.
   *
   * @param {string} state - The state of the system which can be "Healthy", "Degraded", or "Unhealthy".
   * @returns {string} - The corresponding badge color: "success" for "Healthy", "warning" for "Degraded", "danger" for "Unhealthy", and "secondary" for any other state.
   */
  function getBadgeColor(state) {
    switch (state) {
      case "Healthy":
        return "success";
      case "Degraded":
        return "warning";
      case "Unhealthy":
        return "danger";
      default:
        return "secondary";
    }
  }

  /**
   * Renders a chart displaying response times over a specified time range.
   *
   * @param {number} decimation - The decimation factor to reduce the number of data points.
   * @param {Map<number, {timestamp: number, elapsedMilliseconds: number, state: string}>} timeMap - A map of timestamps to data points.
   * @param {number} minTimestamp - The minimum timestamp for the chart.
   * @param {number} maxTimestamp - The maximum timestamp for the chart.
   * @returns {Chart} The rendered Chart.js chart instance.
   */
  function renderChart(decimation, timeMap, minTimestamp, maxTimestamp) {
    const interval = 60000;
    const timestampDecimation = decimation * interval;

    const buckets = [];
    let currentBucket = null;

    for (let time = minTimestamp; time <= maxTimestamp; time += interval) {
      const item = timeMap.get(time);
      const timestamp = new Date(time);
      timestamp.setSeconds(0, 0);

      const [elapsedMilliseconds, state] = item
        ? [item.elapsedMilliseconds, item.state]
        : [NaN, "Unknown"];

      if (
        !currentBucket ||
        state !== currentBucket.state ||
        time - currentBucket.timestamp >= timestampDecimation
      ) {
        if (currentBucket) {
          currentBucket.elapsedMilliseconds /= currentBucket.count;
          buckets.push(currentBucket);

          if (state !== currentBucket.state && currentBucket.count > 1) {
            const lastItem = timeMap.get(time - interval);
            if (lastItem) {
              buckets.push({
                timestamp: new Date(time - interval),
                state: lastItem.state,
                elapsedMilliseconds: lastItem.elapsedMilliseconds,
                count: 1,
              });
            }
          }
        }

        currentBucket = {
          timestamp: timestamp,
          state: state,
          elapsedMilliseconds: elapsedMilliseconds,
          count: 1,
        };
      } else {
        if (!isNaN(elapsedMilliseconds)) {
          currentBucket.elapsedMilliseconds += elapsedMilliseconds;
        }
        currentBucket.count += 1;
      }
    }

    if (currentBucket) {
      currentBucket.elapsedMilliseconds /= currentBucket.count;
      buckets.push(currentBucket);
    }

    const skipped = (ctx, value) =>
      ctx.p0.skip || ctx.p1.skip ? value : undefined;

    const healthColor = (ctx) =>
      getStateColor(buckets[ctx.p1DataIndex].state, false);

    const ctx = document.getElementById("detail-card-chart").getContext("2d");

    const timeDiff = maxTimestamp - minTimestamp;
    let timeUnit = "day";
    if (timeDiff <= 3600000) {
      // less than or equal to 1 hour
      timeUnit = "minute";
    } else if (timeDiff <= 86400000) {
      // less than or equal to 1 day
      timeUnit = "hour";
    }

    return new Chart(ctx, {
      type: "line",
      data: {
        labels: buckets.map((x) => x.timestamp),
        datasets: [
          {
            label: "Response Time (ms)",
            data: buckets.map((x) => x.elapsedMilliseconds),
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            fill: false,
            tension: 0.1,
            pointBackgroundColor: buckets.map((x) =>
              getStateColor(x.state, true)
            ),
            segment: {
              borderDash: (ctx) => skipped(ctx, [6, 6]),
              borderColor: (ctx) =>
                skipped(ctx, getStateColor("Unknown", false)) ||
                healthColor(ctx),
            },
            spanGaps: true,
          },
        ],
      },
      options: {
        // Boolean - whether or not the chart should be responsive and resize when the browser does.
        responsive: true,
        // Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            time: {
              unit: timeUnit,
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
              text: "Response Time (ms)",
            },
          },
        },
        plugins: {
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
   * Returns the color associated with a given state.
   *
   * @param {string} state - The state for which to get the color.
   *                         Possible values are "Healthy", "Degraded", "Unhealthy".
   * @param {boolean} bright - If true, returns a brighter color variant; otherwise, returns a standard color variant.
   * @returns {string} The color corresponding to the given state in rgba format.
   */
  function getStateColor(state, bright) {
    switch (state) {
      case "Healthy":
        return bright ? "rgba(25, 135, 84, 1)" : "rgba(75, 192, 192, 1)";
      case "Degraded":
        return bright ? "rgba(255, 193, 7, 1)" : "rgba(255, 206, 86, 1)";
      case "Unhealthy":
        return bright ? "rgba(220, 53, 69, 1)" : "rgba(255, 99, 132, 1)";
      default:
        return "rgba(201, 203, 207, 1)";
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
   * @param {Array<{time: number, state: string}>} timeMap - An array of objects representing the time and state of each pulse.
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

    timeMap.forEach((pulse, time) => {
      buckets.forEach((bucket) => {
        if (time >= bucket.start.getTime() && time < bucket.end.getTime()) {
          const states = ["Healthy", "Degraded", "Unhealthy"];
          const worstStateIndex = Math.max(
            states.indexOf(pulse.state),
            states.indexOf(bucket.state)
          );

          if (worstStateIndex !== -1) {
            bucket.state = states[worstStateIndex];
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
      bucketDiv.setAttribute("title", tooltipText);
      new bootstrap.Tooltip(bucketDiv);

      if (bucket.state === "Healthy") {
        bucketDiv.classList.add("text-bg-success");
      } else if (bucket.state === "Degraded") {
        bucketDiv.classList.add("text-bg-warning");
      } else if (bucket.state === "Unhealthy") {
        bucketDiv.classList.add("text-bg-danger");
      } else {
        bucketDiv.classList.add("text-bg-secondary");
      }

      healthBar.appendChild(bucketDiv);
    });

    return healthBar;
  }
})();
