document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#learning-search");
    const clearSearchButton = document.querySelector("#clear-search");
    const resetFiltersButton = document.querySelector("#reset-filters");
    const resultCount = document.querySelector("#result-count");
    const noResults = document.querySelector("#no-results");
    const futureEntry = document.querySelector("#future-entry");
    const cards = Array.from(document.querySelectorAll('[data-entry="learning"]'));
    const filterGroups = Array.from(document.querySelectorAll("[data-filter-group]"));

    if (!searchInput || cards.length === 0) {
        return;
    }

    const state = {
        query: "",
        category: "all",
        status: "all"
    };

    const normalize = (value) => value.trim().toLocaleLowerCase("zh-CN");

    const isFiltering = () => (
        state.query !== "" ||
        state.category !== "all" ||
        state.status !== "all"
    );

    const updateActiveChip = (group, selectedValue) => {
        group.querySelectorAll("[data-filter-value]").forEach((button) => {
            const active = button.dataset.filterValue === selectedValue;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    };

    const render = () => {
        let visibleCount = 0;

        cards.forEach((card) => {
            const searchableText = normalize(card.dataset.search || card.textContent || "");
            const categories = (card.dataset.category || "").split(/\s+/).filter(Boolean);
            const matchesQuery = state.query === "" || searchableText.includes(state.query);
            const matchesCategory = state.category === "all" || categories.includes(state.category);
            const matchesStatus = state.status === "all" || card.dataset.status === state.status;
            const visible = matchesQuery && matchesCategory && matchesStatus;

            card.hidden = !visible;
            if (visible) {
                visibleCount += 1;
            }
        });

        const active = isFiltering();
        const queryLabel = active ? `，当前显示 ${visibleCount} 项` : "";
        resultCount.textContent = `共 ${cards.length} 项学习记录${queryLabel}`;
        noResults.hidden = visibleCount !== 0;
        futureEntry.hidden = active;
        resetFiltersButton.hidden = !active;
        clearSearchButton.hidden = state.query === "";
    };

    const resetAll = () => {
        state.query = "";
        state.category = "all";
        state.status = "all";
        searchInput.value = "";

        filterGroups.forEach((group) => {
            updateActiveChip(group, "all");
        });

        render();
        searchInput.focus();
    };

    searchInput.addEventListener("input", (event) => {
        state.query = normalize(event.target.value);
        render();
    });

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && searchInput.value !== "") {
            state.query = "";
            searchInput.value = "";
            render();
        }
    });

    clearSearchButton.addEventListener("click", () => {
        state.query = "";
        searchInput.value = "";
        render();
        searchInput.focus();
    });

    filterGroups.forEach((group) => {
        const groupName = group.dataset.filterGroup;

        group.addEventListener("click", (event) => {
            const button = event.target.closest("[data-filter-value]");
            if (!button || !group.contains(button)) {
                return;
            }

            state[groupName] = button.dataset.filterValue;
            updateActiveChip(group, state[groupName]);
            render();
        });
    });

    resetFiltersButton.addEventListener("click", resetAll);
    render();
});