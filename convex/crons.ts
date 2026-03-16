import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Recover jobs stuck in "running" with no heartbeat for 5+ minutes
crons.interval(
  "recover stale jobs",
  { minutes: 2 },
  internal.jobs.recoverStaleJobs
);

export default crons;
