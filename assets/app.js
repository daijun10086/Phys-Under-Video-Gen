// Interactive figures of the project page. All data come from assets/data.json, exported from the
// paper's per-video scores by scripts/build_project_page_data.py in the research repository.
"use strict";
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, html = "") => Object.assign(document.createElement(tag), attrs, html ? { innerHTML: html } : {});
const MCOL = ["#F5A83D", "#F5433D", "#88B06D", "#9A82F0", "#5D8DFD"];   // model colors of the paper figures
const BNAME = { videophy2: "VideoPhy-2", phygenbench: "PhyGenBench" };
const pct = (x, d = 1) => `${x.toFixed(d)}%`;

// ---------- math and video chapters (no data needed)
if (window.katex) {
  document.querySelectorAll(".math-display").forEach((n) => katex.render(n.textContent, n, { displayMode: true, throwOnError: false }));
  document.querySelectorAll(".math").forEach((n) => katex.render(n.textContent, n, { throwOnError: false }));
}
const film = $("#film");
const chapters = [...document.querySelectorAll("#chapters button")];
chapters.forEach((b) => b.addEventListener("click", () => { film.currentTime = +b.dataset.t; film.play().catch(() => {}); }));
film.addEventListener("timeupdate", () => {
  const cur = chapters.filter((b) => film.currentTime >= +b.dataset.t).pop();
  chapters.forEach((b) => b.setAttribute("aria-current", String(b === cur)));
});
$("#copy-bib").addEventListener("click", (e) => {
  const text = $("#bibtex").textContent;
  navigator.clipboard.writeText(text).then(() => { e.target.textContent = "Copied"; }, () => {
    getSelection().selectAllChildren($("#bibtex"));
  });
});

// Words of `text` that are not in the longest common word sequence with `base` are wrapped in <mark>.
function diff(base, text) {
  const a = base.split(" "), b = text.split(" ");
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const keep = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { keep.add(j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  let out = "", open = false;
  b.forEach((w, j) => {
    const changed = !keep.has(j);
    if (changed && !open) { out += (j ? " " : "") + "<mark>"; open = true; }
    else if (!changed && open) { out += "</mark> "; open = false; }
    else if (j) out += " ";
    out += w;
  });
  return out + (open ? "</mark>" : "");
}

fetch("assets/data.json").then((r) => r.json()).then((D) => {
  example(D.example);
  grids(D);
  modelTable(D);
  boards(D);
  kCharts(D.setsize);
  human();
  seeds();
});

// ---------- 1: the leaf-blower example
function example(ex) {
  const list = $("#prompt-list"), frames = $("#frames"), verdict = $("#verdict");
  const pill = (v) => `<span class="pill ${v.pass ? "pass" : "fail"}">PC ${v.s} &middot; ${v.pass ? "PASS" : "FAIL"}</span>`;
  const buttons = ex.map((v, k) => {
    const b = el("button", { type: "button" },
      `<span><span class="tag">${k ? `Rewrite ${k}` : "Original prompt"}</span>${k ? diff(ex[0].prompt, v.prompt) : v.prompt}</span>${pill(v)}`);
    b.addEventListener("click", () => show(k));
    const li = el("li");
    li.append(b);
    list.append(li);
    return b;
  });
  function show(k) {
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === k)));
    frames.replaceChildren(...[0, 1, 2, 3].map((f) => {
      const fr = el("div", { className: "fr" });
      fr.append(el("img", { src: `assets/frames/c0${k}_f${f}.jpg`, alt: `Frame at ${2 * f} s of the video for ${k ? `rewrite ${k}` : "the original prompt"}`, loading: "lazy" }),
        el("span", {}, `${2 * f} s`));
      return fr;
    }));
    const v = ex[k];
    verdict.innerHTML = `<div><dt>Semantic adherence</dt><dd>${v.sa}</dd></div>` +
      `<div><dt>Physical commonsense</dt><dd class="${v.pass ? "pass" : "fail"}">${v.s}</dd></div>` +
      `<div><dt>Decision</dt><dd class="${v.pass ? "pass" : "fail"}">${v.pass ? "PASS" : "FAIL"}</dd></div>`;
  }
  show(0);
}

// ---------- 2: the 900 videos
function grids(D) {
  const detail = $("#cell-detail");
  let selected = null;
  const fmt = (b, v) => b === "videophy2" ? `PC ${v.s}/5, SA ${v.sa}/5, ${v.pass ? "pass" : "fail"}` : `final ${v.s}/3, ${v.pass ? "&ge; 2" : "&lt; 2"}`;
  for (const [b, scen] of Object.entries(D.benchmarks)) {
    const block = el("div", { className: "grid-block" }, `<h3>${BNAME[b]}</h3>`);
    const strip = el("div", { className: "grid-models", ariaHidden: "true" });
    MCOL.forEach((c) => strip.append(el("span", { style: `background:${c}` })));
    const cells = el("div", { className: "cells", role: "img", ariaLabel: `${BNAME[b]}: 450 videos colored by score change` });
    D.models.forEach((_, m) => {
      const col = el("div", { className: "model" });
      scen.forEach((sc, si) => sc.models[m].forEach((v, k) => {
        const o = sc.models[m][0];
        let cls = k === 0 ? "o" : v.s > o.s ? "u" : v.s < o.s ? "d" : "";
        if (k && v.pass !== o.pass) cls += " f";
        const i = el("i", { className: cls });
        Object.assign(i.dataset, { b, si, m, k });
        col.append(i);
      }));
      cells.append(col);
    });
    const pick = (e) => {
      const i = e.target.closest("i");
      if (!i) return;
      const { si, m, k } = i.dataset, sc = scen[si], v = sc.models[m][k], o = sc.models[m][0];
      selected?.classList.remove("sel");
      (selected = i).classList.add("sel");
      detail.innerHTML = `<div class="meta">${BNAME[b]} &middot; ${sc.id} &middot; ${D.models[m]} &middot; ${+k ? `rewrite ${k}` : "original prompt"}</div>` +
        `<div class="p">${+k ? diff(sc.prompts[0], sc.prompts[k]) : sc.prompts[0]}</div>` +
        `<div class="meta">${+k ? `original: ${fmt(b, o)} &rarr; this rewrite: ${fmt(b, v)}` : fmt(b, v)}</div>`;
    };
    cells.addEventListener("pointerover", pick);
    cells.addEventListener("click", pick);
    block.append(strip, cells);
    $("#grids").append(block);
  }
}

function modelTable(D) {
  const rows = D.models.map((name, m) => ({ name, color: MCOL[m], m }));
  rows.push({ name: "All models", m: null });
  const stat = (b, m) => {
    const pairs = [];
    D.benchmarks[b].forEach((sc) => sc.models.forEach((vs, mi) => {
      if (m === null || mi === m) for (let k = 1; k < 6; k++) pairs.push([vs[0], vs[k]]);
    }));
    return [pairs.filter(([o, r]) => o.s !== r.s).length, pairs.filter(([o, r]) => o.pass !== r.pass).length].map((n) => 100 * n / pairs.length);
  };
  $("#model-table tbody").innerHTML = rows.map((r) => {
    const cells = ["videophy2", "phygenbench"].flatMap((b) => stat(b, r.m)).map((x) => `<td>${pct(x)}</td>`).join("");
    return `<tr><td>${r.color ? `<span class="dot" style="background:${r.color}"></span>` : ""}${r.name}</td>${cells}</tr>`;
  }).join("");
}

// ---------- 2: leaderboards, original prompt vs. the six-prompt set
function boards(D) {
  const ROW = 32, wrap = $("#boards"), all = [];
  for (const [b, scen] of Object.entries(D.benchmarks)) {
    // integer totals (passes, or PhyGenBench final points) rank exactly; values are shown normalized
    const metric = (v) => b === "videophy2" ? +v.pass : v.s;
    const tot = { orig: [], set: [] }, val = { orig: [], set: [] }, unit = b === "videophy2" ? 1 : 3;
    D.models.forEach((_, m) => {
      tot.orig.push(scen.reduce((a, sc) => a + metric(sc.models[m][0]), 0));
      tot.set.push(scen.reduce((a, sc) => a + sc.models[m].reduce((x, v) => x + metric(v), 0), 0));
      val.orig.push(tot.orig[m] / scen.length / unit);
      val.set.push(tot.set[m] / (6 * scen.length) / unit);
    });
    // rank in descending order; ties keep the reverse model order, as in the paper figure
    const rank = (vals) => {
      const asc = D.models.map((_, m) => m).sort((x, y) => vals[x] - vals[y]);
      const r = []; asc.reverse().forEach((m, i) => { r[m] = i; }); return r;
    };
    const rk = { orig: rank(tot.orig), set: rank(tot.set) };
    const max = Math.max(...val.orig, ...val.set);
    const board = el("div", { className: "board" }, `<h4>${BNAME[b]} &middot; ${b === "videophy2" ? "pass rate" : "normalized final score"}</h4>`);
    const rowsEl = el("div", { className: "rows" });
    const rows = D.models.map((name, m) => {
      const row = el("div", { className: `row${rk.orig[m] !== rk.set[m] ? " moved" : ""}` },
        `<span class="rank"></span><span class="name">${name}</span><span class="track"><i class="bar" style="background:${MCOL[m]}"></i><span class="val"></span></span>`);
      rowsEl.append(row);
      return row;
    });
    board.append(rowsEl);
    wrap.append(board);
    all.push((basis) => rows.forEach((row, m) => {
      row.style.transform = `translateY(${rk[basis][m] * ROW}px)`;
      row.querySelector(".rank").textContent = rk[basis][m] + 1;
      row.querySelector(".bar").style.width = `${(78 * val[basis][m] / max).toFixed(2)}%`;
      row.querySelector(".val").textContent = b === "videophy2" ? pct(100 * val[basis][m]) : val[basis][m].toFixed(3);
    }));
  }
  const seg = [...document.querySelectorAll(".seg button")];
  const setBasis = (basis) => { seg.forEach((s) => s.setAttribute("aria-checked", String(s.dataset.basis === basis))); all.forEach((f) => f(basis)); };
  seg.forEach((s) => s.addEventListener("click", () => setBasis(s.dataset.basis)));
  setBasis("orig");
}

// ---------- 3: set size K
function kCharts(S) {
  const W = 460, H = 270, L = 42, R = 64, T = 16, B = 34;
  const specs = [["se", "Standard error (% of range)", 0, 14, 2], ["agree", "Model pairs ordered the same way (%)", 40, 90, 10]];
  const series = [["videophy2", "var(--up)"], ["phygenbench", "var(--b2)"]];
  const x = (k) => L + (k - 1) * (W - L - R) / 5;
  const updaters = [];
  for (const [key, title, lo, hi, step] of specs) {
    const y = (v) => T + (hi - v) * (H - T - B) / (hi - lo);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title} against the number of prompts K">`;
    for (let v = lo; v <= hi; v += step)
      svg += `<line class="ax" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke-opacity="${v === lo ? 1 : 0.5}"/><text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    for (let k = 1; k <= 6; k++) svg += `<text class="tick" x="${x(k)}" y="${H - B + 18}" text-anchor="middle">${k}</text>`;
    svg += `<text class="tick" x="${W - R + 14}" y="${H - B + 18}">K</text><line class="kline" y1="${T}" y2="${H - B}" x1="0" x2="0"/>`;
    for (const [b, c] of series) {
      const pts = S[b][key].map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
      S[b][key].forEach((v, i) => { svg += `<circle cx="${x(i + 1)}" cy="${y(v)}" r="3" fill="${c}"/>`; });
      svg += `<circle class="cur" data-b="${b}" r="6" fill="${c}" stroke="var(--bg)" stroke-width="2"/><text class="lbl" data-b="${b}" fill="${c}"></text>`;
    }
    const box = el("div", {}, `<h4 class="ttl-h">${title}</h4>${svg}</svg>`);
    $("#k-charts").append(box);
    updaters.push((K) => {
      box.querySelector(".kline").setAttribute("transform", `translate(${x(K)},0)`);
      for (const [b] of series) {
        const v = S[b][key][K - 1];
        const c = box.querySelector(`.cur[data-b="${b}"]`), t = box.querySelector(`.lbl[data-b="${b}"]`);
        c.setAttribute("cx", x(K)); c.setAttribute("cy", y(v));
        t.setAttribute("x", x(K) + 10); t.setAttribute("y", y(v) + (b === "videophy2" ? 18 : -9));   // VideoPhy-2 is the lower curve in both charts
        t.textContent = `${BNAME[b]} ${v.toFixed(key === "se" ? 1 : 0)}%`;
      }
    });
  }
  const input = $("#k"), out = $("#k-out");
  const update = () => { out.textContent = input.value; updaters.forEach((f) => f(+input.value)); };
  input.addEventListener("input", update);
  update();
}

// ---------- 4 and 5: counts reported in the paper (human-study figure of Section 4.4; seed table of Section 4.5)
function human() {
  const cats = [["Higher-scored video", 2, "var(--up)"], ["Other video", 3, "var(--down)"],
    ["Equally plausible", 41, "var(--mark)"], ["No majority", 34, "var(--same)"]];
  $("#human").innerHTML = cats.map(([lab, n, c]) =>
    `<div class="hrow"><span>${lab}</span><span class="hbar"><i style="width:${(80 * n / 41).toFixed(1)}%;background:${c}"></i><b>${n}</b></span></div>`).join("");
}

function seeds() {
  const rows = [["CogVideoX-5B", 7.5, 8.3], ["Wan2.1-14B", 3.2, 4.5]];
  $("#seedbars").innerHTML = rows.map(([m, p, s]) =>
    `<div class="model"><span>${m}</span><div class="pair">` +
    `<div><i style="width:${(6 * p).toFixed(1)}%;background:var(--accent)"></i>other prompt, same seed &middot; ${p}%</div>` +
    `<div><i style="width:${(6 * s).toFixed(1)}%;background:var(--orig)"></i>other seed, same prompt &middot; ${s}%</div></div></div>`).join("");
}
