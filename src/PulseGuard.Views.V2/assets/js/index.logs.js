"use strict";

/**
 * @typedef {Object} LogItem
 * @property {string} state - The state of the pulse check (e.g., "Healthy", "Unhealthy", "Degraded", "TimedOut" or "Unknown").
 * @property {string} message - The message associated with the pulse check.
 * @property {string} from - The start time of the pulse check period in ISO 8601 format.
 * @property {string} to - The end time of the pulse check period in ISO 8601 format.
 * @property {string} [error] - The error message if the pulse check failed (optional).
 */

/**
 * @typedef {Object} LogModel
 * @property {string} id - The unique identifier for the log.
 * @property {string} name - The name of the log.
 * @property {LogItem[]} items - The list of log items.
 */

(async function () {
  /** @type {string} */
  let currentSqid = null;

  /**
   * Fetches data from the PulseGuard API and processes it.
   *
   * @param {string} [continuationToken] - The token to fetch the next set of results.
   * @returns {Promise<void>} A promise that resolves when the data has been fetched and processed.
   */
  function fetchData(continuationToken) {
    let url = `api/1.0/pulses/application/${currentSqid}?pageSize=10`;
    if (continuationToken) {
      url = `${url}&continuationToken=${continuationToken}`;
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        handleLoadMoreButton(data.continuationToken);
        fillMissingData(data.items);
        handleData(data.items);
      })
      .catch((error) => {
        console.error("Failed to fetch data: ", error);
      });
  }

  /**
   * Fills in missing data between items in the provided array.
   * If there is a gap between the 'to' time of one item and the 'from' time of the next item,
   * a new item with state "Unknown" and a message indicating no pulse checks were done is inserted.
   *
   * @param {Array<LogItem>} items - The array of items to process.
   */
  function fillMissingData(items) {
    for (let i = 0; i < items.length - 1; i++) {
      const currentItem = items[i];
      const nextItem = items[i + 1];

      const currentFrom = new Date(currentItem.from);
      const nextTo = new Date(nextItem.to);
      currentFrom.setSeconds(0, 0);
      nextTo.setSeconds(0, 0);

      if (currentFrom.getTime() !== nextTo.getTime()) {
        const missingItem = {
          state: "Unknown",
          message: "No Pulse checks were done during this timeframe.",
          from: nextItem.to,
          to: currentItem.from,
        };
        items.splice(i + 1, 0, missingItem);
      }
    }
  }

  /**
   * Handles the creation and functionality of the "Load More" button.
   * If a continuation token is provided, it creates a button that, when clicked,
   * fetches more data and removes itself from the DOM.
   *
   * @param {string} continuationToken - The token used to determine if more data is available.
   */
  function handleLoadMoreButton(continuationToken) {
    if (continuationToken) {
      const loadMoreButton = document.createElement("button");
      loadMoreButton.id = "detail-card-open-log-more";
      loadMoreButton.textContent = "Load More";
      loadMoreButton.addEventListener("click", () => {
        fetchData(continuationToken);
        loadMoreButton.remove();
      });
      loadMoreButton.className = "btn btn-primary m-3";
      document
        .querySelector("#detail-card-open-log")
        .appendChild(loadMoreButton);
    }
  }

  /**
   * Handles the provided data items and populates a table with log entries.
   * Each log entry includes from and to dates, duration, state, message, and error information.
   *
   * @param {Array<LogItem>} items - The array of log entry objects.
   */
  function handleData(items) {
    const table = document.querySelector("#detail-card-open-log-entries");
    if (table) {
      items.forEach((item) => {
        const fromDate = new Date(item.from);
        const toDate = new Date(item.to);

        const row = document.createElement("tr");

        const fromCell = document.createElement("td");
        fromCell.textContent = fromDate.toLocaleString();
        row.appendChild(fromCell);

        const toCell = document.createElement("td");
        toCell.textContent = toDate.toLocaleString();
        row.appendChild(toCell);

        const durationCell = document.createElement("td");
        durationCell.textContent = getReadableTimeDifference(fromDate, toDate);
        row.appendChild(durationCell);
        const stateCell = document.createElement("td");
        stateCell.textContent = item.state;

        switch (item.state) {
          case "Healthy":
            stateCell.className = "fw-bold text-success";
            break;
          case "Unhealthy":
            stateCell.className = "fw-bolder fst-italic text-danger";
            break;
          case "TimedOut":
            stateCell.className = "fw-bolder fst-italic text-pink";
            break;
          case "Degraded":
            stateCell.className = "fw-bold text-warning";
            break;
          default:
            stateCell.className = "fst-italic text-secondary";
            break;
        }

        row.appendChild(stateCell);

        const messageCell = document.createElement("td");
        messageCell.textContent = item.message;
        row.appendChild(messageCell);

        const errorCell = document.createElement("td");
        if (item.error) {
          const icon = document.createElement("i");
          icon.className = "bi bi-exclamation-triangle-fill";
          icon.setAttribute("role", "button");
          icon.addEventListener("click", () => {
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

            navigator.clipboard
              .writeText(item.error)
              .then(() => {
                toast.header = "✅ PulseGuard";
                toast.body = "Error message copied to clipboard";
                toast.toastClass = "toast-success";
                bootstrap.showToast(toast);
              })
              .catch((err) => {
                toast.header = "❌ PulseGuard";
                toast.body = "Failed to copy error message";
                toast.toastClass = "toast-danger";
                bootstrap.showToast(toast);
                console.error("Failed to copy error message: ", err);
              });
          });

          icon.setAttribute("data-bs-toggle", "tooltip");
          icon.setAttribute("data-bs-custom-class", "pre-tooltip");
          icon.setAttribute("title", item.error);
          new bootstrap.Tooltip(icon);

          errorCell.appendChild(icon);
          errorCell.classList.add("align-middle");
        } else {
          errorCell.textContent = "";
        }
        row.appendChild(errorCell);

        table.appendChild(row);
      });
    } else {
      console.error("Error getting detail-card-open-log-entries");
    }
  }

  /**
   * Calculates the readable time difference between two dates.
   *
   * @param {Date} from - The start date.
   * @param {Date} to - The end date.
   * @returns {string} A human-readable string representing the time difference.
   *
   * @example
   * // Returns "1 year, 2 weeks, 3 days, 4 hours, 5 minutes, 6 seconds"
   * getReadableTimeDifference(new Date('2020-01-01'), new Date('2021-01-15T04:05:06'));
   */
  function getReadableTimeDifference(from, to) {
    const diffInMilliseconds = Math.abs(to - from);
    const seconds = Math.floor(diffInMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const years = Math.floor(weeks / 52);

    const timeParts = [
      { label: "year", value: years },
      { label: "week", value: weeks % 52 },
      { label: "day", value: days % 7 },
      { label: "hour", value: hours % 24 },
      { label: "minute", value: minutes % 60 },
      { label: "second", value: seconds % 60 },
    ];

    const nonZeroTimeParts = timeParts.filter((part) => part.value > 0);
    const formattedTime = nonZeroTimeParts
      .map((part) => `${part.value} ${part.label}${part.value > 1 ? "s" : ""}`)
      .join(", ");

    return formattedTime;
  }

  /**
   * Sets up the log button by adding a click event listener to it.
   * When the button is clicked, it clears the log entries, removes the load more button,
   * fetches new data, and enables the button if it was disabled.
   *
   * @function
   * @name hookUpLogButton
   * @returns {void}
   */
  function hookUpLogButton() {
    const logActionButton = document.querySelector(
      "#detail-card-open-log-action"
    );
    if (logActionButton) {
      logActionButton.addEventListener("click", () => {
        const logEntries = document.querySelector(
          "#detail-card-open-log-entries"
        );
        if (logEntries) {
          logEntries.innerHTML = "";
        }
        const loadMoreButton = document.querySelector(
          "#detail-card-open-log-more"
        );
        if (loadMoreButton) {
          loadMoreButton.remove();
        }
        fetchData();
      });
      logActionButton.removeAttribute("disabled");
      new bootstrap.Tooltip(logActionButton);
    } else {
      console.error("Error getting detail-card-open-log-action");
    }
  }

  /**
   * Handles changes to the query parameters in the URL.
   * Specifically, it checks for the presence of the "details" parameter.
   * If the "details" parameter is present and has changed, it updates the currentSqid
   * and clears the content of the detailCardLogEntries element.
   * If the "details" parameter is not present, it clears the content of the detailCardLogEntries element.
   */
  function handleQueryParamChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const sqid = urlParams.get("details");
    const detailCardLogEntries = document.querySelector(
      "#detail-card-open-log-entries"
    );

    if (sqid) {
      if (currentSqid !== sqid) {
        currentSqid = sqid;
        if (detailCardLogEntries) {
          detailCardLogEntries.innerHTML = "";
        } else {
          console.error("Error getting detail-card-container");
        }
      }
    } else {
      if (detailCardLogEntries) {
        detailCardLogEntries.innerHTML = "";
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

  hookUpLogButton();
})();
