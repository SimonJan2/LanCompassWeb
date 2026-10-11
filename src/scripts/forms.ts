/**
 * Form enhancement (~1.5 KB). The forms work without it through native HTML
 * validation; with it, errors appear inline in the page language, the first
 * invalid field takes focus, and a filled honeypot stops the submission.
 */
type Messages = { valueMissing: string; typeMismatch: string; choose: string; consent: string };
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function errorFor(el: Element): HTMLElement | null {
  const id = el.getAttribute("data-error-id");
  return id ? document.getElementById(id) : null;
}

function setError(
  target: HTMLElement,
  describe: Control | HTMLElement,
  message: string | null,
): void {
  const error = errorFor(target);
  if (!error) return;
  const ids = (describe.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter((x) => x && x !== error.id);
  if (message) {
    error.textContent = message;
    error.hidden = false;
    describe.setAttribute("aria-invalid", "true");
    describe.setAttribute("aria-describedby", [...ids, error.id].join(" "));
  } else {
    error.textContent = "";
    error.hidden = true;
    describe.removeAttribute("aria-invalid");
    if (ids.length) describe.setAttribute("aria-describedby", ids.join(" "));
    else describe.removeAttribute("aria-describedby");
  }
}

function checkControl(el: Control, messages: Messages): string | null {
  if (el.validity.valid) return null;
  if (el instanceof HTMLInputElement && el.type === "checkbox" && el.hasAttribute("data-consent"))
    return messages.consent;
  if (el instanceof HTMLSelectElement) return messages.choose;
  if (el.validity.typeMismatch) return messages.typeMismatch;
  return messages.valueMissing;
}

function enhance(form: HTMLFormElement): void {
  let messages: Messages;
  try {
    messages = JSON.parse(form.dataset["messages"] ?? "{}") as Messages;
  } catch {
    return;
  }
  const summary = document.getElementById(form.dataset["summaryId"] ?? "");
  form.noValidate = true;

  const controls = (): Control[] =>
    Array.from(
      form.querySelectorAll<Control>(
        "input[data-error-id], select[data-error-id], textarea[data-error-id]",
      ),
    );
  const groups = (): HTMLFieldSetElement[] =>
    Array.from(
      form.querySelectorAll<HTMLFieldSetElement>("fieldset[data-choice-group][data-required]"),
    );

  const validateGroup = (group: HTMLFieldSetElement): boolean => {
    const checked = group.querySelector("input:checked") !== null;
    setError(group, group, checked ? null : messages.choose);
    return checked;
  };

  form.addEventListener("submit", (event) => {
    const honeypot = form.querySelector<HTMLInputElement>("[data-honeypot]");
    if (honeypot && honeypot.value !== "") {
      event.preventDefault();
      form.setAttribute("data-blocked", "honeypot");
      return;
    }
    let firstInvalid: HTMLElement | null = null;
    for (const el of controls()) {
      const message = checkControl(el, messages);
      setError(el, el, message);
      if (message && !firstInvalid) firstInvalid = el;
    }
    for (const group of groups()) {
      if (!validateGroup(group) && !firstInvalid) {
        firstInvalid = group.querySelector<HTMLInputElement>("input");
      }
    }
    if (firstInvalid) {
      event.preventDefault();
      if (summary) summary.hidden = false;
      firstInvalid.focus();
    } else if (summary) {
      summary.hidden = true;
    }
  });

  // Clear a message as soon as the field becomes valid.
  form.addEventListener("input", (event) => {
    const el = event.target;
    if (el instanceof HTMLInputElement && el.type === "radio") {
      const group = el.closest<HTMLFieldSetElement>("fieldset[data-required]");
      if (group && group.getAttribute("aria-invalid") === "true") validateGroup(group);
      return;
    }
    if (
      (el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      el.getAttribute("aria-invalid") === "true"
    ) {
      setError(el, el, checkControl(el, messages));
    }
  });
}

document.querySelectorAll<HTMLFormElement>("form[data-lc-form]").forEach(enhance);
