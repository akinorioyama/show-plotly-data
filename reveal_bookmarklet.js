javascript:(function() {
    const PLOT_CLASS_NAME = "js-plotly-plot";
    const TARGET_PLOT_INDEX = 0;
    const OUTPUT_CONTAINER_ID = "plotlySmartFilteredDataOutput";

    console.log("Bookmarklet: Initializing data extraction with conditional URL filter...");


    const prNumberInput = prompt("Enter GitHub PR number (or leave blank to show all entries):", "");

    let targetUrl = null;
    let filterIsActive = false;
    let displayFilterInfo = "All Entries";

    if (prNumberInput === null) {
        alert("Operation cancelled by user.");
        console.log("Operation cancelled by user.");
        return;
    }

    if (prNumberInput.trim() !== "") {
        const parsedNum = parseInt(prNumberInput, 10);
        if (!isNaN(parsedNum) && prNumberInput.match(/^\d+$/) ) {
            targetUrl = `https://github.com/team-mirai/policy/pull/${parsedNum}`;
            filterIsActive = true;
            displayFilterInfo = `URL: ${targetUrl}`;
            alert(`Will filter for ${displayFilterInfo}`);
            console.log(`Filtering for ${displayFilterInfo}`);
        } else {
            alert("Invalid Pull Request number. Please enter a whole number for filtering, or leave blank for all.");
            console.error("Invalid PR number entered (non-empty, non-numeric, or non-integer).");
            return;
        }
    } else {
        alert("No URL filter applied. Showing all entries from processed traces.");
        console.log("Showing all entries from processed traces (no URL filter).");
    }


    const plotElements = document.getElementsByClassName(PLOT_CLASS_NAME);
    let gd;

    if (plotElements.length > TARGET_PLOT_INDEX) {
        gd = plotElements[TARGET_PLOT_INDEX];
    } else {
        alert(`Plotly plot with class "${PLOT_CLASS_NAME}" (index ${TARGET_PLOT_INDEX}) not found on this page.`);
        console.error(`Plotly plot with class "${PLOT_CLASS_NAME}" (index ${TARGET_PLOT_INDEX}) not found.`);
        return;
    }

    if (!gd || !gd.data || !Array.isArray(gd.data)) {
        alert("The identified Plotly graph div does not have a valid '.data' array property.");
        console.error("The identified Plotly graph div does not have a valid '.data' array property. gd:", gd);
        return;
    }

    let htmlOutputString = "";
    let dataFoundAndProcessed = false;

    try {
        const traces = gd.data;

        for (let i = 0; i < traces.length; i += 2) {
            const trace = traces[i];
            const traceName = trace.name || `Unnamed Trace ${i}`;
            let traceHtmlContent = "";
            let pointsInThisTraceMatchedOrDisplayed = false;
            console.log(`Processing EVEN-INDEXED trace ${i}: ${traceName}`);

            let numPoints = 0;
            if (trace.x && Array.isArray(trace.x)) numPoints = trace.x.length;
            else if (trace.y && Array.isArray(trace.y)) numPoints = trace.y.length;
            else if (trace.labels && Array.isArray(trace.labels)) numPoints = trace.labels.length;
            else if (trace.customdata && Array.isArray(trace.customdata)) numPoints = trace.customdata.length;
            else if (trace.text && Array.isArray(trace.text)) numPoints = trace.text.length;
            else {
                console.warn(`Could not determine point count for trace ${i}. Skipping this trace.`);
                continue;
            }

            if (numPoints === 0) {
                console.log(`Trace ${i} has no data points to process.`);
                continue;
            }

            for (let j = 0; j < numPoints; j++) {
                let argIdValue = "N/A";
                let urlValue = "N/A";
                let pointTextValue = "N/A";
                let currentPointMatchesFilter = false;

                if (trace.customdata && Array.isArray(trace.customdata) && j < trace.customdata.length) {
                    const customDataItem = trace.customdata[j];
                    if (customDataItem && typeof customDataItem === 'object') {
                        urlValue = customDataItem.url !== undefined ? String(customDataItem.url) : "N/A (url missing)";
                        argIdValue = customDataItem.arg_id !== undefined ? customDataItem.arg_id : "N/A (arg_id missing)";
                    }
                }

                if (!filterIsActive || (filterIsActive && urlValue === targetUrl)) {
                    currentPointMatchesFilter = true;
                }

                if (currentPointMatchesFilter) {
                    pointsInThisTraceMatchedOrDisplayed = true;
                    dataFoundAndProcessed = true;

                    if (trace.text && Array.isArray(trace.text) && j < trace.text.length) {
                        pointTextValue = trace.text[j];
                    } else if (trace.text && !Array.isArray(trace.text) && numPoints === 1 && j === 0) {
                        pointTextValue = trace.text;
                    } else {
                        pointTextValue = "N/A (no text for point)";
                    }

                    traceHtmlContent += `<li>Point ${j + 1} (in original trace): ` +
                                        `<strong>arg_id:</strong> ${escapeHtml(argIdValue)}, ` +
                                        `<strong>url:</strong> <a href="${escapeHtml(urlValue)}" target="_blank" rel="noopener noreferrer">${escapeHtml(urlValue)}</a>, ` +
                                        `<strong>text:</strong> ${pointTextValue}` +
                                        `</li>`;
                }
            }

            if (pointsInThisTraceMatchedOrDisplayed) {
                htmlOutputString += `<h3>Trace ${i}: ${escapeHtml(traceName)} (Even Index)</h3><ul>${traceHtmlContent}</ul>`;
            }

        }

        if (!dataFoundAndProcessed) {
            if (filterIsActive) {
                alert(`No entries found matching ${displayFilterInfo} in the even-indexed traces.`);
            } else {
                alert(`No data found in any of the even-indexed traces to display.`);
            }
            console.log("No relevant entries found based on filter or data availability.");
            return;
        }

        let outputContainer = document.getElementById(OUTPUT_CONTAINER_ID);
        if (!outputContainer) {
            outputContainer = document.createElement('div');
            outputContainer.id = OUTPUT_CONTAINER_ID;
            outputContainer.style.border = "2px solid #8e44ad";
            outputContainer.style.padding = "15px";
            outputContainer.style.marginTop = "20px";
            outputContainer.style.fontFamily = "Arial, sans-serif";
            outputContainer.style.fontSize = "14px";
            outputContainer.style.backgroundColor = "#f4e_f_6f";
            outputContainer.style.lineHeight = "1.6";
            document.body.appendChild(outputContainer);
            console.log(`Created new output container div with ID: ${OUTPUT_CONTAINER_ID}`);
        } else {
            console.log(`Using existing output container div with ID: ${OUTPUT_CONTAINER_ID}`);
        }

        outputContainer.innerHTML = `<h2>Extracted Plotly Data (Even-Indexed Traces, Filter: ${escapeHtml(displayFilterInfo)})</h2>${htmlOutputString}`;
        alert(`Data extraction complete (Filter: ${displayFilterInfo}). Appended to document (ID: '${OUTPUT_CONTAINER_ID}').`);
        console.log(`Data extraction complete. Appended to div ID: ${OUTPUT_CONTAINER_ID}`);
        outputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });

    } catch (error) {
        alert("An error occurred while extracting Plotly data: " + error.message + "\nCheck the console for more details.");
        console.error("Error extracting or appending Plotly data:", error);
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            if (unsafe === null || unsafe === undefined) return '';
            try {
                unsafe = String(unsafe);
            } catch (e) { return ''; }
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
})();