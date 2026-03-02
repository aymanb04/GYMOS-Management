import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMemberDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    membership_plan_id?: string;
}