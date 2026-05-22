/**
 * Generates demo data relative to today's date.
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

function rel(offsetDays: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
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
    // Verleden afspraken
    {
      title: "Kick-off planning",
      description: "Maandplanning en taakverdeling bespreken",
      startAt: rel(-21, 9), endAt: rel(-21, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Fotoshoot Sportschool Flex",
      description: "Sportfoto's voor social media en website",
      startAt: rel(-18, 10), endAt: rel(-18, 12),
      clientId: flex.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Review sociale media Bakkerij De Zon",
      description: "Resultaten vorige maand doornemen en bijsturen",
      startAt: rel(-15, 14), endAt: rel(-15, 15),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Contentbespreking Tandarts Vermeer",
      description: "Nieuwe contentstrategie voor komend kwartaal bespreken",
      startAt: rel(-13, 9), endAt: rel(-13, 10, 30),
      clientId: tand.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Videocall campagne-ideeën Restaurant Bella",
      description: "Brainstorm zomercampagne en promotiemateriaal",
      startAt: rel(-11, 11), endAt: rel(-11, 12),
      clientId: bella.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Social media planning update",
      description: "Content kalender afronden voor de komende twee weken",
      startAt: rel(-7, 9), endAt: rel(-7, 10, 30),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Videoshoot Bakkerij De Zon",
      description: "Productievideo's voor Instagram Reels en TikTok",
      startAt: rel(-4, 13), endAt: rel(-4, 16),
      clientId: zon.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "SEO-check Tandarts Vermeer",
      description: "Technische SEO doorlichten en verbeterpunten noteren",
      startAt: rel(-3, 10), endAt: rel(-3, 11),
      clientId: tand.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id].filter(Boolean) as string[],
    },
    // Komende afspraken
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(2, 9), endAt: rel(2, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Presentatie nieuwe campagne Sportschool Flex",
      description: "Zomercampagne presenteren aan de klant",
      startAt: rel(3, 14), endAt: rel(3, 15, 30),
      clientId: flex.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Fotobeoordeling Bakkerij De Zon",
      description: "Bewerkte foto's beoordelen en selectie maken",
      startAt: rel(5, 10), endAt: rel(5, 12),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Contentcheck Restaurant Bella",
      description: "Advertentieteksten en beelden voor zomercampagne reviewen",
      startAt: rel(6, 9), endAt: rel(6, 10),
      clientId: bella.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Google Ads evaluatie Tandarts Vermeer",
      description: "Campagneprestaties bespreken en budget heralloceren",
      startAt: rel(9, 11), endAt: rel(9, 12),
      clientId: tand.id, creatorId: admin.id,
      attendeeIds: [admin.id],
    },
    {
      title: "Planning volgende periode brainstorm",
      description: "Ideeën verzamelen voor content en campagnes",
      startAt: rel(10, 13), endAt: rel(10, 14),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Maandafsluiting en rapportage",
      description: "Resultaten bespreken, facturen controleren en archiveren",
      startAt: rel(14, 15), endAt: rel(14, 16),
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
    { title: "Reels maken voor Bakkerij De Zon", priority: "high", status: "todo", dueAt: rel(6), clientId: zon.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Advertentieteksten Restaurant Bella schrijven", priority: "high", status: "doing", dueAt: rel(3), clientId: bella.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Website content update Tandarts Vermeer", priority: "high", status: "review", dueAt: rel(2), clientId: tand.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    // Middel prioriteit
    { title: "Campagneplan volgende maand opstellen Sportschool Flex", priority: "medium", status: "todo", dueAt: rel(9), clientId: flex.id, assigneeId: admin.id, creatorId: admin.id, position: 2000 },
    { title: "Foto's bewerken Bakkerij De Zon fotoshoot", priority: "medium", status: "doing", dueAt: rel(4), clientId: zon.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "Maandrapport opmaken", priority: "medium", status: "todo", dueAt: rel(14), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 3000 },
    { title: "E-mailcampagne Restaurant Bella opzetten", priority: "medium", status: "todo", dueAt: rel(8), clientId: bella.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 4000 },
    { title: "Pinterest-strategie Sportschool Flex", priority: "medium", status: "review", dueAt: rel(5), clientId: flex.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "Sociale media statistieken rapportage", priority: "medium", status: "review", dueAt: rel(3), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 3000 },
    // Lage prioriteit
    { title: "Blog artikel Bakkerij De Zon", priority: "low", status: "todo", dueAt: rel(10), clientId: zon.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 5000 },
    { title: "Google My Business foto's Tandarts Vermeer", priority: "low", status: "done", dueAt: null, clientId: tand.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 1000 },
    { title: "Stockfoto's archiveren", priority: "low", status: "done", dueAt: null, clientId: null, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 2000 },
    { title: "LinkedIn posts Sportschool Flex plannen", priority: "low", status: "doing", dueAt: rel(7), clientId: flex.id, assigneeId: marinus?.id ?? admin.id, creatorId: admin.id, position: 3000 },
    { title: "Offertesjabloon bijwerken", priority: "low", status: "todo", dueAt: rel(14), clientId: null, assigneeId: admin.id, creatorId: admin.id, position: 6000 },
    { title: "Hashtag-onderzoek Restaurant Bella", priority: "low", status: "done", dueAt: null, clientId: bella.id, assigneeId: lisa?.id ?? admin.id, creatorId: admin.id, position: 3000 },
  ];

  for (const t of tasks) {
    const { dueAt, ...rest } = t;
    await db.task.create({
      data: { ...rest, dueAt: dueAt ?? null },
    });
  }
  console.log(`✅ ${tasks.length} taken aangemaakt`);

  console.log("\n🎉 Demo data klaar!");
  console.log("   Klanten:", Object.values(clients).map((c) => c.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
