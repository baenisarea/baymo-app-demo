/* Generated test signal, modelled on the app's SyntheticECGSignal: a sum of Gaussian P-QRS-T waves.
   Used only for demo recordings, which are always labelled "Generated test signal · not a measurement". */
(function () {
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const g = (t, c, w, a) => a * Math.exp(-((t - c) ** 2) / (2 * w * w));
  function beat(t) { // t: seconds since beat start, beat ~0.8 s template scaled later
    return g(t, 0.10, 0.025, 0.12) - g(t, 0.215, 0.008, 0.12) + g(t, 0.24, 0.010, 1.05) - g(t, 0.265, 0.010, 0.28) + g(t, 0.48, 0.045, 0.28);
  }
  /** seconds, heartRate, {fasterFrom, fasterTo (0..1), fasterRate, seed, noise} → Float32Array at 250 Hz (mV) */
  function generate(seconds, heartRate = 80, opts = {}) {
    const fs = 250, n = Math.round(seconds * fs), out = new Float32Array(n);
    const rand = rng(opts.seed || 7), noise = opts.noise ?? 0.015;
    let nextBeat = 0.2, t = 0;
    const beats = [];
    while (nextBeat < seconds) {
      const frac = nextBeat / seconds;
      const hr = opts.fasterFrom != null && frac >= opts.fasterFrom && frac <= opts.fasterTo ? (opts.fasterRate || heartRate * 1.6) : heartRate;
      beats.push([nextBeat, 60 / hr]);
      nextBeat += (60 / hr) * (1 + (rand() - 0.5) * 0.04);
    }
    let bi = 0;
    for (let i = 0; i < n; i++) {
      t = i / fs;
      while (bi + 1 < beats.length && beats[bi + 1][0] <= t) bi++;
      let v = 0;
      for (let k = Math.max(0, bi - 1); k <= Math.min(beats.length - 1, bi + 1); k++) {
        const [start, rr] = beats[k];
        const local = (t - start) / Math.min(1, rr / 0.75);
        if (local > -0.1 && local < 0.8) v += beat(local);
      }
      v += Math.sin(t * 0.6) * 0.03 + (rand() - 0.5) * noise * 2;
      out[i] = v;
    }
    return out;
  }
  /** SVG polyline path for samples [start,end) fitted to w×h, pointsPerMillivolt like RecordedECG. */
  function path(samples, start, end, w, h, ppmv = 24) {
    const count = end - start; if (count <= 1) return '';
    const mid = h * 0.62;
    let d = '';
    for (let i = 0; i < count; i += 1) {
      const x = (i / (count - 1)) * w, y = mid - samples[start + i] * ppmv;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  window.ECGSignal = { generate, path, fs: 250 };
})();
