/**
 * @typedef {Object} LogItem
 * @property {string} state - The state of the pulse check (e.g., "Healthy", "Unhealthy", "Degraded" or "Unknown").
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
"use strict";

(async function () {
  /** @type {string} */
  let currentSqid = null;

  function fetchData(continuationToken) {
    let url = `https://localhost:7010/pulseguard/api/1.0/pulses/application/${currentSqid}?pageSize=10`;
    if (continuationToken) {
      url = `${url}&continuationToken=${continuationToken}`;
    }

    fetch(url)
      .then((response) => {
        /** @type {LogModel} */
        const data = response.json();
        return data;
      })
      .then((data) => {
        handleLoadMoreButton(data.continuationToken);
        handleData(data.items);
      });
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
      loadMoreButton.id = 'detail-card-open-log-more';
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
          errorCell.textContent = "⚠️";
          errorCell.setAttribute("data-toggle", "tooltip");
          errorCell.setAttribute("title", item.error);
          errorCell.style.verticalAlign = "middle";
          new bootstrap.Tooltip(errorCell);

          errorCell.addEventListener("click", () => {
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
                toast.toastClass = "text-bg-success";
                bootstrap.showToast(toast);
              })
              .catch((err) => {
                toast.header = "❌ PulseGuard";
                toast.body = "Failed to copy error message";
                toast.toastClass = "text-bg-danger";
                bootstrap.showToast(toast);
                console.error("Failed to copy error message: ", err);
              });
          });

          errorCell.style.cursor = "pointer";
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

  document
    .querySelector("#detail-card-open-log-action")
    .addEventListener("click", () => {
      const logEntries = document.querySelector(
        "#detail-card-open-log-entries"
      );
      logEntries.innerHTML = "";
      const loadMoreButton = document.querySelector("#detail-card-open-log-more");
      if (loadMoreButton) {
        loadMoreButton.remove();
      }
      fetchData();
    });

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
})();
