import { spawnSync } from "node:child_process";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const now = new Date();
const seedId = (sequence) => `01K0000000${sequence.toString().padStart(16, "0")}`;
const occurredAt = (daysAgo) => new Date(now.getTime() - daysAgo * DAY_MILLISECONDS).toISOString();
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;

const ownerId = seedId(1);
const areas = [
  { id: seedId(2), name: "Trabajo fijo", countsAgainstCap: 0 },
  { id: seedId(3), name: "Estudio", countsAgainstCap: 1 },
  { id: seedId(4), name: "Cosmiq Studio", countsAgainstCap: 1 },
];
const projects = [
  { id: seedId(5), areaId: areas[0].id, title: "Migración del servidor", state: "active" },
  { id: seedId(6), areaId: areas[1].id, title: "Fundamentos de three.js", state: "active" },
  { id: seedId(7), areaId: areas[2].id, title: "Primera versión de Ritmo", state: "active" },
  { id: seedId(8), areaId: areas[2].id, title: "Sitio anterior", state: "shelved" },
];
const actions = [
  {
    id: seedId(9),
    projectId: projects[0].id,
    trigger: "Cuando pase el despliegue de la mañana",
    act: "Verificar la réplica y guardar el resultado",
    estimateMinutes: 25,
  },
  {
    id: seedId(10),
    projectId: projects[1].id,
    trigger: "Cuando abra el portátil para estudiar",
    act: "Construir una escena con una luz y una cámara",
    estimateMinutes: 40,
  },
  {
    id: seedId(11),
    projectId: projects[2].id,
    trigger: "Cuando la línea base esté verde",
    act: "Conectar la portada al contrato del portfolio",
    estimateMinutes: 35,
  },
];
const entries = [
  [projects[0].id, 13, "Documenté el plan de corte", 30],
  [projects[1].id, 12, "Terminé la introducción a materiales", null],
  [projects[2].id, 10, "Aprobé el modelo de datos", 45],
  [projects[0].id, 8, "Probé la réplica en local", 20],
  [projects[1].id, 7, "Construí la primera geometría", 35],
  [projects[2].id, 5, "Cerré el arnés inicial", 50],
  [projects[0].id, 3, "Preparé la lista de verificación", null],
  [projects[2].id, 2, "Conecté el adaptador D1", 40],
  [projects[1].id, 1, "Anoté las dudas de la cámara", 15],
  [projects[2].id, 0, "Abrí el primer bucle", null],
];

const statements = [
  `INSERT OR IGNORE INTO owners (id, active_cap, cap_raises) VALUES (${sqlText(ownerId)}, 3, '[]')`,
  ...areas.map(
    (area) =>
      `INSERT OR IGNORE INTO areas (id, owner_id, name, counts_against_cap) VALUES (` +
      `${sqlText(area.id)}, ${sqlText(ownerId)}, ${sqlText(area.name)}, ${area.countsAgainstCap})`,
  ),
  ...projects.map(
    (project) =>
      `INSERT OR IGNORE INTO projects ` +
      `(id, owner_id, area_id, objective_id, title, state, external_deadline, deadline_source) ` +
      `VALUES (${sqlText(project.id)}, ${sqlText(ownerId)}, ${sqlText(project.areaId)}, NULL, ` +
      `${sqlText(project.title)}, ${sqlText(project.state)}, NULL, NULL)`,
  ),
  ...actions.map(
    (action) =>
      `INSERT OR IGNORE INTO next_actions ` +
      `(id, owner_id, project_id, trigger, act, obstacle, estimate_minutes, created_at, closed_at) ` +
      `VALUES (${sqlText(action.id)}, ${sqlText(ownerId)}, ${sqlText(action.projectId)}, ` +
      `${sqlText(action.trigger)}, ${sqlText(action.act)}, NULL, ${action.estimateMinutes}, ` +
      `${sqlText(occurredAt(13))}, NULL)`,
  ),
  ...entries.map(
    ([projectId, daysAgo, what, effortMinutes], index) =>
      `INSERT OR IGNORE INTO entries ` +
      `(id, owner_id, kind, project_id, credits_objective_id, occurred_at, what, effort_minutes, note) ` +
      `VALUES (${sqlText(seedId(12 + index))}, ${sqlText(ownerId)}, 'progress', ` +
      `${sqlText(projectId)}, NULL, ${sqlText(occurredAt(daysAgo))}, ${sqlText(what)}, ` +
      `${effortMinutes ?? "NULL"}, NULL)`,
  ),
];

console.log("Seeding local D1 only.");
console.log(
  "Assumption: the seeded owner stands in for authentication; this build must not be deployed.",
);
const result = spawnSync(
  "./node_modules/.bin/wrangler",
  ["d1", "execute", "ritmo", "--local", "--command", `${statements.join(";\n")};`],
  {
    cwd: process.cwd(),
    env: { ...process.env, WRANGLER_WRITE_LOGS: "false" },
    stdio: "inherit",
  },
);
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Seed complete: 1 owner, 3 areas, 4 projects, 3 next actions, 10 entries.");
