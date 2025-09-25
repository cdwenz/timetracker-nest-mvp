// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
const db = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");
  
  // Clear existing data
  await db.timeEntry.deleteMany();
  await db.teamMember.deleteMany();
  await db.team.deleteMany();
  await db.region.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();
  
  console.log("🗑️ Existing data cleared");

  const org = await db.organization.create({ data: { name: "Wycliffe Associates" } });
  console.log("🏢 Organization created:", org.name);

  // Create a proper hash for demo password (password: "demo123")
  const passwordHash = await bcrypt.hash("demo123", 10);

  // Create users including jose_tejada@wycliffeassociates.org as ADMIN
  const [superU, admin, joseAdmin, regional1, regional2, fm1, fm2, ft1, ft2, tr1, tr2] = await Promise.all([
    db.user.create({
      data: {
        name: "Super Administrator",
        email: "super@wycliffeassociates.org",
        passwordHash,
        role: Role.SUPER,
        country: "US",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "System Admin",
        email: "admin@wycliffeassociates.org",
        passwordHash,
        role: Role.ADMIN,
        country: "US",
        organizationId: org.id,
      },
    }),
    // Jose Tejada as ADMIN as requested
    db.user.create({
      data: {
        name: "José Tejada",
        email: "jose_tejada@wycliffeassociates.org",
        passwordHash,
        role: Role.ADMIN,
        country: "HN",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Regional Manager North",
        email: "regional.north@wycliffeassociates.org",
        passwordHash,
        role: Role.REGIONAL_MANAGER,
        country: "MX",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Regional Manager South",
        email: "regional.south@wycliffeassociates.org",
        passwordHash,
        role: Role.REGIONAL_MANAGER,
        country: "BR",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Field Manager Alpha",
        email: "fm.alpha@wycliffeassociates.org",
        passwordHash,
        role: Role.FIELD_MANAGER,
        country: "HN",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Field Manager Beta",
        email: "fm.beta@wycliffeassociates.org",
        passwordHash,
        role: Role.FIELD_MANAGER,
        country: "GT",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Field Tech One",
        email: "ft.one@wycliffeassociates.org",
        passwordHash,
        role: Role.FIELD_TECH,
        country: "HN",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Field Tech Two",
        email: "ft.two@wycliffeassociates.org",
        passwordHash,
        role: Role.FIELD_TECH,
        country: "NI",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Transcriber Alpha",
        email: "tr.alpha@wycliffeassociates.org",
        passwordHash,
        role: Role.TRANSCRIBER,
        country: "HN",
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Transcriber Beta",
        email: "tr.beta@wycliffeassociates.org",
        passwordHash,
        role: Role.TRANSCRIBER,
        country: "GT",
        organizationId: org.id,
      },
    }),
  ]);

  console.log("👥 Users created successfully");
  console.log("✅ jose_tejada@wycliffeassociates.org created as ADMIN");

  // Create regions
  const regionNorth = await db.region.create({
    data: { 
      name: "Central America North", 
      organizationId: org.id, 
      managerId: regional1.id 
    },
  });
  
  const regionSouth = await db.region.create({
    data: { 
      name: "Central America South", 
      organizationId: org.id, 
      managerId: regional2.id 
    },
  });

  console.log("🌎 Regions created:", regionNorth.name, "and", regionSouth.name);

  // Create teams
  const teamAlpha = await db.team.create({
    data: {
      name: "Miskito Translation Team",
      organizationId: org.id,
      regionId: regionNorth.id,
      managerId: fm1.id,
    },
  });
  
  const teamBeta = await db.team.create({
    data: {
      name: "Garifuna Translation Team",
      organizationId: org.id,
      regionId: regionSouth.id,
      managerId: fm2.id,
    },
  });

  console.log("👨‍👩‍👧‍👦 Teams created:", teamAlpha.name, "and", teamBeta.name);

  // Create team memberships
  await db.teamMember.createMany({
    data: [
      { teamId: teamAlpha.id, userId: fm1.id },
      { teamId: teamAlpha.id, userId: ft1.id },
      { teamId: teamAlpha.id, userId: tr1.id },
      { teamId: teamBeta.id, userId: fm2.id },
      { teamId: teamBeta.id, userId: ft2.id },
      { teamId: teamBeta.id, userId: tr2.id },
    ],
  });

  console.log("🔗 Team memberships created");

  // Create comprehensive time entries for testing reports
  const timeEntries = [];
  const countries = ["HN", "GT", "NI", "MX", "BR"];
  const languages = ["miq", "cab", "spa", "por", "eng"];
  const tasks = ["MAST", "BTT Support", "Training", "Technical Support", "Transcribe"];
  const users = [fm1, fm2, ft1, ft2, tr1, tr2];
  
  // Generate time entries for the last 60 days
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - i);
    
    // Create 2-5 entries per day
    const entriesPerDay = Math.floor(Math.random() * 4) + 2;
    
    for (let j = 0; j < entriesPerDay; j++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      const language = languages[Math.floor(Math.random() * languages.length)];
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      
      // Get user's team info
      const userTeam = user.id === fm1.id || user.id === ft1.id || user.id === tr1.id ? teamAlpha : teamBeta;
      const userRegion = userTeam.id === teamAlpha.id ? regionNorth : regionSouth;
      
      // Random start and end times
      const startHour = Math.floor(Math.random() * 8) + 8; // 8 AM - 3 PM
      const duration = Math.floor(Math.random() * 4) + 1; // 1-4 hours
      const endHour = Math.min(startHour + duration, 17); // Not later than 5 PM
      
      timeEntries.push({
        userId: user.id,
        note: `${task} work on ${language} translation for ${country}`,
        recipient: `Translator ${j + 1}`,
        personName: `${language} Speaker ${j + 1}`,
        supportedCountry: country,
        workingLanguage: language,
        startDate: entryDate,
        endDate: entryDate,
        startTimeOfDay: `${startHour.toString().padStart(2, '0')}:00`,
        endTimeOfDay: `${endHour.toString().padStart(2, '0')}:00`,
        tasks: [task],
        taskDescription: `Detailed work on ${task} for ${language} language`,
        organizationId: org.id,
        regionId: userRegion.id,
        teamId: userTeam.id,
      });
    }
  }

  // Batch create time entries
  const batchSize = 100;
  for (let i = 0; i < timeEntries.length; i += batchSize) {
    const batch = timeEntries.slice(i, i + batchSize);
    await db.timeEntry.createMany({ data: batch });
  }

  console.log(`⏱️ Created ${timeEntries.length} time entries for testing`);

  // Create some additional specific entries for Jose Tejada (ADMIN) to test
  await db.timeEntry.createMany({
    data: [
      {
        userId: joseAdmin.id,
        note: "Administrative review of regional reports",
        recipient: "Regional Managers",
        personName: "Regional Team",
        supportedCountry: "HN",
        workingLanguage: "spa",
        startDate: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        startTimeOfDay: "09:00",
        endTimeOfDay: "12:00",
        tasks: ["Training", "Technical Support"],
        taskDescription: "Reviewed and analyzed regional performance metrics",
        organizationId: org.id,
        regionId: regionNorth.id,
        teamId: teamAlpha.id,
      },
      {
        userId: joseAdmin.id,
        note: "System administration and user management",
        recipient: "System Users",
        personName: "IT Team",
        supportedCountry: "HN",
        workingLanguage: "eng",
        startDate: new Date(),
        endDate: new Date(),
        startTimeOfDay: "14:00",
        endTimeOfDay: "17:00",
        tasks: ["Technical Support"],
        taskDescription: "Updated user roles and permissions across the system",
        organizationId: org.id,
        regionId: regionSouth.id,
        teamId: teamBeta.id,
      },
    ]
  });

  console.log("✅ Database seed completed successfully!");
  console.log("📊 Summary:");
  console.log(`  - 1 Organization: ${org.name}`);
  console.log(`  - 11 Users (including jose_tejada@wycliffeassociates.org as ADMIN)`);
  console.log(`  - 2 Regions: ${regionNorth.name}, ${regionSouth.name}`);
  console.log(`  - 2 Teams: ${teamAlpha.name}, ${teamBeta.name}`);
  console.log(`  - ${timeEntries.length + 2} Time Entries spanning 60 days`);
  console.log("🔐 Default password for all users: demo123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
