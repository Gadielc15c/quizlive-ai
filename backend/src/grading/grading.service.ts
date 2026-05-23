import { Injectable } from "@nestjs/common";
import { GradingInput, GradingOutput } from "./grading.types";

@Injectable()
export class GradingService {
  grade(input: GradingInput): GradingOutput {
    switch (input.type) {
      case "multiple_choice":
      case "true_false":
        return this.gradeValue(input);
      case "multiple_select":
        return this.gradeSet(input);
      case "short_answer":
        return this.gradeShort(input);
      case "fill_blank":
        return this.gradeFillBlank(input);
      case "ordering":
      case "drag_drop":
        return this.gradeOrdered(input);
      case "matching":
        return this.gradePairs(input);
      case "matrix_scale":
        return this.gradeMatrix(input);
      default:
        return {
          score: 0,
          maxScore: input.points,
          feedback: "Tipo no soportado para calificacion automatica",
        };
    }
  }

  private gradeValue(input: GradingInput): GradingOutput {
    const expected = this.norm(input.correctAnswer?.value);
    const got = this.norm(input.answer?.value);
    const isCorrect = expected !== "" && expected === got;
    return this.result(input.points, isCorrect ? input.points : 0, isCorrect);
  }

  private gradeSet(input: GradingInput): GradingOutput {
    const expected = this.sorted(input.correctAnswer?.values);
    const got = this.sorted(input.answer?.values);
    const isCorrect = JSON.stringify(expected) === JSON.stringify(got);
    return this.result(input.points, isCorrect ? input.points : 0, isCorrect);
  }

  private gradeShort(input: GradingInput): GradingOutput {
    const expected = this.norm(input.correctAnswer?.value);
    const got = this.norm(input.answer?.value);
    const synonyms = Array.isArray(input.correctAnswer?.acceptedSynonyms)
      ? (input.correctAnswer?.acceptedSynonyms as unknown[]).map((v) => this.norm(v))
      : [];
    const isCorrect = expected === got || synonyms.includes(got);
    return this.result(input.points, isCorrect ? input.points : 0, isCorrect);
  }

  private gradeFillBlank(input: GradingInput): GradingOutput {
    const blanks = Array.isArray(input.correctAnswer?.blanks)
      ? (input.correctAnswer?.blanks as Array<Record<string, unknown>>)
      : [];
    const answers = Array.isArray(input.answer?.blanks)
      ? (input.answer?.blanks as Array<Record<string, unknown>>)
      : [];

    if (!blanks.length) return this.result(input.points, 0, false);

    const correct = blanks.filter((blank) => {
      const id = String(blank.id ?? "");
      const expected = Array.isArray(blank.answers)
        ? (blank.answers as unknown[]).map((v) => this.norm(v))
        : [];
      const got = answers.find((answer) => String(answer.id ?? "") === id);
      return expected.includes(this.norm(got?.value));
    }).length;

    return this.partial(input.points, correct, blanks.length);
  }

  private gradeOrdered(input: GradingInput): GradingOutput {
    const expected = this.array(input.correctAnswer?.ordered).map((v) => this.norm(v));
    const got = this.array(input.answer?.ordered).map((v) => this.norm(v));
    if (!expected.length) return this.result(input.points, 0, false);

    const correct = expected.filter((value, index) => value === got[index]).length;
    return this.partial(input.points, correct, expected.length);
  }

  private gradePairs(input: GradingInput): GradingOutput {
    const expected = this.pairs(input.correctAnswer?.pairs);
    const got = this.pairs(input.answer?.pairs);
    if (!expected.length) return this.result(input.points, 0, false);

    const correct = expected.filter((pair) =>
      got.some((item) => item.left === pair.left && item.right === pair.right),
    ).length;
    return this.partial(input.points, correct, expected.length);
  }

  private gradeMatrix(input: GradingInput): GradingOutput {
    const expected = this.matrix(input.correctAnswer?.matrix);
    const got = this.matrix(input.answer?.matrix);
    if (!expected.length) return this.result(input.points, 0, false);

    const correct = expected.filter((cell) =>
      got.some((item) => item.row === cell.row && item.value === cell.value),
    ).length;
    return this.partial(input.points, correct, expected.length);
  }

  private partial(points: number, correct: number, total: number): GradingOutput {
    const score = total > 0 ? Math.round((correct / total) * points) : 0;
    return this.result(points, score, score === points);
  }

  private result(maxScore: number, score: number, isCorrect: boolean): GradingOutput {
    return {
      isCorrect,
      score,
      maxScore,
      feedback: isCorrect ? "Correcto" : "Respuesta parcialmente correcta o incorrecta",
    };
  }

  private norm(value: unknown) {
    return String(value ?? "").trim().toLowerCase();
  }

  private sorted(value: unknown) {
    return this.array(value).map((item) => this.norm(item)).sort();
  }

  private array(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private pairs(value: unknown) {
    return Array.isArray(value)
      ? value.map((item) => {
          const pair = item as Record<string, unknown>;
          return { left: this.norm(pair.left), right: this.norm(pair.right) };
        })
      : [];
  }

  private matrix(value: unknown) {
    return Array.isArray(value)
      ? value.map((item) => {
          const cell = item as Record<string, unknown>;
          return { row: this.norm(cell.row), value: this.norm(cell.value) };
        })
      : [];
  }
}

