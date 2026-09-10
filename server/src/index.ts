import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { packagesRouter } from "./routes/packages";
import { sessionsRouter } from "./routes/sessions";
import { bookingsRouter } from "./routes/bookings";
import { notificationsRouter } from "./routes/notifications";
import { usersRouter } from "./routes/users";
import { adminRouter } from "./routes/admin";
import { addonsRouter } from "./routes/addons";
import { authRouter } from "./routes/auth";
import { requireAuth, requireStaff } from "./domain/auth";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/packages", packagesRouter); // browsing is public; write routes protect themselves inline
app.use("/api/sessions", sessionsRouter); // browsing is public; waitlist protects itself inline
app.use("/api/bookings", requireAuth, bookingsRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/admin", requireAuth, requireStaff, adminRouter);
app.use("/api/addons", addonsRouter);

// Serve the built client (client/dist) when it's present alongside this
// server on disk, so a single process/port can host the whole app in
// production. In local dev the Vite dev server (port 5173) serves the
// client instead and this block is a no-op.
const clientDist = path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log(`Serving built client from ${clientDist}`);
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal error" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Sukahati API listening on :${port}`));
