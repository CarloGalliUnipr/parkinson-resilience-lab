# Parkinson Resilience Lab — interactive companion (version 0.2 · five experiments)

Interactive teaching companion to *Resilience Loss and Noise-Driven Threshold Crossing in a Minimal Stochastic Model of Dopamine Neuron Vulnerability*. 

## Deploy on GitHub Pages

Unzip this package and upload **the contents**, including `docs/`, to a public GitHub repository. In repository **Settings → Pages** select **Deploy from a branch**, choose `main`, folder `/docs`, then save. For a local preview, from the project root run `python -m http.server 8000` and open `http://localhost:8000/docs/`.

No backend, external JavaScript library, or API keys required. To test numerical functions: `npm test` (Node 18+).

## Science & caveats

The numerical drift, analytic equilibrium and stochastic noise formulae are ported from https://github.com/CarloGalliUnipr/parkinson-resilience-dynamics/blob/main/src/pd_resilience_model/model.py (accessed Oct 2026). Deterministic interactive plots use fixed-step RK4, not SciPy RK45. Stochastic paths use Euler–Maruyama with reflecting nonnegative boundaries, and seeded browser randomness, not NumPy RNG. Monte Carlo fast mode uses fewer paths/coarser timestep than the paper; manuscript resolution is a selectable preset. All times are arbitrary. The operational failure event requires both `S>3.5` and `M<0.15` simultaneously. The model does not explicitly simulate ferroptosis, iron, copper, neuromelanin, alpha-synuclein, or therapy. Reference papers provide contextual reading only.

## Research sources

- Li et al. (2023), *Cell Communication and Signaling* 21:327. https://doi.org/10.1186/s12964-023-01267-1
- Filimontseva et al. (2025), *Trends in Neurosciences* 48, 445–. https://doi.org/10.1016/j.tins.2025.04.005
- Alves et al. (2026), *Ferroptosis and Oxidative Stress* 2:202507. https://doi.org/10.70401/fos.2025.0009

Prototype for educational use, not publication figure source or clinical decision tool.

## Experiment 05: Resilience Landscape (new)

This is a **deterministic recovery-time** visualization, not a genuine potential energy landscape or Freidlin–Wentzell quasipotential. For a grid of starting states (M₀,S₀), the browser integrates the original two-dimensional drift using fourth-order Runge–Kutta with Δt = 0.35 arbitrary units, to the first arrival within a Euclidean radius ε = 0.08 of the positive reference equilibrium. The observation horizon is T = 220; those not meeting the return criterion by T are **right-censored** and displayed at the top of the plotted range, not interpreted as infinite recovery time. A run terminates as a failure if both M < 0.15 and S > 3.5 are met. Invalid or already-failed initial conditions have no recovery value, and the resulting omitted patch does not establish a genuine deterministic basin boundary.

The display samples M₀ ∈ [0.025, 1.10] and S₀ ∈ [0, 6.0] on a 30×34 grid. Two surfaces use identical coordinate and height scales. The plotted equilibrium moves as lambda or model parameters change. Changing stochastic noise modifies only a sample trajectory projected onto the base plane, **not** this deterministic surface. The viewer supports pointer rotation, mouse-wheel zoom, keyboard arrows, snapshot comparison, advanced parameter changes and CSV data export. Controls display an explicit warning when the positive equilibrium is absent or already lies in the operational failure set. Calculations occur in the browser and do not transmit parameter values to any server.

For publication-grade estimates of long return times, repeat computations with tighter Δt/tolerance and convergence checks. This is an exploratory educational visualization, not a biological estimate or a validated basin geometry. The analytical negative dominant eigenvalue describes local linear stability; the separate two-threshold rule defines a phenomenological absorbing first-passage outcome.
