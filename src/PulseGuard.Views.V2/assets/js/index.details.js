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

(async function () {
  /** @type {Chart} */
  let detailCardChart = null;
  let renderChartListener = null;

  /** @type {string} */
  let currentSqid = null;

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

    fetch(`../api/1.0/pulses/details/${sqid}`)
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
        console.error(
          "There has been a problem with your fetch operation:",
          error
        );
      });
  }

  /**
   * Resets the details card by destroying the chart, showing the spinner,
   * and resetting the content of various elements to their default states.
   *
   * This function performs the following actions:
   * - Destroys the `detailCardChart` if it exists and sets it to null.
   * - Shows the spinner by removing the "d-none" class from the spinner element.
   * - Resets the text content of the header, uptime, since, response time, and error rate elements to "...".
   * - Clears the inner HTML of the health bar and health bar (medium) elements.
   * - Hides the badge by setting its text content to an empty string and adding the "d-none" class.
   * - Disables the decimation, from, and to select elements.
   *
   * Logs an error to the console if any of the elements cannot be found.
   */
  function resetDetails() {
    if (detailCardChart) {
      detailCardChart.destroy();
      detailCardChart = null;
    }

    const detailCardSpinner = document.querySelector("#detail-card-spinner");
    if (detailCardSpinner) {
      detailCardSpinner.classList.remove("d-none");
    } else {
      console.error("Error getting detail-card-spinner");
    }

    const detailCardHeader = document.querySelector("#detail-card-header");
    if (detailCardHeader) {
      detailCardHeader.textContent = "...";
    } else {
      console.error("Error getting detail-card-header");
    }
    const detailCardHealthBar = document.querySelector(
      "#detail-card-healthbar"
    );
    if (detailCardHealthBar) {
      detailCardHealthBar.innerHTML = "";
    } else {
      console.error("Error getting detail-card-healthbar");
    }
    const detailCardHealthBarMd = document.querySelector(
      "#detail-card-healthbar-md"
    );
    if (detailCardHealthBarMd) {
      detailCardHealthBarMd.innerHTML = "";
    } else {
      console.error("Error getting detail-card-healthbar-md");
    }
    const uptimeElement = document.querySelector("#detail-card-uptime");
    if (uptimeElement) {
      uptimeElement.textContent = "...";
    } else {
      console.error("Error getting detail-card-uptime");
    }
    const sinceElement = document.querySelector("#detail-card-since");
    if (sinceElement) {
      sinceElement.textContent = "...";
    } else {
      console.error("Error getting detail-card-since");
    }
    const responseTimeElement = document.querySelector(
      "#detail-card-average-response"
    );
    if (responseTimeElement) {
      responseTimeElement.textContent = "...";
    } else {
      console.error("Error getting detail-card-average-response");
    }
    const errorRateElement = document.querySelector("#detail-card-error-rate");
    if (errorRateElement) {
      errorRateElement.textContent = "...";
    } else {
      console.error("Error getting detail-card-error-rate");
    }
    const detailCardBadge = document.querySelector("#detail-card-badge");
    if (detailCardBadge) {
      detailCardBadge.textContent = "";
      detailCardBadge.className = "d-none";
    } else {
      console.error("Error getting detail-card-badge");
    }
    const decimationSelect = document.querySelector(
      "#detail-card-chart-decimation"
    );
    if (decimationSelect) {
      decimationSelect.setAttribute("disabled", "");
    } else {
      console.error("Error getting detail-card-chart-decimation");
    }
    const fromSelect = document.querySelector("#detail-card-chart-from");
    if (fromSelect) {
      fromSelect.setAttribute("disabled", "");
    } else {
      console.error("Error getting detail-card-chart-from");
    }
    const toSelect = document.querySelector("#detail-card-chart-to");
    if (toSelect) {
      toSelect.setAttribute("disabled", "");
    } else {
      console.error("Error getting detail-card-chart-to");
    }
  }

  /**
   * Handles the data by sorting, formatting, and displaying it.
   * @param {PulseDetailResultGroup} data - The data to handle.
   */
  function handleData(data) {
    setDetailsHeader(!!data.group ? data.group + " > " + data.name : data.name);

    if (detailCardChart) {
      detailCardChart.destroy();
      detailCardChart = null;
    }
    const decimationSelect = document.querySelector(
      "#detail-card-chart-decimation"
    );

    const fromSelect = document.querySelector("#detail-card-chart-from");

    const toSelect = document.querySelector("#detail-card-chart-to");

    const updateChart = function () {
      if (detailCardChart) {
        detailCardChart.destroy();
        detailCardChart = null;
      }

      let filteredData = data.items;
      const fromDate =
        fromSelect && fromSelect.value ? new Date(fromSelect.value) : null;
      const toDate =
        toSelect && toSelect.value ? new Date(toSelect.value) : null;
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

      const newDecimation = decimationSelect
        ? parseInt(decimationSelect.value, 10)
        : 15;

      const timeMap = new Map();
      filteredData.forEach((item) => {
        const itemTime = new Date(item.timestamp);
        itemTime.setSeconds(0, 0);
        timeMap.set(itemTime.getTime(), item);
      });

      const minTimestamp = Math.min(...timeMap.keys());
      const maxTimestamp = Math.max(...timeMap.keys());

      detailCardChart = renderChart(
        newDecimation,
        timeMap,
        minTimestamp,
        maxTimestamp
      );

      const healthBar = createHealthBar(
        100,
        timeMap,
        minTimestamp,
        maxTimestamp
      );
      const detailCardHealthBar = document.querySelector(
        "#detail-card-healthbar"
      );
      if (detailCardHealthBar) {
        detailCardHealthBar.innerHTML = "";
        detailCardHealthBar.appendChild(healthBar);
      } else {
        console.error("Error getting detail-card-healthbar");
      }
      const healthBarMd = createHealthBar(
        50,
        timeMap,
        minTimestamp,
        maxTimestamp
      );
      const detailCardHealthBarMd = document.querySelector(
        "#detail-card-healthbar-md"
      );
      if (detailCardHealthBarMd) {
        detailCardHealthBarMd.innerHTML = "";
        detailCardHealthBarMd.appendChild(healthBarMd);
      } else {
        console.error("Error getting detail-card-healthbar-md");
      }

      const uptimes = calculateUptimes(filteredData);

      const uptimeElement = document.querySelector("#detail-card-uptime");
      if (uptimeElement) {
        uptimeElement.textContent = !isNaN(uptimes.Healthy)
          ? `${uptimes.Healthy.toFixed(2)}%`
          : "0.00%";
      } else {
        console.error("Error getting detail-card-uptime");
      }

      const sinceElement = document.querySelector("#detail-card-since");
      if (sinceElement) {
        sinceElement.textContent =
          minTimestamp && !isNaN(minTimestamp)
            ? new Date(minTimestamp).toLocaleString()
            : "...";
      } else {
        console.error("Error getting detail-card-since");
      }

      const responseTime = calculateAverageResponseTime(filteredData);
      const responseTimeElement = document.querySelector(
        "#detail-card-average-response"
      );
      if (responseTimeElement) {
        responseTimeElement.textContent = !isNaN(responseTime)
          ? `${responseTime.toFixed(2)}ms`
          : "...";
      } else {
        console.error("Error getting detail-card-average-response");
      }

      const errorRateElement = document.querySelector(
        "#detail-card-error-rate"
      );
      if (errorRateElement) {
        errorRateElement.textContent = !isNaN(uptimes.Unhealthy)
          ? `${uptimes.Unhealthy.toFixed(2)}%`
          : "0.00%";
      } else {
        console.error("Error getting detail-card-error-rate");
      }
    };

    if (decimationSelect) {
      if (renderChartListener) {
        decimationSelect.removeEventListener("change", renderChartListener);
        fromSelect.removeEventListener("change", renderChartListener);
        toSelect.removeEventListener("change", renderChartListener);
      }

      renderChartListener = updateChart;

      decimationSelect.addEventListener("change", renderChartListener);
      fromSelect.addEventListener("change", renderChartListener);
      toSelect.addEventListener("change", renderChartListener);

      decimationSelect.removeAttribute("disabled");
      fromSelect.removeAttribute("disabled");
      toSelect.removeAttribute("disabled");
    }

    updateChart();

    setBadge(data.items);

    const detailCardSpinner = document.querySelector("#detail-card-spinner");
    if (detailCardSpinner) {
      detailCardSpinner.classList.add("d-none");
    } else {
      console.error("Error getting detail-card-spinner");
    }
  }

  /**
   * Updates the badge element with the state of the last item in the provided list.
   *
   * @param {Array<PulseDetailResult>} items - An array of items where each item contains a `state` property.
   * @throws Will log an error if the badge element with the ID `detail-card-badge` is not found.
   */
  function setBadge(items) {
    const lastItem = items[items.length - 1];
    const detailCardBadge = document.querySelector("#detail-card-badge");
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
   * Sets the header of the details section.
   * @param {string} value - The value to set as the header.
   */
  function setDetailsHeader(value) {
    const detailCardHeader = document.querySelector("#detail-card-header");
    if (detailCardHeader) {
      detailCardHeader.textContent = value;
    } else {
      console.error("Error getting detail-card-header");
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
    const set = [];
    for (let time = minTimestamp; time <= maxTimestamp; time += 60000) {
      const item = timeMap.get(time);
      if (item) {
        const timestamp = new Date(item.timestamp);
        timestamp.setSeconds(0, 0);

        set.push({
          timestamp: timestamp,
          elapsedMilliseconds: item.elapsedMilliseconds || 0,
          state: item.state,
        });
      } else {
        const timestamp = new Date(time);
        timestamp.setSeconds(0, 0);

        set.push({
          timestamp: timestamp,
          elapsedMilliseconds: NaN,
          state: "Unknown",
        });
      }
    }

    const buckets = [];
    let currentBucket = null;
    set.forEach((item) => {
      const itemTime = item.timestamp;

      if (
        !currentBucket ||
        item.state !== currentBucket.state ||
        itemTime - currentBucket.timestamp >= decimation * 60 * 1000
      ) {
        if (currentBucket) {
          currentBucket.elapsedMilliseconds /= currentBucket.count;
          buckets.push(currentBucket);
        }
        currentBucket = {
          timestamp: itemTime,
          state: item.state,
          elapsedMilliseconds: isNaN(item.elapsedMilliseconds)
            ? NaN
            : item.elapsedMilliseconds,
          count: 1,
        };
      } else {
        if (!isNaN(item.elapsedMilliseconds)) {
          currentBucket.elapsedMilliseconds += item.elapsedMilliseconds;
        }
        currentBucket.count += 1;
      }
    });

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
            title: {
              display: true,
              text: "Response Time (ms)",
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
   * Represents a single health check result
   * @typedef {Object} UptimeResult
   * @property {number} Healthy
   * @property {number} Degraded
   * @property {number} Unhealthy
   * @property {number} Unknown
   */

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
      (acc, item) => acc + item.elapsedMilliseconds || 0,
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
