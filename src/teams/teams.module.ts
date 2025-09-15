import { Module } from "@nestjs/common";
import { TeamsController } from "./teams.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
    controllers: [TeamsController],
    providers: [PrismaService],
})
export class TeamsModule {}