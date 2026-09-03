export interface FieldIssue {
  name: string;
  message: string;
}

export interface FieldCheck {
  name: string;
  value: string;
  requiredMessage?: string;
  positiveIntegerMessage?: string;
}

export function firstFieldIssue(checks: readonly FieldCheck[]): FieldIssue | null {
  for (const check of checks) {
    const value = check.value.trim();
    if (check.requiredMessage !== undefined && value === "") {
      return { name: check.name, message: check.requiredMessage };
    }
    if (
      check.positiveIntegerMessage !== undefined &&
      value !== "" &&
      (!Number.isInteger(Number(value)) || Number(value) <= 0)
    ) {
      return { name: check.name, message: check.positiveIntegerMessage };
    }
  }
  return null;
}

export function fieldIssueFromServer(
  error: string,
  availableFields: readonly string[],
): FieldIssue | null {
  const available = new Set(availableFields);
  const issue = (name: string, message: string): FieldIssue | null =>
    available.has(name) ? { name, message } : null;

  if (/capped projects are active/i.test(error)) {
    return issue(
      "activeCap",
      "El límite no incluye los proyectos activos. Escribe un número que los incluya.",
    );
  }
  if (/^activeCap\b/i.test(error)) {
    return issue("activeCap", "Escribe un número entero mayor que cero.");
  }
  if (/^name\b/i.test(error)) return issue("name", "Escribe el nombre del área.");
  if (/^title\b/i.test(error)) return issue("title", "Escribe el nombre del proyecto.");
  if (/^areaId\b|^Area .+ does not exist/i.test(error)) {
    return issue("areaId", "El área ya no está disponible. Elige otra.");
  }
  if (/^trigger\b|Next action trigger is required/i.test(error)) {
    return issue("trigger", "Escribe el disparador.");
  }
  if (/^act\b|Next action act is required/i.test(error)) {
    return issue("act", "Escribe la acción.");
  }
  if (/^estimateMinutes\b|Next action estimate must be/i.test(error)) {
    return issue("estimateMinutes", "Escribe minutos enteros mayores que cero.");
  }
  if (/^what\b/i.test(error)) {
    return issue("what", "Escribe una línea sobre lo que moviste.");
  }
  if (/^projectId\b|^Project .+ (?:does not exist|is shelved|is not active)/i.test(error)) {
    return issue("projectId", "El proyecto ya no está disponible. Elige otro.");
  }
  return null;
}

export function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>("[data-field-control]").forEach((control) => {
    control.removeAttribute("aria-invalid");
  });
  form.querySelectorAll<HTMLElement>("[data-field-error]").forEach((message) => {
    message.hidden = true;
    const text = message.querySelector<HTMLElement>("[data-field-error-text]");
    if (text !== null) text.textContent = "";
  });
}

export function showFieldIssue(form: HTMLFormElement, issue: FieldIssue): void {
  clearFieldErrors(form);
  const control = form.querySelector<HTMLElement>(`[data-field-control="${issue.name}"]`);
  const message = form.querySelector<HTMLElement>(`[data-field-error="${issue.name}"]`);
  if (control === null || message === null) return;
  const text = message.querySelector<HTMLElement>("[data-field-error-text]");
  control.setAttribute("aria-invalid", "true");
  message.hidden = false;
  if (text !== null) text.textContent = issue.message;
  control.focus();
}

export function bindFieldErrorClearing(form: HTMLFormElement): void {
  const clearChangedField = (event: Event) => {
    if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
      return;
    }
    const name = event.target.name;
    if (name === "") return;
    const control = form.querySelector<HTMLElement>(`[data-field-control="${name}"]`);
    const message = form.querySelector<HTMLElement>(`[data-field-error="${name}"]`);
    control?.removeAttribute("aria-invalid");
    if (message !== null) message.hidden = true;
  };
  form.addEventListener("input", clearChangedField);
  form.addEventListener("change", clearChangedField);
}

export function fieldNames(form: HTMLFormElement): string[] {
  return [...form.querySelectorAll<HTMLElement>("[data-field-control]")]
    .map((control) => control.dataset.fieldControl)
    .filter((name): name is string => name !== undefined);
}

export function setFormStatus(
  status: HTMLElement | null,
  message: string,
  state: "idle" | "loading" | "success" | "error",
): void {
  if (status === null) return;
  status.textContent = message;
  status.dataset.state = state;
  status.classList.toggle("text-ink", state === "error");
  status.classList.toggle("text-dim", state !== "error");
}
