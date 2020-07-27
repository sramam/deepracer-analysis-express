const fs = require("fs");

function angle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
}

const track_classifier = function (fname, debug = false) {
    const raw = fs.readFileSync(fname, "utf8");
    const trackPts = JSON.parse(raw);
    const waypoints = trackPts.map((d) => {
        const [x, y, ix, iy, ox, oy] = d;
        return { x, y };
    });

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
    // .reduce((acc, d) => {

    //     if ( Math.abs(diff))
    //     return acc;
    // }, { angles: [], integration: [], ilen: 5})
    // .map(({x, y, turn}))
    // console.log(angles);

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
    return classification;
}

if (!module.parent) {
    module.exports = track_classifier;
    const debug = true;
    // track_classifier(`${__dirname}/tracks/AmericasGeneratedInclStart.json`);
    const classification = track_classifier(`${__dirname}/tracks/Oval_track.json`, debug);
}
