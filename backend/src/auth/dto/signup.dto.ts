import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    gymId: string;

    @IsString()
    @IsOptional()
    phone?: string;
}