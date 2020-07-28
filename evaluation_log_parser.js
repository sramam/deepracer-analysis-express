const fs = require("fs");

function parseLogs(contents) {
    const { params, logs } = contents.reduce(({ params, logs }, line) => {
        const pline = line.match(/ \* \/(.*)/);
        const lline = line.match(/SIM_TRACE_LOG:(.*)/);
        if (pline) {
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
    return {
        params,
        logs: logs.filter((l) => l.length !== 0)
    }
}

function getContents(fname) {
    return fs.readFileSync(`${__dirname}/public/evaluations/${fname}`, "utf8").split("\n");
}

if (!module.parent) {
    const contents = getContents("eval-log.txt");
    const parsed = parseLogs(contents);
    console.error(parsed.params);
    console.log(JSON.stringify(parsed, null, 2));
}