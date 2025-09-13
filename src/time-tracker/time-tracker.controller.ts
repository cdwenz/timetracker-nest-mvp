import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { TimeTrackerService } from './time-tracker.service';
import { ListTimeEntriesQueryDto } from './dto/list-time-entries.dto';

@Controller('time-tracker')
@UseGuards(AuthGuard('jwt'))
export class TimeTrackerController {
  constructor(private service: TimeTrackerService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateTimeEntryDto) {
    const entry = await this.service.create(req.user.userId, dto);
    return entry;
  }

  @Get()
  async list(@Req() req: any, @Query() query: ListTimeEntriesQueryDto) {
    if (query.returnMeta === false) {
      return this.service.listFlat(req.user, query);
    }
    return this.service.listWithMeta(req.user, query);
  }
}
