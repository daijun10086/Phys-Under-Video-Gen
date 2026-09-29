# Does One Prompt Represent a Physical Scenario? Physics Evaluation through Prompt Sets

Project page: https://daijun10086.github.io/Phys-Under-Video-Gen/

Physics benchmarks for video generation represent each physical scenario by a single prompt.
Rewriting that prompt without changing its meaning or physics changes the physical score in about a
third of comparisons, flips pass decisions, and changes model rankings. Prompt Set Evaluation scores
each scenario over a set of validated equivalent prompts and reports the mean with its variation.

The paper is under double-blind review. Prompt sets, equivalence judgments, per-video scores,
de-identified human ratings, and code will be released upon acceptance.

## Page

A static page with no build step: `index.html`, `assets/style.css`, and `assets/app.js`.
`assets/data.json` holds the per-video scores and prompts shown in the interactive figures, exported
from the paper's results; `assets/frames/` holds frames of the example videos, and
`assets/promptset_animation.mp4` is the narrated animation. Preview locally with
`python3 -m http.server` and open http://localhost:8000/.
