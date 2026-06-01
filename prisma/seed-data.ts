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

  // ── Afspraken aanmaken — juni + juli ────────────────────────────────────────
  const events = [
    // ── Juni ──────────────────────────────────────────────────────────────────
    {
      title: "Terugblik mei / kick-off juni",
      description: "Maandplanning bespreken en taakverdeling voor juni vaststellen",
      startAt: rel(-2, 9), endAt: rel(-2, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Fotoshoot Sportschool Flex",
      description: "Sportfoto's voor social media en website zomercampagne",
      startAt: rel(2, 10), endAt: rel(2, 13),
      clientId: flex.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Contentbespreking Bakkerij De Zon",
      description: "Nieuwe contentstrategie zomer bespreken en kalender invullen",
      startAt: rel(4, 9), endAt: rel(4, 10),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Videocall Restaurant Bella — zomercampagne",
      description: "Brainstorm zomercampagne, promotiemateriaal en tijdlijn",
      startAt: rel(6, 11), endAt: rel(6, 12),
      clientId: bella.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(7, 9), endAt: rel(7, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Google Ads review Tandarts Vermeer",
      description: "Campagneprestaties doornemen en budget voor juli heralloceren",
      startAt: rel(9, 11), endAt: rel(9, 12),
      clientId: tand.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Presentatie campagnevoorstel Sportschool Flex",
      description: "Zomercampagne presenteren aan de klant ter goedkeuring",
      startAt: rel(11, 14), endAt: rel(11, 15, 30),
      clientId: flex.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(14, 9), endAt: rel(14, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Fotobeoordeling Bakkerij De Zon",
      description: "Bewerkte foto's beoordelen en selectie maken voor zomercampagne",
      startAt: rel(16, 10), endAt: rel(16, 11, 30),
      clientId: zon.id, creatorId: admin.id,
      attendeeIds: [admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "SEO-check Tandarts Vermeer",
      description: "Technische SEO doorlichten en verbeterpunten noteren",
      startAt: rel(18, 10), endAt: rel(18, 11),
      clientId: tand.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(21, 9), endAt: rel(21, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Maandafsluiting juni",
      description: "Resultaten bespreken, facturen controleren en rapportages archiveren",
      startAt: rel(28, 15), endAt: rel(28, 16, 30),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(28, 9), endAt: rel(28, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    // ── Juli ──────────────────────────────────────────────────────────────────
    {
      title: "Kick-off juli",
      description: "Maandplanning juli vaststellen en Q3-doelen bespreken",
      startAt: rel(30, 9), endAt: rel(30, 10, 30),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Videoshoot Restaurant Bella — zomercampagne",
      description: "Promofilmpjes voor social media en website opnemen",
      startAt: rel(33, 12), endAt: rel(33, 16),
      clientId: bella.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(35, 9), endAt: rel(35, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Contentbespreking Sportschool Flex",
      description: "Najaarscontent en social media strategie Q3 bespreken",
      startAt: rel(37, 10), endAt: rel(37, 11),
      clientId: flex.id, creatorId: admin.id,
      attendeeIds: [admin.id, marinus?.id].filter(Boolean) as string[],
    },
    {
      title: "Review resultaten Q2",
      description: "Kwartaalprestaties analyseren en verbeterpunten vaststellen",
      startAt: rel(40, 14), endAt: rel(40, 16),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(42, 9), endAt: rel(42, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Fotoshoot Bakkerij De Zon — najaarscollectie",
      description: "Productfoto's voor najaarscampagne en nieuwe menukaart",
      startAt: rel(44, 10), endAt: rel(44, 13),
      clientId: zon.id, creatorId: marinus?.id ?? admin.id,
      attendeeIds: [marinus?.id ?? admin.id, lisa?.id ?? admin.id].filter(Boolean) as string[],
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(49, 9), endAt: rel(49, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Wekelijks teamoverleg",
      description: "Voortgang bespreken en obstakels oplossen",
      startAt: rel(56, 9), endAt: rel(56, 10),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Presentatie halfjaarrapport",
      description: "Resultaten eerste helft 2026 presenteren aan alle klanten",
      startAt: rel(58, 13), endAt: rel(58, 15),
      clientId: null, creatorId: admin.id,
      attendeeIds: userList.map((u) => u.id),
    },
    {
      title: "Maandafsluiting juli",
      description: "Resultaten bespreken, facturen controleren en rapportages archiveren",
      startAt: rel(60, 15), endAt: rel(60, 16, 30),
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

  // ── Taken aanmaken — juni + juli ────────────────────────────────────────────
  type SeedTask = {
    title: string; priority: string; status: string;
    dueAt: Date | null; clientId: string | null;
    assigneeIds: string[]; creatorId: string; position: number;
  };

  const m = marinus?.id ?? admin.id;
  const l = lisa?.id ?? admin.id;

  const tasks: SeedTask[] = [
    // ── Juni ──────────────────────────────────────────────────────────────────
    { title: "Reels maken voor Bakkerij De Zon", priority: "high", status: "doing", dueAt: rel(4), clientId: zon.id, assigneeIds: [m], creatorId: admin.id, position: 1000 },
    { title: "Advertentieteksten Restaurant Bella schrijven", priority: "high", status: "review", dueAt: rel(3), clientId: bella.id, assigneeIds: [l], creatorId: admin.id, position: 1001 },
    { title: "Website content update Tandarts Vermeer", priority: "high", status: "todo", dueAt: rel(7), clientId: tand.id, assigneeIds: [m], creatorId: admin.id, position: 1002 },
    { title: "Foto's bewerken fotoshoot Sportschool Flex", priority: "medium", status: "doing", dueAt: rel(5), clientId: flex.id, assigneeIds: [l], creatorId: admin.id, position: 2000 },
    { title: "Sociale media statistieken rapportage", priority: "medium", status: "review", dueAt: rel(6), clientId: null, assigneeIds: [admin.id], creatorId: admin.id, position: 2001 },
    { title: "E-mailcampagne Restaurant Bella opzetten", priority: "medium", status: "todo", dueAt: rel(10), clientId: bella.id, assigneeIds: [m], creatorId: admin.id, position: 2002 },
    { title: "Campagneplan zomer Sportschool Flex", priority: "medium", status: "todo", dueAt: rel(12), clientId: flex.id, assigneeIds: [admin.id, m], creatorId: admin.id, position: 2003 },
    { title: "Blog artikel Bakkerij De Zon", priority: "low", status: "todo", dueAt: rel(14), clientId: zon.id, assigneeIds: [m], creatorId: admin.id, position: 3000 },
    { title: "LinkedIn posts Sportschool Flex plannen", priority: "low", status: "doing", dueAt: rel(9), clientId: flex.id, assigneeIds: [m, l], creatorId: admin.id, position: 3001 },
    { title: "Maandrapport juni opmaken", priority: "medium", status: "todo", dueAt: rel(28), clientId: null, assigneeIds: [admin.id], creatorId: admin.id, position: 2004 },
    // ── Juli ──────────────────────────────────────────────────────────────────
    { title: "Q3 contentstrategie opstellen", priority: "high", status: "todo", dueAt: rel(35), clientId: null, assigneeIds: [admin.id, m], creatorId: admin.id, position: 1010 },
    { title: "Najaarscampagne Bakkerij De Zon voorbereiden", priority: "high", status: "todo", dueAt: rel(42), clientId: zon.id, assigneeIds: [m], creatorId: admin.id, position: 1011 },
    { title: "Offerte nieuwe klant opstellen", priority: "medium", status: "todo", dueAt: rel(31), clientId: null, assigneeIds: [admin.id], creatorId: admin.id, position: 2010 },
    { title: "Google Ads optimalisatie Tandarts Vermeer", priority: "medium", status: "todo", dueAt: rel(33), clientId: tand.id, assigneeIds: [m], creatorId: admin.id, position: 2011 },
    { title: "Instagram-reeks Restaurant Bella zomercampagne", priority: "medium", status: "todo", dueAt: rel(38), clientId: bella.id, assigneeIds: [l], creatorId: admin.id, position: 2012 },
    { title: "Halfjaarrapport opmaken", priority: "medium", status: "todo", dueAt: rel(58), clientId: null, assigneeIds: [admin.id, m, l], creatorId: admin.id, position: 2013 },
    { title: "Hashtag-onderzoek Sportschool Flex", priority: "low", status: "todo", dueAt: rel(44), clientId: flex.id, assigneeIds: [m], creatorId: admin.id, position: 3010 },
    { title: "Stockfoto's archiveren", priority: "low", status: "done", dueAt: null, clientId: null, assigneeIds: [l], creatorId: admin.id, position: 3011 },
  ];

  for (const { dueAt, assigneeIds, ...rest } of tasks) {
    await db.task.create({
      data: {
        ...rest,
        dueAt: dueAt ?? null,
        assignees: { create: assigneeIds.map((uid) => ({ userId: uid })) },
      },
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
