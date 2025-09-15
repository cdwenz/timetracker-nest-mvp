import { Module } from "@nestjs/common";
import { RegionsController } from "./regions.controller";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
    controllers: [RegionsController],
    providers: [PrismaService]
})
export class RegionsModule {}