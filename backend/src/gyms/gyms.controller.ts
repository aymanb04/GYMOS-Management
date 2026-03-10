interface MulterFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

import {
    Controller, Get, Patch, Delete, Post,
    Param, Body, Req, UseGuards,
    UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { GymsService } from './gyms.service';

@Controller('gyms')
export class GymsController {
    constructor(private readonly gymsService: GymsService) {}

    @Get('resolve/:subdomain')
    resolveBySubdomain(@Param('subdomain') subdomain: string) {
        return this.gymsService.resolveBySubdomain(subdomain);
    }

    @UseGuards(JwtGuard)
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: { name?: string; brand_color?: string },
        @Req() req: any,
    ) {
        return this.gymsService.update(id, req.user.id, dto);
    }

    // Logo upload — multipart/form-data, field name: "logo"
    @UseGuards(JwtGuard)
    @Post(':id/logo')
    @UseInterceptors(FileInterceptor('logo'))
    uploadLogo(
        @Param('id') id: string,
        @UploadedFile() file: MulterFile,
        @Req() req: any,
    ) {
        return this.gymsService.uploadLogo(id, req.user.id, file);
    }

    // Remove logo
    @UseGuards(JwtGuard)
    @Delete(':id/logo')
    removeLogo(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        return this.gymsService.removeLogo(id, req.user.id);
    }
}