"use client";

import { useMemo, useState } from "react";
import { getDisplayOptionLabel } from "@/lib/question-options";
import type { Question } from "@/lib/types";

export type AnswerValue = Record<string, unknown>;

export function getInitialAnswer(question: Question): AnswerValue | null {
  if (question.type === "ordering" || question.type === "drag_drop") {
    const ordered = mixItems(getOrderingItems(question));
    return ordered.length ? { ordered } : null;
  }

  return null;
}

type Props = {
  question: Question;
  answer?: AnswerValue;
  disabled?: boolean;
  onChange: (answer: AnswerValue) => void;
};

export function StudentAnswerWidget({
  question,
  answer,
  disabled = false,
  onChange,
}: Props) {
  switch (question.type) {
    case "multiple_choice":
      return (
        <Choice
          disabled={disabled}
          question={question}
          value={String(answer?.value ?? "")}
          onChange={(value) => onChange({ value })}
        />
      );
    case "multiple_select":
      return (
        <MultiChoice
          disabled={disabled}
          question={question}
          values={Array.isArray(answer?.values) ? (answer.values as string[]) : []}
          onChange={(values) => onChange({ values })}
        />
      );
    case "true_false":
      return (
        <TrueFalse
          disabled={disabled}
          value={String(answer?.value ?? "")}
          onChange={(value) => onChange({ value })}
        />
      );
    case "short_answer":
      return (
        <ShortAnswer
          disabled={disabled}
          value={String(answer?.value ?? "")}
          onChange={(value) => onChange({ value })}
        />
      );
    case "essay":
      return (
        <Essay
          disabled={disabled}
          value={String(answer?.value ?? "")}
          onChange={(value) => onChange({ value })}
        />
      );
    case "fill_blank":
      return (
        <FillBlank
          disabled={disabled}
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    case "ordering":
    case "drag_drop":
      return (
        <Ordering
          disabled={disabled}
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    case "matching":
      return (
        <Matching
          disabled={disabled}
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    case "matrix_scale":
      return (
        <Matrix
          disabled={disabled}
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    case "prompt_evaluation":
      return (
        <PromptEditor
          disabled={disabled}
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    default:
      return (
        <Essay
          disabled={disabled}
          value={String(answer?.value ?? "")}
          onChange={(value) => onChange({ value })}
        />
      );
  }
}

function Choice({
  question,
  value,
  disabled,
  onChange,
}: {
  question: Question;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (!question.options?.length) {
    return <EmptyWidget message="Esta pregunta no tiene opciones." />;
  }

  return (
    <div className="grid gap-2">
      {question.options.map((option) => (
        <button
          className={`min-h-12 rounded-md border px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value === option.id ? "border-brand bg-brand/10" : "bg-white hover:bg-slate-50"
          }`}
          disabled={disabled}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <span className="font-medium">{option.id}.</span> {getDisplayOptionLabel(option)}
        </button>
      ))}
    </div>
  );
}

function MultiChoice({
  question,
  values,
  disabled,
  onChange,
}: {
  question: Question;
  values: string[];
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  if (!question.options?.length) {
    return <EmptyWidget message="Esta pregunta no tiene opciones." />;
  }

  return (
    <div className="grid gap-2">
      {question.options.map((option) => {
        const selected = values.includes(option.id);
        return (
          <button
            className={`min-h-12 rounded-md border px-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected ? "border-emerald-500 bg-emerald-50" : "bg-white hover:bg-slate-50"
            }`}
            disabled={disabled}
            key={option.id}
            onClick={() =>
              onChange(
                selected
                  ? values.filter((id) => id !== option.id)
                  : [...values, option.id],
              )
            }
            type="button"
          >
            <span className="mr-2 font-mono">{selected ? "[x]" : "[ ]"}</span>
            <span className="font-medium">{option.id}.</span> {getDisplayOptionLabel(option)}
          </button>
        );
      })}
      <p className="text-xs text-slate-500">{values.length} seleccionadas</p>
    </div>
  );
}

function TrueFalse({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        ["true", "Verdadero"],
        ["false", "Falso"],
      ].map(([id, label]) => (
        <button
          className={`min-h-14 rounded-md border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value === id ? "border-brand bg-brand/10" : "bg-white hover:bg-slate-50"
          }`}
          disabled={disabled}
          key={id}
          onClick={() => onChange(id)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ShortAnswer({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="input"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Respuesta"
      value={value}
    />
  );
}

function Essay({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="rounded-md border bg-slate-50 p-3 transition focus-within:border-brand">
      <textarea
        className="min-h-36 w-full resize-y bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe tu respuesta aqui..."
        value={value}
      />
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{words} palabras</span>
        <span>{value ? "Guardado local" : ""}</span>
      </div>
    </div>
  );
}

function FillBlank({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  disabled: boolean;
  onChange: (answer: AnswerValue) => void;
}) {
  const blanks = extractBlanks(question.body);
  const current = Array.isArray(answer?.blanks)
    ? (answer.blanks as Array<{ id: string; value: string }>)
    : [];

  if (!blanks.length) {
    return <EmptyWidget message="Esta pregunta no tiene espacios configurados." />;
  }

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-slate-50 p-3 text-sm leading-6">
        {question.body}
      </p>
      {blanks.map((id) => (
        <label className="grid gap-1" key={id}>
          <span className="text-xs font-medium text-slate-500">{id}</span>
          <input
            className="input"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                blanks: upsert(current, { id, value: event.target.value }),
              })
            }
            placeholder="Completar"
            value={current.find((item) => item.id === id)?.value ?? ""}
          />
        </label>
      ))}
    </div>
  );
}

function Ordering({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  disabled: boolean;
  onChange: (answer: AnswerValue) => void;
}) {
  const initial = useMemo(() => mixItems(getOrderingItems(question)), [question]);
  const ordered = Array.isArray(answer?.ordered)
    ? (answer.ordered as unknown[]).map(toDisplayString)
    : initial;

  if (!ordered.length) {
    return <EmptyWidget message="Esta pregunta no tiene items para ordenar." />;
  }

  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= ordered.length) return;
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ordered: next });
  };

  return (
    <div className="space-y-2">
      {ordered.map((item, index) => (
        <div
          className="grid gap-3 rounded-md border bg-white p-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center"
          draggable={!disabled}
          key={`${item}-${index}`}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
          onDrop={(event) => move(Number(event.dataTransfer.getData("text/plain")), index)}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs text-white">
            {index + 1}
          </span>
          <span>{item}</span>
          <div className="flex gap-1">
            <button
              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
              disabled={disabled || index === 0}
              onClick={() => move(index, index - 1)}
              type="button"
            >
              Subir
            </button>
            <button
              className="rounded border px-2 py-1 text-xs disabled:opacity-40"
              disabled={disabled || index === ordered.length - 1}
              onClick={() => move(index, index + 1)}
              type="button"
            >
              Bajar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Matching({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  disabled: boolean;
  onChange: (answer: AnswerValue) => void;
}) {
  const pairs = getPairs(question);
  const rights = useMemo(() => mixItems(pairs.map((pair) => pair.right)), [pairs]);
  const current = Array.isArray(answer?.pairs)
    ? (answer.pairs as Array<{ left: string; right: string }>)
    : [];

  if (!pairs.length) {
    return <EmptyWidget message="Esta pregunta no tiene pares para relacionar." />;
  }

  return (
    <div className="grid gap-3">
      {pairs.map((pair) => (
        <label
          className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-[1fr_1fr] sm:items-center"
          key={pair.left}
        >
          <span className="font-medium">{pair.left}</span>
          <select
            className="input"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                pairs: upsertPair(current, { left: pair.left, right: event.target.value }),
              })
            }
            value={current.find((item) => item.left === pair.left)?.right ?? ""}
          >
            <option value="">Selecciona relacion</option>
            {rights.map((right) => (
              <option key={right} value={right}>
                {right}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function Matrix({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  disabled: boolean;
  onChange: (answer: AnswerValue) => void;
}) {
  const rows = Array.isArray(question.metadata?.rows)
    ? (question.metadata.rows as unknown[]).map(toDisplayString)
    : [];
  const cols = Array.isArray(question.metadata?.cols)
    ? (question.metadata.cols as unknown[]).map(toDisplayString)
    : [];
  const current = Array.isArray(answer?.matrix)
    ? (answer.matrix as Array<{ row: string; value: string }>)
    : [];

  if (!rows.length || !cols.length) {
    return <EmptyWidget message="Esta matriz no tiene filas o columnas configuradas." />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const selected = current.find((item) => item.row === row)?.value ?? "";
        return (
          <div className="rounded-md border p-3" key={row}>
            <p className="mb-2 text-sm font-medium">{row}</p>
            <div className="flex flex-wrap gap-2">
              {cols.map((col) => (
                <button
                  className={`rounded-md border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected === col ? "border-brand bg-brand/10" : "bg-white hover:bg-slate-50"
                  }`}
                  disabled={disabled}
                  key={col}
                  onClick={() =>
                    onChange({ matrix: upsertPair(current, { row, value: col }) })
                  }
                  type="button"
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PromptEditor({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: Question;
  answer?: AnswerValue;
  disabled: boolean;
  onChange: (answer: AnswerValue) => void;
}) {
  const variables = (question.metadata?.variables ?? {}) as Record<
    string,
    { value: unknown; type: string; description?: string }
  >;
  const requiredVars = Array.isArray(question.metadata?.requiredVariables)
    ? (question.metadata.requiredVariables as string[])
    : [];
  const [text, setText] = useState(String(answer?.answer ?? ""));
  const keys = Object.keys(variables);
  const usedVariables = Array.from(
    new Set([...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1])),
  );
  const missingRequired = requiredVars.filter((key) => !usedVariables.includes(key));
  const renderedPrompt = renderPrompt(text, variables);

  const update = (next: string) => {
    setText(next);
    const used = Array.from(
      new Set([...next.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1])),
    );
    onChange({
      answer: next,
      usedVariables: used,
      renderedPrompt: renderPrompt(next, variables),
    });
  };

  return (
    <div className="space-y-3">
      {keys.length > 0 ? (
        <div className="rounded-md border bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Variables disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => {
              const used = usedVariables.includes(key);
              const required = requiredVars.includes(key);
              return (
                <button
                  className={`rounded-md border px-2.5 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60 ${
                    used
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : required
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "bg-white text-slate-700"
                  }`}
                  disabled={disabled}
                  key={key}
                  onClick={() => update(text ? `${text} {${key}}` : `{${key}}`)}
                  title={variables[key].description}
                  type="button"
                >
                  <span className="font-mono font-semibold">{`{${key}}`}</span>
                  <span className="ml-1 text-slate-500">
                    {toDisplayString(variables[key].value)}
                  </span>
                </button>
              );
            })}
          </div>
          {requiredVars.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Requeridas: {requiredVars.map((key) => `{${key}}`).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <textarea
        className={`w-full rounded-lg border p-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
          missingRequired.length > 0
            ? "border-amber-300 focus:ring-2 focus:ring-amber-100"
            : "border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/20"
        }`}
        disabled={disabled}
        onChange={(event) => update(event.target.value)}
        placeholder="Escribe tu prompt. Haz clic en las variables para insertarlas."
        rows={5}
        value={text}
      />

      {missingRequired.length > 0 ? (
        <p className="text-xs text-amber-600">
          Faltan variables requeridas: {missingRequired.map((key) => `{${key}}`).join(", ")}
        </p>
      ) : null}

      {text ? (
        <div className="rounded-md bg-slate-900 p-3">
          <p className="mb-1 text-xs text-slate-400">Preview con valores reales</p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-white">
            {renderedPrompt}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyWidget({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {message}
    </div>
  );
}

function getOrderingItems(question: Question) {
  const raw = Array.isArray(question.metadata?.items)
    ? question.metadata.items
    : Array.isArray(question.metadata?.blocks)
      ? question.metadata.blocks
      : [];

  return (raw as unknown[]).map(toDisplayString).filter(Boolean);
}

function getPairs(question: Question) {
  const raw = Array.isArray(question.metadata?.pairs)
    ? (question.metadata.pairs as Array<Record<string, unknown>>)
    : [];

  return raw
    .map((pair) => ({
      left: toDisplayString(pair.left),
      right: toDisplayString(pair.right),
    }))
    .filter((pair) => pair.left && pair.right);
}

function mixItems(items: string[]) {
  if (items.length <= 1) return items;
  const midpoint = Math.ceil(items.length / 2);
  return [...items.slice(midpoint), ...items.slice(0, midpoint)];
}

function renderPrompt(
  text: string,
  variables: Record<string, { value: unknown; type: string; description?: string }>,
) {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) =>
    variables[key] ? toDisplayString(variables[key].value) : `{${key}}`,
  );
}

function extractBlanks(body: string) {
  return [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1]);
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((current) => current.id === item.id);
  return exists
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
}

function upsertPair<T extends { [key: string]: string }>(items: T[], item: T) {
  const key = "left" in item ? "left" : "row";
  const exists = items.some((current) => current[key] === item[key]);
  return exists
    ? items.map((current) => (current[key] === item[key] ? item : current))
    : [...items, item];
}

function toDisplayString(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.text === "string") return object.text;
    if (typeof object.label === "string") return object.label;
    if (typeof object.value === "string") return object.value;
  }
  return String(value ?? "");
}
