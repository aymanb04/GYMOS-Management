import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';

@Injectable()
export class JwtGuard implements CanActivate {
    constructor(private readonly supabase: SupabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader: string | undefined = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or malformed token');
        }

        const token = authHeader.split(' ')[1];

        const userClient = this.supabase.getUserClient(token);
        const { data, error } = await userClient.auth.getUser();

        if (error || !data.user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        // Attach to request so controllers can read req.user and req.token
        request.user = data.user;
        request.token = token;

        return true;
    }
}