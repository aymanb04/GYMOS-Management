import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsInt()
    @Min(1)
    capacity: number;

    @IsDateString()
    schedule: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    duration_minutes?: number;

    @IsString()
    @IsOptional()
    instructor?: string;
}