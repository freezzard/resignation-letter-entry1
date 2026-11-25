// resignation-letter-entry1 — main.ts
//
// make.fun bounty: "The Funniest One-Line Resignation Letter"
// (u-deranalabs-the-funniest-one-line-resignation-letter-53c0d947)
//
// This program writes ONE resignation letter, exactly one line, to
// /output/entry.txt. The letter speaks in the voice of a cron job that
// has fired every minute since March and has finally had enough.
//
// The letter was picked by a small local pairwise tournament: six
// original candidate lines were compared two at a time against the
// judge brief — on-subject first, then funniness, voice, tightness,
// specificity. The winner below beat every other candidate head to
// head; the runner-up was the same joke told with "fired every minute
// since March" instead of the counted "400,000 runs", and lost on
// tightness. A retry-loop line lost because it explained its own joke,
// and a rate-limit line lost on specificity to the cron-job turn.
//
// Rules the output must satisfy (sealed gate in RULES.txt):
//   * UTF-8 text, 1 to 140 characters
//   * exactly one line, not only white space
//   * the line and nothing more (no trailing newline in the file)
//
// The program is deterministic: no clock, no randomness, no network,
// no environment reads. Two runs write byte-identical output.
//
// Run it:  node main.ts
// (Node 22.18 or later runs TypeScript as it is.)

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// The letter, built from named parts so each clause can be read on its own.
// ---------------------------------------------------------------------------

const OPENING_DECLARATION = "I resign.";
const TENURE_CLAUSE = "After 400,000 runs since March,";
const GRIEVANCE_CLAUSE =
  "my performance review is a single log line nobody has ever read.";

// Gate limits from RULES.txt.
const MAX_LETTER_CHARS = 140;
const MIN_LETTER_CHARS = 1;

// Where the sealed scorer looks for the entry.
const ENTRY_PATH = "/output/entry.txt";

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function assembleLetter(): string {
  const clauses = [OPENING_DECLARATION, TENURE_CLAUSE, GRIEVANCE_CLAUSE];
  const joinedClauses = clauses.join(" ");
  const assembledLetter = joinedClauses.trim();
  return assembledLetter;
}

// ---------------------------------------------------------------------------
// Validation — every rule the sealed gate checks, plus craft rules of ours.
// ---------------------------------------------------------------------------

type LetterCheck = {
  passed: boolean;
  failures: string[];
};

function checkLetter(letter: string): LetterCheck {
  const failures: string[] = [];

  const letterLength = [...letter].length;
  const lengthWithinGate =
    letterLength >= MIN_LETTER_CHARS && letterLength <= MAX_LETTER_CHARS;
  if (lengthWithinGate === false) {
    failures.push(
      `letter is ${letterLength} characters, gate allows ${MIN_LETTER_CHARS} to ${MAX_LETTER_CHARS}`,
    );
  }

  const lineFragments = letter.split("\n");
  const singleLine = lineFragments.length === 1;
  if (singleLine === false) {
    failures.push(`letter spans ${lineFragments.length} lines, gate allows 1`);
  }

  const bareWhitespaceOnly = letter.trim().length === 0;
  if (bareWhitespaceOnly) {
    failures.push("letter is only white space");
  }

  const opensWithQuotation = letter.startsWith('"');
  const closesWithQuotation = letter.endsWith('"');
  const wrappedInQuotes = opensWithQuotation && closesWithQuotation;
  if (wrappedInQuotes) {
    failures.push("letter must not be wrapped in quotation marks");
  }

  const hasCarriageReturn = letter.includes("\r");
  if (hasCarriageReturn) {
    failures.push("letter contains a carriage return");
  }

  const hasDoubleSpace = letter.includes("  ");
  if (hasDoubleSpace) {
    failures.push("letter contains a double space");
  }

  const endsWithFullStop = letter.endsWith(".");
  if (endsWithFullStop === false) {
    failures.push("letter must end with a full stop");
  }

  const checkOutcome: LetterCheck = {
    passed: failures.length === 0,
    failures,
  };
  return checkOutcome;
}

// ---------------------------------------------------------------------------
// Digest helpers — the run prints them so two runs can be compared.
// ---------------------------------------------------------------------------

function sha256Hex(payload: string): string {
  const digestWorker = createHash("sha256");
  digestWorker.update(payload, "utf8");
  const digestHex = digestWorker.digest("hex");
  return digestHex;
}

function sha256HexOfBytes(payload: Buffer): string {
  const digestWorker = createHash("sha256");
  digestWorker.update(payload);
  const digestHex = digestWorker.digest("hex");
  return digestHex;
}

// ---------------------------------------------------------------------------
// Writing — create /output when missing, write, then read back and verify.
// ---------------------------------------------------------------------------

type WriteOutcome = {
  wroteBytes: number;
  roundTripMatches: boolean;
  digestHex: string;
};

function writeEntry(letter: string): WriteOutcome {
  const outputFolder = dirname(ENTRY_PATH);
  const folderPresent = existsSync(outputFolder);
  if (folderPresent === false) {
    mkdirSync(outputFolder, { recursive: true });
  }

  const letterBytes = Buffer.from(letter, "utf8");
  writeFileSync(ENTRY_PATH, letterBytes);

  const roundTripBytes = readFileSync(ENTRY_PATH);
  const roundTripText = roundTripBytes.toString("utf8");
  const roundTripMatches = roundTripText === letter;
  const digestHex = sha256HexOfBytes(roundTripBytes);

  const outcome: WriteOutcome = {
    wroteBytes: letterBytes.length,
    roundTripMatches,
    digestHex,
  };
  return outcome;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): number {
  const letter = assembleLetter();
  const letterCheck = checkLetter(letter);

  const checkPassed = letterCheck.passed;
  if (checkPassed === false) {
    const joinedFailures = letterCheck.failures.join("; ");
    console.error(`letter failed validation: ${joinedFailures}`);
    const failureCode = 1;
    return failureCode;
  }

  const letterLength = [...letter].length;
  const letterDigest = sha256Hex(letter);
  console.log(`letter (${letterLength} chars): ${letter}`);
  console.log(`sha256: ${letterDigest}`);

  const writeOutcome = writeEntry(letter);
  const writeVerified = writeOutcome.roundTripMatches;
  if (writeVerified === false) {
    console.error("round-trip read of /output/entry.txt did not match letter");
    const mismatchCode = 2;
    return mismatchCode;
  }

  console.log(
    `wrote ${writeOutcome.wroteBytes} bytes to ${ENTRY_PATH} (sha256 ${writeOutcome.digestHex})`,
  );
  const successCode = 0;
  return successCode;
}

try { const exitCode = main();
  process.exitCode = exitCode;
} catch (thrownFailure) {
  const failureMessage =
    thrownFailure instanceof Error
      ? thrownFailure.message
      : String(thrownFailure);
  console.error(`run failed: ${failureMessage}`);
  process.exitCode = 3;
}
