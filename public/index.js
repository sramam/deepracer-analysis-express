
function trackSwitched() {
    const trackSelector = document.getElementById('track');
    const showTrackClassification = document.getElementById('show-track-classification');
    return d3.json(`/tracks/${trackSelector.value}`)
        .then((track) => processTrack(track))
        .then((track) => trackClassification(track))
        .then((track) => drawTrack(track, showTrackClassification.checked))
        .catch(console.log);
}

function processTrack(trackData) {
    const { xmin, xmax, ymin, ymax, inner, outer, center } =
        trackData.reduce(({ xmin, xmax, ymin, ymax, center, inner, outer }, d) => {
            [cx, cy, ix, iy, ox, oy] = d;
            center.push({ x: cx, y: cy });
            inner.push({ x: ix, y: iy });
            outer.push({ x: ox, y: oy });
            return {
                xmin: Math.min(xmin, cx, ix, ox),
                xmax: Math.max(xmax, cx, ix, ox),
                ymin: Math.min(ymin, cy, iy, oy),
                ymax: Math.max(ymax, cy, iy, oy),
                center,
                inner,
                outer,
            }
        }, { xmin: 0, xmax: 0, ymin: 0, ymax: 0, center: [], inner: [], outer: [] });
    return {
        trackData,
        xmin,
        xmax,
        ymin,
        ymax,
        center,
        inner,
        outer,
    };
}

function drawTrack(trackDetails, showTrackClassification) {
    const {
        xmin,
        xmax,
        ymin,
        ymax,
        center,
        inner,
        outer,
    } = trackDetails;
    const xdomain = (xmax - xmin);
    const ydomain = (ymax - ymin);
    const margin = {
        top: 30,
        left: 30,
        right: 10,
        bottom: 100
    }, width = 1000 - margin.left - margin.right,
        height = parseInt(((1000 * ydomain / xdomain) + 100) / 100) * 100 - margin.top - margin.bottom;

    // remove previous svg here.
    d3.select("#track-area").select("svg").remove();
    const svg = d3
        .select("#track-area")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
    const xScale = d3.scaleLinear()
        .domain([xmin, xmax])
        .range([0, width])
    const yScale = d3.scaleLinear()
        .domain([ymin, ymax])
        .range([height, 0])
    const xAxisCall = d3.axisBottom(xScale)
    const yAxisCall = d3.axisLeft(yScale)
        .tickFormat((d) => d);
    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxisCall);
    g.append("g")
        .attr("class", "y axis")
        .call(yAxisCall);

    // g.append("rect")
    //     .attr("x", xScale(xmin))
    //     .attr("y", yScale(ymin))
    //     .attr("height", yScale(ymax - ymin))
    //     .attr('width', xScale(xmax - xmin))
    //     .attr("fill", "green")

    path = d3.line().x((d) => xScale(d.x)).y((d) => yScale(d.y));
    g.append("path")
        .attr("class", "outer-line")
        .attr("fill-opacity", "1.0")
        .attr("stroke", "grey")
        .attr("stroke-width", "3")
        .attr("d", path(outer));

    g.append("path")
        .attr("class", "inner-line")
        .attr("fill-opacity", "1.0")
        .attr("fill", "green")
        .attr("stroke", "grey")
        .attr("stroke-width", "3")
        .attr("d", path(inner));

    g.append("path")
        .attr("class", "center-line")
        .attr("fill-opacity", "0")
        .attr("stroke", "orange")
        .attr("d", path(center));

    const { classification } = trackDetails;
    console.log({showTrackClassification})
    if (classification && showTrackClassification) {
        g.selectAll("classify")
            .data(classification)
            .enter()
            .append("text")
            .text((d) => ({
                'LEFT': 'L',
                'RIGHT': 'R',
                'STRAIGHT': "S"
            }[d.turn]))
            .attr('x', (d) => xScale(d.x))
            .attr('y', (d) => yScale(d.y))
            .attr('fill', 'white' /* (d) => ({
                'LEFT': 'blue',
                'RIGHT': 'purple',
                'STRAIGHT': "pink"
            }[d.turn]) */)
            .attr('font-size', "0.5em")
    }
    return trackDetails;
}

function displayClassification(trackData) {
}

function angle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
}

function trackClassification(trackDetails, debug = false) {
    const { center: waypoints } = trackDetails;

    const classification = waypoints.map((p0, idx, arr) => {
        const p1 = waypoints[(idx + 1) % waypoints.length];
        const p3 = waypoints[(idx + 3) % waypoints.length];
        const a1 = angle(p0, p1);
        const a3 = angle(p0, p3);
        let diff = (a1 - a3);
        diff = Math.min(diff % 360, 360 - (diff % 360));
        const turn = diff < -1
            ? 'LEFT'
            : diff > 1
                ? 'RIGHT'
                : 'STRAIGHT';
        return { ...p0, idx, turn, a1, a3, diff, p0, p1, p3 }
    })
        .map((el, idx, arr) => {
            const prev = arr[(arr.length + idx - 1) % arr.length];
            const next = arr[(arr.length + idx + 1) % arr.length];
            if (25 < Math.abs(el.diff)) {
                el.diff = prev.diff;
                el.turn = prev.turn;
            }
            if (el.turn !== prev.turn && el.turn !== next.turn) {
                if (prev.turn === next.turn) {
                    el.diff = prev.diff;
                    el.turn = prev.turn;
                }
            }
            return el;
        });

    if (debug) {
        classification.map(({ x, y, idx, turn, diff, a1, a3 }) => {
            turn = `${turn}        `.slice(0, 8);
            diff = diff < 0
                ? `${diff.toFixed(2)}        `.slice(0, 8)
                : ` ${diff.toFixed(2)}       `.slice(0, 8);
            a1 = a1 < 0
                ? `${a1.toFixed(2)}        `.slice(0, 8)
                : ` ${a1.toFixed(2)}       `.slice(0, 8);
            a3 = a3 < 0
                ? `${a3.toFixed(2)}        `.slice(0, 8)
                : ` ${a3.toFixed(2)}       `.slice(0, 8);
            console.log(`${idx}: ${turn} ${diff} ${a1} ${a3} ${x.toFixed(3)} ${y.toFixed(3)}`);
        });
    }

    return { ...trackDetails, classification };
}
