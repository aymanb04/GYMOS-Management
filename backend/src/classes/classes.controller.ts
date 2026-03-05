import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('classes')
@UseGuards(JwtGuard)
export class ClassesController {
    constructor(private readonly classesService: ClassesService) {}

    @Get()
    findAll(@Req() req: { token: string }) {
        return this.classesService.findAll(req.token);
    }

    @Post()
    create(
        @Body() dto: CreateClassDto,
        @Req() req: { token: string },
    ) {
        return this.classesService.create(dto, req.token);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: Partial<CreateClassDto>,
        @Req() req: { token: string },
    ) {
        return this.classesService.update(id, dto, req.token);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @Req() req: { token: string },
    ) {
        return this.classesService.remove(id, req.token);
    }
}