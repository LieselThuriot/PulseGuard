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

    fetch(
      `https://localhost:7010/pulseguard/api/1.0/pulses/details/${sqid}?days=14`
    )
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
   * Resets the details section of the page by clearing or setting default values
   * for various elements. Specifically, it:
   * - Clears the inner HTML of the health bar element.
   * - Sets the text content of the uptime element to '...'.
   * - Sets the text content of the average response time element to '...'.
   * - Sets the text content of the error rate element to '...'.
   * - Clears the text content of the badge element and hides it by setting its class to 'd-none'.
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
    let decimationSelect = document.querySelector(
      "#detail-card-chart-decimation"
    );
    if (decimationSelect) {
      decimationSelect.setAttribute("disabled", "");
    } else {
      console.error("Error getting detail-card-chart-decimation");
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

    let decimationSelect = document.querySelector(
      "#detail-card-chart-decimation"
    );

    if (decimationSelect) {
      if (renderChartListener) {
        decimationSelect.removeEventListener("change", renderChartListener);
      }

      renderChartListener = (event) => {
        if (detailCardChart) {
          detailCardChart.destroy();
          detailCardChart = null;
        }

        const newDecimation =
          event && event.target ? parseInt(event.target.value, 10) : 15;
        detailCardChart = renderChart(data.items, newDecimation);
      };

      decimationSelect.addEventListener("change", renderChartListener);
      decimationSelect.removeAttribute("disabled");
    }

    renderChartListener({ target: decimationSelect });

    const healthBar = createHealthBar(data.items, 100);
    const detailCardHealthBar = document.querySelector(
      "#detail-card-healthbar"
    );
    if (detailCardHealthBar) {
      detailCardHealthBar.innerHTML = "";
      detailCardHealthBar.appendChild(healthBar);
    } else {
      console.error("Error getting detail-card-healthbar");
    }
    const healthBarMd = createHealthBar(data.items, 50);
    const detailCardHealthBarMd = document.querySelector(
      "#detail-card-healthbar-md"
    );
    if (detailCardHealthBarMd) {
      detailCardHealthBarMd.innerHTML = "";
      detailCardHealthBarMd.appendChild(healthBarMd);
    } else {
      console.error("Error getting detail-card-healthbar-md");
    }

    const uptime = calculateUptime(data.items);
    const uptimeElement = document.querySelector("#detail-card-uptime");
    if (uptimeElement) {
      uptimeElement.textContent = `${uptime.toFixed(2)}%`;
    } else {
      console.error("Error getting detail-card-uptime");
    }

    const since = earliestTimestamp(data.items);
    const sinceElement = document.querySelector("#detail-card-since");
    if (sinceElement) {
      sinceElement.textContent = since.toLocaleString();
    } else {
      console.error("Error getting detail-card-since");
    }

    const responseTime = calculateAverageResponseTime(data.items);
    const responseTimeElement = document.querySelector(
      "#detail-card-average-response"
    );
    if (responseTimeElement) {
      responseTimeElement.textContent = `${responseTime.toFixed(2)}ms`;
    } else {
      console.error("Error getting detail-card-average-response");
    }

    const errorRate = calculateErrorRate(data.items);
    const errorRateElement = document.querySelector("#detail-card-error-rate");
    if (errorRateElement) {
      errorRateElement.textContent = `${errorRate.toFixed(2)}%`;
    } else {
      console.error("Error getting detail-card-error-rate");
    }

    setBadge(data.items);

    const detailCardSpinner = document.querySelector("#detail-card-spinner");
    if (detailCardSpinner) {
      detailCardSpinner.classList.add("d-none");
    } else {
      console.error("Error getting detail-card-spinner");
    }
  }

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
   * Renders a graph using the provided data.
   * @param {Array<PulseDetailResult>} data - The data to be used for rendering the graph.
   * @param {number} decimation - The number of data points to skip between each plotted point.
   * @returns {Chart} The rendered Chart.js instance.
   */
  function renderChart(data, decimation) {
    const set = [];
    const timestamps = data.map((item) => new Date(item.timestamp));
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    for (let time = minTimestamp; time <= maxTimestamp; time += 60000) {
      const item = data.find((d) => {
        const itemTime = new Date(d.timestamp);
        itemTime.setSeconds(0, 0); // Ignore seconds and milliseconds
        return itemTime.getTime() === time;
      });
      if (item) {
        set.push({
          timestamp: new Date(item.timestamp),
          elapsedMilliseconds: item.elapsedMilliseconds || 0,
          state: item.state,
        });
      } else {
        set.push({
          timestamp: new Date(time),
          elapsedMilliseconds: NaN,
          state: "Unknown",
        });
      }
    }
    const buckets = [];
    let currentBucket = null;
    set.forEach((item) => {
      const itemTime = new Date(item.timestamp);
      itemTime.setSeconds(0, 0); // Ignore seconds and milliseconds

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
              unit: "minute",
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
   * Finds the earliest timestamp from a list of items.
   *
   * @param {Array<PulseDetailResult>} items - The list of items, each containing a timestamp property.
   * @returns {Date} The earliest timestamp in milliseconds since the Unix Epoch.
   */
  function earliestTimestamp(items) {
    const timestamps = items.map((item) => new Date(item.timestamp));
    return new Date(Math.min(...timestamps));
  }

  /**
   * Calculates the uptime percentage based on the provided items.
   *
   * @param {Array<PulseDetailResult>} items - An array of objects representing the checks.
   * @returns {number} The uptime percentage calculated as (healthyChecks / totalChecks) * 100.
   */
  function calculateUptime(items) {
    const totalChecks = items.length;
    const healthyChecks = items.filter(
      (item) => item.state === "Healthy"
    ).length;
    const uptimePercent = (healthyChecks / totalChecks) * 100;
    return uptimePercent;
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
   * Calculates the error rate based on the provided items.
   *
   * @param {Array<PulseDetailResult>} items - An array of objects representing the checks.
   * @returns {number} - The error rate calculated as (unhealthyChecks / totalChecks) * 100.
   */
  function calculateErrorRate(items) {
    const totalChecks = items.length;
    const unhealthyChecks = items.filter(
      (item) => item.state === "Unhealthy"
    ).length;
    const errorRate = (unhealthyChecks / totalChecks) * 100;
    return errorRate;
  }

  /**
   * Creates a health bar element for the given items.
   * @param {Array<PulseDetailResult>} items - The items to create the health bar for.
   * @param {number} bucketCount - The amount of buckets to create.
   * @returns {HTMLElement} The created health bar element.
   */
  function createHealthBar(items, bucketCount) {
    const healthBar = document.createElement("div");
    healthBar.className =
      "healthbar d-flex flex-row border rounded p-1 gap-1 bg-body-secondary m-auto";

    if (items.length === 0) {
      return healthBar;
    }

    const timestamps = items.map((item) => new Date(item.timestamp));
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const totalHours = (maxTimestamp - minTimestamp) / (1000 * 60 * 60); // Difference in hours
    const bucketSize = totalHours / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      start: new Date(minTimestamp + i * bucketSize * 60 * 60 * 1000),
      end: new Date(minTimestamp + (i + 1) * bucketSize * 60 * 60 * 1000),
      state: "Unknown",
    }));

    items.forEach((pulse) => {
      const from = new Date(pulse.timestamp);
      const to = new Date(pulse.timestamp);
      buckets.forEach((bucket) => {
        if (from < bucket.end && to > bucket.start) {
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
