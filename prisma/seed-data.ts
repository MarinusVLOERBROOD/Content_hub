/**
 * Test data for April 2026.
 * Run with: npx tsx prisma/seed-data.ts
 *
 * Uses the existing users from seed.ts — does NOT delete users or clients.
 * Replaces all existing tasks and events on each run.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "content-hub.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const db = new PrismaClient({ adapter });

function d(day: number, hour = 9, minute = 0) {
  return new Date(2026, 3, day, hour, minute); // month 3 = April (0-indexed)
}

async function main() {
  // ── Gebruikers ophalen ───────────────────────────────────────────────────────
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  if (users.length < 2) {
    console.error("❌ Voer eerst 'npx tsx prisma/seed.ts' uit om gebruikers aan te maken.");
    process.exit(1);
  }

  const [admin, marinus, lisa] = users;
  const userList = [admin, marinus, lisa].filter(Boolean);

  // ── Oude taken en afspraken wissen ──────────────────────────────────────────
  await db.eventAttendee.deleteMany({});
  await db.eventTag.deleteMany({});
  await db.event.deleteMany({});
  await db.taskTag.deleteMany({});
  await db.task.deleteMany({});
  console.log("🗑️  Oude taken en afspraken verwijderd");

  // ── Klanten aanmaken ────────────────────────────────────────────────────────
  const clientData = [
    { name: "Bakkerij De Zon", slug: "bakkerij-de-zon" },
    { name: "Tandarts Vermeer", slug: "tandarts-vermeer" },
    { name: "Sportschool Flex", slug: "sportschool-flex" },
    { name: "Restaurant Bella", slug: "restaurant-bella" },
  ];

  const clients: Record<string, { id: string; name: string }> = {};
  for (const c of clientData) {
    const existing = await db.client.findUnique({ where: { slug: c.slug } });
    const client = existing ?? (await db.client.create({ data: c }));
    clients[c.slug] = client;
  }
  console.log(`✅ ${Object.keys(clients).length} klanten klaar`);

  const zon = clients["bakkerij-de-zon"];
  const tand = clients["tandarts-vermeer"];
  const flex = clients["sportschool-flex"];
  const bella = clients["restaurant-bella"];

  // ── Afspraken aanmaken ──────────────────────────────────────────────────────
  const events = [
    // Verleden afspraken (apr 1–18)
    {
      title: "Kick-off planning april",
      description: "Maandplanning en taakverdeling bespreken",
      startAt: d(1, 9), endAt: d(1, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Fotoshoot Sportschool Flex",
      description: "Sportfoto's voor social media en website",
      startAt: d(3, 10), endAt: d(3, 12),
      clientId: flex.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Review sociale media Bakkerij De Zon",
      description: "Resultaten vorige maand doornemen en bijsturen",
      startAt: d(6, 14), endAt: d(6, 15),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Contentbespreking Tandarts Vermeer",
      description: "Nieuwe contentstrategie voor Q2 bespreken",
      startAt: d(8, 9), endAt: d(8, 10, 30),
      clientId: tand.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Videocall campagne-ideeën Restaurant Bella",
      description: "Brainstorm zomercampagne en promotiemateriaal",
      startAt: d(10, 11), endAt: d(10, 12),
      clientId: bella.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Social media planning rest april",
      description: "Content kalender afronden voor de tweede helft van april",
      startAt: d(14, 9), endAt: d(14, 10, 30),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Videoshoot Bakkerij De Zon",
      description: "Productievideo's voor Instagram Reels en TikTok",
      startAt: d(17, 13), endAt: d(17, 16),
      clientId: zon.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "SEO-check Tandarts Vermeer",
      description: "Technische SEO doorlichten en verbeterpunten noteren",
      startAt: d(18, 10), endAt: d(18, 11),
      clientId: tand.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id].filter(Boolean) as string[],
    },
    // Komende afspraken (apr 21–30)
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: d(21, 9), endAt: d(21, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Presentatie nieuwe campagne Sportschool Flex",
      description: "Zomercampagne presenteren aan de klant",
      startAt: d(22, 14), endAt: d(22, 15, 30),
      clientId: flex.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Fotobeoordeling Bakkerij De Zon",
      description: "Bewerkte foto's beoordelen en selectie maken",
      startAt: d(24, 10), endAt: d(24, 12),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Contentcheck Restaurant Bella",
      description: "Advertentieteksten en beelden voor zomercampagne reviewen",
      startAt: d(25, 9), endAt: d(25, 10),
      clientId: bella.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Google Ads evaluatie Tandarts Vermeer",
      description: "Campagneprestaties bespreken en budget heralloceren",
      startAt: d(28, 11), endAt: d(28, 12),
      clientId: tand.id, creatorId: admin.id,
      attendeeIds: [admin.id],
    },
    {
      title: "Planning mei brainstorm",
      description: "Ideeën verzamelen voor content en campagnes in mei",
      startAt: d(29, 13), endAt: d(29, 14),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Maandafsluiting april",
      description: "Resultaten bespreken, facturen controleren en archiveren",
      startAt: d(30, 15), endAt: d(30, 16),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
  ];

  let eventCount = 0;
  for (const ev of events) {
    const { attendeeIds, ...data } = ev;
    await db.event.create({
      data: {
        ...data,
        attendees: {
          create: attendeeIds.map((uid) => ({ userId: uid })),
        },
      },
    });
    eventCount++;
  }
  console.log(`✅ ${eventCount} afspraken aangemaakt`);

  // ── Taken aanmaken ──────────────────────────────────────────────────────────
  const tasks = [
    // Hoge prioriteit
    { title: "Reels maken voor Bakkerij De Zon", priority: "high", status: "todo", dueAt: d(25), clientId: zon.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Advertentieteksten Restaurant Bella schrijven", priority: "high", status: "doing", dueAt: d(22), clientId: bella.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Website content update Tandarts Vermeer", priority: "high", status: "review", dueAt: d(21), clientId: tand.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    // Middel prioriteit
    { title: "Campagneplan mei opstellen Sportschool Flex", priority: "medium", status: "todo", dueAt: d(28), clientId: flex.id, assigneeId: admin.id, creatorId: admin.id, position: 2000 },
    { title: "Foto's bewerken Bakkerij De Zon fotoshoot", priority: "medium", status: "doing", dueAt: d(23), clientId: zon.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "Maandrapport april opmaken", priority: "medium", status: "todo", dueAt: d(30), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 3000 },
    { title: "E-mailcampagne Restaurant Bella opzetten", priority: "medium", status: "todo", dueAt: d(27), clientId: bella.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 4000 },
    { title: "Pinterest-strategie Sportschool Flex", priority: "medium", status: "review", dueAt: d(24), clientId: flex.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "Sociale media statistieken rapportage", priority: "medium", status: "review", dueAt: d(22), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 3000 },
    // Lage prioriteit
    { title: "Blog artikel Bakkerij De Zon", priority: "low", status: "todo", dueAt: d(29), clientId: zon.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 5000 },
    { title: "Google My Business foto's Tandarts Vermeer", priority: "low", status: "done", dueAt: null, clientId: tand.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Stockfoto's archiveren", priority: "low", status: "done", dueAt: null, clientId: null, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "LinkedIn posts Sportschool Flex plannen", priority: "low", status: "doing", dueAt: d(26), clientId: flex.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 3000 },
    { title: "Offertesjabloon bijwerken", priority: "low", status: "todo", dueAt: d(30), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 6000 },
    { title: "Hashtag-onderzoek Restaurant Bella", priority: "low", status: "done", dueAt: null, clientId: bella.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 3000 },
  ];

  for (const t of tasks) {
    const { dueAt, ...rest } = t;
    await db.task.create({
      data: { ...rest, dueAt: dueAt ?? null },
    });
  }
  console.log(`✅ ${tasks.length} taken aangemaakt`);

  console.log("\n🎉 Testdata klaar voor april 2026!");
  console.log("   Klanten:", Object.values(clients).map((c) => c.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
