// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const org = await db.organization.create({ data: { name: "Org Demo" } });

  const [superU, admin, regional, fm, ft, tr] = await Promise.all([
    db.user.create({
      data: {
        name: "Super",
        email: "super@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.SUPER,
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Admin",
        email: "admin@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.ADMIN,
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "Regional",
        email: "reg@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.REGIONAL_MANAGER,
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "FM",
        email: "fm@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.FIELD_MANAGER,
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "FT",
        email: "ft@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.FIELD_TECH,
        organizationId: org.id,
      },
    }),
    db.user.create({
      data: {
        name: "TR",
        email: "tr@wycliffeassociates.org",
        passwordHash: "x",
        role: Role.TRANSCRIBER,
        organizationId: org.id,
      },
    }),
  ]);

  const region = await db.region.create({
    data: { name: "Sur", organizationId: org.id, managerId: regional.id },
  });
  const team = await db.team.create({
    data: {
      name: "Team A",
      organizationId: org.id,
      regionId: region.id,
      managerId: fm.id,
    },
  });

  await db.teamMember.createMany({
    data: [
      { teamId: team.id, userId: fm.id },
      { teamId: team.id, userId: ft.id },
      { teamId: team.id, userId: tr.id },
    ],
  });


}

main().finally(() => db.$disconnect());
