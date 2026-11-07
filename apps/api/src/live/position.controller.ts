import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service';
import { PositionDto } from './position.dto';

@ApiTags('drivers')
@Controller('drivers')
export class PositionController {
  constructor(private readonly live: LiveService) {}

  @Post(':id/position')
  update(
    @Param('id') id: string,
    @Body() body: PositionDto,
  ): Promise<{ accepted: boolean; reason?: string }> {
    return this.live.updatePosition(id, body);
  }
}
