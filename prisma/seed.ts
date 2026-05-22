import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "content-hub.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const db = new PrismaClient({ adapter });

async function main() {
  // Clear existing users
  await db.user.deleteMany({});

  const adminHash = await bcrypt.hash("admin1234", 10);
  const userHash = await bcrypt.hash("user1234", 10);

  await db.user.createMany({
    data: [
      {
        email: "admin@deleomedia.nl",
        name: "Admin Gebruiker",
        passwordHash: adminHash,
        role: "admin",
        jobTitle: "Beheerder",
        color: "teal",
      },
      {
        email: "marinus@deleomedia.nl",
        name: "Marinus Goossens",
        passwordHash: userHash,
        role: "user",
        jobTitle: "Content Creator",
        color: "blue",
      },
      {
        email: "lisa@deleomedia.nl",
        name: "Lisa de Vries",
        passwordHash: userHash,
        role: "user",
        jobTitle: "Designer",
        color: "purple",
      },
    ],
  });

  console.log("✅ Seed completed:");
  console.log("   admin@deleomedia.nl / admin1234  (admin)");
  console.log("   marinus@deleomedia.nl / user1234 (user)");
  console.log("   lisa@deleomedia.nl / user1234    (user)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
