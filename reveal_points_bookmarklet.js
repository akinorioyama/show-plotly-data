javascript:(function() {
    const PLOT_CLASS_NAME = "js-plotly-plot";
    const SVG_CONTAINER_CLASS = "main-svg";
    const TARGET_PLOT_INDEX = 0;
    const TARGET_SVG_INDEX = 2;
    const OUTPUT_CONTAINER_ID = "plotlySmartFilteredDataOutput";
    const CIRCLE_INDICATOR_CLASS = "dynamic-indicator-circle";

    function drawCircleForPoint(plot, svgContainer, traceIndex, pointIndex) {
        try {
            const xAxisRange = plot.layout.xaxis.range;
            const yAxisRange = plot.layout.yaxis.range;
            const targetDataPoint = {
                x: plot._fullData[traceIndex].x[pointIndex],
                y: plot._fullData[traceIndex].y[pointIndex]
            };
            const svgRect = svgContainer.getBoundingClientRect();
            if (!xAxisRange || !yAxisRange || targetDataPoint.x === undefined || targetDataPoint.y === undefined) return;
            const xProportion = (targetDataPoint.x - xAxisRange[0]) / (xAxisRange[1] - xAxisRange[0]);
            const yProportion = (targetDataPoint.y - yAxisRange[0]) / (yAxisRange[1] - yAxisRange[0]);
            const pixelX = xProportion * svgRect.width;
            const pixelY = svgRect.height - (yProportion * svgRect.height);
            const svgNS = 'http://www.w3.org/2000/svg';
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('class', CIRCLE_INDICATOR_CLASS);
            circle.setAttribute('cx', pixelX);
            circle.setAttribute('cy', pixelY);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', 'rgba(255, 165, 0, 0.8)');
            circle.setAttribute('stroke', 'black');
            circle.setAttribute('stroke-width', '2');
            circle.style.pointerEvents = 'none';
            svgContainer.appendChild(circle);
        } catch (error) {
            console.error(`Failed to draw circle for trace ${traceIndex}, point ${pointIndex}:`, error);
        }
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            if (unsafe === null || unsafe === undefined) return '';
            try {
                unsafe = String(unsafe);
            } catch (e) {
                return '';
            }
        }
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    const prNumberInput = prompt("Enter GitHub PR number (or leave blank for all):", "");
    let targetUrl = null;
    let filterIsActive = false;
    let displayFilterInfo = "All Entries";
    if (prNumberInput === null) {
        alert("Operation cancelled.");
        return;
    }
    if (prNumberInput.trim() !== "") {
        const parsedNum = parseInt(prNumberInput, 10);
        if (!isNaN(parsedNum) && prNumberInput.match(/^\d+$/)) {
            targetUrl = `https://github.com/team-mirai/policy/pull/${parsedNum}`;
            filterIsActive = true;
            displayFilterInfo = `URL: ${targetUrl}`;
            alert(`Will filter for ${displayFilterInfo}`);
        } else {
            alert("Invalid Pull Request number.");
            return;
        }
    } else {
        alert("No URL filter applied.");
    }
    const plotElement = document.getElementsByClassName(PLOT_CLASS_NAME)[TARGET_PLOT_INDEX];
    const svgContainer = document.getElementsByClassName(SVG_CONTAINER_CLASS)[TARGET_SVG_INDEX];
    if (!plotElement || !plotElement.data) {
        alert("Plotly graph not found or invalid.");
        return;
    }
    if (!svgContainer) {
        alert(`Could not find the target SVG container (index ${TARGET_SVG_INDEX}) with class "${SVG_CONTAINER_CLASS}". Circles will not be drawn.`);
    }
    try {
        const filteredPoints = [];
        let htmlOutputString = "";
        const traces = plotElement.data;
        for (let i = 0; i < traces.length; i += 2) {
            const trace = traces[i];
            const traceName = trace.name || `Unnamed Trace ${i}`;
            let traceHtmlContent = "";
            let pointsInThisTraceMatched = false;
            const numPoints = (trace.x && Array.isArray(trace.x)) ? trace.x.length : 0;
            for (let j = 0; j < numPoints; j++) {
                const customdata = trace.customdata && trace.customdata[j] ? trace.customdata[j] : {};
                const urlValue = String(customdata.url || "");
                if (!filterIsActive || urlValue === targetUrl) {
                    pointsInThisTraceMatched = true;
                    filteredPoints.push({
                        traceIndex: i,
                        pointIndex: j
                    });
                    const argIdValue = customdata.arg_id !== undefined ? customdata.arg_id : "N/A";
                    const pointTextValue = (trace.text && Array.isArray(trace.text) && j < trace.text.length) ? trace.text[j] : "N/A";
                    traceHtmlContent += `<li>Point ${j + 1} (Trace ${i}): ` +
                        `<strong>arg_id:</strong> ${escapeHtml(argIdValue)}, ` +
                        `<strong>url:</strong> <a href="${escapeHtml(urlValue)}" target="_blank" rel="noopener noreferrer">${escapeHtml(urlValue)}</a>, ` +
                        `<strong>text:</strong> ${pointTextValue}` +
                        `</li>`;
                }
            }
            if (pointsInThisTraceMatched) {
                htmlOutputString += `<h3>Trace ${i}: ${escapeHtml(traceName)}</h3><ul>${traceHtmlContent}</ul>`;
            }
        }
        if (filteredPoints.length === 0) {
            alert(`No entries found matching filter.`);
            return;
        }
        const redrawCircles = () => {
            if (!svgContainer) return;
            document.querySelectorAll(`.${CIRCLE_INDICATOR_CLASS}`).forEach(c => c.remove());
            for (const point of filteredPoints) {
                drawCircleForPoint(plotElement, svgContainer, point.traceIndex, point.pointIndex);
            }
        };
        redrawCircles();
        plotElement.on('plotly_relayout', redrawCircles);
        let outputContainer = document.getElementById(OUTPUT_CONTAINER_ID);
        if (!outputContainer) {
            outputContainer = document.createElement('div');
            outputContainer.id = OUTPUT_CONTAINER_ID;
            outputContainer.style.cssText = "border:2px solid #8e44ad; padding:15px; margin-top:20px; font-family:Arial,sans-serif; background-color:#f4e6f7;";
            document.body.appendChild(outputContainer);
        }
        outputContainer.innerHTML = `<h2>Tracked Points (Filter: ${escapeHtml(displayFilterInfo)})</h2>${htmlOutputString}`;
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } catch (error) {
        alert("An error occurred: " + error.message);
        console.error("Error during bookmarklet execution:", error);
    }
})();