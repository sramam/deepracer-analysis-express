
function trackSwitched() {
    window.params = null;
    window.logs = null;
    return redrawTrack(window);
}

refreshHistory = true;

async function processEvaluationLog(contents) {
    contents = contents || document.getElementById("eval-log").value;
    const { params, logs } = contents
        ? await parseLogs(contents.split("\n"))
        : { params: null, logs: [] };
    window.params = params;
    window.logs = logs;
    const trackSelector = document.getElementById('track');
    trackSelector.value = `${params.WORLD_NAME}.json`
    redrawTrack(window);
    document.getElementById("eval-log").value = null;
}

function processTraceDisplay() {
    const preserveControls = true;
    return redrawTrack(window, preserveControls);
}

function redrawTrack({ params, logs }, preserveControls) {
    const showTrackClassification = document.getElementById('show-track-classification');
    const trackSelector = document.getElementById('track');
    // const trackSelector = { value: `${params.WORLD_NAME}.json` };
    if (!preserveControls) {
        displayEvalControls(params);
    }
    return d3.json(`./tracks/${trackSelector.value}`)
        .then((track) => processTrack(track))
        .then((track) => trackClassification(track))
        .then((track) => drawTrack(track, showTrackClassification.checked, params, logs))
        .then((...args) => {
            displayHistory();
            return args;
        })
        .catch(console.error);
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

function drawTrack(trackDetails, showTrackClassification, params, logs) {
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

    path = d3.line().x((d) => xScale(d.x)).y((d) => yScale(d.y));
    g.append("path")
        .attr("class", "outer-line")
        .attr("fill-opacity", "1.0")
        .attr("stroke", "#ddd")
        .attr("stroke-width", "4")
        .attr("d", path(outer));

    g.append("path")
        .attr("class", "inner-line")
        .attr("fill-opacity", "0.7")
        .attr("fill", "green")
        .attr("stroke", "#999")
        .attr("stroke-width", "3")
        .attr("stroke-opacity", "0.5")
        .attr("d", path(inner));

    g.append("path")
        .attr("class", "center-line")
        .attr("fill-opacity", "0")
        .attr("stroke", "orange")
        .style("stroke-dasharray", ("6, 4"))
        .attr("stroke-opacity", "0.5")
        .attr("d", path(center));

    g.append("path")
        .attr("class", "start-line")
        .attr("stroke", "#999")
        .attr("stroke-width", "5")
        .style("stroke-dasharray", ("5, 5"))
        .attr("d", path([inner[0], outer[0]]));

    // g.append("rect")
    //     .attr("x", xScale(xmin))
    //     .attr("y", yScale(ymin))
    //     .attr("height", yScale(ymax - ymin)) //yScale(ymax - ymin))
    //     .attr('width', 30) // yScale(xmax - xmin))
    //     .attr("fill", "red")

    const { classification } = trackDetails;
    if (classification && showTrackClassification) {
        const filtered = classification.map(({ turn, diff, x, y }) => ({ turn, diff: diff.toFixed(2), x: x.toFixed(2), y: y.toFixed(2) }))
        console.log(filtered)
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
    if (params && logs) {
        for (let i = 0; i < params.NUMBER_OF_TRIALS; i++) {
            const evalTrace = document.getElementById(`eval-trace-${i}`);
            if (evalTrace.checked) {
                const [maxReward, minReward] = logs.reduce(([maxReward, minReward], el) => {
                    maxReward = Math.max(maxReward, el.reward);
                    minReward = Math.min(minReward, el.reward);
                    return [maxReward, minReward];
                }, [0, Infinity])
                g.append("path")
                    .attr("class", "center-line")
                    .attr("fill-opacity", "0")
                    .attr("stroke", "yellow")
                    // .style("stroke-dasharray", "0,4")
                    // .style("stroke-dasharray", ("6, 4"))
                    .attr("d", path(logs[i]))
                    .attr("stroke-opacity", "0.5")
                    // .call((p) => p
                    //     .transition()
                    //     .duration(7500)
                    //     .attrTween("stroke-dasharray", () => {
                    //         const l = this.getTotalLength();
                    //         const i = d3.interpolateString("0," + l, l + "," + l);
                    //         return function(t) { return i(t); };
                    //     })
                    // );
            }
        }
    }
    return trackDetails;
}

function displayEvalControls(params) {
    controls = document.getElementById("controls");
    if (params) {
        const checkBoxes = [];
        for (let i = 0; i < params.NUMBER_OF_TRIALS; i++) {
            checkBoxes.push(`
                <label class="md:w-2/3 block text-gray-700 font-bold">
                    <span class="uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                        for="show-track-classification">
                        Eval #${i}
                    </span>
                    <input id=eval-trace-${i} class="mr-2 leading-tight" type="checkbox" id="show-track-classification"
                        onchange="processTraceDisplay()">
                </label>`);
        }

        controls.innerHTML = `
            <div class="w-full">
            <h2 style="font-size:2em">
                ${params.MODEL_NAME}
            </h2>
            <h3 style="font-size:1.5em">
            ${params.WORLD_NAME}
            </h3>
            </div>
            <br/>
            <div class="flex flex-row w-full">
            ${checkBoxes.join("\n")}
            </div>`
    } else {
        controls.innerHTML = ``;
    }
}

function displayHistory() {
    console.log("displayHistory");
    const storedKeys = window.localStorage.getItem("history")
    let history = ``;
    if (storedKeys) {
        console.log({ storedKeys });
        const rows = storedKeys.split(",").map((run_id) => {
            const val = window.localStorage.getItem(run_id);
            if (val) {
                const { start, model, raceType, track, numEvals } = JSON.parse(val);
                return `
                <tr class="hover:bg-gray-100 border-b border-gray-200 py-10">
                    <td class="px-4 py-4">
                      ${model}
                      <span class="text-blue-500 hover:text-blue-800" onclick="loadFromStorage('${run_id}')">
                        (reload)
                      </span>
                    </td>
                    <td class="px-4 py-4">${track}</td>
                    <td class="px-4 py-4">${numEvals}</td>
                    <td class="px-4 py-4">${raceType}</td>
                    <!--td class="px-4 py-4">${start}</td-->
                    <td class="px-4 py-4"><span class="text-blue-500 hover:text-blue-800" onclick="removeItem('${run_id}')">delete me</span></td>
                </tr>`
            } else {
                return ``
            }
        }).join("\n");
        history = `
        <div class="bg-white pb-4 px-4 rounded-md w-full border-t border-b border-gray-400">
            <div class="flex justify-between w-full pt-6 ">
                <h3 style="font-size:1.5em">History</h3>
            </div>
            <div class="overflow-x-auto mt-6">
                <table class="table-auto border-collapse w-full">
                    <thead>
                        <tr class="rounded-lg text-sm font-medium text-gray-700 text-left" style="font-size: 0.9674rem">
                            <th class="px-4 py-2" style="background-color:#f8f8f8">Model</th>
                            <th class="px-4 py-2" style="background-color:#f8f8f8">Track</th>
                            <th class="px-4 py-2" style="background-color:#f8f8f8">Number of Evals</th>
                            <th class="px-4 py-2" style="background-color:#f8f8f8">Race Type</th>
                            <!--th class="px-4 py-2" style="background-color:#f8f8f8">Start Time</th-->
                            <th class="px-4 py-2" style="background-color:#f8f8f8">Delete</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm font-normal text-gray-700">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>`;
    }
    document.getElementById('history').innerHTML = history;
    refreshHistory = false;
    return false;
}

function loadFromStorage(run_id) {
    const storedKeys = window.localStorage.getItem("history");
    if (storedKeys) {
        const keys = storedKeys.split(",");
        if (-1 < keys.indexOf(run_id)) {
            const json = window.localStorage.getItem(run_id);
            const { contents: _contents } = JSON.parse(json);
            const contents = atob(_contents);
            console.log(contents);
            processEvaluationLog(contents);
            console.log(`loaded ${run_id} from localStorage`);
        } else {
            console.log(`missing ${run_id} in localStorage`)
        }
    }
    return false;
}


function removeItem(run_id) {
    const storedKeys = window.localStorage.getItem("history");
    if (storedKeys) {
        const keys = storedKeys.split(",");
        if (-1 < keys.indexOf(run_id)) {
            window.localStorage.removeItem(run_id);
            window.localStorage.setItem("history", keys.filter((x) => x !== run_id).join(","))
            refreshHistory = true;
            console.log(`removed ${run_id} from history`);
        }
    }
    return false;
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

function parseLogs(contents) {
    let start = null;
    let run_id = null;
    const { params, logs } = contents.reduce(({ params, logs }, line) => {
        const pline = line.match(/ \* \/(.*)/);
        const lline = line.match(/SIM_TRACE_LOG:(.*)/);
        const rline = line.match(/setting \/run_id to (.*)/);
        if (rline) {
            run_id = rline[1];
        }
        else if (pline) {
            const [keystring, val_] = pline[1].split(':');
            const keys = keystring.split("/");
            const num = Number(val_.trim());
            const val = isNaN(num)
                ? val_.trim()
                : num;
            keys.reduce((p, k, i, all) => {
                p[k] = (i < (all.length - 1))
                    ? {}
                    : val;
                return p[k];
            }, params);
        } else if (lline) {
            const [
                episode,
                step,
                x,
                y,
                yaw,
                steer,
                throttle,
                action,
                reward,
                done,
                all_wheels_on_track,
                progress,
                closest_waypoint,
                track_len,
                timestamp,
                episode_result,
            ] = lline[1].split(",");
            if (logs.length < (episode + 1)) {
                logs.push([]); // add new episode
            }
            if (start === null) {
                console.log(timestamp);
                start = (new Date(parseInt(timestamp))).toISOString().replace(/T/, ' ').replace(/\..+/, '');
            }
            logs[episode].push({
                episode: Number(episode),
                step: Number(step),
                x: Number(x),
                y: Number(y),
                yaw: Number(yaw),
                steer: Number(steer),
                throttle: Number(throttle),
                action: Number(action),
                reward: Number(reward),
                done: done === "True",
                all_wheels_on_track: all_wheels_on_track === "True",
                progress: Number(progress),
                closest_waypoint: Number(closest_waypoint),
                track_len: Number(track_len),
                timestamp: Number(timestamp),
                episode_result,
            });
        }
        return { params, logs };
    }, { params: {}, logs: [] });
    if (run_id) {
        console.log(`setItem ${run_id}`)
        window.localStorage.setItem(run_id, JSON.stringify({
            start,
            model: params.MODEL_NAME,
            raceType: params.RACE_TYPE,
            track: params.WORLD_NAME,
            numEvals: params.NUMBER_OF_TRIALS,
            contents: btoa(contents.join("\n")),
        }));
        const storedKeys = window.localStorage.getItem("history");
        if (!storedKeys || -1 === storedKeys.split(",").indexOf(run_id)) {
            window.localStorage.setItem("history", `${storedKeys},${run_id}`);
            console.log(`stored ${run_id} in history`);
        } else {
            console.log(`refreshed ${run_id} in history`);
        }
    }
    return {
        params: { ...params, start, run_id },
        logs: logs.filter((l) => l.length !== 0)
    }
}

async function loadDefault() {
    const evalLog = await fetch('./evaluations/eval-log.txt');
    const contents = await evalLog.text();
    return processEvaluationLog(contents);
}

const refreshUI = () => {
    if (refreshHistory) {
        console.log(`refreshing`);
        displayHistory()
    }
    setTimeout(() => window.requestAnimationFrame(refreshUI), 300);
};

window.requestAnimationFrame(refreshUI)