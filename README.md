# Parkinson Resilience Lab — interactive companion (prototype)

Interactive, dark-blue/black teaching companion to *Resilience Loss and Noise-Driven Escape in a Minimal Stochastic Model of Dopaminergic Neuron Vulnerability*. Inspired by the structure of the Periodontal Dynamics Lab reference prototype.

## Deploy on GitHub Pages

Unzip this package and upload **the contents**, including `docs/`, to a public GitHub repository. In repository **Settings → Pages** select **Deploy from a branch**, choose `main`, folder `/docs`, then save. For a local preview, from the project root run `python -m http.server 8000` and open `http://localhost:8000/docs/`.

No backend or API keys required. To test numerical functions: `npm test` (Node 18+).

## Science & caveats

The numerical drift, analytic equilibrium and stochastic noise formulae are ported from https://github.com/CarloGalliUnipr/parkinson-resilience-dynamics/blob/main/src/pd_resilience_model/model.py (accessed Oct 2026). Deterministic interactive plots use fixed-step RK4, not SciPy RK45. Stochastic paths use Euler–Maruyama with reflecting nonnegative boundaries, and seeded browser randomness, not NumPy RNG. Monte Carlo fast mode uses fewer paths/coarser timestep than the paper; manuscript resolution is a selectable preset. All times are arbitrary. The operational failure event requires both `S>3.5` and `M<0.15` simultaneously. The model does not explicitly simulate ferroptosis, iron, copper, neuromelanin, alpha-synuclein, or therapy. Reference papers provide contextual reading only.

## Research sources

- Li et al. (2023), *Cell Communication and Signaling* 21:327. https://doi.org/10.1186/s12964-023-01267-1
- Filimontseva et al. (2025), *Trends in Neurosciences* 48, 445–. https://doi.org/10.1016/j.tins.2025.04.005
- Alves et al. (2026), *Ferroptosis and Oxidative Stress* 2:202507. https://doi.org/10.70401/fos.2025.0009

Prototype for educational use, not publication figure source or clinical decision tool.
