import { LOCAL_OWNER_ID } from "../adapters/local-owner.ts";
import { openDatabase } from "../adapters/sqlite/database.ts";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const now = new Date();
const seedId = (sequence) => `01K0000000${sequence.toString().padStart(16, "0")}`;
const occurredAt = (daysAgo) => new Date(now.getTime() - daysAgo * DAY_MILLISECONDS).toISOString();
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;

const ownerId = LOCAL_OWNER_ID;
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
// D-024: steps, not if-then actions. Two are marked for today so the portfolio row has
// something to draw; the rest sit in their project's list, which is where a step lives.
// The owner's local calendar, the definition `calendarDateOf` uses — never UTC. Seeding in the
// evening west of Greenwich would otherwise mark steps for tomorrow and show none for today.
const seededDay = new Date();
const today = `${seededDay.getFullYear()}-${`${seededDay.getMonth() + 1}`.padStart(2, "0")}-${`${seededDay.getDate()}`.padStart(2, "0")}`;
const steps = [
  {
    id: seedId(9),
    projectId: projects[0].id,
    title: "Verificar la réplica y guardar el resultado",
    estimateMinutes: 25,
    markedFor: today,
  },
  {
    id: seedId(10),
    projectId: projects[2].id,
    title: "Conectar la portada al contrato del portfolio",
    estimateMinutes: 35,
    markedFor: today,
  },
  {
    id: seedId(11),
    projectId: projects[1].id,
    title: "Abrir la escena y probar una luz direccional",
    estimateMinutes: 30,
    markedFor: null,
  },
];
const entries = [
  [projects[0].id, 27, "Documenté el plan de corte", 30],
  [projects[1].id, 24, "Terminé la introducción a materiales", null],
  [projects[0].id, 19, "Cerré el arnés inicial", 50],
  [projects[1].id, 16, "Aprobé el modelo de datos", 45],
  [projects[0].id, 8, "Probé la réplica en local", 20],
  [projects[1].id, 7, "Construí la primera geometría", 35],
  [projects[0].id, 3, "Preparé la lista de verificación", null],
  [projects[1].id, 2, "Conecté el adaptador D1", 40],
  [projects[1].id, 1, "Anoté las dudas de la cámara", 15],
  [projects[0].id, 0, "Abrí el primer bucle", null],
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
  ...steps.map(
    (step) =>
      `INSERT OR IGNORE INTO steps ` +
      `(id, owner_id, project_id, title, estimate_minutes, marked_for, created_at, done_at) ` +
      `VALUES (${sqlText(step.id)}, ${sqlText(ownerId)}, ${sqlText(step.projectId)}, ` +
      `${sqlText(step.title)}, ${step.estimateMinutes}, ` +
      `${step.markedFor === null ? "NULL" : sqlText(step.markedFor)}, ` +
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
  `SELECT projects.id AS project_id, COUNT(steps.id) AS open_steps
   FROM projects
   LEFT JOIN steps
     ON steps.project_id = projects.id AND steps.done_at IS NULL
   WHERE projects.state = 'active'
   GROUP BY projects.id
   ORDER BY projects.id`,
];

console.log("Seeding the local SQLite database.");
console.log(
  "Assumption: the seeded owner stands in for authentication; this build must not be deployed.",
);
const database = openDatabase();
database.exec(`${statements.join(";\n")};`);
database.close();
console.log("Seed complete: 1 owner, 3 areas, 4 projects, 3 steps, 10 entries.");
