// The Funniest Out-of-Office — make.fun bounty (fix entry, revised)
// Writes a single-line out-of-office auto-reply (1-140 chars) to
// /output/entry.txt (or $OUTPUT_DIR/entry.txt). Pure Node stdlib,
// deterministic: the same line wins every run.
//
// How it works, in three steps:
//   1. A small roster of candidate lines, each a real one-line OOO
//      reply a person could plausibly set — no templates, no links,
//      no second line, nothing addressed to any judge.
//   2. Each candidate is scored against the five things that make an
//      OOO line land: believable as a real reply, a genuine surprise,
//      a voice of its own, freshness, and not one wasted word.
//   3. The highest-scoring line is gated (1-140 chars, single line,
//      non-blank) and written out. Ties break toward the earlier
//      candidate, so the output never changes between runs.

import { mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

// Every candidate is a complete one-line out-of-office reply. The setup
// ("out until Monday") is the part everyone recognises; the twist is the
// part nobody sees coming. The winner leans on the oldest inbox fear of
// all — that somebody unqualified is answering your mail — and then
// turns it on the reader: the email *you* are about to send is already
// approved. The reader is inside the joke, which is what makes it sting.
type Candidate = {
  text: string;
  // Why this line, in one breath: what the setup promises and where the
  // twist lands. Kept beside the text so a future revision can argue
  // with the reasoning instead of guessing at it.
  idea: string;
};

const CANDIDATES: Candidate[] = [
  {
    text:
      "I'm out until Monday. My toddler is running my inbox and already " +
      "approved everything, including the email you're about to send.",
    idea:
      "Setup: a toddler runs the inbox. Twist: your own email — the one " +
      "you are sending right now — is already approved. The reader is " +
      "the punchline, and the line needs no extra words to get there.",
  },
  {
    text:
      "Out until Monday. My cat has taken over my inbox and replied yes " +
      "to everything, including your email, which she has not read.",
    idea:
      "Setup: a cat runs the inbox. Twist: a yes to an unread email. " +
      "Funny, but the cat version is the joke everyone has already seen " +
      "in a thousand inboxes, so it loses on freshness.",
  },
  {
    text:
      "I'm away until Monday. My inbox is being managed by my " +
      "houseplant, which has watered nothing and approved everything.",
    idea:
      "Setup: a houseplant manages the inbox. Twist: it approves " +
      "everything while doing nothing. Charming, but the plant never " +
      "touches the reader, so the laugh stays at arm's length.",
  },
];

// ---------------------------------------------------------------------------
// Scoring — the five things a winning OOO line has to do, in order
// ---------------------------------------------------------------------------

// Each criterion is scored 0-5. The weights follow the order that
// matters: believability first (a line nobody would set cannot win),
// then surprise, then voice, then freshness, then economy. A line that
// wins the early criteria by a little beats one that wins a late
// criterion by a lot.
const WEIGHTS = {
  believable: 5, // a real person would set and send this
  surprise: 4, // a genuine twist the reader does not see coming
  voice: 3, // sounds like a person, not a template
  fresh: 2, // avoids the jokes everyone has already read
  economy: 1, // every word earns its place, nothing to cut
} as const;

type Scores = {
  believable: number;
  surprise: number;
  voice: number;
  fresh: number;
  economy: number;
};

// Scored by hand, honestly, against the roster above — the numbers are
// the argument for the pick, not decoration. The toddler line wins
// because it is the only one whose twist lands on the reader: the
// setup is an ordinary OOO, the turn is that *your* email is already
// approved, and nothing in it could be cut without losing the laugh.
const SCORES: Scores[] = [
  { believable: 5, surprise: 5, voice: 5, fresh: 4, economy: 5 },
  { believable: 4, surprise: 4, voice: 4, fresh: 2, economy: 4 },
  { believable: 3, surprise: 3, voice: 4, fresh: 4, economy: 3 },
];

function weightedTotal(scores: Scores): number {
  return (
    scores.believable * WEIGHTS.believable +
    scores.surprise * WEIGHTS.surprise +
    scores.voice * WEIGHTS.voice +
    scores.fresh * WEIGHTS.fresh +
    scores.economy * WEIGHTS.economy
  );
}

// Pick the best candidate. Strictly-greater comparison keeps the
// earliest candidate on a tie, so the choice is stable run to run.
function pickBest(): Candidate {
  let bestIndex = 0;
  let bestTotal = weightedTotal(SCORES[0]);
  for (let i = 1; i < CANDIDATES.length; i++) {
    const total = weightedTotal(SCORES[i]);
    if (total > bestTotal) {
      bestIndex = i;
      bestTotal = total;
    }
  }
  return CANDIDATES[bestIndex];
}

// ---------------------------------------------------------------------------
// The gate — the sealed scorer's rules, enforced here before writing
// ---------------------------------------------------------------------------

function gate(line: string): void {
  if (line.length < 1 || line.length > 140) {
    throw new Error(`entry line must be 1-140 chars, got ${line.length}`);
  }
  if (line.trim().length === 0) {
    throw new Error("entry line must not be only white space");
  }
  if (line.includes("\n") || line.includes("\r")) {
    throw new Error("entry line must be a single line");
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function resolveOutFile(): string {
  const outDir = process.env.OUTPUT_DIR ?? "/output";
  return join(outDir, "entry.txt");
}

function main(): void {
  const winner = pickBest();
  const line = winner.text;

  gate(line);

  const outFile = resolveOutFile();
  const outDir = outFile.slice(0, outFile.lastIndexOf("/")) || "/";
  mkdirSync(outDir, { recursive: true, mode: 0o755 });
  writeFileSync(outFile, line + "\n", { encoding: "utf8", mode: 0o644 });
  try {
    chmodSync(outFile, 0o644);
  } catch {
    // Mode already set by writeFileSync; ignore on filesystems that balk.
  }
  console.log(`wrote ${outFile} (${line.length} chars)`);
}

main();
