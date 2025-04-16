"use strict";

(function () {
  /**
   * @typedef {Object} PulseItem
   * @property {string} state
   * @property {string} message
   * @property {string} from
   * @property {string} to
   */

  /**
   * @typedef {Object} PulseGroupItem
   * @property {string} id
   * @property {string} name
   * @property {PulseItem[]} items
   */

  /**
   * @typedef {Object} PulseGroup
   * @property {string} group
   * @property {PulseGroupItem[]} items
   */

  fetch("../api/1.0/pulses")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      /** @type {PulseGroup[]} */
      const data = response.json();
      return data;
    })
    .then((data) => {
      handleData(data);
      const urlParams = new URLSearchParams(window.location.search);
      const detailsId = urlParams.get("details");
      showDetailsForId(data, detailsId);
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });

  /**
   * Handles the data by sorting, formatting, and displaying it.
   * @param {PulseGroup[]} data - The data to handle.
   */
  function handleData(data) {
    const overviewCard = document.querySelector("#overview-card");
    if (!overviewCard) {
      console.error("Error getting overview-card");
      return;
    }

    if (!data) {
      overviewCard.innerHTML = "Error loading...";
      return undefined;
    }

    sortAndFormatData(data);

    overviewCard.innerHTML = "";

    const listGroup = createListGroup(data);
    overviewCard.appendChild(listGroup);
  }

  /**
   * Sorts and formats the data.
   * @param {PulseGroup[]} data - The data to sort and format.
   */
  function sortAndFormatData(data) {
    data.sort((a, b) => {
      if (a.group === "") return 1;
      if (b.group === "") return -1;
      return a.group.localeCompare(b.group);
    });

    data.forEach((group) => {
      group.id =
        "group-" + group.group.toLowerCase().replaceAll(/[\s\.]/g, "-");
      group.items.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  /**
   * Creates a list group element from the given groups.
   * @param {PulseGroup[]} groups - The groups to create the list from.
   * @returns {HTMLElement} The created list group element.
   */
  function createListGroup(groups) {
    const list = document.createElement("div");
    list.id = "pulse-list-group";
    list.className =
      "list-group list-group-flush pulse-selection d-flex flex-grow-1 overflow-auto";

    groups.forEach((group) => {
      if (!!group.group) {
        createListGroupEntry(group, group.group, group.id, group.id, false);
      }

      group.items.forEach((groupItem) => {
        createListGroupEntry(
          groupItem,
          groupItem.name,
          groupItem.id,
          group.id,
          group.group
        );
      });
    });

    return list;

    /**
     * Creates a list group entry element.
     * @param {PulseGroup | PulseGroupItem} item - The item to create the entry for.
     * @param {string} text - The text to display.
     * @param {string} id - The id of the entry.
     * @param {string} toggleGroup - The group to toggle.
     * @param {boolean} indentGroup - Whether to indent the group.
     */
    function createListGroupEntry(item, text, id, toggleGroup, indentGroup) {
      const a = document.createElement("a");
      a.className =
        "list-group-item list-group-item-action rounded d-flex flex-row overflow-hidden";

      if ("group" in item) {
        a.href = "#";
        a.classList.add("pulse-grouping");
        a.addEventListener("click", (e) => {
          e.preventDefault();
          document
            .querySelectorAll(".pulse-selection-" + toggleGroup)
            .forEach((x) => {
              x.classList.toggle("d-none");
            });
        });
      } else {
        a.href = "#" + id;
        a.id = "pulse-selection-" + id;
        a.addEventListener("click", (event) => {
          event.preventDefault();
          showDetails(item, indentGroup);
        });

        if (!!indentGroup) {
          a.classList.add("pulse-child");
          a.classList.add("pulse-selection-" + toggleGroup);
          a.classList.add("d-none");
        } else {
          a.classList.add("pulse-parent");
        }
      }

      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      textSpan.className = "flex-grow-1 d-inline-block text-truncate me-4";

      textSpan.setAttribute("data-bs-toggle", "tooltip");
      textSpan.setAttribute("data-bs-placement", "right");
      textSpan.setAttribute("data-bs-custom-class", "d-lg-none");
      textSpan.setAttribute("data-bs-title", text);
      new bootstrap.Tooltip(textSpan);

      const icon = document.createElement("i");
      icon.className = "bi me-2";

      if ("group" in item) {
        icon.classList.add("bi-heart-pulse");
      } else {
        icon.classList.add("bi-activity");
      }

      const getLastState = (item) => {
        if ("group" in item) {
          const states = new Set(
            item.items.map((entry) => getLastState(entry))
          );

          if (states.size === 1) {
            return Array.from(states)[0];
          }

          return "Degraded";
        }

        if (item.items && item.items.length > 0) {
          return item.items[0].state;
        }

        return "Unknown";
      };

      const lastState = getLastState(item);
      if (lastState === "Healthy") {
        icon.classList.add("text-success");
      } else if (lastState === "Degraded") {
        icon.classList.add("text-warning");
      } else if (lastState === "Unhealthy") {
        icon.classList.add("text-danger");
      } else if (lastState === "TimedOut") {
        icon.classList.add("text-pink");
      } else {
        icon.classList.add("text-secondary");
      }

      if (!!indentGroup) {
        icon.classList.add("ms-4");
      }

      a.appendChild(icon);
      a.appendChild(textSpan);

      const healthbar = createHealthBar(item);
      if (healthbar.lastChild.classList.contains("text-bg-success")) {
        a.classList.add("healthy");
      }
      a.appendChild(healthbar);

      list.appendChild(a);
    }

    /**
     * Creates a health bar element for the given item.
     * @param {PulseGroup | PulseGroupItem} item - The item to create the health bar for.
     * @returns {HTMLElement} The created health bar element.
     */
    function createHealthBar(item) {
      const healthBar = document.createElement("div");
      healthBar.className =
        "healthbar-tiny d-flex flex-row border rounded p-1 gap-1 bg-body-secondary m-auto";
      const totalHours = 12;
      const bucketSize = totalHours / 10;
      const now = Date.now() + 60000;
      const buckets = Array.from({ length: 10 }, (_, i) => ({
        start: new Date(now - (totalHours - i * bucketSize) * 60 * 60 * 1000),
        end: new Date(
          now - (totalHours - (i + 1) * bucketSize) * 60 * 60 * 1000
        ),
        state: "Unknown",
      }));

      const pulses =
        "group" in item
          ? item.items.flatMap((groupItem) => groupItem.items)
          : item.items;

      const healthStates = ["Healthy", "Degraded", "Unhealthy", "TimedOut"];

      pulses.forEach((pulse) => {
        const from = new Date(pulse.from);
        const to = new Date(pulse.to);
        buckets.forEach((bucket) => {
          if (from <= bucket.end && to >= bucket.start) {
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
  }

  /**
   * Shows the details for the given item.
   * @param {PulseGroupItem} item - The item to show details for.
   * @param {string} group - The group the item belongs to.
   */
  function showDetails(item, group) {
    const url = new URL(window.location);
    url.searchParams.set("details", item.id);
    window.history.pushState({}, "", url);

    // Set the window title
    document.title = group
      ? `${group} > ${item.name} | PulseGuard`
      : `${item.name} | PulseGuard`;

    // Trigger a custom event
    const event = new Event("pushstate");
    window.dispatchEvent(event);
  }

  function handleQueryParamChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const sqid = urlParams.get("details");

    if (sqid) {
      markPulseAsActive("pulse-selection-" + sqid);
    }
  }

  window.addEventListener("popstate", handleQueryParamChange);
  window.addEventListener("pushstate", handleQueryParamChange);
  window.addEventListener("replacestate", handleQueryParamChange);

  /**
   * Shows the details for the item with the given id.
   * @param {PulseGroup[]} data - The data to search in.
   * @param {string} idToShow - The id of the item to show.
   */
  function showDetailsForId(data, idToShow) {
    let itemToShow;
    let groupToShow;

    if (idToShow) {
      idToShow = idToShow.replace(/^pulse-selection-/, "");

      data.some((group) => {
        if (group.id === idToShow) {
          itemToShow = group;
          return true;
        }

        return group.items.some((item) => {
          if (item.id === idToShow) {
            itemToShow = item;
            groupToShow = group;
            return true;
          }
          return false;
        });
      });
    }

    if (!!itemToShow) {
      showDetails(itemToShow, groupToShow.group);
    }
  }

  /**
   * Marks the pulse with the given id as active.
   * @param {string} id - The id of the pulse to mark as active.
   */
  function markPulseAsActive(id) {
    const activeElement = document.querySelector("a.list-group-item.active");
    if (activeElement) {
      activeElement.classList.remove("active");
    }
    const newActiveElement = document.querySelector("#" + id);
    if (newActiveElement) {
      newActiveElement.classList.add("active");

      const classList = Array.from(newActiveElement.classList);
      const groupClass = classList.find((cls) =>
        cls.startsWith("pulse-selection-group")
      );
      if (groupClass) {
        document.querySelectorAll("." + groupClass).forEach((element) => {
          element.classList.remove("d-none");
        });
      }
    }
  }

  const filterOnButton = document.querySelector("#overview-card-filter-on");
  const filterOffButton = document.querySelector("#overview-card-filter-off");

  if (filterOnButton && filterOffButton) {
    filterOnButton.addEventListener("click", () => {
      const pulseContainer = document.querySelector("#pulse-container");
      if (pulseContainer) {
        pulseContainer.classList.add("filter-not-healthy");
        pulseContainer
          .querySelectorAll("a.pulse-child.d-none")
          .forEach((e) => {
            e.classList.remove("d-none");
          });
      } else {
        console.error("pulse-container was not found");
      }
    });

    filterOffButton.addEventListener("click", () => {
      const pulseContainer = document.querySelector("#pulse-container");
      if (pulseContainer) {
        pulseContainer.classList.remove("filter-not-healthy");
        pulseContainer
          .querySelectorAll("a.pulse-child:not(.d-none)")
          .forEach((e) => {
            e.classList.add("d-none");
          });
      } else {
        console.error("pulse-container was not found");
      }
    });
  } else {
    console.error(
      "overview-card-filter-on or overview-card-filter-off not found."
    );
  }
})();
