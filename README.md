# GreenFed-LoRA — Energy-Aware Federated Fine-Tuning of LLMs (pipeline)

An end-to-end pipeline simulator for **energy-aware federated fine-tuning** of
large language models with LoRA adapters. The web demo visualizes each stage of
the pipeline — client selection, local training, int-8 compression, aggregation,
carbon tracking, evaluation, and final output — using the real artifacts produced
by the training run.

The thesis-grade figures used in the simulation are shipped in this repository.

---

## Run the demo

https://bountyhunter12.github.io/GreenFed-LoRA-Energy-Aware-Federated-Fine-Tuning-of-Large-Language-Models--pipeline/](https://faoziafariha.github.io/GreenFed-LoRA-Energy-Aware-Federated-Fine-Tuning-of-Large-Language-Modelss/
 
---
## Run the demo

The demo is a single static page. Pick **one** of these:

```bash
# Option A — open directly
start index.html

# Option B — local server
python -m http.server 8000
# then visit http://localhost:8000
```

The page loads its data from the files listed below. If a file is missing the
demo falls back to a small synthetic dataset and a banner is shown at the top
of the page.

### Smoke test (optional)

`app.js` and the data files can be exercised headlessly via `jsdom`:

```bash
npm install
node _runtime_live.js
```

The expected output ends with:

```
dataStatusBadge = Live · 6 files loaded
No runtime errors.
PASS
```

(The `_runtime_live.js` helper is git-ignored — it is a local dev tool, not
part of the public demo.)

---

## Files in this repository

| Path | Role |
|------|------|
| `index.html` | Static demo page (open this in a browser). |
| `style.css` | Visual styling for the demo. |
| `app.js` | Loads data, manages state, renders each step. |
| `vendor/` | Local copies of PapaParse, Chart.js and KaTeX (no CDN needed). |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |
| `package.json` | `jsdom` dependency for the headless smoke test only. |
| `results_optionC.csv` | Round-level results (ROUGE-L, BERTScore, energy, CO₂). |
| `client_stats.csv` | Per-client statistics for all 50 simulated institutions. |
| `institution_profiles.csv` | Institution metadata used for client selection. |
| `flora_result.json` | FLoRA aggregate output (converted from the `.pkl`). |
| `sample_generations.json` | 30 real CFPB consumer complaints with model generations. |
| `sample_client_weights/manifest.json` | Int-8 vs fp32 adapter sizes used in Step 3. |
| `thesis_fig1_convergence.png` | 5-round convergence figure (Step 6). |
| `llama32_1b_sustainability.png` | Sustainability / carbon analysis figure (Step 5). |
| `thesis_fig4_client_analysis.png` | Client analysis figure (About section). |
| `thesis_fig5_lora_privacy.png` | LoRA compression & privacy figure (About section). |

---

## What the demo shows

1. **Step 0 — Input:** A real consumer complaint is picked from a pool of 30.
2. **Step 1 — Client Selection:** 10 of 50 institutions are chosen by the
   current strategy (FLoRA / FedAvg / all random).
3. **Step 2 — Local Training:** Each selected client fine-tunes locally
   (100 steps, batch 8 × grad-accum 4, LoRA r=8 on `gate/up/down_proj`,
   AdamW-8bit, cosine LR). Per-round energy and CO₂ are reported.
4. **Step 3 — Int-8 Compression:** Adapters are quantized per-tensor
   (`scale = max(|w|)/127`) before upload.
5. **Step 4 — Aggregation:** FLoRA's stack-and-SVD vs FedAvg's weighted
   average; communication cost per round is shown.
6. **Step 5 — Carbon Tracking:** Cumulative CO₂ and energy across the 5
   rounds, plus the full sustainability figure from the thesis.
7. **Step 6 — Evaluation:** ROUGE-L and BERTScore-F1 per round, and the
   5-round trajectory, plus the convergence figure.
8. **Step 7 — Final Output:** The exact prompt that was sent, the model's
   generation, the ground-truth reference, and a comparison table of all
   three strategies.

---

## License

This repository accompanies a thesis submission. Cite the thesis when
reusing the figures or data files.
"# GreenFed-LoRA-Energy-Aware-Federated-Fine-Tuning-of-Large-Language-Modelss" 
