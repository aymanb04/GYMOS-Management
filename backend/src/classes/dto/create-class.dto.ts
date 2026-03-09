import {IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min} from 'class-validator';

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsInt()
    @Min(0)
    @Max(6)
    day_of_week: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

    @IsString()
    @Matches(/^\d{2}:\d{2}$/, { message: 'time_of_day must be HH:MM format' })
    time_of_day: string; // e.g. "09:00"

    @IsInt()
    @Min(1)
    capacity: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    duration_minutes?: number;

    @IsString()
    @IsOptional()
    instructor?: string;

    @IsBoolean()
    @IsOptional()
    capacity_enforced?: boolean;
}