function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function clampInt(n, min, max) {
    return Math.min(Math.max(parseInt(n, 10), min), max);
}

module.exports = { round2, clampInt };

