# Research Basis

Evidence behind the design choices in `brief.md`. This file is **not** normative — `brief.md`,
`requirements.json`, and the decision files are. This is the argument record: why the product
behaves the way it does, so a later task cannot quietly reintroduce a pattern the evidence rejects.

Each finding is stated with its source and the design rule it produces. Effect sizes are quoted as
published; they are evidence, not guarantees.

---

## 1. Rigid scheduling is the failure mode, not the fix

**Finding.** Across 13 studies, assigning a date *and time* to an activity makes it feel structured
and work-like, reducing both anticipation and enjoyment — including for activities the person
chose freely. The authors' own remedy is *rough scheduling*: commit to a day, not a clock slot.
Rough scheduling produced the coordination benefit without the enjoyment cost.

**Source.** Tonietto & Malkoc, *The Calendar Mindset: Scheduling Takes the Fun Out and Puts the
Work In*, Journal of Marketing Research 53(6), 922–936, 2016.

**Rule.** Ritmo never asks for a start time. Work is assigned to a day or a week, never to a clock
block. There is no calendar grid in the product.

## 2. Rigid routines produce weaker habits than flexible ones

**Finding.** Field experiment, 2,508 employees. Incentives tied to a fixed two-hour daily window
produced *fewer* gym visits than incentives with no time constraint — during the intervention and
after it stopped. Even among subgroups induced to exercise at equal rates during the intervention,
the routine group decayed faster afterward. Overly rigid routinization undermines habit formation.

**Source.** Beshears, Lee, Milkman, Mislavsky & Wisdom, *Creating Exercise Habits Using Incentives:
The Trade-off Between Flexibility and Routinization*, Management Science 67(7), 4139–4171, 2021.

**Rule.** Commitments are expressed as frequency over a period ("four sessions this week"), never as
a recurring time slot. Consistency is measured across the period, not per day.

## 3. Monitoring progress is the intervention that works

**Finding.** Meta-analysis of 138 randomized studies, N = 19,951. Prompting people to monitor goal
progress raised attainment at d+ = 0.40 (95% CI 0.32–0.48), mediated by the increase in monitoring
frequency. Two moderators strengthened the effect: **physically recording** the progress, and
**reporting it** to someone.

**Source.** Harkin, Webb, Chang, Prestwich, Conner, Kellar, Benn & Sheeran, *Does Monitoring Goal
Progress Promote Goal Attainment? A Meta-Analysis of the Experimental Evidence*, Psychological
Bulletin 142(2), 198–229, 2016.

**Rule.** The primary act in Ritmo is logging what happened, not planning what will. Logging must be
cheaper than planning, in clicks and in seconds. Physical recording is the product.

## 4. Small visible progress is the strongest daily motivator

**Finding.** 12,000 daily diary entries from 238 people across 26 project teams. Of every event that
distinguishes a good inner-work-life day from a bad one, making progress on meaningful work ranked
first — and the progress did not need to be large.

**Source.** Amabile & Kramer, *The Progress Principle* (2011); *The Power of Small Wins*, HBR, 2011.

**Rule.** The home surface shows what moved recently, before it shows what is outstanding. Backlog
is reachable but never the landing view.

## 5. Making a concrete plan frees the mind even before execution

**Finding.** Unfinished goals intrude on unrelated tasks, consume working memory, and degrade
executive function (Zeigarnik). Forming a *specific plan* for the unfinished task eliminated the
intrusion as effectively as actually finishing it.

**Source.** Masicampo & Baumeister, *Consider It Done! Plan Making Can Eliminate the Cognitive
Effects of Unfulfilled Goals*, JPSP 101, 667–683, 2011.

**Rule.** Every active project carries exactly one written next action. That single field is what
buys back the mental quiet — which is why it is required, and why one is enough.

## 6. If–then framing beats intention alone

**Finding.** Implementation intentions ("if situation Y, then I will do X") raised goal attainment
at d = 0.65 across 94 independent tests; the 2024 update aggregates 642 tests. Combining them with
mental contrasting (MCII / WOOP) attained g = 0.336 across 21 studies, N = 15,907.

**Sources.** Gollwitzer & Sheeran, *Implementation Intentions and Goal Achievement: A Meta-Analysis
of Effects and Processes*, Advances in Experimental Social Psychology 38, 69–119, 2006. Wang, Wang & Gai,
*A Meta-Analysis of the Effects of Mental Contrasting With Implementation Intentions on Goal
Attainment*, Frontiers in Psychology, 2021.

**Rule.** The next-action field is cued, not free-form: it prompts for the trigger as well as the
act. An obstacle field is offered, not required.

## 7. Consecutive-day streaks are a liability

**Finding.** Once a self-imposed rule is broken, the breach itself becomes the reason to abandon the
project — the abstinence violation, informally the "what the hell" effect. The collapse is
disproportionate to the lapse.

**Source.** Polivy & Herman on the abstinence violation effect; Cochran & Tesser, *The "What the
Hell" Effect*, 1996; ten Broeke et al., *Understanding the setback effect in everyday
self-regulation*, EJSP, 2023.

**Rule.** No consecutive-day streak counter anywhere in the product. Consistency is displayed as a
period ratio ("3 of the last 4 weeks had progress"), which a single miss cannot zero out.

## 8. Build the misses into the goal: emergency reserves

**Finding.** A hard goal with a stated allowance of skips ("7 days, 2 emergency skip days") beat
both the hard goal and the easy goal — up to ~40% more goal-met days per week in a field step-count
study — and, critically, increased persistence *after* a failure, by preserving perceived progress
and therefore commitment.

**Sources.** Two separate papers by Sharif & Shu: *The Benefits of Emergency Reserves: Greater
Preference and Persistence for Goals that Have Slack with a Cost*, Journal of Marketing Research,
2017; and *Nudging persistence after failure through emergency reserves*, OBHDP 163, 17–29, 2021 —
the persistence-after-failure result. *Unverified:* which of the two reports the ~40% figure could
not be confirmed from the abstracts; both run a step-count field study.

**Rule.** Every recurring commitment is defined as `target + reserve`. Spending a reserve is a
first-class, unpunished action that keeps the commitment intact. Reserves replenish each period.

## 9. Adaptive goals sustain; static goals spike then decay

**Finding.** In randomized physical-activity trials, static goals produced a larger initial jump
(+2,630 steps/day vs +2,149) but decayed more than twice as fast; adaptive goals calibrated to the
person's recent behavior finished ahead. Fixed goals assigned uniformly are unrealistically hard for
some and trivially easy for others, which is what erodes goal-setting effectiveness.

**Sources.** Adaptive goal setting and financial incentives, BMC Public Health, 2017; Machine
learning–based personalized daily step goals, JMIR mHealth, 2018; Adaptive Goals and Reinforcement
Timing, AJPM, 2021.

**Rule.** The weekly proposal is derived from logged history, not from an aspiration set once. A
week's target moves with observed capacity.

## 10. Duration estimates are systematically optimistic; decomposition helps

**Finding.** People underestimate completion time even knowing similar tasks ran long. Unpacking a
project into its subcomponents reduces the bias, because the subtasks surface steps a whole-project
scenario omits. The correction weakens when components are few, easy, or far off.

**Sources.** Buehler, Griffin & Peetz, *The Planning Fallacy*, 2010; Kruger & Evans, *If you don't
want to be late, enumerate*, JESP 40, 586–598, 2004; Forsyth & Burt, *Allocating time to future tasks*, Memory
& Cognition 36(4), 2008.

**Rule.** Decomposition is requested only for the next stretch, never the whole project. Estimated
vs. actual is captured and fed back as a personal calibration factor rather than as a failure.

## 11. Too many live goals is a resource problem, and shelving is the cure

**Finding.** People typically hold 10–15 personal goals. Inter-goal *interference* runs through
resource constraints and incompatible strategies; inter-goal *facilitation* runs through shared
strategies and instrumental relations. Goal conflict predicts lower well-being (meta-analysis).
Resolving conflict by **shelving** — a reversible pause, distinct from abandonment — carries
benefits that outright disengagement does not.

**Sources.** Gray, Ozer & Rosenthal, *Goal conflict and psychological well-being: A meta-analysis*,
Journal of Research in Personality 66, 27–37, 2017 (54 studies); *Better off without? Benefits and costs of resolving goal
conflict through goal shelving and goal disengagement*, Motivation and Emotion, 2022; Riediger &
Freund on inter-goal facilitation.

**Rule.** Active projects are capped. "Shelve" is a normal, reversible verb with no penalty
language, and shelved projects stay visible in the portfolio view so shelving never feels like loss.

## 12. Switching between projects has a measurable cost

**Finding.** Attention residue: part of the mind stays on the prior task, degrading performance on
the next one; the effect is strongest when the prior task was left unfinished.

**Source.** Leroy, *Why is it so hard to do my work? The challenge of attention residue when
switching between work tasks*, OBHDP 109(2), 168–181, 2009.

**Rule.** Reinforces the WIP cap in §11, and argues for a day view that names one or two focus
projects rather than listing all of them.

## 13. Goals must stay self-concordant to survive

**Finding.** Goals pursued for autonomous reasons (identified, intrinsic) draw more sustained effort
and are more likely to be attained; attaining them yields well-being gains that controlled goals do
not, producing an upward spiral. The self-concordance index scores a specific goal, not a person.

**Source.** Sheldon & Elliot, *Goal striving, need satisfaction, and longitudinal well-being: The
self-concordance model*, JPSP 76(3), 482–497, 1999; Sheldon & Houser-Marko, 2001.

**Rule.** Every objective stores a short "why this is mine". Periodic review asks whether it still
is — and answering "no" routes to shelve or drop, not to guilt.

## 14. Extrinsic gamification is a known hazard here

**Finding.** Meta-analysis of 128 studies: tangible rewards reliably undermine intrinsic motivation
for activities already found intrinsically motivating. Points, badges, and leaderboards create
competence signals but can be perceived as controlling, costing autonomy. Gamification effects are
small, heterogeneous, and design-dependent, with documented novelty decay.

**Sources.** Deci, Koestner & Ryan, *A meta-analytic review of experiments examining the effects of
extrinsic rewards on intrinsic motivation*, Psychological Bulletin 125(6), 627–668, 1999;
gamification meta-analysis, ETR&D, 2023.

**Rule.** No points, badges, levels, or leaderboards. Feedback is informational — what moved, how
much, compared to your own history — never evaluative or competitive.

## 15. Self-compassion after a lapse increases the motivation to improve

**Finding.** Across four experiments, a self-compassionate framing after failure — compared with
self-esteem boosting and with no intervention — produced more incremental beliefs about the
weakness, more study time after a failed test, and greater stated motivation to change.

**Source.** Breines & Chen, *Self-Compassion Increases Self-Improvement Motivation*, PSPB 38(9), 1133–1143,
2012.

**Rule.** Copy after a weak period is neutral and forward-looking. No red debt states, no
accumulated-failure counters, no "you missed 4 days" framing.

## 16. Temporal landmarks are free motivational energy

**Finding.** Google searches for "diet", gym visits, and goal commitments all rise after temporal
landmarks — a new week, month, year, semester, or birthday. People are ~33% more likely to exercise
at the start of a week. Landmarks work by relegating past imperfection to a closed accounting period.

**Source.** Dai, Milkman & Riis, *The Fresh Start Effect: Temporal Landmarks Motivate Aspirational
Behavior*, Management Science 60(10), 2563–2582, 2014.

**Rule.** The week is the primary planning period and it *closes*. Nothing rolls over as debt; each
week opens clean, which is the mechanism the effect depends on.

## 17. Written reflection produces measurable performance gains

**Finding.** Field experiment plus lab studies: 15 minutes of written reflection at the end of the
day produced a 22.8% improvement on the final training test versus the control group.

**Source.** Di Stefano, Gino, Pisano & Staats, *Making Experience Count: The Role of Reflection in
Individual Learning* / *Learning by Thinking*, HBS Working Paper 14-093, 2016.

**Rule.** The weekly review is a first-class surface, short and written, not an optional extra —
and it is where §3's "reported" moderator is partly captured.

## 18. For novel work, a learning goal beats an outcome goal

**Finding.** On novel or complex tasks where the strategy is not yet known, a specific outcome goal
can depress performance relative to a learning goal, because it narrows attention onto the method
already in hand before a better one is found.

**Source.** Seijts & Latham, *Learning versus performance goals: When should each be used?*, Academy
of Management Executive 19(1), 124–131, 2005; Locke & Latham, *New Directions in Goal-Setting Theory*, 2006.

**Rule.** An objective may be typed as **learning** or as **outcome**. Learning objectives are
scored on evidence gathered and strategies tried, not on units shipped.

## 19. Perceived progress accelerates effort

**Finding.** Car-wash customers given a 10-stamp card with 2 stamps already filled in completed it
at 34%, against 19% for an equivalent 8-stamp card started from zero — 300 customers, nine months,
both cards requiring the same eight purchases. Effort rises with *perceived* progress toward the
goal, not merely with proximity. The head start must come with a stated reason or the effect vanishes.

**Source.** Nunes & Drèze, *The Endowed Progress Effect: How Artificial Advancement Increases
Effort*, Journal of Consumer Research 32(4), 504–512, 2006; Kivetz, Urminsky & Zheng on the goal-gradient
effect, 2006.

**Rule.** Progress is always rendered as accumulated-so-far before remaining. Any credited head
start must name its reason — and must be real, never fabricated, or it is a dark pattern.

---

## What the evidence does not settle

- **Optimal WIP cap.** The literature establishes that switching and goal conflict are costly, not
  the number. Ritmo should make the cap a user setting with a low default and let logged data
  inform it later.
- **Reserve sizing.** Reserves help; the correct ratio per commitment type is untested here.
- **Review cadence.** Weekly is supported as a landmark and as a reflection interval, but daily
  versus weekly reflection was not compared directly in the cited work.
- **Long-horizon objectives (travel, career) over months.** Most cited trials run weeks. Applying
  adaptive-goal and reserve logic at a multi-month horizon is an extrapolation, and is labelled as
  an assumption in `brief.md`.
